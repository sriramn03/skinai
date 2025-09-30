import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { SkincareRoutine, getSkincareRoutine } from './firestoreService';

// Cache class for quick access to routine data (in-memory only)
export class RoutineCache {
  private static instance: RoutineCache;
  private amRoutine: SkincareRoutine | null = null;
  private pmRoutine: SkincareRoutine | null = null;
  private isInitialized: boolean = false;
  private userId: string | null = null;
  private listeners: Set<(amRoutine: SkincareRoutine | null, pmRoutine: SkincareRoutine | null) => void> = new Set();
  private unsubscribers: (() => void)[] = [];

  private constructor() {}

  static getInstance(): RoutineCache {
    if (!RoutineCache.instance) {
      RoutineCache.instance = new RoutineCache();
    }
    return RoutineCache.instance;
  }

  // Set routines and notify listeners
  setRoutines(amRoutine: SkincareRoutine | null, pmRoutine: SkincareRoutine | null): void {
    console.log('[RoutineCache] Updating routines in cache');
    this.amRoutine = amRoutine;
    this.pmRoutine = pmRoutine;
    this.isInitialized = true;
    this.notifyListeners();
  }

  // Get cached routines immediately (no async)
  getRoutines(): { amRoutine: SkincareRoutine | null; pmRoutine: SkincareRoutine | null } {
    return {
      amRoutine: this.amRoutine,
      pmRoutine: this.pmRoutine
    };
  }

  // Check if cache is ready
  isReady(): boolean {
    return this.isInitialized;
  }

  // Subscribe to routine changes
  subscribe(callback: (amRoutine: SkincareRoutine | null, pmRoutine: SkincareRoutine | null) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current data if available
    if (this.isInitialized) {
      callback(this.amRoutine, this.pmRoutine);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of changes
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      callback(this.amRoutine, this.pmRoutine);
    });
  }

  // Set up real-time listeners for routine updates
  setupRealtimeListeners(userId: string): void {
    console.log('[RoutineCache] Setting up real-time listeners for user:', userId);
    
    // Clean up existing listeners
    this.cleanup();

    // Listen to AM routine changes
    const amUnsubscribe = firestore()
      .collection('users')
      .doc(userId)
      .collection('skincare')
      .doc('AM')
      .onSnapshot(
        (doc) => {
          const amData = doc.exists() ? (doc.data() as SkincareRoutine) : null;
          console.log('[RoutineCache] AM routine updated via listener:', amData?.steps?.length || 0, 'steps');
          this.setRoutines(amData, this.pmRoutine);
        },
        (error) => {
          console.error('[RoutineCache] Error in AM routine listener:', error);
        }
      );

    // Listen to PM routine changes
    const pmUnsubscribe = firestore()
      .collection('users')
      .doc(userId)
      .collection('skincare')
      .doc('PM')
      .onSnapshot(
        (doc) => {
          const pmData = doc.exists() ? (doc.data() as SkincareRoutine) : null;
          console.log('[RoutineCache] PM routine updated via listener:', pmData?.steps?.length || 0, 'steps');
          this.setRoutines(this.amRoutine, pmData);
        },
        (error) => {
          console.error('[RoutineCache] Error in PM routine listener:', error);
        }
      );

    this.unsubscribers = [amUnsubscribe, pmUnsubscribe];
  }

  // Clean up listeners
  cleanup(): void {
    console.log('[RoutineCache] Cleaning up listeners');
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }

  // Reset cache (for logout)
  reset(): void {
    console.log('[RoutineCache] Resetting cache');
    this.cleanup();
    this.amRoutine = null;
    this.pmRoutine = null;
    this.isInitialized = false;
    this.userId = null;
    this.listeners.clear();
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  getUserId(): string | null {
    return this.userId;
  }
}

// Hook for using routine cache in components
export const useRoutineCache = () => {
  const [routines, setRoutines] = useState<{
    amRoutine: SkincareRoutine | null;
    pmRoutine: SkincareRoutine | null;
  }>({ amRoutine: null, pmRoutine: null });
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cache = RoutineCache.getInstance();
    
    // Get initial data if cache is ready
    if (cache.isReady()) {
      setRoutines(cache.getRoutines());
      setIsLoading(false);
    }

    // Subscribe to changes
    const unsubscribe = cache.subscribe((amRoutine, pmRoutine) => {
      setRoutines({ amRoutine, pmRoutine });
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return { ...routines, isLoading };
};

// Initialize routine cache system - called on app startup
export const initializeRoutineCache = async (): Promise<{
  amRoutine: SkincareRoutine | null;
  pmRoutine: SkincareRoutine | null;
  unsubscribe: () => void;
}> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const userId = currentUser.uid;
    const cache = RoutineCache.getInstance();
    
    // Set userId in cache
    cache.setUserId(userId);

    console.log('[RoutineCache] Initializing routine cache for user:', userId);

    // 1. Initial fetch to populate cache
    console.log('[RoutineCache] Fetching initial routine data...');
    const [amRoutine, pmRoutine] = await Promise.all([
      getSkincareRoutine('AM'),
      getSkincareRoutine('PM')
    ]);

    // 2. Set initial data in cache
    cache.setRoutines(amRoutine, pmRoutine);
    console.log('[RoutineCache] Initial routines loaded:', {
      amSteps: amRoutine?.steps?.length || 0,
      pmSteps: pmRoutine?.steps?.length || 0
    });

    // 3. Set up real-time listeners for future updates
    cache.setupRealtimeListeners(userId);

    console.log('[RoutineCache] Routine cache initialized successfully');

    return {
      amRoutine,
      pmRoutine,
      unsubscribe: () => cache.cleanup()
    };
  } catch (error) {
    console.error('[RoutineCache] Error initializing routine cache:', error);
    
    // Return safe defaults
    const cache = RoutineCache.getInstance();
    cache.setRoutines(null, null);
    
    return {
      amRoutine: null,
      pmRoutine: null,
      unsubscribe: () => {}
    };
  }
};