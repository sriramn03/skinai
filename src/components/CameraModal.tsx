import React, { useRef, useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Animated,
  PanResponder,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import AllowPhotoAccessButton from './AllowPhotoAccessButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const DISMISS_THRESHOLD = height * 0.22;  // how far you must drag to close
const MAX_PULL_UP = -40;                   // allow a tiny pull up for bounce
const ENTER_DURATION = 250;

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoTaken: (photoUri: string) => void;
  onAnalyze: (imageUri: string) => void;
  onProductAnalyze?: (imageUri: string) => void;
  mode?: 'face' | 'food' | 'pimple';
}

export default function CameraModal({
  visible,
  onClose,
  onPhotoTaken,
  onAnalyze,
  onProductAnalyze,
  mode = 'face',
}: CameraModalProps) {
  // Android-specific camera permission handling
  const [permission, requestPermission] = Platform.OS === 'android' ? useCameraPermissions() : [null, null];
  const insets = Platform.OS === 'android' ? useSafeAreaInsets() : { top: 0, right: 0, bottom: 0, left: 0 };
  const translateY = useRef(new Animated.Value(height)).current; // start off-screen
  const backdropOpacity = useRef(new Animated.Value(0)).current; // backdrop animation
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeOverlay = useRef(new Animated.Value(0)).current;
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [foodScanMode, setFoodScanMode] = useState<'food' | 'product'>('food');

  // Get instruction text based on mode
  const getInstructionText = () => {
    switch (mode) {
      case 'food':
        return foodScanMode === 'food' ? '' : '';
      case 'pimple':
        return 'Position pimple in the frame';
      case 'face':
      default:
        return 'Position your face in the frame';
    }
  };
  const cameraRef = useRef<CameraView>(null);
  const processingOpacity = useRef(new Animated.Value(0)).current;
  const dotAnimation = useRef(new Animated.Value(0)).current;

  const transitionToAnalyze = (imageUri: string) => {
    setIsTransitioning(true);
    Animated.timing(fadeOverlay, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
      // Check if we're in food mode and scanning product
      if (mode === 'food' && foodScanMode === 'product' && onProductAnalyze) {
        onProductAnalyze(imageUri);
      } else {
        onAnalyze(imageUri);
      }
      // Do NOT fade back or set state here; parent will close the modal.
    });
  };



  // Open modal animation (matching SettingsModal pattern)
  const openModal = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.6, // Slightly darker than SettingsModal for camera context
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Close modal animation (matching SettingsModal pattern)
  const closeModal = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Request camera permission when modal becomes visible (Android only)
  useEffect(() => {
    if (Platform.OS === 'android' && visible && !permission?.granted && requestPermission) {
      requestPermission();
    }
  }, [visible, permission?.granted, requestPermission]);

  // Animate in/out when visibility changes
  useEffect(() => {
    if (visible) {
      openModal();
    } else {
      translateY.setValue(height);
      backdropOpacity.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setIsTransitioning(false);
      fadeOverlay.setValue(0);
      setSelectedImage(null);
      setIsProcessing(false);
      processingOpacity.setValue(0);
    }
  }, [visible, fadeOverlay, processingOpacity]);

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

  // Function to trigger dismiss animation (used by both pan gesture and X button)
  const dismissModal = () => {
    // Reset the selected image when closing
    setSelectedImage(null);
    closeModal(); // Use the new closeModal function for consistency
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('onStartShouldSetPanResponder called');
        return true;
      },
      onMoveShouldSetPanResponder: (_, g) => {
        // Only respond to primarily vertical gestures
        const shouldSet = Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
        console.log('onMoveShouldSetPanResponder:', shouldSet, 'dy:', g.dy, 'dx:', g.dx);
        return shouldSet;
      },
      onPanResponderGrant: () => {
        console.log('PanResponder granted - starting drag');
        // Allow drag to interrupt spring animations
        translateY.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        // allow a tiny negative (pull up) for elastic feel
        const next = Math.min(Math.max(g.dy, MAX_PULL_UP), height);
        translateY.setValue(next);
        
        // Animate backdrop opacity based on drag distance for fluid feel
        const progress = Math.max(0, Math.min(1, next / DISMISS_THRESHOLD));
        const backdropValue = 0.6 * (1 - progress * 0.5); // Fade backdrop as user drags
        backdropOpacity.setValue(backdropValue);
      },
      onPanResponderRelease: (_, g) => {
        const shouldDismiss = g.vy > 1.2 || g.dy > DISMISS_THRESHOLD;
        if (shouldDismiss) {
          dismissModal();
        } else {
          // bounce back up with backdrop restoration
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              speed: 14,
              bounciness: 8,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 0.6,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated, bounce back with backdrop restoration
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            speed: 14,
            bounciness: 8,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 0.6,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

  const handleCapturePress = async () => {
    if (cameraRef.current && isReady) {
      try {
        // Show processing screen immediately with faster animation
        setIsProcessing(true);
        Animated.timing(processingOpacity, {
          toValue: 1,
          duration: Platform.OS === 'android' ? 100 : 200, // Faster overlay on Android to cover any flash
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
        await new Promise(resolve => setTimeout(resolve, 20));
        
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
      transitionToAnalyze(selectedImage);
    }
  };

  // Show permission UI if camera access not granted (Android only)
  if (Platform.OS === 'android' && visible && !permission?.granted) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>We need camera access to take photos for skin analysis</Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={() => requestPermission && requestPermission()}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none" // we drive our own animation
      statusBarTranslucent
      onRequestClose={closeModal}
    >
      {/* Animated Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={closeModal} />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[styles.modalContainer, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
          <StatusBar style="light" />
          
          {selectedImage ? (
            /* Selected Image View - Full Screen */
            <View style={styles.fullScreenContainer}>
              <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} />
              
              {/* Close Button Overlay - Android Safe Position */}
              <TouchableOpacity 
                style={[
                  styles.closeButtonOverlay, 
                  Platform.OS === 'android' 
                    ? { top: 10 + insets.top, right: 20 }
                    : { top: 10, right: 340 } // iOS original positioning
                ]} 
                onPress={dismissModal}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              
              {/* Analyze Controls Overlay */}
              <View style={styles.analyzeOverlay}>
                <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyze}>
                  <Text style={styles.analyzeButtonText}>Analyze</Text>
                </TouchableOpacity>
              </View>
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
              {/* Close Button Overlay - Android Safe Position */}
              <TouchableOpacity 
                style={[
                  styles.closeButtonOverlay, 
                  Platform.OS === 'android' 
                    ? { top: 10 + insets.top, right: 20 }
                    : { top: 10, right: 340 } // iOS original positioning
                ]} 
                onPress={dismissModal}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              {/* Face Detection Guide Overlay */}
              <View style={styles.cameraOverlay}>
                <View style={styles.faceGuide}>
                  <View style={styles.faceGuideFrame}>
                    <View style={[styles.guideCorner, styles.topLeftCorner]} />
                    <View style={[styles.guideCorner, styles.topRightCorner]} />
                    <View style={[styles.guideCorner, styles.bottomLeftCorner]} />
                    <View style={[styles.guideCorner, styles.bottomRightCorner]} />
                  </View>
                  <Text style={styles.guideText}>{getInstructionText()}</Text>
                </View>
              </View>

              {/* Bottom Controls Overlay */}
              <View style={styles.controlsOverlay}>
                {mode === 'food' ? (
                  /* Food Mode - Bottom Buttons Layout */
                  <View style={styles.foodModeControls}>
                    {/* Mode Selection Buttons */}
                    <View style={styles.foodModeButtons}>
                      <TouchableOpacity 
                        style={[styles.foodModeButton, foodScanMode === 'food' && styles.activeFoodModeButton]}
                        onPress={() => setFoodScanMode('food')}
                      >
                        <Text style={[styles.foodModeButtonText, foodScanMode === 'food' && styles.activeFoodModeButtonText]}>
                          Scan Food
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.foodModeButton, foodScanMode === 'product' && styles.activeFoodModeButton]}
                        onPress={() => setFoodScanMode('product')}
                      >
                        <Text style={[styles.foodModeButtonText, foodScanMode === 'product' && styles.activeFoodModeButtonText]}>
                          Scan Product
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Center Controls Row */}
                    <View style={styles.foodCenterControls}>
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
                  </View>
                ) : (
                  /* Default Mode - Original Layout */
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
                )}
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
        
        {isTransitioning && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject as any,
              { backgroundColor: '#000', opacity: fadeOverlay, zIndex: 999 }
            ]}
          />
        )}
    </Modal>
  );
}

