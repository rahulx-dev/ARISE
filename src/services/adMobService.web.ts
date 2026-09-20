class AdMobServiceWeb {
  public isRewardedLoaded = true;
  public isInterstitialLoaded = true;

  public async initialize(): Promise<void> {
    console.log('[AdMobServiceWeb] Web preview mode - mock ads active');
  }

  public preloadRewarded() {
    this.isRewardedLoaded = true;
  }

  public preloadInterstitial() {
    this.isInterstitialLoaded = true;
  }

  public showRewardedAd(onRewardEarned: (coins: number) => void): boolean {
    console.log('[AdMobServiceWeb] Rewarded ad simulated for web preview');
    setTimeout(() => {
      onRewardEarned(50);
    }, 500);
    return true;
  }

  public showInterstitialAd(): boolean {
    console.log('[AdMobServiceWeb] Interstitial ad simulated for web preview');
    return true;
  }
}

export const adMobService = new AdMobServiceWeb();
