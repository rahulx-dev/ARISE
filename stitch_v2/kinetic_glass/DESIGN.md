---
name: Kinetic Glass
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#ffffff'
  on-tertiary: '#472a00'
  tertiary-container: '#ffddb8'
  on-tertiary-container: '#8d5900'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  metric-xl:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 20px
  stack-gap: 16px
  element-gap: 8px
  glass-padding: 16px
  section-margin: 32px
---

## Brand & Style

The design system is an ultra-premium, performance-driven framework designed for high-achievers. It prioritizes a high-fidelity "Dark Mode First" experience that mimics the physical properties of layered obsidian and glass. The brand personality is disciplined, technological, and motivating, utilizing a high-contrast visual language to celebrate progress and focus.

The aesthetic blends **Glassmorphism** with **Minimalism**. It relies on deep background depth, precisely calibrated translucent layers, and vibrant "electric" accents to guide the user's eye toward critical metrics and primary actions. Every interaction should feel tactile and weighted, using spring physics to reinforce a sense of premium mechanical quality.

## Colors

The palette is anchored by a true black/graphite foundation to maximize the "pop" of the vibrant accent colors and the depth of the glass effects.

*   **Primary (Electric Lime):** Used exclusively for progress completion, high-value metrics (XP), and primary call-to-action buttons. It represents energy and success.
*   **Secondary (Deep Purple):** Dedicated to "Focus" states and deep-work sessions. It evokes a sense of calm, mental clarity, and flow.
*   **Tertiary (Amber):** Reserved for rewards, streaks, and achievement-based highlights.
*   **Background Gloom:** Subtle, low-opacity radial gradients of #1E3A1E (Green) or #2E1065 (Purple) should be placed deep behind the UI layers to break the monotony of black and suggest an ambient light source.

## Typography

This design system uses a high-contrast typographic scale to emphasize performance metrics. 

*   **Hanken Grotesk** is the workhorse, providing a sharp, contemporary feel that rivals SF Pro in its precision. Use 'Medium' and 'SemiBold' weights for headers to ensure legibility against dark, blurred backgrounds.
*   **JetBrains Mono** is used sparingly for labels, metadata, and technical readouts (e.g., timestamps, rep counts, and coin totals) to reinforce the "engineered" feel of the system.
*   **Visual Hierarchy:** Metrics should be significantly larger than their surrounding labels, often using the `metric-xl` or `display-lg` styles to create a clear data-first narrative.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a focus on vertical stacking and grouped cards. 

*   **Mobile:** 4-column grid with 20px outer margins and 16px gutters.
*   **Desktop/Tablet:** 12-column grid centered in a 1200px max-width container. 
*   **Safe Areas:** Elements like the floating navigation bar must respect a 32px bottom clearance on mobile to accommodate hardware gestures.
*   **Rhythm:** Use a strict 8px base unit. Component internal padding should almost always be 16px to maintain a spacious, breathable feel despite the dense information.

## Elevation & Depth

Hierarchy is defined through **Layered Materials** rather than traditional drop shadows.

1.  **Level 0 (Base):** Deep black (#0A0A0A).
2.  **Level 1 (Cards):** 40% opacity surface with 40px Backdrop Blur. Borders are 0.5px solid white at 10% opacity.
3.  **Level 2 (Modals/Overlays):** 60% opacity surface with 64px Backdrop Blur. Borders are 0.5px solid white at 20% opacity.
4.  **Level 3 (Floating Nav):** 80% opacity surface with 80px Backdrop Blur. 

**Border Treatment:** Use "inner-glow" styling. Instead of a standard border, use a 0.5px stroke with a linear gradient (top-left to bottom-right) from `white/20%` to `white/5%` to simulate light catching the edge of a glass pane.

## Shapes

The design system utilizes **Rounded** corners to soften the high-tech aesthetic and make the interface feel approachable. 

*   **Standard Cards:** 16px (1rem) corner radius.
*   **Buttons & Inputs:** 12px (0.75rem) corner radius.
*   **Outer Containers:** 24px (1.5rem) corner radius when nested elements are present.
*   **Active Indicators:** Small 4px radius "pills" for page indicators or tab markers.

## Components

### Buttons
*   **Primary:** Solid Electric Lime (#CCFF00) with black text. High-spring hover effect (scale 1.02x).
*   **Secondary:** Glass-filled with 0.5px border and white text. 
*   **Ghost:** Text only, with Electric Lime color for actions or Neutral for secondary navigation.

### Floating Navigation
A "pill-shaped" glass container floating 24px from the bottom. Active icons use an Electric Lime glow underneath the icon and a vertical translation animation.

### Cards
All cards must use the `Level 1` elevation settings. Metrics within cards (e.g., "32m Focus") should be center-aligned or top-left aligned depending on card width. Use `0.5px` dividers within cards, set to 5% white opacity.

### Progress Visuals
*   **Rings:** 8px stroke weight. Use a gradient of Primary to a darker version of the primary for the "filled" state. The "track" should be a 10% opacity version of the primary color.
*   **Graphs:** Line graphs should use a 2px stroke of Electric Lime with a subtle glow (outer shadow, 4px blur, same color, 30% opacity).

### Input Fields
Darker than the card background (10% opacity black) with a "Focus" state that transitions the border to Electric Lime and adds a very soft lime outer glow.