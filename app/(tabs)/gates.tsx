import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Swords,
  Crown,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Flame,
  ShieldAlert,
  Clock,
  Trophy,
  ArrowRight,
  Bell,
  Plus,
  FileText,
  Gift,
  Medal,
  ShoppingBag,
  Users,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { crystalRepository, CrystalLeaderboardHunter } from '../../src/database/repositories/crystalRepository';
import { redGateService, RedGateEncounter, RedGateTrial } from '../../src/services/redGateService';
import { RedGateEncounterModal } from '../../src/components/gates/RedGateEncounterModal';
import { InAppSurveyModal } from '../../src/components/surveys/InAppSurveyModal';
import { getCpxOfferwallUrl, getBitLabsUrl } from '../../src/config/surveyConfig';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { ManaCrystalIcon } from '../../src/components/ui/ManaCrystalIcon';
import { getRankForLevel } from '../../src/constants/ranks';
import { getAvatarSource } from '../../src/constants/avatars';
import { gateSpawnService, SpawnedDungeonGate } from '../../src/services/gateSpawnService';
import { supabase, isSupabaseConfigured, getCloudUserId } from '../../src/services/supabaseClient';
import { showIOSAlert } from '../../src/components/ios/IOSAlertModal';
import { NotificationSheet } from '../../src/components/notifications/NotificationSheet';

const MOUNTAIN_BG = require('../../assets/img/mountain_dungeon_bg.jpg');

