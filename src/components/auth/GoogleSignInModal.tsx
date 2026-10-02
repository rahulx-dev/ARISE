import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  X,
  User,
  Mail,
  ChevronRight,
  Check,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Cloud,
  ExternalLink,
} from 'lucide-react-native';
import { GoogleLogo } from './GoogleLogo';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useSound } from '../../hooks/useSound';
import { googleAuthService, GoogleAuthUser } from '../../services/googleAuthService';
import { cloudSyncService, HunterCloudBackup } from '../../services/cloudSyncService';
import { usePlayerStore } from '../../stores/usePlayerStore';

export interface GoogleSignInResult {
  user: GoogleAuthUser;
  restored: boolean;
  message: string;
  backup?: HunterCloudBackup;
}

interface GoogleSignInModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: GoogleSignInResult) => void;
}

export function GoogleSignInModal({ visible, onClose, onSuccess }: GoogleSignInModalProps) {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const sound = useSound();
  const profile = usePlayerStore((s) => s.profile);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to Google...');
  const [showManualForm, setShowManualForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [errorText, setErrorText] = useState('');
  const [storedUser, setStoredUser] = useState<GoogleAuthUser | null>(null);

  useEffect(() => {
    if (visible) {
      loadStoredUser();
      setShowManualForm(false);
      setErrorText('');
      setLoading(false);
      if (profile?.displayName) {
        setCustomName(profile.displayName);
      }
    }
  }, [visible, profile?.displayName]);

  const loadStoredUser = async () => {
    const user = await googleAuthService.getStoredGoogleUser();
    setStoredUser(user);
  };

  /**
   * Launch official Google OAuth account chooser (accounts.google.com)
   * Shows all logged-in Gmail accounts on the browser/device.
   */
  const handleGoogleOAuth = async () => {
    haptics.medium();
    setErrorText('');
    setLoading(true);
    setLoadingMessage('Opening Google Account Chooser...');

    try {
      const res = await googleAuthService.startCloudOAuth();
      if (!res.success) {
        setLoading(false);
        setErrorText(res.error || 'Failed to open Google account selector');
        haptics.warning();
      }
      // On web, startCloudOAuth initiates window.location redirect to accounts.google.com
    } catch (e: any) {
      setLoading(false);
      setErrorText(e?.message || 'Error opening Google account selector');
      haptics.warning();
    }
  };

  /**
   * Direct/Manual connection with Gmail address
   */
  const handleDirectConnect = async (account: { displayName: string; email: string }) => {
    haptics.medium();
    setLoading(true);
    setErrorText('');
    setLoadingMessage('Linking Google Account...');

    try {
      const authUser = await googleAuthService.signInWithAccount(account);
      setStoredUser(authUser);

      setLoadingMessage('Checking Cloud Backup...');
      const restoreRes = await cloudSyncService.restoreFromCloud(authUser.email);

      if (restoreRes.restored) {
        sound.play('level_up');
        haptics.success();
      } else {
        // If brand new account, save current player state to cloud
        await cloudSyncService.saveToCloud(authUser.email);
        haptics.success();
      }

      setLoading(false);
      onSuccess({
        user: authUser,
        restored: restoreRes.restored,
        message: restoreRes.message,
        backup: restoreRes.backup,
      });
      onClose();
    } catch (e: any) {
      setLoading(false);
      setErrorText(e?.message || 'Failed to link Google account');
      haptics.warning();
    }
  };

  const handleManualSubmit = async () => {
    const trimmedName = customName.trim() || profile?.displayName || 'Hunter';
    const trimmedEmail = customEmail.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorText('Please enter a valid Gmail address');
      haptics.warning();
      return;
    }

    await handleDirectConnect({ displayName: trimmedName, email: trimmedEmail });
  };

  const handleDisconnect = async () => {
    haptics.medium();
    await googleAuthService.signOutGoogle();
    setStoredUser(null);
    setErrorText('');
  };

  const handleSyncCurrent = async () => {
    if (!storedUser?.email) return;
    haptics.medium();
    setLoading(true);
    setLoadingMessage('Syncing to Google Cloud...');
    try {
      const saveRes = await cloudSyncService.saveToCloud(storedUser.email);
      setLoading(false);
      haptics.success();
      if (saveRes.success) {
        onSuccess({
          user: storedUser,
          restored: false,
          message: 'Progression saved to Google Cloud successfully!',
        });
        onClose();
      }
    } catch (e: any) {
      setLoading(false);
      setErrorText(e?.message || 'Failed to sync');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={loading ? undefined : onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardWrap}
            >
              <View
                style={[
                  styles.sheetCard,
                  {
                    backgroundColor: isDark ? '#141622' : '#FFFFFF',
                    borderColor: isDark ? '#23283B' : '#E5E7EB',
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                    <View style={styles.logoBadge}>
                      <GoogleLogo size={24} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        {storedUser ? 'Google Account' : 'Connect with Google'}
                      </Text>
                      <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        {storedUser
                          ? 'Your Hunter progression is backed up'
                          : 'Save and restore your game progress anytime'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.closeBtn,
                      { backgroundColor: isDark ? '#1E2235' : '#F3F4F6' },
                    ]}
                    onPress={onClose}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <X size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Loading State */}
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4285F4" />
                    <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
                      {loadingMessage}
                    </Text>
                    <Text style={[styles.loadingSub, { color: colors.textMuted }]}>
                      Secure Google Cloud Handshake
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                  >
                    {/* Error Banner */}
                    {!!errorText && (
                      <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerText}>{errorText}</Text>
                      </View>
                    )}

                    {/* Active Connected User View */}
                    {storedUser ? (
                      <View style={styles.connectedCard}>
                        <View
                          style={[
                            styles.userProfileRow,
                            {
                              backgroundColor: isDark ? '#1A1E2E' : '#F3F4F6',
                              borderColor: isDark ? '#2A3047' : '#E5E7EB',
                            },
                          ]}
                        >
                          <View style={styles.avatarCircle}>
                            <Text style={styles.avatarLetter}>
                              {storedUser.displayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.userMeta}>
                            <View style={styles.userMetaTop}>
                              <Text
                                style={[styles.userNameText, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {storedUser.displayName}
                              </Text>
                              <View style={styles.activePill}>
                                <Check size={11} color="#10B981" />
                                <Text style={styles.activePillText}>Connected</Text>
                              </View>
                            </View>
                            <Text
                              style={[styles.userEmailText, { color: colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {storedUser.email}
                            </Text>
                          </View>
                        </View>

                        {/* Action buttons for connected user */}
                        <View style={styles.actionButtonGroup}>
                          <TouchableOpacity
                            style={[styles.syncButton, { backgroundColor: '#4285F4' }]}
                            onPress={handleSyncCurrent}
                            activeOpacity={0.85}
                          >
                            <Cloud size={16} color="#FFFFFF" />
                            <Text style={styles.syncButtonText}>Sync Progress Now</Text>
                          </TouchableOpacity>

                          <View style={styles.dualActionRow}>
                            <TouchableOpacity
                              style={[
                                styles.secondaryActionBtn,
                                {
                                  backgroundColor: isDark ? '#1E2235' : '#F3F4F6',
                                  borderColor: isDark ? '#2D3450' : '#E5E7EB',
                                },
                              ]}
                              onPress={handleGoogleOAuth}
                              activeOpacity={0.8}
                            >
                              <GoogleLogo size={16} />
                              <Text
                                style={[styles.secondaryActionText, { color: colors.textPrimary }]}
                              >
                                Switch Account
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.secondaryActionBtn,
                                {
                                  backgroundColor: isDark ? '#2D1414' : '#FEE2E2',
                                  borderColor: isDark ? '#4C1D1D' : '#FECACA',
                                },
                              ]}
                              onPress={handleDisconnect}
                              activeOpacity={0.8}
                            >
                              <LogOut size={16} color="#EF4444" />
                              <Text style={[styles.secondaryActionText, { color: '#EF4444' }]}>
                                Disconnect
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ) : (
                      /* Not Connected: Primary Google Sign-In */
                      <View style={styles.notConnectedContainer}>
                        {/* 1. Official Google Sign-In Button */}
                        <TouchableOpacity
                          style={styles.googleOfficialButton}
                          onPress={handleGoogleOAuth}
                          activeOpacity={0.88}
                        >
                          <View style={styles.googleIconBox}>
                            <GoogleLogo size={24} />
                          </View>
                          <View style={styles.googleButtonContent}>
                            <Text style={styles.googleButtonMainText}>Continue with Google</Text>
                            <Text style={styles.googleButtonSubText}>
                              Auto-choose from your Gmail accounts
                            </Text>
                          </View>
                          <ChevronRight size={18} color="#4B5563" />
                        </TouchableOpacity>

                        {/* Feature Points */}
                        <View
                          style={[
                            styles.perksCard,
                            {
                              backgroundColor: isDark ? '#181C2B' : '#F9FAFB',
                              borderColor: isDark ? '#262D42' : '#E5E7EB',
                            },
                          ]}
                        >
                          <View style={styles.perkRow}>
                            <Check size={14} color="#10B981" />
                            <Text style={[styles.perkText, { color: colors.textSecondary }]}>
                              Automatic restore after app reinstall or phone switch
                            </Text>
                          </View>
                          <View style={styles.perkRow}>
                            <Check size={14} color="#10B981" />
                            <Text style={[styles.perkText, { color: colors.textSecondary }]}>
                              Keeps Coins, Mana Crystals, Quests & Hunter Level safe
                            </Text>
                          </View>
                          <View style={styles.perkRow}>
                            <Check size={14} color="#10B981" />
                            <Text style={[styles.perkText, { color: colors.textSecondary }]}>
                              Safe & private: We only save your game progression
                            </Text>
                          </View>
                        </View>

                        {/* Manual / Alternate Link Toggle */}
                        {!showManualForm ? (
                          <TouchableOpacity
                            style={styles.manualToggleBtn}
                            onPress={() => {
                              haptics.light();
                              setShowManualForm(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <Mail size={15} color={colors.textMuted} />
                            <Text style={[styles.manualToggleText, { color: colors.textSecondary }]}>
                              Or connect by entering Gmail directly
                            </Text>
                            <ChevronRight size={15} color={colors.textMuted} />
                          </TouchableOpacity>
                        ) : (
                          /* Manual Entry Form */
                          <View
                            style={[
                              styles.manualFormBox,
                              {
                                backgroundColor: isDark ? '#191D2E' : '#F9FAFB',
                                borderColor: isDark ? '#262C42' : '#E5E7EB',
                              },
                            ]}
                          >
                            <Text style={[styles.manualFormTitle, { color: colors.textPrimary }]}>
                              Direct Gmail Link
                            </Text>

                            <View style={styles.inputGroup}>
                              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                Hunter Name
                              </Text>
                              <View
                                style={[
                                  styles.inputWrap,
                                  {
                                    backgroundColor: isDark ? '#131622' : '#FFFFFF',
                                    borderColor: isDark ? '#262C42' : '#E5E7EB',
                                  },
                                ]}
                              >
                                <User size={16} color={colors.textMuted} />
                                <TextInput
                                  style={[styles.textInput, { color: colors.textPrimary }]}
                                  placeholder="Your Name"
                                  placeholderTextColor={colors.textMuted}
                                  value={customName}
                                  onChangeText={setCustomName}
                                  autoCapitalize="words"
                                />
                              </View>
                            </View>

                            <View style={styles.inputGroup}>
                              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                Gmail Address
                              </Text>
                              <View
                                style={[
                                  styles.inputWrap,
                                  {
                                    backgroundColor: isDark ? '#131622' : '#FFFFFF',
                                    borderColor: isDark ? '#262C42' : '#E5E7EB',
                                  },
                                ]}
                              >
                                <Mail size={16} color={colors.textMuted} />
                                <TextInput
                                  style={[styles.textInput, { color: colors.textPrimary }]}
                                  placeholder="yourname@gmail.com"
                                  placeholderTextColor={colors.textMuted}
                                  value={customEmail}
                                  onChangeText={setCustomEmail}
                                  keyboardType="email-address"
                                  autoCapitalize="none"
                                />
                              </View>
                            </View>

                            <View style={styles.manualBtnRow}>
                              <TouchableOpacity
                                style={[
                                  styles.cancelManualBtn,
                                  {
                                    backgroundColor: isDark ? '#1E2235' : '#E5E7EB',
                                  },
                                ]}
                                onPress={() => setShowManualForm(false)}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.cancelManualText, { color: colors.textSecondary }]}>
                                  Cancel
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.submitManualBtn, { backgroundColor: '#4285F4' }]}
                                onPress={handleManualSubmit}
                                activeOpacity={0.85}
                              >
                                <Text style={styles.submitManualText}>Link & Restore</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Security Footnote */}
                    <View style={styles.footerNotice}>
                      <ShieldCheck size={14} color={colors.textMuted} />
                      <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        Google OAuth 2.0 encrypted cloud sync. Never shares your password.
                      </Text>
                    </View>
                  </ScrollView>
                )}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    width: '100%',
    alignItems: 'center',
  },
  sheetCard: {
    width: '100%',
    maxWidth: 540,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  loadingSub: {
    fontSize: 12,
  },
  connectedCard: {
    gap: 14,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userMeta: {
    flex: 1,
    gap: 2,
  },
  userMetaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  userEmailText: {
    fontSize: 13,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  actionButtonGroup: {
    gap: 10,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notConnectedContainer: {
    gap: 14,
  },
  googleOfficialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    gap: 12,
  },
  googleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonContent: {
    flex: 1,
  },
  googleButtonMainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  googleButtonSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  perksCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  manualToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  manualToggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  manualFormBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  manualFormTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  manualBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelManualBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelManualText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitManualBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitManualText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    flex: 1,
  },
});
