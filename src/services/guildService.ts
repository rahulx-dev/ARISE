import { db, expoDb } from "../database/client";
import { guild, guildMember, guildRaid, userProfile, coinTransaction } from "../database/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { userRepository } from "../database/repositories/userRepository";

export interface GuildData {
  id: number;
  name: string;
  tag: string;
  description: string;
  bannerColor: string;
  rankRequirement: string;
  leaderName: string;
  memberCount: number;
  maxMembers: number;
  totalXP: number;
  level: number;
  isUserMember: boolean;
  createdAt: string;
}

export interface GuildRaidData {
  id: number;
  guildId: number;
  gateRank: string;
  bossName: string;
  bossMaxHp: number;
  bossCurrentHp: number;
  rewardXP: number;
  rewardCoins: number;
  status: "ACTIVE" | "CLEARED";
  createdAt: string;
}

export interface GuildMemberData {
  id: number;
  guildId: number;
  hunterName: string;
  hunterRank: string;
  role: "GUILD_MASTER" | "VICE_MASTER" | "ELITE" | "MEMBER";
  contributionPoints: number;
  joinedAt: string;
  isCurrentUser: boolean;
}

const NEXT_BOSSES = [
  {
    bossName: "Red Gate: Blood-Red Commander Igris",
    gateRank: "S",
    bossMaxHp: 5000,
    rewardXP: 1000,
    rewardCoins: 250,
  },
  {
    bossName: "Baruka, Ice Monarch",
    gateRank: "A",
    bossMaxHp: 4000,
    rewardXP: 800,
    rewardCoins: 200,
  },
  {
    bossName: "High Orc Chieftain",
    gateRank: "A",
    bossMaxHp: 3500,
    rewardXP: 700,
    rewardCoins: 180,
  },
  {
    bossName: "Ant King Beru",
    gateRank: "S",
    bossMaxHp: 7500,
    rewardXP: 1500,
    rewardCoins: 400,
  },
  {
    bossName: "Architect of the System",
    gateRank: "S",
    bossMaxHp: 10000,
    rewardXP: 2500,
    rewardCoins: 600,
  },
];

