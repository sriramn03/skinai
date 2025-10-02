import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Platform, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import exploreData from '../data/explore.json';
import cleansersData from '../data/cleansers.json';
import moisturizersData from '../data/moisturizers.json';
import serumsData from '../data/serums.json';
import exfoliatorsData from '../data/exfoliators.json';
import sunscreensData from '../data/sunscreens.json';
import darkskinData from '../data/darkskin.json';
import treatmentsData from '../data/treatments.json';
import allProductsData from '../data/allProducts.json';
import ProductDetailModal from '../components/ProductDetailModal';
import TrendingProductsModal from '../components/TrendingProductsModal';
import CategoryModal from '../components/CategoryModal';
import { imagePrefetchService } from '../services/imagePrefetchService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.45; // Card width for horizontal scroll

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

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface ExplorePageProps {
  onRoutineUpdated?: () => void;
}

export default function ExplorePage({ onRoutineUpdated }: ExplorePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [trendingModalVisible, setTrendingModalVisible] = useState(false);
  const [allTrendingProducts, setAllTrendingProducts] = useState<Product[]>([]);
  
  // Category modal state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  
  // Search state
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Dynamic data from explore.json - Initialize directly to prevent flickering
  const [trendingProducts] = useState<Product[]>(() => exploreData.trendingProducts.slice(0, 4));
  
  // Memoize image configuration for Android optimization
  const imageConfig = useMemo(() => ({
    cachePolicy: (Platform.OS === 'android' ? 'memory-disk' : 'disk') as 'memory-disk' | 'disk',
    priority: 'high' as 'high',
    transition: Platform.OS === 'android' ? 200 : 300,
    placeholder: Platform.OS === 'android' ? { 
      // Use a simple blurhash for Android to reduce flickering
      blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' 
    } : undefined,
  }), []);
  
  useEffect(() => {
    // Store all trending products for the modal
    setAllTrendingProducts(exploreData.trendingProducts);
    
    // Enhanced prefetch for Android
    if (Platform.OS === 'android') {
      // Prefetch with more aggressive caching for Android
      imagePrefetchService.prefetchExploreImages();
      imagePrefetchService.prefetchCategoryImages();
      
      // Additional Android-specific prefetch with delay to prevent overwhelming
      setTimeout(() => {
        imagePrefetchService.prefetchAllCategoryProducts();
      }, 1000);
    } else {
      // Standard prefetch for iOS
      imagePrefetchService.prefetchExploreImages();
    }
  }, []);

  const handleProductPress = (product: Product) => {
    // Open ProductDetailModal when product card is pressed
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleCardPress = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedProduct(null);
  };

  // Category modal handlers
  const getCategoryData = (categoryName: string): Product[] => {
    switch (categoryName.toLowerCase()) {
      case 'cleanser':
        return cleansersData.cleansers;
      case 'moisturizer':
        return moisturizersData.moisturizers;
      case 'serum':
        return serumsData.serums;
      case 'exfoliator':
        return exfoliatorsData.exfoliators;
      case 'sunscreen':
        return sunscreensData.sunscreens;
      case 'dark spots':
        return darkskinData.darkSkinProducts;
      case 'acne/treatment':
        return treatmentsData.treatments;
      default:
        return [];
    }
  };

  const handleSpecialSubcategoryPress = (subcategory: Category) => {
    const products = getCategoryData(subcategory.name);
    setSelectedCategory(subcategory.name);
    setCategoryProducts(products);
    setCategoryModalVisible(true);
  };

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    // Search through all products with multiple criteria
    const filtered = allProductsData.allProducts.filter(product => {
      const searchTerm = query.toLowerCase();
      
      // Check if any of the search fields contain the search term
      const matchesProductName = product.productName?.toLowerCase().includes(searchTerm);
      const matchesBrand = product.brand?.toLowerCase().includes(searchTerm);
      const matchesCategory = product.category?.toLowerCase().includes(searchTerm);
      const matchesProductType = product.productType?.toLowerCase().includes(searchTerm);
      const matchesSearchTerms = product.searchTerms?.includes(searchTerm);
      
      return matchesProductName || matchesBrand || matchesCategory || matchesProductType || matchesSearchTerms;
    });
    
    setSearchResults(filtered);
  };

  const handleSearchResultPress = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleCategoryPress = (category: Category) => {
    const products = getCategoryData(category.name);
    setSelectedCategory(category.name);
    setCategoryProducts(products);
    setCategoryModalVisible(true);
  };

  const handleCategoryModalClose = () => {
    setCategoryModalVisible(false);
    setSelectedCategory('');
    setCategoryProducts([]);
  };

  const handleCategoryProductPress = (product: Product) => {
    // Keep category modal open and just open product modal on top (like TrendingProductsModal)
    setSelectedProduct(product);
    setModalVisible(true);
  };

  // Categories data
  const categories: Category[] = [
    { id: '1', name: 'Cleanser', icon: 'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fcleanser_dry_cleanser.png?alt=media&token=d77e7c24-b125-45a3-9282-f75d9f69e17b' },
    { id: '2', name: 'Moisturizer', icon: 'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fmoisturizers_dry_moisturizer.png?alt=media&token=553d83d0-9df1-409c-accf-92b771be895d' },
    { id: '3', name: 'Serum', icon: 'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fhydration.png?alt=media&token=f3c9c0a2-8a45-4e94-bf98-d27e29e1a586' },
    { id: '4', name: 'Exfoliator', icon: 'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fexfoliators_dry_exfoliator.png?alt=media&token=41af97fb-7c32-49d7-8093-f47d8965f70c' },
    { id: '5', name: 'Sunscreen', icon: 'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fsunscreen.png?alt=media&token=601149c5-9900-459b-b758-463fcfb37d1c' }
  ];

  // Special category subcategories
  const specialSubcategories: Category[] = [
    { id: 'dark-spots', name: 'Dark Spots', icon: 'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fversed.webp?alt=media&token=238996d5-0587-46ce-8e68-c14ba4148bcf' },
    { id: 'acne-treatment', name: 'Acne/Treatment', icon: 'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fspot.png?alt=media&token=c068dfe0-87ef-4820-bdd5-1975194db5ad' }
  ];

  const renderProductCard = (product: Product) => (
    <TouchableOpacity 
      key={product.id} 
      style={styles.productCard}
      activeOpacity={0.9}
      onPress={() => handleCardPress(product)}
    >
      <View style={styles.productImageContainer}>
        {Platform.OS === 'android' ? (
          <Image
            source={{ uri: product.productImage }}
            style={styles.productImage}
            contentFit="cover"
            cachePolicy={imageConfig.cachePolicy}
            priority={imageConfig.priority}
            placeholder={imageConfig.placeholder}
            placeholderContentFit="cover"
            transition={imageConfig.transition}
            recyclingKey={product.id}
            allowDownscaling={true}
          />
        ) : (
          <Image
            source={{ uri: product.productImage }}
            style={styles.productImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
          />
        )}
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
        
        {/* Price Button - Prevents event bubbling to card press */}
        <TouchableOpacity 
          style={styles.priceButton}
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation();
            handleProductPress(product);
          }}
        >
          <Ionicons name="bag-outline" size={14} color="#FFFFFF" />
          <Text style={styles.priceText}>${product.price.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryItem = (category: Category) => (
    <View key={category.id} style={styles.categoryContainer}>
      <TouchableOpacity 
        style={styles.categoryCard} 
        activeOpacity={0.8}
        onPress={() => handleCategoryPress(category)}
      >
        {Platform.OS === 'android' ? (
          <Image
            source={{ uri: category.icon }}
            style={styles.categoryIcon}
            contentFit="cover"
            cachePolicy={imageConfig.cachePolicy}
            priority={imageConfig.priority}
            placeholder={imageConfig.placeholder}
            placeholderContentFit="cover"
            transition={imageConfig.transition}
            recyclingKey={category.id}
            allowDownscaling={true}
          />
        ) : (
          <Image
            source={{ uri: category.icon }}
            style={styles.categoryIcon}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
          />
        )}
      </TouchableOpacity>
      <Text style={styles.categoryName}>{category.name}</Text>
    </View>
  );

  const handleCitationsPress = () => {
    Linking.openURL('https://dermaiapp.com/citations.html');
  };

  return (
    <>
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Products</Text>
        <TouchableOpacity 
          style={styles.citationsButton}
          onPress={handleCitationsPress}
          activeOpacity={0.7}
        >
          <Feather name="book-open" size={12} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.citationsText}>Citations</Text>
        </TouchableOpacity>
      </View>
     
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Find products by name, brand, or category"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Feather name="x" size={16} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>         
          )}
        </View>
      </View>

      {/* Search Results */}
      {isSearching && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Search Results ({searchResults.length})
          </Text>
          
          {searchResults.length > 0 ? (
            <View style={styles.searchResultsContainer}>
              {searchResults.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.searchResultCard}
                  activeOpacity={0.9}
                  onPress={() => handleSearchResultPress(product)}
                >
                  <View style={styles.searchResultImageContainer}>
                    {Platform.OS === 'android' ? (
                      <Image
                        source={{ uri: product.productImage }}
                        style={styles.searchResultImage}
                        contentFit="cover"
                        cachePolicy={imageConfig.cachePolicy}
                        priority={imageConfig.priority}
                        placeholder={imageConfig.placeholder}
                        placeholderContentFit="cover"
                        transition={imageConfig.transition}
                        recyclingKey={product.id}
                        allowDownscaling={true}
                      />
                    ) : (
                      <Image
                        source={{ uri: product.productImage }}
                        style={styles.searchResultImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        priority="high"
                      />
                    )}
                  </View>
                  
                  <View style={styles.searchResultInfo}>
                    {/* Rating Badge */}
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>Rating: {product.rating}/100</Text>
                    </View>
                    
                    {/* Brand */}
                    <Text style={styles.productBrand}>{product.brand}</Text>
                    
                    {/* Product Name */}
                    <Text style={styles.productName} numberOfLines={2}>{product.productName}</Text>
                    
                    {/* Price Button */}
                    <TouchableOpacity 
                      style={styles.priceButton}
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSearchResultPress(product);
                      }}
                    >
                      <Feather name="shopping-bag" size={14} color="#FFFFFF" />
                      <Text style={styles.priceText}>${product.price.toFixed(2)}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noResultsContainer}>
              <Feather name="search" size={48} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.noResultsText}>No products found</Text>
              <Text style={styles.noResultsSubtext}>Try searching by brand, product name, or category</Text>
            </View>
          )}
        </View>
      )}

      {/* Personalized For You Section */}
      {!isSearching && (
        <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Products</Text>
          <TouchableOpacity 
            style={styles.seeAllButton} 
            onPress={() => setTrendingModalVisible(true)}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Feather name="chevron-right" size={16} color="rgba(255, 255, 255, 0.7)" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionSubtitle}>Affordable skincare hot on the market.</Text>
        
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsContainer}
          style={styles.productsScrollView}
        >
          {trendingProducts.map(renderProductCard)}
        </ScrollView>
      </View>
      )}

      {/* Browse by Category Section */}
      {!isSearching && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
            style={styles.categoriesScrollView}
          >
            {categories.map(renderCategoryItem)}
          </ScrollView>
        </View>
      )}

      {/* Special Categories Section */}
      {!isSearching && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Categories</Text>
          
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
            style={styles.categoriesScrollView}
          >
            {specialSubcategories.map((subcategory) => (
              <View key={subcategory.id} style={styles.categoryContainer}>
                <TouchableOpacity 
                  style={styles.categoryCard} 
                  activeOpacity={0.8}
                  onPress={() => handleSpecialSubcategoryPress(subcategory)}
                >
                  {Platform.OS === 'android' ? (
                    <Image
                      source={{ uri: subcategory.icon }}
                      style={styles.categoryIcon}
                      contentFit="cover"
                      cachePolicy={imageConfig.cachePolicy}
                      priority={imageConfig.priority}
                      placeholder={imageConfig.placeholder}
                      placeholderContentFit="cover"
                      transition={imageConfig.transition}
                      recyclingKey={subcategory.id}
                      allowDownscaling={true}
                    />
                  ) : (
                    <Image
                      source={{ uri: subcategory.icon }}
                      style={styles.categoryIcon}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      priority="high"
                    />
                  )}
                </TouchableOpacity>
                <Text style={styles.categoryName}>{subcategory.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bottom Navigation Spacer */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
    
    {/* Product Detail Modal */}
    {selectedProduct && (
      <ProductDetailModal
        isVisible={modalVisible}
        product={selectedProduct}
        onClose={handleModalClose}
        onRoutineUpdated={onRoutineUpdated}
      />
    )}
    
    {/* Trending Products Modal */}
    <TrendingProductsModal
      isVisible={trendingModalVisible}
      products={allTrendingProducts}
      onClose={() => setTrendingModalVisible(false)}
      onProductPress={handleProductPress}
    />
    
    {/* Category Modal */}
    <CategoryModal
      isVisible={categoryModalVisible}
      categoryName={selectedCategory}
      products={categoryProducts}
      onClose={handleCategoryModalClose}
      onProductPress={handleCategoryProductPress}
    />
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 36,
  },
  citationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 20
  },
  citationsText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 36,
  },

  // Search Styles
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },

  // Section Styles
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 20,
  },

  // Products Scroll Styles
  productsScrollView: {
    marginHorizontal: -24, // Extend beyond parent padding
  },
  productsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 16,
  },
  productImageContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    // Android optimization: reduce overdraw
    ...(Platform.OS === 'android' && {
      overflow: 'hidden',
    }),
  },
  productImage: {
    width: '100%',
    height: '100%',
    // Android optimization: improve rendering performance
    ...(Platform.OS === 'android' && {
      backgroundColor: 'transparent',
    }),
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
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productBrand: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  priceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Categories Scroll Styles
  categoriesScrollView: {
    marginHorizontal: -24, // Extend beyond parent padding
    marginTop: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  categoryContainer: {
    alignItems: 'center',
    gap: 8,
  },
  categoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: 100,
    height: 100,
    overflow: 'hidden',
  },
  categoryIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 0, // No border radius since the parent card handles it
    // Android optimization: improve rendering performance
    ...(Platform.OS === 'android' && {
      backgroundColor: 'transparent',
    }),
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    maxWidth: 80, // Match card width to prevent text overflow
  },

  // Search Styles
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResultsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchResultCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  searchResultImageContainer: {
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    // Android optimization: reduce overdraw
    ...(Platform.OS === 'android' && {
      overflow: 'hidden',
    }),
  },
  searchResultImage: {
    width: '100%',
    height: '100%',
    // Android optimization: improve rendering performance
    ...(Platform.OS === 'android' && {
      backgroundColor: 'transparent',
    }),
  },
  searchResultInfo: {
    padding: 12,
    gap: 6,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },

  // Bottom spacer to account for bottom navigation
  bottomSpacer: {
    height: 100,
  },
});