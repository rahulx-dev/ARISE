import { userRepository } from "../database/repositories/userRepository";
import { db } from "../database/client";
import { achievement, userProfile, coinTransaction } from "../database/schema";
import { eq } from "drizzle-orm";
import { notificationService } from "./notificationService";

export interface StreakMilestoneGift {
  id: string;
  daysRequired: number;
  title: string;
  subtitle: string;
  tier: "IRON" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "MYTHIC";
  color: string;
  coinsReward: number;
  extraPerk: string;
  status: "CLAIMED" | "CLAIMABLE" | "LOCKED";
  daysRemaining: number;
}

const MILESTONE_DEFINITIONS: Omit<
  StreakMilestoneGift,
  "status" | "daysRemaining"
>[] = [
  {
    id: "streak_gift_3",
    daysRequired: 3,
    title: "Initiate Gift Box",
    subtitle: "Awakening of daily iron discipline",
    tier: "IRON",
    color: "#94A3B8",
    coinsReward: 200,
    extraPerk: "1x Streak Freeze Shield",
  },
  {
    id: "streak_gift_7",
    daysRequired: 7,
    title: "Vanguard Chest",
    subtitle: "One full unbroken week warrior trophy",
    tier: "BRONZE",
    color: "#CD7F32",
    coinsReward: 600,
    extraPerk: "2x Streak Freeze Shields + Bronze Aura",
  },
  {
    id: "streak_gift_14",
    daysRequired: 14,
    title: "Titan Vault",
    subtitle: "Two weeks of unshakeable calisthenics focus",
    tier: "SILVER",
    color: "#C0C0C0",
    coinsReward: 1500,
    extraPerk: "Knight Callout Badge + 3x Shields",
  },
  {
    id: "streak_gift_30",
    daysRequired: 30,
    title: "Monarch Royal Treasury",
    subtitle: "30-Day unbroken monthly legend",
    tier: "GOLD",
    color: "#F59E0B",
    coinsReward: 4000,
    extraPerk: "Silver Crown Badge + Royal Sapphire Theme Perk",
  },
  {
    id: "streak_gift_60",
    daysRequired: 60,
    title: "Supreme Sentinel Relic",
    subtitle: "60 days of relentless habit mastery",
    tier: "PLATINUM",
    color: "#00F0FF",
    coinsReward: 10000,
    extraPerk: "Diamond Will Title + Gold Avatar Ring",
  },
  {
    id: "streak_gift_100",
    daysRequired: 100,
    title: "Shadow Sovereign Treasure",
    subtitle: "Centurion God status // Top 0.01% elite",
    tier: "MYTHIC",
    color: "#A855F7",
    coinsReward: 25000,
    extraPerk: "Mythic Monarch Wings + Hall of Fame Induction",
  },
];

export const streakGiftService = {
  /**
   * Fetch all milestone gifts with live user claim status from SQLite
   */
  getMilestones: async (): Promise<{
    milestones: StreakMilestoneGift[];
    currentStreak: number;
    nextMilestone: StreakMilestoneGift | null;
    claimedCount: number;
    totalAvailableCoins: number;
  }> => {
    const profile = await userRepository.getProfile();
    const currentStreak = profile?.currentStreak || 0;

    // Fetch all claimed streak gifts recorded in SQLite
    const claimedRecords = await db
      .select()
      .from(achievement)
      .where(eq(achievement.category, "STREAK_GIFT"));

    const claimedIds = new Set(claimedRecords.map((r: any) => r.achievementId));

    const milestones: StreakMilestoneGift[] = MILESTONE_DEFINITIONS.map(
      (def) => {
        const isClaimed = claimedIds.has(def.id);
        const isEligible = currentStreak >= def.daysRequired;

        let status: "CLAIMED" | "CLAIMABLE" | "LOCKED" = "LOCKED";
        if (isClaimed) {
          status = "CLAIMED";
        } else if (isEligible) {
          status = "CLAIMABLE";
        }

        const daysRemaining = Math.max(0, def.daysRequired - currentStreak);

        return {
          ...def,
          status,
          daysRemaining,
        };
      },
    );

    const nextMilestone =
      milestones.find((m) => m.status !== "CLAIMED") || null;
    const claimedCount = milestones.filter(
      (m) => m.status === "CLAIMED",
    ).length;
    const totalAvailableCoins = milestones
      .filter((m) => m.status === "CLAIMABLE")
      .reduce((sum, m) => sum + m.coinsReward, 0);

    return {
      milestones,
      currentStreak,
      nextMilestone,
      claimedCount,
      totalAvailableCoins,
    };
  },

  /**
   * Claim a milestone gift and add coins to SQLite wallet.
   * H52: the whole claim runs in ONE transaction — the already-claimed
   * check, the achievement insert, and the coin grant. Previously the
   * check-then-insert-then-grant ran as separate statements: two
   * concurrent claims both passed the check and both paid, and if the
   * grant threw after the insert, the gift was marked claimed with
   * coins lost forever. The achievementId UNIQUE constraint is the
   * hard guard: a concurrent duplicate insert throws and rolls back.
   */
  claimMilestoneGift: async (
    milestoneId: string,
  ): Promise<{
    success: boolean;
    rewardCoins: number;
    title: string;
    perk: string;
  }> => {
    const profile = await userRepository.getProfile();
    const currentStreak = profile?.currentStreak || 0;
    const def = MILESTONE_DEFINITIONS.find((m) => m.id === milestoneId);

    if (!def) {
      throw new Error("Invalid streak gift milestone");
    }

    if (currentStreak < def.daysRequired) {
      throw new Error(
        `Requires ${def.daysRequired} days streak. Current: ${currentStreak}`,
      );
    }

    const requestId = `streak_gift:${milestoneId}`;
    try {
      await db.transaction(async (tx: any) => {
        // Check if already claimed (inside the tx)
        const existing = await tx
          .select()
          .from(achievement)
          .where(eq(achievement.achievementId, milestoneId))
          .limit(1);
        if (existing.length > 0) {
          throw new Error("This streak gift has already been claimed!");
        }

        // Record in SQLite achievement table
        await tx.insert(achievement).values({
          achievementId: milestoneId,
          title: def.title,
          description: def.subtitle,
          icon: "gift",
          category: "STREAK_GIFT",
          unlockedAt: new Date().toISOString(),
        });

        // Credit coins to user's wallet (in the same tx, idempotency key)
        const pRows = await tx.select().from(userProfile).limit(1);
        if (pRows.length > 0) {
          const p = pRows[0];
          await tx
            .update(userProfile)
            .set({
              coins: (p.coins || 0) + def.coinsReward,
              totalCoinsEarned: (p.totalCoinsEarned || 0) + def.coinsReward,
            })
            .where(eq(userProfile.id, p.id));
          await tx.insert(coinTransaction).values({
            amount: def.coinsReward,
            type: "earn",
            description: `Claimed ${def.daysRequired}-Day Streak Gift (${def.title})`,
            source: "streak_gift",
            timestamp: new Date().toISOString(),
            requestId,
          });
        }
      });
    } catch (e: any) {
      if (String(e?.message || "").includes("UNIQUE constraint")) {
        throw new Error("This streak gift has already been claimed!");
      }
      throw e;
    }

    // Notify user
    await notificationService.createNotification(
      "REWARD",
      `Streak Gift Unlocked: ${def.title}!`,
      `+${def.coinsReward} Coins credited to your vault. Keep your flame burning!`,
    );

    return {
      success: true,
      rewardCoins: def.coinsReward,
      title: def.title,
      perk: def.extraPerk,
    };
  },
};
