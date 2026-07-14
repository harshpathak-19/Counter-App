import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { colors, spacing, radius, font } from "@/src/lib/theme";

type Props = {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
};

export default function BarChart({ data, height = 160, color = colors.brandPrimary }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 320;
  const padding = 8;
  const chartH = height - 28;
  const barW = data.length > 0 ? (width - padding * 2) / data.length - 3 : 0;

  return (
    <View>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = (d.value / max) * (chartH - 8);
          const x = padding + i * ((width - padding * 2) / data.length);
          const y = chartH - h;
          return (
            <Rect
              key={i}
              x={x + 1.5}
              y={y}
              width={Math.max(1, barW)}
              height={Math.max(1, h)}
              rx={3}
              fill={d.value > 0 ? color : colors.surfaceTertiary}
            />
          );
        })}
      </Svg>
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{data[0]?.label || ""}</Text>
        <Text style={styles.axisLabel}>
          {data[Math.floor(data.length / 2)]?.label || ""}
        </Text>
        <Text style={styles.axisLabel}>{data[data.length - 1]?.label || ""}</Text>
      </View>
      <Text style={styles.maxLabel}>Max: {max}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  axisLabel: {
    fontSize: 10,
    color: colors.muted,
    fontFamily: font.text,
  },
  maxLabel: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.muted,
    textAlign: "right",
    fontFamily: font.text,
  },
});
