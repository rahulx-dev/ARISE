import * as schema from "./schema";

/**
 * Web Database LocalStorage-Backed Client
 *
 * Provides persistent SQLite simulation for web previews.
 * Survives page reloads, hot reloads, and browser restarts.
 * Clean first launch: Level 1, 0 XP, 0 Coins, 0 Streaks, 0 Stats, 0 completed tasks.
 */

const STORAGE_KEY = "arise_db_persistent_state_v1";

const initialMockState: Record<string, any[]> = {
  user_profile: [
    {
      id: 1,
      displayName: "Warrior",
      avatarIcon: "user",
      level: 1,
      currentXP: 0,
      totalXP: 0,
      coins: 0,
      totalCoinsEarned: 0,
      currentStreak: 0,
      longestStreak: 0,
      strength: 0,
      discipline: 0,
      focus: 0,
      health: 0,
      knowledge: 0,
      createdAt: new Date().toISOString(),
    },
  ],
  quest: [],
  coin_transaction: [],
  screen_time_session: [],
  achievement: [],
  exercise_session: [],
  focus_session: [],
  progress_photo: [],
  notification: [],
  crystal_redemption: [],
  crystal_transaction: [],
  sync_queue: [],
  app_restriction: [],
  settings: [
    {
      id: 1,
      sfxEnabled: 1,
      sfxVolume: 0.7,
      hapticsEnabled: 1,
      notificationsEnabled: 0,
      onboardingCompleted: 0,
      dailyBudgetMinutes: 30,
      theme: "light",
    },
  ],
};

function loadWebState(): Record<string, any[]> {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch (e) {
    console.warn("Could not read persistent state from localStorage:", e);
  }
  return initialMockState;
}

function saveWebState(state: Record<string, any[]>) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.warn("Could not save persistent state to localStorage:", e);
  }
}

const mockState: Record<string, any[]> = loadWebState();
const KV_STORAGE_KEY = "arise_kv_persistent_v1";

function loadKvStore(): Record<string, string> {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(KV_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch {}
  return {};
}

function saveKvStore(store: Record<string, string>) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KV_STORAGE_KEY, JSON.stringify(store));
    }
  } catch {}
}

const kvStore: Record<string, string> = loadKvStore();

function getTableName(table: any): string {
  if (typeof table === "string") return table;
  return (table as any)?._?.name || (table as any)?.name || "user_profile";
}

function parseKeyValueMutation(sql: string, params: any[] = []): void {
  const trimmed = sql.trim();
  if (trimmed.startsWith("CREATE TABLE IF NOT EXISTS arise_kv")) {
    return;
  }

  if (trimmed.startsWith("INSERT OR REPLACE INTO arise_kv")) {
    const [key, value] = params;
    if (typeof key === "string") {
      kvStore[key] = String(value ?? "");
      saveKvStore(kvStore);
    }
    return;
  }

  if (trimmed.startsWith("DELETE FROM arise_kv")) {
    const [key] = params;
    if (typeof key === "string") {
      delete kvStore[key];
      saveKvStore(kvStore);
    }
  }
}

function parseGetFirstSync<T>(sql: string, params: any[] = []): T | undefined {
  const trimmed = sql.trim();

  if (trimmed.startsWith("SELECT val FROM arise_kv WHERE key = ?")) {
    const [key] = params;
    if (typeof key === "string") {
      return { val: kvStore[key] ?? null } as T;
    }
    return undefined;
  }

  if (trimmed.startsWith("SELECT onboarding_completed FROM settings LIMIT 1")) {
    const settingsRows = mockState.settings ?? [];
    const firstRow = settingsRows[0] as any;
    return { onboarding_completed: firstRow?.onboardingCompleted ?? 0 } as T;
  }

  if (trimmed.startsWith("SELECT * FROM settings LIMIT 1")) {
    const settingsRows = mockState.settings ?? [];
    return (settingsRows[0] as T) ?? undefined;
  }

  return undefined;
}

