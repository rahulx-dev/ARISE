import React, { useEffect, useState, useRef } from 'react';
import { Text, TextProps, StyleProp, TextStyle } from 'react-native';

interface AnimatedNumberProps extends Omit<TextProps, 'style'> {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  style?: StyleProp<TextStyle>;
}

/**
 * High-performance smooth integer count-up for Coins, Mana Crystals & Stats.
 * Interpolates value without React layout stuttering.
 */
export const AnimatedNumber = React.memo(function AnimatedNumber({
  value,
  duration = 420,
  formatter = (v) => v.toLocaleString(),
  style,
  ...props
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const previousValueRef = useRef<number>(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = previousValueRef.current;
    const endVal = value;
    previousValueRef.current = value;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const startTime = Date.now();
    const diff = endVal - startVal;

    const tick = () => {
      const now = Date.now();
      const progress = Math.min(1, (now - startTime) / duration);
      // Apple ease-out cubic curve
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + diff * easedProgress);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration]);

  return (
    <Text {...props} style={style}>
      {formatter(displayValue)}
    </Text>
  );
});
