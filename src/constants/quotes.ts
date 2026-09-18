export interface MotivationalQuote {
  id: number;
  quote: string;
  author: string;
  tag: string;
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 1,
    quote: "Discipline creates the life you deserve.",
    author: "Shadow Monarch",
    tag: "SHADOW MONARCH",
  },
  {
    id: 2,
    quote: "The only hunter you need to surpass is who you were yesterday.",
    author: "Monarch Mindset",
    tag: "DAILY ASCENSION",
  },
  {
    id: 3,
    quote: "Consistency transforms an E-Rank into a National-Level Sovereign.",
    author: "System Directive",
    tag: "RANK UP",
  },
  {
    id: 4,
    quote: "Pain is temporary. Legacy is eternal.",
    author: "Hunter Code",
    tag: "IRON WILL",
  },
  {
    id: 5,
    quote: "Don't stop when you're tired. Stop when you're done.",
    author: "Heavenly Vanguard",
    tag: "HEAVENLY RESTRICTION",
  },
  {
    id: 6,
    quote: "A shadow only rises when there is light to conquer.",
    author: "Vanguard Monarch",
    tag: "ARISE",
  },
  {
    id: 7,
    quote: "Your daily grind is your true awakening.",
    author: "System Mandate",
    tag: "PROTOCOL 01",
  },
  {
    id: 8,
    quote: "Excuses don't build muscle, discipline does.",
    author: "Iron Vanguard",
    tag: "DISCIPLINE",
  },
  {
    id: 9,
    quote: "You don't need motivation when you have an unbreakable habit.",
    author: "Sovereign Rule",
    tag: "HABIT FORGE",
  },
  {
    id: 10,
    quote: "Every repetition is a vote for the person you want to become.",
    author: "Atomic Discipline",
    tag: "IDENTITY",
  },
  {
    id: 11,
    quote: "Greatness isn't a gift. It's forged rep by rep in the shadows.",
    author: "Titan Goliath",
    tag: "GOLIATH MINDSET",
  },
  {
    id: 12,
    quote: "When defeat strikes, rise twice as strong.",
    author: "White Tiger Guildmaster",
    tag: "WHITE TIGER",
  },
  {
    id: 13,
    quote: "The weight doesn't get lighter. You just become stronger.",
    author: "Gym Protocol",
    tag: "POWER LEVEL",
  },
  {
    id: 14,
    quote: "Suffer the pain of discipline or suffer the pain of regret.",
    author: "Stoic Hunter",
    tag: "UNYIELDING",
  },
  {
    id: 15,
    quote: "Focus is saying no to a thousand distractions.",
    author: "Deep Focus",
    tag: "CONCENTRATION",
  },
  {
    id: 16,
    quote: "Your potential is limited only by the work you avoid.",
    author: "System AI",
    tag: "CALIBRATION",
  },
  {
    id: 17,
    quote: "Comfort is the enemy of ascension.",
    author: "Sword Saint Elena",
    tag: "SWORD SAINT",
  },
  {
    id: 18,
    quote: "Even when no one is watching, the System logs your effort.",
    author: "ARISE Protocol",
    tag: "TRACKING",
  },
  {
    id: 19,
    quote: "A true monarch never bargains with hesitation.",
    author: "Shadow Sovereign",
    tag: "SOVEREIGN WILL",
  },
  {
    id: 20,
    quote: "Build a body that can carry your grandest ambitions.",
    author: "Hunter Creed",
    tag: "PHYSIQUE",
  },
  {
    id: 21,
    quote: "One more rep when everything burns is where growth begins.",
    author: "Breakthrough",
    tag: "OVERCOME",
  },
  {
    id: 22,
    quote: "Small daily improvements over time lead to stunning results.",
    author: "Daily Habit",
    tag: "PROGRESSION",
  },
  {
    id: 23,
    quote: "Turn your inner doubts into physical power.",
    author: "Hunter Association",
    tag: "INTERNAL FLAME",
  },
  {
    id: 24,
    quote: "Victory belongs to those who show up every single day.",
    author: "Streak Titan",
    tag: "STREAK",
  },
  {
    id: 25,
    quote: "The mountain looks impossible only until you take the first step.",
    author: "Ascension Path",
    tag: "CLIMB",
  },
  {
    id: 26,
    quote: "Tough times create tough hunters.",
    author: "Grand Chairman Kang",
    tag: "CHAIRMAN",
  },
  {
    id: 27,
    quote: "You have power over your mind, not outside events. Realize this and you will find strength.",
    author: "Marcus Aurelius",
    tag: "STOICISM",
  },
  {
    id: 28,
    quote: "Do what is hard now so your future is easy.",
    author: "Discipline Protocol",
    tag: "FUTURE SELF",
  },
  {
    id: 29,
    quote: "The dungeon is inside your mind. Clear it daily.",
    author: "Raid Master",
    tag: "DUNGEON CLEAR",
  },
  {
    id: 30,
    quote: "Do not pray for an easy life, pray for the strength to endure a difficult one.",
    author: "Bruce Lee",
    tag: "WARRIOR",
  },
  {
    id: 31,
    quote: "Arise from your slumber. Your true destiny awaits.",
    author: "System Directive",
    tag: "AWAKENING",
  },
];

/**
 * Returns today's quote based on day of year
 */
export function getDailyQuote(): MotivationalQuote {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}
