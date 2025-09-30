import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, ScrollView, Animated, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { triggerButtonHaptics } from '../services/haptics';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { getUserSubscriptionData, UserSubscriptionData } from '../services/firestoreService';
import type { PurchasesPackage } from 'react-native-purchases';

const { width, height } = Dimensions.get('window');

interface UnlockScreenProps {
  onUnlock: () => void;
  onRestore?: () => void;
  onTerms?: () => void;
  onPrivacy?: () => void;
  appUserID?: string; // Optional: pass the auth user ID if available
}



export default function UnlockScreen({ onUnlock, onRestore, onTerms, onPrivacy, appUserID }: UnlockScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionData | null>(null);
  
  // RevenueCat integration
  const { 
    initialized, 
    isPro, 
    availablePackages, 
    loading: purchaseLoading, 
    error: purchaseError, 
    purchase, 
    restore 
  } = useRevenueCat(appUserID);
  
  // Get the first available package (usually weekly subscription)
  const primaryPackage = availablePackages[0];
  
  // Galaxy starfield background (same as LoadingScreen)
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
  
  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Star twinkling animation
    stars.forEach((star, i) => {
      const startDelay = Math.random() * 2000;
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(starOpacities[i], { 
              toValue: star.brightness * 0.2, 
              duration: star.twinkleSpeed, 
              useNativeDriver: true 
            }),
            Animated.timing(starOpacities[i], { 
              toValue: star.brightness * 1.0, 
              duration: star.twinkleSpeed, 
              useNativeDriver: true 
            }),
          ])
        ).start();
      }, startDelay);
    });
  }, []);

  // Fetch subscription data to check if user has ever paid
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const subData = await getUserSubscriptionData();
        setSubscriptionData(subData);
        console.log('UnlockScreen: Subscription data fetched:', subData);
      } catch (error) {
        console.error('UnlockScreen: Error fetching subscription data:', error);
      }
    };

    fetchSubscriptionData();
  }, []);

  // Close the screen if user is already pro
  useEffect(() => {
    if (initialized && isPro) {
      onUnlock(); // Close the unlock screen
    }
  }, [initialized, isPro, onUnlock]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentPage(currentIndex);
  };

  const cardTitles = [
    "Personalized  Products", 
    "Get your ratings",
    "Track Daily Progress",
    "Feeling Unmotivated?"
  ];

  // Determine button text based on subscription history
  const getButtonText = () => {
    if (purchaseLoading) {
      return <ActivityIndicator color="#FFFFFF" />;
    }
    
    const hasEverPaid = subscriptionData?.hasEverPaid === true;
    const price = primaryPackage?.product.priceString || '$3.99';
    const buttonText = hasEverPaid ? `Get Started For ${price}` : 'Start For Free✨';
    
    console.log('UnlockScreen: Button text logic:', {
      hasEverPaid,
      price,
      buttonText,
      subscriptionData: subscriptionData ? 'loaded' : 'null'
    });
    
    return (
      <Text style={styles.unlockButtonText}>
        {buttonText}
      </Text>
    );
  };

  // Handle unlock button - triggers purchase
  const handleUnlock = async () => {
    triggerButtonHaptics();
    //take out soon123
    // // TESTING BYPASS - Go directly to results screen
    // // console.log('TESTING MODE: Bypassing RevenueCat payment and going to results');
    // // onUnlock(); // Directly call onUnlock to navigate to results
    // return;
    
    // Original purchase logic (commented out for testing)
  
    if (!primaryPackage) {
      Alert.alert(
        "No Packages Available",
        "Unable to load subscription packages. Please try again later.",
        [{ text: "OK" }]
      );
      return;
    }
    
    try {
      await purchase(primaryPackage);
      // If purchase successful, isPro will be updated and useEffect will close the screen
    } catch (error) {
      // Error is already handled in the hook
    }
 
  };

  // Handle restore purchases
  const handleRestore = async () => {
    triggerButtonHaptics();
    
    try {
      await restore();
      // If restore successful and user has entitlement, isPro will be updated
      if (!isPro) {
        Alert.alert(
          "No Purchases Found",
          "No previous purchases found to restore.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      // Error is already handled in the hook
    }
  };


  return (
    <View style={styles.fullScreenOverlay}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        {/* Starfield background */}
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
      
      <Animated.ScrollView 
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        
                  <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.mainTitle}>DREAM SKIN</Text>
            <Text style={styles.subtitle}>achieve your potential</Text>
            
            {/* Horizontal ScrollView for cards */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.cardsContainer}
          >
            {/* Card 1: Skincare */}
            <View style={styles.cardWrapper}>
              <View style={styles.card}>
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientTextContainer}
                >
                  <Text style={styles.personalizedProductsTitle}>Personalized Products</Text>
                </LinearGradient>
                <Image 
                  source={require('../../assets/skincare.jpg')}
                  style={styles.cardImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
            </View>

            {/* Card 2: Ratings */}
            <View style={styles.cardWrapper}>
              <View style={styles.card}>
                <LinearGradient
                  colors={['#1F2937', '#374151', '#6B7280']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientTextContainer}
                >
                  <Text style={styles.ratingsCardTitle}>Get your ratings</Text>
                </LinearGradient>
                <Image 
                  source={require('../../assets/ratings.jpg')}
                  style={styles.cardImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
            </View>

            {/* Card 3: Dashboard */}
            <View style={styles.cardWrapper}>
              <View style={styles.card}>
                <LinearGradient
                  colors={['#06B6D4', '#3B82F6', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientTextContainer}
                >
                  <Text style={styles.trackProgressTitle}>Track Daily Progress</Text>
                </LinearGradient>
                <Image 
                  source={require('../../assets/dashboard.jpg')}
                  style={styles.cardImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
            </View>

            {/* Card 4: Coach */}
            <View style={styles.cardWrapper}>
              <View style={styles.card}>
                <LinearGradient
                  colors={['#F59E0B', '#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.gradientTextContainer, { marginTop: 10 }]}
                >
                  <Text style={styles.unmotivatedTitle}>Feeling Unmotivated?</Text>
                </LinearGradient>
                <Image 
                  source={require('../../assets/coach.jpg')}
                  style={styles.cardImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
            </View>
          </ScrollView>
          
          {/* Page dots */}
          <View style={styles.pageDots}>
            {[0, 1, 2, 3].map((index) => (
              <View 
                key={index}
                style={[styles.dot, currentPage === index && styles.activeDot]} 
              />
            ))}
          </View>
          
          
          {/* Error message */}
          {purchaseError && (
            <Text style={styles.errorText}>{purchaseError}</Text>
          )}
          
          <TouchableOpacity 
            style={[styles.unlockButton, (purchaseLoading || !initialized) && styles.disabledButton]} 
            onPress={handleUnlock}
            activeOpacity={0.8}
            disabled={purchaseLoading || !initialized}
          >
            {getButtonText()}
          </TouchableOpacity>
          
          <Text style={styles.priceText}>
            {!initialized ? 'Loading...' : 
             primaryPackage ? `3 day free trial, then ${primaryPackage.product.priceString} per week` : 
             '3 day free trial, then $3.99 per week'}
          </Text>
          
          <View style={styles.footer}>
            <TouchableOpacity onPress={onTerms}>
              <Text style={styles.footerLink}>Terms of Use</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.footerLink}>Restore Purchase</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onPrivacy}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 30, // Moved everything higher up
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
    fontStyle: 'italic',
    marginTop: Platform.OS === 'android' ? 40 : 0,
  },
  subtitle: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: -20, // Reduced from 50 to move card higher
  },
  cardsContainer: {
    marginBottom: 0,
    height: (width - 40) * 1.3, // Expanded height for taller cards
  },
  cardWrapper: {
    width: width,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(18, 18, 18, 0.8)', // Slightly transparent dark card
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    width: width - 40,
    height: (width - 40) * 1.2, // Expanded height for taller cards
    justifyContent: 'center',
    marginBottom: -50,
  },
  cardTitle: {
    marginTop: 0,
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 0,
    paddingHorizontal: 20,
    minHeight: 60, // Fixed height to prevent layout shift when text changes
  },
  ratingsCardTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontStyle: 'italic',
  },
  gradientTextContainer: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: -10,
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  personalizedProductsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontStyle: 'italic',
  },
  trackProgressTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontStyle: 'italic',
  },
  unmotivatedTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontStyle: 'italic',
  },
  cardImage: {
    width: width -80,
    height: (width - 80) * 1.07, // Adjusted aspect ratio for better fit
    marginTop: 30, // Move image down within the card
  },
  pageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
    marginHorizontal: 5,
    opacity: 0.5,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    opacity: 1,
  },
  scansText: {
    color: '#666666',
    fontSize: 16,
    marginBottom: 40,
  },
  unlockButton: {
    backgroundColor: '#5865F2',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginBottom: 16,
    shadowColor: '#5865F2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceText: {
    color: '#999999',
    fontSize: 16,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: Platform.OS === 'android' ? 20 : 0,
  },
  footerLink: {
    color: '#666666',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  debugContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  debugHeader: {
    marginBottom: 12,
  },
  debugTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugText: {
    color: '#CCCCCC',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  debugWarning: {
    color: '#FFB84D',
    fontWeight: '600',
    marginTop: 8,
  },
});