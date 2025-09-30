import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { triggerButtonHaptics } from '../services/haptics';

const { width, height } = Dimensions.get('window');

interface ProductAnalysisScreenProps {
  results: {
    productName: string;
    brand: string;
    keyIngredients: string[];
    benefitScore: number;
    safetyScore: number;
    description: string;
    category?: string;
    skinType?: string;
    priceRange?: string;
    skinConcerns?: string[];
  };
  imageUri: string;
  onBack: () => void;
}

interface IngredientRisk {
  name: string;
  risk: 'hazardous' | 'moderate' | 'low' | 'safe';
  color: string;
  label: string;
}

export default function ProductAnalysisScreen({
  results,
  imageUri,
  onBack,
}: ProductAnalysisScreenProps) {
  const slideY = useRef(new Animated.Value(0)).current;

  const animateDownAndClose = () => {
    triggerButtonHaptics();
    Animated.timing(slideY, { 
      toValue: height, 
      duration: 300, 
      useNativeDriver: true 
    }).start(() => {
      onBack();
    });
  };

  // Convert ingredients to risk assessment format
  const getIngredientRisks = (): IngredientRisk[] => {
    return results.keyIngredients.map((ingredient, index) => {
      // Simple logic to assign risk levels based on common skincare knowledge
      const ingredientLower = ingredient.toLowerCase();
      
      if (ingredientLower.includes('alcohol') && !ingredientLower.includes('cetyl') && !ingredientLower.includes('stearyl')) {
        return { name: ingredient, risk: 'moderate', color: '#FF8C00', label: 'Moderate risk' };
      } else if (ingredientLower.includes('paraben') || ingredientLower.includes('sulfate') || ingredientLower.includes('fragrance') || ingredientLower.includes('parfum')) {
        return { name: ingredient, risk: 'moderate', color: '#FF8C00', label: 'Moderate risk' };
      } else if (ingredientLower.includes('retinol') || ingredientLower.includes('aha') || ingredientLower.includes('bha') || ingredientLower.includes('glycolic')) {
        return { name: ingredient, risk: 'moderate', color: '#FF8C00', label: 'Moderate risk' };
      } else if (ingredientLower.includes('petrolatum') || ingredientLower.includes('mineral oil')) {
        return { name: ingredient, risk: 'hazardous', color: '#FF4757', label: 'Hazardous' };
      } else if (ingredientLower.includes('edta') || ingredientLower.includes('citric acid')) {
        return { name: ingredient, risk: 'low', color: '#FFA500', label: 'Low risk' };
      } else {
        return { name: ingredient, risk: 'safe', color: '#2ECC71', label: 'No risk' };
      }
    });
  };

  const ingredientRisks = getIngredientRisks();

  // Determine overall rating based on safety score
  const getOverallRating = () => {
    const score = results.safetyScore;
    if (score >= 80) return { score, label: 'Good', color: '#2ECC71' };
    if (score >= 60) return { score, label: 'Fair', color: '#FFA500' };
    if (score >= 40) return { score, label: 'Poor', color: '#FF8C00' };
    return { score, label: 'Bad', color: '#FF4757' };
  };

  const overallRating = getOverallRating();

  const renderIngredientCard = (ingredient: IngredientRisk, index: number) => (
    <View key={index} style={styles.ingredientCard}>
      <View style={styles.ingredientHeader}>
        <Text style={styles.ingredientName}>{ingredient.name}</Text>
       
      </View>
      <View style={styles.riskContainer}>
        <View style={[styles.riskDot, { backgroundColor: ingredient.color }]} />
        <Text style={[styles.riskLabel, { color: ingredient.color }]}>{ingredient.label}</Text>
      </View>
    </View>
  );

  const renderDescriptionCard = () => (
    <View style={styles.descriptionCard}>
      <Text style={styles.descriptionTitle}>Overview</Text>
      <Text style={styles.descriptionText}>
        {results.description}
      </Text>
      {(results.category || results.skinType || results.skinConcerns) && (
        <Text style={styles.additionalInfo}>
          {results.category && `\nProduct Category: ${results.category}`}
          {results.skinType && `\nRecommended for: ${results.skinType} skin`}
          {results.skinConcerns && results.skinConcerns.length > 0 && `\nTargets: ${results.skinConcerns.join(', ')}`}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View 
        style={[styles.screenContainer, { transform: [{ translateY: slideY }] }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={animateDownAndClose} style={styles.backButton}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Header */}
        <View style={styles.productHeader}>
          <View style={styles.productImageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.productImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{results.productName}</Text>
            <Text style={styles.brandName}>{results.brand}</Text>
            
            <View style={styles.ratingContainer}>
              <View style={[styles.ratingDot, { backgroundColor: overallRating.color }]} />
              <Text style={styles.ratingScore}>{overallRating.score}/100</Text>
              <Text style={[styles.ratingLabel, { color: overallRating.color }]}>{overallRating.label}</Text>
            </View>
          </View>
        </View>

        {/* Ingredients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          
          {ingredientRisks.map((ingredient, index) => 
            renderIngredientCard(ingredient, index)
          )}
        </View>

        {/* Description Card */}
        {renderDescriptionCard()}

        {/* Bottom Navigation Spacer */}
        <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  screenContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 38 : 16,
    paddingBottom: 16,
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  
  // Product Header Styles
  productHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'flex-start',
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#F5F5F5',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  
productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  brandName: {
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  ratingScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Section Styles
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },

  // Ingredient Card Styles
  ingredientCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
      },
      android: {
        elevation: 0, // Remove elevation to prevent shadow inside cards
      },
    }),
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  infoButton: {
    padding: 4,
  },
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Description Card Styles
  descriptionCard: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  additionalInfo: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 8,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 100,
  },
});