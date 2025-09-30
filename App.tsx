import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import OnboardingFlow from './src/components/OnboardingFlow';
import BeginScanScreen from './src/screens/BeginScanScreen';
import CameraScreen from './src/screens/CameraScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import SwipeableResultsScreen from './src/screens/SwipeableResultsScreen';
import UnlockScreen from './src/screens/UnlockScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SkincareRoutineScreen from './src/screens/SkincareRoutineScreen';
import SkinTypeQuestionScreen from './src/screens/SkinTypeQuestionScreen';
import BeginQuizScreen from './src/screens/BeginQuizScreen';
import DreamSkinScreen from './src/screens/DreamSkinScreen';
import { DateProvider } from './src/contexts/DateContext';
import { OnboardingData } from './src/types/onboarding';
import { signOut } from './src/services/authService';
import { analyzeImage, AnalysisResults } from './src/services/analysisService';
import { getUserRatings, getUserSkinData, getSkincareRoutine, processAndSaveSkincareRoutines, saveUserSkinType, saveUserDreamSkin, DreamSkinType, UserSkinData, UserRatings, SkincareRoutine, getUserSubscriptionData, UserSubscriptionData } from './src/services/firestoreService';
import { fetchHistoricalProgress, HistoricalProgressData } from './src/services/historicalProgressService';
import imagePrefetchService from './src/services/imagePrefetchService';
import { useDailyNotifications } from './src/notifications/useDailyNotifications';
import { initializeStreakSystem, StreakCache } from './src/services/streakService';
import { subscribeToProgress, getTodayDateString } from './src/services/progressService';

import './src/config/firebaseConfig'; // Ensure Firebase is initialized
import { configureRevenueCat } from './src/lib/revenuecat';
import { useRevenueCat } from './src/hooks/useRevenueCat';
import { initializeFacebookSDK } from './src/services/facebookEvents';

type AppScreen = 'onboarding' | 'skinTypeQuestion' | 'beginQuiz' | 'dreamSkinQuestion' | 'beginScan' | 'camera' | 'loading' | 'results' | 'dashboard' | 'skincare' | 'unlock';

