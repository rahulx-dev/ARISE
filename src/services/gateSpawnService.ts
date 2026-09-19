import { expoDb } from "../database/client";
import { crystalRepository } from "../database/repositories/crystalRepository";
import { userRepository } from "../database/repositories/userRepository";
import { getCloudUserId } from "./supabaseClient";
import { getCpxOfferwallUrl, getBitLabsUrl } from "../config/surveyConfig";

export interface SurveyQuestion {
  question: string;
  options: string[];
}

export interface SurveyTask {
  id: string;
  provider: string; // e.g., 'CPX Research', 'BitLabs', 'Monarch Market Inquest', 'Hunter Analytics'
  title: string;
  topic: string;
  durationMinutes: number;
  durationLabel: string;
  grossPayoutInr: number; // Partner gross payout in INR (e.g., ₹150)
  hunterCrystals: number; // 20% hunter cut in Mana Crystals (where 10 crystals = ₹1 INR)
  xpReward: number;
  surveyUrl?: string; // Optional external survey link
  questions: SurveyQuestion[];
  isCompleted?: boolean;
}

export interface SpawnedDungeonGate {
  id: string;
  rankCode: "E" | "D" | "C" | "B" | "A" | "S";
  title: string;
  threatName: string;
  lore: string;
  badgeColor: string;
  borderColor: string;
  softGlow: string;
  requiredLevel: number;
  spawnedAt: number;
  expiresAt: number; // Unix epoch ms
  isCleared: boolean;
  missions: SurveyTask[];
}

const SPAWNED_GATES_KEY = "@arise_spawned_gates";
const LAST_RADAR_SCAN_KEY = "@arise_last_radar_scan";

function getKv(key: string): string | null {
  try {
    expoDb.runSync(
      "CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)",
    );
    const res = (expoDb as any).getFirstSync(
      "SELECT val FROM arise_kv WHERE key = ?",
      [key],
    ) as { val: string } | null;
    return res?.val ?? null;
  } catch {
    return null;
  }
}

function setKv(key: string, val: string): void {
  try {
    expoDb.runSync(
      "CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)",
    );
    expoDb.runSync("INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)", [
      key,
      val,
    ]);
  } catch {}
}

