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
import { X, User, Mail, ChevronRight, Check, ShieldCheck, Plus } from 'lucide-react-native';
import { GoogleLogo } from './GoogleLogo';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useSound } from '../../hooks/useSound';
import { googleAuthService, GoogleAuthUser } from '../../services/googleAuthService';
import { cloudSyncService, HunterCloudBackup } from '../../services/cloudSyncService';

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

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to Google...');
  const [mode, setMode] = useState<'choose' | 'custom'>('choose');
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [errorText, setErrorText] = useState('');
  const [storedUser, setStoredUser] = useState<GoogleAuthUser | null>(null);

  useEffect(() => {
    if (visible) {
      loadStoredUser();
      setMode('choose');
      setErrorText('');
      setLoading(false);
    }
  }, [visible]);

  const loadStoredUser = async () => {
    const user = await googleAuthService.getStoredGoogleUser();
    setStoredUser(user);
  };

  const handleSelectAccount = async (account: { displayName: string; email: string }) => {
    haptics.medium();
    setLoading(true);
    setLoadingMessage('Connecting to Google...');

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const authUser = await googleAuthService.signInWithAccount(account);

      setLoadingMessage('Checking Cloud Backup...');
      const restoreRes = await cloudSyncService.restoreFromCloud(authUser.email);

      sound.play('level_up');
      haptics.success();
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
      setErrorText(e?.message || 'Failed to authenticate with Google');
      haptics.warning();
    }
  };

  const handleCustomSubmit = async () => {
    const trimmedName = customName.trim();
    const trimmedEmail = customEmail.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorText('Please enter your full name');
      haptics.warning();
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorText('Please enter a valid Google email address');
      haptics.warning();
      return;
    }

    setErrorText('');
    await handleSelectAccount({ displayName: trimmedName, email: trimmedEmail });
  };

  const defaultAccounts = [
    ...(storedUser
      ? [
          {
            displayName: storedUser.displayName,
            email: storedUser.email,
            isCurrent: true,
          },
        ]
      : [
          {
            displayName: 'Hunter Arjun',
            email: 'arjun.hunter@gmail.com',
            isCurrent: false,
          },
        ]),
  ];

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
                      <GoogleLogo size={22} />
                    </View>
                    <View>
                      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        Sign in with Google
                      </Text>
                      <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Choose an account to continue to ARISE
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
                      Secure Google Sign-In handshake
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                  >
                    {mode === 'choose' ? (
                      <>
                        {/* Account Choices */}
                        <View style={styles.accountsList}>
                          {defaultAccounts.map((acc, idx) => {
                            const initial = acc.displayName.charAt(0).toUpperCase();
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={[
                                  styles.accountItem,
                                  {
                                    backgroundColor: isDark ? '#191D2E' : '#F9FAFB',
                                    borderColor: isDark ? '#262C42' : '#E5E7EB',
                                  },
                                ]}
                                onPress={() => handleSelectAccount(acc)}
                                activeOpacity={0.8}
                              >
                                <View style={styles.avatarCircle}>
                                  <Text style={styles.avatarLetter}>{initial}</Text>
                                </View>
                                <View style={styles.accountMeta}>
                                  <Text
                                    style={[styles.accountName, { color: colors.textPrimary }]}
                                    numberOfLines={1}
                                  >
                                    {acc.displayName}
                                  </Text>
                                  <Text
                                    style={[styles.accountEmail, { color: colors.textSecondary }]}
                                    numberOfLines={1}
                                  >
                                    {acc.email}
                                  </Text>
                                </View>
                                {acc.isCurrent ? (
                                  <View style={styles.badgePill}>
                                    <Check size={12} color="#10B981" />
                                    <Text style={styles.badgeText}>Active</Text>
                                  </View>
                                ) : (
                                  <ChevronRight size={18} color={colors.textMuted} />
                                )}
                              </TouchableOpacity>
                            );
                          })}

                          {/* Option to use custom account */}
                          <TouchableOpacity
                            style={[
                              styles.accountItem,
                              {
                                backgroundColor: isDark ? '#191D2E' : '#F9FAFB',
                                borderColor: isDark ? '#262C42' : '#E5E7EB',
                              },
                            ]}
                            onPress={() => {
                              haptics.light();
                              setMode('custom');
                            }}
                            activeOpacity={0.8}
                          >
                            <View
                              style={[
                                styles.avatarCircle,
                                { backgroundColor: isDark ? '#23283B' : '#E2E8F0' },
                              ]}
                            >
                              <Plus size={16} color={colors.textPrimary} />
                            </View>
                            <View style={styles.accountMeta}>
                              <Text
                                style={[styles.accountName, { color: colors.textPrimary }]}
                              >
                                Use another Google account
                              </Text>
                              <Text
                                style={[styles.accountEmail, { color: colors.textSecondary }]}
                              >
                                Enter your Gmail address
                              </Text>
                            </View>
                            <ChevronRight size={18} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      /* Custom Account Form */
                      <View style={styles.customForm}>
                        <View style={styles.inputGroup}>
                          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                            Full Name
                          </Text>
                          <View
                            style={[
                              styles.inputWrap,
                              {
                                backgroundColor: isDark ? '#191D2E' : '#F9FAFB',
                                borderColor: isDark ? '#262C42' : '#E5E7EB',
                              },
                            ]}
                          >
                            <User size={18} color={colors.textMuted} />
                            <TextInput
                              style={[styles.textInput, { color: colors.textPrimary }]}
                              placeholder="e.g. Rahul Sharma"
                              placeholderTextColor={colors.textMuted}
                              value={customName}
                              onChangeText={setCustomName}
                              autoCapitalize="words"
                            />
                          </View>
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                            Google Email
                          </Text>
                          <View
                            style={[
                              styles.inputWrap,
                              {
                                backgroundColor: isDark ? '#191D2E' : '#F9FAFB',
                                borderColor: isDark ? '#262C42' : '#E5E7EB',
                              },
                            ]}
                          >
                            <Mail size={18} color={colors.textMuted} />
                            <TextInput
                              style={[styles.textInput, { color: colors.textPrimary }]}
                              placeholder="name@gmail.com"
                              placeholderTextColor={colors.textMuted}
                              value={customEmail}
                              onChangeText={setCustomEmail}
                              keyboardType="email-address"
                              autoCapitalize="none"
                            />
                          </View>
                        </View>

                        {!!errorText && (
                          <Text style={styles.formErrorText}>{errorText}</Text>
                        )}

                        <View style={styles.formButtonRow}>
                          <TouchableOpacity
                            style={[
                              styles.secondaryBtn,
                              {
                                backgroundColor: isDark ? '#1F2438' : '#F3F4F6',
                                borderColor: isDark ? '#2D3450' : '#E5E7EB',
                              },
                            ]}
                            onPress={() => {
                              haptics.light();
                              setMode('choose');
                              setErrorText('');
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                              Back
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: '#4285F4' }]}
                            onPress={handleCustomSubmit}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.primaryBtnText}>Sign In</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Security Notice */}
                    <View style={styles.footerNotice}>
                      <ShieldCheck size={14} color={colors.textMuted} />
                      <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        To continue, Google will share your name and email address with ARISE.
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
    maxWidth: 520,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  accountsList: {
    gap: 10,
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
  },
  accountEmail: {
    fontSize: 13,
    marginTop: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  customForm: {
    gap: 14,
    marginBottom: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  formErrorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: -4,
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadingSub: {
    fontSize: 13,
  },
  footerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  footerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
});
