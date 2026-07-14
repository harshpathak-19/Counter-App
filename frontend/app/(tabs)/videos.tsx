import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, font } from "@/src/lib/theme";
import { useI18n } from "@/src/lib/i18n";
import { api, Video } from "@/src/lib/api";

const KNOWN_CATEGORIES = ["Krishna Leela", "Satsang", "Kirtan"];

function extractYouTubeThumb(url: string, fallback?: string | null): string | undefined {
  if (fallback) return fallback;
  const idMatch = url.match(
    /(?:youtube\.com\/(?:.*v=|.*\/embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  if (idMatch) return `https://img.youtube.com/vi/${idMatch[1]}/hqdefault.jpg`;
  return undefined;
}

export default function VideosScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [category, setCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>(KNOWN_CATEGORIES);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (cat: string) => {
    try {
      const [vs, cs] = await Promise.all([
        api.listVideos(cat === "all" ? undefined : cat),
        api.videoCategories(),
      ]);
      setVideos(vs);
      // Merge known + backend categories, deduped
      const merged = Array.from(new Set([...KNOWN_CATEGORIES, ...cs.categories])).filter(Boolean);
      setCategories(merged);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load(category);
      setLoading(false);
    })();
  }, [category, load]);

  useFocusEffect(
    useCallback(() => {
      load(category);
    }, [category, load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(category);
    setRefreshing(false);
  };

  const openVideo = (v: Video) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (v.platform === "instagram") {
      Linking.openURL(v.video_url).catch(() => {});
      return;
    }
    router.push({
      pathname: "/video-player",
      params: { url: v.video_url, title: v.title },
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Sticky header + chips */}
      <View style={styles.stickyHeader}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t.videos_title}</Text>
            <Text style={styles.subtitle}>{t.videos_sub}</Text>
          </View>
          <Pressable
            testID="video-admin-btn"
            onPress={() => router.push("/video-admin")}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={16} color={colors.onBrandPrimary} />
            <Text style={styles.addBtnText}>{t.add_video}</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
          testID="videos-category-filter"
        >
          <Chip
            label={t.all_categories}
            active={category === "all"}
            onPress={() => setCategory("all")}
            testID="video-chip-all"
          />
          {categories.map((c) => (
            <Chip
              key={c}
              label={c}
              active={category === c}
              onPress={() => setCategory(c)}
              testID={`video-chip-${c.replace(/\s+/g, "-").toLowerCase()}`}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 40 }} />
      ) : videos.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="film-outline" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>{t.no_videos}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brandPrimary}
            />
          }
        >
          {videos.map((v) => {
            const thumb = extractYouTubeThumb(v.video_url, v.thumbnail_url);
            return (
              <Pressable
                key={v.id}
                onPress={() => openVideo(v)}
                style={styles.card}
                testID={`video-card-${v.id}`}
              >
                <View style={styles.thumbWrap}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      <Ionicons
                        name={v.platform === "instagram" ? "logo-instagram" : "logo-youtube"}
                        size={40}
                        color={colors.muted}
                      />
                    </View>
                  )}
                  <View style={styles.playOverlay} pointerEvents="none">
                    <Ionicons
                      name={v.platform === "instagram" ? "open-outline" : "play-circle"}
                      size={44}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.platformBadge}>
                    <Ionicons
                      name={v.platform === "instagram" ? "logo-instagram" : "logo-youtube"}
                      size={14}
                      color="#FFF"
                    />
                    <Text style={styles.platformText}>
                      {v.platform === "instagram" ? "Reel" : "YouTube"}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {v.title}
                  </Text>
                  <View style={styles.cardMeta}>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryText}>{v.category}</Text>
                    </View>
                    <Text style={styles.watchText}>
                      {v.platform === "instagram" ? t.open_externally : t.watch}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
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
  stickyHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.onSurface,
    fontFamily: font.display,
  },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
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
  chipsRow: { flexGrow: 0, height: 56 },
  chipsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbWrap: { position: "relative" },
  thumb: {
    width: "100%",
    height: 180,
    backgroundColor: colors.surfaceTertiary,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  platformBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  platformText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  cardBody: { padding: spacing.md },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
    fontFamily: font.display,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  categoryPill: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  categoryText: {
    color: colors.onBrandTertiary,
    fontSize: 11,
    fontWeight: "700",
  },
  watchText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700" },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  emptyText: { color: colors.muted, fontSize: 14 },
});
