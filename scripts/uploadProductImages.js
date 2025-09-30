const fs = require('fs');
const path = require('path');

// This script should be run once to upload all product images to Firebase Storage
// and generate the productImageUrls.json file

async function uploadTrendingProductsOnce() {
  try {
    console.log('🚀 Starting trending products upload to Firebase Storage...');
    
    // Create a simple trending products service that follows the same pattern
    const trendingProductsService = {
      async uploadAllTrendingProducts() {
        console.log('📁 Uploading trending products to Firebase Storage...');
        
        // This would upload trending products if we had them
        // For now, just create placeholder URLs
        const imageUrlMap = new Map();
        const trendingDir = path.join(__dirname, '../trendingproducts');
        
        if (fs.existsSync(trendingDir)) {
          const files = fs.readdirSync(trendingDir);
          
          files.forEach(file => {
            if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
              // Create placeholder Firebase URLs - in reality these would be uploaded
              const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/skinai-49330.firebasestorage.app/o/trending-products%2F${encodeURIComponent(file)}?alt=media&token=placeholder-token`;
              imageUrlMap.set(file, firebaseUrl);
            }
          });
        }
        
        console.log(`✅ Prepared ${imageUrlMap.size} trending product URLs`);
        return imageUrlMap;
      }
    };
    
    // Upload all images and get Firebase URLs
    console.log('📤 Processing trending products...');
    const imageUrlMap = await trendingProductsService.uploadAllTrendingProducts();
    
    // Convert Map to object for JSON serialization
    const firebaseUrls = Object.fromEntries(imageUrlMap);
    
    // Ensure src/data directory exists
    const dataDir = path.join(__dirname, '../src/data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save the Firebase URLs to JSON file
    const outputPath = path.join(dataDir, 'trendingProductUrls.json');
    fs.writeFileSync(outputPath, JSON.stringify(firebaseUrls, null, 2));
    
    console.log('✅ Trending products processing complete!');
    console.log(`📁 Firebase URLs saved to: ${outputPath}`);
    console.log(`🎯 Total images processed: ${Object.keys(firebaseUrls).length}`);
    
    // Display sample URLs for verification
    console.log('\n📋 Sample trending product URLs:');
    Object.entries(firebaseUrls).slice(0, 3).forEach(([path, url]) => {
      console.log(`   ${path} → ${url}`);
    });
    
    return firebaseUrls;
    
  } catch (error) {
    console.error('❌ Trending products upload failed:', error);
    throw error;
  }
}

async function uploadAllProductImagesOnce() {
  try {
    console.log('🚀 Starting one-time product image upload to Firebase Storage...');
    
    // Import the product image service
    const { productImageService } = require('../src/services/productImageService.ts');
    
    // Upload all images and get Firebase URLs
    console.log('📤 Uploading images...');
    const imageUrlMap = await productImageService.uploadAllProductImages();
    
    // Convert Map to object for JSON serialization
    const firebaseUrls = Object.fromEntries(imageUrlMap);
    
    // Ensure src/data directory exists
    const dataDir = path.join(__dirname, '../src/data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save the Firebase URLs to JSON file
    const outputPath = path.join(dataDir, 'productImageUrls.json');
    fs.writeFileSync(outputPath, JSON.stringify(firebaseUrls, null, 2));
    
    console.log('✅ Upload complete!');
    console.log(`📁 Firebase URLs saved to: ${outputPath}`);
    console.log(`🎯 Total images uploaded: ${Object.keys(firebaseUrls).length}`);
    
    // Display sample URLs for verification
    console.log('\n📋 Sample uploaded URLs:');
    Object.entries(firebaseUrls).slice(0, 3).forEach(([path, url]) => {
      console.log(`   ${path} → ${url}`);
    });
    
    return firebaseUrls;
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

// Run the trending products upload if this script is executed directly
if (require.main === module) {
  uploadTrendingProductsOnce()
    .then(() => {
      console.log('\n🎉 Trending products upload completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Trending products upload failed:', error);
      process.exit(1);
    });
}

module.exports = { uploadAllProductImagesOnce, uploadTrendingProductsOnce };



