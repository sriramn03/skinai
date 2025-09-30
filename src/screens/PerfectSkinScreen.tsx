import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { triggerButtonHaptics } from '../services/haptics';

const { width, height } = Dimensions.get('window');

interface PerfectSkinScreenProps {
  imageUrl: string;
  onContinue: () => void;
}

export default function PerfectSkinScreen({ imageUrl, onContinue }: PerfectSkinScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateDownAndContinue = () => {
    triggerButtonHaptics();
    Animated.timing(slideY, { 
      toValue: height, 
      duration: 300, 
      useNativeDriver: true 
    }).start(() => {
      onContinue();
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideY }
            ],
          },
        ]}
      >
        {/* Header with gradient text */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientTextContainer}
          >
            <Text style={styles.title}>You With Perfect Skin</Text>
          </LinearGradient>
        </View>

        {/* Perfect skin image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.perfectSkinImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            transition={300}
            placeholder={null}
          />
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={animateDownAndContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 10,
    marginBottom: -10,
  },
  gradientTextContainer: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
  },
  title: {
    fontSize: 21,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  imageContainer: {
    width: width - 40,
    height: height * 0.6,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  perfectSkinImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  continueIcon: {
    marginTop: 2,
  },
});