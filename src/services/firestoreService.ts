import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { AnalysisResults } from './analysisService';
import { productImageService } from './productImageService';

export interface UserSkinData {
  dreamSkin?: string;
  skinType?: string;
  perfectSkinImageUrl?: string; // Legacy field
  perfectSkin?: string; // New field for perfect skin image URL
  perfectSkinUpdated?: any; // Timestamp for when perfect skin was last updated
  createdAt?: any;
  updatedAt?: any;
}

export interface UserRatings extends AnalysisResults {
  id?: string; // Analysis ID for linking with images
  createdAt?: any;
  updatedAt?: any;
  images?: {
    id: string;
    imageUrl: string;
    storagePath: string;
    metadata: {
      width?: number;
      height?: number;
      size: number;
      type: string;
    };
  }[];
}

export interface UserSubscriptionData {
  isSubscribed: boolean;
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'never_subscribed';
  lastSubscriptionCheck: any; // Will be serverTimestamp
  hasEverPaid: boolean;
  customerInfo?: {
    activeSubscriptions: string[];
    allPurchasedProductIdentifiers: string[];
    originalAppUserId: string;
    latestExpirationDate?: string;
    originalPurchaseDate?: string;
    willRenew?: boolean;
  };
  updatedAt?: any;
}

export const saveUserSkinData = async (dreamSkin: string, skinType: string): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const userData: UserSkinData = {
      dreamSkin,
      skinType,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .set(userData, { merge: true });

    console.log('User skin data saved successfully');
  } catch (error) {
    console.error('Error saving user skin data:', error);
    throw error;
  }
};

export const saveUserSkinType = async (skinType: 'oily' | 'normal' | 'dry' | 'combination'): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .set(
        {
          skinType,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log('User skinType saved successfully:', skinType);
  } catch (error) {
    console.error('Error saving user skinType:', error);
    throw error;
  }
};

export type DreamSkinType = 'clear' | 'glass' | 'porcelain' | 'honey';

export const saveUserDreamSkin = async (dreamSkin: DreamSkinType): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .set(
        {
          dreamSkin,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log('User dreamSkin saved successfully:', dreamSkin);
  } catch (error) {
    console.error('Error saving user dreamSkin:', error);
    throw error;
  }
};

export const saveUserSubscriptionData = async (subscriptionData: Partial<UserSubscriptionData>): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const dataToSave = {
      ...subscriptionData,
      lastSubscriptionCheck: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .set({ subscription: dataToSave }, { merge: true });

    console.log('User subscription data saved successfully');
  } catch (error) {
    console.error('Error saving user subscription data:', error);
    throw error;
  }
};

export const getUserSubscriptionData = async (): Promise<UserSubscriptionData | null> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.warn('No authenticated user for subscription data');
      return null;
    }

    const doc = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    console.log('User subscription data:', data);
    return data?.subscription || null;
  } catch (error) {
    console.error('Error fetching user subscription data:', error);
    return null;
  }
};

export const saveUserRatings = async (ratings: AnalysisResults, analysisId?: string, imageData?: { id: string; imageUrl: string; storagePath: string; metadata: { width?: number; height?: number; size: number; type: string; } }): Promise<string> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Generate unique analysis ID if not provided
    const analysisDocId = analysisId || firestore().collection('temp').doc().id;

    const ratingsData: UserRatings = {
      ...ratings,
      id: analysisDocId,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      createdAt: firestore.FieldValue.serverTimestamp(),
      ...(imageData && { images: [imageData] }),
    };

    // Save ONLY to analyses collection (remove duplicate to userRatings/latest)
    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('analyses')
      .doc(analysisDocId)
      .set(ratingsData);

    console.log('Analysis saved successfully with ID:', analysisDocId);
    return analysisDocId;
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
};

export interface SkincareStep {
  step: number;
  name: string;
  category: string;
  purpose: string;
  productType: string;
  howTo: string;
  optional?: string;
  productName?: string;
  amazonUrl?: string;
  productImage?: string;
  whyEffective?: string;
  rateOfImportance?: number;
  daysToApply?: string;
}

export interface SkincareRoutine {
  stepCount: string;
  steps: SkincareStep[];
  dreamSkinType: string;
  skinType: string;
  createdAt?: any;
  updatedAt?: any;
}

