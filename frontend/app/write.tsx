import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { colors, spacing, radius, font } from "@/src/lib/theme";
import { deityMantra, deityName, useI18n } from "@/src/lib/i18n";
import { api, Deity } from "@/src/lib/api";
import { getGuestId } from "@/src/lib/guest";

export default function WriteScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [guestId, setGuestId] = useState("");
  const [deities, setDeities] = useState<Deity[]>([]);
  const [selected, setSelected] = useState<Deity | null>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [sessionCount, setSessionCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const busy = useRef(false);

  const refreshToday = useCallback(async (gid: string, deityId: string) => {
    try {
      const s = await api.summary(gid);
      setTodayCount(s.per_deity_today?.[deityId] || 0);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const gid = await getGuestId();
      setGuestId(gid);
      try {
        const ds = await api.listDeities(gid);
        setDeities(ds);
        if (ds.length > 0) {
          setSelected(ds[0]);
          await refreshToday(gid, ds[0].id);
        }
      } catch {}
    })();
  }, [refreshToday]);

  const onSelectDeity = (d: Deity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(d);
    setPaths([]);
    setCurrentPath("");
    if (guestId) refreshToday(guestId, d.id);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ w: width, h: height });
  };

  const onGrant = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
  };

  const onMove = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath((prev) =>
      prev ? `${prev} L${locationX.toFixed(1)},${locationY.toFixed(1)}` : `M${locationX.toFixed(1)},${locationY.toFixed(1)}`
    );
  };

  const onRelease = () => {
    setCurrentPath((cp) => {
      if (cp) {
        setPaths((prev) => [...prev, cp]);
      }
      return "";
    });
  };

  const clearCanvas = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaths([]);
    setCurrentPath("");
  };

  const commit = async () => {
    if (busy.current) return;
    if (!selected || !guestId) return;
    if (paths.length === 0 && !currentPath) return;
    busy.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Optimistic UI clear + count bump
    setPaths([]);
    setCurrentPath("");
    setSessionCount((c) => c + 1);
    setTodayCount((c) => c + 1);
    try {
      await api.createJaap({
        guest_id: guestId,
        deity_id: selected.id,
        count: 1,
        mode: "handwritten",
      });
    } catch {
      // If backend fails, keep local increment — will be corrected on next refresh
    }
    busy.current = false;
  };

  const strokeColor = selected?.color || colors.brandPrimary;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="write-back">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.handwritten_title}</Text>
          <Text style={styles.subtitle}>{t.handwritten_sub}</Text>
        </View>
      </View>

      {/* Deity selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.deityRow}
        contentContainerStyle={styles.deityRowContent}
        testID="write-deity-selector"
      >
        {deities.length === 0 ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ marginHorizontal: 20 }} />
        ) : (
          deities.map((d) => {
            const active = selected?.id === d.id;
            return (
              <Pressable
                key={d.id}
                onPress={() => onSelectDeity(d)}
                style={[styles.deityCard, active && styles.deityCardActive]}
                testID={`write-deity-${d.id}`}
              >
                <Image
                  source={{ uri: d.image_url }}
                  style={[styles.deityImg, active && { borderColor: strokeColor }]}
                  contentFit="cover"
                />
                <Text
                  numberOfLines={1}
                  style={[styles.deityLabel, active && { color: strokeColor, fontWeight: "700" }]}
                >
                  {deityName(d, lang)}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {selected && (
        <View style={styles.mantraBox}>
          <Text style={styles.mantraText} numberOfLines={2}>
            {deityMantra(selected, lang)}
          </Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard} testID="write-session-count">
          <Text style={styles.statValue}>{sessionCount}</Text>
          <Text style={styles.statLabel}>{t.session_count}</Text>
        </View>
        <View style={styles.statCard} testID="write-today-count">
          <Text style={styles.statValue}>{todayCount}</Text>
          <Text style={styles.statLabel}>{t.todays_total}</Text>
        </View>
      </View>

      {/* Canvas */}
      <View
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminate={onRelease}
        style={styles.canvas}
        testID="write-canvas"
      >
        {canvasSize.w > 0 && (
          <Svg width={canvasSize.w} height={canvasSize.h}>
            {paths.map((p, i) => (
              <Path
                key={i}
                d={p}
                stroke={strokeColor}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={strokeColor}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}
          </Svg>
        )}
        {paths.length === 0 && !currentPath && (
          <View style={styles.hint} pointerEvents="none">
            <Ionicons name="create-outline" size={44} color={colors.borderStrong} />
            <Text style={styles.hintText}>{t.write_something}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={clearCanvas} style={styles.clearBtn} testID="write-clear">
          <Ionicons name="refresh" size={16} color={colors.onBrandTertiary} />
          <Text style={styles.clearText}>{t.clear_canvas}</Text>
        </Pressable>
        <Pressable
          onPress={commit}
          style={[styles.doneBtn, { backgroundColor: strokeColor }]}
          testID="write-done"
        >
          <Ionicons name="checkmark" size={20} color={colors.onBrandPrimary} />
          <Text style={styles.doneText}>{t.done_plus_one}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
    fontFamily: font.display,
  },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  deityRow: { flexGrow: 0, maxHeight: 96 },
  deityRowContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  deityCard: { width: 66, alignItems: "center", flexShrink: 0 },
  deityCardActive: {},
  deityImg: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  deityLabel: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
  },
  mantraBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mantraText: {
    fontSize: 13,
    fontStyle: "italic",
    color: colors.onSurfaceSecondary,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.brandPrimary,
    fontFamily: font.display,
  },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  canvas: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderStyle: "dashed",
    overflow: "hidden",
    position: "relative",
  },
  hint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  hintText: { color: colors.muted, fontSize: 12, textAlign: "center" },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
  },
  clearText: { color: colors.onBrandTertiary, fontWeight: "700" },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 52,
    borderRadius: radius.pill,
  },
  doneText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 16 },
});
