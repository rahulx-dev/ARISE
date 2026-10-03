import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../src/hooks/useTheme';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // Check if this unmatched route was actually an OAuth callback
    Linking.getInitialURL().then((url) => {
      const fullUrl = url || '';
      if (
        fullUrl.includes('auth/callback') ||
        fullUrl.includes('access_token') ||
        fullUrl.includes('code=') ||
        pathname?.includes('callback')
      ) {
        router.replace({
          pathname: '/auth/callback' as any,
          params: params as any,
        });
      }
    }).catch(() => {});
  }, [pathname, params, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <ShieldAlert size={44} color="#0A84FF" />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>DIMENSIONAL RIFT</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Hunter position lost in uncharted coordinates. Return to Hunter Headquarters.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Return to Hunter Headquarters</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  button: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 100,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
