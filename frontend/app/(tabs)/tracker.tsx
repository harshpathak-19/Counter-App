import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import CalendarHeatmap from "@/src/components/CalendarHeatmap";
import { colors, spacing, radius, font } from "@/src/lib/theme";
import { useI18n } from "@/src/lib/i18n";
import { api, BrahmacharyaResp } from "@/src/lib/api";
import { getGuestId } from "@/src/lib/guest";

function todayIso() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TrackerScreen() {
  const { t } = useI18n();
  const [guestId, setGuestId] = useState("");
  const [data, setData] = useState<BrahmacharyaResp | null>(null);
  const [loading, setLoading] = useState(true);
  const today = todayIso();
  const todaysStatus = data?.entries.find((e) => e.date === today)?.status;

  const load = useCallback(async (gid: string) => {
    setLoading(true);
    try {
      const d = await api.getBrahmacharya(gid, 119); // 17 weeks
      setData(d);
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

  const checkIn = async (status: "success" | "relapse") => {
    if (!guestId) return;
    Haptics.notificationAsync(
      status === "success"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    try {
      await api.logBrahmacharya({ guest_id: guestId, date: today, status });
      await load(guestId);
    } catch {}
  };

  // Build heatmap cells for last 119 days
  const cells: { date: string; intensity: number }[] = [];
  const byDate = new Map(data?.entries.map((e) => [e.date, e.status]) || []);
  for (let i = 118; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const s = byDate.get(iso);
    cells.push({
      date: iso,
      intensity: s === "success" ? 1 : s === "relapse" ? 0.15 : 0,
    });
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t.brahmacharya_title}</Text>
          <Text style={styles.subtitle}>{t.brahmacharya_sub}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.streakCard} testID="brahmacharya-streak">
              <Text style={styles.streakNum}>{data?.streak || 0}</Text>
              <Text style={styles.streakLabel}>{t.streak} • {t.days}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t.check_in_today}</Text>
              <View style={styles.checkRow}>
                <Pressable
                  testID="checkin-success"
                  onPress={() => checkIn("success")}
                  style={[
                    styles.checkBtn,
                    todaysStatus === "success" && styles.checkBtnSuccess,
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={
                      todaysStatus === "success" ? colors.onSuccess : colors.success
                    }
                  />
                  <Text
                    style={[
                      styles.checkText,
                      todaysStatus === "success" && { color: colors.onSuccess },
                    ]}
                  >
                    {t.success}
                  </Text>
                </Pressable>
                <Pressable
                  testID="checkin-relapse"
                  onPress={() => checkIn("relapse")}
                  style={[
                    styles.checkBtn,
                    todaysStatus === "relapse" && styles.checkBtnRelapse,
                  ]}
                >
                  <Ionicons
                    name="close-circle"
                    size={22}
                    color={todaysStatus === "relapse" ? colors.onError : colors.error}
                  />
                  <Text
                    style={[
                      styles.checkText,
                      todaysStatus === "relapse" && { color: colors.onError },
                    ]}
                  >
                    {t.relapse}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Last 17 weeks</Text>
              <View style={{ alignItems: "center", marginTop: spacing.md }}>
                <CalendarHeatmap cells={cells} weeks={17} size={14} />
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.miniCard, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={styles.miniNum}>{data?.success_days || 0}</Text>
                <Text style={styles.miniLabel}>{t.success_days}</Text>
              </View>
              <View style={[styles.miniCard, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.miniNum, { color: colors.error }]}>
                  {data?.relapse_days || 0}
                </Text>
                <Text style={styles.miniLabel}>{t.relapse_days}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  headerRow: { marginBottom: spacing.lg },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.onSurface,
    fontFamily: font.display,
  },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  streakCard: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  streakNum: {
    fontSize: 56,
    fontWeight: "800",
    color: colors.onBrandPrimary,
    fontFamily: font.display,
  },
  streakLabel: {
    color: colors.onBrandPrimary,
    opacity: 0.9,
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardLabel: { fontSize: 13, color: colors.muted, marginBottom: spacing.sm, fontWeight: "600" },
  checkRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  checkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkBtnSuccess: { backgroundColor: colors.success, borderColor: colors.success },
  checkBtnRelapse: { backgroundColor: colors.error, borderColor: colors.error },
  checkText: { fontWeight: "700", color: colors.onSurface },
  statsRow: { flexDirection: "row", gap: spacing.md },
  miniCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniNum: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.brandPrimary,
    fontFamily: font.display,
  },
  miniLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
