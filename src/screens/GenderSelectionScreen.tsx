import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import ProgressBar from '../components/ProgressBar';
import GenderButton from '../components/GenderButton';

interface GenderSelectionScreenProps {
  onNext: (gender: string) => void;
  onSkip: () => void;
}

export default function GenderSelectionScreen({ onNext, onSkip }: GenderSelectionScreenProps) {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleGenderSelect = async (gender: string) => {
    // Haptic feedback for selection
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setSelectedGender(gender);
    // Auto-advance after selection (you can add a delay if needed)
    setTimeout(() => {
      onNext(gender);
    }, 200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        <ProgressBar currentStep={1} totalSteps={3} />
        
        <View style={styles.content}>
        <Text style={styles.title}>Choose gender</Text>
        
        <View style={styles.buttonContainer}>
          <GenderButton
            title="Male"
            onPress={() => handleGenderSelect('male')}
            isSelected={selectedGender === 'male'}
          />
          
          <GenderButton
            title="Female"
            onPress={() => handleGenderSelect('female')}
            isSelected={selectedGender === 'female'}
          />
        </View>
      </View>
      
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSkip();
          }}
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
  buttonContainer: {
    paddingHorizontal: 0,
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