// Master pool of real-world consumer / market research survey tasks
const SURVEY_CATALOG: Omit<SurveyTask, "hunterCrystals">[] = [
  // --- E-RANK SURVEYS (Gross Payout: ₹10 - ₹25 INR -> Hunter gets 20 - 50 Crystals) ---
  {
    id: "surv_e_mobile_gaming",
    provider: "CPX Research",
    title: "Mobile Gaming Intel Inquest",
    topic: "Gaming Habits & Microtransactions",
    durationMinutes: 2,
    durationLabel: "2 Mins",
    grossPayoutInr: 15,
    xpReward: 50,
    questions: [
      {
        question:
          "Which mobile game genre occupies the highest portion of your weekly playtime?",
        options: [
          "Anime / Action RPGs",
          "Competitive Shooters / Battle Royale",
          "Casual / Puzzle Games",
          "Fitness & Habit Gamification",
        ],
      },
      {
        question:
          "How much do you typically spend on in-game cosmetic passes each month?",
        options: [
          "Zero / Completely Free-to-Play",
          "₹100 - ₹500",
          "₹500 - ₹2,000",
          "More than ₹2,000",
        ],
      },
      {
        question:
          "What factor is most critical when downloading a new mobile title?",
        options: [
          "Graphics & visual design",
          "Offline single-player capability",
          "Fair progression without pay-to-win",
          "Friend invites & multiplayer",
        ],
      },
    ],
  },
  {
    id: "surv_e_screen_time",
    provider: "BitLabs Market",
    title: "Digital Screen Time & Focus Habits",
    topic: "App Usage & Distraction Triggers",
    durationMinutes: 3,
    durationLabel: "3 Mins",
    grossPayoutInr: 22,
    xpReward: 75,
    questions: [
      {
        question:
          "Which app consumes the majority of your non-productive screen time?",
        options: [
          "Instagram / Reels",
          "YouTube Shorts / Videos",
          "Twitter (X) / Reddit",
          "Mobile Games",
        ],
      },
      {
        question:
          "At what time of day do you experience the highest urges to doom-scroll?",
        options: [
          "Immediately upon waking up",
          "Mid-afternoon work slump",
          "Late night before sleeping",
          "Scattered throughout the whole day",
        ],
      },
      {
        question:
          "Have you attempted digital detox apps before utilizing ARISE?",
        options: [
          "Yes, but bypassed easily",
          "First time using discipline tools",
          "Used native OS screen timers",
          "Attempted grayscale mode",
        ],
      },
    ],
  },

  // --- D-RANK SURVEYS (Gross Payout: ₹30 - ₹55 INR -> Hunter gets 60 - 110 Crystals) ---
  {
    id: "surv_d_wearables",
    provider: "Hunter Analytics",
    title: "Fitness Wearables & Biometrics Assessment",
    topic: "Smartwatches, Heart Rate & Sleep Tracking",
    durationMinutes: 4,
    durationLabel: "4 Mins",
    grossPayoutInr: 40,
    xpReward: 120,
    questions: [
      {
        question: "What hardware do you rely on to measure daily activity?",
        options: [
          "Apple Watch / Galaxy Watch",
          "Fitness Band (Fitbit, Noise, Mi Band)",
          "Phone internal step counter only",
          "None / Rely on visual mirror progress",
        ],
      },
      {
        question:
          "Which fitness metric do you prioritize checking every morning?",
        options: [
          "Sleep duration & recovery score",
          "Resting heart rate",
          "Daily calorie burn estimate",
          "Streak consistency",
        ],
      },
      {
        question:
          "Would you link wearable data directly to ARISE for auto-conquering dungeon gates?",
        options: [
          "Definitely Yes, seamless auto-sync",
          "Maybe, if privacy is strictly local",
          "Prefer manual AI motion verification",
          "No wearable owned",
        ],
      },
    ],
  },
  {
    id: "surv_d_apparel_nutrition",
    provider: "CPX Research",
    title: "Sports Apparel & Supplement Inquest",
    topic: "Whey Protein, Creatine & Gym Gear",
    durationMinutes: 5,
    durationLabel: "5 Mins",
    grossPayoutInr: 50,
    xpReward: 160,
    questions: [
      {
        question:
          "How frequently do you replenish workout nutrition (Whey, Creatine, Pre-workout)?",
        options: [
          "Monthly recurring purchase",
          "Every 2-3 months",
          "Only during intense training blocks",
          "Never purchase workout supplements",
        ],
      },
      {
        question:
          "Which athletic apparel brand offers the highest durability for heavy lifting?",
        options: [
          "Nike",
          "Under Armour",
          "Adidas / Puma",
          "Gymshark / YoungLA / Niche",
        ],
      },
      {
        question:
          "What price point is reasonable for a 1kg tub of certified Whey Isolate?",
        options: [
          "Under ₹2,000",
          "₹2,000 - ₹3,500",
          "₹3,500 - ₹5,000",
          "Quality matters more than price",
        ],
      },
    ],
  },

  // --- C-RANK SURVEYS (Gross Payout: ₹65 - ₹100 INR -> Hunter gets 130 - 200 Crystals) ---
  {
    id: "surv_c_streaming_entertainment",
    provider: "BitLabs Market",
    title: "Global Streaming & Anime Media Analysis",
    topic: "OTT Subscriptions & Workout Playlists",
    durationMinutes: 6,
    durationLabel: "6 Mins",
    grossPayoutInr: 75,
    xpReward: 240,
    questions: [
      {
        question:
          "Which entertainment platform commands the largest share of your viewing time?",
        options: [
          "Netflix / Prime Video",
          "Crunchyroll / Anime Channels",
          "YouTube Premium",
          "Free ad-supported platforms",
        ],
      },
      {
        question: "What audio frequency fuels your PR lifting attempts?",
        options: [
          "High-energy Phonk & Synthwave",
          "Heavy Metal / Hard Rock",
          "Hip-Hop & Drill",
          "Podcasts / Audiobooks",
        ],
      },
      {
        question:
          "How many active paid subscription services do you currently hold?",
        options: [
          "1 to 2 Services",
          "3 to 5 Services",
          "More than 5 Services",
          "Zero / Account sharing only",
        ],
      },
    ],
  },
  {
    id: "surv_c_ai_habits",
    provider: "Monarch Market Inquest",
    title: "AI Discipline & Habit Monetization Study",
    topic: "Gamified Wellness & Real-Time Computer Vision",
    durationMinutes: 8,
    durationLabel: "8 Mins",
    grossPayoutInr: 95,
    xpReward: 320,
    questions: [
      {
        question:
          "How valuable is real-time AI camera rep tracking compared to manual logging?",
        options: [
          "Significantly superior — prevents form cheating",
          "Great for rep accuracy",
          "Equally good as manual notes",
          "Prefer not using camera",
        ],
      },
      {
        question:
          "Would you spend earned Mana Crystals on physical hunter merchandise or real cashouts?",
        options: [
          "Direct UPI cashout into bank",
          "Google Play / Amazon vouchers",
          "In-app hunter avatar cosmetics & passes",
          "Both cashouts and cosmetics",
        ],
      },
      {
        question:
          "Does having real-life stakes (app locking) increase your gym consistency?",
        options: [
          "100% — Strict consequences build discipline",
          "Moderately helpful",
          "Slightly helpful",
          "Prefer relaxed reminders",
        ],
      },
    ],
  },

  // --- B-RANK SURVEYS (Gross Payout: ₹130 - ₹220 INR -> Hunter gets 260 - 440 Crystals) ---
  {
    id: "surv_b_fintech_banking",
    provider: "Hunter Analytics",
    title: "Digital Payments & UPI Security Study",
    topic: "Banking Apps, Wallets & Financial Discipline",
    durationMinutes: 10,
    durationLabel: "10 Mins",
    grossPayoutInr: 160,
    xpReward: 500,
    questions: [
      {
        question:
          "Which digital payment conduit handles your daily merchant transactions?",
        options: [
          "Google Pay (GPay)",
          "PhonePe / Paytm",
          "Direct Banking App (HDFC, SBI, ICICI)",
          "Credit Card / Apple Pay",
        ],
      },
      {
        question:
          "What is your primary investment vehicle for personal wealth accumulation?",
        options: [
          "Mutual Funds & SIPs",
          "Direct Equity / Stocks",
          "Crypto / Web3 Assets",
          "Gold / Fixed Deposits",
        ],
      },
      {
        question:
          "How often do you review your monthly discretionary expenditure?",
        options: [
          "Weekly detailed tracking",
          "Monthly overview",
          "Only when balance is low",
          "Rarely track spending",
        ],
      },
      {
        question:
          "What security feature gives you the highest confidence in a fintech app?",
        options: [
          "Biometric Face/Fingerprint gate",
          "Two-Factor Authenticator tokens",
          "Instant SMS transaction alerts",
          "Device binding security",
        ],
      },
    ],
  },
  {
    id: "surv_b_consumer_hardware",
    provider: "CPX Research",
    title: "High-Performance Tech & Smartphone Inquest",
    topic: "Flagship Chips, Battery Endurance & Displays",
    durationMinutes: 12,
    durationLabel: "12 Mins",
    grossPayoutInr: 200,
    xpReward: 650,
    questions: [
      {
        question: "What silicon chip tier powers your daily smartphone?",
        options: [
          "Flagship (Snapdragon 8 Gen / Apple A-series)",
          "Mid-tier (Snapdragon 7 / Dimensity 8000)",
          "Entry-level processor",
          "Unsure / Default OEM chip",
        ],
      },
      {
        question:
          "What hardware bottleneck causes you to upgrade your mobile device?",
        options: [
          "Battery degradation & slow charging",
          "Thermal throttling & gaming lag",
          "Camera optical quality",
          "Insufficient internal storage",
        ],
      },
      {
        question:
          "How long do you intend to maintain your current smartphone before replacing?",
        options: [
          "1 to 2 Years",
          "2 to 3 Years",
          "3 to 5 Years",
          "Until the device ceases functioning",
        ],
      },
    ],
  },

  // --- A-RANK SURVEYS (Gross Payout: ₹260 - ₹450 INR -> Hunter gets 520 - 900 Crystals) ---
  {
    id: "surv_a_dev_cloud_ai",
    provider: "Monarch Market Inquest",
    title: "Developer AI & Cloud Infrastructure Inquest",
    topic: "LLM Coding Agents, AWS/GCP & Enterprise Tooling",
    durationMinutes: 15,
    durationLabel: "15 Mins",
    grossPayoutInr: 320,
    xpReward: 1000,
    questions: [
      {
        question: "What is your primary professional or academic focus?",
        options: [
          "Software Engineering / DevOps / Cloud",
          "Data Science & Machine Learning",
          "Student in STEM / Computer Science",
          "Business Operations & Leadership",
        ],
      },
      {
        question:
          "Which AI developer ecosystem delivers the highest acceleration in your workflow?",
        options: [
          "Google Antigravity / Gemini Code Assist",
          "Cursor / Claude Sonnet",
          "GitHub Copilot / Copilot Workspace",
          "OpenAI ChatGPT Plus",
        ],
      },
      {
        question: "Where is your team’s primary cloud infrastructure hosted?",
        options: [
          "Google Cloud Platform (GCP)",
          "Amazon Web Services (AWS)",
          "Microsoft Azure",
          "Self-hosted bare metal / Hybrid",
        ],
      },
      {
        question:
          "What is your organization’s annual software & cloud tooling budget?",
        options: [
          "Under $10,000 / Free tiers",
          "$10,000 - $50,000",
          "$50,000 - $250,000",
          "Enterprise ($250,000+)",
        ],
      },
    ],
  },
  {
    id: "surv_a_saas_productivity",
    provider: "BitLabs Market",
    title: "Enterprise SaaS & Autonomous Workflow Audit",
    topic: "Subscription Stack & AI Workforce Automation",
    durationMinutes: 18,
    durationLabel: "18 Mins",
    grossPayoutInr: 420,
    xpReward: 1300,
    questions: [
      {
        question:
          "How many business SaaS applications do you log into on a typical workday?",
        options: [
          "1 to 4 tools",
          "5 to 8 tools",
          "9 to 15 tools",
          "More than 15 tools",
        ],
      },
      {
        question:
          "Which workplace communication suite is mandatory in your organization?",
        options: [
          "Slack",
          "Microsoft Teams",
          "Discord / Telegram",
          "Email & Linear only",
        ],
      },
      {
        question:
          "Has your company formally integrated generative AI into customer-facing products?",
        options: [
          "Yes, active in production",
          "Currently in internal POC/testing",
          "Planning deployment this quarter",
          "No plans due to compliance",
        ],
      },
    ],
  },

  // --- S-RANK SURVEYS (Gross Payout: ₹550 - ₹1,000+ INR -> Hunter gets 1,100 - 2,000+ Crystals) ---
  {
    id: "surv_s_monarch_deep_tech",
    provider: "Monarch Strategic Research",
    title: "Monarch Deep Tech & High-Yield Market Audit",
    topic: "Executive Strategy, AI Hardware & Global Discipline",
    durationMinutes: 22,
    durationLabel: "22 Mins",
    grossPayoutInr: 700,
    xpReward: 2500,
    questions: [
      {
        question:
          "How does daily athletic discipline directly correlate with your cognitive career performance?",
        options: [
          "Absolute prerequisite — Peak physical shape drives high output",
          "Substantial boost to stress tolerance & focus",
          "Moderate benefit",
          "Separated domains",
        ],
      },
      {
        question:
          "Which next-generation AI chip architecture represents the biggest breakthrough?",
        options: [
          "Google TPU v5e / Ironwood",
          "NVIDIA Blackwell B200",
          "Apple M-Series Neural Engine",
          "Custom Silicon / ASICs",
        ],
      },
      {
        question:
          "If ARISE enables you to eliminate 2+ hours of social media addiction daily, what is the annual financial value to your career?",
        options: [
          "Priceless — Tens of thousands in compounding output",
          "Extremely high value (Over ₹100,000/yr)",
          "Noticeable improvement",
          "Unsure",
        ],
      },
      {
        question:
          "What makes the ARISE Solo Leveling gamification system superior to traditional habit trackers?",
        options: [
          "Real consequences & non-bypassable lock security",
          "Tangible rewards (Mana Crystals & Cashout)",
          "Authentic Hunter Rank progression & Leaderboard",
          "Dark anime aesthetic & sound design",
        ],
      },
    ],
  },
  {
    id: "surv_s_global_executive",
    provider: "Hunter Association Global",
    title: "Global Sovereign Hunter Macro Study",
    topic: "Comprehensive Health Span, Wealth & Biohacking",
    durationMinutes: 25,
    durationLabel: "25 Mins",
    grossPayoutInr: 950,
    xpReward: 3200,
    questions: [
      {
        question:
          "What advanced recovery modality do you incorporate alongside resistance training?",
        options: [
          "Cold plunge / Sauna heat shock",
          "Strict 8-hour sleep sleep hygiene",
          "Active deload weeks & sports massage",
          "Standard rest days only",
        ],
      },
      {
        question:
          "Which nutritional protocol do you adhere to for sustained energy?",
        options: [
          "High Protein / Balanced Macro counting",
          "Ketogenic / Low-Carb",
          "Intermittent Fasting (16:8 or OMAD)",
          "Intuitive wholesome eating",
        ],
      },
      {
        question:
          "Would you participate in competitive seasonal Guild Raids with shared crystal pool bounties?",
        options: [
          "Yes, ready to lead an elite guild",
          "Interested as a guild warrior",
          "Prefer solo hunter extraction",
          "Depends on crystal bounty",
        ],
      },
    ],
  },
];

