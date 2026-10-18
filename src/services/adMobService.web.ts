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
    // H50: web preview shows NO real ad, so it grants NO coins.
    // Previously the web stub granted 50 coins for no ad (native grants
    // 25) — free money for opening the web build. The callback still
    // fires with 0 so callers can close their UI.
    console.log('[AdMobServiceWeb] Web preview: no real ad shown, granting 0 coins');
    setTimeout(() => {
      onRewardEarned(0);
    }, 500);
    return true;
  }

  public showInterstitialAd(): boolean {
    console.log('[AdMobServiceWeb] Interstitial ad simulated for web preview');
    return true;
  }
}

export const adMobService = new AdMobServiceWeb();
