import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  Coins,
  ShieldCheck,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ios/GlassCard';
import { payoutRepository, PayoutRequestItem } from '../../src/database/repositories/payoutRepository';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { colors } from '../../src/theme/colors';

export default function AdminPayoutsScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const sound = useSound();

  const [pendingRequests, setPendingRequests] = useState<PayoutRequestItem[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadRequests = async () => {
    const list = await payoutRepository.getAllPendingRequests();
    setPendingRequests(list);
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  const handleCopyUpi = (id: number, upiId: string) => {
    Clipboard.setString(upiId);
    haptics.light();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    Alert.alert('Copied! 📋', `UPI ID "${upiId}" copied to clipboard.\nPaste in PhonePe/GPay to transfer.`);
  };

  const handleMarkAsPaid = async (item: PayoutRequestItem) => {
    Alert.alert(
      'Confirm Payment',
      `Have you transferred ₹${item.amountInr} to ${item.upiId} via UPI?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark as Paid',
          style: 'default',
          onPress: async () => {
            haptics.success();
            sound.play('quest_complete');
            await payoutRepository.markAsPaid(item.id);
            await loadRequests();
          },
        },
      ]
    );
  };

  const handleReject = async (item: PayoutRequestItem) => {
    Alert.alert(
      'Reject Request',
      `Reject this request and refund ${item.coinsSpent.toLocaleString()} coins back to user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Refund',
          style: 'destructive',
          onPress: async () => {
            haptics.warning();
            await payoutRepository.markAsRejected(item.id, true);
            await loadRequests();
          },
        },
      ]
    );
  };

  const totalPendingInr = pendingRequests.reduce((sum, r) => sum + r.amountInr, 0);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Admin Payout Manager</Text>
            <Text style={styles.headerSub}>Verify & Transfer User Withdrawals</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary Metric Card */}
          <GlassCard variant="elevated" style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryIconWrap}>
                <Banknote size={24} color="#F59E0B" />
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingRequests.length} PENDING</Text>
              </View>
            </View>
            <Text style={styles.summaryAmount}>₹{totalPendingInr}</Text>
            <Text style={styles.summarySub}>Total pending payouts to transfer via UPI</Text>
          </GlassCard>

          {/* Pending List */}
          <Text style={styles.sectionTitle}>Pending Requests</Text>

          {pendingRequests.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <ShieldCheck size={40} color="#10B981" />
              <Text style={styles.emptyTitle}>All Payouts Cleared! 🎉</Text>
              <Text style={styles.emptySub}>No pending withdrawal requests from users.</Text>
            </GlassCard>
          ) : (
            pendingRequests.map((item) => (
              <GlassCard key={item.id} variant="elevated" style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View>
                    <Text style={styles.requestAmount}>₹{item.amountInr}.00</Text>
                    <Text style={styles.requestMeta}>
                      Coins Deducted: {item.coinsSpent.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Clock size={12} color="#F59E0B" />
                    <Text style={styles.statusPillText}>PENDING</Text>
                  </View>
                </View>

                {/* UPI Box */}
                <View style={styles.upiBox}>
                  <Text style={styles.upiLabel}>USER UPI ID</Text>
                  <View style={styles.upiRow}>
                    <Text style={styles.upiText} numberOfLines={1}>{item.upiId}</Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => handleCopyUpi(item.id, item.upiId)}
                      activeOpacity={0.8}
                    >
                      <Copy size={14} color="#0A84FF" />
                      <Text style={styles.copyBtnText}>
                        {copiedId === item.id ? 'COPIED' : 'COPY'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.requestDate}>
                  Requested: {new Date(item.createdAt).toLocaleString()}
                </Text>

                {/* Actions */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(item)}
                    activeOpacity={0.8}
                  >
                    <XCircle size={16} color="#EF4444" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => handleMarkAsPaid(item)}
                    activeOpacity={0.85}
                  >
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.payBtnText}>MARK AS PAID</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1E2A',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#1C1E2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 22,
    gap: 10,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.6,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  summarySub: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
  emptyCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emptySub: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  requestCard: {
    padding: 18,
    borderRadius: 20,
    gap: 12,
    backgroundColor: '#111218',
    borderWidth: 1,
    borderColor: '#1C1E2A',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  requestMeta: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  upiBox: {
    backgroundColor: '#161822',
    padding: 12,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#232638',
  },
  upiLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8E8E93',
    letterSpacing: 1,
  },
  upiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upiText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A84FF',
    flex: 1,
    marginRight: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  requestDate: {
    fontSize: 10,
    color: '#555866',
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1F1418',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  payBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  payBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
