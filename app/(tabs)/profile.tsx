import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Gear,
  CaretRight,
  User,
  Image as ImageIcon,
  Trophy,
  Gift,
  Package,
  Fire,
  Barbell,
  Star,
  Diamond,
} from 'phosphor-react-native';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { SwipeableTabScreen } from '../../src/components/navigation/SwipeableTabScreen';
import { useHaptics } from '../../src/hooks/useHaptics';
import { db } from '../../src/database/client';
import { exerciseSession, achievement } from '../../src/database/schema';

export default function WarriorProfileTab() {
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const haptics = useHaptics();

  const [totalWorkouts, setTotalWorkouts] = useState<number>(0);
  const [totalAchievements, setTotalAchievements] = useState<number>(0);
  const lastFocusLoadRef = useRef<number>(0);

  const fetchStats = async () => {
    try {
      const [workouts, achs] = await Promise.all([
        db.select().from(exerciseSession),
        db.select().from(achievement),
      ]);
      setTotalWorkouts(workouts.length);
      setTotalAchievements(achs.length);
    } catch (e) {
      console.warn('Error fetching warrior stats:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusLoadRef.current > 10000) {
        lastFocusLoadRef.current = now;
        loadProfile();
        fetchStats();
      }
    }, [])
  );

  useEffect(() => {
    loadProfile();
    fetchStats();
  }, []);

  const level = profile?.level || 1;
  const displayName = profile?.displayName || 'ARISE HUNTER';
  const currentXP = profile?.currentXP || 0;
  const xpNeeded = Math.max(100, level * 100);
  const xpPercent = Math.min(100, Math.round((currentXP / xpNeeded) * 100));
  const coins = profile?.coins || 0;
  const streak = profile?.currentStreak || 0;
  const avatarIcon = profile?.avatarIcon || 'img_pfp_01';
  const userHandle = `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'arise.hunter'}`;

  return (
    <SwipeableTabScreen prevTab="/(tabs)/progress" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>WARRIOR</Text>
            <Text style={styles.headerSubtitle}>DISCIPLINE IN ACTION</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              router.push('/settings');
            }}
            style={styles.settingsIconBtn}
            activeOpacity={0.7}
          >
            <Gear size={20} color="#F5F5F2" weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Identity Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.avatarWrapper}>
              <PlayerAvatar
                iconId={avatarIcon}
                size={84}
                glow={true}
                glowColor="#9AAEFF"
              />
            </View>

            <Text style={styles.heroDisplayName}>{displayName.toUpperCase()}</Text>
            <Text style={styles.heroHandle}>{userHandle}</Text>
            <Text style={styles.heroQuote}>"{profile?.bio || 'A better me. Every day.'}"</Text>

            {/* Level & XP Gauge */}
            <View style={styles.xpBlock}>
              <View style={styles.xpLabelRow}>
                <Text style={styles.levelBadgeText}>Level {level}</Text>
                <Text style={styles.xpNumbersText}>
                  {currentXP.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                </Text>
              </View>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${Math.max(4, Math.min(100, xpPercent))}%` }]} />
              </View>
            </View>
          </View>

          {/* 4 Stat Cards Row */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Fire size={18} color="#FF6B00" weight="fill" />
              <Text style={styles.statNumber}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.statCard}>
              <Barbell size={18} color="#00F2FE" weight="fill" />
              <Text style={styles.statNumber}>{totalWorkouts}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>

            <View style={styles.statCard}>
              <Star size={18} color="#FFD700" weight="fill" />
              <Text style={styles.statNumber}>{totalAchievements}</Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>

            <View style={styles.statCard}>
              <Diamond size={18} color="#9AAEFF" weight="fill" />
              <Text style={styles.statNumber}>
                {coins >= 1000 ? `${(coins / 1000).toFixed(1)}K` : coins}
              </Text>
              <Text style={styles.statLabel}>Mana Crystals</Text>
            </View>
          </View>

          {/* Section 1: PROFILE */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>PROFILE</Text>
            <Text style={styles.sectionSub}>BUILD YOURSELF</Text>
          </View>
          <View style={styles.cardGroup}>
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                router.push('/settings/profile-edit' as any);
              }}
            >
              <View style={styles.iconCircle}>
                <User size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Edit Profile & Avatar</Text>
                <Text style={styles.menuDesc}>Callsign, bio, goals & custom PFP</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                router.push('/photos' as any);
              }}
            >
              <View style={styles.iconCircle}>
                <ImageIcon size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Physique Transformation</Text>
                <Text style={styles.menuDesc}>Track your real progress</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Section 2: PROGRESSION */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>PROGRESSION</Text>
            <Text style={styles.sectionSub}>TURN EFFORT INTO PROOF</Text>
          </View>
          <View style={styles.cardGroup}>
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                router.push('/rewards' as any);
              }}
            >
              <View style={styles.iconCircle}>
                <Trophy size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Achievements & Badges</Text>
                <Text style={styles.menuDesc}>Your milestones and rewards</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                router.push('/rewards/streak-milestones' as any);
              }}
            >
              <View style={styles.iconCircle}>
                <Gift size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Streak Milestones</Text>
                <Text style={styles.menuDesc}>Claim rewards (Day 3, 7, 14, 30...)</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Section 3: REWARDS */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>REWARDS</Text>
            <Text style={styles.sectionSub}>DISCIPLINE PAYS</Text>
          </View>
          <View style={styles.cardGroup}>
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.75}
              onPress={() => {
                haptics.light();
                router.push('/shop' as any);
              }}
            >
              <View style={styles.iconCircle}>
                <Package size={19} color="#9AAEFF" weight="duotone" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Redeem Vault & Shop</Text>
                <Text style={styles.menuDesc}>Use Mana Crystals for themes, passes & more</Text>
              </View>
              <CaretRight size={18} color="#A6A9AE" weight="bold" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </SwipeableTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050607',
  },
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F5F5F2',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A6A9AE',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  settingsIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0E1115',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  heroCard: {
    backgroundColor: '#0E1115',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  heroDisplayName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F5F5F2',
    letterSpacing: 1.5,
  },
  heroHandle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#A6A9AE',
    marginTop: 2,
  },
  heroQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#A6A9AE',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  xpBlock: {
    width: '100%',
    gap: 6,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#9AAEFF',
  },
  xpNumbersText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A6A9AE',
  },
  xpTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#9AAEFF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0E1115',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F5F5F2',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#A6A9AE',
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F5F5F2',
    letterSpacing: 1.2,
  },
  sectionSub: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#A6A9AE',
    letterSpacing: 1,
  },
  cardGroup: {
    backgroundColor: '#0E1115',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(154, 174, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextCol: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5F5F2',
  },
  menuDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#A6A9AE',
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 64,
  },
});
