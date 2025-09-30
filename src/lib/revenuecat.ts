import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage,
  PurchasesOffering,
} from "react-native-purchases";
import { AppEventsLogger } from 'react-native-fbsdk-next';
import { saveUserSubscriptionData, UserSubscriptionData } from "../services/firestoreService";

/**
 * Use your real RC public API keys. You shared an iOS one earlier; keep Android empty if iOS-only.
 * Never ship your secret keys in the app.
 */
const RC_IOS_API_KEY = "appl_IpIUsBFapWkCVKMxPwXNugZsBaU"; // <- your iOS PUBLIC key
const RC_ANDROID_API_KEY = "goog_JdjtyNNdfNQKlONtgbiKRlGJGQG"; // Android API key

// Change this to your actual entitlement identifier in RC.
// You created an entitlement called "Derm AI"; identifiers are case-sensitive.
export const ENTITLEMENT_ID = "Derm AI"; // e.g., "premium_access" if you rename it

export async function configureRevenueCat(appUserID?: string) {
  // Set log level with error handling for Android
  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  } catch (error) {
    console.warn('RevenueCat setLogLevel failed:', error);
    // Continue without debug logging
  }

  // Validate API keys
  const apiKey = Platform.OS === "ios" ? RC_IOS_API_KEY : RC_ANDROID_API_KEY;
  if (!apiKey) {
    throw new Error(`RevenueCat API key not set for ${Platform.OS}`);
  }

  console.log(`Configuring RevenueCat for ${Platform.OS} with API key: ${apiKey.substring(0, 10)}...`);

  await Purchases.configure({
    apiKey,
    appUserID, // optional: pass a stable user id from your auth if you have one
  });

  console.log('RevenueCat configured successfully');

  // Collect device identifiers for Meta Ads integration
  await collectDeviceIdentifiersForMeta();
}

/**
 * Collect device identifiers required for RevenueCat Meta Ads integration
 */
export async function collectDeviceIdentifiersForMeta() {
  try {
    // Automatically collect $idfa, $idfv, $gpsAdId, and $ip
    Purchases.collectDeviceIdentifiers();
    
    // REQUIRED: Set Facebook Anonymous ID for Meta integration
    const fbAnonymousId = await AppEventsLogger.getAnonymousID();
    if (fbAnonymousId) {
      Purchases.setFBAnonymousID(fbAnonymousId);
      console.log('Facebook Anonymous ID set for Meta integration');
    }
    
    console.log('Device identifiers collected for Meta Ads integration');
  } catch (error) {
    console.error('Error collecting device identifiers for Meta:', error);
  }
}

/**
 * Update device identifiers after iOS App Tracking Transparency permission is granted
 * Call this after the user accepts ATT permission to update the $idfa attribute
 */
export async function updateDeviceIdentifiersAfterATT() {
  try {
    // Re-collect device identifiers to get the IDFA after ATT permission is granted
    Purchases.collectDeviceIdentifiers();
    console.log('Device identifiers updated after ATT permission granted');
  } catch (error) {
    console.error('Error updating device identifiers after ATT:', error);
  }
}

/**
 * Set user email for Meta Ads targeting (optional)
 */
export function setUserEmailForMeta(email: string) {
  try {
    Purchases.setEmail(email);
    console.log('User email set for Meta integration');
  } catch (error) {
    console.error('Error setting user email for Meta:', error);
  }
}

/**
 * Set user phone number for Meta Ads targeting (optional)
 */
export function setUserPhoneForMeta(phoneNumber: string) {
  try {
    Purchases.setPhoneNumber(phoneNumber);
    console.log('User phone number set for Meta integration');
  } catch (error) {
    console.error('Error setting user phone number for Meta:', error);
  }
}

export async function getOfferings() {
  return Purchases.getOfferings(); // { current, all }
}

export async function getCustomerInfo() {
  return Purchases.getCustomerInfo();
}

export async function isEntitled(info: CustomerInfo | null) {
  if (!info) {
    console.log('RevenueCat: isEntitled called with null info');
    return false;
  }
  
  const activeEntitlements = Object.keys(info.entitlements.active);
  const isEntitledResult = !!info.entitlements.active[ENTITLEMENT_ID];
  
  console.log('RevenueCat: isEntitled check:', {
    entitlementId: ENTITLEMENT_ID,
    activeEntitlements,
    isEntitled: isEntitledResult,
    allEntitlements: Object.keys(info.entitlements.all)
  });
  
  return isEntitledResult;
}

