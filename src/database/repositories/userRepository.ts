import { db, expoDb } from "../client";
import {
  userProfile,
  coinTransaction,
  quest,
  screenTimeSession,
  exerciseSession,
  focusSession,
  achievement,
  progressPhoto,
  appRestriction,
  notification,
  payoutRequest,
  workoutSessions,
  workoutSets,
  personalRecords,
  crystalTransaction,
  crystalRedemption,
} from "../schema";
import { eq, and, gte } from "drizzle-orm";
import { addSentryBreadcrumb, logErrorToSentry } from "../../services/sentryService";
import { boostService } from "../../services/boostService";

type UserProfile = typeof userProfile.$inferSelect;
type UpdateProfileParams = Partial<typeof userProfile.$inferInsert>;

export const userRepository = {
  async getProfile(): Promise<UserProfile | undefined> {
    const results = await db.select().from(userProfile).limit(1);
    return results[0];
  },

  async updateProfile(updates: UpdateProfileParams): Promise<void> {
    const profile = await this.getProfile();
    if (!profile) return;
    await db
      .update(userProfile)
      .set(updates)
      .where(eq(userProfile.id, profile.id));
  },

  async addXP(amount: number): Promise<void> {
    // H54: reject non-finite amounts (NaN would corrupt stored XP).
    if (!Number.isFinite(amount) || amount <= 0) return;
    // H2: XP 2X Booster doubles all XP gains while active (1 hour).
    const effectiveAmount = boostService.isDoubleXpActive() ? amount * 2 : amount;
    await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      const oldLevel = profile.level;
      let newXP = profile.currentXP + effectiveAmount;
      const newTotalXP = profile.totalXP + effectiveAmount;
      let currentLevel = profile.level;

      let requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));

      while (newXP >= requiredXP) {
        newXP -= requiredXP;
        currentLevel += 1;
        requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
      }

      // H56: level-up bonus (100 coins per level crossed) granted in the
      // SAME transaction as the level-up, with a per-level idempotency
      // key. Previously the store granted it as a separate follow-up
      // call, so two concurrent addXP calls crossing the same boundary
      // both paid the bonus. The pre-check skips levels already paid.
      let bonusCoins = 0;
      const bonusGrants: { level: number; requestId: string }[] = [];
      for (let lvl = oldLevel + 1; lvl <= currentLevel; lvl++) {
        const requestId = `level_up:${lvl}`;
        const existing = await tx
          .select()
          .from(coinTransaction)
          .where(eq(coinTransaction.requestId, requestId))
          .limit(1);
        if (existing.length === 0) {
          bonusCoins += 100;
          bonusGrants.push({ level: lvl, requestId });
        }
      }

      await tx
        .update(userProfile)
        .set({
          currentXP: newXP,
          totalXP: newTotalXP,
          level: currentLevel,
          coins: profile.coins + bonusCoins,
          totalCoinsEarned: profile.totalCoinsEarned + bonusCoins,
        })
        .where(eq(userProfile.id, profile.id));

      const now = new Date().toISOString();
      for (const g of bonusGrants) {
        await tx.insert(coinTransaction).values({
          amount: 100,
          type: "earn",
          description: `Level ${g.level} Rank Ascension Bonus`,
          source: "level_up",
          timestamp: now,
          requestId: g.requestId,
        });
      }
    });
  },

  async addCoins(
    amount: number,
    description: string,
    source: string,
    requestId?: string,
  ): Promise<void> {
    await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return;

      const profile = results[0];
      // H35: idempotent grant. When a requestId is given, a previous
      // grant with the same key is a no-op (crash-retry safe).
      if (requestId) {
        const existing = await tx
          .select()
          .from(coinTransaction)
          .where(eq(coinTransaction.requestId, requestId))
          .limit(1);
        if (existing.length > 0) return;
      }
      const isAd =
        source === "ad" || source === "sponsor_video" || source.includes("ad");
      const currentPasses = profile.sponsorPasses ?? 0;

      await tx
        .update(userProfile)
        .set({
          coins: profile.coins + amount,
          totalCoinsEarned: profile.totalCoinsEarned + amount,
          sponsorPasses: isAd ? currentPasses + 1 : currentPasses,
        })
        .where(eq(userProfile.id, profile.id));

      await tx.insert(coinTransaction).values({
        amount,
        type: "earn",
        description,
        source,
        timestamp: new Date().toISOString(),
        requestId: requestId ?? null,
      });
    });
  },

  async getSponsorPasses(): Promise<number> {
    const profile = await this.getProfile();
    return profile?.sponsorPasses ?? 0;
  },

  async addSponsorPass(count: number = 1): Promise<number> {
    return await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return 0;
      const profile = results[0];
      const newPasses = (profile.sponsorPasses ?? 0) + count;
      await tx
        .update(userProfile)
        .set({ sponsorPasses: newPasses })
        .where(eq(userProfile.id, profile.id));
      return newPasses;
    });
  },

  async consumeSponsorPasses(count: number): Promise<boolean> {
    return await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return false;
      const profile = results[0];
      const current = profile.sponsorPasses ?? 0;
      if (current < count) return false;
      await tx
        .update(userProfile)
        .set({ sponsorPasses: current - count })
        .where(eq(userProfile.id, profile.id));
      return true;
    });
  },

  async spendCoins(amount: number, description: string): Promise<boolean> {
    if (!Number.isSafeInteger(amount) || amount <= 0 || !description.trim()) return false;
    return await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return false;

      const profile = results[0];
      if (profile.coins < amount) {
        return false;
      }

      const updated = await tx
        .update(userProfile)
        .set({
          coins: profile.coins - amount,
        })
        .where(and(eq(userProfile.id, profile.id), gte(userProfile.coins, amount)));
      if (!updated || ((updated as any).changes ?? 1) === 0) return false;

      await tx.insert(coinTransaction).values({
        amount: -amount,
        type: "spend",
        description,
        source: "store",
        timestamp: new Date().toISOString(),
      });

      return true;
    });
  },

  async deductCoins(
    amount: number,
    description: string,
    source: string = "store",
  ): Promise<boolean> {
    if (!Number.isSafeInteger(amount) || amount <= 0 || !description.trim()) return false;
    return await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return false;

      const profile = results[0];
      if (profile.coins < amount) {
        return false;
      }

      const updated = await tx
        .update(userProfile)
        .set({
          coins: profile.coins - amount,
        })
        .where(and(eq(userProfile.id, profile.id), gte(userProfile.coins, amount)));
      if (!updated || ((updated as any).changes ?? 1) === 0) return false;

      await tx.insert(coinTransaction).values({
        amount: -amount,
        type: "spend",
        description,
        source,
        timestamp: new Date().toISOString(),
      });

      return true;
    });
  },

  // M75: purchaseScreenTimeAtomically removed — it had zero call sites
  // (dead API surface) and the shop now spends via spendCoins directly.

  // M46: returns the ACTUAL granted amounts. The old boolean return let
  // the caller report the *claimed* rewards (e.g. earnedXP: 0 when the
  // row had rewardXP 0 but the fallback granted 45 XP).
  async completeQuestAndGrantRewards(
    questId: number,
    rewardCoins: number,
    rewardXP: number,
    statType?: "strength" | "discipline" | "focus" | "health" | "knowledge",
  ): Promise<{ granted: boolean; coins: number; xp: number }> {
    try {
      addSentryBreadcrumb("quest", "Attempting quest completion", {
        questId,
        rewardCoins,
        rewardXP,
        statType,
      });

      return await db.transaction(async (tx: any) => {
        const qRows = await tx
          .select()
          .from(quest)
          .where(eq(quest.id, questId))
          .limit(1);
        if (qRows.length === 0 || qRows[0].completed === 1) {
          return { granted: false, coins: 0, xp: 0 }; // Already completed or not found
        }

        const q = qRows[0];
        const actualCoins = (q.rewardCoins && q.rewardCoins > 0) ? q.rewardCoins : Math.min(50, Math.max(10, rewardCoins || 15));
        const actualXP = (q.rewardXP && q.rewardXP > 0) ? q.rewardXP : Math.min(200, Math.max(20, rewardXP || 45));
        const requestId = `quest:${questId}`;

        // C10: idempotency key. If a previous completion already recorded
        // this requestId, this is a duplicate — grant nothing.
        const existingTx = await tx
          .select()
          .from(coinTransaction)
          .where(eq(coinTransaction.requestId, requestId))
          .limit(1);
        if (existingTx.length > 0) {
          return { granted: false, coins: 0, xp: 0 };
        }

        // 1. Mark quest completed — conditional on still-incomplete, so a
        // concurrent completion cannot double-pay (C10). The requestId
        // unique constraint below is the hard guard if two transactions
        // interleave: the loser's insert throws and rolls everything back.
        await tx.update(quest).set({ completed: 1 }).where(and(eq(quest.id, questId), eq(quest.completed, 0)));

        // 2. Add Coins & XP to User
        const pRows = await tx.select().from(userProfile).limit(1);
        if (pRows.length > 0) {
          const profile = pRows[0];
          let newXP = profile.currentXP + actualXP;
          const newTotalXP = profile.totalXP + actualXP;
          let currentLevel = profile.level;
          let requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));

          while (newXP >= requiredXP) {
            newXP -= requiredXP;
            currentLevel += 1;
            requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
          }

          const updates: any = {
            coins: profile.coins + actualCoins,
            totalCoinsEarned: profile.totalCoinsEarned + actualCoins,
            currentXP: newXP,
            totalXP: newTotalXP,
            level: currentLevel,
          };

          if (statType && typeof profile[statType] === "number") {
            updates[statType] = profile[statType] + 1;
          }

          await tx
            .update(userProfile)
            .set(updates)
            .where(eq(userProfile.id, profile.id));

          // 3. Insert transaction (requestId = idempotency key, C10)
          await tx.insert(coinTransaction).values({
            amount: actualCoins,
            type: "earn",
            description: `Completed Quest: ${qRows[0].title}`,
            source: "quest_reward",
            timestamp: new Date().toISOString(),
            requestId,
          });
        }

        return { granted: true, coins: actualCoins, xp: actualXP };
      });
    } catch (err: any) {
      // Duplicate requestId = concurrent completion already paid. Quiet
      // return: not an error, the quest is already completed + paid.
      if (String(err?.message || "").includes("UNIQUE constraint")) {
        return { granted: false, coins: 0, xp: 0 };
      }
      logErrorToSentry(err, {
        module: "userRepository",
        action: "completeQuestAndGrantRewards",
        extra: { questId, rewardCoins, rewardXP, statType },
      });
      return { granted: false, coins: 0, xp: 0 };
    }
  },

  /**
   * Mark a quest complete WITHOUT granting rewards (ECON-NEW-2).
   * For self-reported (MANUAL) quests: zero proof means zero pay.
   * Double-marking is harmless — there is no grant to duplicate.
   */
  async markQuestComplete(questId: number): Promise<boolean> {
    try {
      return await db.transaction(async (tx: any) => {
        const qRows = await tx
          .select()
          .from(quest)
          .where(eq(quest.id, questId))
          .limit(1);
        if (qRows.length === 0 || qRows[0].completed === 1) {
          return false;
        }
        await tx
          .update(quest)
          .set({ completed: 1 })
          .where(and(eq(quest.id, questId), eq(quest.completed, 0)));
        return true;
      });
    } catch (err) {
      logErrorToSentry(err, {
        module: "userRepository",
        action: "markQuestComplete",
        extra: { questId },
      });
      return false;
    }
  },

  async updateStat(
    statName: "strength" | "discipline" | "focus" | "health" | "knowledge",
    amount: number,
  ): Promise<void> {
    const profile = await this.getProfile();
    if (!profile) return;

    const updatePayload: Partial<typeof userProfile.$inferInsert> = {};
    updatePayload[statName] = profile[statName] + amount;

    await db
      .update(userProfile)
      .set(updatePayload)
      .where(eq(userProfile.id, profile.id));
  },

  /**
   * Called when a workout, quest, run, or focus session is completed.
   * Increments currentStreak only once per calendar day.
   */
  async recordActivityAndIncrementStreak(): Promise<{ streak: number; increased: boolean }> {
    return await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return { streak: 0, increased: false };

      const profile = results[0];
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const getLocalDateStr = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const today = getLocalDateStr(now);

      const lastActiveDateStr = profile.lastActiveDate
        ? profile.lastActiveDate.split("T")[0]
        : null;

      if (lastActiveDateStr === today) {
        // Activity already registered today; prevent duplicate increment
        return { streak: profile.currentStreak, increased: false };
      }

      const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterday = getLocalDateStr(yesterdayDate);

      let newStreak = 1;
      if (lastActiveDateStr === yesterday) {
        // Consecutive calendar day training!
        newStreak = (profile.currentStreak || 0) + 1;
      } else {
        // First session or streak broke previously
        newStreak = 1;
      }

      const newLongest = Math.max(newStreak, profile.longestStreak || 0);

      await tx
        .update(userProfile)
        .set({
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
        })
        .where(eq(userProfile.id, profile.id));

      return { streak: newStreak, increased: true };
    });
  },

  /**
   * Checks on startup or day-change whether the previous day was missed.
   * If missed (lastActiveDate < yesterday), resets currentStreak to 0 without modifying lastActiveDate.
   */
  // M60: returns isNewDay (today != lastActiveDate) instead of the
  // caller hardcoding false. A first launch of the day IS a new day even
  // when the streak is intact.
  async checkDailyStreakLapse(): Promise<{ streak: number; broken: boolean; isNewDay: boolean }> {
    return await db.transaction(async (tx: any) => {
      const results = await tx.select().from(userProfile).limit(1);
      if (results.length === 0) return { streak: 0, broken: false, isNewDay: true };

      const profile = results[0];
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const getLocalDateStr = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      // BUG-10: calendar-day arithmetic, not -86400000ms. Subtracting exactly
      // 24h lands on the wrong local date across DST transitions (23h/25h
      // days). setDate(-1) is DST-correct. (India has no DST, so this only
      // matters for global users — but the fix is free.)
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = getLocalDateStr(yesterdayDate);

      const lastActiveDateStr = profile.lastActiveDate
        ? profile.lastActiveDate.split("T")[0]
        : null;

      if (lastActiveDateStr && lastActiveDateStr < yesterday && profile.currentStreak > 0) {
        // H2 (Streak Freeze): a purchased freeze forgives one missed day.
        // Consume it and keep the streak, treating yesterday as trained.
        // Without a freeze, the streak resets to 0 as before.
        if (boostService.consumeStreakFreeze()) {
          await tx
            .update(userProfile)
            .set({ lastActiveDate: yesterday })
            .where(eq(userProfile.id, profile.id));
          return { streak: profile.currentStreak, broken: false, isNewDay: lastActiveDateStr !== getLocalDateStr(now) };
        }
        await tx
          .update(userProfile)
          .set({ currentStreak: 0 })
          .where(eq(userProfile.id, profile.id));
        return { streak: 0, broken: true, isNewDay: lastActiveDateStr !== getLocalDateStr(now) };
      }

      return { streak: profile.currentStreak, broken: false, isNewDay: lastActiveDateStr !== getLocalDateStr(now) };
    });
  },

  async updateStreak(): Promise<void> {
    await this.recordActivityAndIncrementStreak();
  },

  async resetProfile(): Promise<void> {
    await db.transaction(async (tx: any) => {
      // 1. Wipe all dependent progression and history tables
      await tx.delete(quest);
      await tx.delete(exerciseSession);
      await tx.delete(coinTransaction);
      await tx.delete(screenTimeSession);
      await tx.delete(focusSession);
      await tx.delete(achievement);
      await tx.delete(progressPhoto);
      await tx.delete(appRestriction);
      await tx.delete(notification);
      await tx.delete(payoutRequest);
      await tx.delete(workoutSessions);
      await tx.delete(workoutSets);
      await tx.delete(personalRecords);
      await tx.delete(crystalTransaction);
      await tx.delete(crystalRedemption);

      // 2. Wipe and re-seed clean level 1 user profile
      await tx.delete(userProfile);
      await tx.insert(userProfile).values({
        displayName: "Warrior",
        avatarIcon: "user",
        bio: "Disciplined warrior in training.",
        workoutGoal: "strength",
        dailyFocusGoal: 30,
        dailyQuestTarget: 4,
        level: 1,
        currentXP: 0,
        totalXP: 0,
        coins: 0,
        manaCrystals: 0,
        totalCoinsEarned: 0,
        sponsorPasses: 0,
        currentStreak: 0,
        longestStreak: 0,
        strength: 0,
        discipline: 0,
        focus: 0,
        health: 0,
        knowledge: 0,
        createdAt: new Date().toISOString(),
      });
    });
  },

  /**
   * H22: FULL local wipe for Settings → Storage / Clear App Data and
   * Delete Account. Deletes EVERY local table (resetProfile misses
   * settings, workout plans, guilds, sync queue, inventory, and the
   * arise_kv key-value store) via raw SQL on the shared expoDb
   * connection, then re-seeds a fresh level-1 profile so the app
   * never crashes on a missing profile row. Table names are hardcoded
   * literals, never user input. Does NOT touch the cloud — callers
   * delete the cloud save separately when signed in.
   */
  async wipeAllLocalData(): Promise<void> {
    const tables = [
      "user_profile",
      "quest",
      "coin_transaction",
      "screen_time_session",
      "achievement",
      "exercise_session",
      "focus_session",
      "progress_photo",
      "app_restriction",
      "notification",
      "settings",
      "workout_preferences",
      "workout_plans",
      "workout_days",
      "workout_exercises",
      "workout_sessions",
      "workout_sets",
      "personal_records",
      "payout_request",
      "guild",
      "guild_raid",
      "guild_member",
      "crystal_redemption",
      "crystal_transaction",
      "sync_queue",
      "user_inventory",
      "arise_kv",
    ];
    for (const table of tables) {
      try {
        (expoDb as any).runSync(`DELETE FROM ${table}`);
      } catch {
        // Table may not exist yet on fresh installs (e.g. user_inventory
        // is created lazily) — a missing table is not a wipe failure.
      }
    }
    await db.insert(userProfile).values({
      displayName: "Warrior",
      avatarIcon: "user",
      bio: "Disciplined warrior in training.",
      workoutGoal: "strength",
      dailyFocusGoal: 30,
      dailyQuestTarget: 4,
      level: 1,
      currentXP: 0,
      totalXP: 0,
      coins: 0,
      manaCrystals: 0,
      totalCoinsEarned: 0,
      sponsorPasses: 0,
      currentStreak: 0,
      longestStreak: 0,
      strength: 0,
      discipline: 0,
      focus: 0,
      health: 0,
      knowledge: 0,
      createdAt: new Date().toISOString(),
    });
  },
};
