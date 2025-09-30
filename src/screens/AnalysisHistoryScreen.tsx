import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, Animated, PanResponder, Modal, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { UserRatings } from '../services/firestoreService';
import imagePrefetchService from '../services/imagePrefetchService';

const { width, height } = Dimensions.get('window');
const DISMISS_THRESHOLD = width * 0.3; // how far you must swipe to close
const MAX_PULL_LEFT = -40; // allow a tiny pull left for bounce
const MODAL_HEIGHT = height * 0.95; // Modal covers 90% of screen
const MODAL_DISMISS_THRESHOLD = height * 0.25; // Swipe threshold for modal

interface AnalysisHistoryScreenProps {
  onBack: () => void;
  currentUserRatings: UserRatings | null;
}

export default function AnalysisHistoryScreen({ onBack, currentUserRatings }: AnalysisHistoryScreenProps) {
  const [analyses, setAnalyses] = useState<UserRatings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Fetching analysis history...');
  const [selectedAnalysis, setSelectedAnalysis] = useState<UserRatings | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Animation values
  const spinValue = new Animated.Value(0);
  const progressValue = new Animated.Value(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const modalSlideY = useRef(new Animated.Value(MODAL_HEIGHT)).current;

  // Animated back function with slide transition
  const handleAnimatedBack = () => {
    Animated.timing(slideX, {
      toValue: width,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onBack();
    });
  };

  // Modal functions - Platform-specific opening animation
  const openModal = (analysis: UserRatings) => {
    setSelectedAnalysis(analysis);
    setIsModalVisible(true);
    
    if (Platform.OS === 'android') {
      // Android: Simple pop-up animation (no slide)
      modalSlideY.setValue(height * 0.01); // Immediately set to final position
    } else {
      // iOS: Keep original slide-up animation
      Animated.timing(modalSlideY, {
        toValue: height * 0.01, // Show modal at 99% coverage
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeModal = () => {
    Animated.timing(modalSlideY, {
      toValue: MODAL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsModalVisible(false);
        setSelectedAnalysis(null);
      }
    });
  };

  // Modal pan responder for swipe-down-to-close
  const modalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => {
        // Only respond to downward swipes
        return g.dy > 10 && g.dy > Math.abs(g.dx);
      },
      onPanResponderGrant: () => {
        modalSlideY.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        // Only allow downward swipes
        const next = Math.max(g.dy + height * 0.01, height * 0.01);
        modalSlideY.setValue(Math.min(next, MODAL_HEIGHT));
      },
      onPanResponderRelease: (_, g) => {
        const shouldDismiss = g.vy > 1.2 || g.dy > MODAL_DISMISS_THRESHOLD;
        if (shouldDismiss) {
          closeModal();
        } else {
          // bounce back
          Animated.spring(modalSlideY, {
            toValue: height * 0.01,
            speed: 14,
            bounciness: 8,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated, bounce back
        Animated.spring(modalSlideY, {
          toValue: height * 0.01,
          speed: 14,
          bounciness: 8,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Pan responder for swipe-right-to-close (screen-wide but selective)
  const screenPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        // Only respond to strong rightward horizontal gestures from screen edge
        // Must start from left edge and be primarily horizontal
        return g.dx > 20 && g.dx > Math.abs(g.dy) * 3 && g.x0 < 50;
      },
      onPanResponderGrant: () => {
        slideX.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        // Only allow rightward swipes (positive dx), no leftward movement
        const next = Math.max(g.dx, 0);
        slideX.setValue(Math.min(next, width));
      },
      onPanResponderRelease: (_, g) => {
        const shouldDismiss = g.vx > 1.2 || g.dx > DISMISS_THRESHOLD;
        if (shouldDismiss) {
          handleAnimatedBack();
        } else {
          // bounce back
          Animated.spring(slideX, {
            toValue: 0,
            speed: 14,
            bounciness: 8,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated, bounce back
        Animated.spring(slideX, {
          toValue: 0,
          speed: 14,
          bounciness: 8,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    // Start loading animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    loadAnalysisHistory();

    return () => {
      spinAnimation.stop();
    };
  }, []);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressValue, {
      toValue: loadingProgress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [loadingProgress]);

  const loadAnalysisHistory = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.error('No authenticated user');
        setIsLoading(false);
        return;
      }

      setLoadingText('Fetching analysis history...');
      setLoadingProgress(20);

      // Get all analysis documents
      const analysesSnapshot = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('analyses')
        .orderBy('createdAt', 'desc')
        .get();

      const analysisData: UserRatings[] = [];
      analysesSnapshot.forEach(doc => {
        analysisData.push(doc.data() as UserRatings);
      });

      setAnalyses(analysisData);
      setLoadingProgress(50);
      setLoadingText('Fetching Progress...');

      // Prefetch all images for smooth scrolling
      const imageUrls = analysisData
        .filter(analysis => analysis.images && analysis.images.length > 0)
        .map(analysis => analysis.images![0].imageUrl);

      if (imageUrls.length > 0) {
        for (let i = 0; i < imageUrls.length; i++) {
          await imagePrefetchService.prefetchNewAnalysisImage(imageUrls[i]);
          const progress = 50 + ((i + 1) / imageUrls.length) * 40;
          setLoadingProgress(progress);
          setLoadingText(`Fetching Progress ${i + 1}/${imageUrls.length}`);
        }
      }

      setLoadingProgress(100);
      setLoadingText('Complete!');
      
      // Small delay to show completion
      setTimeout(() => {
        setIsLoading(false);
      }, 500);

    } catch (error) {
      console.error('Error loading analysis history:', error);
      setIsLoading(false);
    }
  };

  const getProgressBarColor = (value: number): readonly [string, string] => {
    if (value >= 80) return ['#10B981', '#34D399']; // Green
    if (value >= 60) return ['#F59E0B', '#FBBF24']; // Orange
    return ['#EF4444', '#F87171']; // Red
  };

  // Color coding function for modal with more vibrant colors
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22C55E'; // Vibrant Green
    if (score >= 60) return '#F97316'; // Vibrant Orange
    return '#EF4444'; // Vibrant Red
  };

  // Normalize display values
  const asDisplay = (value: number): number => {
    return Math.round(value <= 1 ? value * 100 : value);
  };

  const renderProgressBar = (overall: number, potential: number) => {
    // Calculate progress percentage (how close overall is to potential)
    const progressPercentage = potential > 0 ? (overall / potential) : 0;
    const clampedPercentage = Math.min(progressPercentage * 100, 100);
    
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${clampedPercentage}%` }]} />
        </View>
      </View>
    );
  };

  // Modal Components
  const Progress = ({ percent, height = 6 }: { percent: number; height?: number }) => {
    const normalized = percent <= 1 ? percent * 100 : percent;
    const color = getScoreColor(normalized);
    return (
      <View style={[styles.modalProgressTrack, { height }]}>
        <View style={[
          styles.modalProgressFill, 
          { 
            width: `${Math.max(0, Math.min(100, normalized))}%`,
            backgroundColor: color 
          }
        ]} />
      </View>
    );
  };

  const ResultPill = ({ title, value }: { title: string; value: number }) => {
    const display = asDisplay(value);
    return (
      <View style={styles.pillContainer}>
        <LinearGradient colors={['#2B2B2B', '#1A1A1A', '#141414']} style={styles.pill}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)', 'transparent']}
            locations={[0, 0.3, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pillGloss}
            pointerEvents="none"
          />
          <Text style={styles.pillTitle}>{title}</Text>
          <Text style={styles.pillValue}>{display}</Text>
          <Progress percent={display} height={10} />
        </LinearGradient>
      </View>
    );
  };

  const renderAnalysisCard = (analysis: UserRatings, index: number) => {
    const hasImage = analysis.images && analysis.images.length > 0;
    const createdDate = analysis.createdAt?.toDate ? analysis.createdAt.toDate() : new Date();
    const formattedDate = createdDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <TouchableOpacity 
        key={analysis.id || index} 
        style={styles.analysisCard}
        onPress={() => openModal(analysis)}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          {/* Left side - Profile Image */}
          <View style={styles.imageSection}>
            {hasImage ? (
              <Image
                source={{ uri: analysis.images![0].imageUrl }}
                style={styles.profileImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
                placeholder={null}
                onError={(error) => console.warn('Analysis image load error:', error.error)}
              />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          {/* Center - Scores and Progress */}
          <View style={styles.scoresSection}>
            <View style={styles.scoresRow}>
              <View style={styles.scoreColumn}>
                <Text style={styles.scoreLabel}>Overall</Text>
                <Text style={styles.scoreValue}>{analysis.overall}</Text>
              </View>
              <View style={styles.scoreColumn}>
                <Text style={styles.scoreLabel}>Potential</Text>
                <Text style={styles.scoreValue}>{analysis.potential}</Text>
              </View>
            </View>
            {renderProgressBar(analysis.overall, analysis.potential)}
          </View>
        </View>
        
        {/* Decorative click indicator */}
        <View style={styles.clickIndicator} />
        <View style={styles.clickIndicatorArrow} />
      </TouchableOpacity>
    );
  };

  const renderModal = () => {
    if (!selectedAnalysis) return null;

    const hasImage = selectedAnalysis.images && selectedAnalysis.images.length > 0;
    const imageUri = hasImage ? selectedAnalysis.images![0].imageUrl : '';

    return (
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer, 
              { transform: [{ translateY: modalSlideY }] }
            ]}
            {...modalPanResponder.panHandlers}
          >
            {/* Modal Handle */}
            <View style={styles.modalHandle} />
            
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Avatar */}
              <View style={styles.modalHeader}>
                {hasImage ? (
                  <Image source={{ uri: imageUri }} style={styles.modalAvatar} />
                ) : (
                  <View style={[styles.modalAvatar, styles.modalAvatarPlaceholder]}>
                    <Text style={styles.modalAvatarPlaceholderText}>No Image</Text>
                  </View>
                )}
              </View>

              {/* Hero Pills - Overall and Potential */}
              <View style={styles.modalPillsRow}>
                <ResultPill title="Overall" value={selectedAnalysis.overall} />
                <View style={{ width: 28 }} />
                <ResultPill title="Potential" value={selectedAnalysis.potential} />
              </View>

              {/* 2x2 Grid - Detailed Metrics */}
              <View style={styles.modalGrid}>
                <View style={styles.modalGridRow}>
                  <ResultPill title="Hydration" value={selectedAnalysis.hydration} />
                  <View style={{ width: 20 }} />
                  <ResultPill title="Clarity" value={selectedAnalysis.clarity} />
                </View>
                <View style={{ height: 20 }} />
                <View style={styles.modalGridRow}>
                  <ResultPill title="Tone" value={selectedAnalysis.tone} />
                  <View style={{ width: 20 }} />
                  <ResultPill title="Smoothness" value={selectedAnalysis.smoothness} />
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const renderLoadingScreen = () => {
    const spin = spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.loadingContainer}>        
        {/* Loading Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/loadingscreen.png')}
            style={styles.loadingLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
          />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { 
              width: progressValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              })
            }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(loadingProgress)}%</Text>
        </View>

        {/* Loading Text */}
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Animated.View 
          style={[styles.screenContainer, { transform: [{ translateX: slideX }] }]}
          {...screenPanResponder.panHandlers}
        >
          <View style={styles.loadingHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleAnimatedBack}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          </View>
          {renderLoadingScreen()}
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Get latest analysis for header
  const latestAnalysis = analyses[0] || currentUserRatings;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View 
        style={[styles.screenContainer, { transform: [{ translateX: slideX }] }]}
        {...screenPanResponder.panHandlers}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleAnimatedBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Progress History</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main Scores Header */}
        {latestAnalysis && (
          <View style={styles.mainScoresHeader}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Overall</Text>
              <Text style={styles.scoreValue}>{latestAnalysis.overall}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Potential</Text>
              <Text style={styles.scoreValue}>{latestAnalysis.potential}</Text>
            </View>
          </View>
        )}

        {/* Analysis Cards */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {analyses.length > 0 ? (
            analyses.map((analysis, index) => renderAnalysisCard(analysis, index))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No analysis history found</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
      
      {/* Modal */}
      {renderModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Make transparent to show home screen underneath
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000', // Keep screen content black
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingHeader: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 40,
    textAlign: 'center',
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 24 : 16,
    marginTop: Platform.OS === 'android' ? 15 : 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: -6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  mainScoresHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreItem: {
    alignItems: 'center',
    marginHorizontal: 30,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 0,  // Reduced from 4 to bring labels even closer to numbers
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 90,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  analysisCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    height: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 20,
    height: '100%',
    alignItems: 'center',
  },
  clickIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: '#1A1A1A',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  clickIndicatorArrow: {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: [{ translateY: -8 }],
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'rgba(255, 255, 255, 0.6)',
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
  },
  imageSection: {
    alignItems: 'center',
    marginRight: 20,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 8,
  },
  placeholderImage: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
  },

  dateText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  scoresSection: {
    flex: 1,
    justifyContent: 'flex-start',  // Changed from 'center' to align to top
    paddingTop: 0,  // Reduced from 5 to move numbers higher up
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,  // Increased to add more space between numbers and progress bar
  },
  scoreColumn: {
    alignItems: 'center',
  },


  progressBarContainer: {
    width: '100%',
    paddingHorizontal: 4,  // Reduced from 20 to make bar wider
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 6,
  },


  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: MODAL_HEIGHT,
    paddingTop: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,  // Reduced from 40 to move cards up
    marginTop: 15,     // Reduced from 30 to move cards up
  },
  modalAvatar: {
    width: 140,
    height: 140,
    borderRadius: 28,
  },
  modalAvatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  modalPillsRow: {
    flexDirection: 'row',
    marginBottom: 20,  // Reduced from 32 to move grid cards up
  },
  modalGrid: {
    marginBottom: 40,  // Reduced from 60 to give more space at bottom
  },
  modalGridRow: {
    flexDirection: 'row',
  },
  pillContainer: {
    flex: 1,
  },
  pill: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pillGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  pillTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 0,  // Reduced from 12 to bring title closer to top edge
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  pillValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modalProgressTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    overflow: 'hidden',
    height: 10,
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});