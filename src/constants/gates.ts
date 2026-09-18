export interface GateMission {
  id: string;
  title: string;
  durationLabel: string;
  durationMinutes: number;
  crystalBounty: number;
  xpReward: number;
  topic: string;
  questions: {
    question: string;
    options: string[];
  }[];
}

export interface DungeonGate {
  id: string;
  rankCode: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  title: string;
  threatName: string;
  lore: string;
  badgeColor: string;
  borderColor: string;
  softGlow: string;
  requiredLevel: number;
  missions: GateMission[];
}

export const DUNGEON_GATES: DungeonGate[] = [
  {
    id: 'gate_e_goblin',
    rankCode: 'E',
    title: 'Lesser Goblin Caverns',
    threatName: 'Goblin Scout Vanguard',
    lore: 'Low-tier gate detected in the outer district. Quick intel reconnaissance missions to weaken goblin clusters.',
    badgeColor: '#38BDF8',
    borderColor: '#0284C7',
    softGlow: 'rgba(2, 132, 199, 0.15)',
    requiredLevel: 1,
    missions: [
      {
        id: 'e_mission_1',
        title: 'Mobile Gaming Intel Brief',
        durationLabel: '2 Mins',
        durationMinutes: 2,
        crystalBounty: 20,
        xpReward: 50,
        topic: 'Gaming Habits & App Preferences',
        questions: [
          {
            question: 'Which mobile game category occupies most of your playtime?',
            options: ['Action / Anime RPG', 'Tactical Strategy', 'Casual & Puzzle', 'Habit & Fitness Apps'],
          },
          {
            question: 'How many daily hours do you usually spend on mobile screen time?',
            options: ['Less than 2 Hours', '2 to 4 Hours', '4 to 6 Hours', 'More than 6 Hours'],
          },
        ],
      },
      {
        id: 'e_mission_2',
        title: 'Daily Routine Diagnostic',
        durationLabel: '3 Mins',
        durationMinutes: 3,
        crystalBounty: 30,
        xpReward: 75,
        topic: 'Personal Discipline & Productivity',
        questions: [
          {
            question: 'What is your primary daily focus goal for this month?',
            options: ['Physical Strength & Muscle', 'Screen Detox & Mental Clarity', 'Consistent Daily Routine', 'Academic / Career Progress'],
          },
          {
            question: 'Which time of day is your energy at its peak?',
            options: ['Early Morning (6 AM - 10 AM)', 'Afternoon (12 PM - 4 PM)', 'Evening (5 PM - 9 PM)', 'Late Night (10 PM - 2 AM)'],
          },
        ],
      },
    ],
  },
  {
    id: 'gate_d_orc',
    rankCode: 'D',
    title: 'Armored Orc Stronghold',
    threatName: 'Orc Marauder Battalion',
    lore: 'Fortified perimeter with heavily armored vanguard troops. Tactical research required to breach inner defenses.',
    badgeColor: '#2DD4BF',
    borderColor: '#0D9488',
    softGlow: 'rgba(13, 148, 136, 0.15)',
    requiredLevel: 5,
    missions: [
      {
        id: 'd_mission_1',
        title: 'Fitness Wearables Assessment',
        durationLabel: '4 Mins',
        durationMinutes: 4,
        crystalBounty: 40,
        xpReward: 100,
        topic: 'Smartwatches & Workout Trackers',
        questions: [
          {
            question: 'Do you track physical workouts with a smartwatch or band?',
            options: ['Apple Watch / Galaxy Watch', 'Fitness Band (Fitbit, Mi, Noise)', 'Smartphone sensors only', 'None / Analog tracking'],
          },
          {
            question: 'Which workout metric matters most to you?',
            options: ['Rep count & set volume', 'Heart rate zones & calories', 'Streak consistency', 'Progress photos & aesthetics'],
          },
        ],
      },
      {
        id: 'd_mission_2',
        title: 'Sports Apparel & Nutrition Intel',
        durationLabel: '5 Mins',
        durationMinutes: 5,
        crystalBounty: 50,
        xpReward: 130,
        topic: 'Sporting Goods & Supplements',
        questions: [
          {
            question: 'How frequently do you purchase health supplements (Whey, Creatine)?',
            options: ['Monthly subscription', 'Every 2-3 months', 'Rarely / Special occasions', 'Never purchase supplements'],
          },
          {
            question: 'Which athletic brand do you consider most durable?',
            options: ['Nike', 'Adidas / Puma', 'Under Armour', 'Local / Generic Athletic Gear'],
          },
        ],
      },
    ],
  },
  {
    id: 'gate_c_hobgoblin',
    rankCode: 'C',
    title: 'Hobgoblin Shaman Crypt',
    threatName: 'Hobgoblin High Chieftain',
    lore: 'High-density mana field shielded by dark totems. Strategic consumer data analysis unlocks dungeon vault doors.',
    badgeColor: '#10B981',
    borderColor: '#059669',
    softGlow: 'rgba(5, 150, 105, 0.15)',
    requiredLevel: 10,
    missions: [
      {
        id: 'c_mission_1',
        title: 'Streaming & Media Analysis',
        durationLabel: '7 Mins',
        durationMinutes: 7,
        crystalBounty: 75,
        xpReward: 220,
        topic: 'Anime, Movies & Music Subscriptions',
        questions: [
          {
            question: 'Which video streaming service do you utilize most frequently?',
            options: ['Netflix', 'Crunchyroll / Anime channels', 'Amazon Prime Video', 'YouTube / Free platforms'],
          },
          {
            question: 'What type of audio fuels your intense workout sets?',
            options: ['Energetic Synthwave / Phonk', 'Rock / Heavy Metal', 'Hip-Hop / Rap', 'Podcasts / Audiobooks'],
          },
        ],
      },
      {
        id: 'c_mission_2',
        title: 'Coaching AI & Monetization Study',
        durationLabel: '8 Mins',
        durationMinutes: 8,
        crystalBounty: 100,
        xpReward: 260,
        topic: 'AI Coaching & Habit Tech',
        questions: [
          {
            question: 'Would you pay a small monthly pass for unlimited ad-free AI motion tracking?',
            options: ['Definitely Yes ($3-$5/mo)', 'Maybe if bonus coins are included', 'Prefer free with ads', 'No interest'],
          },
          {
            question: 'How important is offline functionality in your daily workout app?',
            options: ['Critical (no gym internet)', 'Moderately important', 'Rarely offline', 'Not important'],
          },
        ],
      },
    ],
  },
  {
    id: 'gate_b_shadow_beast',
    rankCode: 'B',
    title: 'Shadow Beast Territory',
    threatName: 'Blood-Fanged Shadow Beast',
    lore: 'High-threat gate emitting dark mana. Fast, lethal predators inhabit the labyrinth. Financial sector surveys generate immense crystal yields.',
    badgeColor: '#8B5CF6',
    borderColor: '#6D28D9',
    softGlow: 'rgba(109, 40, 217, 0.15)',
    requiredLevel: 15,
    missions: [
      {
        id: 'b_mission_1',
        title: 'Digital Payments & Tech Survey',
        durationLabel: '10 Mins',
        durationMinutes: 10,
        crystalBounty: 120,
        xpReward: 450,
        topic: 'Digital Wallets & Security',
        questions: [
          {
            question: 'Which digital payment gateway processes your primary daily transactions?',
            options: ['Google Pay (GPay)', 'Apple Pay / Samsung Pay', 'Direct Bank Mobile App', 'Card / Cash'],
          },
          {
            question: 'Do you maintain automated daily/monthly discipline routines?',
            options: ['Yes, fully scheduled', 'Partially consistent', 'Ad-hoc planning', 'Need strict app enforcement'],
          },
        ],
      },
      {
        id: 'b_mission_2',
        title: 'Habit & Productivity Preferences',
        durationLabel: '12 Mins',
        durationMinutes: 12,
        crystalBounty: 150,
        xpReward: 550,
        topic: 'Discipline Tools & Rewards',
        questions: [
          {
            question: 'Which reward type motivates you most to stay consistent?',
            options: ['RPG Stats & Level Ascension', 'Unlocking Screen Time Passes', 'Cosmetic Themes & Badges', 'Global Leaderboard Ranking'],
          },
          {
            question: 'What is your preferred daily workout duration?',
            options: ['15-20 Mins (High Intensity)', '30-45 Mins (Standard)', '60+ Mins (Full Session)', 'Split Sessions'],
          },
        ],
      },
    ],
  },
  {
    id: 'gate_a_wyvern',
    rankCode: 'A',
    title: 'Infernal Wyvern Cavern',
    threatName: 'Infernal Wyvern Drake',
    lore: 'Sovereign-tier gate with scorched stone terrain. High-level enterprise tech studies unlock massive Mana Crystal reserves.',
    badgeColor: '#F59E0B',
    borderColor: '#D97706',
    softGlow: 'rgba(217, 119, 6, 0.15)',
    requiredLevel: 20,
    missions: [
      {
        id: 'a_mission_1',
        title: 'Developer AI & Cloud Tools Study',
        durationLabel: '15 Mins',
        durationMinutes: 15,
        crystalBounty: 200,
        xpReward: 800,
        topic: 'AI Developer Assistants & Cloud Hosting',
        questions: [
          {
            question: 'What is your current occupational background?',
            options: ['Software Engineer / Tech', 'College Student / STEM', 'Business / Management', 'Freelance / Creative'],
          },
          {
            question: 'Which generative AI developer tool do you utilize most?',
            options: ['Cursor / GitHub Copilot', 'ChatGPT / Claude', 'Google Gemini / Antigravity', 'None at present'],
          },
        ],
      },
      {
        id: 'a_mission_2',
        title: 'SaaS Subscriptions & Productivity',
        durationLabel: '18 Mins',
        durationMinutes: 18,
        crystalBounty: 250,
        xpReward: 950,
        topic: 'Enterprise Software & Workflow',
        questions: [
          {
            question: 'How many software subscriptions do you or your company maintain?',
            options: ['1 to 3 Subscriptions', '4 to 8 Subscriptions', 'More than 8 Subscriptions', 'Zero / Free tiers only'],
          },
          {
            question: 'What feature makes a productivity app indispensable for you?',
            options: ['Strict app locking with real consequences', 'Gamified XP & Rank progression', 'Zero ads & clean dark mode', 'Voice AI encouragement'],
          },
        ],
      },
    ],
  },
  {
    id: 'gate_s_crimson',
    rankCode: 'S',
    title: 'Demon Monarch Baran Domain',
    threatName: 'Baran Demon Sovereign Clone',
    lore: 'EMERGENCY RED GATE DETECTED! Dimensional exit is sealed until the monarch clone is slain. Supreme Mana Crystal bounty!',
    badgeColor: '#FF2E54',
    borderColor: '#D90429',
    softGlow: 'rgba(217, 4, 41, 0.18)',
    requiredLevel: 25,
    missions: [
      {
        id: 's_mission_1',
        title: 'Supreme Lifestyle & Monarch Audit',
        durationLabel: '20 Mins',
        durationMinutes: 20,
        crystalBounty: 350,
        xpReward: 1600,
        topic: 'Comprehensive Lifestyle & Wellness Research',
        questions: [
          {
            question: 'How do you rate your physical and mental discipline consistency?',
            options: ['Top 10% — Unbroken Daily Protocol', 'Strong — Rarely Miss Workouts', 'Moderate — Struggling with Distraction', 'Starting from Scratch'],
          },
          {
            question: 'If ARISE saved you 2 hours of doom-scrolling every single day, how valuable is that to you?',
            options: ['Life-Changing — Immense Value', 'Extremely helpful for studies/career', 'Great for gym focus', 'Neutral'],
          },
        ],
      },
      {
        id: 's_mission_2',
        title: 'Monarch Red Gate Grand Inquest',
        durationLabel: '25 Mins',
        durationMinutes: 25,
        crystalBounty: 500,
        xpReward: 2200,
        topic: 'Ultimate Hunter System Evaluation',
        questions: [
          {
            question: 'Which feature of the ARISE Hunter System do you use most frequently?',
            options: ['AI Motion Tracker Rep Counter', 'App Blocker Screen Time Shield', 'Daily System Quests & Leveling', 'Dungeon Gates & Crystal Bounties'],
          },
          {
            question: 'Would you recommend the ARISE Hunter System to fellow athletes and gamers?',
            options: ['Already recommended to friends', 'Definitely Yes (10/10)', 'Likely Yes', 'Still evaluating'],
          },
        ],
      },
    ],
  },
];
