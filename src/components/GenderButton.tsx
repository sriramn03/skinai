import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface GenderButtonProps {
  title: string;
  onPress: () => void;
  isSelected?: boolean;
}

export default function GenderButton({ title, onPress, isSelected = false }: GenderButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, isSelected && styles.selectedButton]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.buttonText, isSelected && styles.selectedButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#7C3AED',
    paddingVertical: 18,
    borderRadius: 25,
    marginHorizontal: 30,
    marginVertical: 12,
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedButton: {
    backgroundColor: '#8B5CF6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  selectedButtonText: {
    fontWeight: '700',
  },
});