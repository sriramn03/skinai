import productImageUrls from '../data/productImageUrls.json';

// Simplified service that just returns pre-uploaded Firebase Storage URLs
class ProductImageService {
  private cachedUrls: Map<string, string> = new Map();

  /**
   * Get all pre-uploaded Firebase Storage URLs
   * No upload happens - just returns the URLs from JSON
   */
  async uploadAllProductImages(): Promise<Map<string, string>> {
    console.log('📁 Using pre-uploaded Firebase Storage URLs from JSON');
    
    // Convert JSON object to Map for compatibility with existing code
    const imageUrlMap = new Map<string, string>();
    
    Object.entries(productImageUrls).forEach(([localPath, firebaseUrl]) => {
      imageUrlMap.set(localPath, firebaseUrl);
      this.cachedUrls.set(localPath, firebaseUrl);
    });
    
    console.log(`✅ Loaded ${imageUrlMap.size} pre-uploaded Firebase URLs`);
    return imageUrlMap;
  }

  /**
   * Get Firebase URL for a specific product image path
   */
  async getProductImageUrl(localPath: string): Promise<string | null> {
    const firebaseUrl = (productImageUrls as Record<string, string>)[localPath];
    return firebaseUrl || null;
  }

  /**
   * Upload a single product image to Firebase Storage (or get pre-uploaded URL)
   */
  async uploadSingleProductImage(localPath: string): Promise<string> {
    console.log('📁 Getting Firebase URL for single product image:', localPath);
    
    // First check if we have a pre-uploaded URL for this image
    const firebaseUrl = (productImageUrls as Record<string, string>)[localPath];
    
    if (firebaseUrl) {
      console.log('✅ Found pre-uploaded Firebase URL:', firebaseUrl);
      return firebaseUrl;
    }
    
    // If no pre-uploaded URL found, return the local path as fallback
    console.log('⚠️ No pre-uploaded URL found, using local path as fallback');
    return localPath;
  }

  clearCache(): void {
    this.cachedUrls.clear();
  }
}

export const productImageService = new ProductImageService();
export default productImageService;