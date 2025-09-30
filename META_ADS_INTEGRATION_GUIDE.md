# Meta Ads Integration Setup Guide

## Overview
This guide helps you complete the Meta Ads integration with RevenueCat for precise revenue tracking in your DermAI app.

## Prerequisites
✅ Meta SDK (`react-native-fbsdk-next`) is already installed
✅ Expo plugin configuration is already added
✅ Platform-specific configurations are already set up

## Required Configuration Steps

### 1. Get Your Facebook App Credentials

1. Go to [Facebook Developers Console](https://developers.facebook.com/)
2. Create a new app or select your existing DermAI app
3. Navigate to **Settings > Basic**
4. Copy your **App ID** and **Client Token**

### 2. Update Configuration Files

Replace the placeholder values in the following files:

#### iOS Configuration (`ios/DermAI/Info.plist`)
```xml
<!-- Replace YOUR_FACEBOOK_APP_ID with your actual App ID -->
<string>fbYOUR_FACEBOOK_APP_ID</string>
<string>YOUR_FACEBOOK_APP_ID</string>
<string>YOUR_FACEBOOK_CLIENT_TOKEN</string>
```

#### Android Configuration (`android/app/src/main/res/values/strings.xml`)
```xml
<!-- Replace with your actual credentials -->
<string name="facebook_app_id">YOUR_FACEBOOK_APP_ID</string>
<string name="facebook_client_token">YOUR_FACEBOOK_CLIENT_TOKEN</string>
```

#### Android Manifest (`android/app/src/main/AndroidManifest.xml`)
```xml
<!-- Replace YOUR_FACEBOOK_APP_ID with your actual App ID -->
<data android:scheme="fbYOUR_FACEBOOK_APP_ID"/>
```

### 3. Initialize Facebook SDK in Your App

Add this to your main App component (`App.tsx`):

```typescript
import { initializeFacebookSDK } from './src/services/facebookEvents';

// In your App component's useEffect
useEffect(() => {
  initializeFacebookSDK();
}, []);
```

### 4. Configure RevenueCat Integration

In your RevenueCat dashboard:

1. Go to **Integrations > Meta**
2. Enable the Meta integration
3. Enter your Facebook App ID
4. Configure which events to send (recommended: purchases, trial starts, renewals)

### 5. Test the Integration

Use the provided Facebook Events service to test event tracking:

```typescript
import { 
  logAppActivated, 
  logPurchaseEvent, 
  logSubscriptionEvent,
  logSkinAnalysisStarted 
} from './src/services/facebookEvents';

// Test app activation
logAppActivated();

// Test purchase tracking
logPurchaseEvent(9.99, 'USD', 'premium_monthly', 'txn_123');

// Test subscription tracking
logSubscriptionEvent('trial', 'premium_trial', 0, 'USD');

// Test custom events
logSkinAnalysisStarted('acne_analysis');
```

## Integration Points with Your App

### RevenueCat Purchase Events
The Facebook Events service is designed to work with your existing RevenueCat setup. Key integration points:

1. **Trial Starts**: When user starts a trial via RevenueCat
2. **Purchases**: When user completes a purchase
3. **Renewals**: When subscription renews
4. **Cancellations**: When subscription is cancelled

### Custom App Events
Track user engagement with DermAI-specific events:

- Skin analysis started/completed
- Premium features viewed
- Onboarding completion
- Routine creation
- Daily progress views

## Testing

### Development Testing
1. Use Facebook's Event Manager to verify events are being received
2. Check console logs for event tracking confirmation
3. Test on both iOS and Android devices

### Sandbox Testing
- Meta Ads supports sandbox testing with separate App ID and Client Token
- Use sandbox credentials during development
- Switch to production credentials for app store releases

## Troubleshooting

### Common Issues
1. **Events not appearing**: Check App ID and Client Token are correct
2. **iOS build issues**: Ensure `useFrameworks: static` is set in app.json
3. **Android build issues**: Verify all manifest entries are correct

### Debug Mode
Enable debug logging by adding this to your app initialization:

```typescript
import { Settings } from 'react-native-fbsdk-next';

// Enable debug logging (development only)
if (__DEV__) {
  Settings.setLogLevel('DEBUG');
}
```

## Next Steps

1. Replace placeholder credentials with your actual Facebook App credentials
2. Initialize the Facebook SDK in your app
3. Set up RevenueCat Meta integration in the dashboard
4. Test the integration with sample events
5. Deploy and monitor event tracking in Facebook Events Manager

## Benefits

Once configured, you'll be able to:
- Track precise revenue from Meta Ad campaigns
- Optimize ad targeting based on user behavior
- Measure long-term value of acquired users
- Automatically track subscription events without app opens
- Follow user cohorts for months to understand campaign ROI