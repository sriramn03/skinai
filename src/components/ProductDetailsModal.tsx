import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Linking,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { SkincareStep } from '../services/firestoreService';

const { width, height } = Dimensions.get('window');
const DISMISS_THRESHOLD = height * 0.25; // how far you must swipe to close
const MAX_PULL_UP = -40; // allow a tiny pull up for bounce

interface ProductDetailsModalProps {
  visible: boolean;
  product: SkincareStep | null;
  onClose: () => void;
}

export default function ProductDetailsModal({ visible, product, onClose }: ProductDetailsModalProps) {
  const slideY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animated close function with slide transition
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
      if (finished) onClose();
    });
  }, [slideY, backdropOpacity, onClose]);

  // Pan responder for swipe-down-to-close (header area only)
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

  // Animate in when visible - Platform-specific opening animation
  React.useEffect(() => {
    if (visible) {
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
  }, [visible, slideY, backdropOpacity]);

  const handleProductPurchase = async () => {
    if (product?.amazonUrl) {
      try {
        const supported = await Linking.canOpenURL(product.amazonUrl);
        if (supported) {
          await Linking.openURL(product.amazonUrl);
        } else {
          console.error('Cannot open Amazon URL:', product.amazonUrl);
        }
      } catch (error) {
        console.error('Error opening Amazon URL:', error);
      }
    }
  };

  if (!product) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      {...(Platform.OS === 'android' && { statusBarTranslucent: true })}
      onRequestClose={handleAnimatedClose}
    >
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <TouchableOpacity 
          style={styles.backgroundTouchable} 
          activeOpacity={1} 
          onPress={handleAnimatedClose}
        />
      </Animated.View>
      
      <Animated.View 
        style={[styles.modalContainer, { transform: [{ translateY: slideY }] }]}
      >
          {/* Header with pan gesture */}
          <View style={styles.header} {...headerPanResponder.panHandlers}>
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{product.name}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleAnimatedClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            bounces={true}
            scrollEventThrottle={16}
          >
            {/* Card 1: Instructions and Image */}
            <View style={[styles.card, styles.instructionsCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>How to Use</Text>
                <Text style={styles.starRating}>⭐</Text>
              </View>
              
              <View style={styles.instructionsContent}>
                {product.productImage && (
                  <View style={styles.instructionsImageContainer}>
                    <Image 
                      source={{ uri: product.productImage }} 
                      style={styles.instructionsImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
                
                <View style={styles.instructionsTextContainer}>
                  <Text style={styles.instructionsSubtitle}>
                    The easiest way to use your {product.productType.toLowerCase()} is to:
                  </Text>
                  
                  <View style={styles.instructionsList}>
                    {product.howTo.split(/[.\n]/).filter(step => step.trim()).map((step, index) => {
                      const cleanStep = step.trim().replace(/^\d+\.\s*/, '');
                      if (!cleanStep) return null;
                      
                      return (
                        <View key={index} style={styles.instructionStep}>
                          <Text style={styles.stepNumber}>{index + 1}.</Text>
                          <Text style={styles.stepText}>{cleanStep}</Text>
                        </View>
                      );
                    }).filter(Boolean)}
                  </View>
                </View>
              </View>
            </View>

            {/* Card 2: Effectiveness */}
            <View style={[styles.card, styles.effectivenessCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Why It's Effective</Text>
                <Text style={styles.starRating}>⭐⭐</Text>
              </View>
              
              <Text style={styles.effectivenessSubtitle}>
                To take your {product.category} to the next level:
              </Text>
              
              <View style={styles.effectivenessContent}>
                <View style={styles.effectivenessPoint}>
                  <Text style={styles.pointNumber}>1.</Text>
                  <Text style={styles.pointText}>
                    {product.purpose} - this targeted approach helps improve your skin's {product.category.toLowerCase()}.
                  </Text>
                </View>
                
                {product.whyEffective && (
                  <View style={styles.effectivenessPoint}>
                    <Text style={styles.pointNumber}>2.</Text>
                    <Text style={styles.pointText}>{product.whyEffective}</Text>
                  </View>
                )}
                
                {product.rateOfImportance && (
                  <View style={styles.importanceContainer}>
                    <Text style={styles.importanceLabel}>Importance Rating:</Text>
                    <Text style={styles.importanceValue}>⭐ {product.rateOfImportance}/5</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Card 3: Product Details with Purchase Link */}
            <TouchableOpacity 
              style={[styles.card, styles.productCard]} 
              onPress={handleProductPurchase}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Product for You</Text>
                <Text style={styles.starRating}>⭐⭐⭐</Text>
              </View>
              
              <View style={styles.productContent}>
                {product.productImage && (
                  <View style={styles.productImageContainer}>
                    <Image 
                      source={{ uri: product.productImage }} 
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
                
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>
                    {product.productName || product.productType}
                  </Text>
                  <Text style={styles.productType}>{product.productType}</Text>
                  <Text style={styles.productCategory}>{product.category}</Text>
                  
                  {product.amazonUrl && (
                    <View style={styles.purchaseIndicator}>
                      <Text style={styles.purchaseText}>🛒 Tap to buy on Amazon</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.cardAccent} />
            </TouchableOpacity>

            {/* Bottom Padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: 'rgba(40, 40, 50, 0.98)',
    borderRadius: 20,
    marginVertical: 12,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  instructionsCard: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  effectivenessCard: {
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  productCard: {
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  starRating: {
    fontSize: 16,
  },
  instructionsContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  instructionsImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionsImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  instructionsTextContainer: {
    flex: 1,
  },
  instructionsSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 22,
  },
  instructionsList: {
    gap: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    minWidth: 24,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  effectivenessContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  effectivenessSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  effectivenessPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pointNumber: {
    color: '#FFA500',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    minWidth: 24,
  },
  pointText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  importanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  importanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  importanceValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  productImageContainer: {
    marginRight: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 24,
  },
  productType: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  productCategory: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  purchaseIndicator: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  purchaseText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardAccent: {
    height: 4,
    backgroundColor: '#8B5CF6',
  },
  bottomPadding: {
    height: 40,
  },
}); 