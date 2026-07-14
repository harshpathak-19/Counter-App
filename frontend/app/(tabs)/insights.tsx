import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BarChart from "@/src/components/BarChart";
import CalendarHeatmap from "@/src/components/CalendarHeatmap";
import { colors, spacing, radius, font } from "@/src/lib/theme";
import { deityName, useI18n } from "@/src/lib/i18n";
import { api, Deity, HistoryDay, JaapSummary } from "@/src/lib/api";
import { getGuestId } from "@/src/lib/guest";

export default function InsightsScreen() {
  const { t, lang } = useI18n();
  const [guestId, setGuestId] = useState("");
  const [deities, setDeities] = useState<Deity[]>([]);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [summary, setSummary] = useState<JaapSummary | null>(null);
  const [selected, setSelected] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (gid: string) => {
    setLoading(true);
    try {
      const [ds, h, s] = await Promise.all([
        api.listDeities(gid),
        api.history(gid, 30),
        api.summary(gid),
      ]);
      setDeities(ds);
      setHistory(h.days);
      setSummary(s);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const gid = await getGuestId();
      setGuestId(gid);
      await load(gid);
    })();
  }, [load]);

  const chartData = useMemo(() => {
    return history.map((d) => {
      const day = d.date.slice(8);
      const v = selected === "all" ? d.total : d.per_deity[selected] || 0;
      return { label: day, value: v };
    });
  }, [history, selected]);

  const totalIn30 = chartData.reduce((a, b) => a + b.value, 0);
  const maxVal = Math.max(0, ...chartData.map((c) => c.value));
  const heatmapCells = history.map((d) => ({
    date: d.date,
    intensity: maxVal > 0 ? Math.min(1, d.total / maxVal) : 0,
  }));

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t.insights_title}</Text>
        <Text style={styles.subtitle}>{t.last_30_days}</Text>

        {loading ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.sumCard} testID="insights-today">
                <Text style={styles.sumNum}>{summary?.today || 0}</Text>
                <Text style={styles.sumLabel}>{t.todays_count}</Text>
              </View>
              <View style={styles.sumCard} testID="insights-streak">
                <Text style={styles.sumNum}>{summary?.streak || 0}</Text>
                <Text style={styles.sumLabel}>{t.streak}</Text>
              </View>
              <View style={styles.sumCard} testID="insights-lifetime">
                <Text style={styles.sumNum}>{summary?.lifetime || 0}</Text>
                <Text style={styles.sumLabel}>{t.lifetime}</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsRow}
              contentContainerStyle={styles.chipsContent}
              testID="deity-filter"
            >
              <Chip
                label={t.all_deities}
                active={selected === "all"}
                onPress={() => setSelected("all")}
                testID="chip-all"
              />
              {deities.map((d) => (
                <Chip
                  key={d.id}
                  label={deityName(d, lang)}
                  active={selected === d.id}
                  onPress={() => setSelected(d.id)}
                  testID={`chip-${d.id}`}
                />
              ))}
            </ScrollView>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>
                {selected === "all"
                  ? t.total_across_all
                  : deityName(deities.find((x) => x.id === selected) || ({} as any), lang) || ""}
              </Text>
              <Text style={styles.cardBig}>{totalIn30}</Text>
              <View style={{ alignItems: "center", marginTop: spacing.sm }}>
                <BarChart data={chartData} height={160} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Daily intensity heatmap</Text>
              <View style={{ alignItems: "center", marginTop: spacing.sm }}>
                <CalendarHeatmap cells={heatmapCells} weeks={5} size={22} gap={4} />
              </View>
            </View>

            {summary && summary.lifetime > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>{t.milestones}</Text>
                <View style={styles.milestoneList}>
                  {[
                    { label: "First mala", threshold: 108 },
                    { label: "1000 chants", threshold: 1000 },
                    { label: "10 malas", threshold: 1080 },
                    { label: "100 malas", threshold: 10800 },
                  ].map((m) => {
                    const done = (summary.lifetime || 0) >= m.threshold;
                    return (
                      <View
                        key={m.label}
                        style={[styles.milestone, done && styles.milestoneDone]}
                      >
                        <Text style={styles.mileEmoji}>{done ? "🏆" : "🌙"}</Text>
                        <Text style={styles.mileLabel}>{m.label}</Text>
                        <Text style={styles.mileVal}>{m.threshold}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {summary && summary.lifetime === 0 && (
              <View style={styles.card}>
                <Text style={{ color: colors.muted, textAlign: "center" }}>{t.no_data}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.onSurface,
    fontFamily: font.display,
  },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: spacing.lg },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sumCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sumNum: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.brandPrimary,
    fontFamily: font.display,
  },
  sumLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  chipsRow: { flexGrow: 0, height: 56 },
  chipsContent: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.onBrandPrimary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardLabel: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  cardBig: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.onSurface,
    fontFamily: font.display,
    marginTop: 4,
  },
  milestoneList: { marginTop: spacing.md, gap: spacing.sm },
  milestone: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  milestoneDone: {
    borderColor: colors.brandSecondary,
    backgroundColor: colors.brandTertiary,
  },
  mileEmoji: { fontSize: 22 },
  mileLabel: { flex: 1, color: colors.onSurface, fontWeight: "600" },
  mileVal: { color: colors.muted, fontSize: 12 },
});
