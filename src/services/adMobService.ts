import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

// User's Real AdMob IDs from Console:
const PRODUCTION_REWARDED_ID = 'ca-app-pub-3502968689589307/7000667350';
const PRODUCTION_INTERSTITIAL_ID = 'ca-app-pub-3502968689589307/7702645984';

// Safety: In DEV mode, use Google Test IDs to prevent account ban!
const REWARDED_AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : PRODUCTION_REWARDED_ID;
const INTERSTITIAL_AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : PRODUCTION_INTERSTITIAL_ID;

class AdMobService {
  private isInitialized = false;
  private rewardedAd: RewardedAd | null = null;
  private interstitialAd: InterstitialAd | null = null;
  private isRewardedLoaded = false;
  private isInterstitialLoaded = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized || Platform.OS !== 'android') return;
    try {
      await mobileAds().initialize();
      this.isInitialized = true;
      this.preloadRewarded();
      this.preloadInterstitial();
      console.log('[AdMobService] Google Mobile Ads initialized successfully');
    } catch (e) {
      console.warn('[AdMobService] Initialization note:', e);
    }
  }

  public preloadRewarded() {
    try {
      this.rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.isRewardedLoaded = true;
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        this.isRewardedLoaded = false;
        this.preloadRewarded();
      });

      this.rewardedAd.load();
    } catch (e) {
      console.warn('[AdMobService] Preload rewarded note:', e);
    }
  }

  public preloadInterstitial() {
    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isInterstitialLoaded = true;
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.isInterstitialLoaded = false;
        this.preloadInterstitial();
      });

      this.interstitialAd.load();
    } catch (e) {
      console.warn('[AdMobService] Preload interstitial note:', e);
    }
  }

  public showRewardedAd(onRewardEarned: (coins: number) => void, onDismissed?: () => void): boolean {
    if (!this.rewardedAd || !this.isRewardedLoaded) {
      // If not yet loaded, trigger load and return false
      this.preloadRewarded();
      return false;
    }

    try {
      let earned = false;
      const unsubscribeEarned = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          earned = true;
          onRewardEarned(reward.amount || 50);
          unsubscribeEarned();
        }
      );

      this.rewardedAd.show();
      this.isRewardedLoaded = false;
      return true;
    } catch (e) {
      console.warn('[AdMobService] Show rewarded error:', e);
      return false;
    }
  }

  public showInterstitialAd(): boolean {
    if (!this.interstitialAd || !this.isInterstitialLoaded) {
      this.preloadInterstitial();
      return false;
    }

    try {
      this.interstitialAd.show();
      this.isInterstitialLoaded = false;
      return true;
    } catch (e) {
      console.warn('[AdMobService] Show interstitial error:', e);
      return false;
    }
  }
}

export const adMobService = new AdMobService();
