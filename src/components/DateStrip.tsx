import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, TouchableOpacity } from 'react-native';
import { useGlobalCurrentDate } from '../contexts/DateContext';
import { HistoricalProgressData } from '../services/historicalProgressService';

interface DateStripProps {
  historicalProgress: HistoricalProgressData;
  onDateSelect?: (dateString: string, dayData: any) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeekFor(date: Date) {
  const s = new Date(date);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

function fmt(date: Date) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
}

export default function DateStrip({ historicalProgress, onDateSelect }: DateStripProps) {
  // Global date that updates at midnight
  const currentDate = useGlobalCurrentDate();

  // 0 = current week, -1 = previous week, up to -3
  const [weekOffset, setWeekOffset] = useState<number>(0);
  
  // Track selected date - start with today
  const [selectedDate, setSelectedDate] = useState<string | null>(currentDate);

  // Reset to current week and set today as selected on any date change (e.g., midnight → new day/week)
  useEffect(() => {
    setWeekOffset(0);
    setSelectedDate(currentDate); // Start with today selected
  }, [currentDate]);

  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
        onPanResponderMove: (_, g) => {
          // Allow both directions with clamping
          let dx = g.dx;
          if (dx < -80) dx = -80;
          if (dx > 80) dx = 80;
          translateX.setValue(dx);
        },
        onPanResponderRelease: (_, g) => {
          const THRESHOLD = 50;
          const atOldest = weekOffset <= -3;
          const atCurrent = weekOffset >= 0;

          if (g.dx > THRESHOLD && !atOldest) {
            // Swipe right: Launch to previous week (older)
            Animated.timing(translateX, {
              toValue: 120,
              duration: 120,
              useNativeDriver: true,
            }).start(() => {
              setWeekOffset((p) => p - 1);
              translateX.setValue(-30);
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 8,
              }).start();
            });
          } else if (g.dx < -THRESHOLD && !atCurrent) {
            // Swipe left: Launch to next week (newer)
            Animated.timing(translateX, {
              toValue: -120,
              duration: 120,
              useNativeDriver: true,
            }).start(() => {
              setWeekOffset((p) => p + 1);
              translateX.setValue(30);
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 8,
              }).start();
            });
          } else {
            // Bounce back (when at limits or threshold not met)
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 8,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        },
      }),
    [translateX, weekOffset]
  );

  // Compute the displayed week from currentDate and weekOffset
  const weekData = useMemo(() => {
    const [y, m, d] = currentDate.split('-').map((n) => parseInt(n, 10));
    const base = new Date(y, m - 1, d);
    const target = addDays(base, weekOffset * 7);
    const start = startOfWeekFor(target);
    const currentDay = new Date(y, m - 1, d).getDay();

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(start, i);
      const dateStr = fmt(date);

      const isCurrentWeek = weekOffset === 0;
      const isToday = isCurrentWeek && i === currentDay;
      const isPastDay = weekOffset < 0 ? true : i < currentDay;
      const hasProgress =
        isPastDay &&
        historicalProgress[dateStr] &&
        (historicalProgress[dateStr].overallProgress > 0);
      const isSelected = selectedDate === dateStr;

      return {
        letter: weekDays[i],
        day: date.getDate(),
        dateStr,
        isToday,
        hasProgress,
        isSelected,
        dayData: historicalProgress[dateStr] || null,
      };
    });
  }, [currentDate, weekOffset, historicalProgress, selectedDate]);

  const handleDatePress = (item: any) => {
    // Get current date parts for comparison
    const [y, m, d] = currentDate.split('-').map((n) => parseInt(n, 10));
    const today = new Date(y, m - 1, d);
    const itemDate = new Date(item.dateStr);
    
    // Don't allow clicking on future dates
    if (itemDate > today) {
      return;
    }
    
    // If clicking on today, recalibrate selection and update view
    if (item.isToday) {
      setSelectedDate(currentDate);
      if (onDateSelect) {
        onDateSelect(currentDate, null); // null for today (use live data)
      }
      return;
    }
    
    // For any other past date, select it
    setSelectedDate(item.dateStr);
    if (onDateSelect) {
      onDateSelect(item.dateStr, item.dayData);
    }
  };

  return (
    <Animated.View
      style={[styles.dateStripContainer, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {weekData.map((item, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.dayContainer}
          onPress={() => handleDatePress(item)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.dayCircle,
              item.isToday && styles.todayCircle,
              item.hasProgress && styles.progressCircle,
            ]}
          >
            <Text
              style={[
                styles.dayLetter,
                item.isToday && styles.todayLetter,
                item.hasProgress && styles.progressLetter,
              ]}
            >
              {item.letter}
            </Text>
          </View>
          <Text
            style={[
              styles.dayNumber,
              item.isSelected ? styles.selectedNumber : (
                item.isToday ? styles.todayNumber : (
                  item.hasProgress ? styles.progressNumber : null
                )
              ),
            ]}
          >
            {item.day}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dateStripContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayCircle: {
    borderColor: '#8B5CF6',
    borderStyle: 'solid',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  progressCircle: {
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  dayLetter: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  todayLetter: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  progressLetter: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  dayNumber: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  todayNumber: {
    color: '#8B5CF6', // Purple color for today when not selected
    fontWeight: '700',
  },
  progressNumber: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  selectedNumber: {
    color: '#FFFFFF', // White color only for selected day
    fontWeight: '700',
  },
});
