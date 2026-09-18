import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldAlert,
  Flame,
  Zap,
  Crown,
  ArrowRight,
  X,
  Clock,
  Sparkles,
  Swords,
  Coins,
} from 'lucide-react-native';
import { RedGateEncounter, RedGateTrial } from '../../services/redGateService';
import { useHaptics } from '../../hooks/useHaptics';
import { useSound } from '../../hooks/useSound';

interface RedGateEncounterModalProps {
  visible: boolean;
  encounter: RedGateEncounter | null;
  onDismiss: () => void;
  onSelectTrial: (trial: RedGateTrial) => void;
}

export function RedGateEncounterModal({
  visible,
  encounter,
  onDismiss,
  onSelectTrial,
}: RedGateEncounterModalProps) {
  const haptics = useHaptics();
  const sound = useSound();

  if (!encounter) return null;

  const handlePickTrial = (trial: RedGateTrial) => {
    haptics.heavy();
    sound.play('quest_complete');
    onSelectTrial(trial);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        {/* Left & Right Glowing Crimson Flank Rails */}
        <View style={styles.leftCrimsonRail} />
        <View style={styles.rightCrimsonRail} />

        <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
          {/* Top Dismiss Button */}
          <View style={styles.topBar}>
            <View style={styles.threatBadge}>
              <ShieldAlert size={15} color="#FF1E44" />
              <Text style={styles.threatBadgeText}>[ EMERGENCY RED GATE MANIFESTED ]</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Crimson Hologram Window */}
            <View style={styles.crimsonPanel}>
              {/* Corner Chromatic Brackets */}
              <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
              <View style={[styles.cornerBracket, styles.bracketTopRight]} />
              <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
              <View style={[styles.cornerBracket, styles.bracketBottomRight]} />

              {/* Header Lore Banner */}
              <View style={styles.headerBox}>
                <View style={styles.dangerPill}>
                  <Flame size={14} color="#FF1E44" />
                  <Text style={styles.dangerPillText}>CLASS S // RED GATE RIFT</Text>
                </View>
                <Text style={styles.threatTitleText}>
                  BARRIER SEALED: {encounter.threatName.toUpperCase()}
                </Text>
                <Text style={styles.loreBodyText}>
                  {encounter.lore}
                </Text>
              </View>

              {/* Bountiful Rewards Preview Card */}
              <View style={styles.rewardsVaultCard}>
                <View style={styles.vaultHeaderRow}>
                  <Sparkles size={14} color="#FF1E44" />
                  <Text style={styles.vaultTitleText}>SOVEREIGN CONQUEST BOUNTY</Text>
                </View>

                <View style={styles.vaultGrid}>
                  {/* System Coins Bounty */}
                  <View style={styles.vaultCol}>
                    <View style={[styles.vaultIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Coins size={18} color="#F59E0B" />
                    </View>
                    <Text style={[styles.vaultValText, { color: '#F59E0B' }]}>+{encounter.bountyCoins}</Text>
                    <Text style={styles.vaultSubText}>Coins</Text>
                  </View>

                  <View style={styles.vaultDivider} />

                  {/* High XP Reward */}
                  <View style={styles.vaultCol}>
                    <View style={[styles.vaultIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Zap size={18} color="#F59E0B" />
                    </View>
                    <Text style={[styles.vaultValText, { color: '#F59E0B' }]}>+{encounter.rewardXP}</Text>
                    <Text style={styles.vaultSubText}>Player XP</Text>
                  </View>

                  <View style={styles.vaultDivider} />

                  {/* Rare Title */}
                  <View style={styles.vaultCol}>
                    <View style={[styles.vaultIconWrap, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                      <Crown size={18} color="#EC4899" />
                    </View>
                    <Text style={[styles.vaultValText, { color: '#EC4899', fontSize: 11 }]}>TITLE</Text>
                    <Text style={styles.vaultSubText}>{encounter.unlockedTitle}</Text>
                  </View>
                </View>
              </View>

              {/* Physical Directive Selection Title */}
              <View style={styles.trialsSectionHeader}>
                <Swords size={16} color="#FF1E44" />
                <Text style={styles.trialsSectionTitle}>
                  CHOOSE COMBAT DIRECTIVE TO DISPEL RIFT
                </Text>
              </View>

              {/* The 3 Physical Trial Cards */}
              <View style={styles.trialsList}>
                {encounter.trials.map((trial) => (
                  <TouchableOpacity
                    key={trial.id}
                    style={styles.trialCard}
                    activeOpacity={0.88}
                    onPress={() => handlePickTrial(trial)}
                  >
                    <View style={styles.trialIconCol}>
                      {trial.id === 'pushups' ? (
                        <Flame size={22} color="#FF1E44" />
                      ) : trial.id === 'squats' ? (
                        <Swords size={22} color="#38BDF8" />
                      ) : (
                        <Clock size={22} color="#F59E0B" />
                      )}
                    </View>

                    <View style={styles.trialInfoCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.trialTitleText}>{trial.title}</Text>
                      </View>
                      <Text style={styles.trialSubText}>{trial.subtitle}</Text>
                    </View>

                    <View style={styles.trialTargetPill}>
                      <Text style={styles.trialTargetText}>{trial.targetLabel}</Text>
                      <ArrowRight size={13} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Retreat Option */}
              <TouchableOpacity
                style={styles.retreatBtn}
                onPress={onDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.retreatBtnText}>[ RETREAT TO BASE (BARRIER REMAINS) ]</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#040103',
  },
  leftCrimsonRail: {
    position: 'absolute',
    left: 4,
    top: 40,
    bottom: 40,
    width: 2,
    backgroundColor: 'rgba(255, 30, 68, 0.4)',
  },
  rightCrimsonRail: {
    position: 'absolute',
    right: 4,
    top: 40,
    bottom: 40,
    width: 2,
    backgroundColor: 'rgba(255, 30, 68, 0.4)',
  },
  safeContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  threatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 30, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 30, 68, 0.3)',
  },
  threatBadgeText: {
    color: '#FF1E44',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  crimsonPanel: {
    width: '100%',
    backgroundColor: '#0A0306',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FF1E44',
    padding: 16,
    position: 'relative',
    gap: 14,
  },
  cornerBracket: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#FF1E44',
  },
  bracketTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  bracketTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bracketBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bracketBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  headerBox: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  dangerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 30, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF1E44',
  },
  dangerPillText: {
    color: '#FF1E44',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  threatTitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 4,
  },
  loreBodyText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  rewardsVaultCard: {
    backgroundColor: '#120509',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 30, 68, 0.35)',
    padding: 12,
    gap: 10,
  },
  vaultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  vaultTitleText: {
    color: '#FF1E44',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  vaultGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  vaultCol: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  vaultIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultValText: {
    color: '#00D2EE',
    fontSize: 14,
    fontWeight: '900',
  },
  vaultSubText: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  vaultDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  trialsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  trialsSectionTitle: {
    color: '#FF1E44',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  trialsList: {
    gap: 8,
  },
  trialCard: {
    backgroundColor: '#0F0408',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 30, 68, 0.25)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trialIconCol: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialInfoCol: {
    flex: 1,
    gap: 2,
  },
  trialTitleText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  trialSubText: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
  },
  trialTargetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FF1E44',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  trialTargetText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
  },
  retreatBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  retreatBtnText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
