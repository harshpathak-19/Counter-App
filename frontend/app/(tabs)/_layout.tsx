import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font } from "@/src/lib/theme";
import { useI18n } from "@/src/lib/i18n";

export default function TabsLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // Tab bar visible height above OS gesture bar / home indicator
  const barContentHeight = 60;
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: barContentHeight + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: font.text,
          fontWeight: "600",
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tab_jaap,
          tabBarTestID: "tab-jaap",
          tabBarAccessibilityLabel: t.tab_jaap,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flower-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: t.tab_tracker,
          tabBarTestID: "tab-tracker",
          tabBarAccessibilityLabel: t.tab_tracker,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: t.tab_videos,
          tabBarTestID: "tab-videos",
          tabBarAccessibilityLabel: t.tab_videos,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t.tab_insights,
          tabBarTestID: "tab-insights",
          tabBarAccessibilityLabel: t.tab_insights,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tab_settings,
          tabBarTestID: "tab-settings",
          tabBarAccessibilityLabel: t.tab_settings,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
