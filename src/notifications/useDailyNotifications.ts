// src/notifications/useDailyNotifications.ts
import { useCallback, useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type DailyTrigger =
  | (Notifications.DailyTriggerInput & { channelId?: string })
  | undefined
  | null;

// Fix the matcher to handle actual calendar trigger formats
const matchesTime = (trigger: any, hour: number, minute: number): boolean => {
  if (!trigger) return false;
  
  // Handle iOS format: { repeats: true, dateComponents: { hour, minute } }
  if (trigger.dateComponents) {
    return trigger.repeats === true && 
           trigger.dateComponents.hour === hour && 
           trigger.dateComponents.minute === minute;
  }
  
  // Handle Android format: { repeats: true, hour, minute }
  if ('hour' in trigger && 'minute' in trigger) {
    return trigger.repeats === true && 
           trigger.hour === hour && 
           trigger.minute === minute;
  }
  
  return false;
};

export function useDailyNotifications() {
  const ensureDailyReminders = useCallback(async () => {
    // if (!Device.isDevice) return;

    const perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== "granted") {
      console.warn("Notifications not granted");
      return;
    }

    // ANDROID: make sure the channel id matches your app.json defaultChannel
    const channelId = "routine-reminders";
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(channelId, {
        name: "Routine Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }

    // Track if we've already scheduled notifications in this session
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const triggers = existing.map(e => e.trigger);

    // Only clear and reschedule if we detect old duplicates
    const hasOldDuplicates = existing.length > 3; // More than our 3 expected notifications
    if (hasOldDuplicates) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }

    // 10:00 AM - only schedule if not already scheduled
    if (!triggers.some(t => matchesTime(t, 10, 0))) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Derm AI — Morning routine",
          body: "Quick AM check-in ✨",
          sound: "default",
          data: { key: 'am' },
        },
        trigger: {
          type: 'calendar',
          hour: 10,
          minute: 0,
          repeats: true,
        } as any,
      });
    }

    // 8:00 PM - only schedule if not already scheduled
    if (!triggers.some(t => matchesTime(t, 20, 0))) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Derm AI — Evening routine",
          body: "Don't forget your PM routine 🌙",
          sound: "default",
          data: { key: 'pm' },
        },
        trigger: {
          type: 'calendar',
          hour: 20,
          minute: 0,
          repeats: true,
        } as any,
      });
    }
    }, []);

  const cancelAllReminders = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((_resp) => {
      // e.g., navigate to your Routine tab
    });
    return () => sub.remove();
  }, []);

  return { ensureDailyReminders, cancelAllReminders };
}
