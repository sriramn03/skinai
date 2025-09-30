import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[
            styles.step,
            index < currentStep ? styles.activeStep : styles.inactiveStep
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 60,
    marginBottom: 60,
  },
  step: {
    height: 4,
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  activeStep: {
    backgroundColor: '#FFFFFF',
  },
  inactiveStep: {
    backgroundColor: '#404040',
  },
});