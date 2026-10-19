import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Swords,
  Clock,
  Check,
  ArrowRight,
  Zap,
  X,
  AlertTriangle,
  Lock,
  Award,
} from 'lucide-react-native';
import { gateSpawnService, SpawnedDungeonGate, SurveyTask } from '../../src/services/gateSpawnService';
import { InAppSurveyModal } from '../../src/components/surveys/InAppSurveyModal';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { ManaCrystalIcon } from '../../src/components/ui/ManaCrystalIcon';
import { fontFamilies } from '../../src/theme/typography';
import { APP_3D_ASSETS } from '../../src/constants/assets';

const DUNGEON_IMAGES: Record<string, any> = {
  E: require('../../assets/dungeons/dungeon_e_goblin.jpg'),
  D: require('../../assets/dungeons/dungeon_d_orc.jpg'),
  C: require('../../assets/dungeons/dungeon_c_frost.jpg'),
  B: require('../../assets/dungeons/dungeon_b_crimson.jpg'),
  A: require('../../assets/dungeons/dungeon_a_shadow.jpg'),
  S: require('../../assets/dungeons/dungeon_s_dragon.jpg'),
};

const getRankPillStyle = (rankCode: string, isDark: boolean) => {
  switch (rankCode) {
    case 'E':
      return {
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#E6FBF5',
        border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
        text: '#10B981',
      };
    case 'D':
      return {
        bg: isDark ? 'rgba(10, 132, 255, 0.15)' : '#EFF6FF',
        border: isDark ? 'rgba(10, 132, 255, 0.3)' : '#BFDBFE',
        text: '#0A84FF',
      };
    case 'C':
      return {
        bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
        border: isDark ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE',
        text: '#8B5CF6',
      };
    case 'B':
      return {
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
        border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
        text: '#D97706',
      };
    case 'A':
      return {
        bg: isDark ? 'rgba(225, 29, 72, 0.15)' : '#FFF1F2',
        border: isDark ? 'rgba(225, 29, 72, 0.3)' : '#FECDD3',
        text: '#E11D48',
      };
    case 'S':
      return {
        bg: isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF',
        border: isDark ? 'rgba(168, 85, 247, 0.3)' : '#E9D5FF',
        text: '#A855F7',
      };
    default:
      return {
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#E6FBF5',
        border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
        text: '#10B981',
      };
  }
};

