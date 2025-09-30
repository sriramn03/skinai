import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ProgressBar from '../components/ProgressBar';
import CustomSlider from '../components/CustomSlider';

interface LifestyleData {
  sleepHours: number;
  stressLevel: string;
  smokeDrink: string;
  waterIntake: string;
}

interface LifestyleScreenProps {
  onNext: (data: LifestyleData) => void;
  onSkip: () => void;
}

export default function LifestyleScreen({ onNext, onSkip }: LifestyleScreenProps) {
  const [sleepHours, setSleepHours] = useState<number>(8);
  const [stressLevel, setStressLevel] = useState<string>('occasional');
  const [smokeDrink, setSmokeDrink] = useState<string>('rare');
  const [waterIntake, setWaterIntake] = useState<string>('occasional');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleNext = () => {
    const data: LifestyleData = {
      sleepHours,
      stressLevel,
      smokeDrink,
      waterIntake,
    };
    onNext(data);
  };

  const handleStressChange = (value: number, category: string) => {
    setStressLevel(category);
  };

  const handleSmokeDrinkChange = (value: number, category: string) => {
    setSmokeDrink(category);
  };

  const handleWaterIntakeChange = (value: number, category: string) => {
    setWaterIntake(category);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        <ProgressBar currentStep={3} totalSteps={5} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Lifestyle Snapshot</Text>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Sleep Hours</Text>
            <View style={styles.sleepInputContainer}>
              <TextInput
                style={styles.sleepInput}
                value={sleepHours.toString()}
                onChangeText={(text) => setSleepHours(parseInt(text) || 8)}
                keyboardType="numeric"
                maxLength={2}
                placeholderTextColor="#888888"
              />
              <Text style={styles.hoursText}>hours</Text>
            </View>
          </View>

          <CustomSlider
            title="Stress Level"
            onValueChange={handleStressChange}
            initialValue={50}
          />

          <CustomSlider
            title="Smoke/Drink"
            onValueChange={handleSmokeDrinkChange}
            initialValue={17}
          />

          <CustomSlider
            title="Water Intake"
            onValueChange={handleWaterIntakeChange}
            initialValue={50}
          />

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 120,
    paddingBottom: 100,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: 40,
    letterSpacing: -0.5,
  },
  inputSection: {
    marginBottom: 30,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  sleepInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#404040',
  },
  sleepInput: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  hoursText: {
    color: '#888888',
    fontSize: 16,
    marginLeft: 10,
  },
  nextButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 18,
    borderRadius: 25,
    marginTop: 40,
    marginHorizontal: 10,
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
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