function createQueryChain(tableName: string, sourceData?: any[]) {
  const data = sourceData ?? mockState[tableName] ?? [];

  return {
    from: (tbl: any) => createQueryChain(getTableName(tbl)),
    where: (predicate: any) => {
      if (typeof predicate === "function") {
        return createQueryChain(tableName, data.filter(predicate));
      }
      return createQueryChain(tableName, data);
    },
    orderBy: (...cols: any[]) => createQueryChain(tableName, data),
    limit: (n: number) => Promise.resolve(data.slice(0, n)),
    values: (vals: any) => {
      const entry = { id: (data.length || 0) + 1, ...vals };
      data.push(entry);
      saveWebState(mockState);
      return Promise.resolve([entry]);
    },
    set: (vals: any) => ({
      where: (predicate: any) => {
        const target =
          typeof predicate === "function" ? data.filter(predicate) : data;
        target.forEach((item) => Object.assign(item, vals));
        saveWebState(mockState);
        return Promise.resolve(target);
      },
    }),
    then: (resolve: (val: any) => any) => resolve(data),
  };
}

export const expoDb: any = {
  withTransactionSync: (cb: () => void) => {
    cb();
  },
  runSync: (sql: string, params: any[] = []) => {
    parseKeyValueMutation(sql, params);
    if (sql.startsWith("CREATE TABLE IF NOT EXISTS")) {
      return;
    }
  },
  execSync: (sql: string, params: any[] = []) => {
    parseKeyValueMutation(sql, params);
    if (sql.startsWith("CREATE TABLE IF NOT EXISTS")) {
      return;
    }
  },
  getFirstSync: <T>(sql: string, params: any[] = []) =>
    parseGetFirstSync<T>(sql, params),
  getAllAsync: async <T>(sql: string, _params: any[] = []) => {
    if (sql.includes('user_inventory')) {
      const list = mockState.user_inventory || [];
      return list as T[];
    }
    return [] as T[];
  },
  getFirstAsync: async <T>(sql: string, params: any[] = []) => {
    if (sql.includes('user_inventory')) {
      const list = mockState.user_inventory || [];
      const item = list.find((i: any) => i.item_id === params[0]);
      return item as T | undefined;
    }
    return undefined as T | undefined;
  },
  runAsync: async (sql: string, params: any[] = []) => {
    if (sql.includes('INSERT OR IGNORE INTO user_inventory')) {
      const list = mockState.user_inventory || (mockState.user_inventory = []);
      const [item_id, item_type, unlocked_at] = params;
      if (!list.some((i: any) => i.item_id === item_id)) {
        list.push({ id: list.length + 1, item_id, item_type, unlocked_at, is_equipped: 1 });
        saveWebState(mockState);
      }
    } else if (sql.includes('UPDATE user_inventory SET is_equipped = 0')) {
      const list = mockState.user_inventory || [];
      list.forEach((i: any) => { if (i.item_type === params[0]) i.is_equipped = 0; });
      saveWebState(mockState);
    } else if (sql.includes('UPDATE user_inventory SET is_equipped = 1')) {
      const list = mockState.user_inventory || [];
      list.forEach((i: any) => { if (i.item_id === params[0]) i.is_equipped = 1; });
      saveWebState(mockState);
    }
    return undefined;
  },
};

export const db: any = {
  select: () => ({
    from: (tbl: any) => createQueryChain(getTableName(tbl)),
  }),
  insert: (tbl: any) => ({
    values: (vals: any) => {
      const name = getTableName(tbl);
      const list = mockState[name] || (mockState[name] = []);
      const entry = { id: list.length + 1, ...vals };
      list.push(entry);
      saveWebState(mockState);
      return Promise.resolve([entry]);
    },
  }),
  update: (tbl: any) => ({
    set: (vals: any) => {
      const name = getTableName(tbl);
      const list = mockState[name] || [];
      return {
        where: () => {
          list.forEach((item) => Object.assign(item, vals));
          saveWebState(mockState);
          return Promise.resolve(list);
        },
        then: (resolve: (val: any) => any) => {
          list.forEach((item) => Object.assign(item, vals));
          saveWebState(mockState);
          return resolve(list);
        },
      };
    },
  }),
  delete: (tbl: any) => {
    const name = getTableName(tbl);
    return {
      where: (predicate?: any) => {
        if (typeof predicate === "function") {
          const current = mockState[name] ?? [];
          mockState[name] = current.filter((item) => !predicate(item));
        } else {
          mockState[name] = [];
        }
        saveWebState(mockState);
        return Promise.resolve(mockState[name] ?? []);
      },
      then: (resolve: (val: any) => any) => {
        mockState[name] = [];
        saveWebState(mockState);
        return resolve([]);
      },
    };
  },
  transaction: async (cb: any) => {
    const res = await cb(db);
    saveWebState(mockState);
    return res;
  },
};

export async function initializeDatabase(): Promise<void> {
  console.log("[ARISE Persistence] Database initialized with persistent state");
}
