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
  StatusBar,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.45;

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

interface CategoryModalProps {
  isVisible: boolean;
  categoryName: string;
  products: Product[];
  onClose: () => void;
  onProductPress: (product: Product) => void;
}

export default function CategoryModal({
  isVisible,
  categoryName,
  products,
  onClose,
  onProductPress,
}: CategoryModalProps) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

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

  const handleBuyNow = async (product: Product) => {
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

  const renderProductCard = (product: Product) => (
    <TouchableOpacity 
      key={product.id} 
      style={styles.productCard}
      activeOpacity={0.9}
      onPress={() => onProductPress(product)}
    >
      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: product.productImage }}
          style={styles.productImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
        />
      </View>
      
      <View style={styles.productInfo}>
        {/* Rating Badge */}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>Rating: {product.rating}/100</Text>
        </View>
        
        {/* Brand */}
        <Text style={styles.productBrand}>{product.brand}</Text>
        
        {/* Product Name */}
        <Text style={styles.productName}>{product.productName}</Text>
        
        {/* Price Button */}
        <TouchableOpacity 
          style={styles.priceButton}
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation();
            handleBuyNow(product);
          }}
        >
          <Ionicons name="bag-outline" size={14} color="#FFFFFF" />
          <Text style={styles.priceText}>${product.price.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>{categoryName}</Text>
          <View style={styles.headerActions} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Category Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionText}>
              Discover the best {categoryName.toLowerCase()} products for your skincare routine.
            </Text>
          </View>

          {/* Products Grid */}
          <View style={styles.productsGrid}>
            {/* Create rows with 2 products each */}
            {products.reduce((rows: Product[][], product, index) => {
              if (index % 2 === 0) {
                rows.push([product]);
              } else {
                rows[rows.length - 1].push(product);
              }
              return rows;
            }, []).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.productRow}>
                {row.map(renderProductCard)}
              </View>
            ))}
          </View>

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
    zIndex: 1050, // Lower than ProductDetailModal (1100) but higher than base content
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
    paddingTop: -10,
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
    width: 34, // Match back button width for centering
  },
  content: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    paddingTop: 20,
  },
  descriptionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
    textAlign: 'center',
  },
  productsGrid: {
    paddingHorizontal: 20,
  },
  productRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  productImageContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    padding: 12,
    gap: 6,
  },
  ratingBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  productBrand: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 8,
  },
  priceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 50,
  },
});