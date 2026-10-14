import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Play,
  Pause,
  RotateCcw,
  TreePine,
  CloudRain,
  Headphones,
  Music,
  ShieldCheck,
} from 'lucide-react-native';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSound } from '../../src/hooks/useSound';
import { fontFamilies } from '../../src/theme/typography';
import { NeumorphicCard, NeumorphicCircleButton } from '../../src/components/ui/NeumorphicCard';
import { Icon3D } from '../../src/components/ui/Icon3D';

const { width } = Dimensions.get('window');

const FOCUS_CATEGORIES = ['Study', 'Work', 'Coding', 'Reading'] as const;

const AMBIENT_SOUNDS = [
  { id: 'forest', name: 'Forest', icon: TreePine },
  { id: 'rain', name: 'Rain', icon: CloudRain },
  { id: 'lofi', name: 'Lo-fi', icon: Music },
  { id: 'binaural', name: 'Binaural', icon: Headphones },
];

export default function FocusTabScreen() {
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F4EF" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>DEEP FOCUS</Text>
            <Text style={styles.screenSubtitle}>DISCIPLINE TODAY</Text>
          </View>
          <View style={styles.shieldActiveBadge}>
            <Icon3D name="shield_blue" size={18} />
            <Text style={styles.shieldActiveText}>SHIELD ACTIVE</Text>
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
                  isSelected && styles.categoryChipActive,
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
                    isSelected && styles.categoryChipTextActive,
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
          <View style={styles.timerOuterRing}>
            <View style={styles.timerInnerDisk}>
              <Text style={styles.timerDigitsText}>{formatTime(minutes, seconds)}</Text>
              <Text style={styles.timerCategoryLabel}>{selectedCategory.toUpperCase()} SPRINT</Text>
            </View>
          </View>
        </View>

        {/* Ambient Sounds Picker */}
        <NeumorphicCard style={styles.soundsSectionCard} padding={16}>
          <Text style={styles.sectionHeaderLabel}>AMBIENT SOUNDSCAPES</Text>
          <View style={styles.soundsRow}>
            {AMBIENT_SOUNDS.map((item) => {
              const isSelected = selectedSound === item.id;
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.soundBtn,
                    isSelected && styles.soundBtnActive,
                  ]}
                  onPress={() => {
                    haptics.light();
                    setSelectedSound(item.id);
                  }}
                  activeOpacity={0.8}
                >
                  <IconComp size={18} color={isSelected ? '#FFFFFF' : '#1A1A1A'} />
                  <Text
                    style={[
                      styles.soundBtnText,
                      isSelected && styles.soundBtnTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </NeumorphicCard>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.startFocusBtn, isActive && styles.startFocusBtnPause]}
          onPress={toggleTimer}
          activeOpacity={0.88}
        >
          {isActive ? (
            <View style={styles.btnContentRow}>
              <Pause size={18} color="#FFFFFF" />
              <Text style={styles.startFocusBtnText}>PAUSE SESSION</Text>
            </View>
          ) : (
            <View style={styles.btnContentRow}>
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.startFocusBtnText}>START FOCUS SHIELD</Text>
            </View>
          )}
        </TouchableOpacity>

        {isActive && (
          <TouchableOpacity style={styles.resetBtn} onPress={resetTimer} activeOpacity={0.8}>
            <RotateCcw size={14} color="#7A756D" />
            <Text style={styles.resetBtnText}>Reset Timer</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.mottoText}>"Focus on what matters. Discipline is destiny."</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F4EF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 18,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
  },
  screenTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 1.2,
  },
  screenSubtitle: {
    fontSize: 10,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
    letterSpacing: 1,
    marginTop: 2,
  },
  shieldActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  shieldActiveText: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: 0.8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    alignItems: 'center',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.bold,
  },
  timerCircleWrapper: {
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerOuterRing: {
    width: width * 0.68,
    height: width * 0.68,
    borderRadius: (width * 0.68) / 2,
    borderWidth: 5,
    borderColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  timerInnerDisk: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timerDigitsText: {
    fontSize: 48,
    fontFamily: fontFamilies.bold,
    color: '#1A1A1A',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  timerCategoryLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: '#E53935',
    letterSpacing: 1.4,
  },
  soundsSectionCard: {
    width: '100%',
    gap: 12,
  },
  sectionHeaderLabel: {
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
    letterSpacing: 1,
  },
  soundsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  soundBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F6F4EF',
    borderWidth: 1,
    borderColor: '#E8E4DC',
    alignItems: 'center',
    gap: 6,
  },
  soundBtnActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  soundBtnText: {
    fontSize: 11,
    fontFamily: fontFamilies.semiBold,
    color: '#7A756D',
  },
  soundBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.bold,
  },
  startFocusBtn: {
    width: '100%',
    height: 52,
    borderRadius: 22,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  startFocusBtnPause: {
    backgroundColor: '#1A1A1A',
    shadowColor: '#1A1A1A',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startFocusBtnText: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  resetBtnText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: '#7A756D',
  },
  mottoText: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
    color: '#7A756D',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
});
