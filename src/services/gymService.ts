import { db } from "../database/client";
import {
  workoutPreferences,
  workoutPlans,
  workoutDays,
  workoutExercises,
  workoutSessions,
  workoutSets,
  personalRecords,
  exerciseSession,
} from "../database/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  WorkoutPreferences,
  WorkoutPlan,
  WorkoutDayPlan,
  WorkoutExerciseItem,
  ActiveWorkoutSession,
  WorkoutSetLog,
  PersonalRecord,
} from "../types/gym";
import { WorkoutEngine } from "../gym/workoutEngine";
import { coinService } from "./coinService";
import { progressionService } from "./progressionService";
import { questService } from "./questService";
import { notificationService } from "./notificationService";

export class GymService {
  /**
   * Retrieves user workout preferences, or defaults to beginner full_gym.
   */
  async getPreferences(): Promise<WorkoutPreferences> {
    const rows = await db.select().from(workoutPreferences).limit(1);
    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        goal: r.goal as any,
        experience: r.experience as any,
        equipment: r.equipment as any,
        daysPerWeek: r.daysPerWeek,
        workoutDurationMinutes: r.workoutDurationMinutes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }

    // Default fallback
    return {
      goal: "strength",
      experience: "beginner",
      equipment: "full_gym",
      daysPerWeek: 4,
      workoutDurationMinutes: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Saves or updates workout preferences and regenerates the active weekly plan.
   */
  async savePreferences(
    prefs: Omit<WorkoutPreferences, "createdAt" | "updatedAt">,
  ): Promise<WorkoutPlan> {
    const now = new Date().toISOString();
    const existing = await db.select().from(workoutPreferences).limit(1);

    if (existing.length > 0) {
      await db
        .update(workoutPreferences)
        .set({
          goal: prefs.goal,
          experience: prefs.experience,
          equipment: prefs.equipment,
          daysPerWeek: prefs.daysPerWeek,
          workoutDurationMinutes: prefs.workoutDurationMinutes,
          updatedAt: now,
        })
        .where(eq(workoutPreferences.id, existing[0].id));
    } else {
      await db.insert(workoutPreferences).values({
        goal: prefs.goal,
        experience: prefs.experience,
        equipment: prefs.equipment,
        daysPerWeek: prefs.daysPerWeek,
        workoutDurationMinutes: prefs.workoutDurationMinutes,
        createdAt: now,
        updatedAt: now,
      });
    }

    const fullPrefs: WorkoutPreferences = {
      ...prefs,
      createdAt: existing[0]?.createdAt || now,
      updatedAt: now,
    };

    return await this.generateAndSavePlan(fullPrefs);
  }

  /**
   * Generates and persists a new weekly workout plan to SQLite.
   */
  async generateAndSavePlan(prefs: WorkoutPreferences): Promise<WorkoutPlan> {
    const generated = WorkoutEngine.generateWeeklyPlan(prefs);

    // Deactivate existing plans
    await db
      .update(workoutPlans)
      .set({ isActive: 0 })
      .where(eq(workoutPlans.isActive, 1));

    // Insert new plan
    const insertedPlan = await db
      .insert(workoutPlans)
      .values({
        title: generated.title,
        description: generated.description,
        splitType: generated.splitType,
        isActive: 1,
        createdAt: new Date().toISOString(),
      })
      .returning();

    const planId = insertedPlan[0].id;
    const daysWithIds: WorkoutDayPlan[] = [];

    for (const day of generated.days) {
      const insertedDay = await db
        .insert(workoutDays)
        .values({
          planId,
          dayOfWeek: day.dayOfWeek,
          dayName: day.dayName,
          targetMuscleGroups: JSON.stringify(day.targetMuscleGroups),
          isRestDay: day.isRestDay ? 1 : 0,
        })
        .returning();

      const dayId = insertedDay[0].id;
      const savedExercises: WorkoutExerciseItem[] = [];

      for (let i = 0; i < day.exercises.length; i++) {
        const ex = day.exercises[i];
        await db.insert(workoutExercises).values({
          dayId,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          category: ex.category,
          trackingMode: ex.trackingMode,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          restSeconds: ex.restSeconds,
          orderIndex: i,
        });

        savedExercises.push({
          ...ex,
          id: `db_ex_${dayId}_${i}`,
        });
      }

      daysWithIds.push({
        ...day,
        id: dayId,
        planId,
        exercises: savedExercises,
      });
    }

    return {
      ...generated,
      id: planId,
      days: daysWithIds,
    };
  }

  /**
   * Retrieves the active weekly plan from SQLite.
   */
  async getActivePlan(): Promise<WorkoutPlan | null> {
    const activePlans = await db
      .select()
      .from(workoutPlans)
      .where(eq(workoutPlans.isActive, 1))
      .limit(1);

    if (activePlans.length === 0) {
      // Auto-generate initial plan from default preferences
      const prefs = await this.getPreferences();
      return await this.generateAndSavePlan(prefs);
    }

    const p = activePlans[0];
    const dayRows = await db
      .select()
      .from(workoutDays)
      .where(eq(workoutDays.planId, p.id));

    const days: WorkoutDayPlan[] = [];

    for (const d of dayRows) {
      const exRows = await db
        .select()
        .from(workoutExercises)
        .where(eq(workoutExercises.dayId, d.id));

      const exercises: WorkoutExerciseItem[] = exRows.map((e: any) => ({
        id: e.id.toString(),
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        category: e.category as any,
        trackingMode: e.trackingMode as any,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        restSeconds: e.restSeconds,
        orderIndex: e.orderIndex,
      }));

      days.push({
        id: d.id,
        planId: d.planId,
        dayOfWeek: d.dayOfWeek,
        dayName: d.dayName,
        targetMuscleGroups: JSON.parse(d.targetMuscleGroups || "[]"),
        isRestDay: d.isRestDay === 1,
        exercises,
      });
    }

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      splitType: p.splitType as any,
      isActive: true,
      days,
      createdAt: p.createdAt,
    };
  }

