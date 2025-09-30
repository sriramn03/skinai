import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, Modal, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { UserSkinData, UserRatings, SkincareRoutine, canPerformNewScan, saveUserRatings, savePerfectSkinImageUrl, getUserPerfectSkinImageUrl } from '../services/firestoreService';
import { HistoricalProgressData } from '../services/historicalProgressService';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import HomePage from '../pages/HomePage';
import DailyPage from '../pages/DailyPage';
import CoachPage from '../pages/CoachPage';
import ExplorePage from '../pages/ExplorePage';
import AnalysisHistoryScreen from './AnalysisHistoryScreen';
import { triggerButtonHaptics } from '../services/haptics';
import CameraModal from '../components/CameraModal';
import SimplifiedRatingScreen from './SimplifiedRatingScreen';
import PerfectSkinScreen from './PerfectSkinScreen';
import type { SkincareStep } from '../services/firestoreService';
import LoadingScreen from './LoadingScreen';
import FoodAnalysisScreen from './FoodAnalysisScreen';
import PimpleAnalysisScreen from './PimpleAnalysisScreen';
import ProductAnalysisScreen from './ProductAnalysisScreen';
import Entypo from '@expo/vector-icons/Entypo';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
  onSignOut: () => void;
  userData: UserSkinData | null;
  userRatings: UserRatings | null;
  amRoutine: SkincareRoutine | null;
  pmRoutine: SkincareRoutine | null;
  historicalProgress: HistoricalProgressData;
  refreshUserData: () => Promise<UserRatings | null>;
  currentStreak?: number;
  todayProgress?: any;
  onRoutineUpdated?: () => void;
}

