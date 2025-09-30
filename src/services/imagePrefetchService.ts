import { Image } from 'expo-image';
import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import { getUserRatings } from './firestoreService';
// add after existing imports
import type { SkincareRoutine } from './firestoreService';



class ImagePrefetchService {
  private prefetchedImages = new Set<string>();
  private prefetchPromises = new Map<string, Promise<void>>();

  /**
   * Prefetch the latest analysis image for the current user
   * This should be called on app startup to avoid loading delays
   */
  async prefetchLatestAnalysisImage(): Promise<void> {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('No authenticated user, skipping image prefetch');
        return;
      }

      console.log('Starting analysis image prefetch for user:', currentUser.uid);
      
      // Get the latest analysis data
      const userRatings = await getUserRatings();
      
      if (!userRatings?.images || userRatings.images.length === 0) {
        console.log('No analysis images found for prefetching');
        return;
      }

      const imageUrl = userRatings.images[0].imageUrl;
      
      // Check if already prefetched
      if (this.prefetchedImages.has(imageUrl)) {
        console.log('Analysis image already prefetched');
        return;
      }

      // Check if already prefetching
      if (this.prefetchPromises.has(imageUrl)) {
        console.log('Analysis image prefetch already in progress');
        await this.prefetchPromises.get(imageUrl);
        return;
      }

      // Start prefetching
      console.log('Prefetching analysis image:', imageUrl);
      const prefetchPromise = this.prefetchImage(imageUrl);
      this.prefetchPromises.set(imageUrl, prefetchPromise);
      
      await prefetchPromise;
      
      this.prefetchedImages.add(imageUrl);
      this.prefetchPromises.delete(imageUrl);
      
      console.log('Analysis image prefetched successfully');
      
    } catch (error) {
      console.error('Error prefetching analysis image:', error);
    }
  }

  /**
   * Prefetch a specific image URL
   */
  private async prefetchImage(imageUrl: string): Promise<void> {
    try {
      // Don't add cache busting for Android to improve caching
      const finalUrl = Platform.OS === 'android' ? imageUrl : this.addCacheBustingParam(imageUrl);
      
      // Prefetch the image using expo-image with Android optimizations
      await Image.prefetch(finalUrl, {
        cachePolicy: Platform.OS === 'android' ? 'memory-disk' : 'disk',
      });
      
      console.log('Image prefetched:', finalUrl);
    } catch (error) {
      console.error('Error prefetching image:', imageUrl, error);
      throw error;
    }
  }
  // add below prefetchImage(...)
private async prefetchImageExact(imageUrl: string): Promise<void> {
  try {
    await Image.prefetch(imageUrl, { 
      cachePolicy: Platform.OS === 'android' ? 'memory-disk' : 'disk'
    });
    console.log('Image prefetched (exact):', imageUrl);
  } catch (error) {
    console.error('Error prefetching product image:', imageUrl, error);
  }
}

