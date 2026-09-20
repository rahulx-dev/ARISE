import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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

// Tab Animated Icon Component (Plays once on tab focus)
function TabAnimatedIcon({
  animationSource,
  fallbackIcon: FallbackIcon,
  focused,
  color,
  size = 28,
}: {
  animationSource?: any;
  fallbackIcon: any;
  focused: boolean;
  color: string;
  size?: number;
}) {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (focused) {
      lottieRef.current?.reset();
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [focused]);

  return (
    <View style={styles.iconContainer}>
      {animationSource ? (
        <LottieView
          ref={lottieRef}
          source={animationSource}
          autoPlay={false}
          loop={false}
          style={{ width: size, height: size }}
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

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          haptics.light();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1F222E' : '#EEEEEE',
          height: 62 + (insets.bottom > 0 ? insets.bottom : 8),
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
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: -0.2,
          marginTop: 2,
        },
      }}
    >
      {/* 1. HOME TAB */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/home.json')}
              fallbackIcon={House}
              focused={focused}
              color={color}
              size={28}
            />
          ),
        }}
      />

      {/* 2. QUESTS TAB */}
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/icons8-thunder.json')}
              fallbackIcon={Lightning}
              focused={focused}
              color={color}
              size={28}
            />
          ),
        }}
      />

      {/* 3. DUNGEON / GATES TAB */}
      <Tabs.Screen
        name="gates"
        options={{
          title: 'Dungeon',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/trophy.json')}
              fallbackIcon={Trophy}
              focused={focused}
              color={color}
              size={28}
            />
          ),
        }}
      />

      {/* 4. GYM TRAINING TAB */}
      <Tabs.Screen
        name="gym"
        options={{
          title: 'Gym',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/gym.json')}
              fallbackIcon={Barbell}
              focused={focused}
              color={color}
              size={28}
            />
          ),
        }}
      />

      {/* 5. PROFILE / WARRIOR TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/profile.json')}
              fallbackIcon={User}
              focused={focused}
              color={color}
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
    height: 32,
    position: 'relative',
  },
  activeIndicator: {
    width: 16,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#E53935',
    marginTop: 2,
  },
});