export default function DashboardScreen({ 
  onSignOut, 
  userData, 
  userRatings, 
  amRoutine, 
  pmRoutine, 
  historicalProgress,
  refreshUserData,
  currentStreak = 0,
  todayProgress,
  onRoutineUpdated
}: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<'Home' | 'daily' | 'Explore' | 'Coach'>('Home');
  const [showAnalysisHistory, setShowAnalysisHistory] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showScanLimitModal, setShowScanLimitModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isPotentialMode, setIsPotentialMode] = useState(false);
  const [isFoodMode, setIsFoodMode] = useState(false);
  const [isPimpleMode, setIsPimpleMode] = useState(false);
  const [isProductMode, setIsProductMode] = useState(false);
  const [showSimplifiedRating, setShowSimplifiedRating] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showPerfectSkin, setShowPerfectSkin] = useState(false);
  const [perfectSkinImageUrl, setPerfectSkinImageUrl] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Loading perfect skin...');
  const [showFoodAnalysis, setShowFoodAnalysis] = useState(false);
  const [foodAnalysisResults, setFoodAnalysisResults] = useState<any>(null);
  const [foodImageUri, setFoodImageUri] = useState<string | null>(null);
  const [showPimpleAnalysis, setShowPimpleAnalysis] = useState(false);
  const [pimpleAnalysisResults, setPimpleAnalysisResults] = useState<any>(null);
  const [pimpleImageUri, setPimpleImageUri] = useState<string | null>(null);
  const [showProductAnalysis, setShowProductAnalysis] = useState(false);
  const [productAnalysisResults, setProductAnalysisResults] = useState<any>(null);
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const fadeOverlay = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;

  const transitionToSimplified = (imageUri: string, isPotential: boolean = false) => {
    setSelectedImageUri(imageUri);
    setIsTransitioning(true);
    Animated.timing(fadeOverlay, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
      setTimeout(() => setShowCameraModal(false), 120);
      setShowSimplifiedRating(true);
      // Store the potential flag for use in SimplifiedRatingScreen
      console.log('Transitioning to simplified rating with potential flag:', isPotential);
      // Clear overlay and flag on the next frame to avoid "useInsertionEffect" scheduling warning
      requestAnimationFrame(() => {
        Animated.timing(fadeOverlay, { toValue: 0, duration: 500, useNativeDriver: true }).start();
        setIsTransitioning(false);
      });
    });
  };

  const handlePlusButtonPress = () => {
    triggerButtonHaptics();
    setShowActionModal(true);
  };

  const handleScanFace = async () => {
    setShowActionModal(false);
    setIsPotentialMode(false);
    
    try {
      const canScan = await canPerformNewScan();
      const currentUser = auth().currentUser;
      const isAdmin = currentUser?.email === 'googledevteam@gmail.com';
      
      if (canScan || isAdmin) {
        // Show camera modal
        console.log('Scan Face selected - show camera modal');
        setShowCameraModal(true);
      } else {
        // Show 24-hour limit popup
        setShowScanLimitModal(true);
      }
    } catch (error) {
      console.error('Error checking scan eligibility:', error);
      // On error, show the limit modal as a precaution
      setShowScanLimitModal(true);
    }
  };

  const handlePimpleStopper = () => {
    setShowActionModal(false);
    setIsPimpleMode(true);
    console.log('Pimple Stopper selected - launching camera modal');
    setShowCameraModal(true);
  };

  const handleFoodIQ = () => {
    setShowActionModal(false);
    setIsFoodMode(true);
    console.log('Food IQ selected - launching camera modal');
    setShowCameraModal(true);
  };

  const handleViewPotential = async () => {
    setShowActionModal(false);
    setIsPotentialMode(true);
    
    try {
      // Check if user already has a perfect skin image
      console.log('Checking for existing perfect skin image...');
      const existingPerfectSkinUrl = await getUserPerfectSkinImageUrl();
      
      if (existingPerfectSkinUrl) {
        // User has existing perfect skin image, preload it for seamless experience
        console.log('Found existing perfect skin image, preloading...', existingPerfectSkinUrl);
        
        // Show loading screen with progress while preloading image
        setLoadingText('Loading your perfect skin...');
        setLoadingProgress(0);
        setShowLoadingScreen(true);
        
        // Animate progress from 0 to 100
        Animated.timing(progressValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }).start();
        
        // Update progress during animation
        const progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 5;
          });
        }, 75);
        
        try {
          // Preload the image with proper cache policy to ensure it's fully cached
          await Image.prefetch(existingPerfectSkinUrl, {
            cachePolicy: 'memory-disk'
          });
          
          console.log('Perfect skin image preloaded successfully');
          setLoadingProgress(100);
          setLoadingText('Complete!');
          
          // Longer delay to ensure image is fully cached and processed
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Set the image URL first, then transition atomically
          setPerfectSkinImageUrl(existingPerfectSkinUrl);
          
          // Small additional delay to ensure state is set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Atomic transition: hide loading and show perfect skin simultaneously
          setShowLoadingScreen(false);
          setShowPerfectSkin(true);
          setIsPotentialMode(false); // Reset potential mode
          
          // Reset progress for next time
          progressValue.setValue(0);
          setLoadingProgress(0);
          
        } catch (preloadError) {
          console.error('Error preloading perfect skin image:', preloadError);
          clearInterval(progressInterval);
          
          // If preloading fails, still show the image (it might load in the screen)
          setShowLoadingScreen(false);
          setPerfectSkinImageUrl(existingPerfectSkinUrl);
          setShowPerfectSkin(true);
          setIsPotentialMode(false);
          
          // Reset progress for next time
          progressValue.setValue(0);
          setLoadingProgress(0);
        }
      } else {
        // No existing perfect skin image, show camera modal to generate new one
        console.log('No existing perfect skin image found - show camera modal');
        setShowCameraModal(true);
      }
    } catch (error) {
      console.error('Error checking for existing perfect skin image:', error);
      // On error, fallback to showing camera modal
      setShowCameraModal(true);
    }
  };

  const handlePotentialAnalysis = async (imageUri: string) => {
    try {
      // Show loading screen
      setShowCameraModal(false);
      setShowLoadingScreen(true);
      
      // Import analyzeImage function
      const { analyzeImage } = await import('../services/analysisService');
      
      // Run analysis with isPotential = true
      console.log('Running potential analysis...');
      const results = await analyzeImage(imageUri, false, true, undefined, undefined, undefined, true);
      console.log('Potential analysis results:', results);
      
      // Check if we got a perfect skin image URL
      if (results.perfectSkinImageUrl) {
        console.log('Perfect skin image generated, saving to Firebase...');
        
        // Save perfect skin image to Firebase Storage and Firestore
        const currentUser = auth().currentUser;
        if (!currentUser) throw new Error('No authenticated user');
        
        const timestamp = Date.now();
        const filename = `perfect_skin_${timestamp}.jpg`;
        const storagePath = `users/${currentUser.uid}/perfect_skin/${filename}`;
        
        try {
          // Download the perfect skin image from backend
          const response = await fetch(results.perfectSkinImageUrl);
          const blob = await response.blob();
          
          // Upload to Firebase Storage
          console.log('Uploading perfect skin image to Firebase Storage...');
          const storageRef = storage().ref(storagePath);
          await storageRef.put(blob);
          
          // Get download URL
          const downloadURL = await storageRef.getDownloadURL();
          console.log('Perfect skin image uploaded to Firebase:', downloadURL);
          
          // Save to Firestore user document using existing service function
          console.log('Saving perfect skin URL to Firestore...');
          await savePerfectSkinImageUrl(downloadURL);
          
          console.log('Perfect skin URL saved to Firestore successfully');
          
          // Preload the image before showing the screen to prevent flickering
          console.log('Preloading perfect skin image for smooth display...');
          try {
            await Image.prefetch(downloadURL);
            console.log('Perfect skin image preloaded successfully');
          } catch (prefetchError) {
            console.warn('Perfect skin image prefetch failed, but continuing:', prefetchError);
          }
          
          // Hide loading screen and show perfect skin screen
          setShowLoadingScreen(false);
          setPerfectSkinImageUrl(downloadURL); // Use Firebase URL instead of backend URL
          setShowPerfectSkin(true);
          
        } catch (firebaseError) {
          console.error('Error saving to Firebase:', firebaseError);
          // Still show the image even if Firebase save fails
          
          // Preload the backend image before showing
          console.log('Preloading backend perfect skin image...');
          try {
            await Image.prefetch(results.perfectSkinImageUrl);
            console.log('Backend perfect skin image preloaded successfully');
          } catch (prefetchError) {
            console.warn('Backend perfect skin image prefetch failed:', prefetchError);
          }
          
          setShowLoadingScreen(false);
          setPerfectSkinImageUrl(results.perfectSkinImageUrl);
          setShowPerfectSkin(true);
        }
      } else {
        console.error('No perfect skin image URL returned');
        setShowLoadingScreen(false);
        // Fallback to regular flow
        await refreshUserData();
      }
      
      // Reset potential mode
      setIsPotentialMode(false);
      
    } catch (error) {
      console.error('Error in potential analysis:', error);
      setShowLoadingScreen(false);
      setIsPotentialMode(false);
      // Show error or fallback to regular flow
      alert('Error generating perfect skin visualization. Please try again.');
    }
  };

  const handlePimpleAnalysis = async (imageUri: string) => {
    try {
      // Show loading screen
      setShowCameraModal(false);
      setShowLoadingScreen(true);
      setLoadingText('Analyzing your pimples...');
      
      // Import analyzePimple function
      const { analyzePimple } = await import('../services/analysisService');
      
      // Run pimple analysis
      console.log('Running pimple analysis...');
      const results = await analyzePimple(imageUri);
      console.log('Pimple analysis results:', results);
      
      // Store results and image URI
      setPimpleAnalysisResults(results);
      setPimpleImageUri(imageUri);
      
      // Hide loading screen and show pimple analysis screen
      setShowLoadingScreen(false);
      setShowPimpleAnalysis(true);
      
      // Reset pimple mode
      setIsPimpleMode(false);
      
    } catch (error) {
      console.error('Error in pimple analysis:', error);
      setShowLoadingScreen(false);
      setIsPimpleMode(false);
      alert('Error analyzing pimples. Please try again.');
    }
  };

  const handleFoodAnalysis = async (imageUri: string) => {
    try {
      // Show loading screen
      setShowCameraModal(false);
      setShowLoadingScreen(true);
      setLoadingText('Analyzing your food...');
      
      // Import analyzeFood function
      const { analyzeFood } = await import('../services/analysisService');
      
      // Run food analysis
      console.log('Running food analysis...');
      const results = await analyzeFood(imageUri);
      console.log('Food analysis results:', results);
      
      // Store results and image URI
      setFoodAnalysisResults(results);
      setFoodImageUri(imageUri);
      
      // Hide loading screen and show food analysis screen
      setShowLoadingScreen(false);
      setShowFoodAnalysis(true);
      
      // Reset food mode
      setIsFoodMode(false);
      
    } catch (error) {
      console.error('Error in food analysis:', error);
      setShowLoadingScreen(false);
      setIsFoodMode(false);
      alert('Error analyzing food. Please try again.');
    }
  };

  const handleProductAnalysis = async (imageUri: string) => {
    try {
      console.log('Starting product analysis with imageUri:', imageUri);
      
      // Show loading screen
      setShowCameraModal(false);
      setIsProductMode(true);
      setShowLoadingScreen(true);
      setLoadingText('Analyzing your product...');
      
      // Import analyzeProduct function
      const { analyzeProduct } = await import('../services/analysisService');
      
      // Run product analysis
      console.log('Running product analysis...');
      const results = await analyzeProduct(imageUri);
      console.log('Product analysis results:', results);
      
      // Store results and image URI
      setProductAnalysisResults(results);
      setProductImageUri(imageUri);
      
      // Hide loading screen and show product analysis screen
      setShowLoadingScreen(false);
      setIsProductMode(false);
      setShowProductAnalysis(true);
      
    } catch (error) {
      console.error('Error in product analysis:', error);
      setShowLoadingScreen(false);
      setIsProductMode(false);
      alert('Error analyzing product. Please try again.');
    }
  };

  const handlePhotoTaken = (photoUri: string) => {
    console.log('Photo taken:', photoUri);
    // Handle photo taken logic here
  };

  const handleAnalyze = (imageUri: string) => {
    console.log('Analyze image:', imageUri, 'Potential mode:', isPotentialMode, 'Food mode:', isFoodMode, 'Pimple mode:', isPimpleMode);
    if (isPotentialMode) {
      // For potential mode, go directly to loading and analysis without ratings
      handlePotentialAnalysis(imageUri);
    } else if (isFoodMode) {
      // For food mode, go directly to loading and food analysis
      handleFoodAnalysis(imageUri);
    } else if (isPimpleMode) {
      // For pimple mode, go directly to loading and pimple analysis
      handlePimpleAnalysis(imageUri);
    } else {
      // Handle regular analysis with ratings screen
      transitionToSimplified(imageUri, false);
    }
  };

  const handleRatingComplete = async (
    ratings: {
      overall: number;
      potential: number;
      hydration: number;
      clarity: number;
      tone: number;
      smoothness: number;
    },
    existingAnalysisId?: string,
    perfectSkinImageUrl?: string
  ) => {
    try {
      console.log('handleRatingComplete called - ratings received:', ratings);
      console.log('Perfect skin image URL:', perfectSkinImageUrl);
      
      setShowSimplifiedRating(false);
      setSelectedImageUri(null);
      
      // If we have a perfect skin image URL (from potential mode), show the perfect skin screen
      if (perfectSkinImageUrl) {
        setPerfectSkinImageUrl(perfectSkinImageUrl);
        setShowPerfectSkin(true);
        setIsPotentialMode(false); // Reset potential mode
      } else {
        // Regular flow - refresh data and go to dashboard
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error finalizing analysis:', error);
    }
  };
  // Get "Monday"..."Sunday"
const getTodayName = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long' });

const isStepForToday = (step: SkincareStep, today = getTodayName()) => {
  if (!step.daysToApply)
    {
      return true;
    } 
  console.log('step.daysToApply', step.daysToApply);
  const days = step.daysToApply.split(',').map(s => s.trim().toLowerCase());
  return days.includes(today.toLowerCase());
};

const filterRoutineByDay = (routine: SkincareRoutine | null) =>
  routine
    ? { ...routine, steps: routine.steps.filter(step => isStepForToday(step)) }
    : null;



const todayAM = filterRoutineByDay(amRoutine);
const todayPM = filterRoutineByDay(pmRoutine);

const renderHomeTab = () => {
  // Console log to validate routine values
  console.log('DashboardScreen renderHomeTab - Routine values:');
  console.log('  amRoutine:', amRoutine ? `${amRoutine.steps?.length || 0} steps` : 'NULL');
  console.log('  pmRoutine:', pmRoutine ? `${pmRoutine.steps?.length || 0} steps` : 'NULL');
  console.log('  todayAM:', todayAM ? `${todayAM.steps?.length || 0} steps` : 'NULL');
  console.log('  todayPM:', todayPM ? `${todayPM.steps?.length || 0} steps` : 'NULL');
  console.log('  todayProgress:', todayProgress);

  return (
    <HomePage
      userData={userData}
      userRatings={userRatings}
      historicalProgress={historicalProgress}
      amRoutine={todayAM}
      pmRoutine={todayPM}
      onViewProgress={() => setShowAnalysisHistory(true)}
      currentStreak={currentStreak}
      todayProgress={todayProgress}
    />
  );
};

const renderDailyTab = () => (
  <DailyPage
    userRatings={userRatings}
    amRoutine={todayAM}
    pmRoutine={todayPM}
    onRoutineUpdated={onRoutineUpdated}
    onNavigateToExplore={() => {
      triggerButtonHaptics();
      setActiveTab('Explore');
    }}
  />
);

  const renderCoachTab = () => (
    <CoachPage 
      userData={userData}
      userRatings={userRatings}
      amRoutine={amRoutine}
      pmRoutine={pmRoutine}
      historicalProgress={historicalProgress}
    />
  );

  const renderExploreTab = () => (
    <ExplorePage onRoutineUpdated={onRoutineUpdated} />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Home':
        return renderHomeTab();
      case 'daily':
        return renderDailyTab();
      case 'Explore':
        return renderExploreTab();
      case 'Coach':
        return renderCoachTab();
      default:
        return renderHomeTab();
    }
  };

  // Analysis History Screen is now rendered as overlay below

  // Show Loading Screen if active
  if (showLoadingScreen) {
    // Custom loading screen for perfect skin image preloading
    if (loadingProgress > 0) {
      return (
        <SafeAreaView style={styles.loadingContainer}>
          <StatusBar style="light" />
          <View style={styles.loadingContent}>
            {/* Loading Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/loadingscreen.png')}
                style={styles.loadingLogo}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { 
                  width: progressValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(loadingProgress)}%</Text>
            </View>

            {/* Loading Text */}
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </SafeAreaView>
      );
    }
    // Default loading screen  
    const currentMode = isProductMode ? 'product' : isFoodMode ? 'food' : isPimpleMode ? 'pimple' : 'face';
    return <LoadingScreen onComplete={() => {}} mode={currentMode} />;
  }

  // Show Simplified Rating Screen if active
  if (showSimplifiedRating && selectedImageUri) {
    return (
      <SimplifiedRatingScreen
      imageUri={selectedImageUri}
      onComplete={handleRatingComplete}
      onBack={() => {
        setShowSimplifiedRating(false);
        setSelectedImageUri(null);
        setShowCameraModal(true);
        setIsPotentialMode(false); // Reset potential mode
      }}
      previousOverall={userRatings?.overall}
      previousPotential={userRatings?.potential}
      isPotential={isPotentialMode}
    />
    );
  }

  // Show Perfect Skin Screen if active
  if (showPerfectSkin && perfectSkinImageUrl) {
    return (
      <PerfectSkinScreen
        imageUrl={perfectSkinImageUrl}
        onContinue={async () => {
          setShowPerfectSkin(false);
          setPerfectSkinImageUrl(null);
          await refreshUserData();
        }}
      />
    );
  }

  // Show Food Analysis Screen if active
  if (showFoodAnalysis && foodAnalysisResults && foodImageUri) {
    return (
      <FoodAnalysisScreen
        imageUri={foodImageUri}
        analysisResults={foodAnalysisResults}
        onClose={() => {
          setShowFoodAnalysis(false);
          setFoodAnalysisResults(null);
          setFoodImageUri(null);
        }}
      />
    );
  }

  // Show Pimple Analysis Screen if active
  if (showPimpleAnalysis && pimpleAnalysisResults && pimpleImageUri) {
    return (
      <PimpleAnalysisScreen
        imageUri={pimpleImageUri}
        analysisResults={pimpleAnalysisResults}
        onClose={() => {
          setShowPimpleAnalysis(false);
          setPimpleAnalysisResults(null);
          setPimpleImageUri(null);
        }}
      />
    );
  }

  // Show Product Analysis Screen if active
  if (showProductAnalysis && productAnalysisResults && productImageUri) {
    return (
      <ProductAnalysisScreen
        imageUri={productImageUri}
        results={productAnalysisResults}
        onBack={() => {
          setShowProductAnalysis(false);
          setProductAnalysisResults(null);
          setProductImageUri(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Floating Plus Button */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handlePlusButtonPress}
        activeOpacity={0.8}
      >
        <View style={styles.floatingButtonInner}>
          <Text style={styles.floatingButtonText}>+</Text>
        </View>
      </TouchableOpacity>


      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <View style={styles.leftNavItems}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'Home' && styles.activeNavItem]}
            onPress={() => {
              triggerButtonHaptics();
              setActiveTab('Home');
            }}
          >
            <Feather 
              name="home" 
              size={22} 
              color={activeTab === 'Home' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.6)'} 
            />
            <Text style={[styles.navLabel, activeTab === 'Home' && styles.activeNavLabel]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'daily' && styles.activeNavItem]}
            onPress={() => {
              triggerButtonHaptics();
              setActiveTab('daily');
            }}
          >
            <Feather 
              name="check-circle" 
              size={22} 
              color={activeTab === 'daily' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.6)'} 
            />
            <Text style={[styles.navLabel, activeTab === 'daily' && styles.activeNavLabel]}>Routine</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'Explore' && styles.activeNavItem]}
            onPress={() => {
              triggerButtonHaptics();
              setActiveTab('Explore');
            }}
          >
            <Feather 
              name="search" 
              size={22} 
              color={activeTab === 'Explore' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.6)'} 
            />
            <Text style={[styles.navLabel, activeTab === 'Explore' && styles.activeNavLabel]}>Explore</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'Coach' && styles.activeNavItem]}
            onPress={() => {
              triggerButtonHaptics();
              setActiveTab('Coach');
            }}
          >
            <Feather 
              name="message-circle" 
              size={22} 
              color={activeTab === 'Coach' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.6)'} 
            />
            <Text style={[styles.navLabel, activeTab === 'Coach' && styles.activeNavLabel]}>Coach</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Action Cards Overlay - positioned near plus button */}
      {showActionModal && (
        <>
          <TouchableOpacity 
            style={styles.actionOverlay}
            activeOpacity={1}
            onPress={() => setShowActionModal(false)}
          />
          <View style={styles.actionCardsContainer}>
            {/* Top Row */}
            <View style={styles.cardRow}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleViewPotential}
                activeOpacity={0.8}
              >
                <Entypo 
                  name="rocket" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.cardIcon}
                />
                <Text style={styles.cardLabel}>View Potential</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleFoodIQ}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="restaurant-outline" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.cardIcon}
                />
                <Text style={styles.cardLabel}>Item IQ</Text>
              </TouchableOpacity>
            </View>
            {/* <TouchableOpacity
                style={styles.actionCard}
                onPress={handleScanFace}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="scan-outline" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.cardIcon}
                />
                <Text style={styles.cardLabel}>Scan face</Text>
              </TouchableOpacity> */}
            {/* Bottom Row */}
            <View style={styles.cardRow}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={handlePimpleStopper}
                activeOpacity={0.8}
              >
                <Feather 
                  name="target" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.cardIcon}
                />
                <Text style={styles.cardLabel}>Pimple Stopper</Text>
              </TouchableOpacity>
              
              {/* <TouchableOpacity
                style={styles.actionCard}
                onPress={handleFoodIQ}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="restaurant-outline" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.cardIcon}
                />
                <Text style={styles.cardLabel}>Food IQ</Text>
              </TouchableOpacity> */}
               <TouchableOpacity
                style={styles.actionCard}
                onPress={handleScanFace}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="scan-outline" 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.cardIcon}
                />
                <Text style={styles.cardLabel}>Scan face</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Scan Limit Modal */}
      <Modal
        visible={showScanLimitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowScanLimitModal(false)}
      >
        <View style={styles.scanLimitOverlay}>
          <View style={styles.scanLimitModal}>
            <View style={styles.scanLimitIconContainer}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.scanLimitIcon}
                cachePolicy="memory-disk"
                priority="high"
              />
            </View>
            <Text style={styles.scanLimitTitle}>Sorry!</Text>
            <Text style={styles.scanLimitMessage}>Only one scan per day</Text>
            <Text style={styles.scanLimitSubtext}>Come back tomorrow for your next skin analysis</Text>
            
            <TouchableOpacity
              onPress={() => setShowScanLimitModal(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.scanLimitButton}
              >
                <Text style={styles.scanLimitButtonText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Camera Modal */}
      <CameraModal
        visible={showCameraModal}
        onClose={() => {
          setShowCameraModal(false);
          setIsPotentialMode(false); // Reset potential mode when closing
          setIsFoodMode(false); // Reset food mode when closing
          setIsPimpleMode(false); // Reset pimple mode when closing
          setIsProductMode(false); // Reset product mode when closing
        }}
        onPhotoTaken={handlePhotoTaken}
        onAnalyze={handleAnalyze}
        onProductAnalyze={handleProductAnalysis}
        mode={isFoodMode ? 'food' : isPimpleMode ? 'pimple' : 'face'}
      />

      {/* Analysis History Screen Overlay */}
      {showAnalysisHistory && (
        <View style={styles.analysisHistoryOverlay}>
          <AnalysisHistoryScreen
            onBack={() => setShowAnalysisHistory(false)}
            currentUserRatings={userRatings}
          />
        </View>
      )}
      {isTransitioning && (
  <Animated.View
    pointerEvents="none"
    style={[
      StyleSheet.absoluteFillObject as any,
      { backgroundColor: '#000', opacity: fadeOverlay, zIndex: 999 }
    ]}
  />
)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 100, // Account for bottom nav
  },


  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  leftNavItems: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 6,
    marginTop: Platform.OS === 'android' ? -4 : 0, // Additional upward movement on Android
    gap: 4,
  },
  activeNavItem: {
    // Add any active styling here if needed
  },

  navLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // Floating Plus Button
  floatingButton: {
    position: 'absolute',
    bottom: 70, // Position so 3/4 touches the navbar (navbar height is ~80px, button is 70px)
    right: 24,
    zIndex: 1000,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  floatingButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 36,
  },

  // Action Cards Overlay Styles
  actionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  actionCardsContainer: {
    position: 'absolute',
    bottom: 150, // Position above the plus button
    right: 50,
    zIndex: 1001,
    flexDirection: 'column',
    gap: 15, // Space between rows
  },
  cardRow: {
    flexDirection: 'row',
    gap: 15, // Space between cards in a row
  },
  actionCard: {
    width: 150,
    height: 100,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardIcon: {
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 13,
    marginTop: 10,
  },

  // Scan Limit Modal Styles
  scanLimitOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLimitModal: {
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    borderRadius: 24,
    padding: 32,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    minWidth: 280,
  },
  scanLimitIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanLimitIcon: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
  },
  scanLimitTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'cursive',
  },
  scanLimitMessage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'cursive',
  },
  scanLimitSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontStyle: 'italic',
    fontFamily: 'cursive',
  },
  scanLimitButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanLimitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Analysis History Overlay
  analysisHistoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },

  // Loading Screen Styles
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 60,
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  progressText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  // TEMPORARY: Test button styles
  testButtonsContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  testButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
