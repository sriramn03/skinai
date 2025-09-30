# Apple Sign In Error 1000 Fix

## Error: "The operation couldn't be completed" (AuthorizationError error 1000)

This error means Apple Sign In service is not available. Follow these steps:

### Step 1: Sign into iCloud on Simulator
1. Open the **Settings** app in your iOS Simulator
2. Tap on "Sign in to your iPhone" at the top
3. Enter your Apple ID and password
4. Complete the sign-in process (you may need to verify with 2FA)

### Step 2: Verify Apple ID Requirements
Your Apple ID must have:
- ✅ Two-factor authentication enabled
- ✅ Be a real Apple ID (not sandbox/test account)
- ✅ Be fully signed into iCloud

### Step 3: Check Simulator Settings
1. Go to Settings → [Your Name] → Sign-In & Security
2. Ensure "Sign in with Apple" is listed and enabled
3. If not visible, your Apple ID may not support it

### Step 4: Try a Different Simulator
- Use iPhone 14 or 15 simulator
- Ensure iOS 15.0 or later
- Reset the simulator if needed: Device → Erase All Content and Settings

### Step 5: Alternative Testing Methods
If simulator continues to fail:
1. **Test on a real device** - Apple Sign In works more reliably on physical devices
2. **Use TestFlight** - Deploy a test build to test on your personal device

### Additional Debugging
Add more detailed error logging to see the exact issue:

```typescript
} catch (error: any) {
  console.error('Apple Sign-In failed:', error);
  console.error('Error code:', error.code);
  console.error('Error domain:', error.domain);
  console.error('Error userInfo:', error.userInfo);
  
  if (error.code === appleAuth.Error.CANCELED) {
    return;
  }
  
  // More specific error messages
  if (error.code === '1000') {
    Alert.alert(
      'Apple Sign In Unavailable', 
      'Please ensure you are signed into iCloud in Settings and try again.'
    );
  } else {
    Alert.alert('Error', `Failed to sign in with Apple: ${error.message}`);
  }
}
```

### Common Error Codes:
- **1000**: Service not available (not signed into iCloud)
- **1001**: Unknown error
- **1002**: Cancelled by user
- **1003**: Invalid response
- **1004**: Not authorized
- **1005**: Failed

### If Nothing Works:
1. The simulator sometimes has issues with Apple Sign In
2. Testing on a real device is the most reliable method
3. You can continue development using Google Sign In for now