export const formatCoins = (amount: number): string => {
  return `${formatNumber(amount)} Coins`;
};

export const formatXP = (amount: number): string => {
  return `${formatNumber(amount)} XP`;
};

export const formatLevel = (level: number): string => {
  return `RANK ${level}`;
};

export const formatStreak = (days: number): string => {
  return `${formatNumber(days)} Day Streak`;
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${mins} min`;
};

export const formatNumber = (n: number): string => {
  return new Intl.NumberFormat('en-US').format(n);
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  const percentage = Math.round((value / total) * 100);
  return `${Math.min(Math.max(percentage, 0), 100)}%`;
};
