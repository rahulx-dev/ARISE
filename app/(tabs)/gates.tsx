import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Swords,
  Trophy,
  Crown,
  ChevronRight,
  ShieldAlert,
  Layers,
  Zap,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { crystalRepository, CrystalLeaderboardHunter } from '../../src/database/repositories/crystalRepository';
import { redGateService, RedGateEncounter, RedGateTrial } from '../../src/services/redGateService';
import { RedGateEncounterModal } from '../../src/components/gates/RedGateEncounterModal';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { ManaCrystalIcon } from '../../src/components/ui/ManaCrystalIcon';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';
import { getRankForLevel } from '../../src/constants/ranks';
import { gateSpawnService, SpawnedDungeonGate } from '../../src/services/gateSpawnService';

export default function DungeonScreen() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();
  const router = useRouter();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const currentRank = getRankForLevel(profile?.level || 1);
  const displayName = profile?.displayName || 'WARRIOR';
  const avatarIcon = profile?.avatarIcon || 'img_pfp_01';

  // Sub-tabs: 'gates' | 'leaderboard'
  const [activeTab, setActiveTab] = useState<'gates' | 'leaderboard'>('gates');

  // Emergency Red Gate State
  const [activeRedGate, setActiveRedGate] = useState<RedGateEncounter | null>(null);
  const [isRedGateModalOpen, setIsRedGateModalOpen] = useState<boolean>(false);

  // Mana Crystals & Leaderboard State
  const [manaCrystals, setManaCrystals] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<CrystalLeaderboardHunter[]>([]);

  // Dynamic Spawned Dungeon Gates State
  const [spawnedGates, setSpawnedGates] = useState<SpawnedDungeonGate[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // 1-second live ticker for gate collapse countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Solo Leveling System Notification Dialog
  const [systemDialog, setSystemDialog] = useState<{
    visible: boolean;
    title: string;
    subtag: string;
    message: string;
    rewardCrystals?: number;
    rewardXP?: number;
    buttonText: string;
    onPress?: () => void;
  }>({
    visible: false,
    title: '',
    subtag: 'ARISE OS // SYSTEM DIRECTIVE',
    message: '',
    buttonText: 'CONFIRM',
  });

  const showSystemNotification = (
    title: string,
    message: string,
    rewardCrystals?: number,
    rewardXP?: number,
    buttonText = 'CONFIRM',
    onPress?: () => void
  ) => {
    sound.play('unlock');
    haptics.heavy();
    setSystemDialog({
      visible: true,
      title,
      subtag: 'ARISE OS // SYSTEM NOTIFICATION',
      message,
      rewardCrystals,
      rewardXP,
      buttonText,
      onPress,
    });
  };

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
    setManaCrystals(bal);

    const lb = await crystalRepository.getCrystalLeaderboard(bal, displayName, avatarIcon);
    setLeaderboard(lb);

    const rg = await redGateService.checkAndTriggerRandomGate();
    setActiveRedGate(rg);

    const dynamicGates = await gateSpawnService.getActiveGates();
    setSpawnedGates(dynamicGates);
  }, [displayName, avatarIcon]);

  // Re-run every time user navigates to this tab or returns from gate details
  useFocusEffect(
    useCallback(() => {
      loadProfile();
      refreshData();
    }, [loadProfile, refreshData])
  );

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

  // Navigate to dedicated Gate Details page
  const handleOpenGatePage = (gate: SpawnedDungeonGate) => {
    haptics.medium();
    sound.play('quest_complete');
    router.push({
      pathname: '/gates/[id]',
      params: { id: gate.id },
    } as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* 1. TOP STATUS HEADER (DP + Rank + Name on Left; Crystals + Redeem on Right) */}
      <View style={[styles.topHeader, { backgroundColor: colors.backgroundElevated, borderBottomColor: colors.border }]}>
        {/* Left: Player Profile & Rank */}
        <View style={styles.headerPlayerCol}>
          <PlayerAvatar
            iconId={avatarIcon}
            size={42}
            glow={true}
            glowColor="#0284C7"
          />
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.hunterNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                {displayName.toUpperCase()}
              </Text>
              <View style={[styles.hunterRankPill, { backgroundColor: isDark ? '#0C1322' : '#E0F2FE', borderColor: '#0284C7' }]}>
                <Text style={styles.hunterRankPillText}>{currentRank.rankCode}-RANK</Text>
              </View>
            </View>
            <Text style={[styles.hunterTitleSub, { color: colors.textSecondary }]}>
              {currentRank.title} • LVL {profile?.level || 1}
            </Text>
          </View>
        </View>

        {/* Right: Mana Crystals Vault & Dedicated Redeem Page Link */}
        <View style={styles.headerRightCol}>
          <View style={[styles.crystalCapsule, { backgroundColor: isDark ? '#061320' : '#E0F2FE', borderColor: isDark ? '#075985' : '#0284C7' }]}>
            <ManaCrystalIcon size={18} color="#00D2EE" secondaryColor="#0284C7" />
            <Text style={[styles.crystalCountText, { color: isDark ? '#00D2EE' : '#0369A1' }]}>
              {manaCrystals.toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerRedeemBtn}
            onPress={() => {
              haptics.light();
              router.push('/redeem' as any);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.headerRedeemBtnText}>REDEEM</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. SUB-HEADER DUAL TABS: [DUNGEON GATES] vs [LEADERBOARD] */}
      <View style={[styles.tabSegmentWrap, { backgroundColor: isDark ? '#0A0D15' : colors.surfaceLight, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'gates' && styles.segmentBtnActive]}
          onPress={() => {
            haptics.light();
            setActiveTab('gates');
          }}
          activeOpacity={0.85}
        >
          <Swords size={15} color={activeTab === 'gates' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.segmentBtnText, activeTab === 'gates' && styles.segmentBtnTextActive]}>
            DUNGEON GATES
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
          <Trophy size={15} color={activeTab === 'leaderboard' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.segmentBtnText, activeTab === 'leaderboard' && styles.segmentBtnTextActive]}>
            LEADERBOARD
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================= TAB 1: DUNGEON GATES (RANK LIST) ======================= */}
      {activeTab === 'gates' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* AdMob Non-Intrusive Banner */}
          <AriseBannerAd style={{ marginVertical: 4 }} />

          <View style={{ gap: 12 }}>
            {/* Active Emergency Red Gate Alert Banner */}
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
                    <ShieldAlert size={13} color="#FF1E44" />
                    <Text style={styles.redGateAlertPillText}>EMERGENCY RED GATE ACTIVE</Text>
                  </View>
                  <View style={styles.redGateBountyPill}>
                    <ManaCrystalIcon size={14} color="#00D2EE" secondaryColor="#0284C7" />
                    <Text style={styles.redGateBountyPillText}>+{activeRedGate.bountyCrystals} Crystals</Text>
                  </View>
                </View>

                <View style={{ gap: 3 }}>
                  <Text style={styles.redGateHeroTitle}>
                    CRIMSON DIMENSION RIFT // BARAN DOMAIN
                  </Text>
                  <Text style={styles.redGateHeroSub}>
                    Boss: {activeRedGate.threatName} • Dimensional exit sealed! Execute physical trial to conquer.
                  </Text>
                </View>

                <View style={styles.redGateHeroActionRow}>
                  <Text style={styles.redGateHeroActionText}>ENTER HIGH-STAKES TRIAL</Text>
                  <ChevronRight size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}

            {/* Hunter Association Radar Scan Control */}
            <View style={[styles.radarHeroCard, { backgroundColor: isDark ? '#07090F' : '#F1F5F9', borderColor: '#0284C7' }]}>
              <View style={styles.radarHeroLeft}>
                <View style={styles.radarLivePill}>
                  <View style={styles.radarLiveDot} />
                  <Text style={styles.radarLiveText}>RADAR ACTIVE • {spawnedGates.length} RIFTS DETECTED</Text>
                </View>
                <Text style={[styles.radarHeroTitle, { color: colors.textPrimary }]}>
                  DIMENSIONAL GATE RADAR
                </Text>
                <Text style={[styles.radarHeroSub, { color: colors.textSecondary }]}>
                  Survey market bounties dynamically allocated by gross payout tier (80/20 Hunter Split).
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.radarPulseBtn, isScanning && styles.radarPulseBtnActive]}
                onPress={handleRadarPulse}
                disabled={isScanning}
                activeOpacity={0.8}
              >
                <Radio size={14} color="#FFFFFF" />
                <Text style={styles.radarPulseBtnText}>{isScanning ? 'SCANNING...' : 'RADAR PULSE'}</Text>
              </TouchableOpacity>
            </View>

            {spawnedGates.map((gate) => {
              const totalGrossPayout = gate.missions.reduce((sum, m) => sum + m.grossPayoutInr, 0);
              const totalCrystals = gate.missions.reduce((sum, m) => sum + m.hunterCrystals, 0);
              const countdownStr = getRemainingTime(gate.expiresAt);
              const completedMissionsCount = gate.missions.filter((m) => m.isCompleted).length;

              return (
                <TouchableOpacity
                  key={gate.id}
                  style={[
                    styles.gateCard,
                    {
                      backgroundColor: isDark ? '#0A0D15' : colors.card,
                      borderColor: gate.isCleared ? '#10B981' : isDark ? gate.borderColor : colors.border,
                    },
                  ]}
                  onPress={() => handleOpenGatePage(gate)}
                  activeOpacity={0.88}
                >
                  {/* Card Header Row */}
                  <View style={styles.gateCardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.rankBadge, { backgroundColor: gate.badgeColor }]}>
                        <Text style={styles.rankBadgeText}>{gate.rankCode}-RANK GATE</Text>
                      </View>
                      {gate.isCleared && (
                        <View style={styles.clearedPill}>
                          <CheckCircle2 size={11} color="#10B981" />
                          <Text style={styles.clearedPillText}>CONQUERED</Text>
                        </View>
                      )}
                    </View>

                    {/* Live Collapse Countdown Timer */}
                    <View style={[styles.countdownCapsule, { borderColor: isDark ? '#1C1E2A' : '#CBD5E1' }]}>
                      <Clock size={11} color="#00D2EE" />
                      <Text style={styles.countdownText}>{countdownStr}</Text>
                    </View>
                  </View>

                  {/* Gate Title & Threat Description */}
                  <View style={{ gap: 3 }}>
                    <Text style={[styles.gateTitle, { color: colors.textPrimary }]}>{gate.title}</Text>
                    <Text style={[styles.threatSubText, { color: gate.badgeColor }]}>
                      Boss: {gate.threatName}
                    </Text>
                    <Text style={[styles.gateLoreText, { color: colors.textSecondary }]} numberOfLines={2}>
                      {gate.lore}
                    </Text>
                  </View>

                  {/* Bounty Allocation Bar */}
                  <View style={styles.bountyPillRow}>
                    <View style={styles.bountyGrossTag}>
                      <Text style={styles.bountyGrossLabel}>BOUNTY POOL:</Text>
                      <Text style={styles.bountyGrossVal}>₹{totalGrossPayout} INR</Text>
                    </View>
                    <View style={styles.missionProgressTag}>
                      <Layers size={11} color="#64748B" />
                      <Text style={styles.missionProgressText}>
                        {completedMissionsCount}/{gate.missions.length} Recon Tasks
                      </Text>
                    </View>
                  </View>

                  {/* Card Footer: Crystal Yield & Enter Action */}
                  <View style={styles.gateCardFooterRow}>
                    <View style={styles.yieldBox}>
                      <ManaCrystalIcon size={16} color="#00D2EE" secondaryColor="#0284C7" />
                      <Text style={styles.yieldAmountText}>Up to +{totalCrystals.toLocaleString()} Crystals</Text>
                    </View>

                    <View style={[styles.openGateActionPill, gate.isCleared && { backgroundColor: '#10B981' }]}>
                      <Text style={styles.openGateActionText}>
                        {gate.isCleared ? 'RE-ENTER' : 'ENTER GATE'}
                      </Text>
                      <ChevronRight size={14} color="#FFFFFF" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ======================= TAB 2: CRYSTAL LEADERBOARD (TOP 100 REAL HUNTERS) ======================= */}
      {activeTab === 'leaderboard' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {leaderboard.length === 0 ? (
            <View style={[styles.emptyLeaderboardCard, { backgroundColor: isDark ? '#0A0D15' : colors.card, borderColor: colors.border }]}>
              <Trophy size={32} color="#0284C7" />
              <Text style={[styles.emptyLeaderboardTitle, { color: colors.textPrimary }]}>
                NO HUNTERS HAVE EXTRACTED CRYSTALS YET
              </Text>
              <Text style={[styles.emptyLeaderboardSub, { color: colors.textSecondary }]}>
                Complete dimensional Dungeon Gate missions to extract Mana Crystals and claim the #1 spot on the Global Leaderboard!
              </Text>
              <TouchableOpacity
                style={styles.emptyGoGatesBtn}
                onPress={() => setActiveTab('gates')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyGoGatesBtnText}>EXPLORE DUNGEON GATES</Text>
                <ChevronRight size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Top 3 Podium Card */}
              <View style={[styles.podiumContainer, { backgroundColor: isDark ? '#0A0D15' : colors.card, borderColor: colors.border }]}>
                <View style={styles.podiumHeaderRow}>
                  <Crown size={18} color="#F59E0B" />
                  <Text style={[styles.podiumHeaderTitle, { color: colors.textPrimary }]}>
                    CRYSTAL MINING HALL OF FAME
                  </Text>
                </View>
                <Text style={[styles.podiumHeaderSub, { color: colors.textSecondary }]}>
                  Global ranking of real hunters by total Mana Crystals extracted
                </Text>

                {/* Podium Slots */}
                <View style={styles.topThreeRow}>
                  {/* #2 Rank Silver */}
                  {leaderboard[1] && (
                    <View style={styles.podiumSlot}>
                      <View style={[styles.podiumBadgeCircle, { borderColor: '#CBD5E1' }]}>
                        <Text style={styles.podiumRankNum}>2</Text>
                      </View>
                      <PlayerAvatar iconId={leaderboard[1].avatarIcon} size={46} glow={false} />
                      <Text style={[styles.podiumHunterName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {leaderboard[1].name}
                      </Text>
                      <View style={styles.podiumCrystalPill}>
                        <ManaCrystalIcon size={12} color="#00D2EE" secondaryColor="#0284C7" />
                        <Text style={styles.podiumCrystalText}>{(leaderboard[1].crystalsMined / 1000).toFixed(1)}k</Text>
                      </View>
                    </View>
                  )}

                  {/* #1 Rank Gold */}
                  {leaderboard[0] && (
                    <View style={[styles.podiumSlot, styles.podiumSlotFirst]}>
                      <Crown size={22} color="#F59E0B" style={{ marginBottom: -4 }} />
                      <View style={[styles.podiumBadgeCircle, { borderColor: '#F59E0B' }]}>
                        <Text style={[styles.podiumRankNum, { color: '#F59E0B' }]}>1</Text>
                      </View>
                      <PlayerAvatar iconId={leaderboard[0].avatarIcon} size={56} glow={true} glowColor="#F59E0B" />
                      <Text style={[styles.podiumHunterName, { color: colors.textPrimary, fontWeight: '900' }]} numberOfLines={1}>
                        {leaderboard[0].name}
                      </Text>
                      <View style={[styles.podiumCrystalPill, { borderColor: '#F59E0B' }]}>
                        <ManaCrystalIcon size={12} color="#00D2EE" secondaryColor="#0284C7" />
                        <Text style={[styles.podiumCrystalText, { color: '#F59E0B' }]}>
                          {(leaderboard[0].crystalsMined / 1000).toFixed(1)}k
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* #3 Rank Bronze */}
                  {leaderboard[2] && (
                    <View style={styles.podiumSlot}>
                      <View style={[styles.podiumBadgeCircle, { borderColor: '#B45309' }]}>
                        <Text style={styles.podiumRankNum}>3</Text>
                      </View>
                      <PlayerAvatar iconId={leaderboard[2].avatarIcon} size={46} glow={false} />
                      <Text style={[styles.podiumHunterName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {leaderboard[2].name}
                      </Text>
                      <View style={styles.podiumCrystalPill}>
                        <ManaCrystalIcon size={12} color="#00D2EE" secondaryColor="#0284C7" />
                        <Text style={styles.podiumCrystalText}>{(leaderboard[2].crystalsMined / 1000).toFixed(1)}k</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Ranks 4–100 List */}
              <View style={{ gap: 8 }}>
                {leaderboard.slice(3).map((hunter, idx) => {
                  const rankPos = idx + 4;
                  const isUser = hunter.isCurrentUser;
                  return (
                    <View
                      key={hunter.id + '_' + rankPos}
                      style={[
                        styles.lbRowCard,
                        {
                          backgroundColor: isDark ? '#0A0D15' : colors.card,
                          borderColor: isUser ? '#0284C7' : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.lbRankIndex, { color: colors.textSecondary }]}>#{rankPos}</Text>
                      <PlayerAvatar iconId={hunter.avatarIcon} size={36} glow={false} />

                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.lbHunterName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {hunter.name} {isUser && '(You)'}
                          </Text>
                          <View style={[styles.lbRankBadge, { backgroundColor: isDark ? '#161926' : '#F1F5F9' }]}>
                            <Text style={styles.lbRankBadgeText}>{hunter.rankCode}-RANK</Text>
                          </View>
                        </View>
                        <Text style={[styles.lbTitleText, { color: colors.textSecondary }]}>{hunter.title}</Text>
                      </View>

                      <View style={styles.lbCrystalsTag}>
                        <ManaCrystalIcon size={14} color="#00D2EE" secondaryColor="#0284C7" />
                        <Text style={styles.lbCrystalsAmount}>{hunter.crystalsMined.toLocaleString()}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ======================= AUTHENTIC SOLO LEVELING SYSTEM NOTIFICATION ======================= */}
      <Modal visible={systemDialog.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.systemDialogSafe}>
            <View style={[styles.systemDialogCard, { backgroundColor: isDark ? '#05070D' : '#0B1120', borderColor: '#0284C7' }]}>
              {/* Header */}
              <View style={styles.systemDialogHeader}>
                <View style={styles.systemTagBadge}>
                  <Text style={styles.systemTagBadgeText}>[ SYSTEM NOTIFICATION ]</Text>
                </View>
                <Text style={styles.systemSubtagText}>{systemDialog.subtag}</Text>
              </View>

              {/* Title & Message */}
              <View style={{ gap: 8, paddingVertical: 10 }}>
                <Text style={styles.systemDialogTitle}>{systemDialog.title}</Text>
                <Text style={styles.systemDialogMsg}>{systemDialog.message}</Text>

                {/* Optional Reward Box */}
                {(systemDialog.rewardCrystals || systemDialog.rewardXP) && (
                  <View style={styles.systemRewardBox}>
                    <Text style={styles.systemRewardBoxLabel}>CLEAR REWARDS ACQUIRED:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      {systemDialog.rewardCrystals && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <ManaCrystalIcon size={16} color="#00D2EE" secondaryColor="#0284C7" />
                          <Text style={styles.systemRewardVal}>+{systemDialog.rewardCrystals.toLocaleString()} Crystals</Text>
                        </View>
                      )}
                      {systemDialog.rewardXP && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Zap size={14} color="#F59E0B" />
                          <Text style={[styles.systemRewardVal, { color: '#F59E0B' }]}>+{systemDialog.rewardXP} XP</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.systemConfirmBtn}
                onPress={() => {
                  haptics.medium();
                  if (systemDialog.onPress) {
                    systemDialog.onPress();
                  }
                  setSystemDialog((prev) => ({ ...prev, visible: false }));
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.systemConfirmBtnText}>{systemDialog.buttonText}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

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
  container: { flex: 1 },

  // Top Header
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
    gap: 10,
    flex: 1,
  },
  hunterNameText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hunterRankPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  hunterRankPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.4,
  },
  hunterTitleSub: {
    fontSize: 10,
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
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  crystalCountText: {
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  headerRedeemBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  headerRedeemBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Segment Tabs
  tabSegmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#0284C7',
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.4,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },

  // Gate Card
  gateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  gateCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  missionCountCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  missionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  gateTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  threatSubText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gateLoreText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  gateCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  yieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  yieldAmountText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#00D2EE',
  },
  openGateActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  openGateActionText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // Podium
  podiumContainer: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  podiumHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  podiumHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  podiumHeaderSub: {
    fontSize: 10.5,
    textAlign: 'center',
  },
  topThreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 10,
    width: '100%',
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  podiumSlotFirst: {
    transform: [{ translateY: -8 }],
  },
  podiumBadgeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -4,
  },
  podiumRankNum: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  podiumHunterName: {
    fontSize: 11.5,
    fontWeight: '700',
    maxWidth: 90,
  },
  podiumCrystalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 210, 238, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 238, 0.3)',
  },
  podiumCrystalText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00D2EE',
  },

  // Leaderboard List
  lbRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  lbRankIndex: {
    fontSize: 12,
    fontWeight: '900',
    width: 24,
  },
  lbHunterName: {
    fontSize: 13,
    fontWeight: '800',
  },
  lbRankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lbRankBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#0284C7',
  },
  lbTitleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  lbCrystalsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lbCrystalsAmount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00D2EE',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
  },

  // Solo Leveling System Dialog
  systemDialogSafe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  systemDialogCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    gap: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  systemDialogHeader: {
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(2, 132, 199, 0.2)',
    paddingBottom: 8,
  },
  systemTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  systemTagBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.8,
  },
  systemSubtagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  systemDialogTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  systemDialogMsg: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  systemRewardBox: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginTop: 4,
  },
  systemRewardBoxLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.6,
  },
  systemRewardVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00D2EE',
  },
  systemConfirmBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  systemConfirmBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },

  emptyLeaderboardCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 20,
  },
  emptyLeaderboardTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyLeaderboardSub: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyGoGatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyGoGatesBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  // Emergency Red Gate Alert Banner
  redGateHeroBanner: {
    backgroundColor: '#160B0E',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF1E44',
    padding: 16,
    gap: 12,
    shadowColor: '#FF1E44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
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
    backgroundColor: 'rgba(255, 30, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 30, 68, 0.4)',
  },
  redGateAlertPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF1E44',
    letterSpacing: 0.6,
  },
  redGateBountyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 210, 238, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 238, 0.3)',
  },
  redGateBountyPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.4,
  },
  redGateHeroTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  redGateHeroSub: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#F87171',
    lineHeight: 16,
  },
  redGateHeroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF1E44',
    borderRadius: 10,
    paddingVertical: 10,
  },
  redGateHeroActionText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },

  // Hunter Radar Card
  radarHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
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
    backgroundColor: '#0284C7',
  },
  radarLiveText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.6,
  },
  radarHeroTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  radarHeroSub: {
    fontSize: 10,
    lineHeight: 14,
  },
  radarPulseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  radarPulseBtnActive: {
    opacity: 0.6,
  },
  radarPulseBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  // Cleared Pill & Countdown Pill
  clearedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  clearedPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.4,
  },
  countdownCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#07090F',
  },
  countdownText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#00D2EE',
    fontVariant: ['tabular-nums'],
  },

  // Bounty Allocation Pill Row
  bountyPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#06080E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#151824',
  },
  bountyGrossTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bountyGrossLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.4,
  },
  bountyGrossVal: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#F59E0B',
  },
  missionProgressTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  missionProgressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },

  // CPX Direct Offerwall Hero Card
  cpxDirectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  cpxDirectLeft: {
    flex: 1,
    gap: 2,
  },
  cpxDirectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cpxDirectBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.5,
  },
  cpxDirectTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  cpxDirectSub: {
    fontSize: 9.5,
    lineHeight: 13.5,
  },
  cpxDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  cpxDirectBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
});