export default function GateDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const targetId = id ? (Array.isArray(id) ? id[0] : id) : '';
  const initialGate = gateSpawnService.getGateByIdSync(targetId);

  const [gate, setGate] = useState<SpawnedDungeonGate | null>(initialGate);
  const [loadingGate, setLoadingGate] = useState<boolean>(!initialGate);

  const [activeMission, setActiveMission] = useState<SurveyTask | null>(null);
  const [currentQIdx, setCurrentQIdx] = useState<number>(0);
  const [selectedOptIdx, setSelectedOptIdx] = useState<number | null>(null);
  // H34: the answers given so far, one per question. Previously the
  // selection was discarded on Next, so completion required no proof
  // that every question was answered.
  const [answers, setAnswers] = useState<number[]>([]);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState('3h 12m');

  // Solo Leveling Inquest Victory Dialog
  const [clearedModalVisible, setClearedModalVisible] = useState<boolean>(false);
  const [clearedReward, setClearedReward] = useState<{ crystals: number; xp: number; coins: number; title: string }>({
    crystals: 0,
    xp: 0,
    coins: 0,
    title: '',
  });

  // In-App Survey WebView Modal State
  const [inAppSurvey, setInAppSurvey] = useState<{
    visible: boolean;
    url: string | null;
    title: string;
    provider: string;
    missionId?: string;
  }>({
    visible: false,
    url: null,
    title: '',
    provider: '',
  });

  // Notice Dialog for Aborted or Incomplete Survey
  const [inquestNotice, setInquestNotice] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });
  const mountedRef = useRef(true);
  const completingMissionRef = useRef(false);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchGate = useCallback(async () => {
    try {
      const tId = id ? (Array.isArray(id) ? id[0] : id) : '';
      const found = await gateSpawnService.getGateById(tId);
      if (!mountedRef.current) return;
      if (found) {
        setGate(found);
      } else {
        // H32: keep the "Gate Not Found" state. Previously this fell
        // back to allGates[0], showing the wrong gate for a bogus id.
        setGate(null);
      }
    } catch (e) {
      console.warn('Error fetching gate:', e);
    } finally {
      if (mountedRef.current) setLoadingGate(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile().catch(() => {});
    fetchGate();
  }, [id, fetchGate]);

  useEffect(() => {
    if (!gate?.expiresAt) return;
    const updateTime = () => {
      const now = Date.now();
      const diffMs = gate.expiresAt - now;
      if (diffMs <= 0) {
        setTimeLeft('0m');
        return;
      }
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [gate?.expiresAt]);

  if (loadingGate && !gate) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}
        edges={['top', 'bottom']}
      >
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 14, fontFamily: fontFamilies.medium }}>
          ENTERING DUNGEON GATE...
        </Text>
      </SafeAreaView>
    );
  }

  if (!gate) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>GATE PROTOCOL</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyWrap}>
          <AlertTriangle size={40} color="#E11D48" />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>DIMENSIONAL GATE NOT FOUND</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            This gate anomaly has either collapsed, its timer expired, or the rift coordinate address has shifted.
          </Text>
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.returnBtnText}>RETURN TO DUNGEON RADAR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userLevel = profile?.level || 1;
  const isLocked = userLevel < gate.requiredLevel;

  const totalTierInr = gate.missions.reduce((acc, m) => acc + (m.displayTierInr || 0), 0);
  const totalXP = gate.missions.reduce((acc, m) => acc + m.xpReward, 0);
  const completedMissionsCount = gate.missions.filter((m) => m.isCompleted).length;

  const rankStyle = getRankPillStyle(gate.rankCode, isDark);

  const handleStartMission = (mission: SurveyTask) => {
    if (isLocked) {
      haptics.warning();
      return;
    }

    if (mission.isCompleted) {
      haptics.warning();
      return;
    }

    if (mission.surveyUrl) {
      handleOpenExternalSurvey(mission);
      return;
    }

    haptics.medium();
    sound.play('unlock');
    setCurrentQIdx(0);
    setSelectedOptIdx(null);
    setAnswers([]);
    setActiveMission(mission);
  };

  const handleSelectOption = (idx: number) => {
    haptics.light();
    setSelectedOptIdx(idx);
  };

  const handleOpenExternalSurvey = (mission: SurveyTask) => {
    if (!mission.surveyUrl) return;
    haptics.medium();
    sound.play('unlock');
    setInAppSurvey({
      visible: true,
      url: mission.surveyUrl,
      title: mission.title,
      provider: mission.provider,
      missionId: mission.id,
    });
  };

  const handleNextOrFinishQuestion = async () => {
    if (selectedOptIdx === null || !activeMission || !gate) {
      haptics.warning();
      return;
    }

    if (currentQIdx < activeMission.questions.length - 1) {
      haptics.medium();
      // Record this question's answer before advancing (H34).
      setAnswers((prev) => [...prev, selectedOptIdx]);
      setCurrentQIdx((prev) => prev + 1);
      setSelectedOptIdx(null);
    } else {
      if (completingMissionRef.current) return;
      completingMissionRef.current = true;
      setIsExtracting(true);
      haptics.heavy();
      sound.play('level_up');

      try {
        // Local questions are unmonetized practice: awards 0 Mana Crystals + in-game Coins & XP
        // H34: pass every answer — the service verifies all questions
        // were answered before granting.
        const allAnswers = [...answers, selectedOptIdx];
        const result = await gateSpawnService.completeMission(gate.id, activeMission.id, {
          answers: allAnswers,
        });
        await loadProfile();

        const updated = await gateSpawnService.getGateById(gate.id);
        if (updated && mountedRef.current) {
          setGate(updated);
        }

        if (!mountedRef.current) return;
        setIsExtracting(false);
        setActiveMission(null);

        setClearedReward({
          crystals: result.crystalsAwarded,
          xp: result.xpAwarded,
          coins: result.coinsAwarded,
          title: activeMission.title,
        });
        setClearedModalVisible(true);
        sound.play('purchase');
        haptics.success();
      } catch {
        if (mountedRef.current) {
          setIsExtracting(false);
          haptics.warning();
        }
      } finally {
        completingMissionRef.current = false;
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* 1. TOP NAVIGATION BAR */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTag}>DIMENSIONAL RAID PROTOCOL</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {gate.title}
          </Text>
        </View>

        <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg, borderColor: rankStyle.border }]}>
          <Text style={[styles.rankBadgeText, { color: rankStyle.text }]}>{gate.rankCode}-RANK</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. BOSS HERO BANNER CARD (1:1 with Screenshot) */}
        <View style={styles.heroBannerContainer}>
          <Image
            source={DUNGEON_IMAGES[gate.rankCode] || DUNGEON_IMAGES.E}
            style={styles.heroBannerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.25)', 'rgba(0, 0, 0, 0.65)', 'rgba(10, 15, 25, 0.94)']}
            style={styles.heroBannerGradient}
          >
            {/* Top Anomaly Tag */}
            <View style={styles.heroAnomalyTag}>
              <Clock size={11.5} color="#FFFFFF" />
              <Text style={styles.heroAnomalyTagText}>
                {gate.rankCode}-RANK GATE / SECTOR ANOMALY
              </Text>
            </View>

            {/* Bottom Boss Info */}
            <View style={styles.heroBottomInfo}>
              <Text style={styles.heroBossTitle}>
                BOSS: {gate.threatName.toUpperCase()}
              </Text>
              <Text style={styles.heroLoreText} numberOfLines={2}>
                {gate.lore}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* 3. GATE YIELD SUMMARY CARD (3 Columns: Bounty Pool, Hunter Share 20%, System XP) */}
        <View style={[styles.bountyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Column 1: Gross Bounty Pool */}
          <View style={styles.bountyCol}>
            <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 24, height: 24 }} />
            <View style={styles.bountyTextCol}>
              <Text style={[styles.bountyLabel, { color: colors.textSecondary }]}>TIER POOL</Text>
              <Text style={[styles.bountyValINR, { color: '#F59E0B' }]}>₹{totalTierInr} INR</Text>
            </View>
          </View>

          <View style={[styles.bountyDivider, { backgroundColor: isDark ? '#1C1E2A' : '#F1F5F9' }]} />

          {/* Column 2: Server Verified */}
          <View style={styles.bountyCol}>
            <Image source={APP_3D_ASSETS.manaCrystal} style={{ width: 22, height: 22 }} />
            <View style={styles.bountyTextCol}>
              <Text style={[styles.bountyLabel, { color: colors.textSecondary }]}>REWARD STATUS</Text>
              <Text style={[styles.bountyValCrystals, { color: '#0A84FF', fontSize: 13 }]}>Verified</Text>
            </View>
          </View>

          <View style={[styles.bountyDivider, { backgroundColor: isDark ? '#1C1E2A' : '#F1F5F9' }]} />

          {/* Column 3: System XP */}
          <View style={styles.bountyCol}>
            <Zap size={20} color="#EF4444" fill="#EF4444" />
            <View style={styles.bountyTextCol}>
              <Text style={[styles.bountyLabel, { color: colors.textSecondary }]}>SYSTEM XP</Text>
              <Text style={[styles.bountyValXP, { color: '#EF4444' }]}>+{totalXP.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* 4. SECTION HEADER (SURVEY RECON DIRECTIVES) */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Swords size={18} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              SURVEY RECON DIRECTIVES ({completedMissionsCount}/{gate.missions.length})
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color="#8E8E93" />
            <Text style={styles.resetTimeText}>Resets in {timeLeft}</Text>
          </View>
        </View>

        {/* 5. MISSION DIRECTIVES LIST */}
        <View style={styles.missionList}>
          {gate.missions.map((mission, idx) => {
            const isConquered = !!mission.isCompleted;

            return (
              <View
                key={mission.id}
                style={[
                  styles.missionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                  isConquered && { opacity: 0.75 },
                ]}
              >
                {/* Mission Header */}
                <View style={styles.missionTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.missionIndexPill, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FFF1F2' }]}>
                      <Text style={styles.missionIndexPillText}>MISSION {idx + 1}</Text>
                    </View>
                    <View style={[styles.providerPill, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }]}>
                      <Text style={styles.providerPillText}>{mission.provider}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} color="#8E8E93" />
                    <Text style={styles.missionDurationText}>~ {mission.durationLabel || '3 Mins'}</Text>
                  </View>
                </View>

                {/* Mission Title & Topic */}
                <Text style={[styles.missionTitle, { color: colors.textPrimary }]}>
                  {mission.title}
                </Text>
                <Text style={[styles.missionTopic, { color: colors.textSecondary }]}>
                  Topic: {mission.topic}
                </Text>

                {/* Mission Action Footer */}
                <View style={styles.missionActionRow}>
                  {/* Left: Rewards Badges */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.rewardBadgePill, { backgroundColor: isDark ? '#141E2D' : '#EFF6FF' }]}>
                      <ManaCrystalIcon size={13} color="#0284C7" secondaryColor="#0284C7" />
                      <Text style={styles.crystalRewardText}>₹{mission.displayTierInr || 0} Tier</Text>
                    </View>
                    <View style={[styles.rewardBadgePill, { backgroundColor: isDark ? '#261218' : '#FFF1F2' }]}>
                      <Zap size={13} color="#EF4444" fill="#EF4444" />
                      <Text style={styles.xpRewardText}>+{mission.xpReward} XP</Text>
                    </View>
                  </View>

                  {/* Right: CTA Button */}
                  {isConquered ? (
                    <View style={[styles.conqueredPill, { backgroundColor: isDark ? '#06281A' : '#ECFDF5', borderColor: isDark ? '#0D4A32' : '#A7F3D0' }]}>
                      <Check size={12} color="#10B981" />
                      <Text style={styles.conqueredPillText}>CLEARED</Text>
                    </View>
                  ) : isLocked ? (
                    <View style={[styles.lockedPill, { backgroundColor: isDark ? '#1E202C' : '#F3F4F6' }]}>
                      <Lock size={12} color="#8E8E93" />
                      <Text style={styles.lockedPillText}>LOCKED</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.startInquestBtn}
                      onPress={() => handleStartMission(mission)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.startInquestBtnText}>Start Inquest</Text>
                      <ArrowRight size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 6. INTERACTIVE IN-APP QUESTION MODAL */}
      <Modal visible={activeMission !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafe}>
            {activeMission && (
              <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: isDark ? '#E11D48' : '#E5E7EB' }]}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.modalStepTag}>
                      [ RECON INQUEST // QUESTION {currentQIdx + 1} OF {activeMission.questions.length} ]
                    </Text>
                    <Text style={[styles.modalMissionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {activeMission.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: isDark ? '#161926' : '#F1F5F9' }]}
                    onPress={() => {
                      haptics.light();
                      setActiveMission(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Question Box */}
                <View style={[styles.questionBox, { backgroundColor: isDark ? '#111218' : '#F8F9FA', borderColor: colors.border }]}>
                  <Text style={[styles.questionText, { color: colors.textPrimary }]}>
                    {activeMission.questions[currentQIdx]?.question}
                  </Text>
                </View>

                {/* Options List */}
                <View style={styles.optionsList}>
                  {activeMission.questions[currentQIdx]?.options.map((option, optIdx) => {
                    const isSelected = selectedOptIdx === optIdx;

                    return (
                      <TouchableOpacity
                        key={optIdx}
                        style={[
                          styles.optionCard,
                          { backgroundColor: isDark ? '#111218' : '#F8F9FA', borderColor: colors.border },
                          isSelected && (isDark ? styles.optionCardSelectedDark : styles.optionCardSelectedLight),
                        ]}
                        onPress={() => handleSelectOption(optIdx)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.radioDot, isSelected && styles.radioDotSelected]}>
                          {isSelected && <View style={styles.radioDotInner} />}
                        </View>
                        <Text style={[styles.optionText, { color: colors.textPrimary }, isSelected && styles.optionTextSelected]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Confirm Action Button */}
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    selectedOptIdx === null && styles.confirmBtnDisabled,
                  ]}
                  onPress={handleNextOrFinishQuestion}
                  disabled={selectedOptIdx === null || isExtracting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmBtnText}>
                    {isExtracting
                      ? 'EXTRACTING MANA CRYSTALS...'
                      : currentQIdx < activeMission.questions.length - 1
                      ? 'CONFIRM & NEXT QUESTION'
                      : 'EXTRACT MANA CRYSTALS'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* 7. VICTORY REWARDS MODAL */}
      <Modal visible={clearedModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={[styles.victoryCard, { backgroundColor: colors.card, borderColor: '#00D2EE' }]}>
              <View style={styles.victoryTagRow}>
                <Award size={14} color="#00D2EE" />
                <Text style={styles.victoryTagText}>[ SYSTEM NOTIFICATION // RECON INQUEST CLEARED ]</Text>
              </View>

              <Text style={[styles.victoryTitle, { color: colors.textPrimary }]}>
                {clearedReward.crystals > 0 ? 'MANA CRYSTALS EXTRACTED!' : 'INQUEST DIRECTIVE CLEARED!'}
              </Text>
              <Text style={[styles.victorySub, { color: colors.textSecondary }]}>
                {clearedReward.crystals > 0
                  ? 'Intel reconnaissance successfully confirmed by survey partner. Market bounty unlocked and credited to your hunter profile.'
                  : 'Reconnaissance training directives mastered. System XP and Gold Coins credited to your profile.'}
              </Text>

              {/* Rewards Acquired */}
              <View style={[styles.victoryRewardBox, { backgroundColor: isDark ? '#0B1120' : '#EFF6FF', borderColor: clearedReward.crystals > 0 ? '#0284C7' : '#F59E0B' }]}>
                <Text style={styles.victoryRewardBoxLabel}>EXTRACTION REWARDS:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  {clearedReward.crystals > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ManaCrystalIcon size={18} color="#00D2EE" secondaryColor="#0284C7" />
                      <Text style={styles.victoryRewardVal}>+{clearedReward.crystals.toLocaleString()} Crystals</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Image source={APP_3D_ASSETS.goldCoin} style={{ width: 18, height: 18 }} />
                      <Text style={[styles.victoryRewardVal, { color: '#F59E0B' }]}>+{clearedReward.coins.toLocaleString()} Coins</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Zap size={16} color="#E11D48" />
                    <Text style={[styles.victoryRewardVal, { color: '#E11D48' }]}>+{clearedReward.xp} XP</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.victoryConfirmBtn}
                onPress={() => {
                  haptics.medium();
                  setClearedModalVisible(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.victoryConfirmBtnText}>CONTINUE DUNGEON RAID</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* 8. IN-APP SURVEY WEBVIEW MODAL */}
      <InAppSurveyModal
        visible={inAppSurvey.visible}
        url={inAppSurvey.url}
        title={inAppSurvey.title}
        provider={inAppSurvey.provider}
        onClose={async (result: { verified: boolean; transId?: string }) => {
          const finishedMissionId = inAppSurvey.missionId;
          setInAppSurvey((prev) => ({ ...prev, visible: false, missionId: undefined }));

          if (!result?.verified || !result?.transId) {
            haptics.warning();
            setInquestNotice({
              visible: true,
              title: 'INQUEST ABORTED',
              message: 'You exited the survey portal before completing the questions or server verification was not received. No Mana Crystals were extracted.',
            });
            await loadProfile();
            if (mountedRef.current) await fetchGate();
            return;
          }

          if (finishedMissionId && gate && !completingMissionRef.current) {
            completingMissionRef.current = true;
            const m = gate.missions.find((item) => item.id === finishedMissionId);
            if (m && !m.isCompleted) {
              try {
                // Verified external survey from partner: claim through server
                const res = await gateSpawnService.completeMission(gate.id, finishedMissionId, {
                  transId: result.transId,
                  provider: 'cpx',
                });
                await loadProfile();
                const updated = await gateSpawnService.getGateById(gate.id);
                if (updated && mountedRef.current) setGate(updated);

                if (!mountedRef.current) return;
                setClearedReward({
                  crystals: res.crystalsAwarded,
                  xp: res.xpAwarded,
                  coins: res.coinsAwarded,
                  title: m.title,
                });
                setClearedModalVisible(true);
                sound.play('purchase');
                haptics.success();
              } catch (e) {
                console.warn('Error completing inquest:', e);
              } finally {
                completingMissionRef.current = false;
              }
            } else {
              completingMissionRef.current = false;
            }
          }

          await loadProfile();
          if (mountedRef.current) await fetchGate();
        }}
      />

      {/* 9. INQUEST NOTICE MODAL */}
      <Modal visible={inquestNotice.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={[styles.victoryCard, { backgroundColor: colors.card, borderColor: '#EF4444' }]}>
              <View style={styles.victoryTagRow}>
                <AlertTriangle size={16} color="#EF4444" />
                <Text style={[styles.victoryTagText, { color: '#EF4444' }]}>[ SYSTEM NOTICE // {inquestNotice.title} ]</Text>
              </View>

              <Text style={[styles.victorySub, { color: colors.textSecondary }]}>{inquestNotice.message}</Text>

              <TouchableOpacity
                style={[styles.victoryConfirmBtn, { backgroundColor: '#1E293B' }]}
                onPress={() => setInquestNotice((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.85}
              >
                <Text style={styles.victoryConfirmBtnText}>ACKNOWLEDGE</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 2,
  },
  headerTag: {
    fontFamily: fontFamilies.medium,
    fontSize: 9.5,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  rankBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 14,
  },

  // 1. Hero Banner Container
  heroBannerContainer: {
    width: '100%',
    height: 195,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroBannerGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  heroAnomalyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  heroAnomalyTagText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  heroBottomInfo: {
    gap: 4,
  },
  heroBossTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  heroLoreText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 16,
  },

  // 2. Bounty / Yield Summary Card
  bountyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bountyCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bountyTextCol: {
    gap: 2,
  },
  bountyLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 8.5,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  bountyValINR: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  bountyValCrystals: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  bountyValXP: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  bountyDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 4,
  },

  // 3. Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  resetTimeText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E93',
  },

  // 4. Mission Directives List
  missionList: {
    gap: 12,
  },
  missionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  missionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missionIndexPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 100,
  },
  missionIndexPillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: 0.2,
  },
  providerPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 100,
  },
  providerPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: '500',
    color: '#2563EB',
  },
  missionDurationText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E93',
  },
  missionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  missionTopic: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
  },
  missionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rewardBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  crystalRewardText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0A84FF',
  },
  xpRewardText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#EF4444',
  },
  startInquestBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8.5,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  startInquestBtnText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  conqueredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  conqueredPillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  lockedPillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
  },

  // Empty State
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
  },
  returnBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    marginTop: 8,
  },
  returnBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // In-App Question Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalSafe: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalStepTag: {
    fontFamily: fontFamilies.medium,
    fontSize: 9.5,
    fontWeight: '500',
    color: '#EF4444',
    letterSpacing: 0.4,
  },
  modalMissionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  questionText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 20,
  },
  optionsList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionCardSelectedDark: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  optionCardSelectedLight: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF1F2',
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#8E8E93',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotSelected: {
    borderColor: '#EF4444',
  },
  radioDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  optionText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400',
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: '#EF4444',
  },
  confirmBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  confirmBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // Victory Card Modal
  victoryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  victoryTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  victoryTagText: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    fontWeight: '500',
    color: '#00D2EE',
    letterSpacing: 0.5,
  },
  victoryTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  victorySub: {
    fontFamily: fontFamilies.regular,
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: '400',
  },
  victoryRewardBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  victoryRewardBoxLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    fontWeight: '500',
    color: '#0284C7',
    letterSpacing: 0.4,
  },
  victoryRewardVal: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#00D2EE',
  },
  victoryConfirmBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  victoryConfirmBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