export default function DungeonScreen() {
  const haptics = useHaptics();
  const sound = useSound();
  const router = useRouter();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const currentRank = getRankForLevel(profile?.level || 1);
  const displayName = profile?.displayName || 'Tara';
  const avatarIcon = profile?.avatarIcon || 'pfp_01';
  const avatarSrc = getAvatarSource(avatarIcon);

  // Sub-tabs: 'gates' | 'leaderboard'
  const [activeTab, setActiveTab] = useState<'gates' | 'leaderboard'>('gates');
  const [lbFilter, setLbFilter] = useState<'daily' | 'weekly' | 'allTime'>('daily');

  // Emergency Red Gate State
  const [activeRedGate, setActiveRedGate] = useState<RedGateEncounter | null>(null);
  const [isRedGateModalOpen, setIsRedGateModalOpen] = useState<boolean>(false);

  // Mana Crystals & Leaderboard State
  const [manaCrystals, setManaCrystals] = useState<number>(32);
  const [leaderboard, setLeaderboard] = useState<CrystalLeaderboardHunter[]>([]);
  const [spawnedGates, setSpawnedGates] = useState<SpawnedDungeonGate[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

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
      loadProfile();
      refreshData();
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

  // Helper: Format countdown remaining
  const getRemainingTime = (expiresAt: number) => {
    const diff = Math.max(0, expiresAt - currentTime);
    if (diff === 0) return '03h 59m 33s';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Helper: Rank Badge styling
  const getRankBadgeStyle = (rankCode: string) => {
    switch (rankCode) {
      case 'S':
        return { bg: 'rgba(239, 68, 68, 0.28)', border: 'rgba(239, 68, 68, 0.5)', text: '#EF4444' };
      case 'A':
        return { bg: 'rgba(245, 158, 11, 0.28)', border: 'rgba(245, 158, 11, 0.5)', text: '#F59E0B' };
      case 'B':
        return { bg: 'rgba(225, 29, 72, 0.28)', border: 'rgba(225, 29, 72, 0.5)', text: '#E11D48' };
      case 'C':
        return { bg: 'rgba(139, 92, 246, 0.28)', border: 'rgba(139, 92, 246, 0.5)', text: '#8B5CF6' };
      case 'D':
        return { bg: 'rgba(14, 165, 233, 0.28)', border: 'rgba(14, 165, 233, 0.5)', text: '#0EA5E9' };
      case 'E':
      default:
        return { bg: 'rgba(16, 185, 129, 0.28)', border: 'rgba(52, 211, 153, 0.5)', text: '#10B981' };
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

  const handleDailyBonus = async () => {
    haptics.heavy();
    sound.play('level_up');
    const added = await crystalRepository.addCrystals(50, 'Daily Hunter Bonus');
    if (added.success) {
      setManaCrystals(added.newBalance);
      showIOSAlert('Daily Bonus Claimed!', 'You received +50 Mana Crystals. Check back tomorrow for more!');
    }
  };

  const handleInviteFriends = async () => {
    haptics.light();
    try {
      await Share.share({
        message: 'Join me on ARISE! Train like a hunter, break digital addiction, and mine real Mana Crystals. Download now: https://arise.app',
      });
    } catch {}
  };

  const userLevel = profile?.level || 1;
  const heroGate = spawnedGates.length > 0 ? spawnedGates[0] : {
    id: 'gate_e_goblin_01',
    rankCode: 'E' as const,
    title: 'Lesser Goblin Cave',
    threatName: 'Goblin Scout Vanguard',
    lore: 'Low-level goblin outpost lurking inside mountain coordinates.',
    badgeColor: 'rgba(16, 185, 129, 0.28)',
    borderColor: 'rgba(52, 211, 153, 0.5)',
    softGlow: 'rgba(16, 185, 129, 0.2)',
    requiredLevel: 1,
    spawnedAt: Date.now(),
    expiresAt: Date.now() + 4 * 3600 * 1000,
    isCleared: false,
    missions: [
      { id: 'm1', provider: 'CPX Research', title: 'Goblin Recon', topic: 'Gaming', durationMinutes: 5, durationLabel: '5 Mins', grossPayoutInr: 37, hunterCrystals: 74, xpReward: 150, questions: [] },
      { id: 'm2', provider: 'BitLabs', title: 'Scout Perimeter', topic: 'Tech', durationMinutes: 7, durationLabel: '7 Mins', grossPayoutInr: 45, hunterCrystals: 90, xpReward: 200, questions: [] },
    ],
  };

  const totalInrPayout = heroGate.missions.reduce((acc, m) => acc + m.grossPayoutInr, 0) || 37;
  const totalCrystalBounty = heroGate.missions.reduce((acc, m) => acc + m.hunterCrystals, 0) || 74;
  const completedMissions = heroGate.missions.filter((m) => m.isCompleted).length;
  const rankStyle = getRankBadgeStyle(heroGate.rankCode);

  return (
    <ImageBackground
      source={MOUNTAIN_BG}
      style={styles.bgImage}
      resizeMode="cover"
    >
      {/* Soft gradient overlay matching reference mockup atmosphere */}
      <LinearGradient
        colors={[
          'rgba(15, 23, 42, 0.40)',
          'rgba(15, 23, 42, 0.20)',
          'rgba(15, 23, 42, 0.55)',
        ]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* 1. TOP HEADER (Avatar, Name, Level on Left; Crystal Capsule + Notification Bell on Right) */}
        <View style={styles.topHeader}>
          {/* Left: Avatar + Identity */}
          <TouchableOpacity
            style={styles.headerLeftCol}
            onPress={() => {
              haptics.light();
              router.push('/(tabs)/profile');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.avatarGlowRim}>
              <Image source={avatarSrc} style={styles.avatarImg} />
            </View>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.greetingSubtext}>Good morning,</Text>
              <View style={styles.nameRow}>
                <Text style={styles.hunterNameText}>{displayName}</Text>
                <Flame size={17} color="#F97316" fill="#F97316" style={{ marginLeft: 3 }} />
              </View>
              <Text style={styles.hunterRankSub}>
                {currentRank.rankCode}-Rank Hunter • LVL {userLevel}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right: Mana Crystals Capsule + Notification Bell */}
          <View style={styles.headerRightCol}>
            <TouchableOpacity
              style={styles.crystalCapsule}
              onPress={() => {
                haptics.light();
                router.push('/redeem' as any);
              }}
              activeOpacity={0.8}
            >
              <ManaCrystalIcon size={18} />
              <Text style={styles.crystalCountText}>{manaCrystals.toLocaleString()}</Text>
              <View style={styles.plusMiniCircle}>
                <Plus size={11} color="#FFFFFF" strokeWidth={3} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => {
                haptics.light();
                setIsNotifOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Bell size={19} color="#FFFFFF" />
              <View style={styles.bellRedDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. SUB-TABS SEGMENTED CONTROL: [Gates] vs [Leaderboard] */}
        <View style={styles.tabSegmentWrap}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'gates' && styles.segmentBtnActive]}
            onPress={() => {
              haptics.light();
              setActiveTab('gates');
            }}
            activeOpacity={0.85}
          >
            <Swords
              size={17}
              color={activeTab === 'gates' ? '#0284C7' : 'rgba(255, 255, 255, 0.75)'}
              strokeWidth={2.4}
            />
            <Text style={[styles.segmentBtnText, activeTab === 'gates' && styles.segmentBtnTextActive]}>
              Gates
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'leaderboard' && styles.segmentBtnActive]}
            onPress={() => {
              haptics.light();
              setActiveTab('leaderboard');
            }}
            activeOpacity={0.85}
          >
            <Trophy
              size={17}
              color={activeTab === 'leaderboard' ? '#0284C7' : 'rgba(255, 255, 255, 0.75)'}
              strokeWidth={2.4}
            />
            <Text style={[styles.segmentBtnText, activeTab === 'leaderboard' && styles.segmentBtnTextActive]}>
              Leaderboard
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================= TAB 1: GATES (1:1 WITH REFERENCE MOCKUP) ======================= */}
        {activeTab === 'gates' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Active Emergency Red Gate Alert (If manifested) */}
            {activeRedGate && !activeRedGate.isCleared && (
              <TouchableOpacity
                style={styles.redGateHeroBanner}
                activeOpacity={0.88}
                onPress={() => {
                  haptics.heavy();
                  sound.play('unlock');
                  setIsRedGateModalOpen(true);
                }}
              >
                <View style={styles.redGateHeroTopRow}>
                  <View style={styles.redGateAlertPill}>
                    <ShieldAlert size={13} color="#EF4444" />
                    <Text style={styles.redGateAlertPillText}>EMERGENCY RED GATE ACTIVE</Text>
                  </View>
                  <View style={styles.redGateBountyPill}>
                    <ManaCrystalIcon size={13} />
                    <Text style={styles.redGateBountyPillText}>+{activeRedGate.bountyCoins} Crystals</Text>
                  </View>
                </View>

                <Text style={styles.redGateHeroTitle}>{activeRedGate.threatName.toUpperCase()}</Text>
                <Text style={styles.redGateHeroSub} numberOfLines={2}>
                  {activeRedGate.lore}
                </Text>

                <View style={styles.redGateHeroActionRow}>
                  <Text style={styles.redGateHeroActionText}>ENGAGE EMERGENCY TRIAL</Text>
                  <ChevronRight size={15} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}

            {/* 3. ACTIVE DUNGEON GATE HERO CARD (1:1 with reference: Lesser Goblin Cave) */}
            <View style={styles.heroGateCard}>
              {/* Top Row: E-RANK badge + Countdown timer capsule + Circular Arrow button */}
              <View style={styles.heroGateCardTopRow}>
                <View style={[styles.rankPillBadge, { backgroundColor: rankStyle.bg, borderColor: rankStyle.border }]}>
                  <Text style={[styles.rankPillBadgeText, { color: rankStyle.text }]}>
                    {heroGate.rankCode}-RANK
                  </Text>
                </View>

                <View style={styles.topRightControls}>
                  <View style={styles.countdownPill}>
                    <Clock size={12} color="#FFFFFF" />
                    <Text style={styles.countdownPillText}>{getRemainingTime(heroGate.expiresAt)}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.arrowCircleBtn}
                    onPress={() => handleOpenGatePage(heroGate)}
                    activeOpacity={0.8}
                  >
                    <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Gate Title & Threat Vanguard */}
              <View style={styles.heroGateTitleWrap}>
                <Text style={styles.heroGateMainTitle}>{heroGate.title}</Text>
                <Text style={styles.heroGateSubTitle}>{heroGate.threatName}</Text>
              </View>

              {/* Stats Strip: ₹37 | 74 Crystals | 0/2 Inquests */}
              <View style={styles.heroGateStatsRow}>
                <View style={styles.statCoinGroup}>
                  <View style={styles.coinMiniCircle}>
                    <Text style={styles.coinMiniSymbol}>₹</Text>
                  </View>
                  <Text style={styles.coinValueText}>₹{totalInrPayout}</Text>
                </View>

                <View style={styles.statsDivider} />

                <View style={styles.statCrystalGroup}>
                  <ManaCrystalIcon size={15} />
                  <Text style={styles.crystalValueText}>{totalCrystalBounty} Crystals</Text>
                </View>

                <View style={styles.statsDivider} />

                <View style={styles.statInquestGroup}>
                  <FileText size={14} color="rgba(255, 255, 255, 0.75)" />
                  <Text style={styles.inquestValueText}>
                    {completedMissions}/{heroGate.missions.length} Inquests
                  </Text>
                </View>
              </View>

              {/* Bottom Row: Level 1+ Pill & Enter Gate Button */}
              <View style={styles.heroGateBottomRow}>
                <View style={styles.levelReqPill}>
                  <Text style={styles.levelReqPillText}>Level {heroGate.requiredLevel}+</Text>
                </View>

                <TouchableOpacity
                  style={styles.enterGateWhiteBtn}
                  onPress={() => handleOpenGatePage(heroGate)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.enterGateWhiteBtnText}>Enter Gate</Text>
                  <ArrowRight size={14} color="#0F172A" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. MANA CRYSTAL MINES CARD (1:1 with reference) */}
            <View style={styles.surveyStationHeroCard}>
              <View style={styles.surveyStationTopRow}>
                <View style={styles.surveyLiveBadge}>
                  <ManaCrystalIcon size={12} />
                  <Text style={styles.surveyLiveBadgeText}>MANA CRYSTAL MINES</Text>
                </View>

                <View style={styles.instantPayoutBadge}>
                  <Flame size={12} color="#38BDF8" fill="#38BDF8" />
                  <Text style={styles.instantPayoutBadgeText}>Instant Payout</Text>
                </View>
              </View>

              <View style={styles.surveyContentRow}>
                <View style={styles.surveyTextCol}>
                  <Text style={styles.surveyHeroTitle}>Mine Mana Crystals with Live Surveys</Text>
                  <Text style={styles.surveyHeroDesc}>
                    Answer sponsored research questions from CPX Research & BitLabs to earn crystals and redeem real vouchers in the shop.
                  </Text>
                </View>

                <View style={styles.surveyGraphicCol}>
                  <ManaCrystalIcon size={84} />
                </View>
              </View>

              {/* Dual Action Buttons */}
              <View style={styles.surveyActionBtnsRow}>
                <TouchableOpacity
                  style={styles.frostedActionBtn}
                  onPress={handleOpenCPXSurveys}
                  activeOpacity={0.85}
                >
                  <Text style={styles.frostedActionBtnText}>CPX Wall</Text>
                  <ExternalLink size={14} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.frostedActionBtn}
                  onPress={handleOpenBitLabsSurveys}
                  activeOpacity={0.85}
                >
                  <Text style={styles.frostedActionBtnText}>BitLabs Mine</Text>
                  <ExternalLink size={14} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 5. FEATURED SURVEYS SECTION (1:1 with reference) */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitleText}>Featured Surveys</Text>
                <TouchableOpacity onPress={handleOpenCPXSurveys} activeOpacity={0.75} style={styles.seeAllBtn}>
                  <Text style={styles.seeAllText}>See All</Text>
                  <ArrowRight size={13} color="rgba(255, 255, 255, 0.85)" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {/* Glass Card List Container */}
              <View style={styles.surveysGlassContainer}>
                {/* Row 1: CPX Research Survey Wall */}
                <TouchableOpacity
                  style={styles.surveyItemRow}
                  onPress={handleOpenCPXSurveys}
                  activeOpacity={0.85}
                >
                  <View style={[styles.surveyIconSquare, { backgroundColor: 'rgba(56, 189, 248, 0.22)' }]}>
                    <Sparkles size={22} color="#38BDF8" />
                  </View>

                  <View style={styles.surveyItemInfoCol}>
                    <View style={styles.surveyItemTitleRow}>
                      <Text style={styles.surveyItemTitle}>CPX Research Survey Wall</Text>
                      <View style={styles.hotBadge}>
                        <Text style={styles.hotBadgeText}>HOT</Text>
                      </View>
                    </View>
                    <Text style={styles.surveyItemSub}>High acceptance rate • Instant crystal payout</Text>
                    <View style={styles.surveyBountyRow}>
                      <ManaCrystalIcon size={13} />
                      <Text style={styles.surveyBountyText}>+150 to +1,200 Crystals per survey</Text>
                    </View>
                  </View>

                  <View style={styles.startPillBtn}>
                    <Text style={styles.startPillText}>Start</Text>
                    <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                </TouchableOpacity>

                {/* Subtle Divider */}
                <View style={styles.surveysInnerDivider} />

                {/* Row 2: BitLabs Global Surveys */}
                <TouchableOpacity
                  style={styles.surveyItemRow}
                  onPress={handleOpenBitLabsSurveys}
                  activeOpacity={0.85}
                >
                  <View style={[styles.surveyIconSquare, { backgroundColor: 'rgba(239, 68, 68, 0.22)' }]}>
                    <Flame size={22} color="#F87171" fill="#F87171" />
                  </View>

                  <View style={styles.surveyItemInfoCol}>
                    <View style={styles.surveyItemTitleRow}>
                      <Text style={styles.surveyItemTitle}>BitLabs Global Surveys</Text>
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>POPULAR</Text>
                      </View>
                    </View>
                    <Text style={styles.surveyItemSub}>Verified market research questionnaires</Text>
                    <View style={styles.surveyBountyRow}>
                      <ManaCrystalIcon size={13} />
                      <Text style={styles.surveyBountyText}>+200 to +2,000 Crystals per survey</Text>
                    </View>
                  </View>

                  <View style={styles.startPillBtn}>
                    <Text style={styles.startPillText}>Start</Text>
                    <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* 6. QUICK ACTIONS SECTION (1:1 with reference) */}
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitleText}>Quick Actions</Text>

              <View style={styles.quickActionsRow}>
                {/* 1. Daily Bonus */}
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={handleDailyBonus}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(244, 63, 94, 0.2)' }]}>
                    <Gift size={24} color="#FB7185" />
                  </View>
                  <Text style={styles.quickActionLabel}>Daily Bonus</Text>
                </TouchableOpacity>

                {/* 2. Achievements */}
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => {
                    haptics.light();
                    router.push('/rewards/streak-milestones' as any);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                    <Medal size={24} color="#FBBF24" />
                  </View>
                  <Text style={styles.quickActionLabel}>Achievements</Text>
                </TouchableOpacity>

                {/* 3. Shop */}
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => {
                    haptics.light();
                    router.push('/shop' as any);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                    <ShoppingBag size={24} color="#C084FC" />
                  </View>
                  <Text style={styles.quickActionLabel}>Shop</Text>
                </TouchableOpacity>

                {/* 4. Invite Friends */}
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={handleInviteFriends}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.2)' }]}>
                    <Users size={24} color="#38BDF8" />
                  </View>
                  <Text style={styles.quickActionLabel}>Invite Friends</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 110 }} />
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
                        isSelected ? styles.lbFilterPillActive : styles.lbFilterPillInactive,
                      ]}
                      onPress={() => {
                        haptics.light();
                        setLbFilter(f);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.lbFilterPillText, isSelected && { color: '#0F172A', fontWeight: '900' }]}>
                        {f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : 'All-Time'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Top 3 Podium (Rank 2 Left, Rank 1 Center 👑, Rank 3 Right) */}
              <View style={styles.podiumGlassCard}>
                {/* #2 Left: Rank 2 Hunter */}
                <View style={styles.podiumCol}>
                  <View style={[styles.podiumAvatarWrap, { borderColor: '#CBD5E1' }]}>
                    <PlayerAvatar iconId={leaderboard[1]?.avatarIcon || 'pfp_02'} size={48} />
                    <View style={[styles.podiumRankBadge, { backgroundColor: '#64748B' }]}>
                      <Text style={styles.podiumRankBadgeText}>2</Text>
                    </View>
                  </View>
                  <Text style={styles.podiumNameText} numberOfLines={1}>
                    {leaderboard[1]?.name || 'Karan'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <ManaCrystalIcon size={12} />
                    <Text style={styles.podiumXPText}>
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
                  <Text style={[styles.podiumNameText, { fontWeight: '900' }]} numberOfLines={1}>
                    {leaderboard[0]?.name || displayName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ManaCrystalIcon size={14} />
                    <Text style={[styles.podiumXPText, { color: '#38BDF8', fontWeight: '900' }]}>
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
                  <Text style={styles.podiumNameText} numberOfLines={1}>
                    {leaderboard[2]?.name || 'Riya'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <ManaCrystalIcon size={12} />
                    <Text style={styles.podiumXPText}>
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
                    <View key={item.id || rankNum} style={styles.rankListRow}>
                      <Text style={styles.rankListNumber}>{rankNum}</Text>
                      <PlayerAvatar iconId={item.avatarIcon} size={36} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.rankListName}>{item.name}</Text>
                        <Text style={styles.rankListSub}>
                          {item.title} • LVL {item.level}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ManaCrystalIcon size={14} />
                        <Text style={styles.rankListXP}>
                          {item.crystalsMined.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={{ height: 110 }} />
            </ScrollView>

            {/* Sticky Bottom "Your Rank" Bar */}
            <View style={styles.stickyYourRankCard}>
              <PlayerAvatar iconId={avatarIcon} size={40} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.yourRankTitle}>Your Hunter Rank</Text>
                <Text style={styles.yourRankNum}>
                  {currentRank.rankCode}-RANK • #{leaderboard.findIndex((h) => h.isCurrentUser) >= 0 ? leaderboard.findIndex((h) => h.isCurrentUser) + 1 : 1}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ManaCrystalIcon size={15} />
                  <Text style={styles.yourRankXP}>
                    {manaCrystals.toLocaleString()} Crystals
                  </Text>
                </View>
                <Text style={styles.yourRankDelta}>+2 ranks this week</Text>
              </View>
            </View>
          </View>
        )}

        {/* In-App Survey Modal */}
        <InAppSurveyModal
          visible={surveyModal.visible}
          url={surveyModal.url}
          title={surveyModal.title}
          provider={surveyModal.provider}
          onClose={(completed) => {
            setSurveyModal((prev) => ({ ...prev, visible: false }));
            if (completed) {
              refreshData();
            }
          }}
        />

        {/* Emergency Red Gate Modal */}
        <RedGateEncounterModal
          visible={isRedGateModalOpen}
          encounter={activeRedGate}
          onDismiss={() => setIsRedGateModalOpen(false)}
          onSelectTrial={handleSelectRedGateTrial}
        />

        {/* Notification Sheet */}
        <NotificationSheet
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },

  // 1. Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  avatarGlowRim: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  headerTitleWrap: {
    gap: 1,
  },
  greetingSubtext: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hunterNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  hunterRankSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 1,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crystalCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.38)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 24,
  },
  crystalCountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  plusMiniCircle: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellRedDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // 2. Sub-Tabs Segmented Control
  tabSegmentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 4,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 26,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  segmentBtnTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },

  scrollContent: {
    paddingHorizontal: 18,
    gap: 16,
    paddingBottom: 40,
  },

  // 3. Active Dungeon Gate Hero Card (1:1 Lesser Goblin Cave)
  heroGateCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.17)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.34)',
    padding: 18,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroGateCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankPillBadge: {
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  rankPillBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countdownPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  arrowCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGateTitleWrap: {
    gap: 2,
    marginTop: 2,
  },
  heroGateMainTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroGateSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.78)',
  },
  heroGateStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  statCoinGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinMiniCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinMiniSymbol: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  coinValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FCD34D',
  },
  statsDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statCrystalGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  crystalValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },
  statInquestGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inquestValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.88)',
  },
  heroGateBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  levelReqPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  levelReqPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  enterGateWhiteBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  enterGateWhiteBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },

  // 4. Mana Crystal Mines Card
  surveyStationHeroCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(14, 116, 144, 0.26)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.42)',
    padding: 18,
    gap: 14,
  },
  surveyStationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  surveyLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 10,
  },
  surveyLiveBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#BAE6FD',
    letterSpacing: 0.6,
  },
  instantPayoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 10,
  },
  instantPayoutBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#E0F2FE',
  },
  surveyContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  surveyTextCol: {
    flex: 1,
    gap: 5,
  },
  surveyHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  surveyHeroDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 17,
  },
  surveyGraphicCol: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surveyActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  frostedActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    paddingVertical: 11,
    borderRadius: 14,
  },
  frostedActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // 5. Featured Surveys Section
  sectionWrap: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  surveysGlassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  surveyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  surveyIconSquare: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surveyItemInfoCol: {
    flex: 1,
    gap: 2,
  },
  surveyItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  surveyItemTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  hotBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  hotBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  popularBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  popularBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  surveyItemSub: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.72)',
    lineHeight: 15,
  },
  surveyBountyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  surveyBountyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  startPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 14,
  },
  startPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  surveysInnerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 14,
  },

  // 6. Quick Actions Section
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
  },

  // Emergency Red Gate Alert Banner
  redGateHeroBanner: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(22, 8, 10, 0.85)',
    padding: 16,
    gap: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
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
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  redGateAlertPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  redGateBountyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 210, 238, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D2EE',
  },
  redGateBountyPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00D2EE',
  },
  redGateHeroTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  redGateHeroSub: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
    color: '#FCA5A5',
  },
  redGateHeroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  redGateHeroActionText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  // Leaderboard Tab Styles
  lbFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  lbFilterPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbFilterPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  lbFilterPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  lbFilterPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  podiumGlassCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  podiumNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  podiumXPText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ranksListWrap: {
    gap: 8,
  },
  rankListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rankListNumber: {
    fontSize: 13,
    fontWeight: '900',
    width: 24,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  rankListName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rankListSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.72)',
  },
  rankListXP: {
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    color: '#38BDF8',
  },
  stickyYourRankCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
  },
  yourRankTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  yourRankNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  yourRankXP: {
    fontSize: 12,
    fontWeight: '900',
    color: '#38BDF8',
  },
  yourRankDelta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
});
