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
  private rewardedAdUnitId: string = PRODUCTION_REWARDED_ID || TestIds.REWARDED;
  private interstitialAdUnitId: string = PRODUCTION_INTERSTITIAL_ID || TestIds.INTERSTITIAL;

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

  public preloadRewarded() {
    if (this.isRewardedLoading) return;
    this.isRewardedLoading = true;

    const adUnitId = this.rewardedAdUnitId;
    console.log(`[AdMobService] Preloading Rewarded Ad: ${adUnitId}`);

    try {
      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.isRewardedLoaded = true;
        this.isRewardedLoading = false;
        console.log('[AdMobService] Rewarded Ad LOADED successfully!');
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
        // Fallback to test ID if production ad unit failed (e.g. error code 3 no fill on pre-launch)
        if (this.rewardedAdUnitId !== TestIds.REWARDED) {
          console.log('[AdMobService] Switching to Test Rewarded Ad Unit');
          this.rewardedAdUnitId = TestIds.REWARDED;
          setTimeout(() => this.preloadRewarded(), 1000);
        }
      });

      this.rewardedAd.load();
    } catch (e) {
      this.isRewardedLoading = false;
      console.warn('[AdMobService] Preload rewarded exception:', e);
    }
  }

  public preloadInterstitial() {
    if (this.isInterstitialLoading) return;
    this.isInterstitialLoading = true;

    const adUnitId = this.interstitialAdUnitId;
    console.log(`[AdMobService] Preloading Interstitial Ad: ${adUnitId}`);

    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isInterstitialLoaded = true;
        this.isInterstitialLoading = false;
        console.log('[AdMobService] Interstitial Ad LOADED successfully!');
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
        // Fallback to test ID if production ad unit failed
        if (this.interstitialAdUnitId !== TestIds.INTERSTITIAL) {
          console.log('[AdMobService] Switching to Test Interstitial Ad Unit');
          this.interstitialAdUnitId = TestIds.INTERSTITIAL;
          setTimeout(() => this.preloadInterstitial(), 1000);
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
        () => {
          onRewardEarned(25);
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
