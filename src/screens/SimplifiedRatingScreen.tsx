import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Dimensions, ActivityIndicator, Animated, PanResponder, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { analyzeImage } from '../services/analysisService';
import CompactResultsScreen from './CompactResultsScreen';
import LoadingScreen from './LoadingScreen';
import { saveUserRatings } from '../services/firestoreService';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const { width, height } = Dimensions.get('window');
const DISMISS_THRESHOLD = height * 0.25; // how far you must swipe to close
const MAX_PULL_UP = -40; // allow a tiny pull up for bounce

interface SimplifiedRatingScreenProps {
  imageUri: string;
  onComplete: (
    ratings: {
      overall: number;
      potential: number;
      hydration: number;
      clarity: number;
      tone: number;
      smoothness: number;
    },
    analysisId?: string,
    perfectSkinImageUrl?: string
  ) => void;
  onBack: () => void;
  previousOverall?: number;
  previousPotential?: number;
  isPotential?: boolean;
}

export default function SimplifiedRatingScreen({ imageUri, onComplete, onBack, previousOverall, previousPotential, isPotential = false }: SimplifiedRatingScreenProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  
  const slideY = useRef(new Animated.Value(0)).current;

  // Animated close function with swipe-down transition
  const handleAnimatedComplete = async () => {
    if (analysisResults && !isSaving) {
      setIsSaving(true);
      
      // Start the swipe-down animation
      Animated.timing(slideY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(async ({ finished }) => {
        if (finished) {
          const ratings = {
            overall: analysisResults.overall,
            potential: analysisResults.potential,
            hydration: analysisResults.hydration,
            clarity: analysisResults.clarity,
            tone: analysisResults.tone,
            smoothness: analysisResults.smoothness,
          };
          await onComplete(ratings, savedAnalysisId || undefined, analysisResults?.perfectSkinImageUrl);
        }
      });
    }
  };

  // Pan responder for swipe-down-to-close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => {
        // Only respond to primarily vertical gestures (swipe down)
        return Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
      },
      onPanResponderGrant: () => {
        slideY.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        // Only allow downward swipes (positive dy) with small upward bounce
        const next = Math.max(Math.min(g.dy, height), MAX_PULL_UP);
        slideY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const shouldDismiss = g.vy > 1.2 || g.dy > DISMISS_THRESHOLD;
        if (shouldDismiss) {
          handleAnimatedComplete();
        } else {
          // bounce back
          Animated.spring(slideY, {
            toValue: 0,
            speed: 14,
            bounciness: 8,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated, bounce back
        Animated.spring(slideY, {
          toValue: 0,
          speed: 14,
          bounciness: 8,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    performAnalysis();
  }, []);

  const performAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
  
      // 1) Run simplified analysis (no Firestore save here)
      console.log('Running simplified analysis', previousOverall, previousPotential);
        const results = await analyzeImage(imageUri, false, true, previousOverall, previousPotential ?? 0, undefined, isPotential);
      console.log('Simplified analysis results', results);
  
      // 2) Upload image to Firebase Storage and save analysis (single Firestore write)
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('No authenticated user');
  
      const analysisId = firestore().collection('temp').doc().id;
      const timestamp = Date.now();
      const filename = `skin_analysis_${timestamp}.jpg`;
      const storagePath = `users/${currentUser.uid}/images/${filename}`;
  
      const storageRef = storage().ref(storagePath);
      await storageRef.putFile(imageUri);
  
      const [downloadURL, metadata] = await Promise.all([
        storageRef.getDownloadURL(),
        storageRef.getMetadata()
      ]);
  
      const imageData = {
        id: analysisId,
        imageUrl: downloadURL,
        storagePath,
        metadata: {
          size: metadata.size || 0,
          type: metadata.contentType || 'image/jpeg',
        }
      };
  
      await saveUserRatings(results, analysisId, imageData);
      setSavedAnalysisId(analysisId);
  
      // 3) Save results locally and hide loader
      setAnalysisResults(results);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Analysis failed:', error);
      setError('Analysis failed. Please try again.');
      setIsAnalyzing(false);
    }
  };



  const getProgressBarColor = (value: number): readonly [string, string] => {
    if (value >= 80) return ['#10B981', '#34D399']; // Green
    if (value >= 60) return ['#F59E0B', '#FBBF24']; // Yellow
    return ['#EF4444', '#F87171']; // Red
  };

  if (isAnalyzing) {
    return <LoadingScreen onComplete={() => {}} />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={performAnalysis}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Animated.View 
        style={[styles.screenContainer, { transform: [{ translateY: slideY }] }]}
        {...panResponder.panHandlers}
      >
        <CompactResultsScreen
          imageUri={imageUri}
          results={{
            overall: analysisResults?.overall ?? 0,
            potential: analysisResults?.potential ?? 0,
            hydration: analysisResults?.hydration ?? 0,
            smoothness: analysisResults?.smoothness ?? 0,
            tone: analysisResults?.tone ?? 0,
            clarity: analysisResults?.clarity ?? 0,
            // required by type but unused in compact UI
            skinType: 'normal',
            hyperpigmentation: 0,
            redness: 0,
            breakouts: 0,
            wrinkles: 0,
            texture: 0,
          }}
        />

        {/* Continue Button */}
        <TouchableOpacity 
          style={[styles.continueButton, isSaving && styles.continueButtonDisabled]} 
          onPress={handleAnimatedComplete}
          disabled={isSaving}
        >
          <LinearGradient
            colors={isSaving ? ['#6B7280', '#9CA3AF'] : ['#A66BFF', '#6A4CFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>
              {isSaving ? 'Saving...' : 'Continue'}
            </Text>
          </LinearGradient>
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
  screenContainer: {
    flex: 1,
  },
  profileContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  profileImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ratingsGrid: {
    flex: 1,
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
  },
  ratingCard: {
    width: '48%',
    backgroundColor: 'rgba(60, 60, 60, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  cardScore: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    alignSelf: 'stretch',
  },
  continueButton: {
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'android' ? 20 : 10, // Move button up on Android
    marginTop: Platform.OS === 'android' ? 20 : 0, // Additional upward movement on Android
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonGradient: {
    paddingVertical: Platform.OS === 'android' ? 20 : 18, // Slightly taller button on Android
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 40,
    opacity: 0.7,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});