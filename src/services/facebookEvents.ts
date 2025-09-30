import { Settings, AppEventsLogger } from 'react-native-fbsdk-next';

// For compatibility with different versions
const activateApp = () => {
  try {
    // In react-native-fbsdk-next v13+, use logEvent instead of activateApp
    AppEventsLogger.logEvent('fb_mobile_activate_app');
    console.log('Facebook app activation event logged');
  } catch (error) {
    console.error('Error logging Facebook app activation:', error);
  }
};

/**
 * Initialize Facebook SDK for RevenueCat Meta Ads integration
 * This follows the official RevenueCat documentation requirements
 */
export const initializeFacebookSDK = () => {
  try {
    Settings.initializeSDK();
    
    // IMPORTANT: Disable automatic purchase tracking to prevent double counting
    // RevenueCat will handle all purchase events
    Settings.setAutoLogAppEventsEnabled(false);
    Settings.setAdvertiserTrackingEnabled(true);
    
    // Manually activate app for install and usage tracking
    activateApp();
    
    console.log('Facebook SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Facebook SDK:', error);
    // Continue without Facebook SDK - don't crash the app
  }
};

// Export AppEventsLogger for device identifier collection
export { AppEventsLogger };
