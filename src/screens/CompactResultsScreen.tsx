import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, Dimensions, Animated, Platform, ScrollView, TouchableOpacity, Linking, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AnalysisResults } from '../services/analysisService';
import { getSkincareRoutine, SkincareRoutine, SkincareStep } from '../services/firestoreService';
import { Image as ExpoImage } from 'expo-image';

const { width } = Dimensions.get('window');
const PILL_WIDTH = Platform.OS === 'android' 
  ? (width - 60) / 2  // Bigger boxes on Android (less horizontal padding)
  : (width - 72) / 2; // Original iOS sizing


// Color coding function
function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#F59E0B'; // Yellow/Orange
  return '#EF4444'; // Red
}

// Normalize display values
function asDisplay(value: number): number {
  return Math.round(value <= 1 ? value * 100 : value);
}

interface CompactResultsScreenProps {
  imageUri: string;
  results: AnalysisResults;
  onContinue?: () => void;
}

function Progress({ percent, height = 6 }: { percent: number; height?: number }) {
  const normalized = percent <= 1 ? percent * 100 : percent;
  const color = getScoreColor(normalized);
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[
        styles.progressFill, 
        { 
          width: `${Math.max(0, Math.min(100, normalized))}%`,
          backgroundColor: color 
        }
      ]} />
    </View>
  );
}

function ResultPill({ title, value }: { title: string; value: number }) {
  const display = asDisplay(value);
  return (
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
        <Text style={styles.pillTitle}>{title}</Text>
        <Text style={styles.pillValue}>{display}</Text>
        <Progress percent={display} height={8} />
      </LinearGradient>
    </View>
  );
}



