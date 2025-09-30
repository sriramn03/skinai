import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';

interface LoadingScreenProps {
  onComplete: () => void;
  mode?: 'face' | 'food' | 'pimple' | 'product';
}

const PURPLE = '#8B5CF6';

export default function LoadingScreen({ onComplete, mode = 'face' }: LoadingScreenProps) {
  const { width, height } = Dimensions.get('window');

  // Percent state and animated progress
 // Percent state and animated progress
const [progress, setProgress] = useState(0);
const progressAnim = useRef(new Animated.Value(0)).current;

// Entry animation for smoother mount
const entryOpacity = useRef(new Animated.Value(0)).current;
const entryScale = useRef(new Animated.Value(0.98)).current;
useEffect(() => {
  Animated.parallel([
    Animated.timing(entryOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    Animated.timing(entryScale, { toValue: 1, duration: 350, useNativeDriver: true }),
  ]).start();
}, []);

// Animate ring when progress changes


  // Animate ring when progress changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);



  // Drive progress to 100 then call onComplete
  useEffect(() => {
    const id = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(id);
          setTimeout(onComplete, 500);
          return 100;
        }
        const inc = Math.floor(Math.random() * 3) + 1; // Slower increments: 1-2% instead of 1-3%
        return Math.min(prev + inc, 100);
      });
    }, 220); // Slower interval: 300ms instead of 150ms (2x slower)
    return () => clearInterval(id);
  }, []);

  // Galaxy starfield background
  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * width,
        top: Math.random() * height,
        size: Math.random() * 3 + 0.5, // Varied sizes from 0.5 to 3.5
        brightness: Math.random(), // Base brightness
        twinkleSpeed: 1500 + Math.random() * 3000, // 1.5s to 4.5s
        color: i < 60 ? '#FFFFFF' : i < 75 ? '#A78BFA' : '#8B5CF6', // Mix of white and purple stars
      })),
    [width, height]
  );
  
  const starOpacities = useMemo(
    () => stars.map(star => new Animated.Value(star.brightness * 0.8)),
    [stars]
  );
  
  useEffect(() => {
    stars.forEach((star, i) => {
      const startDelay = Math.random() * 2000; // Stagger start times
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(starOpacities[i], { 
              toValue: star.brightness * 0.2, 
              duration: star.twinkleSpeed, 
              useNativeDriver: true 
            }),
            Animated.timing(starOpacities[i], { 
              toValue: star.brightness * 1.0, 
              duration: star.twinkleSpeed, 
              useNativeDriver: true 
            }),
          ])
        ).start();
      }, startDelay);
    });
  }, [stars, starOpacities]);

  // Get title based on mode
  const getTitle = () => {
    switch (mode) {
      case 'food':
        return 'Analyzing Food';
      case 'product':
        return 'Analyzing Product';
      case 'pimple':
        return 'Analyzing Pimple';
      case 'face':
      default:
        return 'Calculating';
    }
  };

  // Get status text based on mode and progress
  const getStatusText = () => {
    switch (mode) {
      case 'food':
        if (progress < 25) return 'Identifying food ingredients';
        if (progress >= 25 && progress < 50) return 'Analyzing nutritional value';
        if (progress >= 50 && progress < 75) return 'Calculating skin impact';
        if (progress >= 75 && progress < 100) return 'Generating recommendations...';
        return 'Food analysis complete!';
      
      case 'product':
        if (progress < 25) return 'Identifying product details';
        if (progress >= 25 && progress < 50) return 'Analyzing ingredients';
        if (progress >= 50 && progress < 75) return 'Evaluating skin benefits';
        if (progress >= 75 && progress < 100) return 'Generating safety report...';
        return 'Product analysis complete!';
      
      case 'pimple':
        if (progress < 25) return 'Detecting pimple severity';
        if (progress >= 25 && progress < 50) return 'Analyzing skin condition';
        if (progress >= 50 && progress < 75) return 'Creating treatment plan';
        if (progress >= 75 && progress < 100) return 'Finalizing recommendations...';
        return 'Pimple analysis complete!';
      
      case 'face':
      default:
        if (progress < 25) return 'Determining perfect products';
        if (progress >= 25 && progress < 50) return 'Analyzing facial features';
        if (progress >= 50 && progress < 75) return 'Calculating skin scores';
        if (progress >= 75 && progress < 100) return 'Building your routine...';
        return 'Analysis complete!';
    }
  };

  // Circular progress calc
  const R = 90;
  const STROKE = 12;
  const size = R * 2 + STROKE * 2;
  const C = 2 * Math.PI * R;
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const dashOffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [C, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
  
      <Animated.View style={{ flex: 1, opacity: entryOpacity, transform: [{ scale: entryScale }] }}>
        {/* Galaxy starfield background */}
        <View style={StyleSheet.absoluteFill}>
          {stars.map((star, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                backgroundColor: star.color,
                opacity: starOpacities[i],
                shadowColor: star.color,
                shadowOpacity: 0.8,
                shadowRadius: star.size * 1.5,
                elevation: 5,
              }}
            />
          ))}
        </View>
  
        <View style={styles.content}>
          <Text style={styles.title}>{getTitle()}</Text>
  
          {/* Circular progress */}
          <View style={styles.ringContainer}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={R}
                stroke="rgba(139, 92, 246, 0.15)"
                strokeWidth={STROKE}
                fill="transparent"
              />
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={R}
                stroke={PURPLE}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={`${C}, ${C}`}
                strokeDashoffset={dashOffset as any}
              />
            </Svg>
  
            {/* Center percent text (upright) */}
            <View style={styles.centerLabel}>
              <Text style={styles.percentText}>{progress}%</Text>
            </View>
          </View>
  
          {/* Status text */}
          <Text style={styles.statusText}>
            {getStatusText()}
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 40,
    zIndex: 10
  },
  title: { 
    color: '#FFF', 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 60, 
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  ringContainer: { 
    position: 'relative', 
    marginBottom: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  centerLabel: { 
    position: 'absolute', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  percentText: { 
    color: '#FFF', 
    fontSize: 36, 
    fontWeight: '800' 
  },
  statusText: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 16, 
    textAlign: 'center', 
    marginTop: 8,
    fontWeight: '500'
  },

});