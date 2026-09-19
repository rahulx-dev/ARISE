import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { SoloLevelingWindow } from './SoloLevelingWindow';

import { logErrorToSentry } from '../../services/sentryService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ARISE ErrorBoundary:', error, errorInfo);
    logErrorToSentry(error, {
      module: 'ErrorBoundary',
      action: 'componentDidCatch',
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  private handleReset = () => {
    try {
      // Clear any transient modal error state
      const { usePlayerStore } = require('../../stores/usePlayerStore');
      usePlayerStore.getState().dismissLevelUp();
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <SoloLevelingWindow
            variant="danger"
            tag="SYSTEM INTERRUPTED"
            subtag="CODE: 0x5F"
            icon={
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={36}
                  color="#FF3B30"
                />
              </View>
            }
            title="SYSTEM INTERRUPTED"
            message="ARISE encountered an unexpected issue. Your local offline progress and data remain safe."
            buttons={[
              {
                text: 'RECOVER SESSION',
                style: 'primary',
                onPress: this.handleReset,
              },
            ]}
          >
            {this.state.error && (
              <View style={styles.devErrorBox}>
                <Text style={styles.devErrorText} numberOfLines={4}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}
          </SoloLevelingWindow>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  devErrorBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 6,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  devErrorText: {
    fontSize: 11,
    color: '#FF453A',
    fontFamily: 'monospace',
  },
});
