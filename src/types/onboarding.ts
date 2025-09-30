export interface OnboardingData {
  gender?: string;
  referralCode?: string;
}

export type OnboardingStep = 'gender' | 'referral' | 'signin';

export interface SliderValue {
  value: number; // 0-100
  category: string; // "rare", "occasional", "often", or "between X and Y"
}

export const getSliderCategory = (value: number): string => {
  if (value <= 16.67) return 'rare';
  if (value <= 33.33) return 'between rare and occasional';
  if (value <= 50) return 'occasional';
  if (value <= 66.67) return 'between occasional and often';
  if (value <= 83.33) return 'often';
  return 'often';
};