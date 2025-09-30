import React, { useState } from 'react';
import { OnboardingData, OnboardingStep } from '../types/onboarding';
import GenderSelectionScreen from '../screens/GenderSelectionScreen';
import ReferralCodeScreen from '../screens/ReferralCodeScreen';
import SignInScreen from '../screens/SignInScreen';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onGoogleSignInSuccess?: () => void;
}

export default function OnboardingFlow({ onComplete, onGoogleSignInSuccess }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('gender');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  
  console.log('OnboardingFlow: Rendering step:', currentStep);

  const handleGenderNext = (gender: string) => {
    setOnboardingData(prev => ({ ...prev, gender }));
    setCurrentStep('referral');
  };

  const handleReferralNext = (referralCode: string) => {
    setOnboardingData(prev => ({ ...prev, referralCode }));
    setCurrentStep('signin');
  };

  const handleSkip = () => {
    // Move to next step or complete onboarding
    switch (currentStep) {
      case 'gender':
        setCurrentStep('referral');
        break;
      case 'referral':
        setCurrentStep('signin');
        break;
      case 'signin':
        onComplete(onboardingData);
        break;
    }
  };

  switch (currentStep) {
    case 'gender':
      return (
        <GenderSelectionScreen 
          onNext={handleGenderNext}
          onSkip={handleSkip}
        />
      );

    case 'referral':
      return (
        <ReferralCodeScreen 
          onNext={handleReferralNext}
          onSkip={handleSkip}
        />
      );

    case 'signin':
      return (
        <SignInScreen 
          onGoogleSignInSuccess={onGoogleSignInSuccess} 
          onboardingData={onboardingData}
        />
      );
    default:
      return null;
  }
}