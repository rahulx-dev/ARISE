import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Bell, X, Sparkle, Trophy, Flame, ShieldWarning } from 'phosphor-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Daily Penalty Zone Active',
    desc: 'Complete today’s quests before midnight to prevent penalty lock.',
    time: '10m ago',
    icon: ShieldWarning,
    iconColor: '#E53935',
  },
  {
    id: '2',
    title: 'Streak Preserved!',
    desc: 'You logged in and maintained your 5-day awakening streak.',
    time: '2h ago',
    icon: Flame,
    iconColor: '#F59E0B',
  },
  {
    id: '3',
    title: 'D-Rank Dungeon Open',
    desc: 'The Inferno Gate is now accessible for your level.',
    time: '5h ago',
    icon: Trophy,
    iconColor: '#0A84FF',
  },
];

export const NotificationSheet: React.FC<NotificationSheetProps> = ({ isOpen, onClose }) => {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Bell size={20} color={colors.primary} weight="fill" />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                onClose();
              }}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#1F2430' : '#F3F4F6' }]}
            >
              <X size={16} color={colors.textSecondary} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {SAMPLE_NOTIFICATIONS.map((item) => {
              const IconComp = item.icon;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.notifCard,
                    { backgroundColor: isDark ? '#161922' : '#F9FAFB', borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: `${item.iconColor}15` }]}>
                    <IconComp size={20} color={item.iconColor} weight="fill" />
                  </View>
                  <View style={styles.textWrapper}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.timeText, { color: colors.textMuted }]}>{item.time}</Text>
                    </View>
                    <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: Dimensions.get('window').height * 0.7,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notifDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