export const saveSkincareRoutine = async (period: 'AM' | 'PM', routine: SkincareStep[], dreamSkinType: string, skinType: string): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const routineData: SkincareRoutine = {
      stepCount: `${routine.length} steps`,
      steps: routine,
      dreamSkinType,
      skinType,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('skincare')
      .doc(period)
      .set(routineData);

    console.log(`${period} skincare routine saved successfully`);
  } catch (error) {
    console.error(`Error saving ${period} skincare routine:`, error);
    throw error;
  }
};

/**
 * Process skincare routines with conditional logic, upload product images, and save to Firestore
 */
export const processAndSaveSkincareRoutines = async (
  userData: UserSkinData, 
  analysisResults: AnalysisResults,
  dreamSkinTemplates: any
): Promise<void> => {
  try {
    console.log('Starting skincare routine processing and image upload...');
    
    // First, upload all product images to Firebase Storage
    const imageUrlMap = await productImageService.uploadAllProductImages();
    console.log('Product images uploaded successfully');

    // Get the dream skin template
    const dreamSkinKey = (userData.dreamSkin || 'clear').toLowerCase() + 'Skin';
    const template = dreamSkinTemplates.dreamSkinTemplates[dreamSkinKey];
    
    if (!template) {
      throw new Error(`No template found for dream skin type: ${userData.dreamSkin}`);
    }

    const productMapping = dreamSkinTemplates.productCategoryMapping;
    const conditionalProducts = dreamSkinTemplates.conditionalProducts;
    
    // Check breakout threshold for conditional logic
    const hasBreakouts = analysisResults.breakouts >= (conditionalProducts.breakoutDetection?.threshold || 0.2);
    
    // Helper function to process routine with conditional logic and image URLs
    const processRoutine = (routine: any) => {
      return routine.steps.map((step: any) => {
        // Handle optional steps based on breakout threshold
        if (step.optional === 'breakouts' && !hasBreakouts) {
          return null; // Remove this step if no breakouts detected
        }

        // Check if this step should be replaced by conditional product
        let finalStep = { ...step };
        
        if (hasBreakouts && step.category === 'brightening treatment') {
          // Replace with Face Reality Sal‑C Toner
          const conditionalProduct = (conditionalProducts.breakoutDetection?.products as any)?.['brightening treatment'];
          if (conditionalProduct) {
            const firebaseImageUrl = imageUrlMap.get(conditionalProduct.productImage) || conditionalProduct.productImage;
            
            finalStep = {
              ...step,
              name: conditionalProduct.name,
              productType: conditionalProduct.productType,
              purpose: conditionalProduct.purpose,
              howTo: conditionalProduct.howTo,
              category: 'brightening treatment',
              productName: conditionalProduct.name,
              amazonUrl: conditionalProduct.amazonUrl,
              productImage: firebaseImageUrl,
              whyEffective: `${conditionalProduct.purpose} - specifically formulated for breakout-prone skin.`,
              rateOfImportance: 4,
              ...(conditionalProduct.daysToApply && { daysToApply: conditionalProduct.daysToApply }) // optional
            };
          }
        } else {
          // Get personalized product details from productCategoryMapping
          const categoryMapping = productMapping[step.category] || productMapping[step.name];
          
          if (categoryMapping) {
            let skinTypeMapping;
            
            // Handle both skin-type specific and universal mappings
            if ('all' in categoryMapping) {
              skinTypeMapping = categoryMapping.all;
            } else if (userData.skinType && userData.skinType in categoryMapping) {
              skinTypeMapping = categoryMapping[userData.skinType];
            }
            
            if (skinTypeMapping && typeof skinTypeMapping === 'object') {
              const localImagePath = skinTypeMapping.productImage;
              const firebaseImageUrl = imageUrlMap.get(localImagePath) || localImagePath;
              
              finalStep = {
                ...step,
                productType: skinTypeMapping.productType || step.productType,
                howTo: skinTypeMapping.howTo || step.howTo,
                productName: skinTypeMapping.productName,
                amazonUrl: skinTypeMapping.amazonUrl,
                productImage: firebaseImageUrl,
                whyEffective: skinTypeMapping.whyEffective,
                rateOfImportance: skinTypeMapping.rateOfImportance,
                ...(skinTypeMapping.daysToApply && { daysToApply: skinTypeMapping.daysToApply }) // optional
              };
            }
          }
        }

        return finalStep;
      }).filter((step: any) => step !== null); // Remove null steps (optional steps that were filtered out)
    };

    // Process both routines
    const amRoutine = processRoutine(template.amRoutine);
    const pmRoutine = processRoutine(template.pmRoutine);

    // Save both routines to Firestore
    await Promise.all([
      saveSkincareRoutine('AM', amRoutine, userData.dreamSkin || 'clear', userData.skinType || 'normal'),
      saveSkincareRoutine('PM', pmRoutine, userData.dreamSkin || 'clear', userData.skinType || 'normal')
    ]);

    console.log('Skincare routines processed and saved successfully with Firebase Storage image URLs');
    
  } catch (error) {
    console.error('Error processing and saving skincare routines:', error);
    throw error;
  }
};