export async function purchasePackage(pkg: PurchasesPackage) {
  console.log('RevenueCat: Starting purchase for package:', pkg.identifier, 'on', Platform.OS);
  
  try {
    const result = await Purchases.purchasePackage(pkg);
    console.log('RevenueCat: Purchase successful, customer info:', result.customerInfo.originalAppUserId);
    
    // Save subscription data to Firestore after successful purchase
    await saveSubscriptionToFirestore(result.customerInfo);
    
    return result.customerInfo; // check entitlements after purchase
  } catch (error: any) {
    console.error('RevenueCat: Purchase failed:', error);
    
    // Handle Android-specific purchase errors
    if (Platform.OS === 'android') {
      if (error.code === 'USER_CANCELLED') {
        console.log('RevenueCat: User cancelled purchase on Android');
        throw { ...error, userCancelled: true };
      } else if (error.code === 'PAYMENT_PENDING') {
        console.log('RevenueCat: Payment pending on Android');
        throw { ...error, message: 'Payment is pending. Please wait for confirmation.' };
      } else if (error.code === 'ITEM_ALREADY_OWNED') {
        console.log('RevenueCat: Item already owned on Android');
        // Try to restore purchases
        const customerInfo = await Purchases.restorePurchases();
        return customerInfo;
      }
    }
    
    throw error;
  }
}

export async function restorePurchases() {
  const info = await Purchases.restorePurchases();
  
  // Save subscription data to Firestore after restore
  await saveSubscriptionToFirestore(info);
  
  return info;
}

export function onCustomerInfoChanged(cb: (info: CustomerInfo) => void) {
  return Purchases.addCustomerInfoUpdateListener(cb);
}

export async function logInRevenueCat(appUserID: string) {
  // Optional: only if you maintain your own auth id
  const result = await Purchases.logIn(appUserID);
  return result.customerInfo;
}

export async function logOutRevenueCat() {
  const customerInfo = await Purchases.logOut();
  return customerInfo;
}

export async function saveSubscriptionToFirestore(customerInfo: CustomerInfo) {
  try {
    const isSubscribed = await isEntitled(customerInfo);
    const activeSubscriptions = Object.keys(customerInfo.entitlements.active);
    const allPurchasedProducts = customerInfo.allPurchasedProductIdentifiers;
    
    // Determine subscription status
    let subscriptionStatus: UserSubscriptionData['subscriptionStatus'] = 'never_subscribed';
    if (isSubscribed) {
      subscriptionStatus = 'active';
    } else if (allPurchasedProducts.length > 0) {
      subscriptionStatus = 'expired';
    }
    
    // Check if user has ever paid
    const hasEverPaid = allPurchasedProducts.length > 0 || 
                       Object.keys(customerInfo.nonSubscriptionTransactions).length > 0 ||
                       Object.keys(customerInfo.entitlements.all).length > 0;
    
    // Find latest expiration date
    let latestExpirationDate: string | null = null;
    let willRenew = false;
    
    if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      latestExpirationDate = entitlement.expirationDate || null;
      willRenew = entitlement.willRenew;
    }
    
    // Build customer info object, filtering out undefined values
    const customerInfoData: any = {
      activeSubscriptions,
      allPurchasedProductIdentifiers: allPurchasedProducts,
      originalAppUserId: customerInfo.originalAppUserId,
      willRenew,
    };
    
    // Only add optional fields if they have values
    if (latestExpirationDate !== null) {
      customerInfoData.latestExpirationDate = latestExpirationDate;
    }
    if (customerInfo.originalPurchaseDate) {
      customerInfoData.originalPurchaseDate = customerInfo.originalPurchaseDate;
    }
    
    const subscriptionData: Partial<UserSubscriptionData> = {
      isSubscribed,
      subscriptionStatus,
      hasEverPaid,
      customerInfo: customerInfoData,
    };
    
    await saveUserSubscriptionData(subscriptionData);
    console.log('Subscription data saved to Firestore successfully');
    
    return subscriptionData;
  } catch (error) {
    console.error('Error saving subscription to Firestore:', error);
    throw error;
  }
}