import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import ProgressBar from '../components/ProgressBar';

interface ReferralCodeScreenProps {
  onNext: (referralCode: string) => void;
  onSkip: () => void;
}

export default function ReferralCodeScreen({ onNext, onSkip }: ReferralCodeScreenProps) {
  const [referralCode, setReferralCode] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const isValidCode = referralCode.length === 6;

  const handleContinue = async () => {
    if (isValidCode) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNext(referralCode);
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        <ProgressBar currentStep={2} totalSteps={3} />
        
        <View style={styles.content}>
          <Text style={styles.title}>Do you have a referral code?</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={referralCode}
              onChangeText={setReferralCode}
              placeholder="jX7yT2"
              placeholderTextColor="#666666"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.inputHelper}>No referral, click skip</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.continueButton, isValidCode && styles.continueButtonActive]}
            onPress={handleContinue}
            disabled={!isValidCode}
          >
            <Text style={[styles.continueText, isValidCode && styles.continueTextActive]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>skip</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  innerContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 80,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: 80,
    paddingHorizontal: 20,
    letterSpacing: -0.5,
  },
  inputContainer: {
    paddingHorizontal: 30,
    marginBottom: 60,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  inputHelper: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400',
  },
  continueButton: {
    backgroundColor: '#333333',
    paddingVertical: 18,
    borderRadius: 25,
    marginHorizontal: 30,
    marginVertical: 12,
  },
  continueButtonActive: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueText: {
    color: '#666666',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  continueTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: 20,
  },
  skipText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});