export default function App() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('onboarding');
  const { ensureDailyReminders, cancelAllReminders } = useDailyNotifications();
  
  // Global subscription monitoring - this ensures onCustomerInfoChanged is always active
  const { initialized: rcInitialized, isPro } = useRevenueCat(user?.uid);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  
  // User data state
  const [userData, setUserData] = useState<UserSkinData | null>(null);
  const [userRatings, setUserRatings] = useState<UserRatings | null>(null);
  const [amRoutine, setAmRoutine] = useState<SkincareRoutine | null>(null);
  const [pmRoutine, setPmRoutine] = useState<SkincareRoutine | null>(null);
  const [analysisAmRoutine, setAnalysisAmRoutine] = useState<SkincareRoutine | null>(null);
  const [analysisPmRoutine, setAnalysisPmRoutine] = useState<SkincareRoutine | null>(null);
  
  // Historical progress data (30 days excluding today)
  const [historicalProgress, setHistoricalProgress] = useState<HistoricalProgressData>({});
  
  // Subscription data
  const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionData | null>(null);
  
  // Routine refresh state
  const [shouldRefreshRoutine, setShouldRefreshRoutine] = useState(false);
  
  // Function to handle routine updates
  const handleRoutineUpdated = async () => {
    console.log('App: Routine updated, refreshing data...');
    // Refresh routine data
    await fetchUserData();
    // Trigger routine screen refresh if currently on skincare tab
    setShouldRefreshRoutine(true);
  };
  
  // Skin type choice from the question screen
  const [selectedSkinType, setSelectedSkinType] = useState<'oily' | 'normal' | 'dry' | 'combination' | 'auto' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeOverlay = useRef(new Animated.Value(0)).current;
  
  // Progress loading state and data
  const [progressLoading, setProgressLoading] = useState(true);
  const [todayProgress, setTodayProgress] = useState<any>(null);
  
  // Refs for cleanup functions
  const streakUnsubscribers = useRef<{ progress: (() => void) | null; streak: (() => void) | null }>({ progress: null, streak: null });
  const progressUnsubscriber = useRef<(() => void) | null>(null);
  
  const transitionToLoading = () => {
    setIsTransitioning(true);
    Animated.timing(fadeOverlay, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
      setCurrentScreen('loading');
      Animated.timing(fadeOverlay, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setIsTransitioning(false);
      });
    });
  };
  // Wrapper function for DashboardScreen that only returns ratings
  const refreshUserDataForDashboard = async () => {
    const { ratings } = await fetchUserData();
    return ratings;
  };

  // Function to fetch historical progress data (30 days excluding today)
  const fetchHistoricalProgressData = async () => {
    try {
      console.log('App: Fetching 30 days of historical progress...');
      
      // Calculate routine steps for accurate progress calculation
      const amSteps = amRoutine?.steps?.length || 5; // Default to 5 if not available
      const pmSteps = pmRoutine?.steps?.length || 4; // Default to 4 if not available
      
      const historical = await fetchHistoricalProgress(amSteps, pmSteps);
      setHistoricalProgress(historical);
      
      console.log(`App: Successfully loaded ${Object.keys(historical).length} days of historical progress`);
    } catch (error) {
      console.error('App: Error fetching historical progress:', error);
    }
  };

  // Function to fetch all user data
  const fetchUserData = async () => {
    try {
      console.log('App: Fetching user data...');
      const [skinData, ratings, amSkincare, pmSkincare, subData] = await Promise.all([
        getUserSkinData(),
        getUserRatings(),
        getSkincareRoutine('AM'),
        getSkincareRoutine('PM'),
        getUserSubscriptionData()
      ]);

      console.log('App: Subscription data:', subData);

      setUserData(skinData);
      setUserRatings(ratings);
      setAmRoutine(amSkincare);
      setPmRoutine(pmSkincare);
      setSubscriptionData(subData);
      
      // Prefetch analysis image for smooth navigation
      if (ratings?.images && ratings.images.length > 0) {
        imagePrefetchService.prefetchNewAnalysisImage(ratings.images[0].imageUrl).catch(error => {
          console.warn('App: Image prefetch failed:', error);
        });
      }
      
      // Prefetch product images from skincare routines to prevent flicker
      if (amSkincare || pmSkincare) {
        imagePrefetchService.prefetchSkincareImages(amSkincare, pmSkincare).catch(error => {
          console.warn('App: Product image prefetch failed:', error);
        });
      }
      
      // Prefetch explore page product images to prevent flickering
      imagePrefetchService.prefetchExploreImages().catch(error => {
        console.warn('App: Explore product image prefetch failed:', error);
      });
      
      // Prefetch category images to prevent flickering in browse by category section
      imagePrefetchService.prefetchCategoryImages().catch(error => {
        console.warn('App: Category image prefetch failed:', error);
      });
      
      // Prefetch ALL category product images for smooth CategoryModal experience
      imagePrefetchService.prefetchAllCategoryProducts().catch(error => {
        console.warn('App: Category product images prefetch failed:', error);
      });
      
      console.log('App: User data fetched successfully');
      return { ratings, subData };// Return ratings for navigation logic
    } catch (error) {
      console.error('App: Error fetching user data:', error);
      return { ratings: null, subData: null };
    }
  };

  // Function to set up progress subscription and wait for initial data
  const setupProgressSubscription = async (): Promise<void> => {
    try {
      setProgressLoading(true);
      console.log('App: Setting up progress subscription...');
      
      const todayDate = getTodayDateString();
      
      // Set up the subscription and wait for first data
      return new Promise<void>((resolve) => {
        let hasResolved = false;
        
        const unsubscribe = subscribeToProgress(todayDate, (progressData) => {
          console.log('App: Progress data received in subscription:', progressData);
          setTodayProgress(progressData); // Store progress data at App level
          
          // Only resolve on the first data received
          if (!hasResolved) {
            console.log('App: First progress data received, resolving subscription setup');
            setProgressLoading(false);
            hasResolved = true;
            resolve();
          }
          // Keep subscription active for real-time updates
        });
        
        // Store unsubscriber for cleanup
        progressUnsubscriber.current = unsubscribe;
        
        // Add timeout as safety net (resolve after 5 seconds if no data)
        setTimeout(() => {
          if (!hasResolved) {
            console.log('App: Progress subscription timeout, proceeding anyway');
            setProgressLoading(false);
            hasResolved = true;
            resolve();
          }
        }, 5000);
      });
    } catch (error) {
      console.error('App: Error setting up progress subscription:', error);
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    console.log('App: Setting up auth listener');
    // auth().signOut();
   
    // Initialize Facebook SDK for Meta Ads integration
    initializeFacebookSDK();
    
    // Initialize RevenueCat
    configureRevenueCat().catch(error => {
      console.error('App: RevenueCat initialization failed:', error);
    });
    
    // Prefetch static assets immediately on app start
    imagePrefetchService.prefetchStaticAssets().catch(error => {
      console.warn('App: Static asset prefetch failed:', error);
    });
    
    // Prefetch BeginScanScreen image to prevent sliding on navigation
    // Local assets are bundled and don't need explicit prefetching with expo-image
    // The image will be cached on first render with cachePolicy="memory-disk"
    
    // Force sign out on app start for debugging (remove this later)
    
    const unsubscribe = auth().onAuthStateChanged(async (authUser) => {
      console.log('App: Auth state changed:', authUser ? 'User logged in' : 'No user');
      console.log('App: User details:', authUser ? { uid: authUser.uid, email: authUser.email, displayName: authUser.displayName } : 'null');
      setUser(authUser);
      
      // Navigate to appropriate screen based on auth state
      if (authUser) {
        // 🔑 ADMIN USER CHECK - Skip all restrictions for googledevteam@gmail.com
        if (authUser.email === 'googledevteam@gmail.com') {
          console.log('🔑 ADMIN ACCESS: googledevteam@gmail.com detected - bypassing all restrictions');
          await fetchUserData();
          await setupProgressSubscription();
          
          // Initialize streak system for admin
          try {
            const { currentStreak: initialStreak, unsubscribeProgress, unsubscribeStreak } = await initializeStreakSystem();
            setCurrentStreak(initialStreak);
            streakUnsubscribers.current.progress = unsubscribeProgress;
            streakUnsubscribers.current.streak = unsubscribeStreak((newStreak) => {
              setCurrentStreak(newStreak);
            });
          } catch (error) {
            console.error('Admin streak init failed:', error);
          }
          
          ensureDailyReminders().catch(() => {});
          console.log('🔑 ADMIN: Going directly to dashboard with unlimited access');
          setCurrentScreen('dashboard');
          setIsLoading(false);
          return; // Exit early for admin
        }

        // Fetch all user data
        const { ratings: existingRatings, subData: freshSubscriptionData } = await fetchUserData();
        
        // Set up progress subscription and wait for initial data
        await setupProgressSubscription();
        
        // Initialize streak system
        try {
          console.log('App: Initializing streak system...');
          const { currentStreak: initialStreak, unsubscribeProgress, unsubscribeStreak } = await initializeStreakSystem();
          
          // Set initial streak value
          setCurrentStreak(initialStreak);
          console.log('App: Initial streak value:', initialStreak);
          
          // Store unsubscribers for cleanup
          streakUnsubscribers.current.progress = unsubscribeProgress;
          
          // Set up real-time streak listener
          streakUnsubscribers.current.streak = unsubscribeStreak((newStreak) => {
            console.log('App: Streak updated to:', newStreak);
            setCurrentStreak(newStreak);
          });
        } catch (error) {
          console.error('App: Failed to initialize streak system:', error);
          // Continue with app even if streak fails
        }
        
        // Fetch historical progress data in background (30 days excluding today)
        fetchHistoricalProgressData().catch(error => {
          console.warn('App: Historical progress fetch failed:', error);
        });
        
        // Start background prefetching of analysis images for smooth UX
        imagePrefetchService.prefetchLatestAnalysisImage().catch(error => {
          console.warn('App: Background image prefetch failed:', error);
        });
        
        // Schedule or confirm daily reminders now that we have a logged-in user
        ensureDailyReminders().catch((e) => console.warn("notify schedule failed", e));

        // If user has any analysis documents, check subscription status
        if (existingRatings) {
          // Debug logging
          console.log('App: Fresh subscription data:', freshSubscriptionData);
          console.log('App: freshSubscriptionData?.isSubscribed:', freshSubscriptionData?.isSubscribed);
          
          // IMPORTANT: Check real-time RevenueCat status, not just cached Firestore data
          // This ensures expired subscriptions are caught immediately on app startup
          let hasActiveSubscription = false;
          
          try {
            // Import RevenueCat functions
            const { getCustomerInfo, isEntitled } = await import('./src/lib/revenuecat');
            const customerInfo = await getCustomerInfo();
            hasActiveSubscription = await isEntitled(customerInfo);
            
            console.log('App: Real-time RevenueCat subscription check:', hasActiveSubscription);
            
            // If RevenueCat status differs from Firestore, update Firestore
            if (hasActiveSubscription !== freshSubscriptionData?.isSubscribed) {
              console.log('App: RevenueCat status differs from Firestore, updating...');
              const { saveSubscriptionToFirestore } = await import('./src/lib/revenuecat');
              await saveSubscriptionToFirestore(customerInfo);
            }
          } catch (error) {
            console.error('App: Error checking RevenueCat status, falling back to Firestore data:', error);
            hasActiveSubscription = freshSubscriptionData?.isSubscribed === true;
          }
          
          if (hasActiveSubscription) {
            console.log('App: User has existing analysis and active subscription, going to dashboard');
            setCurrentScreen('dashboard');
          } else {
            // User has analysis but no active subscription
            console.log('App: User has existing analysis but no active subscription, going to results with paywall');
            
            // Set up the analysis results and image for SwipeableResultsScreen
            setAnalysisResults(existingRatings);
            if (existingRatings.images && existingRatings.images.length > 0) {
              setSelectedImageUri(existingRatings.images[0].imageUrl);
            }
            
            // Load the skincare routines for the results screen
            setAnalysisAmRoutine(amRoutine);
            setAnalysisPmRoutine(pmRoutine);
            
            // For Android: Skip blur effect and go directly to paywall
            if (Platform.OS === 'android') {
              console.log('App: Android user on reload needs paywall, showing UnlockScreen directly');
              setCurrentScreen('unlock');
            } else {
              // iOS: Use normal results screen with blur effect
              setCurrentScreen('results');
            }
          }
        } else if (!userData?.skinType && !selectedSkinType) {
          console.log('App: User needs to take quiz, starting with beginQuiz');
          setCurrentScreen('beginQuiz');
        } else if (!userData?.dreamSkin) {
          console.log('App: User needs to select dream skin, going to beginQuiz');
          setCurrentScreen('beginQuiz');
        } else {
          console.log('App: No existing analysis, going to beginScan');
          setCurrentScreen('beginScan');
        }
      } else {
        console.log('App: Setting screen to onboarding');
        // Cancel all reminders when user logs out
        await cancelAllReminders().catch(() => {});
        
        // Clean up streak listeners
        if (streakUnsubscribers.current.progress) {
          streakUnsubscribers.current.progress();
          streakUnsubscribers.current.progress = null;
        }
        if (streakUnsubscribers.current.streak) {
          streakUnsubscribers.current.streak();
          streakUnsubscribers.current.streak = null;
        }
        
        // Clean up progress subscription
        if (progressUnsubscriber.current) {
          progressUnsubscriber.current();
          progressUnsubscriber.current = null;
        }
        
        // Reset progress loading state and clear data
        setProgressLoading(true);
        setTodayProgress(null);
        
        // Clear streak data
        setCurrentStreak(0);
        StreakCache.getInstance().reset();
        
        // Clear user data when logged out
        setUserData(null);
        setUserRatings(null);
        setAmRoutine(null);
        setPmRoutine(null);
        setHistoricalProgress({}); // Clear historical progress data
        setSelectedSkinType(null); // Clear skin type selection
        setSubscriptionData(null); // Clear subscription data
        // Clear prefetch cache when user logs out
        imagePrefetchService.clearPrefetchCache();
        setCurrentScreen('onboarding');
      }
      
      setIsLoading(false);
    });

    return () => {
      // Cleanup auth listener
      unsubscribe();
      
      // Cleanup streak listeners
      if (streakUnsubscribers.current.progress) {
        streakUnsubscribers.current.progress();
      }
      if (streakUnsubscribers.current.streak) {
        streakUnsubscribers.current.streak();
      }
    };
  }, []);

   // Monitor subscription status changes and route to unlock screen when expired
 useEffect(() => {
    // Only monitor subscription for authenticated users who have completed onboarding
    if (!user || !rcInitialized) {
      return;
    }

    // 🔑 ADMIN BYPASS - Skip subscription monitoring for admin user
    if (user.email === 'googledevteam@gmail.com') {
      console.log('🔑 ADMIN: Bypassing subscription monitoring');
      return;
    }

    // Skip monitoring for screens where subscription doesn't matter OR during onboarding flow
    const skipScreens: AppScreen[] = ['onboarding', 'skinTypeQuestion', 'beginQuiz', 'dreamSkinQuestion', 'beginScan', 'camera', 'loading', 'unlock'];
    if (skipScreens.includes(currentScreen)) {
      return;
    }

    // Only monitor subscription for screens that require premium access
    const premiumScreens: AppScreen[] = ['dashboard', 'results', 'skincare'];
    if (!premiumScreens.includes(currentScreen)) {
      return;
    }

    console.log('App: Monitoring subscription status - isPro:', isPro, 'currentScreen:', currentScreen);

    // If user's subscription expired and they're not already on unlock screen
    if (!isPro && currentScreen !== 'unlock') {
      console.log('App: Subscription expired, routing to unlock screen');
      
      // For Android: Go directly to unlock screen
      if (Platform.OS === 'android') {
        setCurrentScreen('unlock');
      } else {
        // For iOS: If on results screen, the paywall modal will handle it
        // Otherwise, go to unlock screen
        if (currentScreen !== 'results') {
          setCurrentScreen('unlock');
        }
      }
    }
  }, [user, rcInitialized, isPro, currentScreen]);

  const handleOnboardingComplete = (data: OnboardingData) => {
    console.log('Onboarding completed with data:', data);
    // Here you would typically:
    // 1. Save data to Firebase/AsyncStorage
    // 2. Navigate to main app
    // 3. Set user as onboarded
  };

  const handleGoogleSignInSuccess = () => {
    console.log('Google Sign-In successful, user should be authenticated');
    // User state will be updated automatically by onAuthStateChanged
  };

  const handleBeginScan = () => {
    console.log('Begin Scan pressed - transitioning to camera screen');
    setCurrentScreen('camera');
  };

  const handlePhotoTaken = (photoUri: string) => {
    console.log('Photo taken:', photoUri);
    setSelectedImageUri(photoUri);
    // Stay on camera screen to show the captured photo
    // User can then tap "Analyze" to proceed
  };

  const handleBackToScan = () => {
    setCurrentScreen('beginScan');
  };

  const handleAnalyze = async (imageUri: string) => {
    console.log('Starting analysis for image:', imageUri);
    setSelectedImageUri(imageUri);
    transitionToLoading();
  
    try {
      // If user chose a specific skinType (not auto), save it now during loading
      if (selectedSkinType && selectedSkinType !== 'auto') {
        console.log('Saving user-selected skin type:', selectedSkinType);
        await saveUserSkinType(selectedSkinType);
      }

      // Determine userSkinType to pass to backend (only if not auto)
      const userSkinTypeOverride = selectedSkinType && selectedSkinType !== 'auto' 
        ? (selectedSkinType as 'oily' | 'normal' | 'dry' | 'combination')
        : undefined;

      const results = await analyzeImage(imageUri, true, false, undefined, undefined, userSkinTypeOverride);
      setAnalysisResults(results);

      // If user selected auto, save AI-chosen skinType now (still on loading screen)
      if (selectedSkinType === 'auto' && results?.skinType) {
        const normalized = (results.skinType || '').toLowerCase();
        const allowed = ['oily', 'dry', 'normal', 'combination'] as const;
        const valid = allowed.includes(normalized as any)
          ? (normalized as (typeof allowed)[number])
          : 'normal'; // fallback
        
        console.log('Saving AI-detected skin type:', valid);
        await saveUserSkinType(valid);
      }
      
              // Ensure we have userData for routine generation (refresh if needed)
        let workingUserData = userData;
        if (!workingUserData) {
          console.log('userData not available, fetching fresh data...');
          workingUserData = await getUserSkinData();
          if (workingUserData) {
            setUserData(workingUserData);
          }
        }

        // Determine the correct skin type to use
        let finalSkinType: string;
        if (selectedSkinType === 'auto' && results?.skinType) {
          // AI decided skin type
          const normalized = (results.skinType || '').toLowerCase();
          const allowed = ['oily', 'dry', 'normal', 'combination'] as const;
          finalSkinType = allowed.includes(normalized as any)
            ? (normalized as (typeof allowed)[number])
            : 'normal';
        } else if (selectedSkinType && selectedSkinType !== 'auto') {
          // User selected skin type
          finalSkinType = selectedSkinType;
        } else {
          // Fallback to existing userData skin type or 'normal'
          finalSkinType = workingUserData?.skinType || 'normal';
        }

        // Ensure workingUserData has the correct skin type for routine generation
        if (workingUserData) {
          workingUserData = { ...workingUserData, skinType: finalSkinType };
        } else {
          // Create minimal userData with correct skin type
          workingUserData = {
            skinType: finalSkinType,
            dreamSkin: 'clear' // Will be updated when user selects dream skin
          };
        }

        // Process and save skincare routines with image uploads during loading
        if (workingUserData) {
          console.log('Processing skincare routines and uploading product images...');
          console.log('Final skin type for routine generation:', finalSkinType);
          console.log('Working user data:', workingUserData);
          const dreamSkinTemplates = require('./src/data/dreamSkinTemplates.json');
          await processAndSaveSkincareRoutines(workingUserData, results, dreamSkinTemplates);
          console.log('Skincare routines processed and saved successfully');
          
          // Fetch the newly created skincare routines for the analysis results
          console.log('Fetching newly created skincare routines...');
          const [newAmRoutine, newPmRoutine] = await Promise.all([
            getSkincareRoutine('AM'),
            getSkincareRoutine('PM')
          ]);
          setAnalysisAmRoutine(newAmRoutine);
          setAnalysisPmRoutine(newPmRoutine);
          console.log('Analysis skincare routines loaded successfully');
        } else {
          console.warn('No userData available for routine generation');
        }
      
      // Refresh user data to get the latest analysis with embedded image
      await fetchUserData();
      
      // Refresh historical progress data in background after new analysis
      fetchHistoricalProgressData().catch(error => {
        console.warn('App: Historical progress refresh failed:', error);
      });
      
      // Navigate to results screen first, but skip blur effect on Android by going directly to paywall
      if (Platform.OS === 'android') {
        // For Android: Check if user needs paywall and go directly there
        const hasActiveSubscription = subscriptionData?.isSubscribed === true;
        if (!hasActiveSubscription) {
          console.log('App: Android user needs paywall, showing UnlockScreen directly');
          // We'll add UnlockScreen to the switch statement and navigate there
          setCurrentScreen('unlock');
        } else {
          console.log('App: Android user has subscription, showing results normally');
          setCurrentScreen('results');
        }
      } else {
        // iOS: Use normal results screen with blur effect
        setCurrentScreen('results');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      // Go back to camera screen on error
      setCurrentScreen('camera');
    }
  };

  const handleAnalysisComplete = () => {
    if (analysisResults && selectedImageUri) {
      setCurrentScreen('results');
    }
  };

  const handleTryAgain = () => {
    setSelectedImageUri(null);
    setAnalysisResults(null);
    setCurrentScreen('camera');
  };

  const handleContinue = async () => {
    // Navigate directly to dashboard since skincare is now embedded in results screen
    await fetchUserData();
    setCurrentScreen('dashboard');
  };





  const handleSignOut = async () => {
    try {
      await cancelAllReminders(); // Cancel notifications first
      await signOut();
      console.log('User signed out successfully');
      setCurrentScreen('onboarding');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleSkinTypeSelection = (choice: 'oily' | 'normal' | 'dry' | 'combination' | 'auto') => {
    console.log('Skin type selected:', choice);
    setSelectedSkinType(choice);
    
    // Check if user still needs to select dream skin
    if (!userData?.dreamSkin) {
      setCurrentScreen('dreamSkinQuestion');
    } else {
      setCurrentScreen('beginScan');
    }
  };

  const handleBeginQuiz = () => {
    console.log('Begin quiz pressed, determining next step');
    
    // Check what the user needs to complete
    if (!userData?.skinType && !selectedSkinType) {
      console.log('User needs to select skin type first');
      setCurrentScreen('skinTypeQuestion');
    } else if (!userData?.dreamSkin) {
      console.log('User has skin type, going to dream skin question');
      setCurrentScreen('dreamSkinQuestion');
    } else {
      console.log('User has completed all questions, going to begin scan');
      setCurrentScreen('beginScan');
    }
  };

  const handleDreamSkinSelection = async (value: DreamSkinType) => {
    console.log('Dream skin selected:', value);
    await saveUserDreamSkin(value);
    // Refresh userData after saving dream skin
    const updated = await getUserSkinData();
    setUserData(updated);
    setCurrentScreen('beginScan');
  };



  if (isLoading) {
    const LoadingContent = (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
        <Image 
        source={require('./assets/loadingscreen.png')}
        style={styles.loadingLogo}
        contentFit="contain"
        cachePolicy="memory-disk"
        priority="high"
      />
        </View>
      </GestureHandlerRootView>
    );

    return Platform.OS === 'android' ? (
      <SafeAreaProvider>{LoadingContent}</SafeAreaProvider>
    ) : LoadingContent;
  }

  // Render screens based on current state
  console.log('App: Rendering screen:', currentScreen, 'Loading:', isLoading, 'Progress Loading:', progressLoading);
  
  const MainContent = (
    <DateProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
      {(() => {
  switch (currentScreen) {
    case 'onboarding':
      console.log('App: Rendering OnboardingFlow');
      return (
        <OnboardingFlow 
          onComplete={handleOnboardingComplete}
          onGoogleSignInSuccess={handleGoogleSignInSuccess}
        />
      );

    case 'skinTypeQuestion':
      console.log('App: Rendering SkinTypeQuestionScreen');
      return (
        <SkinTypeQuestionScreen 
          onSelect={handleSkinTypeSelection}
        />
      );

    case 'beginQuiz':
      console.log('App: Rendering BeginQuizScreen');
      return (
        <BeginQuizScreen 
          onBeginQuiz={handleBeginQuiz}
        />
      );

    case 'dreamSkinQuestion':
      console.log('App: Rendering DreamSkinScreen');
      return (
        <DreamSkinScreen 
          onSelect={handleDreamSkinSelection}
        />
      );

    case 'beginScan':
      console.log('App: Rendering BeginScanScreen');
      return (
        <BeginScanScreen 
          onBeginScan={handleBeginScan}
          userDisplayName={user?.displayName || user?.email || undefined}
          onSignOut={handleSignOut}
        />
      );

    case 'camera':
      console.log('App: Rendering CameraScreen');
      return (
        <CameraScreen 
          onPhotoTaken={handlePhotoTaken}
          onBack={handleBackToScan}
          onAnalyze={handleAnalyze}
        />
      );

    case 'loading':
      console.log('App: Rendering LoadingScreen');
      return (
        <LoadingScreen 
          onComplete={handleAnalysisComplete}
        />
      );

    case 'results':
      console.log('App: Rendering SwipeableResultsScreen');
      // Ensure we have valid data before rendering SwipeableResultsScreen
      if (!selectedImageUri || !analysisResults) {
        console.log('App: Missing required data for results screen, redirecting to camera');
        // Use useEffect to avoid state update during render
        setTimeout(() => setCurrentScreen('camera'), 0);
        return (
          <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff' }}>Loading...</Text>
          </View>
        );
      }
      return (
        <SwipeableResultsScreen 
          imageUri={selectedImageUri}
          results={analysisResults}
          amRoutine={analysisAmRoutine}
          pmRoutine={analysisPmRoutine}
          onTryAgain={handleTryAgain}
          onContinue={handleContinue}
        />
      );

    case 'skincare':
      console.log('App: Rendering SkincareRoutineScreen');
      return (
        <SkincareRoutineScreen 
          onBackToDashboard={async () => {
            await fetchUserData();
            setCurrentScreen('dashboard');
          }}
          shouldRefresh={shouldRefreshRoutine}
          onRefreshComplete={() => setShouldRefreshRoutine(false)}
        />
      );

    case 'dashboard':
      console.log('App: Rendering DashboardScreen');
      
      // Show loading screen until progress subscription is ready
      if (progressLoading) {
        console.log('App: Waiting for progress subscription...');
        return <LoadingScreen onComplete={() => {}} />;
      }
      
      return (
        <DashboardScreen 
          onSignOut={handleSignOut}
          userData={userData}
          userRatings={userRatings}
          amRoutine={amRoutine}
          pmRoutine={pmRoutine}
          historicalProgress={historicalProgress}
          refreshUserData={refreshUserDataForDashboard}
          currentStreak={currentStreak}
          todayProgress={todayProgress}
          onRoutineUpdated={handleRoutineUpdated}
        />
      );

    case 'unlock':
      console.log('App: Rendering UnlockScreen for Android paywall');
      return (
        <UnlockScreen 
          appUserID={user?.uid}
          onUnlock={async () => {
            // After successful unlock, determine where to route based on context
            await fetchUserData();
            
            // If user has analysis results and selected image, they're in analysis flow → go to results
            // If no analysis data, they're just resubscribing → go to dashboard
            if (analysisResults) {
              console.log('App: User has active analysis, routing to results screen');
              setCurrentScreen('results');
            } else {
              console.log('App: User resubscribing without active analysis, routing to dashboard');
              setCurrentScreen('dashboard');
            }
          }}
          onRestore={() => {
            console.log('User initiated restore purchase from UnlockScreen');
          }}
          onTerms={() => {
            // Open Terms of Service
            console.log('Opening Terms of Service');
          }}
          onPrivacy={() => {
            // Open Privacy Policy
            console.log('Opening Privacy Policy');
          }}
        />
      );

    default:
      console.log('App: Rendering default OnboardingFlow');
      return (
        <OnboardingFlow 
          onComplete={handleOnboardingComplete}
          onGoogleSignInSuccess={handleGoogleSignInSuccess}
        />
      );
  }
})()}
{isTransitioning && (
  <Animated.View
    pointerEvents="none"
    style={[
      StyleSheet.absoluteFillObject as any,
      { backgroundColor: '#000', opacity: fadeOverlay, zIndex: 999 }
    ]}
  />
)}
      </GestureHandlerRootView>
    </DateProvider>
  );

  return Platform.OS === 'android' ? (
    <SafeAreaProvider>{MainContent}</SafeAreaProvider>
  ) : MainContent;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    marginTop: -50, // Move up by 50 pixels
  },
  loadingLogo: {
    width: 170,
    height: 170,
  },
  authenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 20,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 30,
  },
  signOutButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});