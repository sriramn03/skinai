import React, { useRef, useMemo, useEffect } from 'react';
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

interface PimpleAnalysisResults {
  pimpleDetected: boolean;
  severity: 'low' | 'medium' | 'high';
  description: string;
  treatmentSteps: [string, string, string, string];
  timeframe: string;
  prevention: string;
  stepEmojis?: [string, string, string, string];
}

interface PimpleAnalysisScreenProps {
  imageUri: string;
  analysisResults: PimpleAnalysisResults;
  onClose: () => void;
}

export default function PimpleAnalysisScreen({ 
  imageUri, 
  analysisResults, 
  onClose 
}: PimpleAnalysisScreenProps) {
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

  // Galaxy starfield background
  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * width,
        top: Math.random() * height,
        size: Math.random() * 3 + 0.5, // Varied sizes from 0.5 to 3.5
        brightness: Math.random(), // Base brightness
        twinkleSpeed: 1500 + Math.random() * 3000, // 1.5s to 4.5s
        color: i < 60 ? '#FFFFFF' : i < 75 ? '#A78BFA' : '#8B5CF6', // Mix of white and purple stars
      })),
    [width, height]
  );
  
  const starOpacities = useMemo(
    () => stars.map(star => new Animated.Value(star.brightness * 0.8)),
    [stars]
  );
  
  useEffect(() => {
    stars.forEach((star, i) => {
      const startDelay = Math.random() * 2000; // Stagger start times
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(starOpacities[i], { 
              toValue: star.brightness * 0.2, 
              duration: star.twinkleSpeed, 
              useNativeDriver: true 
            }),
            Animated.timing(starOpacities[i], { 
              toValue: star.brightness * 1.0, 
              duration: star.twinkleSpeed, 
              useNativeDriver: true 
            }),
          ])
        ).start();
      }, startDelay);
    });
  }, [stars, starOpacities]);

  const getSeverityColor = (severity: string): readonly [string, string] => {
    switch (severity) {
      case 'low': return ['#10B981', '#34D399']; // Green
      case 'medium': return ['#F59E0B', '#FBBF24']; // Yellow
      case 'high': return ['#EF4444', '#F87171']; // Red
      default: return ['#F59E0B', '#FBBF24']; // Default yellow
    }
  };

  const getSeverityEmoji = (severity: string): string => {
    switch (severity) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '🔴';
    }
  };

  const getSeverityFlag = (severity: string): string => {
    switch (severity) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '🔴';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Galaxy starfield background */}
      <View style={StyleSheet.absoluteFill}>
        {stars.map((star, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: star.color,
              opacity: starOpacities[i],
              shadowColor: star.color,
              shadowOpacity: 0.8,
              shadowRadius: star.size * 1.5,
              elevation: 5,
            }}
          />
        ))}
      </View>
      
      <Animated.View 
        style={[styles.screenContainer, { transform: [{ translateY: slideY }] }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={animateDownAndClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pimple Analysis</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* First Row - Image and Category Card */}
          <View style={styles.topRow}>
            {/* Image */}
            <Image 
              source={{ uri: imageUri }}
              style={styles.pimpleImage}
              cachePolicy="memory-disk"
              priority="high"
            />
            
            {/* Category Card */}
            <View style={styles.categoryCard}>
              <LinearGradient colors={['#2B2B2B', '#141414']} style={styles.categoryGradient}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'transparent']}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryGloss}
                  pointerEvents="none"
                />
                <Text style={styles.categoryTitle}>Category</Text>
                <View style={styles.severityRow}>
                  <Text style={styles.severityDot}>{getSeverityEmoji(analysisResults.severity)}</Text>
                  <Text style={styles.categoryText}>{analysisResults.severity.toUpperCase()}</Text>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Description Card */}
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
              <Text style={styles.pillTitle}>Analysis</Text>
              <Text style={styles.descriptionText}>{analysisResults.description}</Text>
              <View style={styles.timeframeBadge}>
                <Text style={styles.timeframeText}>Expected improvement: {analysisResults.timeframe}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Treatment Steps Cards */}
          {analysisResults.treatmentSteps.map((step, index) => (
            <View key={index} style={styles.routineCardContainer}>
              <LinearGradient
                colors={['#2A2A2A', '#4A4A4A', '#2A2A2A', '#1A1A1A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.routineCard}
              >
                <View style={styles.stepHeader}>
                  {analysisResults.stepEmojis && analysisResults.stepEmojis[index] && (
                    <Text style={styles.stepEmoji}>{analysisResults.stepEmojis[index]}</Text>
                  )}
                  <Text style={styles.stepTitle}>Step</Text>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                </View>
                <Text style={styles.stepDescription}>{step}</Text>
              </LinearGradient>
            </View>
          ))}

          {/* Prevention Card */}
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
              <Text style={styles.pillTitle}>Prevention Tip</Text>
              <Text style={styles.preventionText}>{analysisResults.prevention}</Text>
            </LinearGradient>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  pimpleImage: {
    width: 170,
    height: 150,
    borderRadius: 16,
  },
  categoryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryGloss: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  categoryTitle: {
    fontSize: 25,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  severityDot: {
    marginTop: 25,
    marginLeft: -15,
    fontSize: 25,
    marginRight: 8,
  },
  categoryText: {
    marginTop: 25,
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  routineCardContainer: {
    marginBottom: 24,
  },
  routineCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    overflow: 'hidden',
    padding: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 18,
    lineHeight: 26,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  timeframeBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    marginLeft: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stepDescription: {
    fontSize: 17,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  preventionText: {
    fontSize: 18,
    lineHeight: 26,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  bottomSpacing: {
    height: 40,
  },
  // Pill styles from CompactResultsScreen
  pillContainer: {
    marginBottom: 24,
  },
  pill: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 12,
    overflow: 'hidden',
  },
  pillGloss: {
    position: 'absolute',
    top: -8,
    left: -10,
    right: -10,
    height: '65%',
    borderRadius: 28,
    transform: [{ rotate: '-3deg' }],
  },
  pillTitle: {
    color: '#CCCCCC',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
});