import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";

import { colors, spacing, radius, font } from "@/src/lib/theme";
import { useI18n, Lang } from "@/src/lib/i18n";
import { api, Reminder } from "@/src/lib/api";
import { getGuestId } from "@/src/lib/guest";
import {
  cancelIds,
  ensureNotificationPermission,
  scheduleReminder,
} from "@/src/lib/notifications";

export default function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const [guestId, setGuestId] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [pickerTime, setPickerTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (gid: string) => {
    setLoading(true);
    try {
      const r = await api.listReminders(gid);
      setReminders(r);
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

  const toggleDay = (d: number) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const addReminder = async () => {
    if (!guestId) return;
    setSaving(true);
    const granted = await ensureNotificationPermission();
    if (!granted) {
      setSaving(false);
      return;
    }
    try {
      const ids = await scheduleReminder(
        pickerTime.getHours(),
        pickerTime.getMinutes(),
        selectedDays,
        t.app_name,
        t.tap_to_count
      );
      const r = await api.createReminder({
        guest_id: guestId,
        hour: pickerTime.getHours(),
        minute: pickerTime.getMinutes(),
        repeat_days: selectedDays,
        enabled: true,
        notification_ids: ids,
      });
      setReminders((prev) => [...prev, r]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddOpen(false);
      setSelectedDays([]);
    } catch {}
    setSaving(false);
  };

  const removeReminder = async (rem: Reminder) => {
    await cancelIds(rem.notification_ids || []);
    try {
      await api.deleteReminder(rem.id, guestId);
      setReminders((prev) => prev.filter((x) => x.id !== rem.id));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const fmtTime = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t.settings_title}</Text>

        {/* Language toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.language}</Text>
          <View style={styles.langRow}>
            {(["en", "hi"] as Lang[]).map((l) => {
              const active = lang === l;
              return (
                <Pressable
                  key={l}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLang(l);
                  }}
                  style={[styles.langBtn, active && styles.langBtnActive]}
                  testID={`lang-${l}`}
                >
                  <Text style={[styles.langText, active && styles.langTextActive]}>
                    {l === "en" ? "English" : "हिन्दी"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{t.reminders}</Text>
            <Pressable
              testID="add-reminder-btn"
              onPress={() => setAddOpen(true)}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={16} color={colors.onBrandPrimary} />
              <Text style={styles.addBtnText}>{t.add_reminder}</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 20 }} />
          ) : reminders.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={28} color={colors.muted} />
              <Text style={styles.emptyText}>No reminders yet</Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {reminders.map((r) => (
                <View key={r.id} style={styles.reminderRow} testID={`reminder-${r.id}`}>
                  <View style={styles.reminderTimeBox}>
                    <Text style={styles.reminderTime}>{fmtTime(r.hour, r.minute)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderRepeat}>
                      {r.repeat_days.length === 0
                        ? t.everyday
                        : r.repeat_days
                            .map((d) => t.day_labels[d])
                            .join(" ")}
                    </Text>
                    <Text style={styles.reminderSub}>{r.message || t.tap_to_count}</Text>
                  </View>
                  <Pressable
                    testID={`reminder-delete-${r.id}`}
                    onPress={() => removeReminder(r)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.footer}>{t.guest_mode}</Text>
      </ScrollView>

      {/* Add reminder modal */}
      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddOpen(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard} testID="add-reminder-modal">
            <Text style={styles.modalTitle}>{t.add_reminder}</Text>

            <Text style={styles.inputLabel}>{t.reminder_time}</Text>
            <Pressable
              testID="pick-time-btn"
              onPress={() => setShowPicker(true)}
              style={styles.timePickBtn}
            >
              <Ionicons name="time-outline" size={20} color={colors.brandPrimary} />
              <Text style={styles.timePickText}>
                {fmtTime(pickerTime.getHours(), pickerTime.getMinutes())}
              </Text>
            </Pressable>

            {(showPicker || Platform.OS === "ios") && (
              <DateTimePicker
                testID="time-picker"
                value={pickerTime}
                mode="time"
                is24Hour
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowPicker(false);
                  if (d) setPickerTime(d);
                }}
              />
            )}

            <Text style={styles.inputLabel}>{t.reminder_repeat}</Text>
            <View style={styles.dayRow}>
              {t.day_labels.map((lbl, idx) => {
                const active = selectedDays.includes(idx);
                return (
                  <Pressable
                    key={idx}
                    onPress={() => toggleDay(idx)}
                    style={[styles.dayBtn, active && styles.dayBtnActive]}
                    testID={`day-${idx}`}
                  >
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>
                      {lbl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.helpText}>
              {selectedDays.length === 0 ? t.everyday : ""}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                testID="reminder-cancel"
                onPress={() => setAddOpen(false)}
                style={[styles.modalBtn, styles.modalBtnGhost]}
              >
                <Text style={styles.modalBtnGhostText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                testID="reminder-save"
                onPress={addReminder}
                disabled={saving}
                style={[styles.modalBtn, styles.modalBtnPrimary, saving && { opacity: 0.6 }]}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {saving ? "..." : t.save}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  langRow: { flexDirection: "row", gap: spacing.sm },
  langBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
  },
  langBtnActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  langText: { fontWeight: "700", color: colors.onSurfaceSecondary },
  langTextActive: { color: colors.onBrandPrimary },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    gap: 4,
  },
  addBtnText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 12 },
  emptyBox: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  emptyText: { color: colors.muted, fontSize: 13 },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  reminderTimeBox: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  reminderTime: {
    color: colors.onBrandTertiary,
    fontWeight: "800",
    fontSize: 15,
    fontFamily: font.display,
  },
  reminderRepeat: { color: colors.onSurface, fontWeight: "600", fontSize: 13 },
  reminderSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 6 },
  footer: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.xl,
  },
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
    marginBottom: 6,
    marginTop: spacing.md,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timePickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePickText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.onSurface,
    fontFamily: font.display,
  },
  dayRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.sm,
  },
  dayBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  dayText: { fontWeight: "700", color: colors.onSurfaceSecondary, fontSize: 13 },
  dayTextActive: { color: colors.onBrandPrimary },
  helpText: { color: colors.muted, fontSize: 11, marginTop: 6 },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
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
