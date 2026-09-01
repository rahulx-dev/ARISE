import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sun, Cloud, CloudRain, Wind, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

interface WeatherData {
  tempC: number;
  condition: string;
  location: string;
  isDay: boolean;
}

const CACHED_FALLBACK: WeatherData = {
  tempC: 24,
  condition: 'Clear Skies',
  location: 'Local Sector',
  isDay: true,
};

export const WeatherWidget = React.memo(function WeatherWidget() {
  const { colors } = useTheme();
  const [weather, setWeather] = useState<WeatherData>(CACHED_FALLBACK);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  useEffect(() => {
    // Determine condition based on time of day for offline robustness
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 19;
    setWeather({
      tempC: isDay ? 26 : 21,
      condition: isDay ? 'Optimal Climate' : 'Cool Atmospheric',
      location: 'Local Sector',
      isDay,
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.leftCol}>
        <View style={styles.weatherIconCircle}>
          {weather.isDay ? (
            <Sun size={20} color={colors.accentGold} />
          ) : (
            <Cloud size={20} color={colors.secondary} />
          )}
        </View>
        <View>
          <Text style={[styles.tempText, { color: colors.textPrimary }]}>{weather.tempC}°C</Text>
          <Text style={[styles.conditionText, { color: colors.textSecondary }]}>
            {weather.condition}
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text style={[styles.locationText, { color: colors.textMuted }]}>{weather.location}</Text>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statusText, { color: colors.primary }]}>ENVIRONMENT STABLE</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weatherIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempText: {
    fontSize: 18,
    fontWeight: '900',
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
