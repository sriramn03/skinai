import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Animated, Platform, Modal, TextInput, KeyboardAvoidingView, ScrollView, PanResponder, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { Feather } from '@expo/vector-icons';
import ProgressBar from '../components/ProgressBar';
import { onGoogleButtonPress, onAppleButtonPress, signInWithEmail, createAccountWithEmail } from '../services/authService';
import { incrementGenderCount, handleReferralCode } from '../services/firestoreService';
import { OnboardingData } from '../types/onboarding';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SignInScreenProps {
  onGoogleSignInSuccess?: () => void;
  onboardingData?: OnboardingData;
}

export default function SignInScreen({ onGoogleSignInSuccess, onboardingData }: SignInScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Modal animation values
  const modalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Check if Apple Sign In is available
  const isAppleSignInAvailable = Platform.OS === 'ios' && appleAuth.isSupported;

  // Pan gesture responder for modal
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        modalTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        closeEmailModal();
      } else {
        openEmailModal();
      }
    },
  });

  // Modal animation functions - Platform-specific opening animation
  const openEmailModal = () => {
    setShowEmailModal(true);
    
    if (Platform.OS === 'android') {
      // Android: Simple pop-up animation (no slide)
      modalTranslateY.setValue(-50); // Immediately set to final position
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 200, // Faster fade-in for pop effect
        useNativeDriver: true,
      }).start();
    } else {
      // iOS: Keep original slide-up animation
      Animated.parallel([
        Animated.timing(modalTranslateY, {
          toValue: -50, // Move modal up by 50 points to avoid keyboard
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const closeEmailModal = () => {
    Animated.parallel([
      Animated.timing(modalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowEmailModal(false);
      setEmail('');
      setPassword('');
      setIsSignUp(false);
    });
  };

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Reset modal position when showing - Platform-specific behavior
  useEffect(() => {
    if (showEmailModal) {
      if (Platform.OS === 'android') {
        // Android: Set directly to final position
        modalTranslateY.setValue(-50);
        backdropOpacity.setValue(0);
        // Trigger just the backdrop animation
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else {
        // iOS: Use original slide animation
        modalTranslateY.setValue(SCREEN_HEIGHT);
        backdropOpacity.setValue(0);
        openEmailModal();
      }
    }
  }, [showEmailModal]);

  // Helper function to save onboarding data after successful sign-in
  const saveOnboardingData = async () => {
    try {
      if (onboardingData) {
        // Save gender data if provided
        if (onboardingData.gender) {
          await incrementGenderCount(onboardingData.gender);
        }
        
        // Save referral code if provided
        if (onboardingData.referralCode) {
          await handleReferralCode(onboardingData.referralCode);
        }
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      // Don't throw error to prevent sign-in failure
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await onGoogleButtonPress();
      console.log('Signed in with Google!');
      
      // Save onboarding data
      await saveOnboardingData();
      
      if (onGoogleSignInSuccess) {
        onGoogleSignInSuccess();
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await onAppleButtonPress();
      console.log('Signed in with Apple!');
      
      // Save onboarding data
      await saveOnboardingData();
      
      if (onGoogleSignInSuccess) {
        onGoogleSignInSuccess();
      }
    } catch (error: any) {
      console.error('Apple Sign-In failed:', error);
      console.error('Error code:', error.code);
      console.error('Error details:', { domain: error.domain, userInfo: error.userInfo });
      
      if (error.code === appleAuth.Error.CANCELED) {
        // User cancelled the sign-in flow
        return;
      }
      
      // Handle specific error codes
      if (error.code === '1000' || error.message?.includes('1000')) {
        Alert.alert(
          'Apple Sign In Unavailable', 
          'Please ensure you are signed into iCloud in Settings app and try again.\n\nGo to Settings → Sign in to your iPhone.'
        );
      } else {
        Alert.alert('Error', `Failed to sign in with Apple: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await createAccountWithEmail(email, password);
        console.log('Account created with email!');
      } else {
        await signInWithEmail(email, password);
        console.log('Signed in with email!');
      }
      
      // Save onboarding data
      await saveOnboardingData();
      
      closeEmailModal();
      
      if (onGoogleSignInSuccess) {
        onGoogleSignInSuccess();
      }
    } catch (error: any) {
      console.error('Email sign-in failed:', error);
      Alert.alert('Error', error.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        <ProgressBar currentStep={3} totalSteps={3} />
        
        <View style={styles.content}>
        <Text style={styles.title}>Create your account</Text>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Image 
                source={require('../../assets/google.png')} 
                style={styles.googleIcon}
                contentFit="contain"
              />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </View>
          </TouchableOpacity>
          
          {isAppleSignInAvailable && (
            <TouchableOpacity 
              style={styles.appleButton} 
              onPress={handleAppleSignIn}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Image 
                  source={require('../../assets/apple.png')} 
                  style={styles.appleIcon}
                  contentFit="contain"
                />
                <Text style={styles.appleButtonText}>Sign in with Apple</Text>
              </View>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.emailButton} 
            onPress={() => setShowEmailModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Feather name="mail" size={24} color="#FFFFFF" style={styles.emailIcon} />
              <Text style={styles.emailButtonText}>Sign in with Email</Text>
            </View>
          </TouchableOpacity>
        </View>
        </View>
      </Animated.View>

      {/* Email Sign In Modal */}
      <Modal
        visible={showEmailModal}
        animationType="none"
        transparent={true}
        onRequestClose={closeEmailModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View 
            style={[styles.modalBackdrop, { opacity: backdropOpacity }]}
          >
            <TouchableOpacity 
              style={styles.modalBackdropTouch} 
              activeOpacity={1} 
              onPress={closeEmailModal}
            />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.modalContent,
              { transform: [{ translateY: modalTranslateY }] }
            ]}
            {...panResponder.panHandlers}
          >
            {/* Handle bar for swipe indication */}
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
              <TouchableOpacity onPress={closeEmailModal}>
                <Feather name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleEmailSignIn}
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.signInButton, isLoading && styles.disabledButton]}
                onPress={handleEmailSignIn}
                disabled={isLoading}
              >
                <Text style={styles.signInButtonText}>
                  {isLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.switchModeButton}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.switchModeText}>
                  {isSignUp 
                    ? 'Already have an account? Sign In' 
                    : "Don't have an account? Create one"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 80,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: 80,
    letterSpacing: -0.5,
  },
  buttonsContainer: {
    gap: 20,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 25,
    marginHorizontal: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appleButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    borderRadius: 25,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
  },
  googleIcon: {
    width: 30,
    height: 30,
    marginRight: 20,
  },
  appleIcon: {
    width: 30,
    height: 30,
    marginRight: 20,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emailButton: {
    backgroundColor: '#333333',
    paddingVertical: 18,
    borderRadius: 25,
    marginHorizontal: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emailIcon: {
    width: 24,
    height: 24,
    marginRight: 20,
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: 550, // Increased height to give more space
    maxHeight: SCREEN_HEIGHT * 0.85, // Don't take up more than 85% of screen
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  signInButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  switchModeButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  switchModeText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 20, // Extra padding at bottom for better scrolling
  },
});