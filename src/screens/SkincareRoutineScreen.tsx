import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Dimensions, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getSkincareRoutine, SkincareRoutine, SkincareStep } from '../services/firestoreService';

const { width } = Dimensions.get('window');

interface SkincareRoutineScreenProps {
  onBackToDashboard: () => void;
  shouldRefresh?: boolean;
  onRefreshComplete?: () => void;
}

export default function SkincareRoutineScreen({ 
  onBackToDashboard, 
  shouldRefresh = false, 
  onRefreshComplete 
}: SkincareRoutineScreenProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [amRoutine, setAmRoutine] = useState<SkincareRoutine | null>(null);
  const [pmRoutine, setPmRoutine] = useState<SkincareRoutine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSkincareRoutines();
  }, []);
  
  // Refresh when shouldRefresh prop changes
  useEffect(() => {
    if (shouldRefresh) {
      console.log('SkincareRoutineScreen: Refreshing routines due to prop change');
      loadSkincareRoutines().then(() => {
        if (onRefreshComplete) {
          onRefreshComplete();
        }
      });
    }
  }, [shouldRefresh, onRefreshComplete]);

  const loadSkincareRoutines = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading skincare routines from Firestore...');
      
      // Load both AM and PM routines in parallel
      const [amData, pmData] = await Promise.all([
        getSkincareRoutine('AM'),
        getSkincareRoutine('PM')
      ]);
      
      setAmRoutine(amData);
      setPmRoutine(pmData);
      
      console.log('Skincare routines loaded successfully');
      console.log('AM Routine:', amData);
      console.log('PM Routine:', pmData);
      
    } catch (error) {
      console.error('Error loading skincare routines:', error);
      setError('Failed to load skincare routines. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentRoutine = (): SkincareRoutine | null => {
    return selectedPeriod === 'AM' ? amRoutine : pmRoutine;
  };

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

  const renderSkincareStep = (step: SkincareStep, index: number) => {
    const isEven = index % 2 === 0;
    
    return (
      <View key={step.step} style={styles.stepCard}>
        <View style={styles.stepContent}>
          {/* Step Header */}
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, isEven ? styles.stepNumberPrimary : styles.stepNumberSecondary]}>
              <Text style={styles.stepNumberText}>{step.step}</Text>
            </View>
            <View style={styles.stepTitleContainer}>
              <Text style={styles.stepTitle}>{step.name}</Text>
              <Text style={styles.stepPurpose}>{step.purpose}</Text>
            </View>
            {step.rateOfImportance && (
              <View style={styles.importanceContainer}>
                <Text style={styles.importanceText}>★ {step.rateOfImportance}/5</Text>
              </View>
            )}
          </View>

          {/* Product Information */}
          <View style={styles.productSection}>
            {/* Product Image and Details */}
            <View style={styles.productInfo}>
              {step.productImage && (
                <Image 
                  source={{ uri: step.productImage }} 
                  style={styles.productImage}
                  resizeMode="contain"
                />
              )}
              <View style={styles.productDetails}>
                <Text style={styles.productName}>{step.productName || step.name}</Text>
                <Text style={styles.productType}>{step.productType}</Text>
                {step.whyEffective && (
                  <Text style={styles.whyEffective}>💡 {step.whyEffective}</Text>
                )}
              </View>
            </View>

            {/* How To Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>How to use:</Text>
              <Text style={styles.instructionsText}>{step.howTo}</Text>
            </View>

            {/* Purchase Button */}
            {step.amazonUrl && (
              <TouchableOpacity 
                style={styles.purchaseButton}
                onPress={() => handleProductPurchase(step.amazonUrl)}
              >
                <Text style={styles.purchaseButtonText}>🛒 Buy on Amazon</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your personalized routine...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSkincareRoutines}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentRoutine = getCurrentRoutine();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToDashboard}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Skincare Routine</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity 
          style={[styles.periodButton, selectedPeriod === 'AM' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('AM')}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 'AM' && styles.periodButtonTextActive]}>
            AM Routine
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.periodButton, selectedPeriod === 'PM' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('PM')}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 'PM' && styles.periodButtonTextActive]}>
            PM Routine
          </Text>
        </TouchableOpacity>
      </View>

      {/* Routine Info */}
      {currentRoutine && (
        <View style={styles.routineInfo}>
          <Text style={styles.routineTitle}>{currentRoutine.dreamSkinType} Skin</Text>
          <Text style={styles.routineSubtitle}>
            {currentRoutine.stepCount} • {currentRoutine.skinType} skin type
          </Text>
        </View>
      )}

      {/* Steps */}
      <ScrollView style={styles.stepsContainer} showsVerticalScrollIndicator={false}>
        {currentRoutine?.steps.map((step, index) => renderSkincareStep(step, index))}
        
        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  routineInfo: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  routineTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  routineSubtitle: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  stepsContainer: {
    flex: 1,
  },
  stepCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepContent: {
    padding: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberPrimary: {
    backgroundColor: '#007AFF',
  },
  stepNumberSecondary: {
    backgroundColor: '#34C759',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitleContainer: {
    flex: 1,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepPurpose: {
    color: '#999',
    fontSize: 14,
  },
  importanceContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  importanceText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productSection: {
    gap: 16,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productType: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  whyEffective: {
    color: '#34C759',
    fontSize: 12,
    fontStyle: 'italic',
  },
  instructionsContainer: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  purchaseButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 40,
  },
});
