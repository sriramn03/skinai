import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { UserRatings, SkincareRoutine, SkincareStep, deleteRoutineStep } from '../services/firestoreService';
import { useDailyProgress } from '../hooks/useDailyProgress';
import { useGlobalCurrentDate } from '../contexts/DateContext';
import ProductDetailsModal from '../components/ProductDetailsModal';
import { triggerButtonHaptics } from '../services/haptics';

interface DailyPageProps {
  userRatings: UserRatings | null;
  amRoutine: SkincareRoutine | null;
  pmRoutine: SkincareRoutine | null;
  onRoutineUpdated?: () => void;
  onNavigateToExplore?: () => void;
}

// Checkbox component with animation
function AnimatedCheckbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    triggerButtonHaptics();
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.checkboxContainer}>
      <Animated.View style={[
        styles.checkbox, 
        checked && styles.checkboxChecked,
        { transform: [{ scale: scaleValue }] }
      ]}>
        {checked && (
          <Animated.View style={styles.checkmarkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </Animated.View>
        )}
      </Animated.View>

    </TouchableOpacity>
  );
}

export default function DailyPage({ userRatings, amRoutine, pmRoutine, onRoutineUpdated, onNavigateToExplore }: DailyPageProps) {
  console.log(`🔄 [${Date.now()}] DailyPage: Component mounting/re-rendering`);
  
  const [activeRoutine, setActiveRoutine] = useState<'AM' | 'PM'>('AM');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SkincareStep | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  console.log(`✏️ DailyPage: isEditMode = ${isEditMode}`);
  
  // Get live date that updates at midnight from global context
  const currentDate = useGlobalCurrentDate();
  
  console.log(`📅 [${Date.now()}] DailyPage: Current date:`, currentDate);
  console.log(`🧴 [${Date.now()}] DailyPage: Routines - AM:${amRoutine?.steps?.length || 0} steps, PM:${pmRoutine?.steps?.length || 0} steps`);
  
  // Use the progress hook for real-time Firestore sync with current date
  const { isStepCompleted, toggleStep } = useDailyProgress(currentDate, amRoutine, pmRoutine);
  
  console.log(`✅ [${Date.now()}] DailyPage: isStepCompleted function received from hook`);

  const currentRoutine = activeRoutine === 'AM' ? amRoutine : pmRoutine;

  const getStepKey = (routine: 'AM' | 'PM', stepNumber: number) => `${routine}_${stepNumber}`;

  const handleToggleStep = async (stepKey: string) => {
    await toggleStep(activeRoutine, stepKey);
  };

  const handleProductPress = (step: SkincareStep) => {
    setSelectedProduct(step);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedProduct(null);
  };

  const handleDeleteStep = async (stepNumber: number) => {
    Alert.alert(
      'Delete Step',
      'Are you sure you want to remove this step from your routine?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoutineStep(activeRoutine, stepNumber);
              // Call the callback to refresh routines in parent component
              if (onRoutineUpdated) {
                onRoutineUpdated();
              }
            } catch (error) {
              console.error('Error deleting step:', error);
              Alert.alert('Error', 'Failed to delete step. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
      bounces={false}
      alwaysBounceVertical={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Routine</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            console.log('Edit button pressed! Current isEditMode:', isEditMode);
            triggerButtonHaptics();
            setIsEditMode(!isEditMode);
          }}
          testID="edit-routine-button"
        >
          <Text style={styles.editButtonText}>
            {isEditMode ? 'Done' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AM/PM Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, activeRoutine === 'AM' && styles.activeToggleButton]}
          onPress={() => {
            triggerButtonHaptics();
            setActiveRoutine('AM');
          }}
        >
          <Text style={[styles.toggleButtonText, activeRoutine === 'AM' && styles.activeToggleButtonText]}>
            AM
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, activeRoutine === 'PM' && styles.activeToggleButton]}
          onPress={() => {
            triggerButtonHaptics();
            setActiveRoutine('PM');
          }}
        >
          <Text style={[styles.toggleButtonText, activeRoutine === 'PM' && styles.activeToggleButtonText]}>
            PM
          </Text>
        </TouchableOpacity>
      </View>

      {/* Routine Steps */}
      {currentRoutine && currentRoutine.steps.map((step) => {
        const stepKey = getStepKey(activeRoutine, step.step);
        const isCompleted = isStepCompleted(activeRoutine, stepKey);

        return (
          <View key={step.step} style={styles.routineCardContainer}>
            <TouchableOpacity 
              onPress={() => handleProductPress(step)}
              activeOpacity={0.8}
              style={styles.cardTouchable}
            >
              <LinearGradient
                colors={['#2A2A2A', '#4A4A4A', '#2A2A2A', '#1A1A1A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.routineCard}
              >
                <View style={styles.routineCardContent}>
                    {step.productImage && (
                      <View style={styles.stepImageContainer}>
                        <Image
                          source={{ uri: step.productImage }}
                          style={styles.stepImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      </View>
                    )}

                  <View style={styles.routineInfo}>
                    <Text style={styles.stepName}>{step.name}</Text>
                    <Text style={styles.stepCategory}>{step.category}</Text>
                  </View>

                  <View style={styles.cardActions}>
                    {isEditMode && (
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteStep(step.step);
                        }}
                        style={styles.deleteButtonTouchArea}
                      >
                        <View style={styles.deleteButton}>
                          <Feather name="trash-2" size={16} color="#FF4757" />
                        </View>
                      </TouchableOpacity>
                    )}
                    {!isEditMode && (
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleStep(stepKey);
                        }}
                        style={styles.checkboxTouchArea}
                      >
                        <AnimatedCheckbox
                          checked={isCompleted}
                          onPress={() => handleToggleStep(stepKey)}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Add Skincare Button - Only show in edit mode and when there's a current routine */}
      {isEditMode && currentRoutine && (
        <View style={styles.addSkincareCardContainer}>
          <TouchableOpacity 
            onPress={() => {
              triggerButtonHaptics();
              onNavigateToExplore?.();
            }}
            activeOpacity={0.8}
            style={styles.cardTouchable}
          >
            <LinearGradient
              colors={['#2A2A2A', '#4A4A4A', '#2A2A2A', '#1A1A1A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addSkincareCard}
            >
              <View style={styles.addSkincareCardContent}>
                <View style={styles.addIconContainer}>
                  <Feather name="plus" size={24} color="#8B5CF6" />
                </View>
                <View style={styles.addSkincareInfo}>
                  <Text style={styles.addSkincareText}>Add Skincare</Text>
                  <Text style={styles.addSkincareSubtext}>Browse products</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {!currentRoutine && (
        <View style={styles.noRoutineCardContainer}>
          <LinearGradient
            colors={['#1A1A1A', '#2A2A2A', '#1A1A1A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.noRoutineCard}
          >
            <Text style={styles.noRoutineText}>
              No {activeRoutine} routine found. Complete your skin analysis to get personalized recommendations.
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Product Details Modal */}
      <ProductDetailsModal
        visible={modalVisible}
        product={selectedProduct}
        onClose={handleCloseModal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra bottom padding for tab bar
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 46 : 16, // Lower on Android (16 + 16)
    marginBottom:Platform.OS === 'android' ? 10 : 24, // Lower on Android (16 + 16)
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeToggleButtonText: {
    color: '#FFFFFF',
  },
  routineCardContainer: {
    marginBottom: 18,
  },
  cardTouchable: {
    borderRadius: 20,
  },
  routineCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  routineCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  routineInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  stepCategory: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxTouchArea: {
    padding: 8,
  },
  checkboxContainer: {
    padding: 8,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.6)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: Platform.OS === 'android' ? 0 : 4,
    },
    shadowOpacity: Platform.OS === 'android' ? 0 : 0.2,
    shadowRadius: Platform.OS === 'android' ? 0 : 6,
    elevation: Platform.OS === 'android' ? 0 : 6,
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#FFFFFF',
    shadowOpacity: 0.4,
  },
  checkmarkContainer: {
    transform: [{ rotate: '10deg' }, { translateX: 2 }],
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  noRoutineCardContainer: {
    marginTop: 40,
  },
  noRoutineCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    overflow: 'hidden',
    padding: 20,
  },
  noRoutineText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepImageContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepImage: {
    width: 78,
    height: 78,
    backgroundColor: '#333',
  },
  editButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  deleteButtonTouchArea: {
    padding: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 71, 87, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Add Skincare Button Styles
  addSkincareCardContainer: {
    marginBottom: 18,
  },
  addSkincareCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  addSkincareCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  addIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addSkincareInfo: {
    flex: 1,
  },
  addSkincareText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  addSkincareSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});