// Gate template lore & bosses
interface GateTemplate {
  title: string;
  threatName: string;
  lore: string;
}

const GATE_TEMPLATES: Record<
  "E" | "D" | "C" | "B" | "A" | "S",
  GateTemplate[]
> = {
  E: [
    {
      title: "Lesser Goblin Caverns",
      threatName: "Goblin Scout Vanguard",
      lore: "Low-tier dimensional rift detected in outer city perimeter. Fast reconnaissance tasks weaken goblin vanguard clusters.",
    },
    {
      title: "Damp Sewer Catacombs",
      threatName: "Mutated Mire Rat Queen",
      lore: "Underground rift infested with toxic vermin. Quick survey intel unlocks access to drain valves.",
    },
  ],
  D: [
    {
      title: "Armored Orc Stronghold",
      threatName: "Orc Marauder Chieftain",
      lore: "Fortified stone bastion garrisoned by armored orc brutes. Target market assessment pierces perimeter defenses.",
    },
    {
      title: "Sunken Lycanthropes Den",
      threatName: "Alpha Shadow Wolf",
      lore: "Dense jungle coordinates emitting feral energy. Biometric field data disorients the pack.",
    },
  ],
  C: [
    {
      title: "Hobgoblin Shaman Crypt",
      threatName: "High Shaman Kargath",
      lore: "High-density mana field fortified by dark totems. Consumer habits analysis dispels the mystical barriers.",
    },
    {
      title: "Frozen Frost Elf Outpost",
      threatName: "Glacial Ranger Commander",
      lore: "Sub-zero temperatures freeze physical weapons. Strategic media data unfreezes the dungeon core.",
    },
  ],
  B: [
    {
      title: "Shadow Beast Territory",
      threatName: "Blood-Fanged Shadow Stalker",
      lore: "Lethal predator dimension cloaked in pure shadow. High-value financial sector surveys illuminate the dark maze.",
    },
    {
      title: "Thunder Drake Eyrie",
      threatName: "Storm-Winged Lightning Drake",
      lore: "Craggy peaks crackling with continuous lightning. Hardware and tech telemetry grounds the sovereign beast.",
    },
  ],
  A: [
    {
      title: "Infernal Wyvern Cavern",
      threatName: "Infernal Wyvern Drake",
      lore: "Sovereign-tier volcanic rift with molten rivers. Enterprise cloud & AI studies harness volcanic crystal reserves.",
    },
    {
      title: "Demon Castle Citadel",
      threatName: "Vulkan the Fire Monarch Drake",
      lore: "Massive iron fortress towering into dark clouds. Software architecture reconnaissance breaks through adamantine gates.",
    },
  ],
  S: [
    {
      title: "Demon Monarch Baran Domain",
      threatName: "Baran Demon Sovereign Clone",
      lore: "EMERGENCY RED GATE DETECTED! Dimensional rift sealed until monarch is slain. Highest gross payout market inquest!",
    },
    {
      title: "Shadow Monarch Throne Room",
      threatName: "Architect of the System Avatar",
      lore: "Supreme reality distortion rift. Complete the grand inquest to extract legendary Mana Crystal reserves!",
    },
  ],
};

