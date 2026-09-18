import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  Fire,
  Gift,
  Coins,
  CheckCircle,
  Lock,
  Sparkle,
  ShieldCheck,
  Crown,
  Lightning,
} from 'phosphor-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { HoloLoader } from '../../src/components/ui/HoloLoader';
import {
  streakGiftService,
  StreakMilestoneGift,
} from '../../src/services/streakGiftService';
import { usePlayerStore } from '../../src/stores/usePlayerStore';

const { width } = Dimensions.get('window');

export default function StreakMilestonesScreen() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();
  const loadProfile = usePlayerStore((s) => s.loadProfile);

  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<StreakMilestoneGift[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [nextMilestone, setNextMilestone] = useState<StreakMilestoneGift | null>(null);
  const [claimedCount, setClaimedCount] = useState(0);

  // Unboxing Modal State
  const [unboxingGift, setUnboxingGift] = useState<StreakMilestoneGift | null>(null);
  const [unboxedReward, setUnboxedReward] = useState<{
    coins: number;
    title: string;
    perk: string;
  } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Reanimated box shake values
  const boxShake = useSharedValue(0);
  const boxScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);

  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true);
      const data = await streakGiftService.getMilestones();
      setMilestones(data.milestones);
      setCurrentStreak(data.currentStreak);
      setNextMilestone(data.nextMilestone);
      setClaimedCount(data.claimedCount);
    } catch (err) {
      console.warn('Error loading streak gifts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const handleStartUnbox = (gift: StreakMilestoneGift) => {
    haptics.heavy();
    setUnboxingGift(gift);
    setUnboxedReward(null);
    boxShake.value = 0;
    boxScale.value = 1;
    flashOpacity.value = 0;
  };

  const handleConfirmClaim = async () => {
    if (!unboxingGift || isClaiming) return;
    setIsClaiming(true);

    // Violent shaking animation
    boxShake.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );

    haptics.heavy();
    setTimeout(() => {
      haptics.heavy();
    }, 200);

    // Box burst & golden flash
    setTimeout(async () => {
      try {
        boxScale.value = withTiming(1.3, { duration: 250 });
        flashOpacity.value = withSequence(
          withTiming(0.9, { duration: 150 }),
          withTiming(0, { duration: 400 })
        );

        const res = await streakGiftService.claimMilestoneGift(unboxingGift.id);
        sound.play('coin_earn');
        haptics.success();

        setUnboxedReward({
          coins: res.rewardCoins,
          title: res.title,
          perk: res.perk,
        });

        await loadMilestones();
        await loadProfile();
      } catch (e: any) {
        console.warn('Claim error:', e);
      } finally {
        setIsClaiming(false);
      }
    }, 450);
  };

  const handleCloseModal = () => {
    haptics.light();
    setUnboxingGift(null);
    setUnboxedReward(null);
  };

  const animatedBoxStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: boxShake.value },
      { scale: boxScale.value },
    ],
  }));

  const animatedFlashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1C1E26' : '#E5E5EA' }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? '#14151C' : '#F2F2F7', borderColor: colors.border }]}
          onPress={() => {
            haptics.light();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            STREAK MILESTONE GIFTS
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            DISCIPLINE VAULT & REWARD TRACK
          </Text>
        </View>

        <View style={styles.headerStreakPill}>
          <Fire size={15} color="#EA580C" weight="fill" />
          <Text style={styles.headerStreakVal}>{currentStreak}d</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <HoloLoader message="CALIBRATING MILESTONE VAULT" subMessage="CALCULATING DISCIPLINE STREAK..." />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Hero Banner */}
          <GlassCard
            variant="elevated"
            style={[
              styles.heroCard,
              {
                backgroundColor: isDark ? '#190E08' : '#FFF7ED',
                borderColor: isDark ? '#C2410C' : '#F97316',
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroFlameWrap}>
                <Fire size={36} color="#EA580C" weight="fill" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.heroStreakHeading}>{currentStreak} DAYS UNBROKEN</Text>
                <Text style={[styles.heroSubText, { color: colors.textSecondary }]}>
                  {nextMilestone
                    ? `${nextMilestone.daysRemaining} days until ${nextMilestone.title} unlocks!`
                    : 'All current milestone gifts conquered! You are a legendary titan.'}
                </Text>
              </View>
            </View>

            <View style={[styles.heroProgressTrack, { backgroundColor: isDark ? '#2C160B' : '#FED7AA' }]}>
              <View
                style={[
                  styles.heroProgressFill,
                  {
                    width: nextMilestone
                      ? `${Math.min(100, Math.round((currentStreak / nextMilestone.daysRequired) * 100))}%`
                      : '100%',
                  },
                ]}
              />
            </View>

            <View style={styles.heroSummaryRow}>
              <View style={styles.heroStatItem}>
                <Gift size={15} color="#EA580C" weight="fill" />
                <Text style={styles.heroStatText}>{claimedCount} / {milestones.length} Claimed</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Coins size={15} color="#F59E0B" weight="fill" />
                <Text style={styles.heroStatText}>Up to 41,300 Free Coins</Text>
              </View>
            </View>
          </GlassCard>

          {/* Timeline of Milestones */}
          <View style={styles.milestoneList}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              MILESTONE ROADMAP
            </Text>

            {milestones.map((m) => {
              const isClaimed = m.status === 'CLAIMED';
              const isClaimable = m.status === 'CLAIMABLE';
              const isLocked = m.status === 'LOCKED';

              return (
                <GlassCard
                  key={m.id}
                  variant={isClaimable ? 'glow' : 'elevated'}
                  style={[
                    styles.milestoneCard,
                    isClaimable && {
                      borderColor: '#F59E0B',
                      backgroundColor: isDark ? '#1C160A' : '#FEF3C7',
                    },
                    isClaimed && {
                      opacity: 0.85,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Left Column: Days Badge */}
                  <View
                    style={[
                      styles.daysBadgeCircle,
                      {
                        borderColor: isClaimable ? '#F59E0B' : m.color,
                        backgroundColor: isDark ? '#141620' : '#F1F3F9',
                      },
                    ]}
                  >
                    <Fire
                      size={16}
                      color={isClaimable ? '#F59E0B' : isClaimed ? '#10B981' : m.color}
                      weight="fill"
                    />
                    <Text
                      style={[
                        styles.daysBadgeNum,
                        { color: isClaimable ? '#F59E0B' : colors.textPrimary },
                      ]}
                    >
                      {m.daysRequired}d
                    </Text>
                  </View>

                  {/* Middle Column: Details */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.giftTitle,
                          { color: colors.textPrimary },
                          isClaimable && { color: '#F59E0B', fontWeight: '900' },
                        ]}
                      >
                        {m.title}
                      </Text>
                    </View>

                    <Text style={[styles.giftSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {m.subtitle}
                    </Text>

                    {/* Reward Tags */}
                    <View style={styles.rewardPillsRow}>
                      <View style={styles.coinRewardPill}>
                        <Coins size={12} color="#F59E0B" weight="fill" />
                        <Text style={styles.coinRewardText}>+{m.coinsReward} Coins</Text>
                      </View>
                      <View style={styles.perkPill}>
                        <Sparkle size={11} color={colors.primary} />
                        <Text style={[styles.perkText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {m.extraPerk}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right Column: CTA or State */}
                  <View style={styles.cardRightCol}>
                    {isClaimable ? (
                      <TouchableOpacity
                        style={styles.claimGiftBtn}
                        onPress={() => handleStartUnbox(m)}
                        activeOpacity={0.85}
                      >
                        <Gift size={16} color="#000000" weight="fill" />
                        <Text style={styles.claimGiftBtnText}>UNBOX</Text>
                      </TouchableOpacity>
                    ) : isClaimed ? (
                      <View style={styles.claimedBadge}>
                        <CheckCircle size={16} color="#10B981" weight="fill" />
                        <Text style={styles.claimedBadgeText}>CLAIMED</Text>
                      </View>
                    ) : (
                      <View style={styles.lockedBadge}>
                        <Lock size={14} color="#8E8E93" />
                        <Text style={styles.lockedBadgeText}>{m.daysRemaining}d left</Text>
                      </View>
                    )}
                  </View>
                </GlassCard>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* UNBOXING INTERACTIVE MODAL */}
      <Modal
        visible={!!unboxingGift}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          {/* Golden Flash Effect */}
          <Animated.View style={[styles.flashScreen, animatedFlashStyle]} pointerEvents="none" />

          <View style={[styles.unboxCard, { backgroundColor: isDark ? '#0F1118' : '#FFFFFF', borderColor: '#F59E0B' }]}>
            {/* Top Close */}
            <View style={styles.unboxTopHeader}>
              <View style={styles.unboxSystemTag}>
                <Sparkle size={12} color="#F59E0B" />
                <Text style={styles.unboxSystemTagText}>SACRED MILESTONE VAULT</Text>
              </View>
            </View>

            {/* Shaking Gift Box Icon */}
            <Animated.View style={[styles.giftBoxGraphicWrap, animatedBoxStyle]}>
              <View style={[styles.giftBoxAura, { backgroundColor: '#F59E0B' }]} />
              <Gift size={76} color="#F59E0B" weight="fill" />
            </Animated.View>

            <Text style={[styles.unboxTitle, { color: colors.textPrimary }]}>
              {unboxedReward ? 'TREASURE UNLOCKED!' : unboxingGift?.title}
            </Text>

            <Text style={[styles.unboxSubtitle, { color: colors.textSecondary }]}>
              {unboxedReward
                ? 'Your discipline rewards have been safely deposited.'
                : unboxingGift?.subtitle}
            </Text>

            {/* Revealed Bounty or Pending Details */}
            {unboxedReward ? (
              <View style={styles.rewardRevealBox}>
                <View style={styles.bountyRow}>
                  <Coins size={28} color="#F59E0B" weight="fill" />
                  <Text style={styles.bountyAmountText}>
                    +{unboxedReward.coins} GOLD COINS
                  </Text>
                </View>

                <View style={styles.perkRevealItem}>
                  <ShieldCheck size={18} color={colors.primary} weight="fill" />
                  <Text style={[styles.perkRevealText, { color: colors.textPrimary }]}>
                    {unboxedReward.perk}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.bountyPreviewBox}>
                <Text style={styles.bountyPreviewLabel}>CONTAINS:</Text>
                <Text style={styles.bountyPreviewVal}>
                  +{unboxingGift?.coinsReward} Coins + {unboxingGift?.extraPerk}
                </Text>
              </View>
            )}

            {/* Action Button */}
            {unboxedReward ? (
              <TouchableOpacity
                style={[styles.collectBtn, { backgroundColor: colors.primary }]}
                onPress={handleCloseModal}
                activeOpacity={0.85}
              >
                <Text style={styles.collectBtnText}>COLLECT & CONTINUE</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.collectBtn, { backgroundColor: '#F59E0B' }]}
                onPress={handleConfirmClaim}
                disabled={isClaiming}
                activeOpacity={0.85}
              >
                <Sparkle size={18} color="#000000" />
                <Text style={[styles.collectBtnText, { color: '#000000' }]}>
                  {isClaiming ? 'UNBOXING...' : 'OPEN GIFT BOX'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  headerStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.3)',
  },
  headerStreakVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EA580C',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 12,
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroFlameWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroStreakHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: -0.2,
  },
  heroSubText: {
    fontSize: 12,
  },
  heroProgressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#EA580C',
    borderRadius: 4,
  },
  heroSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  milestoneList: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  daysBadgeCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  daysBadgeNum: {
    fontSize: 10,
    fontWeight: '900',
  },
  giftTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  giftSub: {
    fontSize: 11,
  },
  rewardPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  coinRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coinRewardText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  perkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  perkText: {
    fontSize: 10,
  },
  cardRightCol: {
    alignItems: 'flex-end',
  },
  claimGiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  claimGiftBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  claimedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  flashScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F59E0B',
  },
  unboxCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    gap: 14,
  },
  unboxTopHeader: {
    width: '100%',
    alignItems: 'center',
  },
  unboxSystemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  unboxSystemTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  giftBoxGraphicWrap: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  giftBoxAura: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    opacity: 0.15,
  },
  unboxTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  unboxSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  bountyPreviewBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    alignItems: 'center',
    gap: 4,
  },
  bountyPreviewLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  bountyPreviewVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  rewardRevealBox: {
    width: '100%',
    gap: 10,
  },
  bountyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  bountyAmountText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  perkRevealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  perkRevealText: {
    fontSize: 12,
    fontWeight: '800',
  },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  collectBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
