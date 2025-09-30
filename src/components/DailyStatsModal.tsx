import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

interface DailyStatsModalProps {
  visible: boolean;
  onClose: () => void;
  dateString: string;
  dayData: {
    date: string;
    amProgress: number;
    pmProgress: number;
    overallProgress: number;
    amSteps: { [stepId: string]: boolean };
    pmSteps: { [stepId: string]: boolean };
  } | null;
}

const { width } = Dimensions.get('window');

export default function DailyStatsModal({ visible, onClose, dateString, dayData }: DailyStatsModalProps) {
  if (!dayData) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1}>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Daily Progress</Text>
                <Text style={styles.headerDate}>{formatDate(dateString)}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No data available for this day</Text>
                <Text style={styles.noDataSubtext}>Start your routine to see progress here!</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

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
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Daily Progress</Text>
              <Text style={styles.headerDate}>{formatDate(dateString)}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Main Overall Progress Card */}
            <View style={styles.mainCard}>
              <View style={styles.mainCardContent}>
                <View style={styles.mainCardLeft}>
                  <Text style={styles.mainCardTitle}>AM+PM Tasks Done</Text>
                  <Text style={styles.mainProgressText}>{dayData.overallProgress}%</Text>
                </View>
                <View style={styles.mainCardRight}>
                  <CircularProgress progress={dayData.overallProgress} size={100} strokeWidth={10}>
                    <View style={styles.ringCenter} />
                  </CircularProgress>
                </View>
              </View>
            </View>

            {/* AM and PM Progress Cards */}
            <View style={styles.routineCardsContainer}>
              <View style={styles.routineCard}>
                <Text style={styles.routineCardTitle}>AM Routine</Text>
                <CircularProgress progress={dayData.amProgress} size={80} strokeWidth={8}>
                  <Text style={styles.routineIcon}>☀️</Text>
                </CircularProgress>
                <Text style={styles.routineProgress}>{dayData.amProgress}%</Text>
              </View>
              
              <View style={styles.routineCard}>
                <Text style={styles.routineCardTitle}>PM Routine</Text>
                <CircularProgress progress={dayData.pmProgress} size={80} strokeWidth={8}>
                  <Text style={styles.routineIcon}>🌙</Text>
                </CircularProgress>
                <Text style={styles.routineProgress}>{dayData.pmProgress}%</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    borderRadius: 24,
    padding: 24,
    margin: 20,
    width: width - 40,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  mainCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  mainProgressText: {
    fontSize: 40,
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
  },
  routineCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 12,
    textAlign: 'center',
  },
  routineIcon: {
    fontSize: 20,
  },
  routineProgress: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
  },
  progressContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
