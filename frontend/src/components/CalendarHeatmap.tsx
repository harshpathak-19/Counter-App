import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { colors, spacing, font } from "@/src/lib/theme";

type Cell = { date: string; intensity: number };

type Props = {
  cells: Cell[]; // ordered oldest -> newest, length ideally 7*W
  weeks?: number;
  colorScale?: string[];
  size?: number;
  gap?: number;
  title?: string;
};

export default function CalendarHeatmap({
  cells,
  weeks = 17,
  colorScale = [
    colors.surfaceTertiary,
    "#F5CFA0",
    "#F0A960",
    "#EA8A2C",
    colors.brandPrimary,
  ],
  size = 14,
  gap = 3,
  title,
}: Props) {
  const cols = weeks;
  const rows = 7;
  const width = cols * (size + gap);
  const height = rows * (size + gap);

  // Build grid: newest cell is bottom-right, we render oldest -> newest column by column
  const total = cols * rows;
  const padded: Cell[] =
    cells.length >= total
      ? cells.slice(cells.length - total)
      : [
          ...Array(total - cells.length).fill({ date: "", intensity: 0 }),
          ...cells,
        ];

  return (
    <View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Svg width={width} height={height}>
        {padded.map((c, i) => {
          const col = Math.floor(i / rows);
          const row = i % rows;
          const clampedIdx = Math.min(
            colorScale.length - 1,
            Math.max(0, Math.round(c.intensity * (colorScale.length - 1)))
          );
          return (
            <Rect
              key={i}
              x={col * (size + gap)}
              y={row * (size + gap)}
              width={size}
              height={size}
              rx={3}
              fill={colorScale[clampedIdx]}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.sm,
    fontFamily: font.text,
  },
});
