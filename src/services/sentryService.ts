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
      // M68: 100% trace + profile sampling was a bandwidth/battery hog
      // and flooded Sentry. 10% is plenty for crash diagnostics.
      // (Disclosed in the Privacy Policy — DOC-N5.)
      tracesSampleRate: 0.1,
      enableAutoSessionTracking: true,
      attachStacktrace: true,
      // Never send PII with crash reports.
      sendDefaultPii: false,
      _experiments: {
        profilesSampleRate: 0.1,
      },
      beforeSend(event) {
        // M68: scrub PII from crash reports before they leave the device.
        // Emails, phone numbers, and tokens must never reach Sentry.
        try {
          if (event.user) {
            delete (event.user as any).email;
            delete (event.user as any).username;
            delete (event.user as any).ip_address;
          }
          const scrub = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text
              .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
              .replace(/(\+?91[\s-]?)?[6-9]\d{9}/g, '[phone]')
              .replace(/(token|secret|password|api[_-]?key)[=:]\s*[^\s&"']+/gi, '$1=[redacted]');
          };
          if (event.message) event.message = scrub(event.message) as string;
          if (event.exception?.values) {
            for (const v of event.exception.values) {
              if (v.value) v.value = scrub(v.value) as string;
            }
          }
          if (event.breadcrumbs) {
            for (const b of event.breadcrumbs) {
              if (b.message) b.message = scrub(b.message) as string;
              if (b.data) {
                for (const k of Object.keys(b.data)) {
                  if (typeof b.data[k] === 'string') b.data[k] = scrub(b.data[k]) as string;
                }
              }
            }
          }
        } catch {}
        return event;
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
