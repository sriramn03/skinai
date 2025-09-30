import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Progress data structure for a single day
export interface DailyProgress {
  date: string; // YYYY-MM-DD format
  amSteps: { [stepId: string]: boolean };
  pmSteps: { [stepId: string]: boolean };
  updatedAt?: any;
}

// Progress percentages for UI
export interface ProgressStats {
  am: number;
  pm: number;
  overall: number;
}

// Helper function to get today's date in YYYY-MM-DD format
export const getTodayDateString = (): string => {
  const today = new Date();
  return today.getFullYear() + '-' + 
         String(today.getMonth() + 1).padStart(2, '0') + '-' + 
         String(today.getDate()).padStart(2, '0');
};

// Save step completion status to Firestore
export const saveStepCompletion = async (
  date: string,
  period: 'AM' | 'PM',
  stepId: string,
  completed: boolean
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const progressRef = firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('progress')
      .doc(date);

    // Create proper nested object structure
    const updateData: any = {
      date,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    // Add the nested step data
    if (period === 'AM') {
      updateData.amSteps = { [stepId]: completed };
    } else {
      updateData.pmSteps = { [stepId]: completed };
    }
    
    await progressRef.set(updateData, { merge: true });

    console.log(`Step ${stepId} (${period}) marked as ${completed ? 'completed' : 'incomplete'} for ${date}`);
  } catch (error) {
    console.error('Error saving step completion:', error);
    throw error;
  }
};

// Subscribe to progress changes for a specific date
export const subscribeToProgress = (
  date: string,
  callback: (progress: DailyProgress | null) => void
): (() => void) => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    console.warn('No authenticated user for progress subscription');
    callback(null);
    return () => {};
  }

  const progressRef = firestore()
    .collection('users')
    .doc(currentUser.uid)
    .collection('progress')
    .doc(date);

  const unsubscribe = progressRef.onSnapshot(
    (doc) => {
      if (doc.exists()) {
        const data = doc.data() as DailyProgress;
        console.log(`Progress updated for ${date}:`, data);
        callback(data);
      } else {
        console.log(`No progress found for ${date}`);
        callback({
          date,
          amSteps: {},
          pmSteps: {},
        });
      }
    },
    (error) => {
      console.error('Error in progress subscription:', error);
      callback(null);
    }
  );

  return unsubscribe;
};

// Compute progress percentages from progress data
export const computeProgressStats = (
  progress: DailyProgress | null,
  amRoutineSteps: number,
  pmRoutineSteps: number
): ProgressStats => {
  if (!progress || (!amRoutineSteps && !pmRoutineSteps)) {
    return { am: 0, pm: 0, overall: 0 };
  }

  // Count completed AM steps
  const amCompleted = Object.values(progress.amSteps || {}).filter(Boolean).length;
  const amProgress = amRoutineSteps > 0 ? Math.round((amCompleted / amRoutineSteps) * 100) : 0;

  // Count completed PM steps
  const pmCompleted = Object.values(progress.pmSteps || {}).filter(Boolean).length;
  const pmProgress = pmRoutineSteps > 0 ? Math.round((pmCompleted / pmRoutineSteps) * 100) : 0;

  // Overall progress is average of AM and PM (only count routines that exist)
  let overall = 0;
  if (amRoutineSteps > 0 && pmRoutineSteps > 0) {
    overall = Math.round((amProgress + pmProgress) / 2);
  } else if (amRoutineSteps > 0) {
    overall = amProgress;
  } else if (pmRoutineSteps > 0) {
    overall = pmProgress;
  }

  return {
    am: amProgress,
    pm: pmProgress,
    overall,
  };
};

// Get step completion status for a specific step
export const isStepCompleted = (
  progress: DailyProgress | null,
  period: 'AM' | 'PM',
  stepId: string
): boolean => {
  if (!progress) return false;
  
  const steps = period === 'AM' ? progress.amSteps : progress.pmSteps;
  return steps?.[stepId] || false;
};