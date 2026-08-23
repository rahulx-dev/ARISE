import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');
const ORB_SIZE = Math.min(width * 0.72, 270);

interface MetricPage {
  icon: string;
  iconColor: string;
  mainVal1: string;
  unit1: string;
  mainVal2?: string;
  unit2?: string;
  subtitle: string;
  pillBadgeText: string;
  pillBadgeColor?: string;
}

interface LuminousOrbProps {
  disciplineScore?: number;
  streakDays?: number;
  unlockedMinutes?: number;
  coins?: number;
  onPress?: () => void;
}

export function LuminousOrb({
  disciplineScore = 98,
  streakDays = 0,
  unlockedMinutes = 45,
  coins = 0,
  onPress,
}: LuminousOrbProps) {
  const [pageIndex, setPageIndex] = useState(0);

  const hours = Math.floor(unlockedMinutes / 60);
  const mins = unlockedMinutes % 60;

  const pages: MetricPage[] = [
    {
      icon: 'weather-night',
      iconColor: colors.primaryLight,
      mainVal1: `${hours > 0 ? hours : '0'}`,
      unit1: 'hr',
      mainVal2: `${mins}`,
      unit2: 'min',
      subtitle: 'Your active screen time',
      pillBadgeText: `${disciplineScore}% Discipline Score`,
      pillBadgeColor: colors.primaryLight,
    },
    {
      icon: 'fire',
      iconColor: colors.warning,
      mainVal1: `${streakDays}`,
      unit1: 'DAYS',
      subtitle: 'Consecutive Daily Streak',
      pillBadgeText: 'Streak Shield Active',
      pillBadgeColor: colors.warning,
    },
    {
      icon: 'circle-multiple-outline',
      iconColor: colors.accentGold,
      mainVal1: `${coins}`,
      unit1: 'COINS',
      subtitle: 'Earned Token Vault',
      pillBadgeText: 'Spend in Time Shop',
      pillBadgeColor: colors.accentGold,
    },
  ];

  const currentPage = pages[pageIndex];

  const handleNextPage = () => {
    setPageIndex((prev) => (prev + 1) % pages.length);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress || handleNextPage}
      style={styles.container}
    >
      {/* Outer Atmospheric Halo */}
      <View style={styles.outerAtmosphereHalo}>
        {/* Middle Glass Spherical Border */}
        <View style={styles.glassSphericalRim}>
          {/* Inner Core Surface */}
          <View style={styles.innerOrbCore}>
            {/* Top Minimalist Luminous Icon */}
            <View style={styles.topIconWrap}>
              <MaterialCommunityIcons
                name={currentPage.icon as any}
                size={28}
                color={currentPage.iconColor}
              />
            </View>

            {/* Large Dual Hero Numbers */}
            <View style={styles.heroNumbersRow}>
              <Text style={styles.bigHeroNum}>{currentPage.mainVal1}</Text>
              <Text style={styles.heroUnit}>{currentPage.unit1}</Text>
              {currentPage.mainVal2 !== undefined && (
                <>
                  <Text style={[styles.bigHeroNum, { marginLeft: 8 }]}>
                    {currentPage.mainVal2}
                  </Text>
                  <Text style={styles.heroUnit}>{currentPage.unit2}</Text>
                </>
              )}
            </View>

            {/* Subtitle Description */}
            <Text style={styles.subtitleText}>{currentPage.subtitle}</Text>

            {/* Floating Frosted Pill Badge */}
            <View style={styles.frostedPillBadge}>
              <Text
                style={[
                  styles.pillBadgeText,
                  currentPage.pillBadgeColor
                    ? { color: currentPage.pillBadgeColor }
                    : {},
                ]}
              >
                {currentPage.pillBadgeText}
              </Text>
            </View>

            {/* Pagination Dots */}
            <View style={styles.paginationDotsRow}>
              {pages.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    pageIndex === i ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  outerAtmosphereHalo: {
    width: ORB_SIZE + 24,
    height: ORB_SIZE + 24,
    borderRadius: (ORB_SIZE + 24) / 2,
    backgroundColor: 'rgba(108, 71, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
    elevation: 10,
  },
  glassSphericalRim: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(20, 26, 44, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerOrbCore: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  topIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroNumbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: -4,
  },
  bigHeroNum: {
    fontSize: 46,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  heroUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 3,
  },
  subtitleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -8,
  },
  frostedPillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  paginationDotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 14,
    backgroundColor: colors.primaryLight,
  },
  dotInactive: {
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
