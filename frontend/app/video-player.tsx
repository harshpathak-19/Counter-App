import { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, font } from "@/src/lib/theme";

function toEmbedUrl(raw: string): string | null {
  try {
    const m = raw.match(
      /(?:youtube\.com\/(?:.*v=|.*\/embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
    );
    if (!m) return null;
    return `https://www.youtube.com/embed/${m[1]}?autoplay=1&playsinline=1&modestbranding=1&rel=0`;
  } catch {
    return null;
  }
}

export default function VideoPlayerScreen() {
  const router = useRouter();
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const embed = useMemo(() => (url ? toEmbedUrl(url) : null), [url]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="video-player-back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>
          {title || "Video"}
        </Text>
      </View>
      <View style={styles.playerWrap}>
        {embed ? (
          <WebView
            testID="youtube-webview"
            source={{ uri: embed }}
            style={styles.player}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <ActivityIndicator
                color={colors.brandPrimary}
                style={{ marginTop: 40 }}
              />
            )}
          />
        ) : (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
            <Text style={styles.errorText}>Invalid YouTube URL</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceInverse },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surfaceInverse,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurfaceInverse,
    fontFamily: font.display,
  },
  playerWrap: { flex: 1, backgroundColor: "#000" },
  player: { flex: 1, backgroundColor: "#000" },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorText: { color: colors.onSurfaceInverse, fontSize: 14 },
});
