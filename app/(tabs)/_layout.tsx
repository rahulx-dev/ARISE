import React, { useRef, useEffect, useState } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import {
  House,
  Lightning,
  Barbell,
  User,
  Trophy,
} from 'phosphor-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { fontFamilies } from '../../src/theme/typography';
import { useTranslation } from '../../src/services/i18n';

// Tab Icon Component (Maintains perfect 1:1 square aspect ratio - zero squish/distortion)
function TabAnimatedIcon({
  animationSource,
  darkImageSource,
  fallbackIcon: FallbackIcon,
  focused,
  color,
  isDark,
  playTrigger,
  size = 28,
}: {
  animationSource?: any;
  darkImageSource?: any;
  fallbackIcon: any;
  focused: boolean;
  color: string;
  isDark: boolean;
  playTrigger?: number;
  size?: number;
}) {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (focused && !isDark && animationSource) {
      lottieRef.current?.reset();
      lottieRef.current?.play();
    } else if (!focused) {
      lottieRef.current?.reset();
    }
  }, [focused, isDark, playTrigger, animationSource]);

  return (
    <View style={styles.iconContainer}>
      {isDark && darkImageSource ? (
        <Image
          source={darkImageSource}
          style={[
            styles.imageIcon,
            {
              width: size,
              height: size,
              opacity: focused ? 1 : 0.65,
              transform: [{ scale: focused ? 1.05 : 0.95 }],
            },
          ]}
        />
      ) : animationSource ? (
        <LottieView
          ref={lottieRef}
          source={animationSource}
          autoPlay={false}
          loop={false}
          style={[styles.lottieIcon, { width: size, height: size }]}
        />
      ) : (
        <FallbackIcon
          size={24}
          color={focused ? '#E53935' : color}
          weight={focused ? 'fill' : 'regular'}
        />
      )}
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const { t } = useTranslation();

  // State to trigger animation play on every click/tap
  const [tabTapState, setTabTapState] = useState<{ tab: string; time: number }>({
    tab: 'index',
    time: Date.now(),
  });

  return (
    <Tabs
      screenListeners={({ route }) => ({
        tabPress: () => {
          haptics.light();
          setTabTapState({ tab: route.name, time: Date.now() });
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1F222E' : '#EEEEEE',
          height: 64 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: '#E53935',
        tabBarInactiveTintColor: isDark ? '#8E8E93' : '#6B7280',
        tabBarLabelStyle: {
          fontFamily: fontFamilies.medium,
          fontSize: 10.5,
          fontWeight: '500',
          letterSpacing: 0.1,
          marginTop: 3,
        },
      }}
    >
      {/* 1. HOME TAB */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome', 'Home'),
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/home.json')}
              darkImageSource={require('../../assets/dark theme nav/home.png')}
              fallbackIcon={House}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'index' ? tabTapState.time : undefined}
              size={28}
            />
          ),
        }}
      />

      {/* 2. QUESTS TAB */}
      <Tabs.Screen
        name="quests"
        options={{
          title: t('tabQuests', 'Quests'),
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/icons8-thunder.json')}
              darkImageSource={require('../../assets/dark theme nav/quest.png')}
              fallbackIcon={Lightning}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'quests' ? tabTapState.time : undefined}
              size={28}
            />
          ),
        }}
      />

      {/* 3. DUNGEON / GATES TAB */}
      <Tabs.Screen
        name="gates"
        options={{
          title: t('tabDungeon', 'Dungeon'),
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/trophy.json')}
              darkImageSource={require('../../assets/dark theme nav/sword.png')}
              fallbackIcon={Trophy}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'gates' ? tabTapState.time : undefined}
              size={28}
            />
          ),
        }}
      />

      {/* 4. GYM TRAINING TAB */}
      <Tabs.Screen
        name="gym"
        options={{
          title: t('tabGym', 'Gym'),
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/gym.json')}
              darkImageSource={require('../../assets/dark theme nav/gym.png')}
              fallbackIcon={Barbell}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'gym' ? tabTapState.time : undefined}
              size={28}
            />
          ),
        }}
      />

      {/* 5. PROFILE / WARRIOR TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile', 'Profile'),
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/profile.json')}
              darkImageSource={require('../../assets/dark theme nav/profile.png')}
              fallbackIcon={User}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'profile' ? tabTapState.time : undefined}
              size={28}
            />
          ),
        }}
      />

      {/* HIDDEN / SUB TABS */}
      <Tabs.Screen
        name="focus"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 34,
    position: 'relative',
  },
  lottieIcon: {
    aspectRatio: 1,
    alignSelf: 'center',
  },
  imageIcon: {
    aspectRatio: 1,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -3,
    width: 16,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#E53935',
  },
});
