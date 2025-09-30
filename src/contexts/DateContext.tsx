import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { getTodayDateString } from '../services/progressService';

interface DateContextType {
  currentDate: string;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDate, setCurrentDate] = useState(() => getTodayDateString());

  useEffect(() => {
    console.log(`🌐 Global date tracking setup for: ${currentDate}`);
    
    // Real-time midnight detection
    const setupMidnightTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      console.log(`⏰ Global midnight timer: ${Math.round(msUntilMidnight / 1000 / 60)} minutes until rollover`);
      
      return setTimeout(() => {
        const newDate = getTodayDateString();
        console.log(`🕛 GLOBAL MIDNIGHT DETECTED! Rolling from ${currentDate} → ${newDate}`);
        setCurrentDate(newDate);
      }, msUntilMidnight + 1000);
    };
    
    // App backgrounded → foreground detection
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        const freshDate = getTodayDateString();
        if (freshDate !== currentDate) {
          console.log(`📱 Global app resumed on new day: ${currentDate} → ${freshDate}`);
          setCurrentDate(freshDate);
        } else {
          // Same day but timer might be stale → reset it anyway
          setupMidnightTimer();
        }
      }
    };

    const midnightTimer = setupMidnightTimer();
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearTimeout(midnightTimer);
      appStateSubscription?.remove();
      console.log(`🧹 Global date tracking cleanup for: ${currentDate}`);
    };
  }, [currentDate]);

  return (
    <DateContext.Provider value={{ currentDate }}>
      {children}
    </DateContext.Provider>
  );
};

export const useGlobalCurrentDate = (): string => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useGlobalCurrentDate must be used within a DateProvider');
  }
  return context.currentDate;
};
