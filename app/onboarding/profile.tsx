import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Triangle, User } from 'lucide-react-native';
import { MasterCard } from '../../src/components/master/MasterCard';
import { MasterButton } from '../../src/components/master/MasterButton';
import { PlayerAvatar } from '../../src/components/ui/PlayerAvatar';
import { AvatarPicker } from '../../src/components/profile/AvatarPicker';
import { usePlayerStore } from '../../src/stores/usePlayerStore';
import { userRepository } from '../../src/database/repositories/userRepository';
import { voiceCoach } from '../../src/services/voiceCoach';
import { useSound } from '../../src/hooks/useSound';
import { useHaptics } from '../../src/hooks/useHaptics';
import { colors } from '../../src/theme/colors';

import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { setIsOnboardingCompletedSync } from '../../src/services/appStateService';

export default function ProfileCreateScreen() {
  const router = useRouter();
  const sound = useSound();
  const haptics = useHaptics();
  const loadProfile = usePlayerStore((s) => s.loadProfile);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);

  const [name, setName] = useState('Warrior');
  const [selectedIconId, setSelectedIconId] = useState('user');
  const [selectedColor, setSelectedColor] = useState<string>(colors.primary);
  const [selectedGoal, setSelectedGoal] = useState<'discipline' | 'strength' | 'focus'>('discipline');

  const handleCreateProfile = async () => {
    if (!name.trim()) return;

    haptics.heavy();
    sound.play('quest_complete');

    try {
      await userRepository.updateProfile({
        displayName: name.trim(),
      });
      await loadProfile();
      await setOnboardingCompleted();
      setIsOnboardingCompletedSync(true);

      voiceCoach.speak(`Welcome ${name.trim()}! Your ARISE discipline protocol is online. Let's begin!`);

      router.replace('/(tabs)');
    } catch (e) {
      console.error('Error creating profile:', e);
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Brand Logo */}
            <View style={styles.topBrandRow}>
              <Triangle size={18} color={colors.textPrimary} fill={colors.textPrimary} />
              <Text style={styles.brandTitle}>ARISE V1</Text>
            </View>

            {/* Live Avatar Preview */}
            <View style={styles.previewContainer}>
              <PlayerAvatar
                iconId={selectedIconId}
                glowColor={selectedColor}
                size={84}
              />
              <Text style={styles.previewName}>{name || 'Warrior'}</Text>
              <View style={[styles.previewBadge, { borderColor: `${selectedColor}40` }]}>
                <Text style={[styles.previewBadgeText, { color: selectedColor }]}>Level 1 Novice</Text>
              </View>
            </View>

            {/* Profile Setup Card */}
            <MasterCard style={styles.setupCard}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>YOUR CODENAME / NAME</Text>
                <View style={styles.inputWrap}>
                  <User size={18} color={selectedColor} />
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name..."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Free Avatar & Color Picker */}
              <AvatarPicker
                selectedIconId={selectedIconId}
                selectedColor={selectedColor}
                onSelectIcon={setSelectedIconId}
                onSelectColor={setSelectedColor}
              />

              {/* Primary Green Gradient Button */}
              <MasterButton
                title="INITIALIZE PROTOCOL"
                onPress={handleCreateProfile}
                variant="green"
                showArrow
                style={{ marginTop: 12 }}
              />
            </MasterCard>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 16,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  previewContainer: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  previewBadge: {
    backgroundColor: '#161616',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  setupCard: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
