import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield,
  Users,
  Swords,
  Crown,
  Flame,
  Trophy,
  Plus,
  ArrowLeft,
  Check,
  AlertTriangle,
  LogOut,
  Coins,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import {
  guildService,
  GuildData,
  GuildRaidData,
  GuildMemberData,
} from '../../src/services/guildService';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { AriseBannerAd } from '../../src/components/ads/AriseBannerAd';

const { width } = Dimensions.get('window');

export default function GuildScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [loading, setLoading] = useState(true);
  const [myGuildInfo, setMyGuildInfo] = useState<{
    guild: GuildData;
    raid: GuildRaidData | null;
    members: GuildMemberData[];
  } | null>(null);
  const [allGuilds, setAllGuilds] = useState<GuildData[]>([]);

  // Navigation tabs when in a guild: 'raid' | 'roster' | 'registry'
  const [activeTab, setActiveTab] = useState<'raid' | 'roster' | 'registry'>('raid');

  // Create Guild Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildTag, setNewGuildTag] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Raid strike state
  const [attacking, setAttacking] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [myGuild, guilds] = await Promise.all([
        guildService.getMyGuild(),
        guildService.getAllGuilds(),
      ]);
      setMyGuildInfo(myGuild);
      setAllGuilds(guilds);
      if (!myGuild) {
        setActiveTab('registry');
      }
    } catch (e) {
      console.warn('Error loading guild data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Joining a Guild
  const handleJoinGuild = async (targetGuild: GuildData) => {
    haptics.medium();
    Alert.alert(
      'JOIN GUILD',
      `Submit your hunter pledge to enlist in [${targetGuild.tag}] ${targetGuild.name}?`,
      [
        { text: 'DECLINE', style: 'cancel' },
        {
          text: 'ENLIST NOW',
          style: 'default',
          onPress: async () => {
            try {
              const res = await guildService.joinGuild(targetGuild.id);
              if (res.success) {
                haptics.heavy();
                Alert.alert('SYSTEM NOTICE', `You are now a registered hunter of [${targetGuild.tag}] ${targetGuild.name}!`);
                await loadData();
                setActiveTab('raid');
              } else {
                Alert.alert('ERROR', res.error || 'Failed to join guild');
              }
            } catch (err: any) {
              Alert.alert('ERROR', err.message || 'An error occurred');
            }
          },
        },
      ]
    );
  };

  // Handle Leaving Guild
  const handleLeaveGuild = () => {
    if (!myGuildInfo) return;
    haptics.warning();
    Alert.alert(
      'RESIGN FROM GUILD',
      `Are you sure you wish to leave [${myGuildInfo.guild.tag}] ${myGuildInfo.guild.name}? Your accumulated contribution will be reset.`,
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'CONFIRM RESIGNATION',
          style: 'destructive',
          onPress: async () => {
            await guildService.leaveCurrentGuild();
            haptics.heavy();
            Alert.alert('SYSTEM', 'You have withdrawn from the guild.');
            await loadData();
            setActiveTab('registry');
          },
        },
      ]
    );
  };

  // Handle Creating a Guild
  const handleCreateGuildSubmit = async () => {
    if (!newGuildName.trim() || !newGuildTag.trim()) {
      Alert.alert('INVALID DATA', 'Please enter a valid Guild Name and Tag.');
      return;
    }

    setCreating(true);
    try {
      const res = await guildService.createGuild(
        newGuildName,
        newGuildTag,
        newGuildDesc
      );
      if (res.success) {
        haptics.heavy();
        setCreateModalVisible(false);
        setNewGuildName('');
        setNewGuildTag('');
        setNewGuildDesc('');
        await loadProfile();
        await loadData();
        setActiveTab('raid');
        Alert.alert(
          'GUILD CHARTERED',
          `Guild [${res.guild?.tag}] ${res.guild?.name} has been officially registered in the Hunter Association. You are the Guild Master!`
        );
      } else {
        Alert.alert('CHARTER FAILED', res.error || 'Could not charter guild');
      }
    } catch (e: any) {
      Alert.alert('ERROR', e.message || 'Failed to create guild');
    } finally {
      setCreating(false);
    }
  };

  // Handle Raid Boss Attack
  const handleAttackBoss = async () => {
    if (!myGuildInfo || !myGuildInfo.raid || attacking) return;
    setAttacking(true);
    haptics.heavy();

    // Damage deal formula based on level and random critical strike
    const baseDamage = 150 + (profile?.level || 1) * 20;
    const isCrit = Math.random() > 0.65;
    const finalDamage = Math.floor(baseDamage * (isCrit ? 2.2 : 1.0));

    try {
      const result = await guildService.attackRaidBoss(myGuildInfo.guild.id, finalDamage);
      await loadProfile();

      if (result.cleared) {
        haptics.heavy();
        Alert.alert(
          'GATE RAID CLEARED',
          `Boss "${result.bossName}" has been annihilated!\n\nREWARDS ACQUIRED:\n+${result.rewardCoins} Mana Coins\n+${result.rewardXP} Hunter XP`
        );
      } else {
        if (isCrit) {
          Alert.alert('CRITICAL STRIKE', `Dealt ${finalDamage} CRITICAL damage to ${result.bossName}! Boss HP: ${result.newHp} / ${result.maxHp}`);
        }
      }
      await loadData();
    } catch (e) {
      console.warn('Attack error:', e);
    } finally {
      setAttacking(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>HUNTER ASSOCIATION</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {myGuildInfo ? `[${myGuildInfo.guild.tag}] ${myGuildInfo.guild.name}` : 'GUILD REGISTRY'}
          </Text>
        </View>

        {/* User Coin Balance Pill */}
        <View style={[styles.coinsBadge, { backgroundColor: colors.card }]}>
          <Coins size={14} color="#F59E0B" />
          <Text style={styles.coinsBadgeText}>{profile?.coins ?? 0}</Text>
        </View>
      </View>

      {/* Navigation Sub-Tabs (if in a guild) */}
      {myGuildInfo && (
        <View style={[styles.tabsRow, { backgroundColor: isDark ? '#090C16' : colors.surfaceLight, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'raid' && styles.tabBtnActive]}
            onPress={() => {
              haptics.light();
              setActiveTab('raid');
            }}
          >
            <Swords size={15} color={activeTab === 'raid' ? '#EF4444' : '#64748B'} />
            <Text style={[styles.tabBtnText, activeTab === 'raid' && { color: '#EF4444' }]}>
              GATE RAID
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'roster' && styles.tabBtnActive]}
            onPress={() => {
              haptics.light();
              setActiveTab('roster');
            }}
          >
            <Users size={15} color={activeTab === 'roster' ? '#0A84FF' : '#64748B'} />
            <Text style={[styles.tabBtnText, activeTab === 'roster' && { color: '#0A84FF' }]}>
              ROSTER ({myGuildInfo.members.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'registry' && styles.tabBtnActive]}
            onPress={() => {
              haptics.light();
              setActiveTab('registry');
            }}
          >
            <Shield size={15} color={activeTab === 'registry' ? '#F59E0B' : '#64748B'} />
            <Text style={[styles.tabBtnText, activeTab === 'registry' && { color: '#F59E0B' }]}>
              ALL GUILDS
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={styles.loadingText}>[ SYNCHRONIZING GUILD NETWORK... ]</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= VIEW 1: GATE RAID ================= */}
          {myGuildInfo && activeTab === 'raid' && (
            <View style={styles.section}>
              {/* Guild Overview Card */}
              <LinearGradient
                colors={isDark ? ['#0F172A', '#0B0D14'] : [colors.card, colors.surfaceLight]}
                style={[styles.guildHeroCard, { borderColor: colors.border }]}
              >
                <View style={styles.guildHeroTop}>
                  <View style={styles.guildTagBadge}>
                    <Crown size={12} color="#F59E0B" />
                    <Text style={styles.guildTagText}>{myGuildInfo.guild.tag}</Text>
                  </View>
                  <View style={[styles.guildLevelBadge, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight }]}>
                    <Text style={[styles.guildLevelText, { color: colors.textSecondary }]}>LVL {myGuildInfo.guild.level}</Text>
                  </View>
                </View>

                <Text style={[styles.guildHeroName, { color: colors.textPrimary }]}>{myGuildInfo.guild.name}</Text>
                <Text style={[styles.guildHeroDesc, { color: colors.textSecondary }]}>{myGuildInfo.guild.description}</Text>

                <View style={[styles.guildStatsRow, { backgroundColor: isDark ? '#070911' : colors.surfaceLight }]}>
                  <View style={styles.guildStatBox}>
                    <Text style={[styles.guildStatNum, { color: colors.textPrimary }]}>{myGuildInfo.guild.memberCount} / {myGuildInfo.guild.maxMembers}</Text>
                    <Text style={[styles.guildStatLabel, { color: colors.textMuted }]}>MEMBERS</Text>
                  </View>
                  <View style={styles.guildStatBox}>
                    <Text style={[styles.guildStatNum, { color: colors.textPrimary }]}>{myGuildInfo.guild.totalXP.toLocaleString()}</Text>
                    <Text style={[styles.guildStatLabel, { color: colors.textMuted }]}>GUILD XP</Text>
                  </View>
                  <View style={styles.guildStatBox}>
                    <Text style={[styles.guildStatNum, { color: colors.textPrimary }]}>{myGuildInfo.guild.leaderName}</Text>
                    <Text style={[styles.guildStatLabel, { color: colors.textMuted }]}>MASTER</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Active Dungeon Gate Raid Card */}
              <View style={[styles.raidContainer, { backgroundColor: colors.card }]}>
                <View style={styles.raidHeaderRow}>
                  <View style={styles.redGateBadge}>
                    <Flame size={14} color="#EF4444" />
                    <Text style={styles.redGateText}>RED GATE ANOMALY</Text>
                  </View>
                  <View style={[styles.rankGateBadge, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight }]}>
                    <Text style={styles.rankGateText}>RANK {myGuildInfo.raid?.gateRank || 'A'}</Text>
                  </View>
                </View>

                <Text style={[styles.bossName, { color: colors.textPrimary }]}>{myGuildInfo.raid?.bossName || 'Dungeon Boss'}</Text>
                <Text style={[styles.bossSubtitle, { color: colors.textSecondary }]}>COOPERATIVE GUILD RAID OBJECTIVE</Text>

                {/* HP Bar */}
                {myGuildInfo.raid && (
                  <View style={styles.hpSection}>
                    <View style={styles.hpTextRow}>
                      <Text style={styles.hpLabel}>BOSS HEALTH</Text>
                      <Text style={[styles.hpValue, { color: colors.textPrimary }]}>
                        {myGuildInfo.raid.bossCurrentHp.toLocaleString()} / {myGuildInfo.raid.bossMaxHp.toLocaleString()} HP
                      </Text>
                    </View>
                    <View style={[styles.hpBarTrack, { backgroundColor: isDark ? '#1F2438' : colors.surfaceLight }]}>
                      <View
                        style={[
                          styles.hpBarFill,
                          {
                            width: `${Math.max(
                              4,
                              (myGuildInfo.raid.bossCurrentHp / myGuildInfo.raid.bossMaxHp) * 100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* Raid Rewards preview */}
                <View style={[styles.raidRewardsRow, { backgroundColor: isDark ? '#070911' : colors.surfaceLight }]}>
                  <View style={styles.raidRewardItem}>
                    <Trophy size={13} color="#0A84FF" />
                    <Text style={[styles.raidRewardText, { color: colors.textPrimary }]}>+{myGuildInfo.raid?.rewardXP || 500} XP</Text>
                  </View>
                  <View style={styles.raidRewardItem}>
                    <Coins size={13} color="#F59E0B" />
                    <Text style={[styles.raidRewardText, { color: colors.textPrimary }]}>+{myGuildInfo.raid?.rewardCoins || 100} Coins</Text>
                  </View>
                </View>

                {/* Attack Button */}
                <TouchableOpacity
                  style={[styles.attackButton, attacking && { opacity: 0.7 }]}
                  onPress={handleAttackBoss}
                  disabled={attacking}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.attackButtonGrad}
                  >
                    {attacking ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Swords size={20} color="#FFFFFF" />
                        <Text style={styles.attackButtonText}>EXECUTE RAID STRIKE</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= VIEW 2: ROSTER ================= */}
          {myGuildInfo && activeTab === 'roster' && (
            <View style={styles.section}>
              <View style={styles.rosterHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>HUNTER ROSTER</Text>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                  {myGuildInfo.members.length} / {myGuildInfo.guild.maxMembers} Hunters
                </Text>
              </View>

              {myGuildInfo.members.map((member, index) => (
                <View
                  key={member.id}
                  style={[
                    styles.memberCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    member.isCurrentUser && [styles.memberCardCurrentUser, { borderColor: colors.primary, backgroundColor: isDark ? '#0A1226' : colors.surfaceLight }],
                  ]}
                >
                  <View style={[styles.memberRankNum, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight }]}>
                    <Text style={[styles.memberRankNumText, { color: colors.textSecondary }]}>#{index + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberNameText, { color: colors.textPrimary }]}>
                        {member.hunterName} {member.isCurrentUser && '(You)'}
                      </Text>
                      <View
                        style={[
                          styles.roleTag,
                          member.role === 'GUILD_MASTER' && { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' },
                          member.role === 'ELITE' && { backgroundColor: 'rgba(10, 132, 255, 0.15)', borderColor: '#0A84FF' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleTagText,
                            member.role === 'GUILD_MASTER' && { color: '#F59E0B' },
                            member.role === 'ELITE' && { color: '#0A84FF' },
                          ]}
                        >
                          {member.role.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.memberPointsText}>
                      Contribution: {member.contributionPoints.toLocaleString()} DMG
                    </Text>
                  </View>

                  <View style={styles.hunterRankBadge}>
                    <Text style={styles.hunterRankBadgeText}>{member.hunterRank}-RANK</Text>
                  </View>
                </View>
              ))}

              {/* Leave Guild Option */}
              <TouchableOpacity
                style={styles.leaveGuildBtn}
                onPress={handleLeaveGuild}
                activeOpacity={0.8}
              >
                <LogOut size={16} color="#EF4444" />
                <Text style={styles.leaveGuildBtnText}>WITHDRAW FROM GUILD</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ================= VIEW 3: ALL GUILDS / REGISTRY ================= */}
          {(!myGuildInfo || activeTab === 'registry') && (
            <View style={styles.section}>
              {/* Guildless Hero Promotion if user has no guild */}
              {!myGuildInfo && (
                <View style={styles.heroPromoCard}>
                  <LinearGradient
                    colors={isDark ? ['#1E293B', '#0B0D14'] : [colors.card, colors.surfaceLight]}
                    style={styles.heroPromoGrad}
                  >
                    <Shield size={32} color={colors.primary} />
                    <Text style={[styles.heroPromoTitle, { color: colors.textPrimary }]}>DIMENSIONAL HUNTER GUILDS</Text>
                    <Text style={[styles.heroPromoDesc, { color: colors.textSecondary }]}>
                      Band together with elite hunters, coordinate worldwide Red Gate raids, and earn legendary rewards.
                    </Text>

                    <TouchableOpacity
                      style={styles.foundGuildBtn}
                      onPress={() => {
                        haptics.heavy();
                        setCreateModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Plus size={18} color="#FFFFFF" />
                      <Text style={styles.foundGuildBtnText}>FOUND NEW GUILD (100 COINS)</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              )}

              <View style={styles.registryHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>REGISTERED GUILDS</Text>
                {myGuildInfo && (
                  <TouchableOpacity
                    style={styles.charterMiniBtn}
                    onPress={() => {
                      haptics.light();
                      setCreateModalVisible(true);
                    }}
                  >
                    <Plus size={14} color="#0A84FF" />
                    <Text style={styles.charterMiniBtnText}>FOUND GUILD</Text>
                  </TouchableOpacity>
                )}
              </View>

              {allGuilds.length === 0 ? (
                <View style={[styles.emptyGuildCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Shield size={44} color={colors.primary} />
                  <Text style={[styles.emptyGuildTitle, { color: colors.textPrimary }]}>
                    NO CHARTERED GUILDS
                  </Text>
                  <Text style={[styles.emptyGuildDesc, { color: colors.textSecondary }]}>
                    No hunter syndicates have been chartered in this sector yet. Be the first sovereign to establish a guild!
                  </Text>
                  <TouchableOpacity
                    style={styles.foundGuildBtn}
                    onPress={() => {
                      haptics.heavy();
                      setCreateModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={18} color="#FFFFFF" />
                    <Text style={styles.foundGuildBtnText}>FOUND FIRST GUILD (100 COINS)</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                allGuilds.map((g) => {
                  const isJoined = myGuildInfo?.guild.id === g.id;

                  return (
                    <View key={g.id} style={[styles.guildCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.guildCardTop}>
                        <View style={styles.guildCardTagWrap}>
                          <Text style={styles.guildCardTag}>[{g.tag}]</Text>
                          <Text style={[styles.guildCardName, { color: colors.textPrimary }]}>{g.name}</Text>
                        </View>
                        <View style={styles.guildRankReq}>
                          <Text style={styles.guildRankReqText}>{g.rankRequirement}-RANK REQ</Text>
                        </View>
                      </View>

                      <Text style={[styles.guildCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {g.description}
                      </Text>

                      <View style={[styles.guildCardBottom, { borderTopColor: colors.border }]}>
                        <View style={styles.guildCardStats}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Users size={12} color={colors.textMuted} />
                            <Text style={[styles.guildCardStatItem, { color: colors.textMuted }]}>
                              {g.memberCount}/{g.maxMembers}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Zap size={12} color={colors.textMuted} />
                            <Text style={[styles.guildCardStatItem, { color: colors.textMuted }]}>
                              {g.totalXP.toLocaleString()} XP
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Crown size={12} color={colors.textMuted} />
                            <Text style={[styles.guildCardStatItem, { color: colors.textMuted }]}>
                              {g.leaderName}
                            </Text>
                          </View>
                        </View>

                        {isJoined ? (
                          <View style={styles.joinedBadge}>
                            <Check size={14} color="#10B981" />
                            <Text style={styles.joinedBadgeText}>ENLISTED</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.joinGuildBtn}
                            onPress={() => handleJoinGuild(g)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.joinGuildBtnText}>ENLIST</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Non-intrusive Sponsor Banner */}
          <AriseBannerAd style={{ marginVertical: 12 }} />
        </ScrollView>
      )}

      {/* ================= FOUND GUILD MODAL ================= */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Crown size={22} color="#F59E0B" />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>CHARTER A GUILD</Text>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Establish a new Hunter Syndicate. You will be crowned Guild Master.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>GUILD NAME</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. Shadow Monarchs"
                placeholderTextColor={colors.textMuted}
                value={newGuildName}
                onChangeText={setNewGuildName}
                maxLength={24}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>GUILD TAG (2-6 CHARS)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="e.g. MNCH"
                placeholderTextColor={colors.textMuted}
                value={newGuildTag}
                onChangeText={(text) => setNewGuildTag(text.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>CREED / DESCRIPTION</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top', backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Declare your guild's dimensional objective..."
                placeholderTextColor={colors.textMuted}
                value={newGuildDesc}
                onChangeText={setNewGuildDesc}
                multiline
                maxLength={120}
              />
            </View>

            {/* Fee display */}
            <View style={[styles.costBox, { backgroundColor: isDark ? '#070911' : colors.surfaceLight, borderColor: '#F59E0B33' }]}>
              <Text style={[styles.costText, { color: colors.textSecondary }]}>REGISTRATION CHARTER FEE:</Text>
              <View style={styles.costValueRow}>
                <Coins size={16} color="#F59E0B" />
                <Text style={styles.costValue}>100 COINS</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight }]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreateGuildSubmit}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>CHARTER GUILD</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2138',
    backgroundColor: '#05070E',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#111422',
    borderWidth: 1,
    borderColor: '#1F2438',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0A84FF',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111422',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  coinsBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F59E0B',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#090C16',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2138',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#111422',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#1A2138',
    borderColor: '#2F3A58',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A84FF',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 16,
  },
  guildHeroCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2438',
    gap: 10,
  },
  guildHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guildTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guildTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  guildLevelBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guildLevelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  guildHeroName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  guildHeroDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  guildStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#070911',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  guildStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  guildStatNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guildStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  raidContainer: {
    backgroundColor: '#0D111E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EF444466',
    padding: 18,
    gap: 12,
  },
  raidHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  redGateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  redGateText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.8,
  },
  rankGateBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rankGateText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
  },
  bossName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bossSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  hpSection: {
    gap: 6,
    marginVertical: 4,
  },
  hpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hpLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  hpValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hpBarTrack: {
    height: 12,
    backgroundColor: '#1F2438',
    borderRadius: 6,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  raidRewardsRow: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#070911',
    padding: 10,
    borderRadius: 10,
  },
  raidRewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  raidRewardText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  attackButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
  },
  attackButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  attackButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1A2138',
    padding: 12,
    gap: 12,
  },
  memberCardCurrentUser: {
    borderColor: '#0A84FF',
    backgroundColor: '#0A1226',
  },
  memberRankNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRankNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleTag: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  memberPointsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  hunterRankBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  hunterRankBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0A84FF',
  },
  leaveGuildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EF444466',
    backgroundColor: '#170A0F',
    marginTop: 10,
  },
  leaveGuildBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.6,
  },
  heroPromoCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#0A84FF55',
  },
  heroPromoGrad: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  heroPromoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  heroPromoDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  foundGuildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    marginTop: 6,
  },
  foundGuildBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  registryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charterMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111422',
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  charterMiniBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0A84FF',
  },
  guildCard: {
    backgroundColor: '#0D111E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A2138',
    padding: 14,
    gap: 10,
  },
  guildCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guildCardTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guildCardTag: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0A84FF',
  },
  guildCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guildRankReq: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guildRankReqText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  guildCardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  guildCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#151A2E',
    paddingTop: 10,
  },
  guildCardStats: {
    flexDirection: 'row',
    gap: 12,
  },
  guildCardStatItem: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  joinedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  joinGuildBtn: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  joinGuildBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0D111E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2F3A58',
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#111422',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F2438',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  costBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070911',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B33',
  },
  costText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  costValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  costValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F59E0B',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0A84FF',
  },
  modalSubmitText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emptyGuildCard: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emptyGuildTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyGuildDesc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