const RANK_CONFIG: Record<
  "E" | "D" | "C" | "B" | "A" | "S",
  {
    badgeColor: string;
    borderColor: string;
    softGlow: string;
    requiredLevel: number;
    minGrossPayout: number;
    maxGrossPayout: number;
    collapseHours: number;
  }
> = {
  E: {
    badgeColor: "#38BDF8",
    borderColor: "#0284C7",
    softGlow: "rgba(2, 132, 199, 0.15)",
    requiredLevel: 1,
    minGrossPayout: 10,
    maxGrossPayout: 29,
    collapseHours: 4,
  },
  D: {
    badgeColor: "#2DD4BF",
    borderColor: "#0D9488",
    softGlow: "rgba(13, 148, 136, 0.15)",
    requiredLevel: 4,
    minGrossPayout: 30,
    maxGrossPayout: 59,
    collapseHours: 6,
  },
  C: {
    badgeColor: "#10B981",
    borderColor: "#059669",
    softGlow: "rgba(5, 150, 105, 0.15)",
    requiredLevel: 8,
    minGrossPayout: 60,
    maxGrossPayout: 119,
    collapseHours: 8,
  },
  B: {
    badgeColor: "#8B5CF6",
    borderColor: "#6D28D9",
    softGlow: "rgba(109, 40, 217, 0.15)",
    requiredLevel: 14,
    minGrossPayout: 120,
    maxGrossPayout: 249,
    collapseHours: 10,
  },
  A: {
    badgeColor: "#F59E0B",
    borderColor: "#D97706",
    softGlow: "rgba(217, 119, 6, 0.15)",
    requiredLevel: 20,
    minGrossPayout: 250,
    maxGrossPayout: 499,
    collapseHours: 12,
  },
  S: {
    badgeColor: "#FF2E54",
    borderColor: "#D90429",
    softGlow: "rgba(217, 4, 41, 0.20)",
    requiredLevel: 25,
    minGrossPayout: 500,
    maxGrossPayout: 2000,
    collapseHours: 24,
  },
};

