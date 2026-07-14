import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
      });
    } catch {}
  }
  return !!res.granted;
}

export async function scheduleReminder(
  hour: number,
  minute: number,
  repeatDays: number[],
  title: string,
  body: string
): Promise<string[]> {
  const ids: string[] = [];
  const content = { title, body, sound: "default" as const };
  if (!repeatDays || repeatDays.length === 0) {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: "reminders",
      } as any,
    });
    ids.push(id);
  } else {
    for (const d of repeatDays) {
      // weekday in Expo: 1 = Sunday ... 7 = Saturday
      const weekday = ((d + 1 - 1) % 7) + 1;
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: "reminders",
        } as any,
      });
      ids.push(id);
    }
  }
  return ids;
}

export async function cancelIds(ids: string[]) {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}