// add anywhere in the class (public)
async prefetchSkincareImages(am?: SkincareRoutine | null, pm?: SkincareRoutine | null): Promise<void> {
  try {
    const urls = new Set<string>();
    [am, pm].forEach(r =>
      r?.steps?.forEach(s => {
        if (s.productImage && typeof s.productImage === 'string') urls.add(s.productImage);
      })
    );
    const tasks: Promise<void>[] = [];
    urls.forEach(url => {
      if (!this.prefetchedImages.has(url)) {
        tasks.push(
          this.prefetchImageExact(url).then((): void => {
            this.prefetchedImages.add(url);
          })
        );
      }
    });
    await Promise.all(tasks);
    console.log(`Prefetched ${urls.size} skincare product images`);
  } catch (e) {
    console.error('Prefetch skincare images failed:', e);
  }
}

  /**
   * Add cache busting parameter to ensure fresh content
   */
  private addCacheBustingParam(imageUrl: string): string {
    try {
      // Simple cache busting without URL constructor for React Native compatibility
      const separator = imageUrl.includes('?') ? '&' : '?';
      return `${imageUrl}${separator}v=${Date.now()}`;
    } catch (error) {
      // If URL modification fails, return original URL
      console.warn('Could not add cache busting to URL:', imageUrl);
      return imageUrl;
    }
  }

  /**
   * Check if an image has been prefetched
   */
  isImagePrefetched(imageUrl: string): boolean {
    return this.prefetchedImages.has(imageUrl);
  }

  /**
   * Clear all prefetch cache
   */
  clearPrefetchCache(): void {
    this.prefetchedImages.clear();
    this.prefetchPromises.clear();
    console.log('Prefetch cache cleared');
  }

  /**
   * Prefetch analysis image when a new analysis is completed
   */
  async prefetchNewAnalysisImage(imageUrl: string): Promise<void> {
    try {
      if (this.prefetchedImages.has(imageUrl)) {
        return;
      }

      console.log('Prefetching new analysis image:', imageUrl);
      await this.prefetchImage(imageUrl);
      this.prefetchedImages.add(imageUrl);
      
    } catch (error) {
      console.error('Error prefetching new analysis image:', error);
    }
  }

  /**
   * Prefetch explore page product images to prevent flickering
   */
  async prefetchExploreImages(): Promise<void> {
    try {
      console.log('Starting explore page product image prefetch...');
      
      // Import explore.json data
      const exploreData = require('../data/explore.json');
      const trendingProducts = exploreData.trendingProducts || [];
      
      // Get the first 4 products for the trending cards
      const firstFourProducts = trendingProducts.slice(0, 4);
      
      // Extract image URLs that aren't placeholders
      const imageUrls = firstFourProducts
        .map((product: any) => product.productImage)
        .filter((url: string) => url && !url.includes('placeholder'));
      
      console.log(`Prefetching ${imageUrls.length} explore product images...`);
      
      // Android-specific optimized prefetching
      if (Platform.OS === 'android') {
        // Prefetch images in smaller batches for Android to prevent overwhelming
        const batchSize = 2;
        for (let i = 0; i < imageUrls.length; i += batchSize) {
          const batch = imageUrls.slice(i, i + batchSize);
          const batchPromises = batch.map(async (url: string) => {
            if (!this.prefetchedImages.has(url)) {
              await this.prefetchImageExact(url);
              this.prefetchedImages.add(url);
            }
          });
          
          await Promise.all(batchPromises);
          
          // Small delay between batches for Android
          if (i + batchSize < imageUrls.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      } else {
        // Standard prefetch for iOS
        const prefetchPromises = imageUrls.map(async (url: string) => {
          if (!this.prefetchedImages.has(url)) {
            await this.prefetchImage(url);
            this.prefetchedImages.add(url);
          }
        });
        
        await Promise.all(prefetchPromises);
      }
      
      console.log('Explore product images prefetched successfully');
      
    } catch (error) {
      console.error('Error prefetching explore product images:', error);
    }
  }

  /**
   * Prefetch category images to prevent flickering on browse by category section
   */
  async prefetchCategoryImages(): Promise<void> {
    try {
      console.log('Starting category images prefetch...');
      
      // Category image URLs
      const categoryImageUrls = [
        'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fcleanser_dry_cleanser.png?alt=media&token=d77e7c24-b125-45a3-9282-f75d9f69e17b',
        'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fmoisturizers_dry_moisturizer.png?alt=media&token=553d83d0-9df1-409c-accf-92b771be895d',
        'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fhydration.png?alt=media&token=f3c9c0a2-8a45-4e94-bf98-d27e29e1a586',
        'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fexfoliators_dry_exfoliator.png?alt=media&token=41af97fb-7c32-49d7-8093-f47d8965f70c',
        'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fsunscreen.png?alt=media&token=601149c5-9900-459b-b758-463fcfb37d1c',
        'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fversed.webp?alt=media&token=238996d5-0587-46ce-8e68-c14ba4148bcf',
        'https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/product-images%2Fspot.png?alt=media&token=c068dfe0-87ef-4820-bdd5-1975194db5ad'
      ];
      
      console.log(`Prefetching ${categoryImageUrls.length} category images...`);
      
      // Android-specific optimized prefetching
      if (Platform.OS === 'android') {
        // Prefetch images in smaller batches for Android
        const batchSize = 3;
        for (let i = 0; i < categoryImageUrls.length; i += batchSize) {
          const batch = categoryImageUrls.slice(i, i + batchSize);
          const batchPromises = batch.map(async (url: string) => {
            if (!this.prefetchedImages.has(url)) {
              await this.prefetchImageExact(url);
              this.prefetchedImages.add(url);
            }
          });
          
          await Promise.all(batchPromises);
          
          // Small delay between batches for Android
          if (i + batchSize < categoryImageUrls.length) {
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }
      } else {
        // Standard prefetch for iOS
        const prefetchPromises = categoryImageUrls.map(async (url: string) => {
          if (!this.prefetchedImages.has(url)) {
            await this.prefetchImage(url);
            this.prefetchedImages.add(url);
          }
        });
        
        await Promise.all(prefetchPromises);
      }
      
      console.log('Category images prefetched successfully');
      
    } catch (error) {
      console.error('Error prefetching category images:', error);
    }
  }

  /**
   * Prefetch ALL category product images for smooth CategoryModal experience
   */
  async prefetchAllCategoryProducts(): Promise<void> {
    try {
      console.log('Starting comprehensive category product image prefetch...');
      
      // Import all category data files
      const cleansersData = require('../data/cleansers.json');
      const moisturizersData = require('../data/moisturizers.json');
      const serumsData = require('../data/serums.json');
      const exfoliatorsData = require('../data/exfoliators.json');
      const sunscreensData = require('../data/sunscreens.json');
      const darkskinData = require('../data/darkskin.json');
      const treatmentsData = require('../data/treatments.json');
      
      // Collect all product images from all categories
      const allProducts = [
        ...cleansersData.cleansers,
        ...moisturizersData.moisturizers,
        ...serumsData.serums,
        ...exfoliatorsData.exfoliators,
        ...sunscreensData.sunscreens,
        ...darkskinData.darkSkinProducts,
        ...treatmentsData.treatments
      ];
      
      // Extract unique image URLs
      const imageUrls = [...new Set(
        allProducts
          .map((product: any) => product.productImage)
          .filter((url: string) => url && !url.includes('placeholder'))
      )];
      
      console.log(`Prefetching ${imageUrls.length} category product images...`);
      
      // Prefetch all images in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        const batchPromises = batch.map(async (url: string) => {
          if (!this.prefetchedImages.has(url)) {
            await this.prefetchImageExact(url);
            this.prefetchedImages.add(url);
          }
        });
        
        await Promise.all(batchPromises);
        
        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < imageUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log('All category product images prefetched successfully');
      
    } catch (error) {
      console.error('Error prefetching category product images:', error);
    }
  }

  /**
   * Prefetch static app assets to prevent flicker on navigation
   * Note: expo-image automatically caches local assets when they're first loaded
   * with cachePolicy="memory-disk", so explicit prefetching isn't needed for local files
   */
  async prefetchStaticAssets(): Promise<void> {
    try {
      console.log('Static assets will be cached automatically by expo-image on first use');
      
      // Local assets (require statements) are bundled with the app and don't need prefetching
      // expo-image handles caching automatically when these images are rendered
      // with cachePolicy="memory-disk" which is already set on all our Image components
      
      // If you have remote URLs to prefetch, add them here:
      // const remoteUrls = ['https://example.com/image.png'];
      // await Promise.all(remoteUrls.map(url => Image.prefetch(url)));
      
    } catch (error) {
      console.error('Error in prefetchStaticAssets:', error);
    }
  }
}

// Export singleton instance
export const imagePrefetchService = new ImagePrefetchService();
export default imagePrefetchService;