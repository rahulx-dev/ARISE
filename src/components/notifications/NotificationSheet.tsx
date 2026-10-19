import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Shield,
  Flame,
  Swords,
  Crown,
  Trophy,
  Sparkles,
  Clock,
  Check,
  ChevronRight,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { notificationService, AppNotification } from '../../services/notificationService';
import { showIOSAlert } from '../ios/IOSAlertModal';
import { fontFamilies } from '../../theme/typography';

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'ALL' | 'UNREAD' | 'QUEST' | 'SYSTEM';

export const NotificationSheet: React.FC<NotificationSheetProps> = ({ isOpen, onClose }) => {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      await notificationService.seedDefaultNotificationsIfEmpty();
      const list = await notificationService.getNotifications(40);
      setNotifications(list);
    } catch (e) {
      console.warn('Error loading notifications:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'UNREAD':
        return notifications.filter((n) => !n.isRead);
      case 'QUEST':
        return notifications.filter((n) => n.type === 'QUEST' || n.type === 'REWARD');
      case 'SYSTEM':
        return notifications.filter((n) => n.type === 'SYSTEM' || n.type === 'MOTIVATION' || n.type === 'STREAK');
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const handleMarkAsRead = async (id: number) => {
    haptics.light();
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    await notificationService.markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    haptics.medium();
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    await notificationService.markAllAsRead();
  };

  const handleClearAll = async () => {
    // M31: one-tap Clear-all with no confirm and no undo deleted every
    // notification. Confirm first.
    if (notifications.length === 0) return;
    showIOSAlert('Clear all notifications?', `Delete all ${notifications.length} notifications? This cannot be undone.`, [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'CLEAR ALL',
        style: 'destructive',
        onPress: async () => {
          haptics.warning();
          setNotifications([]);
          await notificationService.clearAllNotifications();
        },
      },
    ]);
  };

  const formatTimeAgo = (isoString: string): string => {
    try {
      const past = new Date(isoString).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'QUEST':
        return {
          icon: Swords,
          color: '#0A84FF',
          bg: isDark ? 'rgba(10, 132, 255, 0.15)' : '#EFF6FF',
          badge: 'QUEST',
        };
      case 'STREAK':
        return {
          icon: Flame,
          color: '#EA580C',
          bg: isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFF7ED',
          badge: 'STREAK',
        };
      case 'MOTIVATION':
        return {
          icon: Crown,
          color: '#A855F7',
          bg: isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF',
          badge: 'MONARCH',
        };
      case 'REWARD':
        return {
          icon: Trophy,
          color: '#F59E0B',
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEFCE8',
          badge: 'REWARD',
        };
      case 'FOCUS':
        return {
          icon: Zap,
          color: '#10B981',
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
          badge: 'SHIELD',
        };
      default:
        return {
          icon: Shield,
          color: '#00D2EE',
          bg: isDark ? 'rgba(0, 210, 238, 0.15)' : '#F0FDFA',
          badge: 'SYSTEM',
        };
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#0C0D14' : '#FFFFFF',
              borderColor: isDark ? '#1C1F2E' : '#E2E8F0',
            },
          ]}
        >
          {/* 1. Header Row */}
          <View
            style={[
              styles.header,
              { borderBottomColor: isDark ? '#1C1F2E' : '#F1F5F9' },
            ]}
          >
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconCircle, { backgroundColor: isDark ? '#161926' : '#EFF6FF' }]}>
                <Bell size={20} color="#0A84FF" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    SYSTEM NOTIFICATIONS
                  </Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount} NEW</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.headerSubtitle, { color: isDark ? '#8E8E93' : '#64748B' }]}>
                  Monarch Directive Registry
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                haptics.light();
                onClose();
              }}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? '#181A26' : '#F1F5F9' },
              ]}
              activeOpacity={0.8}
            >
              <X size={18} color={isDark ? '#8E8E93' : '#64748B'} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* 2. Controls & Filters Row */}
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {[
                { key: 'ALL' as FilterType, label: 'All' },
                { key: 'UNREAD' as FilterType, label: `Unread (${unreadCount})` },
                { key: 'QUEST' as FilterType, label: 'Quests' },
                { key: 'SYSTEM' as FilterType, label: 'Directives' },
              ].map((f) => {
                const isSelected = activeFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected
                          ? '#0A84FF'
                          : isDark
                          ? '#151724'
                          : '#F1F5F9',
                        borderColor: isSelected
                          ? '#0A84FF'
                          : isDark
                          ? '#222538'
                          : '#E2E8F0',
                      },
                    ]}
                    onPress={() => {
                      haptics.light();
                      setActiveFilter(f.key);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isSelected ? '#FFFFFF' : isDark ? '#8E8E93' : '#64748B' },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quick Action Buttons */}
            {notifications.length > 0 && (
              <View style={styles.quickActionsRow}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.actionPillBtn}
                    onPress={handleMarkAllAsRead}
                    activeOpacity={0.75}
                  >
                    <CheckCheck size={14} color="#0A84FF" />
                    <Text style={styles.actionPillText}>Read all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={handleClearAll}
                  activeOpacity={0.75}
                >
                  <Trash2 size={13} color={isDark ? '#8E8E93' : '#94A3B8'} />
                  <Text style={[styles.actionPillText, { color: isDark ? '#8E8E93' : '#94A3B8' }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 3. Notification List */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0A84FF" />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Synchronizing Monarch conduit...
                </Text>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#141624' : '#F8FAFC' }]}>
                  <Sparkles size={36} color="#0A84FF" />
                </View>
                <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  ALL DIRECTIVES CLEARED
                </Text>
                <Text style={[styles.emptySubtitle, { color: isDark ? '#8E8E93' : '#64748B' }]}>
                  The System is silent. Stand by for the next dimensional awakening.
                </Text>
              </View>
            ) : (
              filteredNotifications.map((item) => {
                const meta = getTypeMeta(item.type);
                const IconComp = meta.icon;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.notifCard,
                      {
                        backgroundColor: isDark
                          ? item.isRead
                            ? '#11131E'
                            : '#161928'
                          : item.isRead
                          ? '#FAFAFC'
                          : '#FFFFFF',
                        borderColor: item.isRead
                          ? isDark
                            ? '#1B1E2E'
                            : '#F1F5F9'
                          : isDark
                          ? '#0A84FF40'
                          : '#BFDBFE',
                      },
                    ]}
                    onPress={() => !item.isRead && handleMarkAsRead(item.id)}
                    activeOpacity={0.85}
                  >
                    {/* Left Icon Badge */}
                    <View style={[styles.iconWrapper, { backgroundColor: meta.bg }]}>
                      <IconComp size={20} color={meta.color} />
                    </View>

                    {/* Middle Content */}
                    <View style={styles.textWrapper}>
                      <View style={styles.titleRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <View style={[styles.tagPill, { backgroundColor: meta.bg }]}>
                            <Text style={[styles.tagText, { color: meta.color }]}>{meta.badge}</Text>
                          </View>
                          <Text
                            style={[
                              styles.notifTitle,
                              {
                                color: isDark ? '#FFFFFF' : '#0F172A',
                                fontWeight: item.isRead ? '600' : '800',
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                        </View>
                        <Text style={[styles.timeText, { color: isDark ? '#8E8E93' : '#94A3B8' }]}>
                          {formatTimeAgo(item.timestamp)}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.notifDesc,
                          {
                            color: item.isRead
                              ? isDark
                                ? '#8E8E93'
                                : '#64748B'
                              : isDark
                              ? '#D1D5DB'
                              : '#334155',
                          },
                        ]}
                      >
                        {item.message}
                      </Text>
                    </View>

                    {/* Right Unread Indicator */}
                    {!item.isRead && (
                      <View style={styles.unreadGlowDot} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: Dimensions.get('window').height * 0.82,
    paddingBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unreadBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actionPillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#0A84FF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  emptySubtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    gap: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  notifTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    flex: 1,
  },
  timeText: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  notifDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  unreadGlowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0A84FF',
    alignSelf: 'center',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
});
