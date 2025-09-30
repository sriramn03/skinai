import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.43; // Increased to accommodate all content

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        closeModal();
      } else {
        openModal();
      }
    },
  });

  const openModal = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: MODAL_HEIGHT,
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

  useEffect(() => {
    if (visible) {
      openModal();
    } else {
      translateY.setValue(MODAL_HEIGHT);
      backdropOpacity.setValue(0);
    }
  }, [visible]);

  // Get current user info
  const currentUser = auth().currentUser;
  const username = currentUser?.email || currentUser?.displayName || 'User';

  const handleContactSupport = () => {
    Linking.openURL("mailto:sriramnarlapati4@gmail.com?subject=Support Request");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth().currentUser;
              if (!user) {
                Alert.alert('Error', 'No user is currently signed in.');
                return;
              }

              // Check if user needs to re-authenticate
              const lastSignInTime = user.metadata.lastSignInTime;
              const now = new Date().getTime();
              const fiveMinutesAgo = now - (5 * 60 * 1000);
              
              if (lastSignInTime && new Date(lastSignInTime).getTime() < fiveMinutesAgo) {
                // User needs to re-authenticate
                Alert.alert(
                  'Re-authentication Required',
                  'For security reasons, please sign out and sign back in, then try deleting your account again.',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Sign Out',
                      onPress: async () => {
                        try {
                          await auth().signOut();
                        } catch (signOutError) {
                          console.error('Error signing out:', signOutError);
                        }
                      },
                    },
                  ]
                );
                return;
              }

              // Proceed with account deletion using the new API
              await user.delete();
              console.log('Account deleted successfully');
              
              // User is automatically signed out after deletion
              Alert.alert(
                'Account Deleted',
                'Your account has been successfully deleted.',
                [{ text: 'OK' }]
              );
              
            } catch (error: any) {
              console.error('Error deleting account:', error);
              
              if (error.code === 'auth/requires-recent-login') {
                Alert.alert(
                  'Re-authentication Required',
                  'For security reasons, please sign out and sign back in, then try deleting your account again.',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Sign Out',
                      onPress: async () => {
                        try {
                          await auth().signOut();
                        } catch (signOutError) {
                          console.error('Error signing out:', signOutError);
                        }
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Error',
                  `Failed to delete account: ${error.message || 'Unknown error occurred'}`
                );
              }
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeModal}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={styles.backdropTouch} onPress={closeModal} />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY }] }
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle */}
        <View style={styles.handle} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Settings Content */}
        <View style={styles.settingsContent}>
          {/* Username Display */}
          <TouchableOpacity
            style={styles.usernameItem}
            onPress={() => {
              // Handle username display (could show profile or do nothing)
            }}
          >
            <Text style={styles.settingsIcon}>👤</Text>
            <Text style={styles.settingsText}>
              {username}
            </Text>
          </TouchableOpacity>

          {/* Contact Support Button */}
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={handleContactSupport}
          >
            <Text style={styles.settingsIcon}>📧</Text>
            <Text style={styles.settingsText}>
              Contact Support
            </Text>
          </TouchableOpacity>

          {/* Delete Account Button */}
          <TouchableOpacity
            style={styles.deleteAccountItem}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.settingsIcon}>❌</Text>
            <Text style={[styles.settingsText, styles.destructiveText]}>
              Delete my account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => {
              Linking.openURL('https://dermaiweb.web.app/privacy.html').catch(err => 
                console.error('Failed to open Privacy URL:', err)
              );
            }}
          >
            <Text style={styles.footerText}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => {
              Linking.openURL('https://dermaiweb.web.app/terms.html').catch(err => 
                console.error('Failed to open Terms URL:', err)
              );
            }}
          >
            <Text style={styles.footerText}>Terms</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

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
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },

  settingsContent: {
    paddingHorizontal: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderRadius: 8,
  },
  usernameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderRadius: 8,
    marginBottom: 8,
  },
  deleteAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  settingsIcon: {
    fontSize: 20,
    marginRight: 20,
    width: 24,
  },
  settingsText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  destructiveText: {
    color: '#FF4444',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 12,
  },
  footerButton: {
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#888',
  },
});
