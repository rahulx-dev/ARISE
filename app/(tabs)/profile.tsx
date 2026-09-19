import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Crown,
  ChevronRight,
  Mic,
  Moon,
  Globe,
  Bell,
  Shield,
  Cloud,
  HelpCircle,
  Info,
  Plus,
  Flame,
  Award,
} from 'lucide-react-native';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { getRankForLevel } from '../../src/constants/ranks';
import { db } from '../../src/database/client';
import { exerciseSession, achievement } from '../../src/database/schema';

export default function WarriorProfileTab() {
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const haptics = useHaptics();

  const {
    notificationsEnabled,
    toggleNotifications,
    theme,
  } = useSettingsStore();

  const [voiceCoachActive, setVoiceCoachActive] = useState<boolean>(true);
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
    }, [loadProfile])
  );

  useEffect(() => {
    loadProfile();
    fetchStats();
  }, [loadProfile]);

  const level = profile?.level || 12;
  const displayName = profile?.displayName || 'Arjun';
  const currentRank = getRankForLevel(level);
  const avatarIcon = profile?.avatarIcon || 'pfp_01';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ================= 1. PROFILE HEADER CARD ================= */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              <PlayerAvatar iconId={avatarIcon} size={72} />
              <View style={styles.crownPill}>
                <Crown size={14} color="#F59E0B" />
              </View>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.rankSubText}>
                Level {level} • {currentRank.rankCode}-Rank Hunter
              </Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.xpWrap}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>XP Progress</Text>
              <Text style={styles.xpFraction}>380 / 500 XP (76%)</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: '76%' }]} />
            </View>
          </View>
        </View>

        {/* ================= 2. ATTRIBUTES SECTION ================= */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>Attributes</Text>
          <View style={styles.attributesRow}>
            <View style={[styles.attributeBadge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <Text style={[styles.attributeCode, { color: '#DC2626' }]}>STR</Text>
              <Text style={[styles.attributeVal, { color: '#DC2626' }]}>80</Text>
            </View>

            <View style={[styles.attributeBadge, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }]}>
              <Text style={[styles.attributeCode, { color: '#059669' }]}>DIS</Text>
              <Text style={[styles.attributeVal, { color: '#059669' }]}>95</Text>
            </View>

            <View style={[styles.attributeBadge, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
              <Text style={[styles.attributeCode, { color: '#0284C7' }]}>FOC</Text>
              <Text style={[styles.attributeVal, { color: '#0284C7' }]}>78</Text>
            </View>

            <View style={[styles.attributeBadge, { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }]}>
              <Text style={[styles.attributeCode, { color: '#7C3AED' }]}>HLT</Text>
              <Text style={[styles.attributeVal, { color: '#7C3AED' }]}>70</Text>
            </View>

            <View style={[styles.attributeBadge, { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' }]}>
              <Text style={[styles.attributeCode, { color: '#4F46E5' }]}>INT</Text>
              <Text style={[styles.attributeVal, { color: '#4F46E5' }]}>65</Text>
            </View>
          </View>
        </View>

        {/* ================= 3. TRANSFORMATION JOURNEY ================= */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={styles.sectionHeading}>Transformation Journey</Text>
            <TouchableOpacity
              onPress={() => router.push('/photos' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLinkText}>View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.transformationScroll}
          >
            {/* Before Card */}
            <TouchableOpacity
              style={styles.transformCard}
              onPress={() => router.push('/photos' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.transformPlaceholder}>
                <Text style={styles.transformPlaceholderEmoji}>💪</Text>
              </View>
              <Text style={styles.transformCardTitle}>Before</Text>
              <Text style={styles.transformCardSub}>Day 1 • 78 kg</Text>
            </TouchableOpacity>

            {/* After Card */}
            <TouchableOpacity
              style={styles.transformCard}
              onPress={() => router.push('/photos' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.transformPlaceholder, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.transformPlaceholderEmoji}>🔥</Text>
              </View>
              <Text style={styles.transformCardTitle}>After</Text>
              <Text style={styles.transformCardSub}>Day 45 • 72 kg</Text>
            </TouchableOpacity>

            {/* Add Photo Card */}
            <TouchableOpacity
              style={styles.addPhotoCard}
              onPress={() => {
                haptics.light();
                router.push('/photos' as any);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.addPhotoCircle}>
                <Plus size={20} color="#6B7280" />
              </View>
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ================= 4. SETTINGS & PREFERENCES ================= */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>Settings</Text>

          <View style={styles.settingsGroupCard}>
            {/* Voice Coach */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Mic size={18} color="#E53935" />
                </View>
                <View>
                  <Text style={styles.settingsRowTitle}>Voice Coach</Text>
                  <Text style={styles.settingsRowSub}>Audio rep counts & encouragement</Text>
                </View>
              </View>
              <Switch
                value={voiceCoachActive}
                onValueChange={(v) => {
                  haptics.light();
                  setVoiceCoachActive(v);
                }}
                trackColor={{ false: '#E5E7EB', true: '#E53935' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Theme */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                router.push('/settings' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#EDE9FE' }]}>
                  <Moon size={18} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.settingsRowTitle}>Theme</Text>
                  <Text style={styles.settingsRowSub}>Light presentation</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Language */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                router.push('/settings' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Globe size={18} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.settingsRowTitle}>Language</Text>
                  <Text style={styles.settingsRowSub}>English (US)</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Notifications */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Bell size={18} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.settingsRowTitle}>Notifications</Text>
                  <Text style={styles.settingsRowSub}>Daily reminders & streak alerts</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={() => {
                  haptics.light();
                  toggleNotifications();
                }}
                trackColor={{ false: '#E5E7EB', true: '#E53935' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* App Blocking */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                router.push('/settings/apps' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Shield size={18} color="#DC2626" />
                </View>
                <View>
                  <Text style={styles.settingsRowTitle}>App Blocking</Text>
                  <Text style={styles.settingsRowSub}>Anti-distraction shield enabled</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Cloud Backup */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                router.push('/settings' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#D1FAE5' }]}>
                  <Cloud size={18} color="#059669" />
                </View>
                <View>
                  <Text style={styles.settingsRowTitle}>Cloud Backup</Text>
                  <Text style={styles.settingsRowSub}>Auto-synced with Supabase</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Help & Support */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                router.push('/settings' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#F3F4F6' }]}>
                  <HelpCircle size={18} color="#4B5563" />
                </View>
                <View>
                  <Text style={styles.settingsRowTitle}>Help & Support</Text>
                  <Text style={styles.settingsRowSub}>Video guides & FAQ</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* About ARISE */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => {
                haptics.light();
                router.push('/settings' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#F3F4F6' }]}>
                  <Info size={18} color="#4B5563" />
                </View>
                <View>
                  <Text style={styles.settingsRowTitle}>About ARISE</Text>
                  <Text style={styles.settingsRowSub}>Version 1.0.0 • Monarch Edition</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 24,
    paddingBottom: 40,
  },

  // 1. Profile Header Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  crownPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  rankSubText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E53935',
  },
  xpWrap: {
    gap: 6,
  },
  xpLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  xpFraction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#E53935',
  },

  // 2. Attributes Section
  sectionWrap: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E53935',
  },
  attributesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  attributeBadge: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
  },
  attributeCode: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  attributeVal: {
    fontSize: 16,
    fontWeight: '900',
  },

  // 3. Transformation Journey
  transformationScroll: {
    flexDirection: 'row',
    gap: 12,
  },
  transformCard: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    alignItems: 'center',
    gap: 4,
  },
  transformPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  transformPlaceholderEmoji: {
    fontSize: 32,
  },
  transformCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  transformCardSub: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  addPhotoCard: {
    width: 120,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPhotoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },

  // 4. Settings Group
  settingsGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  settingsRowSub: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
  },
});
