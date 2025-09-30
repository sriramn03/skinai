import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface StreakIconProps {
  streak: number;
}

export default function StreakIcon({ streak }: StreakIconProps) {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/fire-removebg-preview.png')}
        style={styles.fireIcon}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      <Text style={styles.streakText}>{streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38, 38, 38, 0.95)',
    marginRight: 2,
    marginLeft: 0,
    paddingLeft: 0,
    paddingRight: 12,
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fireIcon: {
    width: 60,
    height: 60,
    marginLeft: -10,
    marginRight: 0,
    marginTop:-30,
    marginBottom:-30
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft:-10,
    fontWeight: '600',
  },
});
