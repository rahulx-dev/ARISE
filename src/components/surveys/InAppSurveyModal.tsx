import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  X,
  RotateCw,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';

import { getCloudUserId, supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { SURVEY_CONFIG } from '../../config/surveyConfig';

interface InAppSurveyModalProps {
  visible: boolean;
  url: string | null;
  title?: string;
  provider?: string;
  onClose: (completed: boolean) => void;
}

export function InAppSurveyModal({
  visible,
  url,
  title = 'RESEARCH SURVEY INQUEST',
  provider = 'CPX RESEARCH',
  onClose,
}: InAppSurveyModalProps) {
  const haptics = useHaptics();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);

  // Anti-fraud & verification tracking
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isSurveyVerified, setIsSurveyVerified] = useState<boolean>(false);
  const [isVerifyingWithServer, setIsVerifyingWithServer] = useState<boolean>(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState<boolean>(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      startTimeRef.current = Date.now();
      setSecondsElapsed(0);
      setIsSurveyVerified(false);
      setIsVerifyingWithServer(false);
      setExitConfirmVisible(false);
      setWarningMsg(null);

      timerRef.current = setInterval(() => {
        setSecondsElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  if (!url) return null;

  const handlePressClose = () => {
    haptics.light();
    // H3: closing the modal NEVER grants a reward. Previously a
    // client-side URL-substring "verification" (isSurveyVerified) made
    // close grant onClose(true). Only a server-verified claim grants.
    setExitConfirmVisible(true);
  };

  const handleConfirmExitWithoutReward = () => {
    setExitConfirmVisible(false);
    haptics.warning();
    onClose(false); // Strictly NO reward awarded!
  };

  const handleReload = () => {
    haptics.light();
    webViewRef.current?.reload();
  };

  const handleGoBack = () => {
    if (canGoBack) {
      haptics.light();
      webViewRef.current?.goBack();
    }
  };

  const handleGoForward = () => {
    if (canGoForward) {
      haptics.light();
      webViewRef.current?.goForward();
    }
  };

  const checkCompletionUrl = (rawUrl: string) => {
    // UI HINT ONLY (H3): a URL containing completion substrings is NOT
    // proof of a completed survey — any offerwall listing page carries
    // such params. It only changes the claim button's label. The reward
    // is granted ONLY by server verification (checkLiveCpxVerification).
    const currentUrl = (rawUrl || '').toLowerCase();
    // Ignore base offerwall listings without completion params
    if (
      currentUrl === 'https://offers.cpx-research.com/index.php' ||
      (currentUrl.startsWith('https://offers.cpx-research.com/index.php?app_id') &&
        !currentUrl.includes('status=') &&
        !currentUrl.includes('completed') &&
        !currentUrl.includes('trans_id=') &&
        !currentUrl.includes('transaction_id='))
    ) {
      return;
    }

    // Require at least 45 seconds to avoid false positive early redirects / screenouts
    if (secondsElapsed < 45) {
      return;
    }

    // Detect authentic survey completion or transaction confirmation parameters
    const completionKeywords = [
      'status=completed',
      'status=complete',
      'status=success',
      'cpx_status=success',
      'survey_success=1',
      'trans_id=',
      'transaction_id=',
      '/survey/complete',
      '/survey/success',
      '/survey_completed',
      'cpx_success',
    ];

    if (completionKeywords.some((keyword) => currentUrl.includes(keyword))) {
      setIsSurveyVerified(true);
    }
  };

  const handleNavigationChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    checkCompletionUrl(navState.url);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (
        (data?.type === 'SURVEY_COMPLETED' ||
          data?.status === 'completed' ||
          data?.status === 'success' ||
          data?.event === 'survey_completed') &&
        secondsElapsed >= 45
      ) {
        setIsSurveyVerified(true);
      } else if (data?.url) {
        checkCompletionUrl(data.url);
      }
    } catch {}
  };

  const injectedJS = `
    (function() {
      var surveyStartTime = Date.now();

      // 1. Force all target="_blank" links to open in the current WebView
      function fixLinks() {
        try {
          var links = document.getElementsByTagName('a');
          for (var i = 0; i < links.length; i++) {
            if (links[i].getAttribute('target') === '_blank') {
              links[i].setAttribute('target', '_self');
            }
          }
        } catch(e) {}
      }

      // 2. Intercept window.open to navigate current window
      window.open = function(url) {
        if (url) {
          window.location.href = url;
        }
        return window;
      };

      // 3. Check for genuine survey completion keywords only after adequate elapsed time (45s+)
      function checkPage() {
        try {
          fixLinks();
          if (Date.now() - surveyStartTime < 45000) return;

          var text = (document.body ? document.body.innerText : '').toLowerCase();
          var hasCompletionPhrase = 
            text.includes('survey completed') ||
            text.includes('survey complete') ||
            text.includes('successfully completed') ||
            text.includes('response has been recorded') ||
            text.includes('responses have been recorded') ||
            text.includes('survey finished') ||
            text.includes('reward credited');

          if (hasCompletionPhrase) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SURVEY_COMPLETED', url: window.location.href }));
          }
        } catch(e) {}
      }

      setInterval(checkPage, 2000);
      window.addEventListener('load', checkPage);
      document.addEventListener('DOMContentLoaded', checkPage);
    })();
    true;
  `;

  const checkLiveCpxVerification = async (): Promise<boolean> => {
    try {
      const uid = await getCloudUserId();
      // H4: session binding. Only a postback/transaction created AFTER
      // this modal opened counts. Previously ANY historical transaction
      // (or any postback within 45 min) verified a brand-new survey.
      const sessionStart = startTimeRef.current;

      // 1. Check Supabase cpx_postback_log if configured
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from('cpx_postback_log')
            .select('trans_id, amount_crystals, status, created_at')
            .eq('user_id', uid)
            .eq('status', 'completed')
            .gte('created_at', new Date(sessionStart).toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && data && data.length > 0) {
            return true;
          }
        } catch (dbErr) {
          console.warn('[CPX Verification] Supabase postback check note:', dbErr);
        }
      }

      // 2. Query live CPX Research API — accept only a transaction whose
      // timestamp falls inside THIS modal session. Undated transactions
      // are rejected (fail closed).
      const appId = SURVEY_CONFIG.CPX.APP_ID;
      const res = await fetch(
        `https://api.cpx-research.com/api/get-user-history.php?app_id=${appId}&ext_user_id=${encodeURIComponent(uid)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (
          data &&
          (data.status === 'success' || data.success) &&
          Array.isArray(data.transactions) &&
          data.transactions.length > 0
        ) {
          for (const tx of data.transactions) {
            const rawTs = tx?.date ?? tx?.datetime ?? tx?.created_at ?? tx?.timestamp ?? tx?.trans_date;
            const ts = rawTs ? new Date(rawTs).getTime() : NaN;
            if (Number.isFinite(ts) && ts >= sessionStart) {
              return true;
            }
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleVerifyAndClaim = async () => {
    if (secondsElapsed < 45) {
      haptics.warning();
      setWarningMsg(
        `INQUEST IN PROGRESS\n\nAuthentic market research surveys require thorough completion.\n\nMinimum survey time required: 45s (Elapsed: ${secondsElapsed}s).\n\nPlease answer the questions in the portal before attempting to verify.`
      );
      return;
    }

    setIsVerifyingWithServer(true);
    const serverVerified = await checkLiveCpxVerification();
    setIsVerifyingWithServer(false);

    // H3: ONLY server verification claims. Previously a client-side
    // URL-substring flag (isSurveyVerified) was sufficient — any URL
    // containing `trans_id=` claimed the reward with no survey done.
    if (serverVerified) {
      setIsSurveyVerified(true);
      haptics.success();
      onClose(true);
      return;
    }

    haptics.warning();
    setWarningMsg(
      `SURVEY NOT CONFIRMED BY PARTNER\n\nThe survey partner (CPX Research) has not confirmed a completed survey payout for your hunter ID yet.\n\n• Please make sure you answer all questions until the final confirmation page.\n• Mana Crystals are only distributed once partner earning is confirmed to protect system economics.\n\nIf you just submitted the last question, wait 10-15 seconds and tap Verify again.`
    );
  };

  const canClaim = secondsElapsed >= 45;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handlePressClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top Header */}
        <View style={styles.header}>
          {/* Left: Provider & Title */}
          <View style={styles.headerTitleCol}>
            <View style={styles.providerBadge}>
              <ShieldCheck size={11} color="#00D2EE" />
              <Text style={styles.providerBadgeText}>{provider.toUpperCase()} // LIVE</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {/* Right: Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleGoBack}
              disabled={!canGoBack}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={canGoBack ? '#FFFFFF' : '#475569'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleReload}
              activeOpacity={0.7}
            >
              <RotateCw size={17} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.closeBtn]}
              onPress={handlePressClose}
              activeOpacity={0.7}
            >
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading Progress Line */}
        {loading && (
          <View style={styles.loadingTrack}>
            <View style={styles.loadingGlow} />
          </View>
        )}

        {/* In-App Browser WebView or Web fallback */}
        <View style={styles.webContainer}>
          {Platform.OS === 'web' ? (
            <View style={{ flex: 1, backgroundColor: '#090B10' }}>
              <View style={{ padding: 12, backgroundColor: '#111218', borderBottomWidth: 1, borderBottomColor: '#1C1E2A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Live Survey Station</Text>
                  <Text style={{ color: '#8E8E93', fontSize: 11 }}>Complete in portal below or open in external tab</Text>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#0284C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => {
                    if (typeof window !== 'undefined') {
                      window.open(url, '_blank');
                    } else {
                      Linking.openURL(url);
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <ExternalLink size={13} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Open In New Tab</Text>
                </TouchableOpacity>
              </View>
              {/* @ts-ignore */}
              <iframe
                src={url}
                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#090B10' }}
                title="Survey Offerwall"
              />
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ uri: url }}
              style={styles.webview}
              userAgent="Mozilla/5.0 (Linux; Android 13; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              javaScriptEnabled={true}
              javaScriptCanOpenWindowsAutomatically={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              mixedContentMode="always"
              allowsInlineMediaPlayback={true}
              originWhitelist={['*']}
              setSupportMultipleWindows={false}
              startInLoadingState={true}
              scalesPageToFit={true}
              allowsBackForwardNavigationGestures={true}
              injectedJavaScript={injectedJS}
              onShouldStartLoadWithRequest={() => true}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={handleNavigationChange}
              onMessage={handleMessage}
              renderLoading={() => (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="large" color="#00D2EE" />
                  <Text style={styles.loaderText}>CONNECTING TO RESEARCH MAINFRAME...</Text>
                  <Text style={styles.loaderSub}>100% In-App Secure Verification</Text>
                </View>
              )}
            />
          )}
        </View>

        {/* Bottom Verification & Extraction Action Strip */}
        <View style={styles.bottomBar}>
          <View style={styles.timerPill}>
            <Clock size={13} color="#00D2EE" />
            <Text style={styles.timerPillText}>
              {Math.floor(secondsElapsed / 60)}m {String(secondsElapsed % 60).padStart(2, '0')}s
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.claimBtn,
              canClaim ? styles.claimBtnActive : styles.claimBtnDisabled,
            ]}
            onPress={handleVerifyAndClaim}
            disabled={isVerifyingWithServer}
            activeOpacity={0.85}
          >
            {isVerifyingWithServer ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : canClaim ? (
              <CheckCircle2 size={16} color="#000000" />
            ) : (
              <Lock size={14} color="#64748B" />
            )}
            <Text style={[styles.claimBtnText, canClaim && styles.claimBtnTextActive]}>
              {isVerifyingWithServer
                ? 'VERIFYING WITH CPX SERVER...'
                : isSurveyVerified
                ? 'CLAIM EXTRACTED CRYSTALS'
                : secondsElapsed >= 45
                ? 'VERIFY & CLAIM REWARDS'
                : `SURVEY IN PROGRESS (${45 - secondsElapsed}s)`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Exit Confirmation Dialog Modal */}
        <Modal visible={exitConfirmVisible} transparent animationType="fade">
          <View style={styles.alertBackdrop}>
            <View style={styles.alertCard}>
              <View style={styles.alertHeaderRow}>
                <AlertTriangle size={20} color="#EF4444" />
                <Text style={styles.alertTitle}>ABORT RECON INQUEST?</Text>
              </View>
              <Text style={styles.alertMsg}>
                You have not completed the survey questions in the portal. Exiting now will award ZERO Mana Crystals.
              </Text>
              <View style={styles.alertActionRow}>
                <TouchableOpacity
                  style={styles.alertCancelBtn}
                  onPress={() => setExitConfirmVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.alertCancelBtnText}>CONTINUE SURVEY</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alertConfirmBtn}
                  onPress={handleConfirmExitWithoutReward}
                  activeOpacity={0.8}
                >
                  <Text style={styles.alertConfirmBtnText}>EXIT WITHOUT REWARD</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Premature Claim Warning Dialog Modal */}
        <Modal visible={!!warningMsg} transparent animationType="fade">
          <View style={styles.alertBackdrop}>
            <View style={styles.alertCard}>
              <View style={styles.alertHeaderRow}>
                <Lock size={20} color="#F59E0B" />
                <Text style={[styles.alertTitle, { color: '#F59E0B' }]}>INQUEST IN PROGRESS</Text>
              </View>
              <Text style={styles.alertMsg}>{warningMsg}</Text>
              <TouchableOpacity
                style={styles.warningModalBtn}
                onPress={() => setWarningMsg(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.warningModalBtnText}>RETURN TO SURVEY QUESTIONS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0B0D14',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
    marginRight: 10,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#00D2EE',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  loadingTrack: {
    height: 2,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  loadingGlow: {
    width: '40%',
    height: '100%',
    backgroundColor: '#00D2EE',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loaderWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05070E',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00D2EE',
    letterSpacing: 1,
    marginTop: 8,
  },
  loaderSub: {
    fontSize: 11,
    color: '#64748B',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0B0D14',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 12,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#082f49',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  timerPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00D2EE',
    fontVariant: ['tabular-nums'],
  },
  claimBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  claimBtnActive: {
    backgroundColor: '#00D2EE',
    borderColor: '#38BDF8',
  },
  claimBtnDisabled: {
    backgroundColor: '#111827',
    borderColor: '#1E293B',
  },
  claimBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  claimBtnTextActive: {
    color: '#000000',
  },
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    backgroundColor: '#0B0D14',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 20,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: 0.8,
  },
  alertMsg: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  alertActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  alertCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#00D2EE',
  },
  alertCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  warningModalBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#00D2EE',
    marginTop: 18,
    shadowColor: '#00D2EE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  warningModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.6,
  },
  alertConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  alertConfirmBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});
