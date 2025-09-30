import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth, { GoogleAuthProvider, AppleAuthProvider } from '@react-native-firebase/auth';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import '../config/firebaseConfig'; // Ensure Firebase is initialized

// Configure Google Sign-In with webClientId from google-services.json
GoogleSignin.configure({
  webClientId: '806342866300-ashs0col9js8vsk6ilvmrkdeh8blk3rb.apps.googleusercontent.com',
});

export async function onGoogleButtonPress() {
  // Check if your device supports Google Play
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  
  // Get the users ID token
  const signInResult = await GoogleSignin.signIn();

  // Get the ID token from the sign-in result
  const idToken = signInResult.data?.idToken;
  if (!idToken) {
    throw new Error('No ID token found');
  }

  // Create a Google credential with the token
  const googleCredential = GoogleAuthProvider.credential(idToken);

  // Sign-in the user with the credential
  return auth().signInWithCredential(googleCredential);
}

export async function onAppleButtonPress() {
  // Start the sign-in request
  const appleAuthRequestResponse = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });

  // Ensure Apple returned a user identityToken
  if (!appleAuthRequestResponse.identityToken) {
    throw new Error('Apple Sign-In failed - no identify token returned');
  }

  // Create a Firebase credential from the response
  const { identityToken, nonce } = appleAuthRequestResponse;
  const appleCredential = AppleAuthProvider.credential(identityToken, nonce);

  // Sign the user in with the credential
  const userCredential = await auth().signInWithCredential(appleCredential);

  // Update user profile with name if available
  if (appleAuthRequestResponse.fullName && userCredential.user) {
    const displayName = `${appleAuthRequestResponse.fullName.givenName || ''} ${appleAuthRequestResponse.fullName.familyName || ''}`.trim();
    if (displayName) {
      await userCredential.user.updateProfile({ displayName });
    }
  }

  return userCredential;
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return userCredential;
  } catch (error: any) {
    // Handle specific error codes
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled.');
    } else {
      throw new Error(error.message || 'Failed to sign in. Please try again.');
    }
  }
}

export async function createAccountWithEmail(email: string, password: string) {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    return userCredential;
  } catch (error: any) {
    // Handle specific error codes
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account already exists with this email address.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    } else {
      throw new Error(error.message || 'Failed to create account. Please try again.');
    }
  }
}

export const signOut = async () => {
  try {
    await GoogleSignin.signOut();
    await auth().signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};