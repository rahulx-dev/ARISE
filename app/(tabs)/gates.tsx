import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Line } from 'react-native-svg';
import {
  Swords,
  Crown,
  ChevronRight,
  ChevronDown,
  Lock,
  Sparkles,
  Search,
  CheckCircle2,
  ExternalLink,
  Flame,
  ShieldAlert,
  Clock,
  Trophy,
  FileText,
  Gift,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { fontFamilies } from '../../src/theme/typography';
import { useTranslation } from '../../src/services/i18n';
import { crystalRepository, CrystalLeaderboardHunter } from '../../src/database/repositories/crystalRepository';
import { redGateService, RedGateEncounter, RedGateTrial } from '../../src/services/redGateService';
import { RedGateEncounterModal } from '../../src/components/gates/RedGateEncounterModal';
import { InAppSurveyModal } from '../../src/components/surveys/InAppSurveyModal';
import { getCpxOfferwallUrl, getBitLabsUrl } from '../../src/config/surveyConfig';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { ManaCrystalIcon } from '../../src/components/ui/ManaCrystalIcon';
import { getRankForLevel } from '../../src/constants/ranks';
import { gateSpawnService, SpawnedDungeonGate } from '../../src/services/gateSpawnService';
import { supabase, isSupabaseConfigured, getCloudUserId } from '../../src/services/supabaseClient';
import { AnimatedNumber } from '../../src/components/motion/AnimatedNumber';
import { useScalePress, useShake } from '../../src/hooks/useMotion';
import { motion } from '../../src/theme/motion';

const DUNGEON_IMAGES: Record<string, any> = {
  E: require('../../assets/dungeons/dungeon_e_goblin.jpg'),
  D: require('../../assets/dungeons/dungeon_d_orc.jpg'),
  C: require('../../assets/dungeons/dungeon_c_frost.jpg'),
  B: require('../../assets/dungeons/dungeon_b_crimson.jpg'),
  A: require('../../assets/dungeons/dungeon_a_shadow.jpg'),
  S: require('../../assets/dungeons/dungeon_s_dragon.jpg'),
};

const getRankTagStyles = (rankCode: string, isDark: boolean): { bg: string; border: string; text: string } => {
  if (isDark) {
    switch (rankCode) {
      case 'E':
        return { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.4)', text: '#10B981' };
      case 'D':
        return { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.4)', text: '#3B82F6' };
      case 'C':
        return { bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.4)', text: '#8B5CF6' };
      case 'B':
        return { bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.4)', text: '#F43F5E' };
      case 'A':
        return { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.4)', text: '#F59E0B' };
      case 'S':
      default:
        return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', text: '#EF4444' };
    }
  }
  switch (rankCode) {
    case 'E':
      return { bg: '#ECFDF5', border: '#A7F3D0', text: '#059669' };
    case 'D':
      return { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' };
    case 'C':
      return { bg: '#FAF5FF', border: '#E9D5FF', text: '#7C3AED' };
    case 'B':
      return { bg: '#FFF1F2', border: '#FECDD3', text: '#E11D48' };
    case 'A':
      return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
    case 'S':
    default:
      return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' };
  }
};

function HunterRadarGraphic({
  isDark,
  isScanning,
  isScreenFocused,
}: {
  isDark: boolean;
  isScanning: boolean;
  isScreenFocused: boolean;
}) {
  const ringStroke = isDark ? '#292D33' : '#E4E6EA';
  const crosshairStroke = isDark ? '#1F2228' : '#F0F1F4';
  const blipFill = isDark ? '#68707D' : '#9298A3';

  const sweepRotation = useSharedValue(0);
  const anomalyPulse = useSharedValue(1);

  useEffect(() => {
    if (isScreenFocused) {
      if (isScanning) {
        // Fast controlled radar sweep (1.2s per 360 deg)
        sweepRotation.value = withRepeat(
          withTiming(360, { duration: 1200, easing: Easing.linear }),
          -1,
          false
        );
        anomalyPulse.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 600 }),
            withTiming(0.9, { duration: 600 })
          ),
          -1,
          true
        );
      } else {
        // Idle: very subtle, slow gentle rotation (9s per 360 deg)
        sweepRotation.value = withRepeat(
          withTiming(360, { duration: 9000, easing: Easing.linear }),
          -1,
          false
        );
        anomalyPulse.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 1800 }),
            withTiming(1.0, { duration: 1800 })
          ),
          -1,
          true
        );
      }
    } else {
      // Screen not focused - pause immediately to conserve resources
      cancelAnimation(sweepRotation);
      cancelAnimation(anomalyPulse);
    }

    return () => {
      cancelAnimation(sweepRotation);
      cancelAnimation(anomalyPulse);
    };
  }, [isScreenFocused, isScanning, sweepRotation, anomalyPulse]);

  const animatedSweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweepRotation.value}deg` }],
  }));

  const animatedAnomalyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: anomalyPulse.value }],
  }));

  return (
    <View style={styles.radarGraphicWrap}>
      <Svg width={110} height={110} viewBox="0 0 110 110">
        <Defs>
          <RadialGradient id="radarSweepGrad" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.28" />
            <Stop offset="75%" stopColor="#EF4444" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
          </RadialGradient>
        </Defs>

        {/* Concentric rings */}
        <Circle cx="55" cy="55" r="50" stroke={ringStroke} strokeWidth="1" fill="none" strokeDasharray="3 3" />
        <Circle cx="55" cy="55" r="35" stroke={ringStroke} strokeWidth="1" fill="none" strokeDasharray="3 3" />
        <Circle cx="55" cy="55" r="20" stroke={ringStroke} strokeWidth="1" fill="none" strokeDasharray="3 3" />

        {/* Crosshair guide lines */}
        <Line x1="55" y1="5" x2="55" y2="105" stroke={crosshairStroke} strokeWidth="1" />
        <Line x1="5" y1="55" x2="105" y2="55" stroke={crosshairStroke} strokeWidth="1" />

        {/* Blip dots */}
        <Circle cx="76" cy="22" r="2.2" fill={blipFill} />
        <Circle cx="26" cy="38" r="1.8" fill={blipFill} />
        <Circle cx="98" cy="66" r="2" fill={blipFill} />
        <Circle cx="84" cy="88" r="2.2" fill={blipFill} />
        <Circle cx="36" cy="82" r="2" fill={blipFill} />
      </Svg>

      {/* Rotating sweep cone layer */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: 110,
            height: 110,
            justifyContent: 'center',
            alignItems: 'center',
          },
          animatedSweepStyle,
        ]}
        pointerEvents="none"
      >
        <Svg width={110} height={110} viewBox="0 0 110 110">
          <Defs>
            <RadialGradient id="radarSweepCone" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.32" />
              <Stop offset="75%" stopColor="#EF4444" stopOpacity="0.10" />
              <Stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
            </RadialGradient>
          </Defs>
          <Path d="M 55 55 L 90 20 A 50 50 0 0 0 55 5 Z" fill="url(#radarSweepCone)" />
        </Svg>
      </Animated.View>

      {/* Center Red Anomaly Dot */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 47,
            left: 47,
            width: 16,
            height: 16,
            justifyContent: 'center',
            alignItems: 'center',
          },
          animatedAnomalyStyle,
        ]}
        pointerEvents="none"
      >
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Circle cx="8" cy="8" r="7" fill="rgba(239, 68, 68, 0.22)" />
          <Circle cx="8" cy="8" r="3.5" fill="#EF4444" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function GateCardItem({
  gateItem,
  userLevel,
  isDark,
  colors,
  onPress,
  getRemainingTime,
}: {
  gateItem: SpawnedDungeonGate;
  userLevel: number;
  isDark: boolean;
  colors: any;
  onPress: (gate: SpawnedDungeonGate) => void;
  getRemainingTime: (expiresAt: number) => string;
}) {
  const isGateLocked = userLevel < gateItem.requiredLevel;
  const rankStyle = getRankTagStyles(gateItem.rankCode, isDark);
  const totalCrystalBounty = gateItem.missions.reduce((acc, m) => acc + m.hunterCrystals, 0);
  const completedMissions = gateItem.missions.filter((m) => m.isCompleted).length;
  const isCompleted = gateItem.isCleared || (gateItem.missions.length > 0 && completedMissions === gateItem.missions.length);
  const gateThumb = DUNGEON_IMAGES[gateItem.rankCode] || DUNGEON_IMAGES.E;

  const { triggerShake, animatedStyle: shakeStyle } = useShake(5);
  const { handlePressIn, handlePressOut, animatedStyle: scaleStyle } = useScalePress(0.985);

  const handleCardPress = () => {
    if (isGateLocked) {
      triggerShake();
      return;
    }
    onPress(gateItem);
  };

  return (
    <Animated.View style={[shakeStyle, scaleStyle]}>
      <Pressable
        style={[
          styles.dungeonGateCard,
          {
            backgroundColor: isDark ? '#111319' : colors.card,
            borderColor: isCompleted
              ? colors.success
              : isDark
              ? '#1E212C'
              : colors.border,
          },
        ]}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Gate Card Top: Thumbnail + (Rank Tag & Title & Threat) + Countdown Timer */}
        <View style={styles.gateCardTopRow}>
          <Image source={gateThumb} style={styles.gateThumbnail} resizeMode="cover" />

          <View style={styles.gateCardMidCol}>
            <View style={[styles.gateRankPill, { backgroundColor: rankStyle.bg, borderColor: rankStyle.border, borderWidth: 1 }]}>
              <Text style={[styles.gateRankPillText, { color: rankStyle.text }]}>
                {gateItem.rankCode}-RANK
              </Text>
            </View>
            <Text style={[styles.gateCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {gateItem.title}
            </Text>
            <Text style={[styles.gateCardThreat, { color: colors.textSecondary }]} numberOfLines={1}>
              {gateItem.threatName}
            </Text>
          </View>

          <View style={[styles.countdownPill, { backgroundColor: isDark ? '#161822' : colors.surfaceLight }]}>
            <Clock size={11} color={isDark ? '#8E8E93' : colors.textSecondary} />
            <Text style={[styles.countdownText, { color: isDark ? '#D1D5DB' : colors.textSecondary }]}>
              {getRemainingTime(gateItem.expiresAt)}
            </Text>
          </View>
        </View>

        {/* Middle Stats Strip: Crystals & Inquests (Clean floating row) */}
        <View style={styles.bountyStatsRow}>
          <View style={styles.bountySubRow}>
            <ManaCrystalIcon size={14} />
            <Text style={[styles.bountyCrystalsVal, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
              {totalCrystalBounty} Crystals
            </Text>
          </View>

          <View style={[styles.bountyDivider, { backgroundColor: isDark ? '#222634' : colors.border }]} />

          <View style={styles.bountySubRow}>
            <FileText size={12} color={colors.textSecondary} />
            <Text style={[styles.inquestCountVal, { color: colors.textSecondary }]}>
              {completedMissions}/{gateItem.missions.length} Inquests
            </Text>
          </View>
        </View>

        {/* Footer: Required Level / Locked Badge & Action Button */}
        <View style={styles.gateCardFooterRow}>
          {isGateLocked ? (
            <View style={[styles.gateLockTag, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA', borderWidth: 1 }]}>
              <Lock size={12} color="#EF4444" />
              <Text style={[styles.gateLockTagText, { color: '#EF4444' }]}>Requires LVL {gateItem.requiredLevel}</Text>
            </View>
          ) : (
            <View style={[styles.gateLevelTag, { backgroundColor: isDark ? '#1C1F2B' : colors.surfaceLight }]}>
              <Text style={[styles.gateLevelTagText, { color: isDark ? '#9CA3AF' : colors.textSecondary }]}>
                Level {gateItem.requiredLevel}+
              </Text>
            </View>
          )}

          <View
            style={[
              styles.gateActionBtn,
              isCompleted
                ? styles.gateActionBtnCleared
                : isGateLocked
                ? (isDark ? styles.gateActionBtnLockedDark : styles.gateActionBtnLockedLight)
                : styles.gateActionBtnEnterRed,
            ]}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 size={13} color="#FFFFFF" />
                <Text style={styles.gateActionBtnText}>Cleared</Text>
              </>
            ) : isGateLocked ? (
              <>
                <Lock size={13} color={isDark ? '#8E8E93' : colors.textMuted} />
                <Text style={[styles.gateActionBtnText, { color: isDark ? '#8E8E93' : colors.textMuted }]}>Locked</Text>
              </>
            ) : (
              <>
                <Text style={styles.gateActionBtnText}>Enter Gate</Text>
                <ChevronRight size={13} color="#FFFFFF" />
              </>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function DungeonScreen() {
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();
  const router = useRouter();
  const { t } = useTranslation();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const currentRank = getRankForLevel(profile?.level || 1);
  const displayName = profile?.displayName || 'Hunter';
  const avatarIcon = profile?.avatarIcon || 'pfp_01';

  // Sub-tabs: ONLY 'gates' | 'leaderboard'
  const [activeTab, setActiveTab] = useState<'gates' | 'leaderboard'>('gates');
  const [lbFilter, setLbFilter] = useState<'daily' | 'weekly' | 'allTime'>('daily');

  // Emergency Red Gate State
  const [activeRedGate, setActiveRedGate] = useState<RedGateEncounter | null>(null);
  const [isRedGateModalOpen, setIsRedGateModalOpen] = useState<boolean>(false);

  // Mana Crystals & Leaderboard State
  const [manaCrystals, setManaCrystals] = useState<number>(32);
  const [leaderboard, setLeaderboard] = useState<CrystalLeaderboardHunter[]>([]);
  const [spawnedGates, setSpawnedGates] = useState<SpawnedDungeonGate[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isScreenFocused, setIsScreenFocused] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // In-App Survey Modal State
  const [surveyModal, setSurveyModal] = useState<{
    visible: boolean;
    url: string | null;
    title: string;
    provider: string;
  }>({
    visible: false,
    url: null,
    title: '',
    provider: '',
  });

  // Live real-time clock tick for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectRedGateTrial = (trial: RedGateTrial) => {
    setIsRedGateModalOpen(false);
    if (trial.type === 'exercise') {
      router.push({
        pathname: '/exercise/[type]',
        params: {
          type: trial.exerciseType || 'PUSHUP',
          target: trial.targetValue.toString(),
          isRedGate: 'true',
        },
      } as any);
    } else {
      router.push({
        pathname: '/focus/session',
      } as any);
    }
  };

  const refreshData = useCallback(async () => {
    const bal = await crystalRepository.getBalance();
    setManaCrystals(bal > 0 ? bal : 32);

    const lb = await crystalRepository.getCrystalLeaderboard(bal, displayName, avatarIcon);
    setLeaderboard(lb);

    const rg = await redGateService.checkAndTriggerRandomGate();
    setActiveRedGate(rg);

    const dynamicGates = await gateSpawnService.getActiveGates();
    setSpawnedGates(dynamicGates);
  }, [displayName, avatarIcon]);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      loadProfile();
      refreshData();
      return () => {
        setIsScreenFocused(false);
      };
    }, [loadProfile, refreshData])
  );

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('public:gates_crystal_leaderboard_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crystal_leaderboard' },
        () => {
          refreshData();
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshData]);

  // Hunter Association Radar Pulse scan
  const handleRadarPulse = async () => {
    if (isScanning) return;
    setIsScanning(true);
    haptics.heavy();
    sound.play('unlock');

    try {
      const refreshed = await gateSpawnService.triggerRadarScan();
      setSpawnedGates(refreshed);
      haptics.success();
      sound.play('quest_complete');
    } catch {
      haptics.warning();
    } finally {
      setIsScanning(false);
    }
  };

  // Helper: Format countdown remaining
  const getRemainingTime = (expiresAt: number) => {
    const diff = Math.max(0, expiresAt - currentTime);
    if (diff === 0) return 'COLLAPSED';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Helper: Rank Colors
  const getRankColor = (rankCode: string) => {
    switch (rankCode) {
      case 'S':
        return '#EF4444';
      case 'A':
        return '#F59E0B';
      case 'B':
        return '#E11D48';
      case 'C':
        return '#8B5CF6';
      case 'D':
        return '#0284C7';
      case 'E':
      default:
        return '#10B981';
    }
  };

  // Navigate to dedicated Gate Details page
  const handleOpenGatePage = (gate: SpawnedDungeonGate) => {
    haptics.medium();
    sound.play('quest_complete');
    router.push({
      pathname: '/gates/[id]',
      params: { id: gate.id },
    } as any);
  };

  const handleOpenCPXSurveys = async () => {
    haptics.medium();
    sound.play('unlock');
    let cloudUid = 'warrior_device';
    try {
      cloudUid = await getCloudUserId();
    } catch {}
    const uid = cloudUid || 'hunter_' + (profile?.id || 'default');
    const url = getCpxOfferwallUrl(uid);
    setSurveyModal({
      visible: true,
      url,
      title: 'CPX RESEARCH // SURVEY STATION',
      provider: 'CPX RESEARCH',
    });
  };

  const handleOpenBitLabsSurveys = async () => {
    haptics.medium();
    sound.play('unlock');
    let cloudUid = 'warrior_device';
    try {
      cloudUid = await getCloudUserId();
    } catch {}
    const uid = cloudUid || 'hunter_' + (profile?.id || 'default');
    const url = getBitLabsUrl(uid);
    setSurveyModal({
      visible: true,
      url,
      title: 'BITLABS // MANA CRYSTAL MINE',
      provider: 'BITLABS',
    });
  };

  const userLevel = profile?.level || 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* 1. TOP STATUS HEADER (Avatar + Tara + Rank | Crystals Pill + Gift Box) */}
      <View style={[styles.topHeader, { backgroundColor: isDark ? 'transparent' : colors.card, borderBottomColor: isDark ? 'transparent' : colors.border }]}>
        {/* Left: Player Profile & Rank */}
        <TouchableOpacity
          style={styles.headerPlayerCol}
          onPress={() => {
            haptics.light();
            router.push('/(tabs)/profile');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrap}>
            <PlayerAvatar
              iconId={avatarIcon}
              size={44}
              glow={false}
            />
            {/* Online Green Badge */}
            <View style={[styles.avatarOnlineDot, { borderColor: isDark ? colors.background : '#FFFFFF' }]} />
          </View>
          <View style={{ marginLeft: 10, justifyContent: 'center' }}>
            <Text style={[styles.hunterNameText, { color: colors.textPrimary }]} numberOfLines={1}>
              {profile?.displayName || 'Warrior'}
            </Text>
            <Text style={[styles.hunterTitleSub, { color: colors.textSecondary }]}>
              {currentRank.rankCode}-Rank Hunter • LVL {userLevel}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: Mana Crystals Vault & Gift Button */}
        <View style={styles.headerRightCol}>
          <TouchableOpacity
            style={[
              styles.crystalCapsule,
              {
                backgroundColor: isDark ? '#141720' : colors.surfaceLight,
                borderColor: isDark ? '#1F2433' : colors.border,
              },
            ]}
            onPress={() => {
              haptics.light();
              router.push('/redeem' as any);
            }}
            activeOpacity={0.8}
          >
            <ManaCrystalIcon size={16} />
            <AnimatedNumber
              value={manaCrystals}
              style={[styles.crystalCountText, { color: colors.textPrimary }]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.giftBtn,
              {
                backgroundColor: isDark ? '#141720' : colors.surfaceLight,
                borderColor: isDark ? '#1F2433' : colors.border,
              },
            ]}
            onPress={() => {
              haptics.light();
              router.push('/redeem' as any);
            }}
            activeOpacity={0.8}
          >
            <Gift size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. SUB-HEADER DUAL TABS: [Gates] vs [Leaderboard] */}
      <View style={[styles.tabSegmentWrap, { backgroundColor: isDark ? '#0D0E13' : colors.surfaceLight, borderColor: isDark ? '#1C1F2B' : colors.border }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'gates' && (isDark ? styles.segmentBtnGatesActiveDark : styles.segmentBtnActiveLight),
          ]}
          onPress={() => {
            haptics.light();
            setActiveTab('gates');
          }}
          activeOpacity={0.85}
        >
          <Swords size={16} color={activeTab === 'gates' ? (isDark ? '#EF4444' : colors.primary) : colors.textMuted} />
          <Text
            style={[
              styles.segmentBtnText,
              {
                color: activeTab === 'gates' ? (isDark ? '#EF4444' : colors.primary) : colors.textSecondary,
              },
            ]}
          >
            {t('activeGates', 'Gates')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'leaderboard' && (isDark ? styles.segmentBtnLbActiveDark : styles.segmentBtnActiveLight),
          ]}
          onPress={() => {
            haptics.light();
            setActiveTab('leaderboard');
          }}
          activeOpacity={0.85}
        >
          <Trophy size={16} color={activeTab === 'leaderboard' ? (isDark ? '#F59E0B' : colors.primary) : colors.textMuted} />
          <Text
            style={[
              styles.segmentBtnText,
              {
                color: activeTab === 'leaderboard' ? (isDark ? '#F59E0B' : colors.primary) : colors.textSecondary,
              },
            ]}
          >
            {t('leaderboard', 'Leaderboard')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================= TAB 1: DUNGEON GATES ======================= */}
      {activeTab === 'gates' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Active Emergency Red Gate Alert Banner */}
          {activeRedGate && !activeRedGate.isCleared && (
            <TouchableOpacity
              style={[
                styles.redGateHeroBanner,
                {
                  backgroundColor: isDark ? '#16080A' : '#FEF2F2',
                  borderColor: '#EF4444',
                },
              ]}
              activeOpacity={0.88}
              onPress={() => {
                haptics.heavy();
                sound.play('unlock');
                setIsRedGateModalOpen(true);
              }}
            >
              <View style={styles.redGateHeroTopRow}>
                <View style={[styles.redGateAlertPill, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2', borderColor: '#EF4444' }]}>
                  <ShieldAlert size={13} color="#EF4444" />
                  <Text style={styles.redGateAlertPillText}>EMERGENCY RED GATE ACTIVE</Text>
                </View>
                <View style={[styles.redGateBountyPill, { backgroundColor: isDark ? 'rgba(0, 210, 238, 0.12)' : '#E0F2FE', borderColor: '#00D2EE' }]}>
                  <ManaCrystalIcon size={14} />
                  <Text style={styles.redGateBountyPillText}>+{activeRedGate.bountyCoins} Crystals</Text>
                </View>
              </View>

              <Text style={[styles.redGateHeroTitle, { color: isDark ? '#FFFFFF' : '#991B1B' }]}>
                {activeRedGate.threatName.toUpperCase()}
              </Text>
              <Text style={[styles.redGateHeroSub, { color: isDark ? '#FCA5A5' : '#B91C1C' }]} numberOfLines={2}>
                {activeRedGate.lore}
              </Text>

              <View style={styles.redGateHeroActionRow}>
                <Text style={styles.redGateHeroActionText}>ENGAGE EMERGENCY TRIAL</Text>
                <ChevronRight size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}

          {/* Hunter Association Radar Card */}
          <View
            style={[
              styles.radarHeroCard,
              {
                backgroundColor: isDark ? '#111319' : colors.card,
                borderColor: isDark ? '#1E212B' : colors.border,
              },
            ]}
          >
            <View style={styles.radarHeroLeft}>
              <Text style={[styles.radarHeroTag, { color: isDark ? '#6B7280' : colors.textMuted }]}>HUNTER RADAR</Text>
              <Text style={[styles.radarHeroTitle, { color: colors.textPrimary }]}>
                Dimensional Rift Radar
              </Text>
              <Text style={[styles.radarHeroSub, { color: colors.textSecondary }]}>
                Scan sector coordinates for active gates and survey areas.
              </Text>

              <TouchableOpacity
                style={[styles.radarScanBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleRadarPulse}
                disabled={isScanning}
                activeOpacity={0.85}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Search size={14} color="#FFFFFF" strokeWidth={2.4} />
                )}
                <Text style={styles.radarScanBtnText}>
                  {isScanning ? 'Scanning...' : 'Radar Scan'}
                </Text>
                <ChevronRight size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <HunterRadarGraphic
              isDark={isDark}
              isScanning={isScanning}
              isScreenFocused={isScreenFocused}
            />
          </View>

          {/* Section Header: Title + Count + Sort Pill */}
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Active Dungeon Gates
              </Text>
              <Text style={[styles.sectionCount, { color: isDark ? '#6B7280' : colors.textMuted }]}> ({spawnedGates.length})</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.sortPill,
                {
                  backgroundColor: isDark ? '#14161F' : colors.card,
                  borderColor: isDark ? '#222634' : colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.sortPillText, { color: isDark ? '#9CA3AF' : colors.textSecondary }]}>
                Rank E → S
              </Text>
              <ChevronDown size={13} color={isDark ? '#9CA3AF' : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Spawned Dungeon Gate Cards with Apple-grade micro-interactions */}
          {spawnedGates.map((gateItem) => (
            <GateCardItem
              key={gateItem.id}
              gateItem={gateItem}
              userLevel={userLevel}
              isDark={isDark}
              colors={colors}
              onPress={handleOpenGatePage}
              getRemainingTime={getRemainingTime}
            />
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ======================= TAB 2: LEADERBOARD ======================= */}
      {activeTab === 'leaderboard' && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Filter Pills: Daily / Weekly / All-Time */}
            <View style={styles.lbFilterRow}>
              {(['daily', 'weekly', 'allTime'] as const).map((f) => {
                const isSelected = lbFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.lbFilterPill,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(245, 158, 11, 0.15)' : colors.primary)
                          : (isDark ? '#14161F' : colors.surfaceLight),
                        borderColor: isSelected
                          ? (isDark ? '#F59E0B' : colors.primary)
                          : (isDark ? '#222634' : colors.border),
                      },
                    ]}
                    onPress={() => {
                      haptics.light();
                      setLbFilter(f);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.lbFilterPillText, { color: isSelected ? (isDark ? '#F59E0B' : '#FFFFFF') : colors.textSecondary }]}>
                      {f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : 'All-Time'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Top 3 Podium (Rank 2 Left, Rank 1 Center 👑, Rank 3 Right) */}
            <View style={[styles.podiumSection, { backgroundColor: isDark ? '#111319' : colors.card, borderColor: isDark ? '#1E212B' : colors.border }]}>
              {/* #2 Left: Rank 2 Hunter */}
              <View style={styles.podiumCol}>
                <View style={[styles.podiumAvatarWrap, { borderColor: isDark ? '#252936' : colors.border }]}>
                  <PlayerAvatar iconId={leaderboard[1]?.avatarIcon || 'pfp_02'} size={48} />
                  <View style={[styles.podiumRankBadge, { backgroundColor: '#64748B' }]}>
                    <Text style={styles.podiumRankBadgeText}>2</Text>
                  </View>
                </View>
                <Text style={[styles.podiumNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {leaderboard[1]?.name || 'Karan'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <ManaCrystalIcon size={12} />
                  <Text style={[styles.podiumXPText, { color: colors.textSecondary }]}>
                    {(leaderboard[1]?.crystalsMined || 2450).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* #1 Center: Top Hunter 👑 */}
              <View style={[styles.podiumCol, { marginTop: -14 }]}>
                <Crown size={22} color="#F59E0B" style={{ marginBottom: 2 }} />
                <View style={[styles.podiumAvatarWrap, { borderColor: '#F59E0B', borderWidth: 2.5 }]}>
                  <PlayerAvatar iconId={leaderboard[0]?.avatarIcon || 'pfp_01'} size={58} />
                  <View style={[styles.podiumRankBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.podiumRankBadgeText}>1</Text>
                  </View>
                </View>
                <Text style={[styles.podiumNameText, { color: colors.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
                  {leaderboard[0]?.name || displayName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ManaCrystalIcon size={14} />
                  <Text style={[styles.podiumXPText, { color: isDark ? '#38BDF8' : colors.primary, fontWeight: '600' }]}>
                    {(leaderboard[0]?.crystalsMined || 4820).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* #3 Right: Rank 3 Hunter */}
              <View style={styles.podiumCol}>
                <View style={[styles.podiumAvatarWrap, { borderColor: '#B45309' }]}>
                  <PlayerAvatar iconId={leaderboard[2]?.avatarIcon || 'pfp_09'} size={48} />
                  <View style={[styles.podiumRankBadge, { backgroundColor: '#B45309' }]}>
                    <Text style={styles.podiumRankBadgeText}>3</Text>
                  </View>
                </View>
                <Text style={[styles.podiumNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {leaderboard[2]?.name || 'Riya'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <ManaCrystalIcon size={12} />
                  <Text style={[styles.podiumXPText, { color: colors.textSecondary }]}>
                    {(leaderboard[2]?.crystalsMined || 1890).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Ranks 4 to 10 List */}
            <View style={styles.ranksListWrap}>
              {(leaderboard.length > 3 ? leaderboard.slice(3) : [
                { id: '4', name: 'Alex', crystalsMined: 1420, avatarIcon: 'pfp_03', level: 14, title: 'Shadow Walker', rankCode: 'C' },
                { id: '5', name: 'Sam', crystalsMined: 1180, avatarIcon: 'pfp_04', level: 12, title: 'Blade Dancer', rankCode: 'C' },
                { id: '6', name: 'Priya', crystalsMined: 950, avatarIcon: 'pfp_05', level: 9, title: 'Spell Weaver', rankCode: 'D' },
                { id: '7', name: 'Dhruv', crystalsMined: 760, avatarIcon: 'pfp_06', level: 7, title: 'Iron Vanguard', rankCode: 'D' },
                { id: '8', name: 'Neha', crystalsMined: 540, avatarIcon: 'pfp_07', level: 5, title: 'Novice Hunter', rankCode: 'E' },
              ]).map((item, idx) => {
                const rankNum = idx + 4;
                return (
                  <View
                    key={item.id || rankNum}
                    style={[
                      styles.rankListRow,
                      { backgroundColor: isDark ? '#111319' : colors.card, borderColor: isDark ? '#1E212B' : colors.border },
                    ]}
                  >
                    <Text style={[styles.rankListNumber, { color: colors.textSecondary }]}>{rankNum}</Text>
                    <PlayerAvatar iconId={item.avatarIcon} size={36} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.rankListName, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.rankListSub, { color: colors.textSecondary }]}>
                        {item.title} • LVL {item.level}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ManaCrystalIcon size={14} />
                      <Text style={[styles.rankListXP, { color: colors.textPrimary }]}>
                        {item.crystalsMined.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Sticky Bottom "Your Rank" Bar */}
          <View style={[styles.stickyYourRankCard, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <PlayerAvatar iconId={avatarIcon} size={40} />
            <View style={{ flex: 1, marginLeft: 10, gap: 1 }}>
              <Text style={[styles.yourRankTitle, { color: colors.textSecondary }]}>Your Hunter Rank</Text>
              <Text style={[styles.yourRankNum, { color: colors.textPrimary }]}>
                {currentRank.rankCode}-RANK • #{leaderboard.findIndex((h) => h.isCurrentUser) >= 0 ? leaderboard.findIndex((h) => h.isCurrentUser) + 1 : 1}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ManaCrystalIcon size={14} />
                <Text style={[styles.yourRankXP, { color: colors.textPrimary }]}>
                  {manaCrystals.toLocaleString()} Crystals
                </Text>
              </View>
              <Text style={[styles.yourRankDelta, { color: colors.success }]}>+2 ranks this week</Text>
            </View>
          </View>
        </View>
      )}

      {/* ======================= IN-APP SURVEY MODAL ======================= */}
      <InAppSurveyModal
        visible={surveyModal.visible}
        url={surveyModal.url}
        title={surveyModal.title}
        provider={surveyModal.provider}
        onClose={async (completed) => {
          setSurveyModal((prev) => ({ ...prev, visible: false }));
          if (completed) {
            try {
              await crystalRepository.addCrystals(
                200,
                `Survey Inquest: ${surveyModal.provider}`,
                'survey_wall',
                `survey:${Date.now()}`,
                'survey_wall'
              );
              await loadProfile();
            } catch {}
            refreshData();
          }
        }}
      />

      {/* ======================= EMERGENCY RED GATE ENCOUNTER MODAL ======================= */}
      <RedGateEncounterModal
        visible={isRedGateModalOpen}
        encounter={activeRedGate}
        onDismiss={() => setIsRedGateModalOpen(false)}
        onSelectTrial={handleSelectRedGateTrial}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Top Header (Avatar, Player Info, Crystals, Gift Box)
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerPlayerCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  hunterNameText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  hunterTitleSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  hunterRankPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  hunterRankPillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crystalCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 20,
    borderWidth: 1,
  },
  crystalCountText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  giftBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRedeemBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRedeemBtnText: {
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Dual Sub Tabs (Gates / Leaderboard)
  tabSegmentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentBtnActiveLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnGatesActiveDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  segmentBtnLbActiveDark: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#78350F',
  },
  segmentBtnActiveDark: {
    backgroundColor: '#1E202B',
  },
  segmentBtnText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 36,
  },

  // Emergency Red Gate Alert Banner
  redGateHeroBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  redGateHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  redGateAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  redGateAlertPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 9.5,
    fontWeight: '500',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  redGateBountyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  redGateBountyPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
    color: '#00D2EE',
  },
  redGateHeroTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  redGateHeroSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '400',
  },
  redGateHeroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 2,
  },
  redGateHeroActionText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // Dimensional Rift Radar Card
  radarHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  radarHeroLeft: {
    flex: 1,
    gap: 3,
  },
  radarHeroTag: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  radarHeroTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16.5,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  radarHeroSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16.5,
    marginBottom: 6,
  },
  radarScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 9.5,
    borderRadius: 22,
  },
  radarScanBtnText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  radarGraphicWrap: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  radarLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D2EE',
  },
  radarLiveText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    fontWeight: '700',
    color: '#00D2EE',
    letterSpacing: 0.6,
  },
  radarPulseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0284C7',
  },
  radarPulseBtnActive: {
    opacity: 0.6,
  },
  radarPulseBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontFamily: fontFamilies.regular,
    fontSize: 13.5,
    fontWeight: '400',
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Spawned Dungeon Gate Card
  dungeonGateCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gateCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  gateThumbnail: {
    width: 82,
    height: 82,
    borderRadius: 14,
  },
  gateCardMidCol: {
    flex: 1,
    gap: 3,
  },
  gateRankPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gateRankPillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  gateCardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  gateCardThreat: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 12,
  },
  countdownText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  countdownCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  gateRankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  gateRankBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Middle Stats Strip (Clean Floating Row)
  bountyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  bountyPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  bountySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bountyGrossTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bountyGrossLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  bountyGrossVal: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  bountyCrystalsVal: {
    fontFamily: fontFamilies.medium,
    fontSize: 12.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  bountyDivider: {
    width: 1,
    height: 14,
  },
  inquestCountVal: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
  },
  clearedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clearedPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 9.5,
    fontWeight: '500',
    color: '#10B981',
    letterSpacing: 0.3,
  },
  missionProgressTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionProgressText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10.5,
    fontWeight: '600',
  },

  // Gate Card Footer Row
  gateCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  gateLevelTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  gateLevelTagText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  gateLockTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  gateLockTagText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  gateReqLevelPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gateReqLevelText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10.5,
    fontWeight: '600',
  },
  gateLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gateLockBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 0.4,
  },
  gateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 9.5,
    borderRadius: 12,
  },
  gateActionBtnEnterRed: {
    backgroundColor: '#EF4444',
  },
  gateActionBtnEnter: {},
  gateActionBtnLockedLight: {
    backgroundColor: '#F3F4F6',
  },
  gateActionBtnLockedDark: {
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#242836',
  },
  gateActionBtnCleared: {
    backgroundColor: '#10B981',
  },
  gateActionBtnText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  enterGateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enterGateBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Leaderboard Filter Pills
  lbFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lbFilterPill: {
    flex: 1,
    paddingVertical: 7.5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbFilterPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12.5,
    fontWeight: '500',
  },

  // Top 3 Podium
  podiumSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  podiumCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  podiumAvatarWrap: {
    position: 'relative',
    borderRadius: 100,
    borderWidth: 2,
    padding: 2,
  },
  podiumRankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankBadgeText: {
    fontFamily: fontFamilies.semiBold,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  podiumNameText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  podiumXPText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },

  // Ranks List
  ranksListWrap: {
    gap: 8,
  },
  rankListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  rankListNumber: {
    fontFamily: fontFamilies.medium,
    fontSize: 12.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    width: 24,
  },
  rankListName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  rankListSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400',
  },
  rankListXP: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },

  // Sticky Bottom Rank Card
  stickyYourRankCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  yourRankTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
  },
  yourRankNum: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  yourRankXP: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  yourRankDelta: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
  },
});
