import { db } from "../database/client";
import { guild, guildMember, guildRaid, userProfile } from "../database/schema";
import { eq, desc, and } from "drizzle-orm";
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
   * Found a new custom guild (costs 100 coins)
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

    const cost = 100;
    if (profile.coins < cost) {
      return {
        success: false,
        error: `Insufficient Mana Coins! Required: ${cost} Coins (You have: ${profile.coins})`,
      };
    }

    // Spend coins
    const spent = await userRepository.spendCoins(
      cost,
      `Chartered Guild: [${tag}] ${name}`,
    );
    if (!spent) return { success: false, error: "Transaction failed" };

    // Leave any existing guild
    await this.leaveCurrentGuild();

    const now = new Date().toISOString();
    const cleanTag = tag
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    const cleanName = name.trim();

    try {
      const inserted = await db
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

      const newGuild = inserted[0];
      if (!newGuild)
        return { success: false, error: "Failed to record guild charter" };

      // Create initial raid for new guild
      await db.insert(guildRaid).values({
        guildId: newGuild.id,
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
      await db.insert(guildMember).values({
        guildId: newGuild.id,
        hunterName: profile.displayName || "Hunter Master",
        hunterRank: "S",
        role: "GUILD_MASTER",
        contributionPoints: 100,
        joinedAt: now,
        isCurrentUser: 1,
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
      return {
        success: false,
        error: "A guild with this name or tag already exists!",
      };
    }
  },

  /**
   * Enlist / Join a Guild
   */
  async joinGuild(
    guildId: number,
  ): Promise<{ success: boolean; error?: string }> {
    const profile = await userRepository.getProfile();
    if (!profile) return { success: false, error: "Profile not found" };

    // Leave any current guild first
    await this.leaveCurrentGuild();

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

    const now = new Date().toISOString();

    // Mark guild membership
    await db
      .update(guild)
      .set({
        isUserMember: 1,
        memberCount: target.memberCount + 1,
      })
      .where(eq(guild.id, guildId));

    // Insert user into roster
    await db.insert(guildMember).values({
      guildId,
      hunterName: profile.displayName || "Hunter",
      hunterRank: "B",
      role: "MEMBER",
      contributionPoints: 0,
      joinedAt: now,
      isCurrentUser: 1,
    });

    return { success: true };
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
          memberCount: Math.max(1, g.memberCount - 1),
        })
        .where(eq(guild.id, g.id));
    }

    // Remove user records from guild_member
    await db.delete(guildMember).where(eq(guildMember.isCurrentUser, 1));
  },

  /**
   * Attack the active Raid Boss (deals damage, awards points and drops)
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
  }> {
    const raid = await this.getActiveRaid(guildId);
    if (!raid) {
      return { cleared: false, newHp: 0, maxHp: 0, bossName: "None" };
    }

    const newHp = Math.max(0, raid.bossCurrentHp - damage);
    const cleared = newHp === 0;

    // Update raid HP
    await db
      .update(guildRaid)
      .set({
        bossCurrentHp: newHp,
        status: cleared ? "CLEARED" : "ACTIVE",
      })
      .where(eq(guildRaid.id, raid.id));

    // Update user's contribution points
    const memberRows = await db
      .select()
      .from(guildMember)
      .where(
        and(eq(guildMember.guildId, guildId), eq(guildMember.isCurrentUser, 1)),
      )
      .limit(1);

    if (memberRows.length > 0) {
      const m = memberRows[0];
      await db
        .update(guildMember)
        .set({ contributionPoints: m.contributionPoints + damage })
        .where(eq(guildMember.id, m.id));
    }

    // Add Guild XP
    const targetGuild = await db
      .select()
      .from(guild)
      .where(eq(guild.id, guildId))
      .limit(1);
    if (targetGuild.length > 0) {
      const g = targetGuild[0];
      await db
        .update(guild)
        .set({ totalXP: g.totalXP + damage })
        .where(eq(guild.id, guildId));
    }

    if (cleared) {
      // Award player raid victory rewards
      await userRepository.addCoins(
        raid.rewardCoins,
        `Gate Raid Victory: ${raid.bossName}`,
        "guild_raid",
      );
      await userRepository.addXP(raid.rewardXP);

      // Spawn next raid boss automatically
      const nextBossIndex = Math.floor(Math.random() * NEXT_BOSSES.length);
      const nextBoss = NEXT_BOSSES[nextBossIndex];
      await db.insert(guildRaid).values({
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

      return {
        cleared: true,
        newHp: 0,
        maxHp: raid.bossMaxHp,
        bossName: raid.bossName,
        rewardCoins: raid.rewardCoins,
        rewardXP: raid.rewardXP,
      };
    }

    return {
      cleared: false,
      newHp,
      maxHp: raid.bossMaxHp,
      bossName: raid.bossName,
    };
  },
};
