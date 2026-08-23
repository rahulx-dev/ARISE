import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Settings,
  Shield,
  Smartphone,
  HelpCircle,
  Info,
  ChevronRight,
  Download,
  Palette,
  X,
} from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { AvatarPicker } from '../../src/components/profile/AvatarPicker';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { backupService } from '../../src/services/backupService';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

export default function ProfileTab() {
  const profile = usePlayerStore((s) => s.profile);
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const haptics = useHaptics();

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [currentIconId, setCurrentIconId] = useState('user');
  const [currentColor, setCurrentColor] = useState<string>(colors.primary);

  useEffect(() => {
    loadProfile();
  }, []);

  const level = profile?.level || 1;
  const displayName = profile?.displayName || 'Warrior';
  const currentXP = profile?.currentXP || 0;
  const targetXP = level * 100;
  const xpPercent = Math.min(100, Math.round((currentXP / targetXP) * 100));

  const handleExportBackup = async () => {
    haptics.medium();
    const success = await backupService.exportBackup();
    if (success) {
      haptics.success();
    } else {
      Alert.alert('Export Failed', 'Could not create offline backup file.');
    }
  };

  const menuItems = [
    {
      title: 'Customize Avatar & Aura',
      icon: Palette,
      action: () => setIsPickerVisible(true),
    },
    {
      title: 'Settings',
      icon: Settings,
      action: () => router.push('/settings'),
    },
    {
      title: 'Permissions',
      icon: Shield,
      action: () => router.push('/permissions' as any),
    },
    {
      title: 'Blocked Apps',
      icon: Smartphone,
      action: () => router.push('/settings/apps'),
    },
    {
      title: 'Help & Support',
      icon: HelpCircle,
      action: () =>
        Alert.alert(
          'Help & Support',
          'ARISE is a 100% offline self-discipline engine. Perform physical exercise and focus sprints to earn screen time tokens.'
        ),
    },
    {
      title: 'About ARISE',
      icon: Info,
      action: () =>
        Alert.alert(
          'About ARISE V1',
          'ARISE Engine v1.0.0\n100% Offline Hardware-Accelerated Discipline System.\nBuilt with Expo SDK 54 & React Native 0.81.'
        ),
    },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Profile Card */}
          <MasterCard style={styles.profileHeroCard}>
            <View style={styles.avatarRow}>
              <TouchableOpacity
                onPress={() => setIsPickerVisible(true)}
                activeOpacity={0.8}
              >
                <PlayerAvatar
                  iconId={currentIconId}
                  glowColor={currentColor}
                  size={72}
                />
              </TouchableOpacity>

              <View style={styles.profileMeta}>
                <View style={styles.levelRow}>
                  <Text style={styles.levelTitle}>{displayName}</Text>
                  <View style={styles.noviceBadge}>
                    <Text style={styles.noviceBadgeText}>Level {level}</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.xpBarTrack}>
                  <View
                    style={[
                      styles.xpBarFill,
                      { width: `${Math.max(5, xpPercent)}%`, backgroundColor: currentColor },
                    ]}
                  />
                </View>
                <Text style={styles.xpLabelText}>{currentXP} / {targetXP} XP</Text>
              </View>
            </View>
          </MasterCard>

          {/* Menu Items List */}
          <View style={styles.menuList}>
            {menuItems.map((item) => {
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.title}
                  style={styles.menuRow}
                  onPress={item.action}
                  activeOpacity={0.8}
                >
                  <View style={styles.menuLeft}>
                    <IconComp size={20} color={colors.textSecondary} />
                    <Text style={styles.menuTitle}>{item.title}</Text>
                  </View>

                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Avatar Icon Selector Modal */}
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Avatar Icon & Aura</Text>
              <TouchableOpacity
                onPress={() => setIsPickerVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalPreview}>
                <PlayerAvatar
                  iconId={currentIconId}
                  glowColor={currentColor}
                  size={76}
                />
              </View>

              <AvatarPicker
                selectedIconId={currentIconId}
                selectedColor={currentColor}
                onSelectIcon={setCurrentIconId}
                onSelectColor={setCurrentColor}
              />

              <MasterButton
                title="APPLY AVATAR"
                onPress={() => {
                  haptics.success();
                  setIsPickerVisible(false);
                }}
                variant="green"
                style={{ marginTop: 16 }}
              />
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 20,
    paddingTop: 4,
  },
  profileHeroCard: {
    padding: 18,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileMeta: {
    flex: 1,
    gap: 4,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  noviceBadge: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  noviceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  xpBarTrack: {
    height: 6,
    backgroundColor: '#262626',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
  },
  menuList: {
    backgroundColor: '#141414',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  modalPreview: {
    alignItems: 'center',
    marginVertical: 10,
  },
});
