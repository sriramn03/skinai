import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
  Linking,
  StatusBar,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { addProductToRoutine } from '../services/firestoreService';

const { width, height } = Dimensions.get('window');

interface Product {
  id: string;
  productName: string;
  brand: string;
  rating: number;
  price: number;
  productImage: string;
  amazonUrl: string;
  category: string;
  overview?: string;
  howTo?: string;
  ingredients?: string;
}

interface ProductDetailModalProps {
  isVisible: boolean;
  product: Product;
  onClose: () => void;
  onRoutineUpdated?: () => void;
}

export default function ProductDetailModal({
  isVisible,
  product,
  onClose,
  onRoutineUpdated,
}: ProductDetailModalProps) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const [isAddingToRoutine, setIsAddingToRoutine] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Slide in animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: width,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, backgroundOpacity]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 100;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx > 0) {
        slideAnim.setValue(gestureState.dx);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > width * 0.3) {
        handleClose();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const handleClose = () => {
    // Animate slide out to the right
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleBuyNow = async () => {
    try {
      const supported = await Linking.canOpenURL(product.amazonUrl);
      if (supported) {
        await Linking.openURL(product.amazonUrl);
      } else {
        console.error("Don't know how to open URI: " + product.amazonUrl);
      }
    } catch (error) {
      console.error('Error opening Amazon URL:', error);
    }
  };

  const handleAddToRoutine = async () => {
    if (isAddingToRoutine) return;

    Alert.alert(
      'Add to Routine',
      'Which routine would you like to add this product to?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'AM Routine',
          onPress: () => addToRoutine('AM'),
        },
        {
          text: 'PM Routine',
          onPress: () => addToRoutine('PM'),
        },
      ]
    );
  };

  const addToRoutine = async (period: 'AM' | 'PM') => {
    try {
      setIsAddingToRoutine(true);
      
      await addProductToRoutine(period, {
        productName: product.productName,
        brand: product.brand,
        category: product.category,
        productImage: product.productImage,
        amazonUrl: product.amazonUrl,
        howTo: product.howTo,
        overview: product.overview,
        price: product.price,
        rating: product.rating,
      });
      
      Alert.alert(
        'Success!',
        `${product.productName} has been added to your ${period} routine.`,
        [{ text: 'OK', onPress: () => {
          // Call routine updated callback to refresh the routine data
          if (onRoutineUpdated) {
            onRoutineUpdated();
          }
          handleClose();
        } }]
      );
    } catch (error) {
      console.error('Error adding product to routine:', error);
      Alert.alert(
        'Error',
        'Failed to add product to routine. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAddingToRoutine(false);
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />
      
      {/* Background overlay */}
      <Animated.View
        style={[
          styles.background,
          { opacity: backgroundOpacity },
        ]}
      >
        <TouchableOpacity
          style={styles.backgroundTouch}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Modal content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.headerActions}>
            
            
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Main Product Card */}
          <View style={styles.mainCard}>
            {/* Product Image Subcard */}
            <View style={styles.imageSubcard}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: product.productImage }}
                  style={styles.productImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  priority="high"
                />
              </View>
            </View>

            {/* Rating Badge */}
            <View style={styles.ratingContainer}>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{product.rating}/100 (Excellent)</Text>
              </View>
            </View>

            {/* Product Info */}
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.productName}</Text>
              <Text style={styles.brandName}>{product.brand}</Text>
            </View>
          </View>

          {/* Shop Online Card */}
          <View style={styles.shopCard}>
            <Text style={styles.sectionTitle}>Shop Online</Text>
            <TouchableOpacity style={styles.shopButton} onPress={handleBuyNow}>
              <View style={styles.shopInfo}>
                <View style={styles.amazonIcon}>
                  <Image
                    source={require('../../assets/amazon.png')}
                    style={styles.amazonLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    priority="high"
                    placeholder={{ blurhash: 'L00000fQfQfQfQfQfQfQfQfQfQ' }}
                    transition={0}
                  />
                </View>
                <Text style={styles.shopText}>Amazon</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>${product.price.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Add to Routine Button - Outside of any card */}
          <TouchableOpacity 
            style={[styles.addToRoutineButton, isAddingToRoutine && styles.addToRoutineButtonDisabled]} 
            onPress={handleAddToRoutine}
            disabled={isAddingToRoutine}
          >
            {isAddingToRoutine ? (
              <Ionicons name="hourglass" size={24} color="#FFFFFF" />
            ) : (
              <Ionicons name="add" size={24} color="#FFFFFF" />
            )}
            <Text style={styles.addToRoutineText}>
              {isAddingToRoutine ? 'Adding...' : 'Add to routine'}
            </Text>
          </TouchableOpacity>

          {/* Overview Card */}
          {product.overview && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.overviewText}>{product.overview}</Text>
            </View>
          )}

          {/* How To Card */}
          {product.howTo && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>How To Use</Text>
              <View style={styles.numberedList}>
                {product.howTo.split('\n').map((step, index) => (
                  step.trim() ? (
                    <View key={index} style={styles.numberedStep}>
                      <Text style={styles.stepNumber}>{index + 1}.</Text>
                      <Text style={styles.stepText}>{step.trim()}</Text>
                    </View>
                  ) : null
                ))}
              </View>
            </View>
          )}

          {/* Ingredients Card */}
          {product.ingredients && (
            <View style={[styles.infoCard, styles.ingredientsCard]}>
              <Text style={styles.sectionTitle}>Key Ingredients</Text>
              <Text style={styles.ingredientsText}>{product.ingredients}</Text>
            </View>
          )}

          {/* Bottom padding for safe area */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1100,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  backgroundTouch: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: width,
    height: height,
    backgroundColor: '#000000',
    paddingTop: -10, // Raised header higher
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainCard: {
    backgroundColor: 'rgba(74, 85, 104, 0.15)',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  imageSubcard: {
    width: '60%',
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    width: '80%',
    height: 200,
    alignSelf: 'center',
  },
  productImage: {
    width: 120,
    height: 120,
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  ratingBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  productInfo: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  shopCard: {
    backgroundColor: 'rgba(74, 85, 104, 0.15)',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 12,
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amazonIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    padding: 4,
  },
  amazonLogo: {
    width: 24,
    height: 24,
  },
  shopText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  priceContainer: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addToRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 15,
    borderRadius: 12,
    width:320,
    marginTop: 20,
    marginLeft: 40,
  },
  addToRoutineButtonDisabled: {
    backgroundColor: '#6B46C1',
    opacity: 0.7,
  },
  addToRoutineText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: 'rgba(74, 85, 104, 0.15)',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
  },
  overviewText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
  },
  howToText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
  },
  numberedList: {
    gap: 12,
  },
  numberedStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepNumber: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 24,
    marginTop: 2,
  },
  stepText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  ingredientsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
  },
  ingredientsCard: {
    marginBottom: 40,
  },
  bottomPadding: {
    height: 50,
  },
});