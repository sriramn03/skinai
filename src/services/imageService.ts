import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export interface UserImage {
  id: string;
  imageUrl: string;
  storagePath: string;
  createdAt: any;
  analysisId?: string; // Optional - only set when linked to analysis
  metadata: {
    width?: number;
    height?: number;
    size: number;
    type: string;
  };
}

/**
 * Saves an image directly when captured or selected (before analysis)
 * @param imageUri - Local URI of the image to save
 * @returns Promise with the saved image metadata
 */
export const saveUserImage = async (imageUri: string): Promise<UserImage> => {
  try {
    console.log('Saving user image directly to Firebase...');
    return await uploadImageToFirebase(imageUri);
  } catch (error) {
    console.error('Error saving user image:', error);
    throw error;
  }
};

/**
 * Uploads an image to Firebase Storage and saves metadata to Firestore
 * @param imageUri - Local URI of the image to upload
 * @param analysisId - Optional ID to link this image with an analysis
 * @returns Promise with the download URL and image metadata
 */
export const uploadImageToFirebase = async (
  imageUri: string,
  analysisId?: string
): Promise<UserImage> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    console.log('Starting image upload to Firebase Storage...');
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `skin_analysis_${timestamp}.jpg`;
    const storagePath = `users/${currentUser.uid}/images/${filename}`;
    
    // Create reference to Firebase Storage
    const storageRef = storage().ref(storagePath);
    
    // Upload the image
    console.log('Uploading image from:', imageUri);
    const uploadTask = storageRef.putFile(imageUri);
    
    // Wait for upload to complete
    await uploadTask;
    console.log('Image uploaded successfully');
    
    // Get download URL
    const downloadURL = await storageRef.getDownloadURL();
    console.log('Download URL obtained:', downloadURL);
    
    // Get image metadata
    const metadata = await storageRef.getMetadata();
    console.log('Storage metadata:', metadata);
    
    // Create image record for Firestore
    const imageId = firestore().collection('temp').doc().id; // Generate unique ID
    const imageData: UserImage = {
      id: imageId,
      imageUrl: downloadURL,
      storagePath: storagePath,
      createdAt: firestore.FieldValue.serverTimestamp(),
      ...(analysisId && { analysisId: analysisId }), // Only include if not undefined
      metadata: {
        size: metadata.size || 0,
        type: metadata.contentType || 'image/jpeg',
      }
    };
    
    console.log('Image data to be saved:', {
      ...imageData,
      createdAt: 'FieldValue.serverTimestamp()' // Don't log the actual FieldValue
    });
    
    // Save image metadata to Firestore
    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('images')
      .doc(imageId)
      .set(imageData);
    
    console.log('Image metadata saved to Firestore');
    
    return imageData;
    
  } catch (error) {
    console.error('Error uploading image to Firebase:', error);
    throw error;
  }
};

/**
 * Gets all images for the current user
 * @returns Promise with array of user images
 */
export const getUserImages = async (): Promise<UserImage[]> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found');
      return [];
    }

    const imagesSnapshot = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('images')
      .orderBy('createdAt', 'desc')
      .get();

    const images: UserImage[] = [];
    imagesSnapshot.forEach(doc => {
      images.push(doc.data() as UserImage);
    });

    console.log(`Found ${images.length} images for user`);
    return images;
    
  } catch (error) {
    console.error('Error fetching user images:', error);
    throw error;
  }
};

/**
 * Deletes an image from Firebase Storage and Firestore
 * @param imageId - The ID of the image to delete
 */
export const deleteUserImage = async (imageId: string): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Get image data first
    const imageDoc = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('images')
      .doc(imageId)
      .get();

    if (!imageDoc.exists) {
      throw new Error('Image not found');
    }

    const imageData = imageDoc.data() as UserImage;
    
    // Delete from Firebase Storage
    const storageRef = storage().ref(imageData.storagePath);
    await storageRef.delete();
    console.log('Image deleted from Firebase Storage');
    
    // Delete from Firestore
    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('images')
      .doc(imageId)
      .delete();
    
    console.log('Image metadata deleted from Firestore');
    
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Gets images associated with a specific analysis
 * @param analysisId - The analysis ID to filter by
 * @returns Promise with array of images for the analysis
 */
export const getImagesByAnalysis = async (analysisId: string): Promise<UserImage[]> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found');
      return [];
    }

    const imagesSnapshot = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('images')
      .where('analysisId', '==', analysisId)
      .orderBy('createdAt', 'desc')
      .get();

    const images: UserImage[] = [];
    imagesSnapshot.forEach(doc => {
      images.push(doc.data() as UserImage);
    });

    console.log(`Found ${images.length} images for analysis ${analysisId}`);
    return images;
    
  } catch (error) {
    console.error('Error fetching images by analysis:', error);
    throw error;
  }
};

/**
 * Uploads perfect skin image from backend URL to Firebase Storage
 * @param perfectSkinImageUrl - Backend URL of the perfect skin image
 * @returns Promise with the Firebase Storage download URL
 */
export const uploadPerfectSkinImageToFirebase = async (
  perfectSkinImageUrl: string
): Promise<string> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    console.log('Starting perfect skin image upload to Firebase Storage...');
    
    // Download the image from backend
    const response = await fetch(perfectSkinImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const imageBlob = await response.blob();
    console.log('Image downloaded from backend, size:', imageBlob.size);
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `perfect_skin_${timestamp}.jpg`;
    const storagePath = `users/${currentUser.uid}/perfect_skin/${filename}`;
    
    // Create reference to Firebase Storage
    const storageRef = storage().ref(storagePath);
    
    // Upload the image blob
    console.log('Uploading perfect skin image to Firebase Storage...');
    await storageRef.put(imageBlob);
    console.log('Perfect skin image uploaded successfully');
    
    // Get download URL
    const downloadURL = await storageRef.getDownloadURL();
    console.log('Perfect skin image Firebase URL:', downloadURL);
    
    return downloadURL;
    
  } catch (error) {
    console.error('Error uploading perfect skin image to Firebase:', error);
    throw error;
  }
};