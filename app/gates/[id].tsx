import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Swords,
  Shield,
  Clock,
  Check,
  ArrowRight,
  Zap,
  X,
  AlertTriangle,
  Lock,
  ExternalLink,
  CheckCircle2,
  Award,
} from 'lucide-react-native';
import { gateSpawnService, SpawnedDungeonGate, SurveyTask } from '../../src/services/gateSpawnService';
import { InAppSurveyModal } from '../../src/components/surveys/InAppSurveyModal';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { ManaCrystalIcon } from '../../src/components/ui/ManaCrystalIcon';

export default function GateDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [gate, setGate] = useState<SpawnedDungeonGate | null>(null);
  const [loadingGate, setLoadingGate] = useState<boolean>(true);

  const [activeMission, setActiveMission] = useState<SurveyTask | null>(null);
  const [currentQIdx, setCurrentQIdx] = useState<number>(0);
  const [selectedOptIdx, setSelectedOptIdx] = useState<number | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // Solo Leveling Inquest Victory Dialog
  const [clearedModalVisible, setClearedModalVisible] = useState<boolean>(false);
  const [clearedReward, setClearedReward] = useState<{ crystals: number; xp: number; title: string }>({
    crystals: 0,
    xp: 0,
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

  const fetchGate = useCallback(async () => {
    if (!id) return;
    const found = await gateSpawnService.getGateById(id);
    setGate(found);
    setLoadingGate(false);
  }, [id]);

  useEffect(() => {
    loadProfile();
    fetchGate();
  }, [loadProfile, fetchGate]);

  if (loadingGate) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>SCANNING DIMENSIONAL RIFT COORDINATES...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!gate) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GATE PROTOCOL</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyWrap}>
          <AlertTriangle size={40} color="#E11D48" />
          <Text style={styles.emptyTitle}>DIMENSIONAL GATE NOT FOUND</Text>
          <Text style={styles.emptySub}>
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

  const totalGrossPayout = gate.missions.reduce((acc, m) => acc + m.grossPayoutInr, 0);
  const totalCrystals = gate.missions.reduce((acc, m) => acc + m.hunterCrystals, 0);
  const totalXP = gate.missions.reduce((acc, m) => acc + m.xpReward, 0);
  const completedMissionsCount = gate.missions.filter((m) => m.isCompleted).length;
  const allMissionsConquered = completedMissionsCount === gate.missions.length;

  const handleStartMission = (mission: SurveyTask) => {
    if (isLocked) {
      haptics.warning();
      return;
    }

    if (mission.isCompleted) {
      haptics.warning();
      return;
    }

    handleOpenExternalSurvey(mission);
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
      setCurrentQIdx((prev) => prev + 1);
      setSelectedOptIdx(null);
    } else {
      setIsExtracting(true);
      haptics.heavy();
      sound.play('level_up');

      try {
        const result = await gateSpawnService.completeMission(gate.id, activeMission.id);
        await loadProfile();

        const updated = await gateSpawnService.getGateById(gate.id);
        if (updated) {
          setGate(updated);
        }

        setIsExtracting(false);
        setActiveMission(null);

        setClearedReward({
          crystals: result.crystalsAwarded,
          xp: result.xpAwarded,
          title: activeMission.title,
        });
        setClearedModalVisible(true);
        sound.play('purchase');
        haptics.success();
      } catch {
        setIsExtracting(false);
        haptics.warning();
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTag}>DIMENSIONAL RAID PROTOCOL</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{gate.title.toUpperCase()}</Text>
        </View>

        <View style={[styles.rankBadge, { borderColor: gate.borderColor, backgroundColor: gate.badgeColor }]}>
          <Text style={styles.rankBadgeText}>{gate.rankCode}-RANK</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gate Threat Overview Card */}
        <View style={[styles.card, { borderColor: gate.borderColor }]}>
          <View style={styles.threatHeader}>
            <View style={styles.threatPill}>
              <Shield size={12} color={gate.badgeColor} />
              <Text style={[styles.threatPillText, { color: gate.badgeColor }]}>
                {gate.rankCode}-RANK GATE // SECTOR ANOMALY
              </Text>
            </View>

            {isLocked ? (
              <View style={styles.lockedPill}>
                <Lock size={12} color="#EF4444" />
                <Text style={styles.lockedPillText}>REQ. LVL {gate.requiredLevel}</Text>
              </View>
            ) : allMissionsConquered ? (
              <View style={styles.conqueredPill}>
                <CheckCircle2 size={12} color="#10B981" />
                <Text style={styles.conqueredPillText}>GATE CLEARED</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.threatName}>BOSS: {gate.threatName.toUpperCase()}</Text>
          <Text style={styles.loreText}>{gate.lore}</Text>

          {/* Gate Yield Summary (80/20 Profit Model Display) */}
          <View style={styles.bountyRow}>
            {/* Gross Bounty Pool */}
            <View style={styles.bountyItem}>
              <Text style={styles.bountyItemLabel}>BOUNTY POOL</Text>
              <View style={styles.bountyValRow}>
                <Text style={[styles.bountyValText, { color: '#F59E0B' }]}>₹{totalGrossPayout} INR</Text>
              </View>
            </View>

            <View style={styles.bountyItemDivider} />

            {/* Hunter Mana Crystals (20% share) */}
            <View style={styles.bountyItem}>
              <Text style={styles.bountyItemLabel}>HUNTER SHARE (20%)</Text>
              <View style={styles.bountyValRow}>
                <ManaCrystalIcon size={16} color="#00D2EE" secondaryColor="#0284C7" />
                <Text style={styles.bountyValText}>+{totalCrystals.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.bountyItemDivider} />

            {/* System XP */}
            <View style={styles.bountyItem}>
              <Text style={styles.bountyItemLabel}>SYSTEM XP</Text>
              <View style={styles.bountyValRow}>
                <Zap size={15} color="#E11D48" />
                <Text style={[styles.bountyValText, { color: '#E11D48' }]}>+{totalXP.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Missions Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Swords size={16} color="#E11D48" />
          <Text style={styles.sectionTitle}>
            SURVEY RECON DIRECTIVES ({completedMissionsCount}/{gate.missions.length})
          </Text>
        </View>

        {/* Mission Directives List */}
        <View style={styles.missionList}>
          {gate.missions.map((mission, idx) => {
            const isConquered = !!mission.isCompleted;

            return (
              <View
                key={mission.id}
                style={[
                  styles.missionCard,
                  isConquered && { borderColor: '#10B981' },
                ]}
              >
                {/* Mission Header */}
                <View style={styles.missionCardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.missionIndexBadge}>
                      <Text style={styles.missionIndexText}>MISSION {idx + 1}</Text>
                    </View>
                    <View style={styles.providerBadge}>
                      <Text style={styles.providerBadgeText}>{mission.provider}</Text>
                    </View>
                  </View>

                  <View style={styles.missionDurationBadge}>
                    <Clock size={11} color="#8E8E93" />
                    <Text style={styles.missionDurationText}>{mission.durationLabel}</Text>
                  </View>
                </View>

                <Text style={styles.missionTitle}>{mission.title}</Text>
                <Text style={styles.missionTopic}>Topic: {mission.topic}</Text>

                {/* Mission Footer */}
                <View style={styles.missionFooter}>
                  <View style={styles.missionRewards}>
                    <View style={styles.rewardPill}>
                      <Text style={styles.bountyCutLabel}>Bounty: ₹{mission.grossPayoutInr}</Text>
                    </View>
                    <View style={styles.rewardPill}>
                      <ManaCrystalIcon size={13} color="#00D2EE" secondaryColor="#0284C7" />
                      <Text style={styles.rewardPillText}>+{mission.hunterCrystals}</Text>
                    </View>
                    <View style={styles.rewardPill}>
                      <Zap size={13} color="#E11D48" />
                      <Text style={[styles.rewardPillText, { color: '#E11D48' }]}>+{mission.xpReward} XP</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.raidBtn,
                      isConquered && styles.raidBtnCleared,
                      isLocked && styles.raidBtnLocked,
                    ]}
                    onPress={() => handleStartMission(mission)}
                    disabled={isConquered || isLocked}
                    activeOpacity={0.85}
                  >
                    {isConquered ? (
                      <>
                        <Check size={14} color="#10B981" />
                        <Text style={[styles.raidBtnText, { color: '#10B981' }]}>CLEARED</Text>
                      </>
                    ) : isLocked ? (
                      <>
                        <Lock size={14} color="#8E8E93" />
                        <Text style={[styles.raidBtnText, { color: '#8E8E93' }]}>LOCKED</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.raidBtnText}>START INQUEST</Text>
                        <ArrowRight size={14} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>



      {/* Solo Leveling Extraction Victory Modal */}
      <Modal visible={clearedModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.victoryCard}>
              <View style={styles.victoryTagRow}>
                <Award size={14} color="#00D2EE" />
                <Text style={styles.victoryTagText}>[ SYSTEM NOTIFICATION // RECON INQUEST CLEARED ]</Text>
              </View>

              <Text style={styles.victoryTitle}>MANA CRYSTALS EXTRACTED!</Text>
              <Text style={styles.victorySub}>
                Intel reconnaissance successfully submitted. Market bounty unlocked and credited to your hunter profile.
              </Text>

              {/* Rewards Acquired */}
              <View style={styles.victoryRewardBox}>
                <Text style={styles.victoryRewardBoxLabel}>EXTRACTION REWARDS:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ManaCrystalIcon size={18} color="#00D2EE" secondaryColor="#0284C7" />
                    <Text style={styles.victoryRewardVal}>+{clearedReward.crystals.toLocaleString()} Crystals</Text>
                  </View>
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

      {/* Real In-App Survey WebView Modal */}
      <InAppSurveyModal
        visible={inAppSurvey.visible}
        url={inAppSurvey.url}
        title={inAppSurvey.title}
        provider={inAppSurvey.provider}
        onClose={async (completed: boolean) => {
          const finishedMissionId = inAppSurvey.missionId;
          setInAppSurvey((prev) => ({ ...prev, visible: false, missionId: undefined }));

          if (!completed) {
            haptics.warning();
            setInquestNotice({
              visible: true,
              title: 'INQUEST ABORTED',
              message: 'You exited the survey portal before completing the questions. No Mana Crystals were extracted.',
            });
            await loadProfile();
            await fetchGate();
            return;
          }

          if (finishedMissionId && gate) {
            const m = gate.missions.find((item) => item.id === finishedMissionId);
            if (m && !m.isCompleted) {
              try {
                const result = await gateSpawnService.completeMission(gate.id, finishedMissionId);
                await loadProfile();
                const updated = await gateSpawnService.getGateById(gate.id);
                if (updated) setGate(updated);

                setClearedReward({
                  crystals: result.crystalsAwarded,
                  xp: result.xpAwarded,
                  title: m.title,
                });
                setClearedModalVisible(true);
                sound.play('purchase');
                haptics.success();
              } catch (e) {
                console.warn('Error completing inquest:', e);
              }
            }
          }

          await loadProfile();
          await fetchGate();
        }}
      />

      {/* Inquest Aborted/Incomplete Notice Modal */}
      <Modal visible={inquestNotice.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={[styles.victoryCard, { borderColor: '#EF4444' }]}>
              <View style={styles.victoryTagRow}>
                <AlertTriangle size={16} color="#EF4444" />
                <Text style={[styles.victoryTagText, { color: '#EF4444' }]}>[ SYSTEM NOTICE // {inquestNotice.title} ]</Text>
              </View>

              <Text style={styles.victorySub}>{inquestNotice.message}</Text>

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
    backgroundColor: '#000000',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1C26',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#222430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#111218',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  threatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  threatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  threatPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lockedPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  conqueredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  conqueredPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  threatName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  loreText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
  },
  bountyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0D14',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    padding: 12,
  },
  bountyItem: {
    flex: 1,
    gap: 4,
  },
  bountyItemDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#222430',
    marginHorizontal: 8,
  },
  bountyItemLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.4,
  },
  bountyValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bountyValText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00D2EE',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  missionList: {
    gap: 10,
  },
  missionCard: {
    backgroundColor: '#111218',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C1E2A',
    padding: 14,
    gap: 8,
  },
  missionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missionIndexBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  missionIndexText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#E11D48',
    letterSpacing: 0.5,
  },
  providerBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
  },
  providerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.4,
  },
  missionDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  missionDurationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  missionTopic: {
    fontSize: 11,
    color: '#8E8E93',
  },
  externalSurveyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 210, 238, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 238, 0.3)',
    alignSelf: 'flex-start',
  },
  externalSurveyBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00D2EE',
    letterSpacing: 0.4,
  },
  missionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1A1C26',
    marginTop: 4,
  },
  missionRewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0B0D14',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1C1E2A',
  },
  bountyCutLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  rewardPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00D2EE',
  },
  raidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E11D48',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  raidBtnCleared: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  raidBtnLocked: {
    backgroundColor: '#1E202C',
  },
  raidBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  returnBtn: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  returnBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    padding: 16,
  },
  modalSafe: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#0B0D14',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E11D48',
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalStepTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#E11D48',
    letterSpacing: 0.6,
  },
  modalMissionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161926',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionBox: {
    backgroundColor: '#111218',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1C1E2A',
  },
  questionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  optionsList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111218',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1C1E2A',
  },
  optionCardSelected: {
    borderColor: '#E11D48',
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
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
    borderColor: '#E11D48',
  },
  radioDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    flex: 1,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  confirmBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#2A2D3D',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },

  // Victory Card Modal
  victoryCard: {
    backgroundColor: '#05070D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00D2EE',
    padding: 20,
    gap: 14,
  },
  victoryTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  victoryTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 0.8,
  },
  victoryTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  victorySub: {
    fontSize: 11.5,
    color: '#8E8E93',
    lineHeight: 18,
  },
  victoryRewardBox: {
    backgroundColor: '#0B1120',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0284C7',
    padding: 14,
    gap: 8,
  },
  victoryRewardBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.6,
  },
  victoryRewardVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00D2EE',
  },
  victoryConfirmBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  victoryConfirmBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
