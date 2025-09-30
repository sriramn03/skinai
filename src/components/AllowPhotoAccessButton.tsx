import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';

interface AllowPhotoAccessButtonProps {
  onImageSelected?: (uri: string) => void;
}

export default function AllowPhotoAccessButton({ onImageSelected }: AllowPhotoAccessButtonProps) {
  const pickImage = async () => {
    try {
      // Request permission to access photo library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        console.log('Photo library permission denied');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('Image selected:', imageUri);
        
        if (onImageSelected) {
          onImageSelected(imageUri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  return (
    <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
      <View style={styles.galleryIcon}>
        <Feather name="image" size={24} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryIcon: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

});