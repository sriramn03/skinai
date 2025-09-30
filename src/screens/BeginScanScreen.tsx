import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { triggerButtonHaptics } from '../services/haptics';

const { width, height } = Dimensions.get('window');

interface BeginScanScreenProps {
  onBeginScan: () => void;
  userDisplayName?: string;
  onSignOut?: () => void;
}

export default function BeginScanScreen({ onBeginScan, userDisplayName, onSignOut }: BeginScanScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Simultaneous fade in and subtle slide up animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Skincare Analysis</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={onSignOut}>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Content */}
      <Animated.View style={[styles.content, { 
        opacity: fadeAnim,
        transform: [{ translateY }]
      }]}>
        {/* Facial Detection Grid Overlay */}
        <View style={styles.faceContainer}>
          <View style={styles.faceGridOverlay}>
            {/* Grid lines */}
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={`h-${i}`} style={[styles.gridLine, styles.horizontalLine, { top: `${(i + 1) * 12.5}%` }]} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={`v-${i}`} style={[styles.gridLine, styles.verticalLine, { left: `${(i + 1) * 16.66}%` }]} />
            ))}
            
            {/* Corner indicators */}
            <View style={[styles.cornerIndicator, styles.topLeft]} />
            <View style={[styles.cornerIndicator, styles.topRight]} />
            <View style={[styles.cornerIndicator, styles.bottomLeft]} />
            <View style={[styles.cornerIndicator, styles.bottomRight]} />
          </View>
          
          {/* Logo placeholder */}
          <View style={styles.facePlaceholder}>
            <Image 
              source={require('../../assets/loadingscreen.png')} 
              style={styles.logoImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
              placeholderContentFit="contain"
            />
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Get your ratings</Text>
          <Text style={styles.instructionsTitle}>and</Text>
          <Text style={styles.instructionsTitle}>recommendations</Text>
        </View>

        {/* Begin Scan Button */}
        <TouchableOpacity 
          style={styles.beginScanButton} 
          onPress={() => {
            triggerButtonHaptics();
            onBeginScan();
          }}
        >
          <View style={styles.buttonGradient}>
            <Text style={styles.buttonText}>Begin scan</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 70 : 10, // Lower on Android
    paddingBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  faceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  faceGridOverlay: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.85,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  horizontalLine: {
    width: '100%',
    height: 1,
  },
  verticalLine: {
    height: '100%',
    width: 1,
  },
  cornerIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#8B5CF6',
    borderWidth: 3,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  facePlaceholder: {
    width: width * 0.7,
    height: width * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: width * 0.58,
    height: width * 0.58,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  instructionsTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  beginScanButton: {
    marginBottom: Platform.OS === 'android' ? 80 : 40, // Higher on Android
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});