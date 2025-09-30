import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, Dimensions, ScrollView, Linking, Animated, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import auth from '@react-native-firebase/auth';
import { AnalysisResults } from '../services/analysisService';
import { getUserSkinData, UserSkinData, saveUserRatings, saveSkincareRoutine, SkincareStep, SkincareRoutine, getSkincareRoutine } from '../services/firestoreService';
import dreamSkinTemplates from '../data/dreamSkinTemplates.json';
import CompactResultsScreen from './CompactResultsScreen';
import { triggerButtonHaptics } from '../services/haptics';
import ProductDetailsModal from '../components/ProductDetailsModal';
import UnlockScreen from './UnlockScreen';

const { width, height } = Dimensions.get('window');

interface SwipeableResultsScreenProps {
  imageUri: string;
  results: AnalysisResults;
  amRoutine: SkincareRoutine | null;
  pmRoutine: SkincareRoutine | null;
  onTryAgain: () => void;
  onContinue: () => void;
}

interface BarMetricProps {
  label: string;
  value: number;
}

function BarMetric({ label, value }: BarMetricProps) {
  return (
    <View style={styles.barMetricContainer}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barContainer}>
        <View style={[styles.bar, { width: `${value}%` }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

// Progress indicator component
function ProgressIndicator({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: totalPages }, (_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index === currentPage ? styles.activeDot : styles.inactiveDot
          ]}
        />
      ))}
    </View>
  );
}

// Helper function to get top 2 concerns
function getTopConcerns(results: AnalysisResults) {
  const concerns = [
    { name: 'Hyperpigmentation', value: results.hyperpigmentation, label: 'dark spots' },
    { name: 'Redness', value: results.redness, label: 'redness' },
    { name: 'Breakouts', value: results.breakouts, label: 'breakouts' },
    { name: 'Wrinkles', value: results.wrinkles, label: 'fine lines' },
    { name: 'Texture', value: results.texture, label: 'rough texture' },
  ];
  
  return concerns
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .filter(concern => concern.value > 0.1); // Only show if value is above threshold
}

// Capitalize skin type
function capitalizeSkinType(skinType: string) {
  return skinType.charAt(0).toUpperCase() + skinType.slice(1);
}

