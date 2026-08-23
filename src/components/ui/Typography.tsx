import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography, TypographyTokens } from '../../theme/typography';

export type TypographyVariant = keyof TypographyTokens;

export interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  glow?: boolean;
  glowColor?: string;
  style?: TextStyle | (TextStyle | undefined)[];
  children: React.ReactNode;
}

export function Typography({
  variant = 'body',
  color,
  align,
  glow = false,
  glowColor = colors.primary,
  style,
  children,
  ...rest
}: TypographyProps) {
  const baseStyle = typography[variant] || typography.body;

  const glowStyle: TextStyle = glow
    ? {
        textShadowColor: glowColor,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
      }
    : {};

  const computedStyle: TextStyle = {
    ...baseStyle,
    ...(color ? { color } : {}),
    ...(align ? { textAlign: align } : {}),
    ...glowStyle,
  };

  return (
    <RNText
      style={[computedStyle, style]}
      maxFontSizeMultiplier={1.3}
      {...rest}
    >
      {children}
    </RNText>
  );
}

// Convenience Semantic Helpers
export const Display = (props: TypographyProps) => <Typography variant="display" {...props} />;
export const H1 = (props: TypographyProps) => <Typography variant="h1" {...props} />;
export const H2 = (props: TypographyProps) => <Typography variant="h2" {...props} />;
export const H3 = (props: TypographyProps) => <Typography variant="h3" {...props} />;
export const Body = (props: TypographyProps) => <Typography variant="body" {...props} />;
export const BodySmall = (props: TypographyProps) => <Typography variant="bodySmall" {...props} />;
export const Caption = (props: TypographyProps) => <Typography variant="caption" {...props} />;
export const Label = (props: TypographyProps) => <Typography variant="caption" {...props} />;
export const ButtonText = (props: TypographyProps) => <Typography variant="button" {...props} />;
export const NumericDisplay = (props: TypographyProps) => <Typography variant="numericDisplay" {...props} />;
export const XPLevelDisplay = (props: TypographyProps) => <Typography variant="xpLevelDisplay" {...props} />;
export const GlowText = (props: TypographyProps) => <Typography glow {...props} />;
export const Text = (props: TypographyProps) => <Typography variant="body" {...props} />;