export default function CompactResultsScreen({
  imageUri,
  results,
  onContinue,
}: CompactResultsScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<FlatList>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [amRoutine, setAmRoutine] = useState<SkincareRoutine | null>(null);
  const [pmRoutine, setPmRoutine] = useState<SkincareRoutine | null>(null);
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(true);

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Load skincare routines from Firebase
  useEffect(() => {
    const loadRoutines = async () => {
      try {
        setIsLoadingRoutine(true);
        const [am, pm] = await Promise.all([
          getSkincareRoutine('AM'),
          getSkincareRoutine('PM')
        ]);
        setAmRoutine(am);
        setPmRoutine(pm);
      } catch (error) {
        console.error('Error loading skincare routines:', error);
      } finally {
        setIsLoadingRoutine(false);
      }
    };
    loadRoutines();
  }, []);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    setCurrentPage(page);
  };

  const handleAmazonPress = (amazonUrl?: string) => {
    if (amazonUrl) {
      Linking.openURL(amazonUrl);
    }
  };

  const currentRoutine = selectedPeriod === 'AM' ? amRoutine : pmRoutine;

  // Render Results Page (Page 1)
  const renderResultsPage = () => (
    <View style={styles.pageWrapper}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Avatar */}
        <View style={styles.header}>
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        </View>

        {/* Hero Pills - Overall and Potential */}
        <View style={styles.pillsRow}>
          <ResultPill title="Overall" value={results.overall} />
          <View style={{ width: 24 }} />
          <ResultPill title="Potential" value={results.potential} />
        </View>

        {/* 2x2 Grid - Detailed Metrics */}
        <View style={styles.grid}>
          <View style={styles.gridRow}> 
            <View style={styles.pillContainer}>
              <ResultPill title="Hydration" value={results.hydration} />
            </View>
            <View style={{ width: 24 }} />
            <View style={styles.pillContainer}>
              <ResultPill title="Smoothness" value={results.smoothness} />
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={styles.pillContainer}>
              <ResultPill title="Tone" value={results.tone} />
            </View>
            <View style={{ width: 24 }} />
            <View style={styles.pillContainer}>
              <ResultPill title="Clarity" value={results.clarity} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  // Render Skincare Routine Page (Page 2)
  const renderRoutinePage = () => {
    if (isLoadingRoutine) {
      return (
        <View style={styles.pageWrapper}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your routine...</Text>
          </View>
        </View>
      );
    }

    if (!currentRoutine) {
      return (
        <View style={styles.pageWrapper}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No routine found</Text>
          </View>
        </View>
      );
    }

    const dreamSkinDisplay = currentRoutine.dreamSkinType || 'Clear';

    return (
      <View style={styles.pageWrapper}>
        <ScrollView 
          style={styles.routineScrollView}
          contentContainerStyle={styles.routineContentContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={Platform.OS === 'ios'}
          scrollEnabled={true}
        >
          {/* Header */}
          <View style={styles.routineHeader}>
            <Text style={styles.routineTitle}>Your Skincare Routine</Text>
            <Text style={styles.routineSubtitle}>{dreamSkinDisplay.charAt(0).toUpperCase() + dreamSkinDisplay.slice(1)} Skin</Text>
            <Text style={styles.routineDescription}>
              {currentRoutine.stepCount} steps • {currentRoutine.skinType} skin type
            </Text>
          </View>

          {/* AM/PM Toggle */}
          <View style={styles.periodSelector}>
            <TouchableOpacity 
              style={[styles.periodButton, selectedPeriod === 'AM' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('AM')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'AM' && styles.periodButtonTextActive]}>
                AM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.periodButton, selectedPeriod === 'PM' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('PM')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'PM' && styles.periodButtonTextActive]}>
                PM
              </Text>
            </TouchableOpacity>
          </View>

          {/* Routine Steps */}
          {currentRoutine.steps.map((step, index) => (
            <View key={index} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.step}</Text>
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepCategory}>{step.name}</Text>
                  {step.rateOfImportance && (
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingText}>⭐ {step.rateOfImportance}/5</Text>
                    </View>
                  )}
                </View>
              </View>

              {step.productImage && (
                <View style={styles.productInfo}>
                  <ExpoImage
                    source={{ uri: step.productImage }}
                    style={styles.productImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{step.productType}</Text>
                    {step.productName && (
                      <Text style={styles.brandName}>{step.productName}</Text>
                    )}
                  </View>
                </View>
              )}

              {step.amazonUrl && (
                <TouchableOpacity 
                  style={styles.amazonButton}
                  onPress={() => handleAmazonPress(step.amazonUrl)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.amazonButtonText}>🛒 Buy on Amazon</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  const renderPage = ({ item, index }: { item: string; index: number }) => {
    if (index === 0) {
      return renderResultsPage();
    } else {
      return renderRoutinePage();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <FlatList
        ref={scrollViewRef}
        data={['results', 'routine']}
        renderItem={renderPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="start"
        bounces={false}
        keyExtractor={(item) => item}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Page Dots - Only show on first page */}
      {currentPage === 0 && (
        <View style={styles.pageDots}>
          {[0, 1].map((index) => (
            <View 
              key={index}
              style={[styles.dot, currentPage === index && styles.activeDot]} 
            />
          ))}
        </View>
      )}

      {/* Continue Button - Only show on second page */}
      {onContinue && currentPage === 1 && (
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.continueGradient}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 40, // Space for swipe handle
  },
  horizontalScroll: {
    flex: 1,
  },
  pageWrapper: {
    width: width,
  },
  content: {
    flex: Platform.OS === 'android' ? 0 : 1,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 20 : 0,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 24 : 16,
    marginBottom: Platform.OS === 'android' ? 24 : 18,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Pills Row
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'android' ? 18 : 24,
    marginBottom: Platform.OS === 'android' ? 24 : 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillContainer: {
    width: PILL_WIDTH,
  },
  pill: {
    borderRadius: 20,
    paddingVertical: Platform.OS === 'android' ? 24 : 16,
    paddingHorizontal: Platform.OS === 'android' ? 24 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
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
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
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
  },

  // Grid
  grid: {
    paddingHorizontal: Platform.OS === 'android' ? 18 : 24,
    marginBottom: Platform.OS === 'android' ? -20 : 0,
    gap: Platform.OS === 'android' ? 20 : 16,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'android' ? 10 : 9,
  },

  // Progress
  progressTrack: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  // Routine Page Styles
  routineScrollView: {
    flex: 1,
  },
  routineContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  routineHeader: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  routineTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  routineSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  routineDescription: {
    fontSize: 14,
    color: '#999999',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  periodButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  stepCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  stepInfo: {
    flex: 1,
  },
  stepCategory: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  productInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#333',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  brandName: {
    fontSize: 14,
    color: '#999999',
  },
  amazonButton: {
    backgroundColor: '#FF9900',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  amazonButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#999999',
    fontSize: 16,
  },

  // Page Dots
  pageDots: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
    marginHorizontal: 5,
    opacity: 0.5,
  },
  activeDot: {
    backgroundColor: '#8B5CF6',
    opacity: 1,
  },

  // Continue Button
  continueButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
  },
  continueGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});