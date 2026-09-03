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

class AdMobService {
  private isInitialized = false;
  private rewardedAd: RewardedAd | null = null;
  private interstitialAd: InterstitialAd | null = null;
  public isRewardedLoaded = false;
  public isInterstitialLoaded = false;
  private isRewardedLoading = false;
  private isInterstitialLoading = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized || Platform.OS !== 'android') return;
    try {
      await mobileAds().initialize();
      this.isInitialized = true;
      console.log('[AdMobService] Google Mobile Ads initialized successfully');
      this.preloadRewarded();
      this.preloadInterstitial();
    } catch (e) {
      console.warn('[AdMobService] Initialization note:', e);
    }
  }

  public preloadRewarded(useFallbackTestId = false) {
    if (this.isRewardedLoading) return;
    this.isRewardedLoading = true;

    const adUnitId = useFallbackTestId ? TestIds.REWARDED : PRODUCTION_REWARDED_ID;
    console.log(`[AdMobService] Preloading Rewarded Ad with unit: ${adUnitId}`);

    try {
      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.isRewardedLoaded = true;
        this.isRewardedLoading = false;
        console.log('[AdMobService] Rewarded Ad successfully LOADED and READY!');
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        this.isRewardedLoaded = false;
        this.isRewardedLoading = false;
        this.preloadRewarded();
      });

      this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.warn(`[AdMobService] Rewarded ad load error on ${adUnitId}:`, error);
        this.isRewardedLoaded = false;
        this.isRewardedLoading = false;

        // If production ad unit failed (e.g. Error code 3: No Fill for new account), fallback to Google Test Ad Unit!
        if (!useFallbackTestId) {
          console.log('[AdMobService] Falling back to Google Test Rewarded Ad Unit for 100% fill guarantee');
          this.preloadRewarded(true);
        }
      });

      this.rewardedAd.load();
    } catch (e) {
      this.isRewardedLoading = false;
      console.warn('[AdMobService] Preload rewarded exception:', e);
    }
  }

  public preloadInterstitial(useFallbackTestId = false) {
    if (this.isInterstitialLoading) return;
    this.isInterstitialLoading = true;

    const adUnitId = useFallbackTestId ? TestIds.INTERSTITIAL : PRODUCTION_INTERSTITIAL_ID;
    console.log(`[AdMobService] Preloading Interstitial Ad with unit: ${adUnitId}`);

    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isInterstitialLoaded = true;
        this.isInterstitialLoading = false;
        console.log('[AdMobService] Interstitial Ad successfully LOADED and READY!');
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.isInterstitialLoaded = false;
        this.isInterstitialLoading = false;
        this.preloadInterstitial();
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.warn(`[AdMobService] Interstitial ad load error on ${adUnitId}:`, error);
        this.isInterstitialLoaded = false;
        this.isInterstitialLoading = false;

        if (!useFallbackTestId) {
          console.log('[AdMobService] Falling back to Google Test Interstitial Ad Unit');
          this.preloadInterstitial(true);
        }
      });

      this.interstitialAd.load();
    } catch (e) {
      this.isInterstitialLoading = false;
      console.warn('[AdMobService] Preload interstitial exception:', e);
    }
  }

  public showRewardedAd(onRewardEarned: (coins: number) => void): boolean {
    if (!this.rewardedAd || !this.isRewardedLoaded) {
      this.preloadRewarded();
      return false;
    }

    try {
      const unsubscribeEarned = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
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
