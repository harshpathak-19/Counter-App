import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import ProgressRing from "@/src/components/ProgressRing";
import { colors, spacing, radius, font } from "@/src/lib/theme";
import { deityMantra, deityName, useI18n } from "@/src/lib/i18n";
import { api, Deity, JaapSummary } from "@/src/lib/api";
import { getGuestId } from "@/src/lib/guest";

const MALA_SIZE = 108;

export default function JaapScreen() {
  const { t, lang } = useI18n();
  const [guestId, setGuestId] = useState<string>("");
  const [deities, setDeities] = useState<Deity[]>([]);
  const [selected, setSelected] = useState<Deity | null>(null);
  const [summary, setSummary] = useState<JaapSummary | null>(null);
  const [malaProgress, setMalaProgress] = useState(0);
  const [malasCompleted, setMalasCompleted] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMantra, setCustomMantra] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const scale = useSharedValue(1);
  const celebrateScale = useSharedValue(0);
  const pending = useRef(0);
  const syncTimer = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const gid = await getGuestId();
      setGuestId(gid);
      await refresh(gid);
    })();
  }, []);

  const refresh = useCallback(async (gid: string) => {
    try {
      const [ds, s] = await Promise.all([api.listDeities(gid), api.summary(gid)]);
      setDeities(ds);
      setSummary(s);
      if (!selected && ds.length > 0) setSelected(ds[0]);
    } catch (e) {
      // offline / server down — silently continue
    }
  }, [selected]);

  const syncPending = useCallback(async () => {
    if (!guestId || !selected || pending.current <= 0) return;
    const count = pending.current;
    pending.current = 0;
    try {
      await api.createJaap({ guest_id: guestId, deity_id: selected.id, count });
      const s = await api.summary(guestId);
      setSummary(s);
    } catch {
      // Restore pending count for next sync attempt
      pending.current += count;
    }
  }, [guestId, selected]);

  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(syncPending, 800);
  }, [syncPending]);

  const animateTapButton = () => {
    scale.value = withSequence(
      withTiming(0.94, { duration: 60 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
  };

  const showCelebration = () => {
    setCelebrate(true);
    celebrateScale.value = 0;
    celebrateScale.value = withSequence(
      withTiming(1, { duration: 220 }),
      withTiming(1, { duration: 900 }),
      withTiming(0, { duration: 300 }, () => {})
    );
    setTimeout(() => setCelebrate(false), 1500);
  };

  const onTap = useCallback(() => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateTapButton();
    setMalaProgress((prev) => {
      const next = prev + 1;
      if (next >= MALA_SIZE) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showCelebration();
        setMalasCompleted((m) => m + 1);
        return 0;
      }
      return next;
    });
    // Optimistic local counts
    setSummary((s) =>
      s
        ? {
            ...s,
            today: s.today + 1,
            lifetime: s.lifetime + 1,
            per_deity_today: {
              ...s.per_deity_today,
              [selected.id]: (s.per_deity_today[selected.id] || 0) + 1,
            },
            per_deity_lifetime: {
              ...s.per_deity_lifetime,
              [selected.id]: (s.per_deity_lifetime[selected.id] || 0) + 1,
            },
          }
        : s
    );
    pending.current += 1;
    scheduleSync();
  }, [selected, scheduleSync]);

  const onSelectDeity = (d: Deity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(d);
    setMalaProgress(0);
  };

  const resetMala = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMalaProgress(0);
  };

  const addCustom = async () => {
    if (!guestId || !customName.trim() || !customMantra.trim()) return;
    try {
      const d = await api.createCustomDeity({
        guest_id: guestId,
        name_en: customName.trim(),
        mantra_en: customMantra.trim(),
      });
      setDeities((prev) => [...prev, d]);
      setSelected(d);
      setCustomName("");
      setCustomMantra("");
      setAddOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const celebrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrateScale.value }],
    opacity: celebrateScale.value,
  }));

  const perDeityToday = summary?.per_deity_today?.[selected?.id || ""] || 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle} testID="app-title">
            {t.app_name}
          </Text>
          <Text style={styles.guestNote}>{t.guest_mode}</Text>
        </View>
        <Pressable
          testID="add-custom-btn"
          onPress={() => setAddOpen(true)}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.addBtnText}>{t.add_custom}</Text>
        </Pressable>
      </View>

      {/* Deity selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.deityRow}
        contentContainerStyle={styles.deityRowContent}
        testID="deity-selector"
      >
        {deities.map((d) => {
          const active = selected?.id === d.id;
          return (
            <Pressable
              key={d.id}
              onPress={() => onSelectDeity(d)}
              style={[styles.deityCard, active && styles.deityCardActive]}
              testID={`deity-${d.id}`}
            >
              <Image
                source={{ uri: d.image_url }}
                style={styles.deityImg}
                contentFit="cover"
                transition={200}
              />
              <Text
                numberOfLines={1}
                style={[styles.deityLabel, active && styles.deityLabelActive]}
              >
                {deityName(d, lang)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Selected mantra */}
      {selected ? (
        <View style={styles.mantraBox}>
          <Text style={styles.mantraText} numberOfLines={2}>
            {deityMantra(selected, lang)}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      )}

      {/* Main tap counter */}
      <View style={styles.counterWrap}>
        <View style={styles.ringWrap}>
          <ProgressRing
            size={280}
            strokeWidth={14}
            progress={malaProgress / MALA_SIZE}
            color={selected?.color || colors.brandPrimary}
          />
          <Animated.View style={[styles.counterInner, animatedStyle]}>
            <Pressable
              testID="jaap-tap-btn"
              onPress={onTap}
              style={({ pressed }) => [
                styles.tapBtn,
                { backgroundColor: selected?.color || colors.brandPrimary },
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={styles.tapCount} testID="mala-count">
                {malaProgress}
              </Text>
              <Text style={styles.tapOf}>/ {MALA_SIZE}</Text>
              <Text style={styles.tapHint}>{t.tap_to_count}</Text>
            </Pressable>
          </Animated.View>

          {celebrate && (
            <Animated.View
              style={[styles.celebrate, celebrateStyle, { pointerEvents: "none" }]}
            >
              <Text style={styles.celebrateText}>🌸</Text>
              <Text style={styles.celebrateMsg}>{t.mala_complete}</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.malaRow}>
          <Text style={styles.malaText}>
            {t.completed_malas}: <Text style={styles.malaNum}>{malasCompleted}</Text>
          </Text>
          <Pressable onPress={resetMala} testID="reset-mala-btn" style={styles.resetBtn}>
            <Ionicons name="refresh" size={14} color={colors.onBrandTertiary} />
            <Text style={styles.resetText}>{t.reset}</Text>
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label={t.todays_count} value={perDeityToday} testID="stat-today" />
        <StatCard label={t.streak} value={`${summary?.streak || 0} ${t.days}`} testID="stat-streak" />
        <StatCard
          label={t.lifetime}
          value={summary?.per_deity_lifetime?.[selected?.id || ""] || 0}
          testID="stat-lifetime"
        />
      </View>

      {/* Add custom mantra modal */}
      <Modal
        visible={addOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAddOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalWrap}
        >
          <ScrollView
            style={{ maxHeight: "90%" }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard} testID="add-custom-modal">
            <Text style={styles.modalTitle}>{t.add_custom_mantra}</Text>
            <Text style={styles.inputLabel}>{t.name}</Text>
            <TextInput
              testID="custom-name-input"
              value={customName}
              onChangeText={setCustomName}
              placeholder="Rama"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Text style={styles.inputLabel}>{t.mantra}</Text>
            <TextInput
              testID="custom-mantra-input"
              value={customMantra}
              onChangeText={setCustomMantra}
              placeholder="Om Sri Ramaya Namah"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            />
            <View style={styles.modalActions}>
              <Pressable
                testID="add-custom-cancel"
                onPress={() => setAddOpen(false)}
                style={[styles.modalBtn, styles.modalBtnGhost]}
              >
                <Text style={styles.modalBtnGhostText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                testID="add-custom-save"
                onPress={addCustom}
                style={[styles.modalBtn, styles.modalBtnPrimary]}
              >
                <Text style={styles.modalBtnPrimaryText}>{t.save}</Text>
              </Pressable>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  testID,
}: {
  label: string;
  value: number | string;
  testID?: string;
}) {
  return (
    <View style={styles.statCard} testID={testID}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  appTitle: {
    fontSize: 24,
    fontFamily: font.display,
    color: colors.onSurface,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  guestNote: { fontSize: 11, color: colors.muted, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    gap: 4,
  },
  addBtnText: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 13 },
  deityRow: { flexGrow: 0, maxHeight: 100 },
  deityRowContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  deityCard: {
    width: 68,
    alignItems: "center",
    flexShrink: 0,
  },
  deityCardActive: {},
  deityImg: {
    width: 60,
    height: 60,
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
  deityLabelActive: { color: colors.brandPrimary, fontWeight: "700" },
  mantraBox: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mantraText: {
    fontSize: 15,
    color: colors.onSurfaceSecondary,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBox: { alignItems: "center", padding: spacing.xl },
  counterWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.md },
  ringWrap: { width: 280, height: 280, alignItems: "center", justifyContent: "center" },
  counterInner: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 240,
    height: 240,
    borderRadius: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  tapBtn: {
    width: 240,
    height: 240,
    borderRadius: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  tapCount: {
    fontSize: 84,
    color: colors.onBrandPrimary,
    fontWeight: "800",
    fontFamily: font.display,
    lineHeight: 90,
  },
  tapOf: { fontSize: 16, color: colors.onBrandPrimary, opacity: 0.85 },
  tapHint: { fontSize: 12, color: colors.onBrandPrimary, opacity: 0.75, marginTop: 8 },
  celebrate: {
    position: "absolute",
    alignSelf: "center",
    top: -10,
    alignItems: "center",
  },
  celebrateText: { fontSize: 48 },
  celebrateMsg: {
    marginTop: 4,
    color: colors.brandSecondary,
    fontWeight: "700",
    fontSize: 14,
  },
  malaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  malaText: { color: colors.onSurface, fontSize: 14 },
  malaNum: { color: colors.brandPrimary, fontWeight: "800" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  resetText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.brandPrimary,
    fontFamily: font.display,
  },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: font.display,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSecondary,
    color: colors.onSurface,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  modalBtnPrimary: { backgroundColor: colors.brandPrimary },
  modalBtnGhost: { backgroundColor: colors.surfaceTertiary },
  modalBtnPrimaryText: { color: colors.onBrandPrimary, fontWeight: "700" },
  modalBtnGhostText: { color: colors.onSurfaceTertiary, fontWeight: "700" },
});
