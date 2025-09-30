import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import SettingsModal from '../components/SettingsModal';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { UserSkinData, UserRatings, SkincareRoutine } from '../services/firestoreService';
import { HistoricalProgressData } from '../services/historicalProgressService';
import imagePrefetchService from '../services/imagePrefetchService';
import { computeProgressStats } from '../services/progressService';
import { useGlobalCurrentDate } from '../contexts/DateContext';
import DateStrip from '../components/DateStrip';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import StreakIcon from '../components/StreakIcon';

interface HomePageProps {
  userData: UserSkinData | null;
  userRatings: UserRatings | null;
  historicalProgress: HistoricalProgressData;
  amRoutine: SkincareRoutine | null;
  pmRoutine: SkincareRoutine | null;
  onViewProgress?: () => void;
  currentStreak?: number;
  todayProgress?: any;
}

export default function HomePage({ userData, userRatings, historicalProgress, amRoutine, pmRoutine, onViewProgress, currentStreak = 0, todayProgress }: HomePageProps) {
  // Console log to validate what HomePage receives
  console.log('HomePage - Received routine props:');
  console.log('  amRoutine:', amRoutine ? `${amRoutine.steps?.length || 0} steps` : 'NULL');
  console.log('  pmRoutine:', pmRoutine ? `${pmRoutine.steps?.length || 0} steps` : 'NULL');

  // Get live date that updates at midnight from global context
  const currentDate = useGlobalCurrentDate();
  
  // Use passed progress data instead of setting up subscription
  console.log('HomePage - Received todayProgress:', todayProgress);
  
  // Memoize stats calculation to prevent unnecessary recalculation
  const stats = useMemo(() => {
    return computeProgressStats(
      todayProgress,
      amRoutine?.steps?.length || 0,
      pmRoutine?.steps?.length || 0
    );
  }, [todayProgress, amRoutine?.steps?.length, pmRoutine?.steps?.length]);
  
  console.log('HomePage - Progress stats calculated:', stats);

  // Selected date state for historical view
  const [selectedDate, setSelectedDate] = useState<string>(currentDate);
  const [selectedDayData, setSelectedDayData] = useState<any>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Prefetch analysis image when userRatings changes
  useEffect(() => {
    if (userRatings?.images && userRatings.images.length > 0) {
      imagePrefetchService.prefetchNewAnalysisImage(userRatings.images[0].imageUrl);
    }
  }, [userRatings]);

  // Use live progress stats for today, historical data for selected date
  const isToday = selectedDate === currentDate;
  const displayData = isToday ? {
    amProgress: stats.am,
    pmProgress: stats.pm,
    overallProgress: stats.overall
  } : (selectedDayData ? {
    amProgress: selectedDayData.amProgress,
    pmProgress: selectedDayData.pmProgress,
    overallProgress: selectedDayData.overallProgress
  } : {
    amProgress: 0,
    pmProgress: 0,
    overallProgress: 0
  });

  const amProgress = displayData.amProgress;
  const pmProgress = displayData.pmProgress;
  const overallProgress = displayData.overallProgress;

  const handleDateSelect = (dateString: string, dayData: any) => {
    setSelectedDate(dateString);
    setSelectedDayData(dayData); // null for today, actual data for historical days
  };

  // Reset selected date when current date changes (midnight)
  useEffect(() => {
    setSelectedDate(currentDate);
    setSelectedDayData(null);
  }, [currentDate]);

  const CircularProgress = ({ progress, size, strokeWidth, children }: {
    progress: number;
    size: number;
    strokeWidth: number;
    children: React.ReactNode;
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#333333"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#8B5CF6"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        
        <View style={[styles.progressContent, { width: size, height: size }]}>
          {children}
        </View>
      </View>
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
      {/* App Logos */}
      <View style={styles.logoContainer}>
        <TouchableOpacity style={styles.settingsIcon} onPress={() => setSettingsModalVisible(true)}>
          <Feather name="settings" size={28} color="#C084FC" />
        </TouchableOpacity>
        <Image
          source={require('../../assets/logo.png')}
          style={[styles.appLogo, styles.leftLogo]}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
        />
        <Image
          source={require('../../assets/logo2.png')}
          style={[styles.appLogo, styles.rightLogo]}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
        />
        <View style={styles.streakIconContainer}>
          <StreakIcon streak={currentStreak} />
        </View>
      </View>

      {/* CalAI Date Strip */}
      <DateStrip 
        historicalProgress={historicalProgress} 
        onDateSelect={handleDateSelect}
      />
      
      {/* Main Overall Progress Card */}
      <View style={styles.mainCard}>
        <View style={styles.mainCardContent}>
          <View style={styles.mainCardLeft}>
            <Text style={styles.mainCardTitle}>Skincare Tasks </Text>
            <Text style={styles.mainProgressText}>{overallProgress}%</Text>
          </View>
          <View style={styles.mainCardRight}>
            <CircularProgress progress={overallProgress} size={100} strokeWidth={10}>
              <View style={styles.ringCenter} />
            </CircularProgress>
          </View>
        </View>
      </View>

      {/* AM and PM Progress Cards */}
      <View style={styles.routineCardsContainer}>
        <View style={styles.routineCard}>
          <Text style={styles.routineCardTitle}>AM Routine</Text>
          <CircularProgress progress={amProgress} size={80} strokeWidth={8}>
            <Text style={styles.routineIcon}>☀️</Text>
          </CircularProgress>
          <Text style={styles.routineProgress}>{amProgress}%</Text>
        </View>
        
        <View style={styles.routineCard}>
          <Text style={styles.routineCardTitle}>PM Routine</Text>
          <CircularProgress progress={pmProgress} size={80} strokeWidth={8}>
            <Text style={styles.routineIcon}>🌙</Text>
          </CircularProgress>
          <Text style={styles.routineProgress}>{pmProgress}%</Text>
        </View>
      </View>

      {/* View Progress Section */}
      {userRatings && userRatings.images && userRatings.images.length > 0 && (
        <>
          <Text style={styles.viewProgressHeader}>View Progress</Text>
          <TouchableOpacity 
            style={styles.progressCard} 
            activeOpacity={0.8}
            onPress={onViewProgress}
          >
            <View style={styles.progressCardContent}>
              <View style={styles.profileImageContainer}>
                <Image 
                  source={{ uri: userRatings.images[0].imageUrl }}
                  style={styles.profileImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={Platform.OS === 'android' ? 0 : 200} // Remove transition on Android only
                  placeholder={null}
                  priority={Platform.OS === 'android' ? "high" : undefined} // High priority on Android only
                  onError={(error) => console.warn('Analysis image load error:', error.error)}
                />
              </View>
              
              <View style={styles.scoresContainer}>
                <View style={styles.scoreSection}>
                  <Text style={styles.scoreLabel}>Overall</Text>
                  <Text style={styles.scoreValue}>{userRatings.overall}</Text>
                </View>
                
                <View style={styles.scoreSection}>
                  <Text style={styles.scoreLabel}>Potential</Text>
                  <View style={styles.potentialContainer}>
                    <Text style={styles.scoreValue}>{userRatings.potential}</Text>
                    <Text style={styles.potentialChange}>+{userRatings.potential - userRatings.overall}</Text>
                    <Text style={styles.potentialArrow}>↗</Text>
                  </View>
                </View>
              </View>

              <View style={styles.progressBarContainer}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBar, { width: `${Math.min(userRatings.overall, 100)}%` }]}
                />
              </View>

              {/* Decorative click indicator */}
              <View style={styles.clickIndicator} />
              <View style={styles.clickIndicatorArrow} />
            </View>
          </TouchableOpacity>
        </>
      )}

      <SettingsModal 
        visible={settingsModalVisible} 
        onClose={() => setSettingsModalVisible(false)} 
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
    paddingBottom: 100, // Extra bottom padding to ensure full scrollability
    flexGrow: 1,
  },
  dateHeader: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  dateHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  mainCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  mainCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainCardLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  mainCardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  mainProgressText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ringCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
  },
  routineCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  routineCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 20,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  routineCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  routineIcon: {
    fontSize: 24,
  },
  routineProgress: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  progressContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewProgressHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    marginTop: 8,
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  progressCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  progressCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  scoresContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  scoreSection: {
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 52,
  },
  potentialContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  potentialChange: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  potentialArrow: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 0,
  },
  clickIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
    backgroundColor: '#1A1A1A',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  clickIndicatorArrow: {
    position: 'absolute',
    right: 10,
    top: '60%',
    transform: [{ translateY: -6 }],
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'rgba(255, 255, 255, 0.6)',
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
  },
  
  // Logo styles
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 35 : 15, // Moved down more
    paddingHorizontal: -5,
    marginLeft: -68,
    marginBottom: -10,
    position: 'relative',
  },
  appLogo: {
    width: 80,
    height: 80,
  },
  leftLogo: {
    marginRight: 12,
    marginLeft: 50, // Add space for settings icon
  },
  rightLogo: {
    marginLeft: -28,
  },
  settingsIcon: {
    position: 'absolute',
    left: 305,
    top: Platform.OS === 'android' ? 51 : 31, // Lower on Android (31 + 20)
    padding: 8,
    zIndex: 1,
  },
  streakIconContainer: {
    position: 'absolute',
    right: 5,
    top: Platform.OS === 'android' ? 53 : 33, // Lower on Android (33 + 20)
  },
});