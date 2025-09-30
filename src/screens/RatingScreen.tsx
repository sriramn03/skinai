import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ProgressBar from '../components/ProgressBar';

interface RatingScreenProps {
  onNext: (rating: number) => void;
  onSkip: () => void;
}

export default function RatingScreen({ onNext, onSkip }: RatingScreenProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
    // Auto-advance after selection
    setTimeout(() => {
      onNext(rating);
    }, 200);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleRatingSelect(i)}
          style={styles.starButton}
        >
          <Text style={[
            styles.star,
            selectedRating && i <= selectedRating ? styles.selectedStar : styles.unselectedStar
          ]}>
            ★
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        <ProgressBar currentStep={2} totalSteps={5} />
        
        <View style={styles.content}>
        <Text style={styles.title}>Rate our app</Text>
        
        <View style={styles.starsContainer}>
          {renderStars()}
        </View>
        
        <Text style={styles.subtitle}>
          Help us improve your experience
        </Text>
      </View>
      
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 80,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 60,
    letterSpacing: -0.5,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  starButton: {
    padding: 10,
    marginHorizontal: 5,
  },
  star: {
    fontSize: 40,
  },
  selectedStar: {
    color: '#FFD700',
  },
  unselectedStar: {
    color: '#404040',
  },
  subtitle: {
    color: '#888888',
    fontSize: 16,
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