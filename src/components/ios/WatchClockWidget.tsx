import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from './GlassCard';

export const WatchClockWidget = React.memo(function WatchClockWidget() {
  const { colors, isDark } = useTheme();
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');
  const [dayName, setDayName] = useState('TODAY');
  const [dateFormatted, setDateFormatted] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHours(String(now.getHours()).padStart(2, '0'));
      setMinutes(String(now.getMinutes()).padStart(2, '0'));
      setSeconds(String(now.getSeconds()).padStart(2, '0'));

      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      setDayName(days[now.getDay()]);

      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      setDateFormatted(`${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard variant="glow" style={styles.watchContainer}>
      <View style={styles.watchInner}>
        {/* Top telemetry line */}
        <View style={styles.topRow}>
          <View style={styles.liveIndicator}>
            <View style={[styles.pulsingDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.chronometerLabel, { color: colors.primary }]}>CHRONO // 01</Text>
          </View>
          <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{dayName}</Text>
        </View>

        {/* Watch Numerals Display */}
        <View style={styles.numeralsRow}>
          <Text style={[styles.mainDigits, { color: colors.textPrimary }]}>
            {hours}:{minutes}
          </Text>
          <View
            style={[
              styles.secondsBadge,
              {
                backgroundColor: isDark ? 'rgba(209, 255, 0, 0.08)' : 'rgba(16, 185, 129, 0.1)',
                borderColor: isDark ? 'rgba(209, 255, 0, 0.25)' : 'rgba(16, 185, 129, 0.3)',
              },
            ]}
          >
            <Text style={[styles.secondsDigits, { color: colors.primary }]}>{seconds}</Text>
            <Text style={[styles.secLabel, { color: colors.textMuted }]}>SEC</Text>
          </View>
        </View>

        {/* Bottom Date Row */}
        <View style={styles.bottomRow}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateFormatted}</Text>
          <View style={[styles.statusTag, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={[styles.statusTagText, { color: colors.textMuted }]}>LOCAL PROTOCOL</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  watchContainer: {
    borderRadius: 20,
  },
  watchInner: {
    padding: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chronometerLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  numeralsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  mainDigits: {
    fontSize: 38,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  secondsBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(209, 255, 0, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(209, 255, 0, 0.2)',
  },
  secondsDigits: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  secLabel: {
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
