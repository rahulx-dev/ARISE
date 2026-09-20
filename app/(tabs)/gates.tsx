import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Swords,
  Crown,
  ChevronRight,
  Zap,
  Lock,
  Radio,
  Sparkles,
  Search,
  CheckCircle2,
  ExternalLink,
  Flame,
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
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();
  const router = useRouter();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const currentRank = getRankForLevel(profile?.level || 1);
  const displayName = profile?.displayName || 'Arjun';
  const avatarIcon = profile?.avatarIcon || 'pfp_01';

  // Sub-tabs: 'gates' | 'surveys' | 'leaderboard'
  const [activeTab, setActiveTab] = useState<'gates' | 'surveys' | 'leaderboard'>('gates');
  const [lbFilter, setLbFilter] = useState<'daily' | 'weekly' | 'allTime'>('daily');

  // Emergency Red Gate State
  const [activeRedGate, setActiveRedGate] = useState<RedGateEncounter | null>(null);
  const [isRedGateModalOpen, setIsRedGateModalOpen] = useState<boolean>(false);

  // Mana Crystals & Leaderboard State
  const [manaCrystals, setManaCrystals] = useState<number>(32);
  const [leaderboard, setLeaderboard] = useState<CrystalLeaderboardHunter[]>([]);
  const [spawnedGates, setSpawnedGates] = useState<SpawnedDungeonGate[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);

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

  const handleOpenGatePage = (gate?: SpawnedDungeonGate) => {
    haptics.medium();
    sound.play('quest_complete');
    if (gate) {
      router.push({
        pathname: '/gates/[id]',
        params: { id: gate.id },
      } as any);
    } else {
      router.push('/exercise/pushup' as any);
    }
  };

  const handleOpenCPXSurveys = async () => {
    haptics.medium();
    sound.play('unlock');
    const cloudUid = await getCloudUserId();
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
    const cloudUid = await getCloudUserId();
    const uid = cloudUid || 'hunter_' + (profile?.id || 'default');
    const url = getBitLabsUrl(uid);
    setSurveyModal({
      visible: true,
      url,
      title: 'BITLABS // MANA CRYSTAL MINE',
      provider: 'BITLABS',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. TOP HEADER */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitleText}>Dungeon</Text>
        <View style={styles.headerRightCurrencies}>
          <View style={styles.currencyPillMini}>
            <ManaCrystalIcon size={16} color="#00D2EE" secondaryColor="#0284C7" />
            <Text style={styles.currencyPillMiniText}>{manaCrystals.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* 2. SUB-TABS (Gates / Surveys / Leaderboard / Rewards) */}
      <View style={styles.subTabsRow}>
        <TouchableOpacity
          style={[
            styles.subTabPill,
            { backgroundColor: activeTab === 'gates' ? '#E53935' : '#F3F4F6' },
          ]}
          onPress={() => {
            haptics.light();
            setActiveTab('gates');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.subTabPillText, { color: activeTab === 'gates' ? '#FFFFFF' : '#6B7280' }]}>
            Gates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subTabPill,
            { backgroundColor: activeTab === 'surveys' ? '#E53935' : '#F3F4F6' },
          ]}
          onPress={() => {
            haptics.light();
            setActiveTab('surveys');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.subTabPillText, { color: activeTab === 'surveys' ? '#FFFFFF' : '#6B7280' }]}>
            Surveys
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subTabPill,
            { backgroundColor: activeTab === 'leaderboard' ? '#E53935' : '#F3F4F6' },
          ]}
          onPress={() => {
            haptics.light();
            setActiveTab('leaderboard');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.subTabPillText, { color: activeTab === 'leaderboard' ? '#FFFFFF' : '#6B7280' }]}>
            Leaderboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabPill, { backgroundColor: '#F3F4F6' }]}
          onPress={() => {
            haptics.light();
            router.push('/shop' as any);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.subTabPillText, { color: '#6B7280' }]}>Rewards</Text>
        </TouchableOpacity>
      </View>

      {/* ======================= TAB 1: GATES (SCREEN 8 1:1 MATCH) ======================= */}
      {activeTab === 'gates' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Active Hero Gate 1: The Inferno Gate */}
          <View style={styles.heroGateCard}>
            <View style={styles.heroGateArtWrap}>
              <View style={styles.heroGateBadgeRow}>
                <View style={styles.activeGateBadge}>
                  <Text style={styles.activeGateBadgeText}>Gate 1</Text>
                </View>
              </View>
              <Text style={styles.heroGateTitle}>The Inferno Gate</Text>
              <Text style={styles.heroGateSub}>“Discipline through action.”</Text>

              {/* Red Enter Gate Button */}
              <TouchableOpacity
                style={styles.heroEnterGateBtn}
                onPress={() => {
                  haptics.heavy();
                  handleOpenGatePage(spawnedGates.length > 0 ? spawnedGates[0] : undefined);
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.heroEnterGateBtnText}>Enter Gate</Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Survey Mine Station Banner (Earn Crystals) */}
          <View style={styles.surveyStationHeroCard}>
            <View style={styles.surveyStationTopRow}>
              <View style={styles.surveyLiveBadge}>
                <Sparkles size={14} color="#0284C7" />
                <Text style={styles.surveyLiveBadgeText}>MANA CRYSTAL SURVEY MINES</Text>
              </View>
              <View style={styles.surveyYieldBadge}>
                <ManaCrystalIcon size={13} color="#00D2EE" secondaryColor="#0284C7" />
                <Text style={styles.surveyYieldBadgeText}>+100 to +2,000 💎</Text>
              </View>
            </View>

            <Text style={styles.surveyStationTitle}>Mine Crystals with In-App Surveys</Text>
            <Text style={styles.surveyStationDesc}>
              Answer questions from CPX Research & BitLabs to earn instant crystals and redeem real vouchers.
            </Text>

            <View style={styles.surveyActionBtnsRow}>
              <TouchableOpacity
                style={styles.surveyCpxBtn}
                onPress={handleOpenCPXSurveys}
                activeOpacity={0.85}
              >
                <Text style={styles.surveyCpxBtnText}>CPX Survey Wall</Text>
                <ExternalLink size={14} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.surveyBitlabsBtn}
                onPress={handleOpenBitLabsSurveys}
                activeOpacity={0.85}
              >
                <Text style={styles.surveyBitlabsBtnText}>BitLabs Mine</Text>
                <ExternalLink size={14} color="#0284C7" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hunter Radar Pulse Scan Card */}
          <View style={styles.radarCard}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Radio size={16} color="#E53935" />
                <Text style={styles.radarTitle}>Hunter Association Radar</Text>
              </View>
              <Text style={styles.radarSub}>Scan for spawned dungeon gates & survey bounties</Text>
            </View>

            <TouchableOpacity
              style={[styles.radarBtn, isScanning && { opacity: 0.6 }]}
              onPress={handleRadarPulse}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              <Search size={14} color="#FFFFFF" />
              <Text style={styles.radarBtnText}>{isScanning ? 'Scanning...' : 'Radar Scan'}</Text>
            </TouchableOpacity>
          </View>

          {/* Locked Gates List (Gate 2, 3, 4) */}
          <View style={styles.lockedGatesList}>
            {/* Gate 2 */}
            <View style={styles.lockedGateRow}>
              <View style={styles.lockedGateLeft}>
                <View style={[styles.lockedGateIconCircle, { backgroundColor: '#EEF2FF' }]}>
                  <Swords size={20} color="#4F46E5" />
                </View>
                <View>
                  <Text style={styles.lockedGateTitle}>Gate 2</Text>
                  <Text style={styles.lockedGateSub}>The Shadow Gate</Text>
                </View>
              </View>
              <Lock size={18} color="#9CA3AF" />
            </View>

            {/* Gate 3 */}
            <View style={styles.lockedGateRow}>
              <View style={styles.lockedGateLeft}>
                <View style={[styles.lockedGateIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Zap size={20} color="#059669" />
                </View>
                <View>
                  <Text style={styles.lockedGateTitle}>Gate 3</Text>
                  <Text style={styles.lockedGateSub}>The Mind Gate</Text>
                </View>
              </View>
              <Lock size={18} color="#9CA3AF" />
            </View>

            {/* Gate 4 */}
            <View style={styles.lockedGateRow}>
              <View style={styles.lockedGateLeft}>
                <View style={[styles.lockedGateIconCircle, { backgroundColor: '#F5F3FF' }]}>
                  <Crown size={20} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.lockedGateTitle}>Gate 4</Text>
                  <Text style={styles.lockedGateSub}>The Eternal Gate</Text>
                </View>
              </View>
              <Lock size={18} color="#9CA3AF" />
            </View>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* ======================= TAB 2: SURVEYS (DEDICATED SURVEY HUB) ======================= */}
      {activeTab === 'surveys' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Survey Hero */}
          <View style={styles.surveyStationHeroCard}>
            <View style={styles.surveyStationTopRow}>
              <View style={styles.surveyLiveBadge}>
                <Sparkles size={14} color="#0284C7" />
                <Text style={styles.surveyLiveBadgeText}>MANA RECON HUB</Text>
              </View>
              <View style={styles.surveyYieldBadge}>
                <ManaCrystalIcon size={13} color="#00D2EE" secondaryColor="#0284C7" />
                <Text style={styles.surveyYieldBadgeText}>{manaCrystals} Crystals Owned</Text>
              </View>
            </View>

            <Text style={styles.surveyStationTitle}>Earn Real Rewards</Text>
            <Text style={styles.surveyStationDesc}>
              Complete daily sponsor questionnaires to mine Mana Crystals. Exchange crystals for ₹100 Amazon, Google Play, and Paytm vouchers in the shop!
            </Text>
          </View>

          {/* CPX Research Offerwall Card */}
          <TouchableOpacity
            style={styles.surveyProviderCard}
            onPress={handleOpenCPXSurveys}
            activeOpacity={0.85}
          >
            <View style={styles.surveyProviderLeft}>
              <View style={[styles.surveyProviderIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Sparkles size={24} color="#0284C7" />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.surveyProviderTitle}>CPX Research Survey Wall</Text>
                  <View style={styles.hotPill}>
                    <Text style={styles.hotPillText}>HOT</Text>
                  </View>
                </View>
                <Text style={styles.surveyProviderSub}>Highest acceptance rate • Instant crystal payout</Text>
                <View style={styles.surveyBountyRow}>
                  <ManaCrystalIcon size={13} color="#00D2EE" secondaryColor="#0284C7" />
                  <Text style={styles.surveyBountyText}>+150 to +1,200 💎 per survey</Text>
                </View>
              </View>
            </View>

            <View style={styles.surveyOpenBtn}>
              <Text style={styles.surveyOpenBtnText}>START</Text>
              <ChevronRight size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* BitLabs Survey Card */}
          <TouchableOpacity
            style={styles.surveyProviderCard}
            onPress={handleOpenBitLabsSurveys}
            activeOpacity={0.85}
          >
            <View style={styles.surveyProviderLeft}>
              <View style={[styles.surveyProviderIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Flame size={24} color="#E53935" />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.surveyProviderTitle}>BitLabs Global Surveys</Text>
                  <View style={[styles.hotPill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Text style={[styles.hotPillText, { color: '#D97706' }]}>POPULAR</Text>
                  </View>
                </View>
                <Text style={styles.surveyProviderSub}>Verified market questionnaires & research</Text>
                <View style={styles.surveyBountyRow}>
                  <ManaCrystalIcon size={13} color="#00D2EE" secondaryColor="#0284C7" />
                  <Text style={styles.surveyBountyText}>+200 to +2,000 💎 per survey</Text>
                </View>
              </View>
            </View>

            <View style={[styles.surveyOpenBtn, { backgroundColor: '#111827' }]}>
              <Text style={styles.surveyOpenBtnText}>START</Text>
              <ChevronRight size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* ======================= TAB 3: LEADERBOARD (SCREEN 8 1:1 MATCH) ======================= */}
      {activeTab === 'leaderboard' && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Leaderboard Filter Pills: Daily / Weekly / All-Time */}
            <View style={styles.lbFilterRow}>
              {(['daily', 'weekly', 'allTime'] as const).map((f) => {
                const isSelected = lbFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.lbFilterPill,
                      { backgroundColor: isSelected ? '#E53935' : '#F3F4F6' },
                    ]}
                    onPress={() => {
                      haptics.light();
                      setLbFilter(f);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.lbFilterPillText, { color: isSelected ? '#FFFFFF' : '#6B7280' }]}>
                      {f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : 'All-Time'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Top 3 Podium (Arjun #1 Center, Karan #2 Left, Riya #3 Right) */}
            <View style={styles.podiumSection}>
              {/* #2 Left: Karan */}
              <View style={styles.podiumCol}>
                <View style={[styles.podiumAvatarWrap, { borderColor: '#CBD5E1' }]}>
                  <PlayerAvatar iconId="pfp_02" size={48} />
                  <View style={[styles.podiumRankBadge, { backgroundColor: '#64748B' }]}>
                    <Text style={styles.podiumRankBadgeText}>2</Text>
                  </View>
                </View>
                <Text style={styles.podiumNameText}>Karan</Text>
                <Text style={styles.podiumXPText}>10,230</Text>
              </View>

              {/* #1 Center: Arjun 👑 */}
              <View style={[styles.podiumCol, { marginTop: -14 }]}>
                <Crown size={22} color="#F59E0B" style={{ marginBottom: 2 }} />
                <View style={[styles.podiumAvatarWrap, { borderColor: '#F59E0B', borderWidth: 2.5 }]}>
                  <PlayerAvatar iconId="pfp_01" size={60} />
                  <View style={[styles.podiumRankBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.podiumRankBadgeText}>1</Text>
                  </View>
                </View>
                <Text style={[styles.podiumNameText, { fontWeight: '900' }]}>Arjun</Text>
                <Text style={[styles.podiumXPText, { color: '#E53935', fontWeight: '900' }]}>12,450</Text>
              </View>

              {/* #3 Right: Riya */}
              <View style={styles.podiumCol}>
                <View style={[styles.podiumAvatarWrap, { borderColor: '#B45309' }]}>
                  <PlayerAvatar iconId="pfp_09" size={48} />
                  <View style={[styles.podiumRankBadge, { backgroundColor: '#B45309' }]}>
                    <Text style={styles.podiumRankBadgeText}>3</Text>
                  </View>
                </View>
                <Text style={styles.podiumNameText}>Riya</Text>
                <Text style={styles.podiumXPText}>9,880</Text>
              </View>
            </View>

            {/* Ranks 4 to 8 List */}
            <View style={styles.ranksListWrap}>
              {[
                { rank: 4, name: 'Alex', xp: '8,320', pfp: 'pfp_03' },
                { rank: 5, name: 'Sam', xp: '7,910', pfp: 'pfp_04' },
                { rank: 6, name: 'Priya', xp: '7,420', pfp: 'pfp_05' },
                { rank: 7, name: 'Dhruv', xp: '6,980', pfp: 'pfp_06' },
                { rank: 8, name: 'Neha', xp: '6,540', pfp: 'pfp_07' },
              ].map((item) => (
                <View key={item.rank} style={styles.rankListRow}>
                  <Text style={styles.rankListNumber}>{item.rank}</Text>
                  <PlayerAvatar iconId={item.pfp} size={36} />
                  <Text style={styles.rankListName}>{item.name}</Text>
                  <Text style={styles.rankListXP}>{item.xp}</Text>
                </View>
              ))}
            </View>

            <View style={{ height: 90 }} />
          </ScrollView>

          {/* Sticky Bottom "Your Rank" Card */}
          <View style={styles.stickyYourRankCard}>
            <PlayerAvatar iconId={avatarIcon} size={42} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.yourRankTitle}>Your Rank</Text>
              <Text style={styles.yourRankNum}>#12</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={styles.yourRankXP}>3,210 XP</Text>
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
        onClose={(completed) => {
          setSurveyModal((prev) => ({ ...prev, visible: false }));
          if (completed) {
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
    backgroundColor: '#FFFFFF',
  },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },
  headerRightCurrencies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyPillMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencyPillMiniText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  // Sub Tabs (Gates / Surveys / Leaderboard / Rewards)
  subTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 16,
  },
  subTabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  subTabPillText: {
    fontSize: 13,
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 30,
  },

  // Hero Gate 1 Card
  heroGateCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1C1917',
  },
  heroGateArtWrap: {
    padding: 24,
    minHeight: 190,
    justifyContent: 'space-between',
    backgroundColor: '#292524',
  },
  heroGateBadgeRow: {
    flexDirection: 'row',
  },
  activeGateBadge: {
    backgroundColor: '#E53935',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeGateBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroGateTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 14,
  },
  heroGateSub: {
    color: '#D6D3D1',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 18,
  },
  heroEnterGateBtn: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  heroEnterGateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Survey Station Hero Card
  surveyStationHeroCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  surveyLiveBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  surveyYieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  surveyYieldBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0284C7',
  },
  surveyStationTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0C4A6E',
  },
  surveyStationDesc: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  surveyActionBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
    fontSize: 12,
    fontWeight: '800',
  },
  surveyBitlabsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  surveyBitlabsBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '800',
  },

  // Radar Pulse Card
  radarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    gap: 12,
  },
  radarTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },
  radarSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  radarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E53935',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  radarBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Survey Providers (Dedicated Tab)
  surveyProviderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  surveyProviderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  surveyProviderIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surveyProviderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  surveyProviderSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  hotPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  hotPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
  },
  surveyBountyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  surveyBountyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  surveyOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E53935',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  surveyOpenBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  // Locked Gates List
  lockedGatesList: {
    gap: 12,
  },
  lockedGateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  lockedGateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  lockedGateIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedGateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  lockedGateSub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Leaderboard
  lbFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  lbFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  lbFilterPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Podium
  podiumSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    gap: 16,
  },
  podiumCol: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  podiumAvatarWrap: {
    borderRadius: 50,
    borderWidth: 2,
    position: 'relative',
  },
  podiumRankBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  podiumNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
  },
  podiumXPText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },

  // Ranks List
  ranksListWrap: {
    gap: 8,
  },
  rankListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    gap: 12,
  },
  rankListNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
    width: 20,
  },
  rankListName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  rankListXP: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  // Sticky Bottom Your Rank Card
  stickyYourRankCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  yourRankTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  yourRankNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  yourRankXP: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  yourRankDelta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
});
