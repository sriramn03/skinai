import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, Dimensions, Animated, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AnalysisResults } from '../services/analysisService';

const { width } = Dimensions.get('window');
const PILL_WIDTH = Platform.OS === 'android' 
  ? (width - 60) / 2  // Bigger boxes on Android (less horizontal padding)
  : (width - 72) / 2; // Original iOS sizing


// Color coding function
function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#F59E0B'; // Yellow/Orange
  return '#EF4444'; // Red
}

// Normalize display values
function asDisplay(value: number): number {
  return Math.round(value <= 1 ? value * 100 : value);
}

interface CompactResultsScreenProps {
  imageUri: string;
  results: AnalysisResults;
}

function Progress({ percent, height = 6 }: { percent: number; height?: number }) {
  const normalized = percent <= 1 ? percent * 100 : percent;
  const color = getScoreColor(normalized);
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[
        styles.progressFill, 
        { 
          width: `${Math.max(0, Math.min(100, normalized))}%`,
          backgroundColor: color 
        }
      ]} />
    </View>
  );
}

function ResultPill({ title, value }: { title: string; value: number }) {
  const display = asDisplay(value);
  return (
    <View style={styles.pillContainer}>
      <LinearGradient colors={['#2B2B2B', '#141414']} style={styles.pill}>
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'transparent']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pillGloss}
          pointerEvents="none"
        />
        <Text style={styles.pillTitle}>{title}</Text>
        <Text style={styles.pillValue}>{display}</Text>
        <Progress percent={display} height={8} />
      </LinearGradient>
    </View>
  );
}



export default function CompactResultsScreen({
  imageUri,
  results,
}: CompactResultsScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Avatar */}
        <View style={styles.header}>
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        </View>

        {/* Hero Pills - Overall and Potential */}
        <View style={styles.pillsRow}>
          <ResultPill title="Overall" value={results.overall} />
          <View style={{ width: 24 }} />
          <ResultPill title="Potential" value={results.potential} />
        </View>

        {/* 2x2 Grid - Detailed Metrics */}
        <View style={styles.grid}>
          <View style={styles.gridRow}> 
            <View style={styles.pillContainer}>
              <ResultPill title="Hydration" value={results.hydration} />
            </View>
            <View style={{ width: 24 }} />
            <View style={styles.pillContainer}>
              <ResultPill title="Smoothness" value={results.smoothness} />
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={styles.pillContainer}>
              <ResultPill title="Tone" value={results.tone} />
            </View>
            <View style={{ width: 24 }} />
            <View style={styles.pillContainer}>
              <ResultPill title="Clarity" value={results.clarity} />
            </View>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: Platform.OS === 'android' ? 0 : 1, // Don't take full height on Android
    backgroundColor: '#000000',
  },
  content: {
    flex: Platform.OS === 'android' ? 0 : 1, // Don't take full height on Android
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 20 : 0, // Add bottom padding on Android for spacing
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 24 : 16, // Move profile pic down on Android
    marginBottom: Platform.OS === 'android' ? 24 : 18, // More space below profile pic on Android
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Pills Row
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'android' ? 18 : 24, // Less side padding for bigger boxes on Android
    marginBottom: Platform.OS === 'android' ? 24 : 20, // More space below top pills on Android
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillContainer: {
    width: PILL_WIDTH,
  },
  pill: {
    borderRadius: 20,
    paddingVertical: Platform.OS === 'android' ? 24 : 16, // Taller boxes on Android
    paddingHorizontal: Platform.OS === 'android' ? 24 : 20, // More horizontal padding on Android
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  pillGloss: {
    position: 'absolute',
    top: -6,
    left: -8,
    right: -8,
    height: '55%',
    borderRadius: 24,
    transform: [{ rotate: '-6deg' }],
  },
  pillTitle: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,  // Reduced from 8 to bring title closer to top
  },
  pillValue: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  // Grid
  grid: {
    paddingHorizontal: Platform.OS === 'android' ? 18 : 24, // Less side padding for bigger boxes on Android
    marginBottom: Platform.OS === 'android' ? -20 : 0, // Reduce bottom margin to pull Continue button up on Android
    gap: Platform.OS === 'android' ? 20 : 16, // More spacing between rows on Android
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'android' ? 10 : 9, // Less bottom margin on Android to pull Continue button up
  },


  // Progress
  progressTrack: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});