import { useState, useEffect, useCallback } from 'react';
import { 
  DailyProgress, 
  ProgressStats, 
  subscribeToProgress, 
  saveStepCompletion, 
  computeProgressStats,
  isStepCompleted,
  getTodayDateString 
} from '../services/progressService';
import { SkincareRoutine } from '../services/firestoreService';

interface UseDailyProgressReturn {
  progress: DailyProgress | null;
  stats: ProgressStats;
  isStepCompleted: (period: 'AM' | 'PM', stepId: string) => boolean;
  toggleStep: (period: 'AM' | 'PM', stepId: string) => Promise<void>;
  loading: boolean;
}

export const useDailyProgress = (
  date: string = getTodayDateString(),
  amRoutine: SkincareRoutine | null,
  pmRoutine: SkincareRoutine | null,
  skipSubscription: boolean = false // Flag to skip subscription when App handles it
): UseDailyProgressReturn => {
  console.log(`🎣 [${Date.now()}] useDailyProgress: Hook initializing for date ${date}`);
  
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [loading, setLoading] = useState(false);

  console.log(`📊 [${Date.now()}] useDailyProgress: Initial progress state:`, progress);

  // Subscribe to progress changes only if not skipped
  useEffect(() => {
    if (skipSubscription) {
      console.log(`⏭️ [${Date.now()}] useDailyProgress: Skipping subscription for ${date}`);
      return;
    }
    
    console.log(`🔗 [${Date.now()}] useDailyProgress: Setting up Firestore subscription for ${date}`);
    
    const unsubscribe = subscribeToProgress(date, (progressData) => {
      console.log(`📥 [${Date.now()}] useDailyProgress: Received progress data:`, progressData);
      setProgress(progressData);
      console.log(`🔄 [${Date.now()}] useDailyProgress: State updated, triggering re-render`);
    });

    return () => {
      console.log(`🧹 [${Date.now()}] useDailyProgress: Cleaning up subscription for ${date}`);
      unsubscribe();
    };
  }, [date, skipSubscription]);

  // Compute progress stats
  const stats = computeProgressStats(
    progress,
    amRoutine?.steps?.length || 0,
    pmRoutine?.steps?.length || 0
  );

  console.log('useDailyProgress - Computing stats:');
  console.log('  progress:', progress);
  console.log('  amRoutine steps:', amRoutine?.steps?.length || 0);
  console.log('  pmRoutine steps:', pmRoutine?.steps?.length || 0);
  console.log('  computed stats:', stats);

  // Check if a specific step is completed
  const checkStepCompleted = useCallback((period: 'AM' | 'PM', stepId: string): boolean => {
    const result = isStepCompleted(progress, period, stepId);
    console.log(`Checking step ${stepId} (${period}):`, result, 'Progress:', progress);
    return result;
  }, [progress]);

  // Toggle step completion
  const toggleStep = useCallback(async (period: 'AM' | 'PM', stepId: string): Promise<void> => {
    try {
      const currentStatus = checkStepCompleted(period, stepId);
      const newStatus = !currentStatus;
      
      console.log(`Toggling step ${stepId} (${period}) from ${currentStatus} to ${newStatus}`);
      
      // Save to Firestore - the subscription will update local state
      await saveStepCompletion(date, period, stepId, newStatus);
    } catch (error) {
      console.error('Error toggling step:', error);
      // Could add error handling/toast notification here
    }
  }, [date, checkStepCompleted]);

  return {
    progress,
    stats,
    isStepCompleted: checkStepCompleted,
    toggleStep,
    loading,
  };
};