/**
 * Calculates hunter crystal reward based on 80/20 profit rule:
 * 1 INR = 10 Mana Crystals
 * User gets 20% of gross payout in crystals: (grossPayoutInr * 0.20) * 10 = grossPayoutInr * 2
 * Example: ₹150 gross payout -> Hunter gets 300 Crystals (worth ₹30 INR). Platform keeps ₹120 (80%).
 */
export function calculateHunterCrystals(grossPayoutInr: number): number {
  return Math.round(grossPayoutInr * 2);
}

class GateSpawnService {
  /**
   * Spawns a balanced collection of dimensional gates across ranks (E to S).
   * Maps surveys strictly by payout tier into the appropriate gate rank!
   */
  private generateFreshGates(cloudUserId?: string): SpawnedDungeonGate[] {
    const ranks: ("E" | "D" | "C" | "B" | "A" | "S")[] = [
      "S",
      "A",
      "B",
      "C",
      "D",
      "E",
    ];
    const now = Date.now();
    const gates: SpawnedDungeonGate[] = [];

    // Helper: find surveys for a rank range
    const getSurveysForRank = (
      rank: "E" | "D" | "C" | "B" | "A" | "S",
    ): SurveyTask[] => {
      const cfg = RANK_CONFIG[rank];
      const matching = SURVEY_CATALOG.filter(
        (s) =>
          s.grossPayoutInr >= cfg.minGrossPayout &&
          s.grossPayoutInr <= cfg.maxGrossPayout,
      );

      return matching.map((m) => {
        const liveUrl = getCpxOfferwallUrl(cloudUserId || "warrior_device");
        return {
          ...m,
          provider: "CPX Research",
          surveyUrl: liveUrl,
          hunterCrystals: calculateHunterCrystals(m.grossPayoutInr),
          isCompleted: false,
        };
      });
    };

    for (const rank of ranks) {
      const cfg = RANK_CONFIG[rank];
      const templates = GATE_TEMPLATES[rank];
      const template = templates[Math.floor(Math.random() * templates.length)];
      const missions = getSurveysForRank(rank);

      if (missions.length === 0) continue;

      const durationMs = cfg.collapseHours * 60 * 60 * 1000;
      const gateId = `gate_${rank.toLowerCase()}_${now}_${Math.random().toString(36).substring(2, 6)}`;

      gates.push({
        id: gateId,
        rankCode: rank,
        title: template.title,
        threatName: template.threatName,
        lore: template.lore,
        badgeColor: cfg.badgeColor,
        borderColor: cfg.borderColor,
        softGlow: cfg.softGlow,
        requiredLevel: cfg.requiredLevel,
        spawnedAt: now,
        expiresAt: now + durationMs,
        isCleared: false,
        missions,
      });
    }

    return gates;
  }