const { height: H } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  backdropTouch: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 0, // Raise higher on Android
    left: 0,
    right: 0,
    backgroundColor: '#000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: Platform.OS === 'android' ? H * 0.95 : H * 0.90, // Slightly shorter on Android to accommodate raised position
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 40,
    position: 'relative',
  },
  handle: {
    alignSelf: 'center',
    width: 84,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(139, 92, 246, 0.20)',   // fill (accent purple, subtle)
    borderWidth: 0,
    borderStyle: 'dashed',
    borderColor: '#8B5CF6',                         // accent purple
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  cameraContainer: { 
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenCamera: {
    flex: 1,
    position: 'relative',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenImage: {
    flex: 1,
    width: '100%',
    height: '100%',
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
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
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
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
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
  closeButton: {
    position: 'absolute',
    top: 0,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  closeButtonOverlay: {
    position: 'absolute',
    // top and right will be set dynamically with safe area insets
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  closeButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
  
  // Permission UI styles
  permissionContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Food Mode Styles
  foodModeControls: {
    paddingBottom: Platform.OS === 'android' ? 20 : 40,
    paddingHorizontal: 20,
  },
  foodModeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom:  20,
    gap: 16,
  },
  foodModeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 120,
  },
  activeFoodModeButton: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  foodModeButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeFoodModeButtonText: {
    color: '#FFFFFF',
  },
  foodCenterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
});
