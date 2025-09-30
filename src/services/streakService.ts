import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Streak data structure
export interface StreakData {
  currentStreak: number;
  lastProgressDate: any | null; // Firestore Timestamp
  lastProgressDateString: string | null; // Date string for easy comparison
  lastResetCheck: any | null; // Firestore Timestamp
  lastResetCheckString: string | null; // Date string for easy comparison
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

// Cache class for quick access to streak data
export class StreakCache {
  private static instance: StreakCache;
  private currentStreak: number = 0;
  private isInitialized: boolean = false;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): StreakCache {
    if (!StreakCache.instance) {
      StreakCache.instance = new StreakCache();
    }
    return StreakCache.instance;
  }

  setCurrentStreak(streak: number): void {
    this.currentStreak = streak;
    this.isInitialized = true;
  }

  getCurrentStreak(): number {
    return this.currentStreak;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  reset(): void {
    this.currentStreak = 0;
    this.isInitialized = false;
    this.userId = null;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  getUserId(): string | null {
    return this.userId;
  }
}

// Helper function to get date string in user's timezone
export const getDateString = (date: Date): string => {
  return date.getFullYear() + '-' + 
         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
         String(date.getDate()).padStart(2, '0');
};

// Helper function to convert Firestore timestamp to local date string
const timestampToDateString = (timestamp: any | null): string | null => {
  if (!timestamp) return null;
  return getDateString(timestamp.toDate());
};

// Helper function to get the start of day in user's timezone
const getStartOfDay = (date: Date): Date => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
};

// Initialize streak for a new user
export const initializeStreak = async (userId: string): Promise<number> => {
  try {
    console.log('[StreakService] Initializing streak for user:', userId);
    
    const streakRef = firestore()
      .collection('users')
      .doc(userId)
      .collection('streak')
      .doc('current');

    const streakDoc = await streakRef.get();

    if (!streakDoc.exists) {
      const initialData: StreakData = {
        currentStreak: 0,
        lastProgressDate: null,
        lastProgressDateString: null,
        lastResetCheck: firestore.FieldValue.serverTimestamp(),
        lastResetCheckString: getDateString(new Date()),
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await streakRef.set(initialData);
      console.log('[StreakService] Streak initialized with default values');
      
      // Update cache
      StreakCache.getInstance().setCurrentStreak(0);
      return 0;
    } else {
      // Streak already exists, get current value and update cache
      const data = streakDoc.data();
      const currentStreak = data?.currentStreak || 0;
      StreakCache.getInstance().setCurrentStreak(currentStreak);
      return currentStreak;
    }
  } catch (error) {
    console.error('[StreakService] Error initializing streak:', error);
    // Return 0 as fallback, don't throw
    StreakCache.getInstance().setCurrentStreak(0);
    return 0;
  }
};

// Increment streak when progress is made
export const incrementStreak = async (userId: string): Promise<number> => {
  try {
    console.log('[StreakService] Incrementing streak for user:', userId);
    
    const streakRef = firestore()
      .collection('users')
      .doc(userId)
      .collection('streak')
      .doc('current');

    const now = new Date();
    const todayString = getDateString(now);

    return await firestore().runTransaction(async (transaction) => {
      const streakDoc = await transaction.get(streakRef);
      
      if (!streakDoc.exists) {
        // Initialize if doesn't exist
        const initialData: StreakData = {
          currentStreak: 1,
          lastProgressDate: firestore.FieldValue.serverTimestamp(),
          lastProgressDateString: todayString,
          lastResetCheck: firestore.FieldValue.serverTimestamp(),
          lastResetCheckString: todayString,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };
        transaction.set(streakRef, initialData);
        
        StreakCache.getInstance().setCurrentStreak(1);
        return 1;
      }

      const data = streakDoc.data();
      if (!data) {
        console.log('[StreakService] Empty streak document data, treating as new user');
        // Initialize with first streak
        const initialData: StreakData = {
          currentStreak: 1,
          lastProgressDate: firestore.FieldValue.serverTimestamp(),
          lastProgressDateString: todayString,
          lastResetCheck: firestore.FieldValue.serverTimestamp(),
          lastResetCheckString: todayString,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };
        transaction.set(streakRef, initialData);
        
        StreakCache.getInstance().setCurrentStreak(1);
        return 1;
      }

      const lastProgressDateString = data.lastProgressDateString || timestampToDateString(data.lastProgressDate);

      // Check if we already incremented today
      if (lastProgressDateString === todayString) {
        console.log('[StreakService] Streak already incremented today');
        return data.currentStreak || 0;
      }

      // Increment the streak
      const currentStreak = data.currentStreak || 0;
      const newStreak = currentStreak + 1;
      transaction.update(streakRef, {
        currentStreak: newStreak,
        lastProgressDate: firestore.FieldValue.serverTimestamp(),
        lastProgressDateString: todayString,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[StreakService] Streak incremented from ${data.currentStreak} to ${newStreak}`);
      
      // Update cache
      StreakCache.getInstance().setCurrentStreak(newStreak);
      
      return newStreak;
    });
  } catch (error) {
    console.error('[StreakService] Error incrementing streak:', error);
    throw error;
  }
};

// Check and reset streak if needed
export const checkAndResetStreak = async (userId: string): Promise<boolean> => {
  try {
    console.log('[StreakService] Checking if streak needs reset for user:', userId);
    
    const streakRef = firestore()
      .collection('users')
      .doc(userId)
      .collection('streak')
      .doc('current');

    const now = new Date();
    const todayString = getDateString(now);
    const yesterdayString = getDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    return await firestore().runTransaction(async (transaction) => {
      const streakDoc = await transaction.get(streakRef);
      
      if (!streakDoc.exists) {
        console.log('[StreakService] No streak document found during reset check, will initialize');
        return false; // Let initializeStreak handle this
      }

      const data = streakDoc.data();
      if (!data) {
        console.log('[StreakService] Empty streak document data, skipping reset');
        return false;
      }
      const lastProgressDateString = data.lastProgressDateString || timestampToDateString(data.lastProgressDate);
      const lastResetCheckString = data.lastResetCheckString || timestampToDateString(data.lastResetCheck);

      // Check if we already checked today
      if (lastResetCheckString === todayString) {
        console.log('[StreakService] Already checked for reset today');
        return false;
      }

      // Update last reset check
      transaction.update(streakRef, {
        lastResetCheck: firestore.FieldValue.serverTimestamp(),
        lastResetCheckString: todayString,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // If no progress has been made yet, don't reset
      if (!lastProgressDateString) {
        console.log('[StreakService] No progress date found, not resetting');
        return false;
      }

      // If progress was made today or yesterday, streak continues
      if (lastProgressDateString === todayString || lastProgressDateString === yesterdayString) {
        console.log('[StreakService] Progress made recently, streak continues');
        return false;
      }

      // Calculate days since last progress
      if (!data.lastProgressDate) {
        console.log('[StreakService] No lastProgressDate, not resetting');
        return false;
      }
      
      const lastProgressDate = data.lastProgressDate.toDate();
      const daysSinceProgress = Math.floor((now.getTime() - lastProgressDate.getTime()) / (24 * 60 * 60 * 1000));

      if (daysSinceProgress > 1) {
        // Reset streak
        console.log(`[StreakService] ${daysSinceProgress} days since last progress, resetting streak`);
        
        transaction.update(streakRef, {
          currentStreak: 0,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        // Update cache
        StreakCache.getInstance().setCurrentStreak(0);
        
        return true; // Streak was reset
      }

      return false; // Streak not reset
    });
  } catch (error) {
    console.error('[StreakService] Error checking/resetting streak:', error);
    throw error;
  }
};

// Get current streak data
export const getStreakData = async (userId: string): Promise<StreakData | null> => {
  try {
    const streakDoc = await firestore()
      .collection('users')
      .doc(userId)
      .collection('streak')
      .doc('current')
      .get();

    if (!streakDoc.exists) {
      console.log('[StreakService] No streak document found, initializing...');
      // Initialize streak and return default data
      await initializeStreak(userId);
      return {
        currentStreak: 0,
        lastProgressDate: null,
        lastProgressDateString: null,
        lastResetCheck: null,
        lastResetCheckString: null,
        createdAt: null,
        updatedAt: null,
      };
    }

    const data = streakDoc.data();
    const currentStreak = data?.currentStreak || 0;
    
    // Update cache
    StreakCache.getInstance().setCurrentStreak(currentStreak);
    
    return data as StreakData;
  } catch (error) {
    console.error('[StreakService] Error fetching streak data:', error);
    // Return default data as fallback
    StreakCache.getInstance().setCurrentStreak(0);
    return {
      currentStreak: 0,
      lastProgressDate: null,
      lastProgressDateString: null,
      lastResetCheck: null,
      lastResetCheckString: null,
      createdAt: null,
      updatedAt: null,
    };
  }
};

// Set up real-time listener for progress collection
export const setupProgressListener = (userId: string): (() => void) => {
  console.log('[StreakService] Setting up progress listener for user:', userId);
  
  const progressRef = firestore()
    .collection('users')
    .doc(userId)
    .collection('progress');

  // Track processed dates to avoid duplicate increments
  const processedDates = new Set<string>();

  const unsubscribe = progressRef.onSnapshot(
    (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const progressData = change.doc.data();
          const progressDate = change.doc.id; // Document ID is the date
          
          // Check if we've already processed this date
          if (processedDates.has(progressDate)) {
            console.log(`[StreakService] Already processed progress for date: ${progressDate}`);
            return;
          }

          // Check if progress was actually made (any steps completed)
          const hasAmProgress = progressData.amSteps && Object.values(progressData.amSteps).some(v => v === true);
          const hasPmProgress = progressData.pmSteps && Object.values(progressData.pmSteps).some(v => v === true);
          
          if (hasAmProgress || hasPmProgress) {
            console.log(`[StreakService] Progress detected for date: ${progressDate}`);
            processedDates.add(progressDate);
            
            // Only increment if it's today's progress
            const todayString = getDateString(new Date());
            if (progressDate === todayString) {
              await incrementStreak(userId);
            }
          }
        }
      });
    },
    (error) => {
      console.error('[StreakService] Error in progress listener:', error);
    }
  );

  return unsubscribe;
};

// Set up real-time listener for streak updates
export const subscribeToStreak = (
  userId: string,
  callback: (streak: number) => void
): (() => void) => {
  const streakRef = firestore()
    .collection('users')
    .doc(userId)
    .collection('streak')
    .doc('current');

  const unsubscribe = streakRef.onSnapshot(
    (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const currentStreak = data?.currentStreak || 0;
        
        // Update cache
        StreakCache.getInstance().setCurrentStreak(currentStreak);
        
        callback(currentStreak);
      } else {
        // Document doesn't exist, initialize it
        console.log('[StreakService] Streak document missing in subscription, initializing...');
        initializeStreak(userId).catch(console.error);
        callback(0);
      }
    },
    (error) => {
      console.error('[StreakService] Error in streak subscription:', error);
      callback(0);
    }
  );

  return unsubscribe;
};

// Main initialization function to be called on app startup
export const initializeStreakSystem = async (): Promise<{
  currentStreak: number;
  unsubscribeProgress: () => void;
  unsubscribeStreak: (callback: (streak: number) => void) => (() => void);
}> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const userId = currentUser.uid;
    
    // Set userId in cache
    StreakCache.getInstance().setUserId(userId);

    // Initialize streak if needed and get initial value
    const initialStreak = await initializeStreak(userId);

    // Check and reset streak if needed
    await checkAndResetStreak(userId);

    // Get current streak data after potential reset
    const streakData = await getStreakData(userId);
    const currentStreak = streakData?.currentStreak ?? initialStreak;

    // Set up progress listener
    const unsubscribeProgress = setupProgressListener(userId);

    console.log('[StreakService] Streak system initialized successfully with streak:', currentStreak);

    // Return current streak and unsubscribe functions
    return {
      currentStreak,
      unsubscribeProgress,
      unsubscribeStreak: (callback: (streak: number) => void) => subscribeToStreak(userId, callback),
    };
  } catch (error) {
    console.error('[StreakService] Error initializing streak system:', error);
    // Return safe defaults instead of throwing
    StreakCache.getInstance().setCurrentStreak(0);
    return {
      currentStreak: 0,
      unsubscribeProgress: () => {}, // No-op function
      unsubscribeStreak: () => () => {}, // Returns no-op function
    };
  }
};
