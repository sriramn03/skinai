import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
  Animated,
  Platform 
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { triggerButtonHaptics } from '../services/haptics';

const { width, height } = Dimensions.get('window');

interface FoodAnalysisResults {
  foodName: string;
  skinHealthScore: number;
  bloatIndex: number;
  inflammationIndex: number;
  hydrationIndex: number;
  skinRecoveryIndex: number;
  description: string;
}

interface FoodAnalysisScreenProps {
  imageUri: string;
  analysisResults: FoodAnalysisResults;
  onClose: () => void;
}


export default function FoodAnalysisScreen({ 
  imageUri, 
  analysisResults, 
  onClose 
}: FoodAnalysisScreenProps) {
  const slideY = useRef(new Animated.Value(0)).current;

  const animateDownAndClose = () => {
    triggerButtonHaptics();
    Animated.timing(slideY, { 
      toValue: height, 
      duration: 300, 
      useNativeDriver: true 
    }).start(() => {
      onClose();
    });
  };
  
  const getProgressBarColor = (value: number): readonly [string, string] => {
    if (value >= 80) return ['#10B981', '#34D399']; // Green
    if (value >= 60) return ['#F59E0B', '#FBBF24']; // Yellow
    return ['#EF4444', '#F87171']; // Red
  };

  // For bloat and inflammation indices, we want to invert the color logic
  // (lower scores are better, so we flip the thresholds)
  const getInvertedProgressBarColor = (value: number): readonly [string, string] => {
    if (value >= 80) return ['#EF4444', '#F87171']; // Red (high is bad)
    if (value >= 60) return ['#F59E0B', '#FBBF24']; // Yellow (medium is okay)
    return ['#10B981', '#34D399']; // Green (low is great)
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View 
        style={[styles.screenContainer, { transform: [{ translateY: slideY }] }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={animateDownAndClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Food Analysis</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* First Card - Image and Skin Health Score */}
        <View style={styles.card}>
          <View style={styles.topCardContent}>
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: imageUri }}
                style={styles.foodImage}
                cachePolicy="memory-disk"
                priority="high"
              />
            </View>
            <View style={styles.foodInfoContainer}>
              <Text style={styles.foodName}>{analysisResults.foodName}</Text>
              <View style={styles.skinHealthContainer}>
                <Text style={styles.skinHealthLabel}>Skin Health Score</Text>
                <Text style={[
                  styles.skinHealthScore,
                  { color: getProgressBarColor(analysisResults.skinHealthScore)[0] }
                ]}>
                  {analysisResults.skinHealthScore}
                  <Text style={styles.scoreOutOf}>/100</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Second Card - Food IQ Index */}
        <View style={styles.card}>
          <Text style={styles.foodIQTitle}>Food IQ Index</Text>
          <View style={styles.pillsGrid}>
            <View style={styles.pillsRow}>
              <View style={styles.pillContainer}>
                <LinearGradient colors={['#2B2B2B', '#141414']} style={styles.pill}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'transparent']}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pillGloss}
                    pointerEvents="none"
                  />
                  <Text style={styles.pillTitle}>Bloat Index</Text>
                  <Text style={styles.pillValue}>{analysisResults.bloatIndex}</Text>
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={getInvertedProgressBarColor(analysisResults.bloatIndex)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${analysisResults.bloatIndex}%` }]}
                    />
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.pillContainer}>
                <LinearGradient colors={['#2B2B2B', '#141414']} style={styles.pill}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'transparent']}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pillGloss}
                    pointerEvents="none"
                  />
                  <Text style={styles.pillTitle}>Inflammation</Text>
                  <Text style={styles.pillValue}>{analysisResults.inflammationIndex}</Text>
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={getInvertedProgressBarColor(analysisResults.inflammationIndex)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${analysisResults.inflammationIndex}%` }]}
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.pillsRow}>
              <View style={styles.pillContainer}>
                <LinearGradient colors={['#2B2B2B', '#141414']} style={styles.pill}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'transparent']}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pillGloss}
                    pointerEvents="none"
                  />
                  <Text style={styles.pillTitle}>Hydration</Text>
                  <Text style={styles.pillValue}>{analysisResults.hydrationIndex}</Text>
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={getProgressBarColor(analysisResults.hydrationIndex)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${analysisResults.hydrationIndex}%` }]}
                    />
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.pillContainer}>
                <LinearGradient colors={['#2B2B2B', '#141414']} style={styles.pill}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'transparent']}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pillGloss}
                    pointerEvents="none"
                  />
                  <Text style={styles.pillTitle}>Skin Recovery</Text>
                  <Text style={styles.pillValue}>{analysisResults.skinRecoveryIndex}</Text>
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={getProgressBarColor(analysisResults.skinRecoveryIndex)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${analysisResults.skinRecoveryIndex}%` }]}
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>
          </View>
        </View>

        {/* Third Card - Description */}
        <View style={styles.card}>
          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{analysisResults.description}</Text>
        </View>

        {/* Bottom spacing */}
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
    paddingTop: Platform.OS === 'android' ? 32 : 16,
    paddingBottom: 16,
    backgroundColor: '#000000',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 38, // Same width as close button for centering
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginHorizontal: 20,
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
      },
      android: {
        elevation: 0, // Remove elevation to prevent shadow inside boxes
      },
    }),
  },
  topCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageContainer: {
    marginRight: 20,
  },
  foodImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  foodInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  foodName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 28,
  },
  skinHealthContainer: {
    alignItems: 'flex-start',
  },
  skinHealthLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  skinHealthScore: {
    fontSize: 36,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  scoreOutOf: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  foodIQTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  pillsGrid: {
    gap: 16,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  pillContainer: {
    flex: 1,
  },
  pill: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
      },
      android: {
        elevation: 0, // Remove elevation to prevent shadow inside pills
      },
    }),
  },
  pillGloss: {
    position: 'absolute',
    top: -6,
    left: -8,
    right: -8,
    height: '55%',
    borderRadius: 24,
    transform: [{ rotate: '-6deg' }],
  },
  pillTitle: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  pillValue: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  descriptionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});