# Apple Sign In Setup Guide

## Prerequisites Completed
✅ Apple Sign In capability has been added to the Xcode project
✅ Apple authentication is enabled in Firebase Console
✅ React Native Apple Authentication package is installed
✅ Authentication service has been updated with Apple Sign In functionality
✅ SignInScreen.tsx has been updated to show Apple Sign In button

## Additional Manual Steps Required

### 1. Firebase Console Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (skinai)
3. Navigate to **Authentication** → **Sign-in method** → **Apple**
4. Ensure Apple is enabled (you mentioned it's already enabled)
5. In the Apple provider settings, ensure:
   - Service ID is configured (if using web)
   - For iOS native apps, no additional configuration is needed in Firebase

### 2. Apple Developer Account Configuration
If you haven't already done this when adding the capability in Xcode:

1. Sign in to [Apple Developer Account](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → Find your app identifier (com.anonymous.skinai)
4. Ensure **Sign In with Apple** capability is checked
5. Save the changes

### 3. Xcode Project Verification
1. Open your project in Xcode
2. Select your project → **Signing & Capabilities**
3. Verify that **Sign in with Apple** capability is present
4. Ensure your Team is selected and provisioning profile is valid

### 4. Build and Test
Run the following commands:

```bash
# Clean build folder
cd ios && rm -rf build && cd ..

# Install pods (already done)
npx pod-install

# Run the app
npx react-native run-ios
```

## Testing on iOS Simulator

**Yes, Apple Sign In works on the iOS Simulator!** ✅

### Important Notes for Simulator Testing:
1. **iOS 13.0 or later required** - Make sure your simulator is running iOS 13.0+
2. **Apple ID required** - You'll need to sign in with a real Apple ID
3. **Simulator limitations**:
   - Face ID/Touch ID won't work (you'll enter password manually)
   - The authentication flow will open in a web view
   - You can use any Apple ID for testing

### How to Test:
1. Run the app on iOS Simulator
2. Navigate to the Sign In screen
3. Tap "Sign in with Apple"
4. Enter your Apple ID credentials
5. Complete the authentication flow

### Common Issues and Solutions:

1. **"Sign in with Apple" button not appearing**
   - The button only shows on iOS devices (Platform.OS === 'ios')
   - Check that `appleAuth.isSupported` returns true

2. **Error: "The operation couldn't be completed"**
   - Ensure you're running iOS 13.0+ on the simulator
   - Check that the Sign in with Apple capability is properly configured

3. **Authentication fails**
   - Verify Firebase Apple provider is enabled
   - Check that bundle identifier matches in Xcode and Firebase

## Code Implementation Summary

### Files Modified:
1. **src/services/authService.ts**
   - Added `onAppleButtonPress()` function
   - Imports Apple authentication modules
   - Handles Apple credential creation and Firebase sign-in

2. **src/screens/SignInScreen.tsx**
   - Added Apple authentication import
   - Implemented `handleAppleSignIn()` function
   - Conditionally renders Apple Sign In button (iOS only)
   - Added error handling for cancelled sign-ins

### Security Notes:
- Apple Sign In provides enhanced privacy
- Users can choose to hide their email
- Apple provides a relay email if users choose to hide their real email
- Name is only provided on first sign-in

## Verification Steps
1. Check that the Apple Sign In button appears on iOS devices/simulator
2. Verify successful authentication flow
3. Check Firebase Console to see the new user created
4. Verify user data is properly stored in Firestore (if applicable)

## Production Considerations:
1. Test on real devices before App Store submission
2. Ensure your app's privacy policy mentions Apple Sign In
3. Follow Apple's Human Interface Guidelines for the button design
4. Handle edge cases (network errors, user cancellation, etc.)