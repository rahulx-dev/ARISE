import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Swords,
  Crown,
  ChevronRight,
  Lock,
  Sparkles,
  Search,
  CheckCircle2,
  ExternalLink,
  Flame,
  ShieldAlert,
  Clock,
  Trophy,
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
import { gateSpawnService, SpawnedDungeonGate } from '../../src/services/gateSpawnService';
import { supabase, isSupabaseConfigured, getCloudUserId } from '../../src/services/supabaseClient';

export default function DungeonScreen() {
  const { isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();
  const router = useRouter();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const currentRank = getRankForLevel(profile?.level || 1);
  const displayName = profile?.displayName || 'Arjun';
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
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]} edges={['top', 'left', 'right']}>
      {/* 1. TOP STATUS HEADER (DP + Rank + Name on Left; Crystals + Redeem on Right) */}
      <View style={[styles.topHeader, { backgroundColor: isDark ? '#000000' : '#FFFFFF', borderBottomColor: isDark ? '#1C1E2A' : '#E2E8F0' }]}>
        {/* Left: Player Profile & Rank */}
        <TouchableOpacity
          style={styles.headerPlayerCol}
          onPress={() => {
            haptics.light();
            router.push('/(tabs)/profile');
          }}
          activeOpacity={0.8}
        >
          <PlayerAvatar
            iconId={avatarIcon}
            size={42}
            glow={true}
            glowColor={getRankColor(currentRank.rankCode)}
          />
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.hunterNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={[styles.hunterRankPill, { backgroundColor: isDark ? '#111218' : '#F1F5F9', borderColor: getRankColor(currentRank.rankCode) }]}>
                <Text style={[styles.hunterRankPillText, { color: getRankColor(currentRank.rankCode) }]}>
                  {currentRank.rankCode}-RANK
                </Text>
              </View>
            </View>
            <Text style={[styles.hunterTitleSub, { color: isDark ? '#8E8E93' : '#64748B' }]}>
              {currentRank.title} • LVL {userLevel}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: Mana Crystals Vault & Dedicated Redeem Link */}
        <View style={styles.headerRightCol}>
          <TouchableOpacity
            style={[styles.crystalCapsule, { backgroundColor: isDark ? '#111218' : '#F1F5F9', borderColor: isDark ? '#1C1E2A' : '#E2E8F0' }]}
            onPress={() => {
              haptics.light();
              router.push('/redeem' as any);
            }}
            activeOpacity={0.8}
          >
            <ManaCrystalIcon size={20} />
            <Text style={[styles.crystalCountText, { color: isDark ? '#00D2EE' : '#0284C7' }]}>
              {manaCrystals.toLocaleString()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerRedeemBtn}
            onPress={() => {
              haptics.light();
              router.push('/redeem' as any);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.headerRedeemBtnText}>REDEEM</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. SUB-HEADER DUAL TABS: [GATES] vs [LEADERBOARD] */}
      <View style={[styles.tabSegmentWrap, { backgroundColor: isDark ? '#0A0D14' : '#F8FAFC', borderColor: isDark ? '#1C1E2A' : '#E2E8F0' }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'gates' && (isDark ? styles.segmentBtnActiveDark : styles.segmentBtnActiveLight),
          ]}
          onPress={() => {
            haptics.light();
            setActiveTab('gates');
          }}
          activeOpacity={0.85}
        >
          <Swords size={16} color={activeTab === 'gates' ? '#FFFFFF' : (isDark ? '#8E8E93' : '#64748B')} />
          <Text style={[styles.segmentBtnText, { color: activeTab === 'gates' ? '#FFFFFF' : (isDark ? '#8E8E93' : '#64748B') }]}>
            Gates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'leaderboard' && (isDark ? styles.segmentBtnActiveDark : styles.segmentBtnActiveLight),
          ]}
          onPress={() => {
            haptics.light();
            setActiveTab('leaderboard');
          }}
          activeOpacity={0.85}
        >
          <Trophy size={16} color={activeTab === 'leaderboard' ? '#FFFFFF' : (isDark ? '#8E8E93' : '#64748B')} />
          <Text style={[styles.segmentBtnText, { color: activeTab === 'leaderboard' ? '#FFFFFF' : (isDark ? '#8E8E93' : '#64748B') }]}>
            Leaderboard
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
          <View style={[
            styles.radarHeroCard,
            {
              backgroundColor: isDark ? '#111218' : '#F8FAFC',
              borderColor: isDark ? '#1C1E2A' : '#E2E8F0',
            }
          ]}>
            <View style={styles.radarHeroLeft}>
              <View style={styles.radarLivePill}>
                <View style={styles.radarLiveDot} />
                <Text style={styles.radarLiveText}>HUNTER RADAR // RIFT SCANNER</Text>
              </View>
              <Text style={[styles.radarHeroTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                Dimensional Rift Radar
              </Text>
              <Text style={[styles.radarHeroSub, { color: isDark ? '#8E8E93' : '#64748B' }]}>
                Scan sector coordinates for active gates & survey bounties
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.radarPulseBtn, isScanning && styles.radarPulseBtnActive]}
              onPress={handleRadarPulse}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Search size={14} color="#FFFFFF" />
              )}
              <Text style={styles.radarPulseBtnText}>
                {isScanning ? 'Scanning...' : 'Radar Scan'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section Title */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              Active Dungeon Gates ({spawnedGates.length})
            </Text>
            <Text style={[styles.sectionSub, { color: isDark ? '#8E8E93' : '#64748B' }]}>
              Rank E → S
            </Text>
          </View>

          {/* Spawned Dungeon Gate Cards */}
          {spawnedGates.map((gateItem) => {
            const isGateLocked = userLevel < gateItem.requiredLevel;
            const rankColor = getRankColor(gateItem.rankCode);
            const totalInrPayout = gateItem.missions.reduce((acc, m) => acc + m.grossPayoutInr, 0);
            const totalCrystalBounty = gateItem.missions.reduce((acc, m) => acc + m.hunterCrystals, 0);
            const completedMissions = gateItem.missions.filter((m) => m.isCompleted).length;
            const isCompleted = gateItem.isCleared || (gateItem.missions.length > 0 && completedMissions === gateItem.missions.length);

            return (
              <TouchableOpacity
                key={gateItem.id}
                style={[
                  styles.dungeonGateCard,
                  {
                    backgroundColor: isDark ? '#111218' : '#FFFFFF',
                    borderColor: isCompleted
                      ? '#10B981'
                      : isGateLocked
                      ? (isDark ? '#1C1E2A' : '#E2E8F0')
                      : (isDark ? '#1C1E2A' : '#E2E8F0'),
                  },
                ]}
                onPress={() => handleOpenGatePage(gateItem)}
                activeOpacity={0.85}
              >
                {/* Gate Card Top: Rank Badge + Title + Countdown Timer */}
                <View style={styles.gateCardTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={[styles.gateRankBadge, { backgroundColor: isDark ? '#191B26' : '#F1F5F9', borderColor: rankColor }]}>
                      <Text style={[styles.gateRankBadgeText, { color: rankColor }]}>
                        {gateItem.rankCode}-RANK
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gateCardTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                        {gateItem.title}
                      </Text>
                      <Text style={[styles.gateCardThreat, { color: isDark ? '#8E8E93' : '#64748B' }]} numberOfLines={1}>
                        {gateItem.threatName}
                      </Text>
                    </View>
                  </View>

                  {/* Countdown Timer Pill */}
                  <View style={[styles.countdownCapsule, { backgroundColor: isDark ? '#090B10' : '#F1F5F9', borderColor: isDark ? '#1C1E2A' : '#E2E8F0' }]}>
                    <Clock size={11} color={isDark ? '#00D2EE' : '#0284C7'} />
                    <Text style={[styles.countdownText, { color: isDark ? '#00D2EE' : '#0284C7' }]}>
                      {getRemainingTime(gateItem.expiresAt)}
                    </Text>
                  </View>
                </View>

                {/* Gate Card Bounty & Progress Strip */}
                <View style={[styles.bountyPillRow, { backgroundColor: isDark ? '#090B10' : '#F8FAFC', borderColor: isDark ? '#161922' : '#E2E8F0' }]}>
                  <View style={styles.bountyGrossTag}>
                    <Text style={[styles.bountyGrossLabel, { color: isDark ? '#8E8E93' : '#64748B' }]}>BOUNTY:</Text>
                    <Text style={styles.bountyGrossVal}>₹{totalInrPayout}</Text>
                    <Text style={{ color: isDark ? '#8E8E93' : '#64748B', fontSize: 10 }}>•</Text>
                    <ManaCrystalIcon size={14} />
                    <Text style={[styles.bountyCrystalsVal, { color: isDark ? '#00D2EE' : '#0284C7' }]}>
                      {totalCrystalBounty} Crystals
                    </Text>
                  </View>

                  {isCompleted ? (
                    <View style={styles.clearedPill}>
                      <CheckCircle2 size={12} color="#10B981" />
                      <Text style={styles.clearedPillText}>CLEARED</Text>
                    </View>
                  ) : (
                    <View style={styles.missionProgressTag}>
                      <Text style={[styles.missionProgressText, { color: isDark ? '#8E8E93' : '#64748B' }]}>
                        {completedMissions}/{gateItem.missions.length} Inquests
                      </Text>
                    </View>
                  )}
                </View>

                {/* Gate Card Footer: Required Level & Enter Button */}
                <View style={styles.gateCardFooterRow}>
                  {isGateLocked ? (
                    <View style={styles.gateLockBadge}>
                      <Lock size={12} color="#EF4444" />
                      <Text style={styles.gateLockBadgeText}>REQ LVL {gateItem.requiredLevel}</Text>
                    </View>
                  ) : (
                    <View style={[styles.gateReqLevelPill, { backgroundColor: isDark ? '#191B26' : '#F1F5F9' }]}>
                      <Text style={[styles.gateReqLevelText, { color: isDark ? '#8E8E93' : '#64748B' }]}>
                        Level {gateItem.requiredLevel}+
                      </Text>
                    </View>
                  )}

                  <View style={[
                    styles.enterGateBtn,
                    {
                      backgroundColor: isCompleted
                        ? '#10B981'
                        : isGateLocked
                        ? (isDark ? '#222634' : '#E2E8F0')
                        : '#EF4444',
                    }
                  ]}>
                    <Text style={[
                      styles.enterGateBtnText,
                      { color: isGateLocked ? (isDark ? '#64748B' : '#94A3B8') : '#FFFFFF' }
                    ]}>
                      {isCompleted ? 'INSPECT DUNGEON' : isGateLocked ? 'LOCKED' : 'ENTER GATE'}
                    </Text>
                    <ChevronRight size={14} color={isGateLocked ? (isDark ? '#64748B' : '#94A3B8') : '#FFFFFF'} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Quick Mana Crystal Survey Mines Banner */}
          <View style={[
            styles.surveyStationHeroCard,
            {
              backgroundColor: isDark ? '#081D2E' : '#F0F9FF',
              borderColor: isDark ? '#0C385C' : '#BAE6FD',
              marginTop: 4,
            }
          ]}>
            <View style={styles.surveyStationTopRow}>
              <View style={[styles.surveyLiveBadge, { backgroundColor: isDark ? '#0C2B44' : '#FFFFFF', borderColor: isDark ? '#0C4A6E' : '#BAE6FD' }]}>
                <Sparkles size={13} color="#0284C7" />
                <Text style={[styles.surveyLiveBadgeText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                  MANA CRYSTAL MINES
                </Text>
              </View>
              <View style={[styles.surveyYieldBadge, { backgroundColor: isDark ? '#0C2B44' : '#FFFFFF' }]}>
                <ManaCrystalIcon size={14} />
                <Text style={[styles.surveyYieldBadgeText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                  Instant Payout
                </Text>
              </View>
            </View>

            <Text style={[styles.surveyStationTitle, { color: isDark ? '#E0F2FE' : '#0C4A6E' }]}>
              Mine Mana Crystals with Live Surveys
            </Text>
            <Text style={[styles.surveyStationDesc, { color: isDark ? '#7DD3FC' : '#0369A1' }]}>
              Answer sponsored research questions from CPX Research & BitLabs to earn crystals and redeem real vouchers in the shop.
            </Text>

            <View style={styles.surveyActionBtnsRow}>
              <TouchableOpacity
                style={styles.surveyCpxBtn}
                onPress={handleOpenCPXSurveys}
                activeOpacity={0.85}
              >
                <Text style={styles.surveyCpxBtnText}>CPX Wall</Text>
                <ExternalLink size={13} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.surveyBitlabsBtn,
                  {
                    backgroundColor: isDark ? '#0C2B44' : '#FFFFFF',
                    borderColor: isDark ? '#0C4A6E' : '#BAE6FD',
                  }
                ]}
                onPress={handleOpenBitLabsSurveys}
                activeOpacity={0.85}
              >
                <Text style={[styles.surveyBitlabsBtnText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>BitLabs Mine</Text>
                <ExternalLink size={13} color={isDark ? '#38BDF8' : '#0284C7'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Direct CPX Research Card */}
          <TouchableOpacity
            style={[
              styles.surveyProviderCard,
              { backgroundColor: isDark ? '#111218' : '#FFFFFF', borderColor: isDark ? '#1C1E2A' : '#E2E8F0' },
            ]}
            onPress={handleOpenCPXSurveys}
            activeOpacity={0.85}
          >
            <View style={styles.surveyProviderLeft}>
              <View style={[styles.surveyProviderIconCircle, { backgroundColor: isDark ? '#0C2B44' : '#E0F2FE' }]}>
                <Sparkles size={22} color="#0284C7" />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.surveyProviderTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    CPX Research Survey Wall
                  </Text>
                  <View style={[styles.hotPill, { backgroundColor: isDark ? '#3A1E24' : '#FEE2E2', borderColor: isDark ? '#5C222B' : '#FECACA' }]}>
                    <Text style={styles.hotPillText}>HOT</Text>
                  </View>
                </View>
                <Text style={[styles.surveyProviderSub, { color: isDark ? '#8E8E93' : '#64748B' }]}>
                  High acceptance rate • Instant crystal payout
                </Text>
                <View style={styles.surveyBountyRow}>
                  <ManaCrystalIcon size={14} />
                  <Text style={[styles.surveyBountyText, { color: isDark ? '#00D2EE' : '#0284C7' }]}>
                    +150 to +1,200 Crystals per survey
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.surveyOpenBtn}>
              <Text style={styles.surveyOpenBtnText}>START</Text>
              <ChevronRight size={15} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Direct BitLabs Survey Card */}
          <TouchableOpacity
            style={[
              styles.surveyProviderCard,
              { backgroundColor: isDark ? '#111218' : '#FFFFFF', borderColor: isDark ? '#1C1E2A' : '#E2E8F0' },
            ]}
            onPress={handleOpenBitLabsSurveys}
            activeOpacity={0.85}
          >
            <View style={styles.surveyProviderLeft}>
              <View style={[styles.surveyProviderIconCircle, { backgroundColor: isDark ? '#2C1B1B' : '#FEE2E2' }]}>
                <Flame size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.surveyProviderTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    BitLabs Global Surveys
                  </Text>
                  <View style={[styles.hotPill, { backgroundColor: isDark ? '#3B2912' : '#FEF3C7', borderColor: isDark ? '#5A3D1A' : '#FDE68A' }]}>
                    <Text style={[styles.hotPillText, { color: '#F59E0B' }]}>POPULAR</Text>
                  </View>
                </View>
                <Text style={[styles.surveyProviderSub, { color: isDark ? '#8E8E93' : '#64748B' }]}>
                  Verified market research questionnaires
                </Text>
                <View style={styles.surveyBountyRow}>
                  <ManaCrystalIcon size={14} />
                  <Text style={[styles.surveyBountyText, { color: isDark ? '#00D2EE' : '#0284C7' }]}>
                    +200 to +2,000 Crystals per survey
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.surveyOpenBtn, { backgroundColor: isDark ? '#EF4444' : '#111827' }]}>
              <Text style={styles.surveyOpenBtnText}>START</Text>
              <ChevronRight size={15} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
                          ? '#EF4444'
                          : (isDark ? '#111218' : '#F1F5F9'),
                        borderColor: isSelected
                          ? '#EF4444'
                          : (isDark ? '#1C1E2A' : '#E2E8F0'),
                      },
                    ]}
                    onPress={() => {
                      haptics.light();
                      setLbFilter(f);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.lbFilterPillText, { color: isSelected ? '#FFFFFF' : (isDark ? '#8E8E93' : '#64748B') }]}>
                      {f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : 'All-Time'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Top 3 Podium (Rank 2 Left, Rank 1 Center 👑, Rank 3 Right) */}
            <View style={[styles.podiumSection, { backgroundColor: isDark ? '#111218' : '#FFFFFF', borderColor: isDark ? '#1C1E2A' : '#E2E8F0' }]}>
              {/* #2 Left: Rank 2 Hunter */}
              <View style={styles.podiumCol}>
                <View style={[styles.podiumAvatarWrap, { borderColor: '#CBD5E1' }]}>
                  <PlayerAvatar iconId={leaderboard[1]?.avatarIcon || 'pfp_02'} size={48} />
                  <View style={[styles.podiumRankBadge, { backgroundColor: '#64748B' }]}>
                    <Text style={styles.podiumRankBadgeText}>2</Text>
                  </View>
                </View>
                <Text style={[styles.podiumNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                  {leaderboard[1]?.name || 'Karan'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <ManaCrystalIcon size={12} />
                  <Text style={[styles.podiumXPText, { color: isDark ? '#8E8E93' : '#64748B' }]}>
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
                <Text style={[styles.podiumNameText, { color: isDark ? '#FFFFFF' : '#0F172A', fontWeight: '900' }]} numberOfLines={1}>
                  {leaderboard[0]?.name || displayName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ManaCrystalIcon size={14} />
                  <Text style={[styles.podiumXPText, { color: '#EF4444', fontWeight: '900' }]}>
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
                <Text style={[styles.podiumNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                  {leaderboard[2]?.name || 'Riya'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <ManaCrystalIcon size={12} />
                  <Text style={[styles.podiumXPText, { color: isDark ? '#8E8E93' : '#64748B' }]}>
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
                      { backgroundColor: isDark ? '#111218' : '#FFFFFF', borderColor: isDark ? '#1C1E2A' : '#E2E8F0' },
                    ]}
                  >
                    <Text style={[styles.rankListNumber, { color: isDark ? '#8E8E93' : '#64748B' }]}>{rankNum}</Text>
                    <PlayerAvatar iconId={item.avatarIcon} size={36} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.rankListName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{item.name}</Text>
                      <Text style={[styles.rankListSub, { color: isDark ? '#8E8E93' : '#64748B' }]}>
                        {item.title} • LVL {item.level}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ManaCrystalIcon size={14} />
                      <Text style={[styles.rankListXP, { color: isDark ? '#00D2EE' : '#0284C7' }]}>
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
          <View style={[styles.stickyYourRankCard, { backgroundColor: isDark ? '#111218' : '#FFFFFF', borderTopColor: isDark ? '#1C1E2A' : '#E2E8F0' }]}>
            <PlayerAvatar iconId={avatarIcon} size={40} />
            <View style={{ flex: 1, marginLeft: 10, gap: 1 }}>
              <Text style={[styles.yourRankTitle, { color: isDark ? '#8E8E93' : '#64748B' }]}>Your Hunter Rank</Text>
              <Text style={[styles.yourRankNum, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                {currentRank.rankCode}-RANK • #{leaderboard.findIndex((h) => h.isCurrentUser) >= 0 ? leaderboard.findIndex((h) => h.isCurrentUser) + 1 : 1}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ManaCrystalIcon size={15} />
                <Text style={[styles.yourRankXP, { color: isDark ? '#00D2EE' : '#0284C7' }]}>
                  {manaCrystals.toLocaleString()} Crystals
                </Text>
              </View>
              <Text style={styles.yourRankDelta}>+2 ranks this week</Text>
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

  // Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerPlayerCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hunterNameText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  hunterRankPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  hunterRankPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hunterTitleSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crystalCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  crystalCountText: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
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
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  // Dual Sub Tabs (Gates / Leaderboard)
  tabSegmentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 14,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentBtnActiveDark: {
    backgroundColor: '#EF4444',
  },
  segmentBtnActiveLight: {
    backgroundColor: '#EF4444',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: 18,
    gap: 14,
    paddingBottom: 30,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  sectionSub: {
    fontSize: 11.5,
    fontWeight: '700',
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
    fontSize: 9.5,
    fontWeight: '900',
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
    fontSize: 10,
    fontWeight: '900',
    color: '#00D2EE',
  },
  redGateHeroTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  redGateHeroSub: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
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
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  // Radar Hero Card
  radarHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  radarHeroLeft: {
    flex: 1,
    gap: 3,
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
    fontSize: 9,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.6,
  },
  radarHeroTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  radarHeroSub: {
    fontSize: 11,
    lineHeight: 15,
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
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // Spawned Dungeon Gate Card
  dungeonGateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  gateCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  gateRankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  gateRankBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gateCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  gateCardThreat: {
    fontSize: 11,
    fontWeight: '500',
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
  countdownText: {
    fontSize: 10.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // Bounty Pill Row
  bountyPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  bountyGrossTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bountyGrossLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bountyGrossVal: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
  },
  bountyCrystalsVal: {
    fontSize: 11,
    fontWeight: '900',
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
    fontSize: 9.5,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.4,
  },
  missionProgressTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionProgressText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Gate Card Footer Row
  gateCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  gateReqLevelPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gateReqLevelText: {
    fontSize: 10.5,
    fontWeight: '700',
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
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.4,
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
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  // Survey Station Hero Card
  surveyStationHeroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  surveyStationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  surveyLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  surveyLiveBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  surveyYieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  surveyYieldBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  surveyStationTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  surveyStationDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  surveyActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  surveyCpxBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 10,
  },
  surveyCpxBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  surveyBitlabsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  surveyBitlabsBtnText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  // Survey Provider Card
  surveyProviderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  surveyProviderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  surveyProviderIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surveyProviderTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  hotPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  hotPillText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#EF4444',
  },
  surveyProviderSub: {
    fontSize: 11,
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
  },
  surveyOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  surveyOpenBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  // Leaderboard Filter Pills
  lbFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lbFilterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbFilterPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Top 3 Podium
  podiumSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingVertical: 20,
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
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  podiumNameText: {
    fontSize: 13,
    fontWeight: '800',
  },
  podiumXPText: {
    fontSize: 11.5,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '900',
    width: 24,
  },
  rankListName: {
    fontSize: 13,
    fontWeight: '800',
  },
  rankListSub: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  rankListXP: {
    fontSize: 12,
    fontWeight: '900',
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
    fontSize: 10.5,
    fontWeight: '700',
  },
  yourRankNum: {
    fontSize: 13,
    fontWeight: '900',
  },
  yourRankXP: {
    fontSize: 12,
    fontWeight: '900',
  },
  yourRankDelta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
});
