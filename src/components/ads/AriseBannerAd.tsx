import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// User's Real Production AdMob Banner ID:
const PRODUCTION_BANNER_ID = 'ca-app-pub-3502968689589307/3162228180';

interface AriseBannerAdProps {
  style?: any;
}

export function AriseBannerAd({ style }: AriseBannerAdProps) {
  const [unitId, setUnitId] = useState<string>(PRODUCTION_BANNER_ID || TestIds.BANNER);
  const [adLoaded, setAdLoaded] = useState<boolean>(false);
  const [failedBoth, setFailedBoth] = useState<boolean>(false);

  if (Platform.OS !== 'android' || failedBoth) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          setAdLoaded(true);
        }}
        onAdFailedToLoad={(error) => {
          console.warn(`[AriseBannerAd] Banner failed to load with ID (${unitId}):`, error);
          if (unitId !== TestIds.BANNER) {
            console.log('[AriseBannerAd] Switching to Google AdMob Test Banner for verification');
            setUnitId(TestIds.BANNER);
          } else {
            setFailedBoth(true);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    width: '100%',
    minHeight: 50,
  },
});
