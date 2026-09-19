export const HUNTER_ALIASES = [
  'Arjun',
  'Jinwoo',
  'Alex',
  'Zane',
  'Kai',
  'Leo',
  'Ray',
  'Thor',
  'Vikram',
  'Rohan',
  'Sam',
  'Neil',
  'Aarav',
  'Kabir',
  'Aryan',
  'Yash',
  'Dev',
  'Dhruv',
  'Rudra',
  'Reyansh',
  'Karan',
  'Aditya',
  'Rhea',
  'Mira',
  'Tara',
];

export function getRandomHunterName(): string {
  const randomIndex = Math.floor(Math.random() * HUNTER_ALIASES.length);
  return HUNTER_ALIASES[randomIndex];
}
