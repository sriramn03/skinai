import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated, Dimensions, PanResponder, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

type DreamSkinType = 'clear' | 'glass' | 'porcelain' | 'honey';

interface DreamSkinScreenProps {
  onSelect: (value: DreamSkinType) => void;
}

export default function DreamSkinScreen({ onSelect }: DreamSkinScreenProps) {
  const [selected, setSelected] = useState<DreamSkinType | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Animated selection with swipe-left
  const handleAnimatedSelect = async (value: DreamSkinType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(value);
    
    // Trigger swipe-left animation
    Animated.timing(slideX, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onSelect(value);
      }
    });
  };

  const handleSelect = handleAnimatedSelect;

  // Pan responder for swipe-left gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        // Only respond to leftward horizontal gestures
        return g.dx < -15 && Math.abs(g.dx) > Math.abs(g.dy) * 2;
      },
      onPanResponderGrant: () => {
        slideX.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        // Only allow leftward swipes (negative dx)
        const next = Math.min(g.dx, 0);
        slideX.setValue(Math.max(next, -width));
      },
      onPanResponderRelease: (_, g) => {
        const shouldComplete = g.vx < -1.2 || g.dx < -width * 0.3;
        if (shouldComplete && selected) {
          // Complete the swipe animation
          Animated.timing(slideX, {
            toValue: -width,
            duration: 200,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              onSelect(selected);
            }
          });
        } else {
          // bounce back
          Animated.spring(slideX, {
            toValue: 0,
            speed: 14,
            bounciness: 8,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated, bounce back
        Animated.spring(slideX, {
          toValue: 0,
          speed: 14,
          bounciness: 8,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;



  const Option = ({ label, value }: { label: string; value: DreamSkinType }) => (
    <TouchableOpacity
      style={[styles.option, selected === value && styles.optionSelected]}
      onPress={() => handleSelect(value)}
      activeOpacity={0.8}
    >
      <Text style={[styles.optionText, selected === value && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View 
        style={[
          styles.innerContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateX: slideX }]
          }
        ]}
        {...panResponder.panHandlers}
      >
        
        <View style={styles.content}>
        <Text style={styles.title}>What's your dream skin?</Text>
        
        <View style={styles.options}>
          <Option label="Clear Skin" value="clear" />
          <Option label="Korean Glass Skin" value="glass" />
          <Option label="Porcelain Skin" value="porcelain" />
          <Option label="Honey Skin" value="honey" />
        </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerIcon: {
    width: 60,
    height: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: 60,
    letterSpacing: -0.5,
  },
  options: {
    gap: 16,
  },
  option: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  optionSelected: {
    backgroundColor: '#2A2A2A',
    borderColor: '#555555',
  },
  optionText: {
    color: '#DDDDDD',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },

});
