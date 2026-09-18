import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

interface ManaCrystalIconProps {
  size?: number;
  color?: string; // Default crystal glow color
  secondaryColor?: string;
}

export function ManaCrystalIcon({
  size = 20,
  color = '#00D2EE',
  secondaryColor = '#0284C7',
}: ManaCrystalIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="crystalGradMain" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <Stop offset="100%" stopColor={secondaryColor} stopOpacity="0.8" />
        </LinearGradient>
        <LinearGradient id="crystalGradFacetLeft" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </LinearGradient>
        <LinearGradient id="crystalGradFacetRight" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
          <Stop offset="100%" stopColor={secondaryColor} stopOpacity="0.2" />
        </LinearGradient>
      </Defs>

      {/* Main Outer Crystal Hexagonal Spire */}
      <Polygon
        points="12,1.5 19.5,7.5 19.5,16.5 12,22.5 4.5,16.5 4.5,7.5"
        fill="url(#crystalGradMain)"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Left Light Reflection Facet */}
      <Polygon
        points="12,1.5 4.5,7.5 12,12"
        fill="url(#crystalGradFacetLeft)"
      />

      {/* Center Core Facet */}
      <Polygon
        points="12,1.5 19.5,7.5 12,12"
        fill="rgba(255, 255, 255, 0.25)"
      />

      {/* Lower Left Facet */}
      <Polygon
        points="4.5,7.5 4.5,16.5 12,12"
        fill="rgba(255, 255, 255, 0.15)"
      />

      {/* Lower Right Shadow Facet */}
      <Polygon
        points="19.5,7.5 19.5,16.5 12,12"
        fill="url(#crystalGradFacetRight)"
      />

      {/* Bottom Apex Left Facet */}
      <Polygon
        points="4.5,16.5 12,22.5 12,12"
        fill="rgba(2, 132, 199, 0.4)"
      />

      {/* Bottom Apex Right Facet */}
      <Polygon
        points="19.5,16.5 12,22.5 12,12"
        fill="rgba(0, 0, 0, 0.35)"
      />

      {/* Inner Crystal Core Seam Line */}
      <Path
        d="M12,1.5 L12,22.5 M4.5,7.5 L19.5,7.5 M4.5,16.5 L19.5,16.5 M12,1.5 L12,12 L19.5,16.5 M12,12 L4.5,16.5"
        stroke="#FFFFFF"
        strokeWidth="0.6"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}
