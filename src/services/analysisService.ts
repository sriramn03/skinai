// Frontend service for sending images to backend for analysis
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { saveUserRatings, savePerfectSkinImageUrl } from './firestoreService';
import { uploadPerfectSkinImageToFirebase } from './imageService';

interface AnalysisResults {
  overall: number;
  potential: number;
  hydration: number;
  smoothness: number;
  tone: number;
  clarity: number;
  skinType: string;
  hyperpigmentation: number;
  redness: number;
  breakouts: number;
  wrinkles: number;
  texture: number;
  perfectSkinImageUrl?: string;
}

// Backend server URL - change this to your deployed backend URL
const BACKEND_URL = 'https://skinai-backend-u6cw.onrender.com';
// const BACKEND_URL = 'http://localhost:3010'; // Local development server

export async function analyzePimple(imageUri: string): Promise<any> {
  console.log('Analyze pimple called with imageUri:', imageUri);
  
  try {
    // Create FormData to send image to backend
    const formData = new FormData();
    
    // For React Native, we need to handle the image URI differently
    const imageData = {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'pimple.jpg',
    };
    
    formData.append('image', imageData as any);
    
    console.log('Sending pimple image to backend for analysis...');
    
    // Send to backend
    const response = await fetch(`${BACKEND_URL}/analyze-pimple`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Pimple analysis result from backend:', result);

    if (!result.success) {
      throw new Error(result.error || 'Analysis failed');
    }

    return result.analysis;

  } catch (error) {
    console.error('Error in pimple analysis:', error);
    // Return fallback data on error
    return {
      pimpleDetected: true,
      severity: "medium",
      description: "Unable to analyze the specific details of the pimple due to a connection issue.",
      treatmentSteps: [
        "Gently cleanse the affected area with a mild cleanser",
        "Apply a spot treatment with salicylic acid or benzoyl peroxide", 
        "Use a non-comedogenic moisturizer to prevent dryness",
        "Avoid touching or picking at the pimple"
      ],
      timeframe: "5-7 days",
      prevention: "Maintain a consistent skincare routine and avoid touching your face"
    };
  }
}

export async function analyzeFood(imageUri: string): Promise<any> {
  console.log('Analyze food called with imageUri:', imageUri);
  
  try {
    // Create FormData to send image to backend
    const formData = new FormData();
    
    // For React Native, we need to handle the image URI differently
    const imageData = {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'food.jpg',
    };
    
    formData.append('image', imageData as any);
    
    console.log('Sending food image to backend for analysis...');
    
    // Send to backend
    const response = await fetch(`${BACKEND_URL}/analyze-food`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend response error:', response.status, errorText);
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Food analysis result from backend:', result);

    if (!result.success) {
      throw new Error(result.error || 'Food analysis failed');
    }

    return result.analysis;

  } catch (error) {
    console.error('Error in food analysis:', error);
    throw error;
  }
}

export async function analyzeProduct(imageUri: string): Promise<any> {
  console.log('Analyze product called with imageUri:', imageUri);
  
  try {
    // Create FormData to send image to backend
    const formData = new FormData();
    
    // For React Native, we need to handle the image URI differently
    const imageData = {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'product.jpg',
    };
    
    formData.append('image', imageData as any);
    
    console.log('Sending product image to backend for analysis...');
    
    // Send to backend
    const response = await fetch(`${BACKEND_URL}/analyze-product`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend response error:', response.status, errorText);
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Product analysis result from backend:', result);

    if (!result.success) {
      throw new Error(result.error || 'Product analysis failed');
    }

    return result.analysis;

  } catch (error) {
    console.error('Error in product analysis:', error);
    throw error;
  }
}

export async function analyzeImage(imageUri: string, saveToFirestore: boolean = true, simplified: boolean = false, overall?: number, potential?: number, userSkinType?: 'oily' | 'dry' | 'normal' | 'combination', isPotential: boolean = false): Promise<AnalysisResults> {
  try {
    console.log('Starting parallel image analysis and Firebase upload for:', imageUri);

    // Create FormData to send image to backend
    const formData = new FormData();
    
    // For React Native, we need to handle the image URI differently
    const imageData = {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    };
    
    formData.append('image', imageData as any);
    
    // Add simplified flag to form data
    if (simplified) {
      formData.append('simplified', 'true');
    }

    // Add overall and potential if provided
    if (overall !== undefined) {
      formData.append('overall', overall.toString());
    }
    if (potential !== undefined) {
      formData.append('potential', potential.toString());
    }
    if (userSkinType) {
      formData.append('userSkinType', userSkinType);
    }
    
    // Add isPotential flag
    if (isPotential) {
      formData.append('isPotential', 'true');
    }

    console.log('Running backend analysis and Firebase upload in parallel...');

    // Run backend analysis and Firebase operations in parallel
    const promises: Promise<any>[] = [
      // Backend analysis
      fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      })
    ];

    // Add Firebase operations if requested
    let analysisIdPromise: Promise<string> | null = null;
    if (saveToFirestore) {
      // We'll need to save analysis results first to get the ID, then upload image
      // So we'll handle Firebase operations after we get the analysis results
      console.log('Will save to Firebase after analysis completes...');
    }

    // Wait for backend analysis
    const [analysisResponse] = await Promise.all(promises);

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json();
      throw new Error(`Backend error: ${errorData.error || 'Unknown error'}`);
    }

    const data = await analysisResponse.json();
    console.log('Backend analysis completed:', data);

    if (!data.success) {
      throw new Error(`Analysis failed: ${data.error}`);
    }

    // Handle potential mode response (only perfectSkinImageUrl, no analysis results)
    if (data.perfectSkinImageUrl && !data.results) {
      console.log('Potential mode response - only perfect skin image');
      return {
        perfectSkinImageUrl: `${BACKEND_URL}${data.perfectSkinImageUrl}`,
        overall: 0,
        potential: 0,
        hydration: 0,
        smoothness: 0,
        tone: 0,
        clarity: 0,
        skinType: 'normal',
        hyperpigmentation: 0,
        redness: 0,
        breakouts: 0,
        wrinkles: 0,
        texture: 0
      } as AnalysisResults;
    }
    
    const results = data.results as AnalysisResults;
    
    // Add perfectSkinImageUrl if it exists in the response
    if (data.perfectSkinImageUrl) {
      results.perfectSkinImageUrl = `${BACKEND_URL}${data.perfectSkinImageUrl}`;
      console.log('Perfect skin image URL:', results.perfectSkinImageUrl);
    }

    // Validate the results
    if (!validateResults(results)) {
      throw new Error('Invalid response format from backend');
    }

    console.log('Analysis completed successfully:', results);

    // OPTIMIZATION: Handle Firebase operations in background (truly non-blocking)
    if (saveToFirestore) {
      // Don't await this - let it run in background and return results immediately
      console.log('Starting background Firebase save (non-blocking)...');
      handleFirebaseSave(imageUri, results).catch(error => {
        console.error('Background Firebase save failed:', error);
      });
    }
    
    return results;

  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

// Helper function to handle Firebase operations asynchronously
async function handleFirebaseSave(imageUri: string, results: AnalysisResults): Promise<void> {
  try {
    console.log('Starting background Firebase save with embedded image...');
    
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Generate unique analysis ID
    const analysisId = firestore().collection('temp').doc().id;
    
    // Create promises array for parallel execution
    const promises: Promise<any>[] = [];
    
    // Upload original image to Firebase Storage
    const uploadOriginalImagePromise = (async () => {
      const timestamp = Date.now();
      const filename = `skin_analysis_${timestamp}.jpg`;
      const storagePath = `users/${currentUser.uid}/images/${filename}`;
      
      console.log('Uploading original image to Firebase Storage...');
      const storageRef = storage().ref(storagePath);
      await storageRef.putFile(imageUri);
      
      // Get download URL and metadata
      const [downloadURL, metadata] = await Promise.all([
        storageRef.getDownloadURL(),
        storageRef.getMetadata()
      ]);
      
      console.log('Original image uploaded successfully, download URL:', downloadURL);
      
      return {
        id: analysisId,
        imageUrl: downloadURL,
        storagePath: storagePath,
        metadata: {
          size: metadata.size || 0,
          type: metadata.contentType || 'image/jpeg',
        }
      };
    })();
    promises.push(uploadOriginalImagePromise);
    
    // Handle perfect skin image if it exists
    if (results.perfectSkinImageUrl) {
      console.log('Perfect skin image detected, uploading to Firebase Storage...');
      
      const uploadPerfectSkinPromise = uploadPerfectSkinImageToFirebase(results.perfectSkinImageUrl)
        .then(async (firebaseUrl) => {
          // Update the results object with Firebase URL
          results.perfectSkinImageUrl = firebaseUrl;
          
          // Save the URL to user document
          await savePerfectSkinImageUrl(firebaseUrl);
          console.log('Perfect skin image URL saved to user document');
          
          return firebaseUrl;
        });
      promises.push(uploadPerfectSkinPromise);
    }
    
    // Wait for all uploads to complete
    const [imageData] = await Promise.all(promises);
    
    // Save analysis with embedded image data
    await saveUserRatings(results, analysisId, imageData);
    
    console.log('Analysis with embedded image saved successfully with ID:', analysisId);
  } catch (error) {
    console.error('Background Firebase save failed:', error);
    // This is running in background, so we don't throw
  }
}



function validateResults(results: any): results is AnalysisResults {
  if (!results || typeof results !== 'object') return false;
  
  const requiredNumberFields = ['overall', 'potential', 'hydration', 'smoothness', 'tone', 'clarity'];
  const requiredConcernFields = ['hyperpigmentation', 'redness', 'breakouts', 'wrinkles', 'texture'];
  
  // Validate 0-100 scale fields
  for (const field of requiredNumberFields) {
    if (!(field in results) || typeof results[field] !== 'number' || results[field] < 0 || results[field] > 100) {
      return false;
    }
  }
  
  // Validate 0-1 scale concern fields
  for (const field of requiredConcernFields) {
    if (!(field in results) || typeof results[field] !== 'number' || results[field] < 0 || results[field] > 1) {
      return false;
    }
  }
  
  // Validate skin type
  const validSkinTypes = ['oily', 'dry', 'combination', 'normal'];
  if (!results.skinType || !validSkinTypes.includes(results.skinType.toLowerCase())) {
    return false;
  }
  
  return true;
}

export type { AnalysisResults };