export default function SwipeableResultsScreen({ imageUri, results, amRoutine, pmRoutine, onTryAgain, onContinue }: SwipeableResultsScreenProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 4; // Ratings, Concerns, Skin Goals, Skincare Routine
  const scrollViewRef = useRef<ScrollView>(null);
  const [userData, setUserData] = useState<UserSkinData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  
  // Lock state for paywall
  // Android: Always unlocked, no blur/paywall on Android
  const [isLocked, setIsLocked] = useState(true); // Paywall enabled by default
  const [showUnlockScreen, setShowUnlockScreen] = useState(false);
  
  // Modal state for product details
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SkincareStep | null>(null);
  
  // Shimmer animation for unlock button
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  
  // Gesture handler refs
  const parentGestureRef = useRef(null);

  // Starfield background (same feel as LoadingScreen)
  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * width,
        top: Math.random() * height,
        size: Math.random() * 3 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: 1500 + Math.random() * 3000,
        color: i < 60 ? '#FFFFFF' : i < 75 ? '#A78BFA' : '#8B5CF6',
      })),
    [width, height]
  );

  const starOpacities = useMemo(
    () => stars.map(star => new Animated.Value(star.brightness * 0.8)),
    [stars]
  );

  // Vertical slide for swipe-down dismiss on page 4 (currentPage === 3)
  const slideY = useRef(new Animated.Value(0)).current;
  const animateDownAndContinue = () => {
    Animated.timing(slideY, { toValue: height, duration: 300, useNativeDriver: true }).start(() => {
      onContinue();
      // slideY.setValue(0); // reset for next time
    });
  };

  useEffect(() => {
    stars.forEach((star, i) => {
      const startDelay = Math.random() * 2000;
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(starOpacities[i], {
              toValue: star.brightness * 0.2,
              duration: star.twinkleSpeed,
              useNativeDriver: true,
            }),
            Animated.timing(starOpacities[i], {
              toValue: star.brightness * 1.0,
              duration: star.twinkleSpeed,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, startDelay);
    });
  }, [stars, starOpacities]);

  useEffect(() => {
    fetchUserData();
  }, []);

  // Helper function to process routine with conditional logic
  const processRoutineWithConditionalLogic = (routine: any) => {
    if (!userData || !results) return [];

    const productMapping = dreamSkinTemplates.productCategoryMapping;
    const conditionalProducts = dreamSkinTemplates.conditionalProducts;
    
    // Check breakout threshold for conditional logic
    const hasBreakouts = results.breakouts >= (conditionalProducts.breakoutDetection?.threshold || 0.2);
    
    let processedSteps = routine.steps.map((step: any) => {
      // Handle optional steps based on breakout threshold
      if (step.optional === 'breakouts' && !hasBreakouts) {
        return null; // Remove this step if no breakouts detected
      }

      // Check if this step should be replaced by conditional product
      let finalStep = { ...step };
      
      if (hasBreakouts && step.category === 'brightening treatment') {
        // Replace with Face Reality Sal‑C Toner
        const conditionalProduct = (conditionalProducts.breakoutDetection?.products as any)?.['brightening treatment'];
        if (conditionalProduct) {
          finalStep = {
            ...step,
            name: conditionalProduct.name,
            productType: conditionalProduct.productType,
            purpose: conditionalProduct.purpose,
            howTo: conditionalProduct.howTo,
            category: 'brightening treatment',
            // Add conditional product specific fields
            productName: conditionalProduct.name,
            amazonUrl: conditionalProduct.amazonUrl,
            productImage: conditionalProduct.productImage,
            whyEffective: `${conditionalProduct.purpose} - specifically formulated for breakout-prone skin.`,
            rateOfImportance: 4
          };
        }
      } else {
        // Get personalized product details from productCategoryMapping
        const categoryMapping = productMapping[step.category as keyof typeof productMapping] || 
                               productMapping[step.name as keyof typeof productMapping];
        
        if (categoryMapping) {
          let skinTypeMapping;
          
          // Handle both skin-type specific and universal mappings
          if ('all' in categoryMapping) {
            skinTypeMapping = categoryMapping.all;
          } else if (userData.skinType && userData.skinType in categoryMapping) {
            skinTypeMapping = categoryMapping[userData.skinType as keyof typeof categoryMapping];
          }
          
          if (skinTypeMapping && typeof skinTypeMapping === 'object') {
            finalStep = {
              ...step,
              productType: skinTypeMapping.productType || step.productType,
              howTo: skinTypeMapping.howTo || step.howTo,
              productName: skinTypeMapping.productName,
              amazonUrl: skinTypeMapping.amazonUrl,
              productImage: skinTypeMapping.productImage,
              whyEffective: skinTypeMapping.whyEffective,
              rateOfImportance: skinTypeMapping.rateOfImportance
            };
          }
        }
      }

      return finalStep;
    }).filter((step: any) => step !== null); // Remove null steps (optional steps that were filtered out)

    return processedSteps;
  };

  // Save both AM and PM skincare routines to Firestore
  const saveSkincareRoutines = async () => {
    if (!userData || !results) return;

    try {
      const dreamSkinKey = (userData.dreamSkin || 'clear').toLowerCase() + 'Skin';
      const template = dreamSkinTemplates.dreamSkinTemplates[dreamSkinKey as keyof typeof dreamSkinTemplates.dreamSkinTemplates];
      
      if (!template) {
        console.error('No template found for dream skin type:', userData.dreamSkin);
        return;
      }

      // Process both routines with conditional logic
      const amRoutine = processRoutineWithConditionalLogic(template.amRoutine);
      const pmRoutine = processRoutineWithConditionalLogic(template.pmRoutine);

      // Save both routines to Firestore
      await Promise.all([
        saveSkincareRoutine('AM', amRoutine, userData.dreamSkin || 'clear', userData.skinType || 'normal'),
        saveSkincareRoutine('PM', pmRoutine, userData.dreamSkin || 'clear', userData.skinType || 'normal')
      ]);

      console.log('Both AM and PM skincare routines saved successfully');
    } catch (error) {
      console.error('Error saving skincare routines:', error);
    }
  };


  const fetchUserData = async () => {
    try {
      const data = await getUserSkinData();
      
      if (data) {
        setUserData(data);
      } else {
        // Fallback data
        setUserData({
          dreamSkin: 'Clear',
          skinType: 'oily'
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback data on error
      setUserData({
        dreamSkin: 'Clear',
        skinType: 'oily'
      });
    }
  };

  const onSwipeGesture = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const { translationX, velocityX } = nativeEvent;
      
      if (translationX > 50 || velocityX > 500) {
        // Swipe right - go to previous page
        if (currentPage > 0) {
          const newPage = currentPage - 1;
          setCurrentPage(newPage);
          scrollViewRef.current?.scrollTo({ x: newPage * width, animated: true });
        }
      } else if (translationX < -50 || velocityX < -500) {
        // Swipe left - go to next page
        if (currentPage < totalPages - 1) {
          const newPage = currentPage + 1;
          setCurrentPage(newPage);
          scrollViewRef.current?.scrollTo({ x: newPage * width, animated: true });
        }
      }
    }
  };

  const handleScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(scrollX / width);
    setCurrentPage(pageIndex);
  };

  const getPersonalizedRoutine = () => {
    if (!userData || !results) return [];

    const dreamSkinKey = (userData.dreamSkin || 'clear').toLowerCase() + 'Skin';
    const template = dreamSkinTemplates.dreamSkinTemplates[dreamSkinKey as keyof typeof dreamSkinTemplates.dreamSkinTemplates];
    
    if (!template) return [];

    const routine = selectedPeriod === 'AM' ? template.amRoutine : template.pmRoutine;
    
    return processRoutineWithConditionalLogic(routine);
  };

  // Page 1: Compact results display
  const renderCompactPage = () => (
    <View style={[styles.pageContainer, { width }]}>
      <CompactResultsScreen imageUri={imageUri} results={results} />
    </View>
  );

  // Page 2: Artistic concerns display
  const renderConcernsPage = () => {
    const topConcerns = getTopConcerns(results);
    
    return (
      <View style={[styles.pageContainer, { width }]}>
        <View style={styles.artisticCard}>
          {/* Profile Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.profileImage} />
          </View>
          
          {/* Skin Type */}
          <View style={styles.skinTypeSection}>
            <Text style={styles.sectionTitle}>Skin Type</Text>
            <Text style={styles.skinTypeValue}>{capitalizeSkinType(results.skinType)}</Text>
          </View>
          
          {/* Primary Concerns Card */}
          <LinearGradient
            colors={['rgba(239, 68, 68, 0.25)', 'rgba(139, 69, 19, 0.15)', 'rgba(20, 20, 20, 0.9)']}
            style={styles.concernsCard}
          >
            <Text style={[styles.sectionTitle, styles.warningTitle]}>PRIMARY CONCERNS</Text>
            <View style={styles.concernsList}>
              {topConcerns.length > 0 ? (
                topConcerns.map((concern, index) => (
                  <View key={concern.name} style={styles.concernItem}>
                    <View style={styles.concernNumber}>
                      <Text style={styles.concernNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.concernName}>{concern.label}</Text>
                    <View style={styles.severityIndicator}>
                      <View 
                        style={[
                          styles.severityBar, 
                          { width: `${concern.value * 100}%` }
                        ]} 
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noConcernsText}>Great skin! No major concerns detected.</Text>
              )}
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  // Render Your Skin Goals page (page 3)
  const renderSkinGoalsPage = () => {
    // Only show if perfect skin image is available
    if (!results.perfectSkinImageUrl) {
      return (
        <View style={[styles.pageContainer, { width, paddingHorizontal: 0 }]}>
          <View style={[styles.artisticCard, { justifyContent: 'center' }]}>
            <Text style={styles.perfectSkinTitle}>YOUR SKIN GOALS ✨</Text>
            <Text style={styles.perfectSkinSubtitle}>
              Complete your first analysis to see your skin potential!
            </Text>
          </View>
        </View>
      );
    }

      return (
          <View style={styles.umaxContainer}>
            {/* Galaxy starfield background */}
            <View style={StyleSheet.absoluteFill}>
              {stars.map((star, i) => (
                <Animated.View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: star.left,
                    top: star.top,
                    width: star.size,
                    height: star.size,
                    borderRadius: star.size / 2,
                    backgroundColor: star.color,
                    opacity: starOpacities[i],
                  }}
                />
              ))}
            </View>
            
            <View style={styles.textContainer}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientTextContainer}
              >
                <Text style={styles.cursiveText}>You With Perfect Skin</Text>
              </LinearGradient>
            </View>
            <View style={styles.umaxImageContainer}>
              <Image
                source={{ uri: results.perfectSkinImageUrl }}
                style={styles.umaxImage}
                resizeMode="cover"
              />
            </View>
          </View>
      );
  };

  // Helper function to handle product purchase
  const handleProductPurchase = async (amazonUrl?: string) => {
    if (amazonUrl) {
      try {
        const supported = await Linking.canOpenURL(amazonUrl);
        if (supported) {
          await Linking.openURL(amazonUrl);
        } else {
          console.error('Cannot open Amazon URL:', amazonUrl);
        }
      } catch (error) {
        console.error('Error opening Amazon URL:', error);
      }
    }
  };

  // Handle product card press
  const handleProductPress = (step: SkincareStep) => {
    triggerButtonHaptics();
    setSelectedProduct(step);
    setModalVisible(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedProduct(null);
  };

  // Helper function to render a skincare step
  const renderSkincareStep = (step: SkincareStep, index: number) => {
    const isEven = index % 2 === 0;
    
    return (
      <TouchableOpacity 
        key={step.step} 
        style={styles.fullStepCard}
        onPress={() => handleProductPress(step)}
        activeOpacity={0.9}
      >
        <View style={styles.fullStepContent}>
          {/* Step Header */}
          <View style={styles.fullStepHeader}>
            <View style={[styles.fullStepNumber, isEven ? styles.fullStepNumberPrimary : styles.fullStepNumberSecondary]}>
              <Text style={styles.fullStepNumberText}>{step.step}</Text>
            </View>
            <View style={styles.fullStepTitleContainer}>
              <Text style={styles.fullStepTitle}>{step.name}</Text>
            </View>
            {step.rateOfImportance && (
              <View style={styles.fullImportanceContainer}>
                <Text style={styles.fullImportanceText}>★ {step.rateOfImportance}/5</Text>
              </View>
            )}
          </View>

          {/* Product Information */}
          <View style={styles.fullProductSection}>
            {/* Product Image and Details */}
            <View style={styles.fullProductInfo}>
              {step.productImage && (
                <Image 
                  source={{ uri: step.productImage }} 
                  style={styles.fullProductImage}
                  resizeMode="contain"
                />
              )}
              <View style={styles.fullProductDetails}>
            <Text style={styles.fullProductName}>{step.productName || step.name}</Text>
            <Text style={styles.fullProductType}>{step.productType}</Text>
              </View>
            </View>

            {/* Purchase Button */}
            {step.amazonUrl && (
              <TouchableOpacity 
                style={styles.fullPurchaseButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleProductPurchase(step.amazonUrl);
                }}
              >
                <Text style={styles.fullPurchaseButtonText}>🛒 Buy on Amazon</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Page 3: Full Skincare Routine
  const renderDreamRoutinePage = () => {
    const currentRoutine = selectedPeriod === 'AM' ? amRoutine : pmRoutine;
    const dreamSkinDisplay = currentRoutine?.dreamSkinType || 'Clear';

    if (!currentRoutine) {
      // Safety fetch from Firestore for edge case
      const [safetyRoutine, setSafetyRoutine] = React.useState<SkincareRoutine | null>(null);
      const [isLoading, setIsLoading] = React.useState(true);
      console.log('SwipeableResults: Safety routine:', safetyRoutine);
      React.useEffect(() => {
        const fetchSafetyRoutine = async () => {
          try {
            console.log(`SwipeableResults: Safety fetching ${selectedPeriod} routine from Firestore`);
            const routine = await getSkincareRoutine(selectedPeriod);
            setSafetyRoutine(routine);
            setIsLoading(false);
          } catch (error) {
            console.error(`SwipeableResults: Error fetching ${selectedPeriod} routine:`, error);
            setIsLoading(false);
          }
        };

        fetchSafetyRoutine();
      }, [selectedPeriod]);

      if (isLoading) {
        return (
          <View style={[styles.pageContainer, { width }]}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading your routine...</Text>
            </View>
          </View>
        );
      }

      if (!safetyRoutine) {
        return (
          <View style={[styles.pageContainer, { width }]}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>No routine found</Text>
            </View>
          </View>
        );
      }

      // Use the safety routine in the same format as the regular return
      const safetyDreamSkinDisplay = safetyRoutine?.dreamSkinType || 'Clear';

      return (
        <View style={[styles.pageContainer, { width, paddingHorizontal: 0 }]}>
          <View style={{ 
            flex: Platform.OS === 'android' ? undefined : 1, 
            width: '90%', 
            ...(Platform.OS === 'android' && { 
              height: '100%',
              position: 'relative'
            }) 
          }}>
            {/* Steps */}
            <ScrollView 
              style={styles.fullStepsContainer} 
              contentContainerStyle={[styles.fullStepsContentContainer, { paddingTop: 20, paddingHorizontal: 10 }]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              scrollEnabled={true}
              bounces={Platform.OS !== 'android'}
              overScrollMode="always"
              disableScrollViewPanResponder={Platform.OS === 'android'}
            >
              {/* Moved header */}
              <View style={styles.fullRoutineHeader}>
                <Text style={styles.fullRoutineTitle}>Your Skincare Routine</Text>
                <Text style={styles.fullRoutineSubtitle}>{safetyDreamSkinDisplay.charAt(0).toUpperCase() + safetyDreamSkinDisplay.slice(1)} Skin</Text>
                <Text style={styles.fullRoutineDescription}>
                  {safetyRoutine.stepCount} • {safetyRoutine.skinType} skin type
                </Text>
              </View>

              {/* Moved period selector */}
              <View style={styles.fullPeriodSelector}>
                <TouchableOpacity 
                  style={[styles.fullPeriodButton, selectedPeriod === 'AM' && styles.fullPeriodButtonActive]}
                  onPress={() => setSelectedPeriod('AM')}
                >
                  <Text style={[styles.fullPeriodButtonText, selectedPeriod === 'AM' && styles.fullPeriodButtonTextActive]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.fullPeriodButton, selectedPeriod === 'PM' && styles.fullPeriodButtonActive]}
                  onPress={() => setSelectedPeriod('PM')}
                >
                  <Text style={[styles.fullPeriodButtonText, selectedPeriod === 'PM' && styles.fullPeriodButtonTextActive]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>

              {safetyRoutine.steps.map((step, index) => renderSkincareStep(step, index))}
              
              {/* Bottom Padding */}
              <View style={styles.fullBottomPadding} />
            </ScrollView>
          </View>
          
          {/* Swipe-down gesture area - only at bottom - Disabled on Android to fix scrolling */}
          {Platform.OS !== 'android' && (
            <PanGestureHandler
              onGestureEvent={Animated.event(
                [{ nativeEvent: { translationY: slideY } }],
                { useNativeDriver: true }
              )}
              onHandlerStateChange={({ nativeEvent }) => {
                if (nativeEvent.state === State.END) {
                  const { translationY, velocityY, translationX } = nativeEvent;
                  
                  // Check if this is primarily a horizontal swipe - let parent handle it
                  if (Math.abs(translationX) > Math.abs(translationY) && Math.abs(translationX) > 50) {
                    return;
                  }
                  
                  // Handle vertical swipe
                  if (translationY > 120 || velocityY > 800) {
                    animateDownAndContinue();
                  } else {
                    Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
                  }
                }
              }}
              simultaneousHandlers={parentGestureRef}
            >
              <View style={styles.swipeDownArea} />
            </PanGestureHandler>
          )}
        </View>
      );
    }

    return (
      <View style={[styles.pageContainer, { width, paddingHorizontal: 0 }]}>
        <View style={{ 
          flex: Platform.OS === 'android' ? undefined : 1, 
          width: '90%', 
          ...(Platform.OS === 'android' && { 
            height: '100%',
            position: 'relative'
          }) 
        }}>
          {/* Steps */}
          <ScrollView 
            style={styles.fullStepsContainer} 
            contentContainerStyle={[styles.fullStepsContentContainer, { paddingTop: 20, paddingHorizontal: 10 }]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            bounces={Platform.OS !== 'android'}
            overScrollMode="always"
            disableScrollViewPanResponder={Platform.OS === 'android'}
          >
            {/* Moved header */}
            <View style={styles.fullRoutineHeader}>
              <Text style={styles.fullRoutineTitle}>Your Skincare Routine</Text>
              <Text style={styles.fullRoutineSubtitle}>{dreamSkinDisplay.charAt(0).toUpperCase() + dreamSkinDisplay.slice(1)} Skin</Text>
              <Text style={styles.fullRoutineDescription}>
                {currentRoutine.stepCount} • {currentRoutine.skinType} skin type
              </Text>
            </View>

            {/* Moved period selector */}
            <View style={styles.fullPeriodSelector}>
              <TouchableOpacity 
                style={[styles.fullPeriodButton, selectedPeriod === 'AM' && styles.fullPeriodButtonActive]}
                onPress={() => setSelectedPeriod('AM')}
              >
                <Text style={[styles.fullPeriodButtonText, selectedPeriod === 'AM' && styles.fullPeriodButtonTextActive]}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.fullPeriodButton, selectedPeriod === 'PM' && styles.fullPeriodButtonActive]}
                onPress={() => setSelectedPeriod('PM')}
              >
                <Text style={[styles.fullPeriodButtonText, selectedPeriod === 'PM' && styles.fullPeriodButtonTextActive]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>

            {currentRoutine.steps.map((step, index) => renderSkincareStep(step, index))}
            
            {/* Bottom Padding */}
            <View style={styles.fullBottomPadding} />
          </ScrollView>
        </View>
        
        {/* Swipe-down gesture area - only at bottom - Disabled on Android to fix scrolling */}
        {Platform.OS !== 'android' && (
          <PanGestureHandler
            onGestureEvent={Animated.event(
              [{ nativeEvent: { translationY: slideY } }],
              { useNativeDriver: true }
            )}
            onHandlerStateChange={({ nativeEvent }) => {
              if (nativeEvent.state === State.END) {
                const { translationY, velocityY, translationX } = nativeEvent;
                
                // Check if this is primarily a horizontal swipe - let parent handle it
                if (Math.abs(translationX) > Math.abs(translationY) && Math.abs(translationX) > 50) {
                  return;
                }
                
                // Handle vertical swipe
                if (translationY > 120 || velocityY > 800) {
                  animateDownAndContinue();
                } else {
                  Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
                }
              }
            }}
            simultaneousHandlers={parentGestureRef}
          >
            <View style={styles.swipeDownArea} />
          </PanGestureHandler>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Galaxy starfield background */}
      <View style={StyleSheet.absoluteFill}>
        {stars.map((star, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: star.color,
              opacity: starOpacities[i],
              shadowColor: star.color,
              shadowOpacity: 0.8,
              shadowRadius: star.size * 1.5,
              elevation: 5,
            }}
          />
        ))}
      </View>
      
      {/* Wrap entire content including nav bar in animated view for page 4 (currentPage === 3) */}
      <Animated.View 
        style={[
          styles.content, 
          currentPage === 3 ? { transform: [{ translateY: slideY }] } : {}
        ]}
      >
        {Platform.OS === 'android' ? (
          <View style={styles.swipeContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.scrollView}
              nestedScrollEnabled={Platform.OS === 'android'}
              scrollEnabled={true}
            >
              {renderCompactPage()}
              {renderConcernsPage()}
              {renderSkinGoalsPage()}
              {renderDreamRoutinePage()}
            </ScrollView>
          </View>
        ) : (
          <PanGestureHandler ref={parentGestureRef} onHandlerStateChange={onSwipeGesture}>
            <View style={styles.swipeContainer}>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
                nestedScrollEnabled={true}
                scrollEnabled={true}
              >
                {renderCompactPage()}
                {renderConcernsPage()}
                {renderSkinGoalsPage()}
                {renderDreamRoutinePage()}
              </ScrollView>
            </View>
          </PanGestureHandler>
        )}
        
        {/* Blur overlay when locked - Never shown on Android */}
        {isLocked && Platform.OS !== 'android' && (
          <>
            <BlurView intensity={80} tint="dark" style={[StyleSheet.absoluteFill, { zIndex: 10 }]} pointerEvents="none" />
            <View style={styles.lockOverlayContent} pointerEvents="auto">
              <Text style={styles.lockTitle}>Unlock your personalized routine</Text>
              <TouchableOpacity 
  style={styles.unlockButton} 
  onPress={() => {
    triggerButtonHaptics();
    setShowUnlockScreen(true);
  }}
>
  <LinearGradient
    colors={['#0EA5E9', '#3B82F6', '#1D4ED8', '#1E40AF', '#1E3A8A']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.unlockButtonGradient}
  >
    <Animated.View 
      style={[
        styles.shimmerOverlay,
        {
          transform: [{
            translateX: shimmerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 300],
            })
          }]
        }
      ]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shimmerGradient}
      />
    </Animated.View>
    <Text style={styles.unlockButtonText}>Unlock</Text>
  </LinearGradient>
</TouchableOpacity>
            </View>
          </>
        )}
        
        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNavBar}>
          {/* Progress Indicator */}
          <ProgressIndicator currentPage={currentPage} totalPages={totalPages} />
          
          {/* Continue Button - only show on last page (4th screen - Skincare Routine) and when unlocked */}
          {currentPage === 3 && !isLocked && (
            <TouchableOpacity 
              style={styles.navBarContinueButton} 
              onPress={() => animateDownAndContinue()}
            >
              <Text style={styles.navBarContinueText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
      
      {/* Product Details Modal */}
      <ProductDetailsModal
        visible={modalVisible}
        product={selectedProduct}
        onClose={handleCloseModal}
      />
      
      {/* Unlock Screen Modal */}
      {showUnlockScreen && (
        <UnlockScreen
          appUserID={auth().currentUser?.uid}
          onUnlock={() => {
            setShowUnlockScreen(false);
            // Only set isLocked to false on iOS. Android is always unlocked.
            if (Platform.OS !== 'android') {
              setIsLocked(false);
            }
          }}
          onRestore={() => {
            // The UnlockScreen handles restore internally
            // This callback is for parent component awareness
            console.log('User initiated restore purchase from UnlockScreen');
          }}
          onTerms={() => {
            // Open Terms of Service
            Linking.openURL('https://dermaiweb.web.app/terms.html').catch(err => 
              console.error('Failed to open Terms URL:', err)
            );
          }}
          onPrivacy={() => {
            // Open Privacy Policy
            Linking.openURL('https://dermaiweb.web.app/privacy.html').catch(err => 
              console.error('Failed to open Privacy URL:', err)
            );
          }}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeContainer: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    // Android fix for nested ScrollViews
    ...(Platform.OS === 'android' && {
      height: '100%',
    }),
  },
  card: {
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    borderRadius: 30,
    padding: 30,
    width: width * 0.9,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  artisticCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 35,
    width: width * 0.95,
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  imageContainer: {
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainScores: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 50,
  },
  metricsContainer: {
    width: '100%',
    marginBottom: 30,
  },
  barMetricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  barLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    width: 100,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginHorizontal: 15,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  barValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'right',
  },
  skinTypeSection: {
    alignItems: 'center',
    marginBottom: 35,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 1,
  },
  warningTitle: {
    color: '#FF6B6B',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
    textShadowColor: 'rgba(239, 68, 68, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  skinTypeValue: {
    color: '#8B5CF6',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  concernsSection: {
    width: '100%',
    marginBottom: 30,
  },
  concernsCard: {
    width: '120%',
    marginBottom: 50,
    borderRadius: 25,
    padding: 30,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    // Remove outer container shadow on Android
    shadowColor: Platform.OS === 'android' ? 'transparent' : '#EF4444',
    shadowOffset: {
      width: 0,
      height: Platform.OS === 'android' ? 0 : 15,
    },
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.6,
    shadowRadius: Platform.OS === 'android' ? 0 : 25,
    elevation: Platform.OS === 'android' ? 0 : 20,
  },
  concernsList: {
    width: '100%',
  },
  concernItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    // Remove shadows on Android
    shadowColor: Platform.OS === 'android' ? 'transparent' : '#EF4444',
    shadowOffset: {
      width: 0,
      height: Platform.OS === 'android' ? 0 : 4,
    },
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.3,
    shadowRadius: Platform.OS === 'android' ? 0 : 8,
    elevation: Platform.OS === 'android' ? 0 : 6,
  },
  concernNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    // Remove shadows on Android
    shadowColor: Platform.OS === 'android' ? 'transparent' : '#EF4444',
    shadowOffset: {
      width: 0,
      height: Platform.OS === 'android' ? 0 : 2,
    },
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.5,
    shadowRadius: Platform.OS === 'android' ? 0 : 4,
    elevation: Platform.OS === 'android' ? 0 : 4,
  },
  concernNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  concernName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
    textTransform: 'capitalize',
  },
  severityIndicator: {
    width: 60,
    height: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  severityBar: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  noConcernsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  brandText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 2,
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 40, // Account for home indicator
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#8B5CF6',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  routineScrollContainer: {
    flex: 1,
  },
  routineScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dreamSkinHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  dreamSkinTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  dreamSkinSubtitle: {
    color: '#8B5CF6',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  skinTypeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  routineToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 3,
    marginBottom: 20,
  },
  routineToggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 17,
  },
  routineToggleButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  routineToggleText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  routineToggleTextActive: {
    color: '#FFFFFF',
  },
  miniRoutineCard: {
    backgroundColor: 'rgba(40, 40, 50, 0.98)',
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  miniCardContent: {
    padding: 24,
  },
  miniStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  miniStepNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  miniStepNumberPrimary: {
    backgroundColor: '#8B5CF6',
  },
  miniStepNumberSecondary: {
    backgroundColor: '#EC4899',
  },
  miniStepNumberText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  miniStepInfo: {
    flex: 1,
  },
  miniStepName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  miniStepCategory: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  miniStepPurpose: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  miniProductTypeContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  miniProductTypeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  miniProductType: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  miniCardAccent: {
    height: 4,
    width: '100%',
  },
  miniAccentPrimary: {
    backgroundColor: '#8B5CF6',
  },
  miniAccentSecondary: {
    backgroundColor: '#EC4899',
  },
  tryAgainButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tryAgainText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  navBarContinueButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  navBarContinueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  
  // Loading container for skincare routine
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  
  // Full Skincare Routine Styles
  fullRoutineHeader: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 30 : 20, // Move down on Android
    paddingBottom: 24,
    alignItems: 'center',
  },
  fullRoutineTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  fullRoutineSubtitle: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  fullRoutineDescription: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
  },
  fullPeriodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 20,
    gap: 12,
  },
  fullPeriodButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#2A2A2C',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  fullPeriodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  fullPeriodButtonText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '600',
  },
  fullPeriodButtonTextActive: {
    color: '#FFFFFF',
  },
  fullStepsContainer: {
    flex: Platform.OS === 'android' ? 0 : 1, // Don't use flex on Android
    width: '100%',
    // Android-specific fix for scrolling
    ...(Platform.OS === 'android' && {
      height: '100%',
      flexGrow: 1, // Use flexGrow instead of flex on Android
    }),
  },
  fullStepsContentContainer: {
    paddingBottom: Platform.OS === 'android' ? 100 : 20, // Extra padding on Android for better scrolling
  },
  fullStepCard: {
    marginHorizontal: 0,
    marginBottom: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fullStepContent: {
    padding: 20,
  },
  fullStepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  fullStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fullStepNumberPrimary: {
    backgroundColor: '#007AFF',
  },
  fullStepNumberSecondary: {
    backgroundColor: '#34C759',
  },
  fullStepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullStepTitleContainer: {
    flex: 1,
  },
  fullStepTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop:5
  },
  fullStepPurpose: {
    color: '#999999',
    fontSize: 14,
    lineHeight: 18,
  },
  fullImportanceContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  fullImportanceText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fullProductSection: {
    gap: 16,
  },
  fullProductInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  fullProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#333333',
  },
  fullProductDetails: {
    flex: 1,
  },
  fullProductName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fullProductType: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 8,
  },
  fullWhyEffective: {
    color: '#34C759',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  fullInstructionsContainer: {
    backgroundColor: '#2A2A2C',
    padding: 16,
    borderRadius: 12,
  },
  fullInstructionsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  fullInstructionsText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  fullPurchaseButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fullPurchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fullBottomPadding: {
    height: 120,
  },
  
  // Lock overlay styles
  lockOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlayContent: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 999,
  },
  lockTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  unlockButton: {
    borderRadius: 25,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  unlockButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -50,
    right: -50,
    bottom: 0,
    borderRadius: 25,
    overflow: 'hidden',
  },
  shimmerGradient: {
    width: 60,
    height: '100%',
    transform: [{ skewX: '-20deg' }],
    opacity: 0.7,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    zIndex: 1,
  },
  
  // Swipe-down gesture area
  swipeDownArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150, // Only bottom 150px can trigger swipe-down
    backgroundColor: 'transparent',
  },
  
  // Perfect Skin Image Styles
  perfectSkinSection: {
    marginTop: 30,
    width: '100%',
  },
  perfectSkinCard: {
    width: '120%',
    marginBottom: 50,
    borderRadius: 25,
    padding: 30,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    shadowColor: '#22C55E',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.4,
    shadowRadius: Platform.OS === 'android' ? 0 : 20,
    elevation: Platform.OS === 'android' ? 0 : 15,
  },
  perfectSkinTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'rgba(0, 255, 200, 0.9)',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  perfectSkinSubtitle: {
    fontSize: 16,
    color: '#A8E6CF',
    textAlign: 'center',
    marginBottom: 25,
    fontWeight: '600',
  },
  perfectSkinImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    elevation: 10,
  },
  perfectSkinImageContainerLarge: {
    width: '92%',
    flex: 1, // Take up remaining space after title
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 0,
    shadowColor: 'rgba(0, 200, 255, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  perfectSkinImage: {
    width: '100%',
    height: '100%',
  },
  perfectSkinImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  perfectSkinImageCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  perfectSkinMotivation: {
    fontSize: 16,
    color: '#E0F7FA',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  skinGoalsProgress: {
    width: '100%',
    paddingHorizontal: 20,
  },
  progressItem: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#A8E6CF',
    fontWeight: '500',
  },

  // Clean Futuristic HUD Border Styles
  hudBorderContainer: {
    position: 'relative',
    width: '110%',
    height: '85%', // Make shorter so it doesn't get cut off by navbar
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 200, 255, 0.6)',
    shadowColor: 'rgba(0, 200, 255, 0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    overflow: 'hidden',
    elevation: Platform.OS === 'android' ? 10 : 0,
    alignSelf: 'center',
  },
  perfectSkinCardClean: {
    width: '100%',
    height: '100%',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pokemon Card Styles
  pokemonCard: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 8,
    width: width * 0.90,
    height: height * 0.81,
    alignItems: 'center',
    marginTop: -80,
    shadowColor: 'rgba(255, 215, 0, 0.8)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  
  holographicBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    padding: 3,
  },
  
  pokemonCardInner: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    padding: 15,
    position: 'relative',
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  pokemonName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  
  hpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  
  hpLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  
  hpValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  
  typeBadge: {
    alignSelf: 'center',
    marginBottom: 15,
  },
  
  typeBadgeGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  
  typeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  
  pokemonImageFrame: {
    width: '100%',
    height: 350,
    marginBottom: 20,
    marginTop: 10,
  },
  
  imageFrameBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    padding: 4,
  },
  
  imageInnerFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  
  pokemonImage: {
    width: '100%',
    height: '100%',
  },
  
  holographicShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 11,
  },
  
  statsSection: {
    width: '100%',
    marginBottom: 15,
  },
  
  abilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  abilityBox: {
    width: '100%',
  },
  
  abilityBackground: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  
  abilityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  abilityDescription: {
    fontSize: 12,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 16,
  },
  
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  
  rarity: {
    alignItems: 'center',
  },
  
  rarityStars: {
    fontSize: 16,
    marginBottom: 4,
  },
  
  rarityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 1,
  },
  
  cardNumber: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '600',
  },

  // Gold Gradient Text Style
  goldGradientText: {
    borderRadius: 5,
    paddingHorizontal: 2,
  },


  // Umax-style Image Display
  umaxContainer: {
    width: width,
    height: height,
    backgroundColor: '#000000',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 180 : 120,
  },

  textContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: -40
  },

  umaxImageContainer: {
    width: width * 0.9,
    height: height * 0.55,
    borderRadius: 20,
    overflow: 'hidden',
  },

  umaxImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },

  cursiveText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },

  gradientTextContainer: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 0,
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});