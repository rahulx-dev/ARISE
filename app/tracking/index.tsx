import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { CognitiveLineChart } from '../../src/components/master/CognitiveLineChart';
import { colors } from '../../src/theme/colors';

export default function TrackingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tracking</Text>
        </View>

        {/* Date Selector Row */}
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity style={styles.dateArrowBtn}>
            <ChevronLeft size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.dateText}>May 20, 2024</Text>
          <TouchableOpacity style={styles.dateArrowBtn}>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Card 1: Cognitive Score */}
          <MasterCard style={styles.cognitiveCard}>
            <Text style={styles.cardHeaderTitle}>Cognitive Score</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreBigText}>83%</Text>
              <Text style={styles.scoreBadgeText}>Excellent</Text>
            </View>

            {/* Glowing Green Line Chart */}
            <CognitiveLineChart />

            {/* Sub-Metrics Row */}
            <View style={styles.subMetricsRow}>
              <View style={styles.subMetricCol}>
                <Text style={styles.subMetricLabel}>Focus</Text>
                <Text style={styles.subMetricVal}>79%</Text>
              </View>

              <View style={styles.subMetricCol}>
                <Text style={styles.subMetricLabel}>Concentration</Text>
                <Text style={styles.subMetricVal}>1.15</Text>
              </View>

              <View style={styles.subMetricCol}>
                <Text style={styles.subMetricLabel}>Fatigue</Text>
                <Text style={styles.subMetricVal}>
                  17% <Text style={{ color: colors.primary, fontSize: 11 }}>Low</Text>
                </Text>
              </View>
            </View>
          </MasterCard>

          {/* Card 2: Productive Time */}
          <MasterCard style={styles.productiveCard}>
            <View style={styles.productiveMeta}>
              <Text style={styles.cardHeaderTitle}>Productive Time</Text>
              <Text style={styles.productiveBigNum}>4h 32m</Text>
              <Text style={styles.productiveDeltaText}>+12% from yesterday</Text>
            </View>

            <View style={styles.productiveIconCircle}>
              <TrendingUp size={24} color={colors.primary} strokeWidth={2.5} />
            </View>
          </MasterCard>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
  },
  dateArrowBtn: {
    padding: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 16,
  },
  cognitiveCard: {
    padding: 18,
    gap: 12,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  scoreBigText: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  subMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#202020',
  },
  subMetricCol: {
    gap: 4,
  },
  subMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  subMetricVal: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  productiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  productiveMeta: {
    gap: 4,
  },
  productiveBigNum: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  productiveDeltaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  productiveIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1E2F22',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
