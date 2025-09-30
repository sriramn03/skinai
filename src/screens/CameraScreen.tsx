import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Image, Animated, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import AllowPhotoAccessButton from '../components/AllowPhotoAccessButton';
import { triggerButtonHaptics } from '../services/haptics';

const { width, height } = Dimensions.get('window');

interface CameraScreenProps {
  onPhotoTaken: (photoUri: string) => void;
  onBack: () => void;
  onAnalyze: (imageUri: string) => void;
}

export default function CameraScreen({ onPhotoTaken, onBack, onAnalyze }: CameraScreenProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const processingOpacity = useRef(new Animated.Value(0)).current;
  const dotAnimation = useRef(new Animated.Value(0)).current;

  // Request camera permissions and fade in animation on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150, // Fast 150ms fade-in
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, permission, requestPermission]);
  
  // Animate loading dots when processing
  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      dotAnimation.setValue(0);
    }
  }, [isProcessing, dotAnimation]);
  
  const handleBackPress = () => {
    console.log('Back button pressed (static)');
    onBack();
  };

  const handleCapturePress = async () => {
    if (cameraRef.current && isReady) {
      try {
        // Show processing screen immediately
        setIsProcessing(true);
        Animated.timing(processingOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();

        console.log('Taking photo...');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        let finalPhotoUri = photo.uri;
        
        // If front camera, flip the image to match what user sees in preview (like Snapchat)
        if (cameraType === 'front') {
          const manipulatedImage = await manipulateAsync(
            photo.uri,
            [{ flip: FlipType.Horizontal }],
            { compress: 0.8, format: SaveFormat.JPEG }
          );
          finalPhotoUri = manipulatedImage.uri;
          console.log('Front camera photo flipped to match preview');
        }
        
        console.log('Photo taken:', finalPhotoUri);
        
        // Small delay to ensure smooth transition
        await new Promise(resolve => setTimeout(resolve, 10));
        
        setSelectedImage(finalPhotoUri);
        onPhotoTaken(finalPhotoUri);
        
        // Fade out processing screen
        Animated.timing(processingOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setIsProcessing(false);
        });
      } catch (error) {
        console.error('Error taking photo:', error);
        setIsProcessing(false);
        processingOpacity.setValue(0);
      }
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => 
      current === 'back' ? 'front' : 'back'
    );
  };

  const handleImageSelected = async (imageUri: string) => {
    console.log('Image selected from gallery:', imageUri);
    
    // Show processing screen immediately
    setIsProcessing(true);
    Animated.timing(processingOpacity, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
    
    // Small delay to ensure smooth transition
    await new Promise(resolve => setTimeout(resolve, 150));
    
    setSelectedImage(imageUri);
    
    // Fade out processing screen
    Animated.timing(processingOpacity, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setIsProcessing(false);
    });
  };

  const handleAnalyze = () => {
    if (selectedImage) {
      triggerButtonHaptics();
      onAnalyze(selectedImage);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        
        {selectedImage ? (
          /* Selected Image View - Full Screen */
          <View style={styles.selectedImageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Text style={styles.backButtonText}>✕</Text>
            </TouchableOpacity>
            
            {/* Analyze Controls Overlay */}
            <View style={styles.analyzeOverlay}>
              <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyze}>
                <Text style={styles.analyzeButtonText}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !permission ? (
          /* Permission Loading - Full Screen */
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>Requesting camera permission...</Text>
          </View>
        ) : !permission.granted ? (
          /* Permission Denied - Full Screen */
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>Camera permission denied</Text>
            <Text style={styles.permissionSubtext}>Please enable camera access in settings</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Live Camera View - Full Screen */
          <CameraView
            style={styles.fullScreenCamera}
            facing={cameraType}
            ref={cameraRef}
            onCameraReady={() => setIsReady(true)}
            {...(Platform.OS === 'android' && { animateShutter: false })} // Disable camera flash animation on Android only
          >
            {/* Face Detection Guide Overlay */}
            <View style={styles.cameraOverlay}>
              <View style={styles.faceGuide}>
                <View style={styles.faceGuideFrame}>
                  <View style={[styles.guideCorner, styles.topLeftCorner]} />
                  <View style={[styles.guideCorner, styles.topRightCorner]} />
                  <View style={[styles.guideCorner, styles.bottomLeftCorner]} />
                  <View style={[styles.guideCorner, styles.bottomRightCorner]} />
                </View>
                <Text style={styles.guideText}>Position your face in the frame</Text>
              </View>
            </View>

            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Text style={styles.backButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Bottom Controls Overlay */}
            <View style={styles.controlsOverlay}>
              <View style={styles.controls}>
                {/* Photo Gallery Button - Left */}
                <View style={styles.leftControl}>
                  <AllowPhotoAccessButton 
                    onImageSelected={handleImageSelected} 
                  />
                </View>
                
                {/* Capture Button - Center */}
                <TouchableOpacity 
                  style={styles.captureButton} 
                  onPress={handleCapturePress}
                >
                  <View style={styles.captureButtonInner}>
                    <View style={styles.captureButtonCore} />
                  </View>
                </TouchableOpacity>

                {/* Camera Reverse Button - Right */}
                <TouchableOpacity style={styles.rightControl} onPress={toggleCameraType}>
                  <View style={styles.reverseButton}>
                    <Feather name="refresh-ccw" size={24} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Artistic Text */}
            </View>
          </CameraView>
        )}
        
        {/* Processing Overlay */}
        {isProcessing && (
          <Animated.View 
            style={[
              styles.processingOverlay,
              { opacity: processingOpacity }
            ]}
          >
            <View style={styles.processingContent}>
              <View style={styles.processingIconContainer}>
                <Animated.View 
                  style={[
                    styles.processingDot,
                    {
                      opacity: dotAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 1, 0.3],
                      }),
                      transform: [{
                        scale: dotAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1.2, 1],
                        }),
                      }],
                    }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.processingDot,
                    styles.processingDotMiddle,
                    {
                      opacity: dotAnimation.interpolate({
                        inputRange: [0, 0.25, 0.5, 0.75, 1],
                        outputRange: [0.3, 0.6, 1, 0.6, 0.3],
                      }),
                      transform: [{
                        scale: dotAnimation.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange: [1, 1.1, 1.2, 1.1, 1],
                        }),
                      }],
                    }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.processingDot,
                    {
                      opacity: dotAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 0.3, 1],
                      }),
                      transform: [{
                        scale: dotAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1, 1.2],
                        }),
                      }],
                    }
                  ]} 
                />
              </View>
              <Text style={styles.processingText}>Processing Image</Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </View>
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
  fullScreenCamera: {
    flex: 1,
    position: 'relative',
  },
  simulatorCamera: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatorContent: {
    alignItems: 'center',
  },
  selectedImageContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  selectedImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  faceGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuideFrame: {
    width: width * 0.6,
    height: width * 0.75,
    position: 'relative',
  },
  guideCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#8B5CF6',
    borderWidth: 3,
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 30,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  leftControl: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightControl: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  captureButtonCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
  },

  captureText: {
    color: 'rgba(0, 0, 0, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  analyzeOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  analyzeButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  analyzeText: {
    color: 'rgba(0, 0, 0, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  reverseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // New camera styles
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },

  permissionButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Processing overlay styles
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContent: {
    alignItems: 'center',
  },
  processingIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  processingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 6,
    opacity: 0.3,
  },
  processingDotMiddle: {
    opacity: 0.6,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});