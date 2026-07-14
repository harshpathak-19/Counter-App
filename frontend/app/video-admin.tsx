import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors, spacing, radius, font } from "@/src/lib/theme";
import { useI18n } from "@/src/lib/i18n";
import { api } from "@/src/lib/api";

const ADMIN_KEY = "naamsmaran.adminPw";
const CATEGORIES = ["Krishna Leela", "Satsang", "Kirtan", "Other"];

function detectPlatform(url: string): "youtube" | "instagram" {
  if (/instagram\.com/i.test(url)) return "instagram";
  return "youtube";
}

export default function VideoAdminScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [thumb, setThumb] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Auto-login using stored password
  useEffect(() => {
    AsyncStorage.getItem(ADMIN_KEY).then(async (v) => {
      if (!v) return;
      try {
        await api.adminCheck(v);
        setPw(v);
        setAuthed(true);
      } catch {
        AsyncStorage.removeItem(ADMIN_KEY);
      }
    });
  }, []);

  const login = async () => {
    if (!pw.trim()) return;
    setChecking(true);
    setAuthError("");
    try {
      await api.adminCheck(pw.trim());
      await AsyncStorage.setItem(ADMIN_KEY, pw.trim());
      setAuthed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setAuthError(t.invalid_password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setChecking(false);
  };

  const save = async () => {
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    setMsg(null);
    const platform = detectPlatform(url.trim());
    try {
      await api.createVideo({
        admin_password: pw,
        title: title.trim(),
        video_url: url.trim(),
        platform,
        thumbnail_url: thumb.trim() || undefined,
        category,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMsg({ type: "ok", text: "Video added" });
      setTitle("");
      setUrl("");
      setThumb("");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMsg({ type: "err", text: e?.message || "Failed to save" });
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="admin-back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t.add_video}</Text>
            <Text style={styles.subtitle}>{t.admin_only}</Text>
          </View>
          {authed && (
            <Pressable
              testID="admin-logout"
              onPress={async () => {
                await AsyncStorage.removeItem(ADMIN_KEY);
                setAuthed(false);
                setPw("");
              }}
              style={styles.logoutBtn}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {!authed ? (
            <View>
              <Text style={styles.label}>{t.admin_password}</Text>
              <TextInput
                testID="admin-pw-input"
                value={pw}
                onChangeText={setPw}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="none"
              />
              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
              <Pressable
                testID="admin-login-btn"
                onPress={login}
                disabled={checking}
                style={[styles.primaryBtn, checking && { opacity: 0.6 }]}
              >
                {checking ? (
                  <ActivityIndicator color={colors.onBrandPrimary} />
                ) : (
                  <Text style={styles.primaryBtnText}>{t.admin_login}</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>{t.video_title}</Text>
              <TextInput
                testID="video-title-input"
                value={title}
                onChangeText={setTitle}
                placeholder="Hare Krishna Kirtan"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />

              <Text style={styles.label}>{t.video_url}</Text>
              <TextInput
                testID="video-url-input"
                value={url}
                onChangeText={setUrl}
                placeholder="https://youtu.be/... or https://www.instagram.com/reel/..."
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {url ? (
                <Text style={styles.hintText}>
                  Detected: {detectPlatform(url) === "youtube" ? "YouTube" : "Instagram"}
                </Text>
              ) : null}

              <Text style={styles.label}>{t.video_category}</Text>
              <View style={styles.catRow}>
                {CATEGORIES.map((c) => {
                  const active = c === category;
                  return (
                    <Pressable
                      key={c}
                      testID={`cat-${c.replace(/\s+/g, "-").toLowerCase()}`}
                      onPress={() => setCategory(c)}
                      style={[styles.catChip, active && styles.catChipActive]}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          active && styles.catChipTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{t.video_thumb}</Text>
              <TextInput
                testID="video-thumb-input"
                value={thumb}
                onChangeText={setThumb}
                placeholder="https://... (auto-derived for YouTube)"
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {msg && (
                <View
                  style={[
                    styles.msgBox,
                    { backgroundColor: msg.type === "ok" ? colors.success : colors.error },
                  ]}
                  testID="admin-msg"
                >
                  <Text style={styles.msgText}>{msg.text}</Text>
                </View>
              )}

              <Pressable
                testID="video-save-btn"
                onPress={save}
                disabled={saving || !title.trim() || !url.trim()}
                style={[
                  styles.primaryBtn,
                  (saving || !title.trim() || !url.trim()) && { opacity: 0.5 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.onBrandPrimary} />
                ) : (
                  <Text style={styles.primaryBtnText}>{t.save}</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: spacing.md,
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
  logoutBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.md },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    marginTop: spacing.md,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surfaceSecondary,
    color: colors.onSurface,
    fontSize: 14,
  },
  hintText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
    fontStyle: "italic",
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 6,
  },
  primaryBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.brandPrimary,
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: colors.onBrandPrimary,
    fontWeight: "800",
    fontSize: 15,
  },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  catChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  catChipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  catChipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  catChipTextActive: { color: colors.onBrandPrimary },
  msgBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  msgText: { color: "#FFF", fontWeight: "700", textAlign: "center" },
});
