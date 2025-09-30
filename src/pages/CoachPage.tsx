import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Animated, Dimensions, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { UserSkinData, SkincareRoutine, UserRatings } from '../services/firestoreService';
import { HistoricalProgressData } from '../services/historicalProgressService';
import SkincareCoachUI from '../coaches/SkincareCoachUI';
import ClearSkinCoachUI from '../coaches/ClearSkinCoachUI';
import SkinHealthCoachUI from '../coaches/SkinHealthCoachUI';
import PimpleHelpCoachUI from '../coaches/PimpleHelpCoachUI';
import ProductRecommendationsCoachUI from '../coaches/ProductRecommendationsCoachUI';

interface CoachPageProps {
  userData: UserSkinData | null;
  userRatings: UserRatings | null;
  amRoutine: SkincareRoutine | null;
  pmRoutine: SkincareRoutine | null;
  historicalProgress: HistoricalProgressData;
}

const { height } = Dimensions.get('window');
const DISMISS_THRESHOLD = height * 0.25;
const MAX_PULL_UP = -40;

type CoachType = 'general' | 'clear_skin' | 'skin_health' | 'pimple_help' | 'product_recommendations';

export default function CoachPage({ userData, userRatings, amRoutine, pmRoutine, historicalProgress }: CoachPageProps) {
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [currentCoach, setCurrentCoach] = useState<CoachType>('general');
  const slideY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animated close function with slide transition (like ProductDetailsModal)
  const handleAnimatedClose = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setShowChatInterface(false);
    });
  }, [slideY, backdropOpacity]);

  // Simple pan responder for header area only (like ProductDetailsModal)
  const headerPanResponder = useRef(
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
          handleAnimatedClose();
        } else {
          // bounce back
          Animated.parallel([
            Animated.spring(slideY, {
              toValue: 0,
              speed: 14,
              bounciness: 8,
              useNativeDriver: true,
            }),
            Animated.spring(backdropOpacity, {
              toValue: 1,
              speed: 14,
              bounciness: 8,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated, bounce back
        Animated.parallel([
          Animated.spring(slideY, {
            toValue: 0,
            speed: 14,
            bounciness: 8,
            useNativeDriver: true,
          }),
          Animated.spring(backdropOpacity, {
            toValue: 1,
            speed: 14,
            bounciness: 8,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

  // Animate in when visible - Platform-specific opening animation (like ProductDetailsModal)
  useEffect(() => {
    if (showChatInterface) {
      slideY.setValue(height);
      backdropOpacity.setValue(0);
      
      if (Platform.OS === 'android') {
        // Android: Simple pop-up animation (no slide)
        slideY.setValue(0); // Immediately set to final position
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200, // Faster fade-in for pop effect
          useNativeDriver: true,
        }).start();
      } else {
        // iOS: Keep original slide-up animation
        Animated.parallel([
          Animated.timing(slideY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      // Reset values when not visible
      slideY.setValue(height);
      backdropOpacity.setValue(0);
    }
  }, [showChatInterface, slideY, backdropOpacity]);

  const openChat = (coachType: CoachType = 'general') => {
    setCurrentCoach(coachType);
    setShowChatInterface(true);
  };

  const closeChat = () => {
    handleAnimatedClose();
  };

  const renderCoachUI = () => {
    const commonProps = {
      userData,
      userRatings,
      amRoutine,
      pmRoutine,
      historicalProgress,
      onBack: closeChat,
      onHeaderPress: closeChat,
      panHandlers: headerPanResponder.panHandlers,
    };

    switch (currentCoach) {
      case 'clear_skin':
        return <ClearSkinCoachUI {...commonProps} />;
      case 'skin_health':
        return <SkinHealthCoachUI {...commonProps} />;
      case 'pimple_help':
        return <PimpleHelpCoachUI {...commonProps} />;
      case 'product_recommendations':
        return <ProductRecommendationsCoachUI {...commonProps} />;
      case 'general':
      default:
        return <SkincareCoachUI {...commonProps} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Categories Screen */}
      <ScrollView style={styles.mainScrollView} contentContainerStyle={styles.mainContent}>
        {/* Header */}
        <Text style={styles.mainTitle}>Perfect Your Skin...</Text>
        
        {/* Ask me anything - Main interactive card */}
        <TouchableOpacity 
          style={styles.mainCard}
          onPress={() => openChat()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>💬</Text>
              </View>
              <Text style={styles.cardTitle}>Ask me anything</Text>
              <Feather name="chevron-right" size={24} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Category Cards - All Black */}
        <TouchableOpacity 
          style={styles.categoryCard} 
          activeOpacity={0.8}
          onPress={() => openChat('clear_skin')}
        >
          <View style={styles.blackCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>✨</Text>
              </View>
              <Text style={styles.cardTitle}>Get clearer skin</Text>
              <Feather name="chevron-right" size={24} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.categoryCard} 
          activeOpacity={0.8}
          onPress={() => openChat('skin_health')}
        >
          <View style={styles.blackCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>💪</Text>
              </View>
              <Text style={styles.cardTitle}>Improve your overall skin health</Text>
              <Feather name="chevron-right" size={24} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.categoryCard} 
          activeOpacity={0.8}
          onPress={() => openChat('pimple_help')}
        >
          <View style={styles.blackCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>🔴</Text>
              </View>
              <Text style={styles.cardTitle}>Help! I have a pimple</Text>
              <Feather name="chevron-right" size={24} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.categoryCard} 
          activeOpacity={0.8}
          onPress={() => openChat('product_recommendations')}
        >
          <View style={styles.blackCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>🧴</Text>
              </View>
              <Text style={styles.cardTitle}>Product recommendations</Text>
              <Feather name="chevron-right" size={24} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal with ProductDetailsModal-style animation */}
      {showChatInterface && (
        <View style={styles.overlay}>
          {/* Background Touchable */}
          <TouchableOpacity 
            style={styles.backgroundTouchable}
            onPress={closeChat}
            activeOpacity={1}
          />
          
          {/* Modal Container */}
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: slideY }],
                opacity: backdropOpacity,
              }
            ]}
          >

            {/* Close Button - Positioned over content */}
            <TouchableOpacity style={styles.closeButton} onPress={closeChat}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            {/* Coach UI Content - Full Screen */}
            {renderCoachUI()}
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainScrollView: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 120,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 30,
    marginTop: 20,
  },
  mainCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  blackCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardGradient: {
    borderRadius: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    minHeight: 90,
  },
  cardIcon: {
    marginRight: 16,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // ProductDetailsModal-style overlay and modal
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  backgroundTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: height * 0.9,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});