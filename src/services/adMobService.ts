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

  private rewardedRetryCount = 0;
  private interstitialRetryCount = 0;

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
        this.rewardedRetryCount = 0;
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
        // H49: NEVER downgrade to a test unit ID. A transient load error
        // (e.g. no fill) used to permanently swap production IDs for
        // TestIds for the rest of the session. Retry the PRODUCTION ID
        // with backoff, capped at 3 attempts.
        if (this.rewardedRetryCount < 3) {
          this.rewardedRetryCount += 1;
          setTimeout(() => this.preloadRewarded(), 5000 * this.rewardedRetryCount);
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
        this.interstitialRetryCount = 0;
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
        // H49: same as rewarded — never swap to a test ID; retry
        // production with backoff, capped at 3 attempts.
        if (this.interstitialRetryCount < 3) {
          this.interstitialRetryCount += 1;
          setTimeout(() => this.preloadInterstitial(), 5000 * this.interstitialRetryCount);
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
      // H48: the EARNED_REWARD listener MUST be removed on every exit
      // path (earned, closed, error). Previously it was only removed
      // inside the earned callback, so closing an ad without earning
      // leaked it and the next ad fired the stale + new callbacks
      // (double reward).
      // H50: this reward is client-side only (AdMob SSV is not wired —
      // that needs a server endpoint). The 25-coin grant stands, but it
      // must never be treated as server-verified.
      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
      };
      const unsubscribeEarned = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          cleanup();
          onRewardEarned(25);
        }
      );
      const unsubscribeClosed = this.rewardedAd.addAdEventListener(
        AdEventType.CLOSED,
        () => cleanup()
      );
      const unsubscribeError = this.rewardedAd.addAdEventListener(
        AdEventType.ERROR,
        () => cleanup()
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
