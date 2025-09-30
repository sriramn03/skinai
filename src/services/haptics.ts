import * as Haptics from 'expo-haptics';

export const triggerButtonHaptics = () => {
  // Using Medium impact for a nice button press feel
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};