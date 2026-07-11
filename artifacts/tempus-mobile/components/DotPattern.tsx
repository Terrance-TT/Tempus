import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

const SPACING = 24;
const DOT_R = 1.5;

export function DotPattern() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();

  const cols = Math.ceil(width / SPACING) + 1;
  const rows = Math.ceil(height / SPACING) + 1;

  const dots: { cx: number; cy: number; key: string }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({ cx: c * SPACING, cy: r * SPACING, key: `${r}-${c}` });
    }
  }

  return (
    <Svg
      style={[StyleSheet.absoluteFill, { opacity: 0.18 }]}
      pointerEvents="none"
      width={width}
      height={height}
    >
      {dots.map((d) => (
        <Circle key={d.key} cx={d.cx} cy={d.cy} r={DOT_R} fill={colors.primary} />
      ))}
    </Svg>
  );
}