export const getSkincareRoutine = async (period: 'AM' | 'PM'): Promise<SkincareRoutine | null> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found');
      return null;
    }

    const routineDoc = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('skincare')
      .doc(period)
      .get();

    if (routineDoc.exists()) {
      const data = routineDoc.data() as SkincareRoutine;
      console.log(`${period} skincare routine found:`, data);
      return data;
    }

    console.log(`No ${period} skincare routine found`);
    return null;
  } catch (error) {
    console.error(`Error fetching ${period} skincare routine:`, error);
    throw error;
  }
};

/**
 * Upload a single product image to Firebase Storage
 */
export const uploadSingleProductImage = async (localImagePath: string): Promise<string> => {
  try {
    const productImageService = (await import('../services/productImageService')).default;
    const imageUrlMap = await productImageService.uploadSingleProductImage(localImagePath);
    return imageUrlMap || localImagePath;
  } catch (error) {
    console.error('Error uploading single product image:', error);
    return localImagePath; // Fallback to local path
  }
};

/**
 * Add a product to an existing skincare routine
 */
export const addProductToRoutine = async (
  period: 'AM' | 'PM',
  product: {
    productName: string;
    brand: string;
    category: string;
    productImage: string;
    amazonUrl: string;
    howTo?: string;
    overview?: string;
    price?: number;
    rating?: number;
  }
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Get current routine
    const currentRoutine = await getSkincareRoutine(period);
    if (!currentRoutine) {
      throw new Error(`No ${period} routine found. Please create a routine first.`);
    }

    // Upload product image to Firebase Storage
    const firebaseImageUrl = await uploadSingleProductImage(product.productImage);

    // Get the next step number
    const nextStepNumber = currentRoutine.steps.length + 1;

    // Create new skincare step from product
    const newStep: SkincareStep = {
      step: nextStepNumber,
      name: product.productName,
      category: product.category,
      purpose: 'Added manually', // Default purpose
      productType: product.category,
      howTo: product.howTo || 'Apply as directed',
      productName: product.productName,
      amazonUrl: product.amazonUrl,
      productImage: firebaseImageUrl,
      whyEffective: product.overview || 'Manually added product for skincare routine',
      rateOfImportance: product.rating ? Math.round(product.rating / 20) : 3, // Convert 0-100 to 1-5
    };

    // Add new step to existing steps
    const updatedSteps = [...currentRoutine.steps, newStep];

    // Update routine data
    const updatedRoutineData: SkincareRoutine = {
      ...currentRoutine,
      steps: updatedSteps,
      stepCount: `${updatedSteps.length} steps`,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    // Save updated routine to Firestore
    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('skincare')
      .doc(period)
      .set(updatedRoutineData);

    console.log(`Product added to ${period} routine successfully`);
  } catch (error) {
    console.error(`Error adding product to ${period} routine:`, error);
    throw error;
  }
};

/**
 * Delete a product from an existing skincare routine
 */
export const deleteRoutineStep = async (
  period: 'AM' | 'PM',
  stepNumber: number
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Get current routine
    const currentRoutine = await getSkincareRoutine(period);
    if (!currentRoutine) {
      throw new Error(`No ${period} routine found`);
    }

    // Filter out the step to delete
    const updatedSteps = currentRoutine.steps
      .filter(step => step.step !== stepNumber)
      .map((step, index) => ({
        ...step,
        step: index + 1 // Re-number remaining steps
      }));

    // Update routine data
    const updatedRoutineData: SkincareRoutine = {
      ...currentRoutine,
      steps: updatedSteps,
      stepCount: `${updatedSteps.length} steps`,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    // Save updated routine to Firestore
    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('skincare')
      .doc(period)
      .set(updatedRoutineData);

    console.log(`Step ${stepNumber} deleted from ${period} routine successfully`);
    
  } catch (error) {
    console.error(`Error deleting step from ${period} routine:`, error);
    throw error;
  }
};