  /**
   * Get all active spawned gates.
   * Auto-prunes expired gates and auto-spawns fresh ones if expired or empty.
   */
  async getActiveGates(): Promise<SpawnedDungeonGate[]> {
    try {
      const raw = getKv(SPAWNED_GATES_KEY);
      const now = Date.now();
      let cloudUserId = "warrior_device";
      try {
        cloudUserId = await getCloudUserId();
      } catch {}

      if (!raw) {
        const fresh = this.generateFreshGates(cloudUserId);
        setKv(SPAWNED_GATES_KEY, JSON.stringify(fresh));
        return fresh;
      }

      let gates: SpawnedDungeonGate[] = JSON.parse(raw);

      // Check if gates have expired
      const validGates = gates.filter((g) => g.expiresAt > now);

      // If all gates expired or fewer than 3 remain, auto-regenerate fresh gates
      if (validGates.length < 3) {
        const fresh = this.generateFreshGates(cloudUserId);
        setKv(SPAWNED_GATES_KEY, JSON.stringify(fresh));
        return fresh;
      }

      // Ensure ALL survey missions have live verified CPX Research offerwall URLs
      for (const g of validGates) {
        for (const m of g.missions) {
          m.provider = "CPX Research";
          m.surveyUrl = getCpxOfferwallUrl(cloudUserId);
        }
      }

      // Sort with S rank at top, then A, B, C, D, E
      const rankOrder: Record<string, number> = {
        S: 6,
        A: 5,
        B: 4,
        C: 3,
        D: 2,
        E: 1,
      };
      validGates.sort(
        (a, b) => (rankOrder[b.rankCode] || 0) - (rankOrder[a.rankCode] || 0),
      );

      return validGates;
    } catch {
      const fallback = this.generateFreshGates();
      setKv(SPAWNED_GATES_KEY, JSON.stringify(fallback));
      return fallback;
    }
  }

