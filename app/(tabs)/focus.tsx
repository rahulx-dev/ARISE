import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  TreePine,
  CloudRain,
  Headphones,
  Music,
  Shield,
  ShieldCheck,
  Flame,
  Check,
} from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';

const { width } = Dimensions.get('window');

const FOCUS_CATEGORIES = ['Study', 'Work', 'Coding', 'Reading'] as const;

const AMBIENT_SOUNDS = [
  { id: 'forest', name: 'Forest', icon: TreePine },
  { id: 'rain', name: 'Rain', icon: CloudRain },
  { id: 'lofi', name: 'Lo-fi', icon: Music },
  { id: 'binaural', name: 'Binaural', icon: Headphones },
];

export default function FocusTabScreen() {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();
  const [selectedCategory, setSelectedCategory] = useState<typeof FOCUS_CATEGORIES[number]>('Study');
  const [selectedSound, setSelectedSound] = useState<string>('forest');
  const [minutes, setMinutes] = useState<number>(25);
  const [seconds, setSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds((s) => s - 1);
        } else if (minutes > 0) {
          setMinutes((m) => m - 1);
          setSeconds(59);
        } else {
          setIsActive(false);
          sound.play('level_up');
          haptics.success();
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  const toggleTimer = () => {
    haptics.medium();
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    haptics.light();
    setIsActive(false);
    setMinutes(25);
    setSeconds(0);
  };

  const formatTime = (min: number, sec: number) => {
    const m = min < 10 ? `0${min}` : `${min}`;
    const s = sec < 10 ? `0${sec}` : `${sec}`;
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Deep Focus</Text>
          <View style={styles.shieldActiveBadge}>
            <ShieldCheck size={14} color="#10B981" />
            <Text style={styles.shieldActiveText}>Shield Active</Text>
          </View>
        </View>

        {/* Category Chips */}
        <View style={styles.categoryRow}>
          {FOCUS_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  { backgroundColor: isSelected ? colors.primary : colors.card, borderColor: isSelected ? colors.primary : colors.border },
                ]}
                onPress={() => {
                  haptics.light();
                  setSelectedCategory(cat);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Giant Circular Focus Timer */}
        <View style={styles.timerCircleWrapper}>
          <View style={[styles.timerOuterRing, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={styles.timerInnerDisk}>
              <Text style={[styles.timerDigitsText, { color: colors.textPrimary }]}>{formatTime(minutes, seconds)}</Text>
              <Text style={[styles.timerCategoryLabel, { color: colors.primary }]}>{selectedCategory.toUpperCase()} SPRINT</Text>
            </View>
          </View>
        </View>

        {/* Ambient Sounds Picker */}
        <View style={styles.soundsSection}>
          <Text style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}>AMBIENT SOUNDSCAPES</Text>
          <View style={styles.soundsRow}>
            {AMBIENT_SOUNDS.map((item) => {
              const isSelected = selectedSound === item.id;
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.soundBtn,
                    { backgroundColor: isSelected ? colors.primary : colors.card, borderColor: isSelected ? colors.primary : colors.border },
                  ]}
                  onPress={() => {
                    haptics.light();
                    setSelectedSound(item.id);
                  }}
                  activeOpacity={0.8}
                >
                  <IconComp size={20} color={isSelected ? '#FFFFFF' : colors.textSecondary} />
                  <Text
                    style={[
                      styles.soundBtnText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.startFocusBtn, isActive && styles.startFocusBtnPause]}
          onPress={toggleTimer}
          activeOpacity={0.85}
        >
          {isActive ? (
            <View style={styles.btnContentRow}>
              <Pause size={18} color="#FFFFFF" />
              <Text style={styles.startFocusBtnText}>Pause Session</Text>
            </View>
          ) : (
            <View style={styles.btnContentRow}>
              <Play size={18} color="#FFFFFF" />
              <Text style={styles.startFocusBtnText}>Start Focus Shield</Text>
            </View>
          )}
        </TouchableOpacity>

        {isActive && (
          <TouchableOpacity style={styles.resetBtn} onPress={resetTimer} activeOpacity={0.8}>
            <RotateCcw size={14} color="#6B7280" />
            <Text style={styles.resetBtnText}>Reset Timer</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.mottoText}>"Focus on what matters. Discipline is destiny."</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 20, gap: 20, alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#111827',
  },
  shieldActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  shieldActiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  timerCircleWrapper: {
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerOuterRing: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: (width * 0.65) / 2,
    borderWidth: 6,
    borderColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  timerInnerDisk: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  timerDigitsText: {
    fontSize: 44,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -1,
  },
  timerCategoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E53935',
    letterSpacing: 1.2,
  },
  soundsSection: {
    width: '100%',
    gap: 10,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  soundsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  soundBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 6,
  },
  soundBtnActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  soundBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  soundBtnTextActive: {
    color: '#FFFFFF',
  },
  startFocusBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  startFocusBtnPause: {
    backgroundColor: '#111827',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startFocusBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  mottoText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
