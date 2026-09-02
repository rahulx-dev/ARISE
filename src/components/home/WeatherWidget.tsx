import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sun, Cloud, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../ios/GlassCard';

interface WeatherInfo {
  tempC: number;
  condition: string;
  city: string;
  isDay: boolean;
  isLoading: boolean;
}

/**
 * Stitch v2 Weather Widget
 */
export const WeatherWidget = React.memo(function WeatherWidget() {
  const { colors, isDark } = useTheme();

  const [weather, setWeather] = useState<WeatherInfo>({
    tempC: 24,
    condition: 'Sunny',
    city: 'Dhanbad',
    isDay: true,
    isLoading: true,
  });

  useEffect(() => {
    fetchLiveWeather();
  }, []);

  const fetchLiveWeather = async () => {
    try {
      // Free open-meteo API for real Indian coordinates (Dhanbad: 23.7957, 86.4304)
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=23.7957&longitude=86.4304&current_weather=true',
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const data = await res.json();
        const current = data.current_weather;
        if (current && typeof current.temperature === 'number') {
          setWeather({
            tempC: Math.round(current.temperature),
            condition: current.is_day === 1 ? 'Clear' : 'Night',
            city: 'Dhanbad',
            isDay: current.is_day === 1,
            isLoading: false,
          });
          return;
        }
      }
    } catch {
      // Graceful offline fallback
    }

    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 19;
    setWeather((prev) => ({
      ...prev,
      tempC: isDay ? 24 : 20,
      condition: isDay ? 'Sunny' : 'Clear',
      isDay,
      isLoading: false,
    }));
  };

  return (
    <GlassCard variant="default" style={styles.card}>
      <View style={styles.leftCol}>
        <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>WEATHER</Text>
        <View style={styles.tempRow}>
          <Text style={[styles.tempNumber, { color: colors.textPrimary }]}>{weather.tempC}°</Text>
          {weather.isDay ? (
            <Sun size={22} color={isDark ? '#FFB95F' : '#D97706'} fill={isDark ? '#FFB95F' : '#D97706'} />
          ) : (
            <Cloud size={22} color={colors.secondary} />
          )}
        </View>
      </View>

      <View style={styles.rightCol}>
        <ArrowRight size={16} color={colors.primary} />
        <Text style={[styles.cityText, { color: colors.textMuted }]}>{weather.city}</Text>
      </View>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    gap: 4,
  },
  weatherLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tempNumber: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cityText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
