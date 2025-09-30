import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { DailyProgress } from './progressService';

// Historical progress data for analytics/charts
export interface HistoricalProgressData {
  [dateString: string]: {
    date: string;
    amProgress: number;
    pmProgress: number;
    overallProgress: number;
    amSteps: { [stepId: string]: boolean };
    pmSteps: { [stepId: string]: boolean };
  };
}

// Generate array of date strings for the past 30 days (excluding today)
const getPast30DaysExcludingToday = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 1; i <= 30; i++) { // Start from 1 to exclude today
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - i);
    
    const dateString = pastDate.getFullYear() + '-' + 
                      String(pastDate.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(pastDate.getDate()).padStart(2, '0');
    dates.push(dateString);
  }
  
  return dates;
};

// Calculate progress percentages for a single day
const calculateDayProgress = (
  dailyProgress: DailyProgress | null,
  amRoutineSteps: number,
  pmRoutineSteps: number
) => {
  if (!dailyProgress) {
    return { amProgress: 0, pmProgress: 0, overallProgress: 0 };
  }

  const amCompleted = Object.values(dailyProgress.amSteps || {}).filter(Boolean).length;
  const pmCompleted = Object.values(dailyProgress.pmSteps || {}).filter(Boolean).length;
  
  const amProgress = amRoutineSteps > 0 ? Math.round((amCompleted / amRoutineSteps) * 100) : 0;
  const pmProgress = pmRoutineSteps > 0 ? Math.round((pmCompleted / pmRoutineSteps) * 100) : 0;
  
  const totalSteps = amRoutineSteps + pmRoutineSteps;
  const totalCompleted = amCompleted + pmCompleted;
  const overallProgress = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;

  return { amProgress, pmProgress, overallProgress };
};

// Fetch 30 days of historical progress data (excluding today)
export const fetchHistoricalProgress = async (
  amRoutineSteps: number = 5, // Default routine sizes
  pmRoutineSteps: number = 4
): Promise<HistoricalProgressData> => {
  try {
    console.log('📊 Fetching 30 days of historical progress data...');
    
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.warn('No authenticated user for historical progress fetch');
      return {};
    }

    const past30Days = getPast30DaysExcludingToday();
    console.log('📅 Fetching historical progress for dates:', past30Days.slice(0, 5), '... (showing first 5 of 30)');
    const historicalData: HistoricalProgressData = {};

    // Fetch all 30 days in parallel for better performance
    const fetchPromises = past30Days.map(async (dateString) => {
      try {
        const doc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .collection('progress')
          .doc(dateString)
          .get();

        console.log(`📄 Document ${dateString} exists: ${doc.exists()}`);
        const dailyProgress = doc.exists() ? (doc.data() as DailyProgress) : null;
        if (dailyProgress) {
          console.log(`📄 Document ${dateString} data:`, dailyProgress);
        }
        const progress = calculateDayProgress(dailyProgress, amRoutineSteps, pmRoutineSteps);

        return {
          dateString,
          docExists: doc.exists(), // Track if document actually exists in Firestore
          data: {
            date: dateString,
            ...progress,
            amSteps: dailyProgress?.amSteps || {},
            pmSteps: dailyProgress?.pmSteps || {},
          }
        };
      } catch (error) {
        console.warn(`Failed to fetch progress for ${dateString}:`, error);
        return {
          dateString,
          docExists: false, // Document doesn't exist due to error
          data: {
            date: dateString,
            amProgress: 0,
            pmProgress: 0,
            overallProgress: 0,
            amSteps: {},
            pmSteps: {},
          }
        };
      }
    });

    // Wait for all fetches to complete
    const results = await Promise.all(fetchPromises);
    
    // Count documents that actually exist in Firestore
    let existingDocuments = 0;
    let totalRequested = results.length;
    
    // Convert array to object and count existing documents
    results.forEach(({ dateString, docExists, data }) => {
      historicalData[dateString] = data;
      // Count documents that actually exist in Firestore
      if (docExists) {
        existingDocuments++;
      }
    });

    console.log(`✅ Successfully fetched historical progress: ${existingDocuments}/${totalRequested} documents found in Firestore, ${totalRequested} total days processed`);
    return historicalData;

  } catch (error) {
    console.error('Error fetching historical progress:', error);
    return {};
  }
};

// Get progress trend (improving, declining, stable)
export const getProgressTrend = (historicalData: HistoricalProgressData): {
  trend: 'improving' | 'declining' | 'stable';
  averageProgress: number;
  recentAverage: number; // Last 7 days
  olderAverage: number;  // Days 8-14
} => {
  const dates = Object.keys(historicalData).sort(); // Sort chronologically
  
  if (dates.length < 7) {
    return { trend: 'stable', averageProgress: 0, recentAverage: 0, olderAverage: 0 };
  }

  // Calculate recent (last 7 days) vs older (days 8-14) averages
  const recent7Days = dates.slice(-7);
  const older7Days = dates.slice(-14, -7);

  const recentAverage = recent7Days.reduce((sum, date) => 
    sum + historicalData[date].overallProgress, 0) / recent7Days.length;
    
  const olderAverage = older7Days.length > 0 
    ? older7Days.reduce((sum, date) => sum + historicalData[date].overallProgress, 0) / older7Days.length
    : recentAverage;

  const overallAverage = dates.reduce((sum, date) => 
    sum + historicalData[date].overallProgress, 0) / dates.length;

  const improvementThreshold = 5; // 5% difference to be considered a trend
  
  let trend: 'improving' | 'declining' | 'stable';
  if (recentAverage > olderAverage + improvementThreshold) {
    trend = 'improving';
  } else if (recentAverage < olderAverage - improvementThreshold) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  return {
    trend,
    averageProgress: Math.round(overallAverage),
    recentAverage: Math.round(recentAverage),
    olderAverage: Math.round(olderAverage),
  };
};
