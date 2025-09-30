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
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';

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

interface TrendingProductsModalProps {
  isVisible: boolean;
  products: Product[];
  onClose: () => void;
  onProductPress: (product: Product) => void;
}

export default function TrendingProductsModal({
  isVisible,
  products,
  onClose,
  onProductPress,
}: TrendingProductsModalProps) {
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

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onProductPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: item.productImage }}
          style={styles.productImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.productName}
        </Text>
        <Text style={styles.brandName} numberOfLines={1}>
          {item.brand}
        </Text>
        
        <View style={styles.productFooter}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}/100</Text>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
          </View>
        </View>
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
          <Text style={styles.headerTitle}>Trending Products</Text>
          <View style={styles.headerActions}>
            
          </View>
        </View>

        <View style={styles.content}>
          {/* Subtitle */}
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>
              Affordable skincare hot on the market
            </Text>
            <Text style={styles.productCount}>
              {products.length} products
            </Text>
          </View>

          {/* Products Grid */}
          <FlatList
            data={products}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.productsContainer}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
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
    zIndex: 1000,
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
    paddingTop: 0,
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
  subtitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  productCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  productsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  row: {
    justifyContent: 'space-between',
  },
  separator: {
    height: 20,
  },
  productCard: {
    flex: 1,
    backgroundColor: 'rgba(74, 85, 104, 0.15)',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 5,
  },
  productImageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 18,
  },
  brandName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 11,
    color: '#FFD700',
    marginLeft: 3,
    fontWeight: '600',
  },
  priceContainer: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});