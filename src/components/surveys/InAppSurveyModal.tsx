import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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
} from 'lucide-react-native';
import { useHaptics } from '../../hooks/useHaptics';

import { getCloudUserId } from '../../services/supabaseClient';
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
    if (isSurveyVerified) {
      onClose(true);
      return;
    }
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
    const currentUrl = (rawUrl || '').toLowerCase();
    // Ignore base offerwall listings without completion params
    if (
      currentUrl === 'https://offers.cpx-research.com/index.php' ||
      (currentUrl.startsWith('https://offers.cpx-research.com/index.php?app_id') &&
        !currentUrl.includes('status=') &&
        !currentUrl.includes('completed') &&
        !currentUrl.includes('success'))
    ) {
      return;
    }

    // Detect authentic survey completion or success redirects
    const completionKeywords = [
      'status=completed',
      'status=complete',
      'status=success',
      'status=finished',
      'survey_success',
      'completed=1',
      'complete=1',
      'finished=1',
      'success=1',
      'reward_granted',
      'rewarded',
      '/survey/complete',
      '/survey/success',
      '/survey_completed',
      '/thank_you',
      '/thankyou',
      '/congratulations',
      'thank_you',
      'thankyou',
      'congratulations',
      'submission_received',
      'response_recorded',
      'cpx_success',
      'trans_id',
      'transaction_id',
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
        data?.type === 'SURVEY_COMPLETED' ||
        data?.status === 'completed' ||
        data?.status === 'success' ||
        data?.event === 'survey_completed'
      ) {
        setIsSurveyVerified(true);
      } else if (data?.url) {
        checkCompletionUrl(data.url);
      }
    } catch {}
  };

  const injectedJS = `
    (function() {
      function checkPage() {
        try {
          var text = (document.body ? document.body.innerText : '').toLowerCase();
          var href = window.location.href.toLowerCase();
          
          var hasCompletionWord = 
            text.includes('thank you for participating') ||
            text.includes('survey completed') ||
            text.includes('survey complete') ||
            text.includes('successfully completed') ||
            text.includes('response has been recorded') ||
            text.includes('responses have been recorded') ||
            text.includes('survey finished') ||
            text.includes('reward credited') ||
            text.includes('congratulations');

          if (hasCompletionWord) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SURVEY_COMPLETED', url: window.location.href }));
          }
        } catch(e) {}
      }

      setInterval(checkPage, 2000);
      window.addEventListener('load', checkPage);
    })();
    true;
  `;

  const checkLiveCpxVerification = async (): Promise<boolean> => {
    try {
      const uid = await getCloudUserId();
      const appId = SURVEY_CONFIG.CPX.APP_ID;
      const res = await fetch(
        `https://api.cpx-research.com/api/get-user-history.php?app_id=${appId}&ext_user_id=${encodeURIComponent(uid)}`
      );
      if (!res.ok) return false;
      const data = await res.json();
      if (data && (data.status === 'success' || data.success) && Array.isArray(data.transactions) && data.transactions.length > 0) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleVerifyAndClaim = async () => {
    if (isSurveyVerified) {
      haptics.success();
      onClose(true);
      return;
    }

    if (secondsElapsed < 30) {
      haptics.warning();
      setWarningMsg(
        `INQUEST IN PROGRESS\n\nPlease answer and complete the survey questions in the portal before attempting to extract Mana Crystals.`
      );
      return;
    }

    setIsVerifyingWithServer(true);
    const serverVerified = await checkLiveCpxVerification();
    setIsVerifyingWithServer(false);

    if (serverVerified) {
      setIsSurveyVerified(true);
      haptics.success();
      onClose(true);
      return;
    }

    // Strictly protect publisher revenue: No free crystals if provider didn't confirm payout!
    haptics.warning();
    setWarningMsg(
      `NO TRANSACTION CONFIRMED YET\n\nThe survey provider has not confirmed a completed payout for this session.\n\n• If you were disqualified or screened out by the research advertiser, please choose another gate inquest.\n• If you just completed the survey, wait a few seconds on the completion page and tap Verify & Claim again.`
    );
  };

  const canClaim = isSurveyVerified || secondsElapsed >= 30;

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

        {/* In-App Browser WebView */}
        <View style={styles.webContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            allowsBackForwardNavigationGestures={true}
            injectedJavaScript={injectedJS}
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
                : secondsElapsed >= 30
                ? 'VERIFY & CLAIM REWARDS'
                : 'SURVEY IN PROGRESS...'}
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
    fontWeight: '900',
    color: '#00D2EE',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
    fontWeight: '900',
    color: '#EF4444',
  },
});