  /**
   * Gets today's scheduled workout.
   */
  async getTodayWorkout(): Promise<WorkoutDayPlan | null> {
    const plan = await this.getActivePlan();
    if (!plan) return null;

    const todayDayOfWeek = new Date().getDay(); // 0..6
    const todayDay = plan.days.find((d) => d.dayOfWeek === todayDayOfWeek);
    return todayDay || plan.days[0] || null;
  }

  /**
   * Starts or resumes a workout session.
   * H41: resumes ONLY when the existing ACTIVE session matches the
   * requested plan/day. Previously any ACTIVE session was resumed
   * regardless, so starting Day-2 silently resumed Day-1's session.
   * A mismatched session is abandoned (ABORTED) and a fresh one is
   * created for the requested plan/day.
   */
  async startOrResumeSession(
    planId: number,
    dayId: number,
    title: string,
  ): Promise<ActiveWorkoutSession> {
    // Check if there is an active session
    const active = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.status, "ACTIVE"))
      .limit(1);

    if (active.length > 0) {
      const s = active[0];
      if (s.planId !== planId || s.dayId !== dayId) {
        // Mismatched plan/day: abandon the stale session, start fresh.
        await db
          .update(workoutSessions)
          .set({ status: "ABORTED", endTime: new Date().toISOString() })
          .where(eq(workoutSessions.id, s.id));
      } else {
        const setRows = await db
          .select()
          .from(workoutSets)
          .where(eq(workoutSets.sessionId, s.id));

        return {
          id: s.id,
          planId: s.planId || planId,
          dayId: s.dayId || dayId,
          title: s.title,
          startTime: s.startTime,
          durationSeconds: s.durationSeconds,
          status: "ACTIVE",
          totalVolumeKg: s.totalVolumeKg,
          totalReps: s.totalReps,
          totalSets: s.totalSets,
          rewardCoins: s.rewardCoins,
          rewardXP: s.rewardXP,
          sets: setRows.map((sr: any) => ({
            id: sr.id,
            sessionId: sr.sessionId,
            exerciseId: sr.exerciseId,
            exerciseName: sr.exerciseName,
            setNumber: sr.setNumber,
            targetReps: sr.targetReps,
            completedReps: sr.completedReps,
            weightKg: sr.weightKg,
            completed: sr.completed === 1,
            timestamp: sr.timestamp,
          })),
        };
      }
    }

    // Create new session
    const inserted = await db
      .insert(workoutSessions)
      .values({
        planId,
        dayId,
        title,
        startTime: new Date().toISOString(),
        status: "ACTIVE",
        totalVolumeKg: 0,
        totalReps: 0,
        totalSets: 0,
        rewardCoins: 0,
        rewardXP: 0,
      })
      .returning();

    return {
      id: inserted[0].id,
      planId,
      dayId,
      title,
      startTime: inserted[0].startTime,
      durationSeconds: 0,
      status: "ACTIVE",
      totalVolumeKg: 0,
      totalReps: 0,
      totalSets: 0,
      rewardCoins: 0,
      rewardXP: 0,
      sets: [],
    };
  }

  /**
   * Logs a completed set within an active workout session and checks for PR.
   * C14: a 0-rep set is NOT a completed set. Previously every logged set
   * was stored completed: 1 with no validation, so 0-rep sets counted
   * toward gym completion and rewards.
   */
  async logSet(
    sessionId: number,
    exerciseId: string,
    exerciseName: string,
    setNumber: number,
    targetReps: number,
    completedReps: number,
    weightKg: number,
  ): Promise<{ setLog: WorkoutSetLog; isNewPR: boolean }> {
    const timestamp = new Date().toISOString();

    const safeTargetReps = Number.isFinite(targetReps) ? Math.max(1, Math.min(1000, Math.floor(targetReps))) : 10;
    const safeCompletedReps = Number.isFinite(completedReps) ? Math.max(0, Math.min(1000, Math.floor(completedReps))) : 0;
    const safeWeightKg = Number.isFinite(weightKg) ? Math.max(0, Math.min(5000, weightKg)) : 0;
    const completed = safeCompletedReps > 0 ? 1 : 0;
    const safeSetNumber = Number.isFinite(setNumber) ? Math.max(1, Math.floor(setNumber)) : 1;

    // H40: log only into an ACTIVE session (a completed/aborted session
    // must not accept more sets), and never insert a duplicate
    // (sessionId, exerciseId, setNumber) row — re-logging the same set
    // UPDATES it (correction semantics), so a double-tap cannot
    // double-count volume/reps toward completion and rewards.
    const sessionRows = await db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.status, "ACTIVE")))
      .limit(1);
    if (sessionRows.length === 0) {
      throw new Error("Workout session is not active");
    }

    const existing = await db
      .select()
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.sessionId, sessionId),
          eq(workoutSets.exerciseId, exerciseId),
          eq(workoutSets.setNumber, safeSetNumber),
        ),
      )
      .limit(1);

    let inserted: any[];
    if (existing.length > 0) {
      await db
        .update(workoutSets)
        .set({
          targetReps: safeTargetReps,
          completedReps: safeCompletedReps,
          weightKg: safeWeightKg,
          completed,
          timestamp,
        })
        .where(eq(workoutSets.id, existing[0].id));
      inserted = [existing[0]];
    } else {
      inserted = await db
        .insert(workoutSets)
        .values({
          sessionId,
          exerciseId,
          exerciseName,
          setNumber: safeSetNumber,
          targetReps: safeTargetReps,
          completedReps: safeCompletedReps,
          weightKg: safeWeightKg,
          completed,
          timestamp,
        })
        .returning();
    }

    // 0-rep sets never count as PRs.
    const isNewPR = completed === 1
      ? await this.checkAndRecordPR(
          exerciseId,
          exerciseName,
          safeWeightKg,
          safeCompletedReps,
        )
      : false;

    return {
      setLog: {
        id: inserted[0].id,
        sessionId,
        exerciseId,
        exerciseName,
        setNumber: safeSetNumber,
        targetReps: safeTargetReps,
        completedReps: safeCompletedReps,
        weightKg: safeWeightKg,
        completed: completed === 1,
        timestamp,
      },
      isNewPR,
    };
  }

  /**
   * Checks if current set qualifies as a Personal Record (PR).
   */
  private async checkAndRecordPR(
    exerciseId: string,
    exerciseName: string,
    weightKg: number,
    reps: number,
  ): Promise<boolean> {
    if (weightKg <= 0 && reps <= 0) return false;

    const existingPRs = await db
      .select()
      .from(personalRecords)
      .where(
        and(
          eq(personalRecords.exerciseId, exerciseId),
          eq(personalRecords.recordType, "MAX_WEIGHT"),
        ),
      )
      .limit(1);

    if (existingPRs.length === 0 || weightKg > existingPRs[0].weightKg) {
      await db.insert(personalRecords).values({
        exerciseId,
        exerciseName,
        recordType: "MAX_WEIGHT",
        value: weightKg,
        weightKg,
        reps,
        achievedAt: new Date().toISOString(),
      });
      return true;
    }

    return false;
  }

  /**
   * Completes the active workout session, calculates rewards, and connects with quests/progression.
   * H39: duration is computed from the session's stored startTime,
   * NOT the caller-supplied value (previously
   * completeWorkoutSession(id, 999999) paid ~3333 coins + ~6700 XP
   * for zero time exercised; negatives stored negative rewards).
   * The caller value is used only if startTime is unparseable.
   */
  async completeWorkoutSession(
    sessionId: number,
    durationSeconds: number,
  ): Promise<{ coinsEarned: number; xpEarned: number; totalVolumeKg: number }> {
    // C10: Atomic verification of ACTIVE session to reject repeats and phantoms
    const sessionRows = await db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.status, "ACTIVE")))
      .limit(1);

    if (sessionRows.length === 0) {
      return { coinsEarned: 0, xpEarned: 0, totalVolumeKg: 0 };
    }

    const session = sessionRows[0];
    const startMs = Date.parse(session.startTime || "");
    const rawDuration = Number.isFinite(startMs)
      ? (Date.now() - startMs) / 1000
      : (Number.isFinite(durationSeconds) ? durationSeconds : 0);
    // Clamp: 0 .. 24h. A session cannot last longer than a day.
    const actualDurationSeconds = Math.max(0, Math.min(86400, Math.floor(rawDuration)));

    const sets = await db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, sessionId));

    let totalVolumeKg = 0;
    let totalReps = 0;
    const completedSets = sets.filter((s: any) => s.completed === 1);

    const now = new Date().toISOString();

    // C14: Zero-effort gym completion (0 sets completed) grants ZERO coins and ZERO XP
    if (completedSets.length === 0) {
      await db
        .update(workoutSessions)
        .set({
          status: "ABORTED",
          endTime: now,
          durationSeconds: actualDurationSeconds,
          totalVolumeKg: 0,
          totalReps: 0,
          totalSets: 0,
          rewardCoins: 0,
          rewardXP: 0,
        })
        .where(eq(workoutSessions.id, sessionId));
      return { coinsEarned: 0, xpEarned: 0, totalVolumeKg: 0 };
    }

    for (const s of completedSets) {
      totalVolumeKg += (s.weightKg || 0) * (s.completedReps || 0);
      totalReps += s.completedReps || 0;
    }

    // Calibrated Reward Formula: Base + Set Bonus + Duration, capped
    const baseCoins = 15;
    const setCoins = Math.min(30, completedSets.length * 3);
    const durationCoins = Math.min(10, Math.floor(actualDurationSeconds / 300));
    const coinsEarned = baseCoins + setCoins + durationCoins;
    const xpEarned = Math.min(250, coinsEarned * 2);

    // Mark session completed atomically
    await db
      .update(workoutSessions)
      .set({
        status: "COMPLETED",
        endTime: now,
        durationSeconds: actualDurationSeconds,
        totalVolumeKg,
        totalReps,
        totalSets: completedSets.length,
        rewardCoins: coinsEarned,
        rewardXP: xpEarned,
      })
      .where(eq(workoutSessions.id, sessionId));

    // Record in exercise_session for unified progress
    await db.insert(exerciseSession).values({
      exerciseType: "GYM_WORKOUT",
      target: completedSets.length,
      completedReps: totalReps,
      durationSeconds: actualDurationSeconds,
      formScore: 100,
      timestamp: now,
    });

    // Grant Coins & XP. If a grant fails, roll the session back to
    // ACTIVE so the user can retry (previously the session stayed
    // COMPLETED with no reward — H31-style loss). The coin grant is
    // idempotent (requestId), so a retry never double-pays coins.
    try {
      await coinService.addCoins(
        coinsEarned,
        "Completed Gym Workout",
        "gym_workout",
        `gym:${sessionId}`,
      );
      await progressionService.addXP(xpEarned);
    } catch (grantErr) {
      console.warn("[GymService] Grant failed, rolling session back to ACTIVE:", grantErr);
      await db
        .update(workoutSessions)
        .set({ status: "ACTIVE", endTime: null, rewardCoins: 0, rewardXP: 0 })
        .where(eq(workoutSessions.id, sessionId));
      return { coinsEarned: 0, xpEarned: 0, totalVolumeKg: 0 };
    }

    // Check if daily quest exists for workout
    try {
      const todayQuests = await questService.getDailyQuests();
      const workoutQuest = todayQuests.find(
        (q) =>
          !q.completed &&
          (q.category?.toUpperCase() === "STRENGTH" ||
            q.category?.toUpperCase() === "FITNESS"),
      );
      if (workoutQuest) {
        await questService.completeQuest(workoutQuest.id);
      }
    } catch (_) {}

    // Send persistent notification
    await notificationService.createNotification(
      "SYSTEM",
      "Workout Crushed!",
      `You earned +${coinsEarned} Coins and +${xpEarned} XP. Total volume: ${Math.round(totalVolumeKg)}kg.`,
    );

    return { coinsEarned, xpEarned, totalVolumeKg };
  }

  /**
   * Retrieves personal records list.
   */
  async getPersonalRecords(): Promise<PersonalRecord[]> {
    const rows = await db
      .select()
      .from(personalRecords)
      .orderBy(desc(personalRecords.achievedAt))
      .limit(30);

    return rows.map((r: any) => ({
      id: r.id,
      exerciseId: r.exerciseId,
      exerciseName: r.exerciseName,
      recordType: r.recordType as any,
      value: r.value,
      weightKg: r.weightKg,
      reps: r.reps,
      achievedAt: r.achievedAt,
    }));
  }

  /**
   * Retrieves past completed workout sessions.
   */
  async getWorkoutHistory(
    limitCount: number = 20,
  ): Promise<ActiveWorkoutSession[]> {
    const rows = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.status, "COMPLETED"))
      .orderBy(desc(workoutSessions.startTime))
      .limit(limitCount);

    return rows.map((r: any) => ({
      id: r.id,
      planId: r.planId || undefined,
      dayId: r.dayId || undefined,
      title: r.title,
      startTime: r.startTime,
      endTime: r.endTime || undefined,
      durationSeconds: r.durationSeconds,
      status: "COMPLETED",
      totalVolumeKg: r.totalVolumeKg,
      totalReps: r.totalReps,
      totalSets: r.totalSets,
      rewardCoins: r.rewardCoins,
      rewardXP: r.rewardXP,
      sets: [],
    }));
  }
}

export const gymService = new GymService();
