import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

interface AnalysisResults {
  overall: number;
  potential: number;
  hydration: number;
  smoothness: number;
  tone: number;
  clarity: number;
}

interface ResultsScreenProps {
  imageUri: string;
  results: AnalysisResults;
  onTryAgain: () => void;
}

interface BarMetricProps {
  label: string;
  value: number;
}

function BarMetric({ label, value }: BarMetricProps) {
  return (
    <View style={styles.barMetricContainer}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barContainer}>
        <View style={[styles.bar, { width: `${value}%` }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

export default function ResultsScreen({ imageUri, results, onTryAgain }: ResultsScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {/* Results Card */}
        <View style={styles.card}>
          {/* Profile Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.profileImage} />
          </View>
          
          {/* Main Scores */}
          <View style={styles.mainScores}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Overall</Text>
              <Text style={styles.scoreValue}>{results.overall}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Potential</Text>
              <Text style={styles.scoreValue}>{results.potential}</Text>
            </View>
          </View>
          
          {/* Detailed Metrics */}
          <View style={styles.metricsContainer}>
            <BarMetric label="Hydration" value={results.hydration} />
            <BarMetric label="Smoothness" value={results.smoothness} />
            <BarMetric label="Tone" value={results.tone} />
            <BarMetric label="Clarity" value={results.clarity} />
          </View>
          
          {/* Brand */}
          <Text style={styles.brandText}>glance</Text>
        </View>
        

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    borderRadius: 30,
    padding: 30,
    width: width * 0.9,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 40,
  },
  imageContainer: {
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainScores: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 50,
  },
  metricsContainer: {
    width: '100%',
    marginBottom: 30,
  },
  barMetricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  barLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    width: 100,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginHorizontal: 15,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  barValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'right',
  },
  brandText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 2,
  },

});