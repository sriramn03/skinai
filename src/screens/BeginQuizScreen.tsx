import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

interface BeginQuizScreenProps {
  onBeginQuiz: () => void;
}

export default function BeginQuizScreen({ onBeginQuiz }: BeginQuizScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Fade in animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 14,
        bounciness: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleBeginQuiz = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBeginQuiz();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Logo in top left */}
    
      
      <Animated.View 
        style={[
          styles.innerContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Ready to discover your perfect skin routine?</Text>
          
          <Text style={styles.subtitle}>
            We'll ask you a few quick questions to personalize your skincare journey and unlock your dream skin potential.
          </Text>
          
          <TouchableOpacity 
            style={styles.beginButton} 
            onPress={handleBeginQuiz}
            activeOpacity={0.8}
          >
            <Text style={styles.beginButtonText}>Begin Quiz</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  beginButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    shadowColor: '#FFFFFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  beginButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  topLeftLogo: {
    position: 'absolute',
    top: 60,
    left: 0,
    width: 80,
    height: 80,
    resizeMode: 'contain',
    zIndex: 10,
  },
});