  /**
   * Get a specific gate by its unique ID
   */
  async getGateById(id: string): Promise<SpawnedDungeonGate | null> {
    const gates = await this.getActiveGates();
    return gates.find((g) => g.id === id) ?? null;
  }

  /**
   * Complete a survey mission within a gate.
   * Credits 20% Mana Crystals and XP, updates gate state, and triggers victory if all missions cleared.
   */
  async completeMission(
    gateId: string,
    missionId: string,
  ): Promise<{
    success: boolean;
    allCleared: boolean;
    crystalsAwarded: number;
    xpAwarded: number;
    error?: string;
  }> {
    try {
      const gates = await this.getActiveGates();
      const gate = gates.find((g) => g.id === gateId);

      if (!gate) {
        return {
          success: false,
          allCleared: false,
          crystalsAwarded: 0,
          xpAwarded: 0,
          error: "Gate not found",
        };
      }

      const mission = gate.missions.find((m) => m.id === missionId);
      if (!mission) {
        return {
          success: false,
          allCleared: false,
          crystalsAwarded: 0,
          xpAwarded: 0,
          error: "Mission not found",
        };
      }

      if (mission.isCompleted) {
        return {
          success: false,
          allCleared: false,
          crystalsAwarded: 0,
          xpAwarded: 0,
          error: "Mission already cleared",
        };
      }

      // Mark mission completed
      mission.isCompleted = true;

      // Check if all missions in gate are completed
      const allCleared = gate.missions.every((m) => m.isCompleted);
      if (allCleared) {
        gate.isCleared = true;
      }

      // Save updated gates to local storage
      setKv(SPAWNED_GATES_KEY, JSON.stringify(gates));

      // Increment persistent lifetime completed mission count
      const lifetime =
        Number(getKv("@arise_lifetime_completed_missions") || 0) + 1;
      setKv("@arise_lifetime_completed_missions", String(lifetime));

      // Award Mana Crystals (20% share)
      await crystalRepository.addCrystals(
        mission.hunterCrystals,
        `Cleared Gate Recon: ${mission.title}`,
        gate.id,
        `recon:${gate.id}:${mission.id}`,
        "gate_recon",
      );

      // Award System XP
      await userRepository.addXP(mission.xpReward);

      return {
        success: true,
        allCleared,
        crystalsAwarded: mission.hunterCrystals,
        xpAwarded: mission.xpReward,
      };
    } catch (e: any) {
      return {
        success: false,
        allCleared: false,
        crystalsAwarded: 0,
        xpAwarded: 0,
        error: e?.message || "Failed to complete mission",
      };
    }
  }

  /**
   * Check how many survey missions hunter has legitimately completed
   */
  async getCompletedMissionsCount(): Promise<number> {
    try {
      const count = Number(getKv("@arise_lifetime_completed_missions") || 0);
      if (count > 0) return count;

      // Fallback check in current spawned gates
      const raw = getKv(SPAWNED_GATES_KEY);
      if (!raw) return 0;
      const gates: SpawnedDungeonGate[] = JSON.parse(raw);
      let localCount = 0;
      for (const g of gates) {
        for (const m of g.missions) {
          if (m.isCompleted) localCount++;
        }
      }
      return localCount;
    } catch {
      return 0;
    }
  }

  /**
   * Radar Pulse: Hunter manually scans sector for newly materialized dimensional rifts.
   */
  async triggerRadarScan(): Promise<SpawnedDungeonGate[]> {
    const fresh = this.generateFreshGates();
    setKv(SPAWNED_GATES_KEY, JSON.stringify(fresh));
    setKv(LAST_RADAR_SCAN_KEY, new Date().toISOString());
    return fresh;
  }
}

export const gateSpawnService = new GateSpawnService();
