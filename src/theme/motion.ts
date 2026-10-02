/**
 * ARISE — Centralized Motion System
 * Apple-grade micro-interaction timing, spring physics, and scale constants.
 * Designed for 60-120 FPS high-refresh rate UI-thread execution via React Native Reanimated.
 */

export const motion = {
  // Standardized Duration Tiers (ms)
  timing: {
    press: 110,   // Tactile button scale down (100–120ms)
    quick: 140,   // Micro state toggles & checkmarks (120–160ms)
    state: 180,   // Value / tab / pill indicator switches (150–220ms)
    screen: 280,  // View transitions & sheet presentations (250–350ms)
    modal: 300,   // Dialog popups & alert windows (250–350ms)
    countUp: 450, // Metric / coin count-up sequence
  },

  // Natural iOS-grade Spring Physics (stiffness, damping, mass)
  spring: {
    // Natural iOS navigation & sheet spring
    natural: {
      damping: 26,
      stiffness: 300,
      mass: 0.8,
    },
    // Snappy tactile response for buttons and toggles
    snappy: {
      damping: 22,
      stiffness: 340,
      mass: 0.7,
    },
    // Soft presentation for dialogs and cards
    soft: {
      damping: 28,
      stiffness: 260,
      mass: 0.9,
    },
    // Micro pop for badges and checkmarks
    pop: {
      damping: 18,
      stiffness: 380,
      mass: 0.6,
    },
  },

  // Standardized Press Scale Ratios
  scale: {
    pressedButton: 0.96,   // Primary / prominent CTA buttons
    pressedCard: 0.985,    // Interactive cards and list items
    pressedChip: 0.95,     // Small pills, tags, filter chips
    popCheckmark: 1.15,    // Subtle success checkmark pop
  },

  // Locked State Shake Physics
  shake: {
    amplitude: 6, // Low amplitude horizontal deflection (px)
    duration: 45,  // Fast oscillation
  },
} as const;

export type MotionConfig = typeof motion;
