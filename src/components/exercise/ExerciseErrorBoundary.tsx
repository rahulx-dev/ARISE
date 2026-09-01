import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { router } from 'expo-router';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ExerciseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ARISE TRACKER ERROR]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    router.replace('/(tabs)');
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={36} color="#D1FF00" />
            </View>

            <Text style={styles.title}>Tracker Temporarily Unavailable</Text>
            <Text style={styles.subtitle}>
              Camera or pose tracking encountered an unexpected condition. Your profile and progress remain safe.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.devErrorBox}>
                <Text style={styles.devErrorText} numberOfLines={3}>
                  {this.state.error.message}
                </Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.retryBtn]}
                onPress={this.handleRetry}
                activeOpacity={0.8}
              >
                <RefreshCw size={16} color="#000" />
                <Text style={styles.retryBtnText}>RETRY TRACKER</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.homeBtn]}
                onPress={this.handleGoHome}
                activeOpacity={0.8}
              >
                <Home size={16} color="#FFFFFF" />
                <Text style={styles.homeBtnText}>BACK TO HOME</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#161616',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(209, 255, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  devErrorBox: {
    backgroundColor: '#0D0D0D',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#262626',
  },
  devErrorText: {
    fontSize: 11,
    color: '#EF4444',
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryBtn: {
    backgroundColor: '#D1FF00',
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  homeBtn: {
    backgroundColor: '#242424',
  },
  homeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