export const guildService = {
  /**
   * Get all registered guilds (zero mock guilds)
   */
  async getAllGuilds(): Promise<GuildData[]> {
    const rows = await db.select().from(guild).orderBy(desc(guild.totalXP));
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      tag: r.tag,
      description: r.description,
      bannerColor: r.bannerColor,
      rankRequirement: r.rankRequirement,
      leaderName: r.leaderName,
      memberCount: r.memberCount,
      maxMembers: r.maxMembers,
      totalXP: r.totalXP,
      level: r.level,
      isUserMember: Boolean(r.isUserMember),
      createdAt: r.createdAt,
    }));
  },

  /**
   * Get current user's guild details (or null if guildless)
   */
  async getMyGuild(): Promise<{
    guild: GuildData;
    raid: GuildRaidData | null;
    members: GuildMemberData[];
  } | null> {
    const rows = await db
      .select()
      .from(guild)
      .where(eq(guild.isUserMember, 1))
      .limit(1);
    if (rows.length === 0) return null;

    const g = rows[0];
    const guildData: GuildData = {
      id: g.id,
      name: g.name,
      tag: g.tag,
      description: g.description,
      bannerColor: g.bannerColor,
      rankRequirement: g.rankRequirement,
      leaderName: g.leaderName,
      memberCount: g.memberCount,
      maxMembers: g.maxMembers,
      totalXP: g.totalXP,
      level: g.level,
      isUserMember: true,
      createdAt: g.createdAt,
    };

    const raid = await this.getActiveRaid(g.id);
    const members = await this.getGuildMembers(g.id);

    return { guild: guildData, raid, members };
  },

  /**
   * Get active raid for a guild
   */
  async getActiveRaid(guildId: number): Promise<GuildRaidData | null> {
    const raids = await db
      .select()
      .from(guildRaid)
      .where(
        and(eq(guildRaid.guildId, guildId), eq(guildRaid.status, "ACTIVE")),
      )
      .limit(1);

    if (raids.length > 0) {
      const r = raids[0];
      return {
        id: r.id,
        guildId: r.guildId,
        gateRank: r.gateRank,
        bossName: r.bossName,
        bossMaxHp: r.bossMaxHp,
        bossCurrentHp: r.bossCurrentHp,
        rewardXP: r.rewardXP,
        rewardCoins: r.rewardCoins,
        status: r.status as "ACTIVE" | "CLEARED",
        createdAt: r.createdAt,
      };
    }
    return null;
  },

  /**
   * Get guild member roster
   */
  async getGuildMembers(guildId: number): Promise<GuildMemberData[]> {
    const rows = await db
      .select()
      .from(guildMember)
      .where(eq(guildMember.guildId, guildId))
      .orderBy(desc(guildMember.contributionPoints));

    return rows.map((m: any) => ({
      id: m.id,
      guildId: m.guildId,
      hunterName: m.hunterName,
      hunterRank: m.hunterRank,
      role: m.role as "GUILD_MASTER" | "VICE_MASTER" | "ELITE" | "MEMBER",
      contributionPoints: m.contributionPoints,
      joinedAt: m.joinedAt,
      isCurrentUser: Boolean(m.isCurrentUser),
    }));
  },

  /**
   * Found a new custom guild (costs 100 coins).
   * H37: everything runs in ONE transaction — validate, leave current
   * guild, create guild + raid + membership, and spend the coins.
   * Previously the coins were spent FIRST, then creation could fail
   * (duplicate name/tag) and the coins were lost with no refund.
   * Empty names/tags (after cleaning) are rejected up front.
   */
  async createGuild(
    name: string,
    tag: string,
    description: string,
    bannerColor: string = "#0A84FF",
  ): Promise<{ success: boolean; guild?: GuildData; error?: string }> {
    const profile = await userRepository.getProfile();
    if (!profile)
      return { success: false, error: "Hunter profile not initialized" };

    const cleanTag = tag
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    const cleanName = name.trim();
    if (!cleanName) {
      return { success: false, error: "Guild name cannot be empty" };
    }
    if (!cleanTag) {
      return { success: false, error: "Guild tag must contain a letter or digit" };
    }

    const cost = 100;
    if (profile.coins < cost) {
      return {
        success: false,
        error: `Insufficient Mana Coins! Required: ${cost} Coins (You have: ${profile.coins})`,
      };
    }

    // Validate uniqueness BEFORE spending anything.
    const dupes = await db
      .select()
      .from(guild)
      .where(
        or(eq(guild.name, cleanName), eq(guild.tag, cleanTag)),
      )
      .limit(1);
    if (dupes.length > 0) {
      return {
        success: false,
        error: "A guild with this name or tag already exists!",
      };
    }

    const now = new Date().toISOString();
    try {
      const newGuild = await db.transaction(async (tx: any) => {
        // Leave any existing guild (in the tx)
        const current = await tx
          .select()
          .from(guild)
          .where(eq(guild.isUserMember, 1));
        for (const g of current) {
          await tx
            .update(guild)
            .set({
              isUserMember: 0,
              memberCount: Math.max(0, g.memberCount - 1), // M52: a guild CAN reach 0 members — the old floor of 1 kept a phantom member forever
            })
            .where(eq(guild.id, g.id));
        }
        await tx.delete(guildMember).where(eq(guildMember.isCurrentUser, 1));

        // Spend the charter fee (in the tx — rolls back if creation fails)
        const pRows = await tx.select().from(userProfile).limit(1);
        const p = pRows[0];
        if (!p || (p.coins || 0) < cost) {
          throw new Error("Insufficient Mana Coins!");
        }
        await tx
          .update(userProfile)
          .set({ coins: p.coins - cost })
          .where(eq(userProfile.id, p.id));
        await tx.insert(coinTransaction).values({
          amount: -cost,
          type: "spend",
          description: `Chartered Guild: [${cleanTag}] ${cleanName}`,
          source: "guild_create",
          timestamp: now,
          requestId: `guild_create:${cleanTag}:${cleanName}`,
        });

        const inserted = await tx
          .insert(guild)
          .values({
            name: cleanName,
            tag: cleanTag,
            description:
              description.trim() ||
              "A new vanguard rising through the dimensional ranks.",
            bannerColor,
            rankRequirement: "E",
            leaderName: profile.displayName || "Hunter Master",
            memberCount: 1,
            maxMembers: 30,
            totalXP: 0,
            level: 1,
            isUserMember: 1,
            createdAt: now,
          })
          .returning();

        const created = inserted[0];
        if (!created) {
          throw new Error("Failed to record guild charter");
        }

        // Create initial raid for new guild
        await tx.insert(guildRaid).values({
          guildId: created.id,
          gateRank: "C",
          bossName: "Red Gate: Blood-Red Commander Igris",
          bossMaxHp: 1500,
          bossCurrentHp: 1500,
          rewardXP: 500,
          rewardCoins: 100,
          status: "ACTIVE",
          createdAt: now,
        });

        // Add user as GUILD_MASTER
        await tx.insert(guildMember).values({
          guildId: created.id,
          hunterName: profile.displayName || "Hunter Master",
          hunterRank: "S",
          role: "GUILD_MASTER",
          contributionPoints: 0,
          joinedAt: now,
          isCurrentUser: 1,
        });

        return created;
      });

      return {
        success: true,
        guild: {
          id: newGuild.id,
          name: newGuild.name,
          tag: newGuild.tag,
          description: newGuild.description,
          bannerColor: newGuild.bannerColor,
          rankRequirement: newGuild.rankRequirement,
          leaderName: newGuild.leaderName,
          memberCount: newGuild.memberCount,
          maxMembers: newGuild.maxMembers,
          totalXP: newGuild.totalXP,
          level: newGuild.level,
          isUserMember: true,
          createdAt: newGuild.createdAt,
        },
      };
    } catch (err: any) {
      console.error("[GuildService] Create error:", err);
      if (String(err?.message || "").includes("UNIQUE constraint")) {
        return {
          success: false,
          error: "A guild with this name or tag already exists!",
        };
      }
      return {
        success: false,
        error: err?.message || "Failed to create guild",
      };
    }
  },

  /**
   * Enlist / Join a Guild.
   * H38: the target is VALIDATED FIRST (exists, has capacity, not
   * already a member) and the leave + join run in one transaction.
   * Previously leaveCurrentGuild() ran before validation, so joining
   * a full / non-existent guild left the user guildless.
   */
  async joinGuild(
    guildId: number,
  ): Promise<{ success: boolean; error?: string }> {
    const profile = await userRepository.getProfile();
    if (!profile) return { success: false, error: "Profile not found" };

    // Validate the target BEFORE leaving the current guild.
    const targetGuilds = await db
      .select()
      .from(guild)
      .where(eq(guild.id, guildId))
      .limit(1);
    if (targetGuilds.length === 0)
      return { success: false, error: "Guild not found" };

    const target = targetGuilds[0];
    if (target.memberCount >= target.maxMembers) {
      return { success: false, error: "Guild roster is at maximum capacity" };
    }
    const alreadyMember = await db
      .select()
      .from(guildMember)
      .where(
        and(eq(guildMember.guildId, guildId), eq(guildMember.isCurrentUser, 1)),
      )
      .limit(1);
    if (alreadyMember.length > 0) {
      return { success: true };
    }

    const now = new Date().toISOString();
    try {
      await db.transaction(async (tx: any) => {
        // Re-read the target inside the tx (capacity may have changed).
        const fresh = await tx
          .select()
          .from(guild)
          .where(eq(guild.id, guildId))
          .limit(1);
        if (fresh.length === 0) throw new Error("Guild not found");
        if (fresh[0].memberCount >= fresh[0].maxMembers) {
          throw new Error("Guild roster is at maximum capacity");
        }

        // Leave the current guild (in the tx)
        const current = await tx
          .select()
          .from(guild)
          .where(eq(guild.isUserMember, 1));
        for (const g of current) {
          if (g.id === guildId) continue;
          await tx
            .update(guild)
            .set({
              isUserMember: 0,
              memberCount: Math.max(0, g.memberCount - 1), // M52: a guild CAN reach 0 members — the old floor of 1 kept a phantom member forever
            })
            .where(eq(guild.id, g.id));
        }
        await tx.delete(guildMember).where(eq(guildMember.isCurrentUser, 1));

        // Mark guild membership
        await tx
          .update(guild)
          .set({
            isUserMember: 1,
            memberCount: fresh[0].memberCount + 1,
          })
          .where(eq(guild.id, guildId));

        // Insert user into roster
        await tx.insert(guildMember).values({
          guildId,
          hunterName: profile.displayName || "Hunter",
          hunterRank: "B",
          role: "MEMBER",
          contributionPoints: 0,
          joinedAt: now,
          isCurrentUser: 1,
        });
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to join guild" };
    }
  },

  /**
   * Leave the user's current guild
   */
  async leaveCurrentGuild(): Promise<void> {
    const currentMemberGuilds = await db
      .select()
      .from(guild)
      .where(eq(guild.isUserMember, 1));
    for (const g of currentMemberGuilds) {
      await db
        .update(guild)
        .set({
          isUserMember: 0,
          memberCount: Math.max(0, g.memberCount - 1), // M52: a guild CAN reach 0 members — the old floor of 1 kept a phantom member forever
        })
        .where(eq(guild.id, g.id));
    }

    // Remove user records from guild_member
    await db.delete(guildMember).where(eq(guildMember.isCurrentUser, 1));
  },

  /**
   * Attack the active Raid Boss (deals damage, awards points and drops).
   *
   * ECON-NEW-1 / C10: the whole attack runs in ONE transaction. The raid
   * HP update is conditional on status='ACTIVE', and the victory reward
   * is recorded under a requestId (`raid:<raidId>`) whose UNIQUE
   * constraint makes concurrent clears idempotent: the loser's insert
   * throws, its transaction rolls back, and it pays nothing. The next
   * raid spawns only if no ACTIVE raid exists for the guild (no
   * duplicates). A 60-second per-guild attack cooldown (KV, survives
   * restarts) stops the tap-to-farm loop.
   */
  async attackRaidBoss(
    guildId: number,
    damage: number,
  ): Promise<{
    cleared: boolean;
    newHp: number;
    maxHp: number;
    bossName: string;
    rewardCoins?: number;
    rewardXP?: number;
    cooldownMs?: number;
    // N12: the ACTUAL damage applied after the 1..200 clamp. The UI
    // used to display its own unclamped number (e.g. 374) while the
    // service applied 200. Only present when the attack landed.
    damageDealt?: number;
  }> {
    // N12: NaN damage previously poisoned the raid row (NaN HP stored).
    if (!Number.isFinite(damage)) {
      return { cleared: false, newHp: 0, maxHp: 0, bossName: "None" };
    }

    const raid = await this.getActiveRaid(guildId);
    if (!raid || raid.status !== "ACTIVE") {
      return { cleared: false, newHp: 0, maxHp: 0, bossName: "None" };
    }

    // Cooldown: 60s between attacks on the same guild (anti-farm).
    const cooldownKey = `raid_attack_cooldown:${guildId}`;
    let lastAttack = 0;
    try {
      const row = (expoDb as any).getFirstSync(
        'SELECT val FROM arise_kv WHERE key = ?',
        [cooldownKey],
      ) as { val: string } | null;
      lastAttack = Number(row?.val || 0) || 0;
    } catch {}
    const cooldownMs = 60000 - (Date.now() - lastAttack);
    if (cooldownMs > 0) {
      return {
        cleared: false,
        newHp: raid.bossCurrentHp,
        maxHp: raid.bossMaxHp,
        bossName: raid.bossName,
        cooldownMs,
      };
    }

    // C8: Clamp damage to sane single-attack bound (1..200)
    const safeDamage = Math.max(1, Math.min(200, Math.floor(damage)));

    const result = await db.transaction(async (tx: any) => {
      // ECON-NEW-1: verified guild membership, checked inside the tx.
      const memberRows = await tx
        .select()
        .from(guildMember)
        .where(
          and(eq(guildMember.guildId, guildId), eq(guildMember.isCurrentUser, 1)),
        )
        .limit(1);
      if (memberRows.length === 0) {
        return { landed: false, cleared: false, newHp: raid.bossCurrentHp, maxHp: raid.bossMaxHp, bossName: raid.bossName };
      }

      // Re-read the raid inside the tx: the pre-tx read may be stale.
      const raidRows = await tx
        .select()
        .from(guildRaid)
        .where(and(eq(guildRaid.id, raid.id), eq(guildRaid.status, "ACTIVE")))
        .limit(1);
      if (raidRows.length === 0) {
        return { landed: false, cleared: false, newHp: 0, maxHp: raid.bossMaxHp, bossName: raid.bossName };
      }
      const liveRaid = raidRows[0];

      const newHp = Math.max(0, liveRaid.bossCurrentHp - safeDamage);
      const cleared = newHp === 0;

      // C10: conditional HP update — only an ACTIVE row transitions.
      await tx
        .update(guildRaid)
        .set({
          bossCurrentHp: newHp,
          status: cleared ? "CLEARED" : "ACTIVE",
        })
        .where(and(eq(guildRaid.id, liveRaid.id), eq(guildRaid.status, "ACTIVE")));

      // Update user's contribution points
      const m = memberRows[0];
      await tx
        .update(guildMember)
        .set({ contributionPoints: m.contributionPoints + safeDamage })
        .where(eq(guildMember.id, m.id));

      // Add Guild XP
      const targetGuild = await tx
        .select()
        .from(guild)
        .where(eq(guild.id, guildId))
        .limit(1);
      if (targetGuild.length > 0) {
        const g = targetGuild[0];
        await tx
          .update(guild)
          .set({ totalXP: g.totalXP + safeDamage })
          .where(eq(guild.id, guildId));
      }

      if (cleared) {
        // Victory rewards, granted in the same tx under an idempotency
        // key. A concurrent clear's insert violates the UNIQUE
        // constraint, rolls its whole tx back, and pays nothing.
        const requestId = `raid:${liveRaid.id}`;
        const pRows = await tx.select().from(userProfile).limit(1);
        if (pRows.length > 0) {
          const profile = pRows[0];
          const rewardCoins = liveRaid.rewardCoins || 0;
          const rewardXP = liveRaid.rewardXP || 0;
          let newXP = profile.currentXP + rewardXP;
          const newTotalXP = profile.totalXP + rewardXP;
          let currentLevel = profile.level;
          let requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
          while (newXP >= requiredXP) {
            newXP -= requiredXP;
            currentLevel += 1;
            requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
          }
          await tx
            .update(userProfile)
            .set({
              coins: profile.coins + rewardCoins,
              totalCoinsEarned: profile.totalCoinsEarned + rewardCoins,
              currentXP: newXP,
              totalXP: newTotalXP,
              level: currentLevel,
            })
            .where(eq(userProfile.id, profile.id));
          if (rewardCoins !== 0) {
            await tx.insert(coinTransaction).values({
              amount: rewardCoins,
              type: "earn",
              description: `Gate Raid Victory: ${liveRaid.bossName}`,
              source: "guild_raid",
              timestamp: new Date().toISOString(),
              requestId,
            });
          }
        }

        // Spawn next raid boss automatically — only if no ACTIVE raid
        // exists for the guild (prevents duplicate raids).
        const activeNow = await tx
          .select()
          .from(guildRaid)
          .where(and(eq(guildRaid.guildId, guildId), eq(guildRaid.status, "ACTIVE")))
          .limit(1);
        if (activeNow.length === 0) {
          const nextBossIndex = Math.floor(Math.random() * NEXT_BOSSES.length);
          const nextBoss = NEXT_BOSSES[nextBossIndex];
          await tx.insert(guildRaid).values({
            guildId,
            gateRank: nextBoss.gateRank,
            bossName: nextBoss.bossName,
            bossMaxHp: nextBoss.bossMaxHp,
            bossCurrentHp: nextBoss.bossMaxHp,
            rewardXP: nextBoss.rewardXP,
            rewardCoins: nextBoss.rewardCoins,
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
          });
        }

        return {
          landed: true,
          cleared: true,
          newHp: 0,
          maxHp: liveRaid.bossMaxHp,
          bossName: liveRaid.bossName,
          rewardCoins: liveRaid.rewardCoins,
          rewardXP: liveRaid.rewardXP,
          damageDealt: safeDamage,
        };
      }

      return {
        landed: true,
        cleared: false,
        newHp,
        maxHp: liveRaid.bossMaxHp,
        bossName: liveRaid.bossName,
        damageDealt: safeDamage,
      };
    });

    // Record the cooldown only for attacks that actually landed.
    if (result.landed) {
      try {
        (expoDb as any).runSync(
          'INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)',
          [cooldownKey, String(Date.now())],
        );
      } catch {}
    }

    const { landed: _landed, ...publicResult } = result as any;
    return publicResult;
  },
};
