import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = 'https://3a466f9d4da25400b35196784cefe41e@o4512111132213248.ingest.de.sentry.io/4512111139684432';

/**
 * Initialize Sentry SDK for ARISE
 */
export function initSentry() {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: false,
      tracesSampleRate: 1.0,
      enableAutoSessionTracking: true,
      attachStacktrace: true,
      _experiments: {
        profilesSampleRate: 1.0,
      },
    });
  } catch (err) {
    console.warn('[Sentry] Failed to initialize:', err);
  }
}

/**
 * Helper to report caught errors or logic bugs with custom context
 */
export function logErrorToSentry(
  error: unknown,
  context?: {
    module?: string;
    action?: string;
    extra?: Record<string, any>;
  }
) {
  try {
    Sentry.withScope((scope) => {
      if (context?.module) {
        scope.setTag('module', context.module);
      }
      if (context?.action) {
        scope.setTag('action', context.action);
      }
      if (context?.extra) {
        scope.setExtras(context.extra);
      }
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), 'error');
      }
    });
  } catch (e) {
    console.warn('[Sentry] logError error:', e);
  }
}

/**
 * Add a breadcrumb for tracking user actions before crashes/bugs
 */
export function addSentryBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  try {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level,
    });
  } catch (e) {
    // Ignore breadcrumb errors
  }
}

/**
 * Set user context once profile is loaded
 */
export function setSentryUser(userId: string | number, hunterName?: string) {
  try {
    Sentry.setUser({
      id: String(userId),
      username: hunterName || 'Hunter',
    });
  } catch (e) {
    // Ignore
  }
}

export { Sentry };