export const getUserRatings = async (): Promise<UserRatings | null> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found');
      return null;
    }

    console.log('Fetching latest analysis for user:', currentUser.uid);
    
    // Get the most recent analysis from analyses collection
    const analysesSnapshot = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('analyses')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!analysesSnapshot.empty) {
      const data = analysesSnapshot.docs[0].data() as UserRatings;
      console.log('Latest analysis found:', data);
      return data;
    }

    console.log('No analyses found in Firestore');
    return null;
  } catch (error) {
    console.error('Error fetching latest analysis:', error);
    throw error;
  }
};

export const getUserSkinData = async (): Promise<UserSkinData | null> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found');
      return null;
    }

    console.log('Fetching data for user:', currentUser.uid);
    
    const userDoc = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .get();

    if (userDoc.exists()) {
      const data = userDoc.data() as UserSkinData;
      console.log('User data found:', data);
      return data;
    }

    console.log('No user document found in Firestore');
    return null;
  } catch (error) {
    console.error('Error fetching user skin data:', error);
    throw error; // Re-throw to handle in calling function
  }
};

// Check if user can perform a new scan (24-hour limit)
export const canPerformNewScan = async (): Promise<boolean> => {
  try {
    const latestAnalysis = await getUserRatings();
    
    if (!latestAnalysis || !latestAnalysis.createdAt) {
      // No previous analysis found, user can scan
      return true;
    }

    // Convert Firestore timestamp to Date
    const lastScanTime = latestAnalysis.createdAt.toDate();
    const currentTime = new Date();
    // const currentTime = new Date(2025, 8, 3); 

    
    // Calculate time difference in milliseconds
    const timeDifference = currentTime.getTime() - lastScanTime.getTime();
    
    // 24 hours in milliseconds = 24 * 60 * 60 * 1000
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    console.log('Last scan time:', lastScanTime);
    console.log('Current time:', currentTime);
    console.log('Time difference (hours):', timeDifference / (60 * 60 * 1000));
    
    return timeDifference >= twentyFourHours;
  } catch (error) {
    console.error('Error checking scan eligibility:', error);
    // If there's an error, allow the scan (fail-safe)
    return true;
  }
};

// Store gender analytics data
export async function incrementGenderCount(gender: string) {
  try {
    const genderDocRef = firestore().collection('gender').doc('stats');
    
    // Use FieldValue.increment to atomically increment the counter
    const fieldToIncrement = gender.toLowerCase() === 'male' ? 'male' : 'female';
    
    await genderDocRef.set({
      [fieldToIncrement]: firestore.FieldValue.increment(1)
    }, { merge: true });
    
    console.log(`Incremented ${fieldToIncrement} gender count`);
  } catch (error) {
    console.error('Error incrementing gender count:', error);
    throw error;
  }
}

// Store referral code analytics data
export async function handleReferralCode(referralCode: string) {
  try {
    if (!referralCode || referralCode.trim() === '') {
      return;
    }
    
    const referralDocRef = firestore().collection('referrals').doc(referralCode);
    
    // Check if the referral code exists
    const doc = await referralDocRef.get();
    
    if (doc.exists()) {
      // Increment the used count
      await referralDocRef.update({
        used: firestore.FieldValue.increment(1),
        lastUsed: firestore.FieldValue.serverTimestamp()
      });
      console.log(`Incremented usage count for referral code: ${referralCode}`);
    } else {
      // Create new referral code document
      await referralDocRef.set({
        used: 1,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastUsed: firestore.FieldValue.serverTimestamp()
      });
      console.log(`Created new referral code document: ${referralCode}`);
    }
  } catch (error) {
    console.error('Error handling referral code:', error);
    throw error;
  }
}

// Perfect Skin Image Functions
export const savePerfectSkinImageUrl = async (perfectSkinImageUrl: string): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .set({
        perfectSkin: perfectSkinImageUrl,
        perfectSkinUpdated: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

    console.log('Perfect skin image URL saved to user document:', perfectSkinImageUrl);
  } catch (error) {
    console.error('Error saving perfect skin image URL:', error);
    throw error;
  }
};

export const getUserPerfectSkinImageUrl = async (): Promise<string | null> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const userDoc = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .get();

    if (userDoc.exists()) {
      const userData = userDoc.data() as UserSkinData;
      return userData.perfectSkin || userData.perfectSkinImageUrl || null; // Support both field names for backward compatibility
    }

    return null;
  } catch (error) {
    console.error('Error retrieving perfect skin image URL:', error);
    return null;
  }
};