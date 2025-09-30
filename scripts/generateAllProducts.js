const fs = require('fs');
const path = require('path');

// Read all category data files
const cleansersData = require('../src/data/cleansers.json');
const moisturizersData = require('../src/data/moisturizers.json');
const serumsData = require('../src/data/serums.json');
const exfoliatorsData = require('../src/data/exfoliators.json');
const sunscreensData = require('../src/data/sunscreens.json');
const darkskinData = require('../src/data/darkskin.json');
const treatmentsData = require('../src/data/treatments.json');
const exploreData = require('../src/data/explore.json');

// Combine all products into one array
const allProducts = [
  ...cleansersData.cleansers,
  ...moisturizersData.moisturizers,
  ...serumsData.serums,
  ...exfoliatorsData.exfoliators,
  ...sunscreensData.sunscreens,
  ...darkskinData.darkSkinProducts,
  ...treatmentsData.treatments,
  ...exploreData.trendingProducts
];

// Function to remove duplicates based on product name and brand
function removeDuplicates(products) {
  const seen = new Map();
  const duplicates = [];
  const unique = [];

  products.forEach((product, index) => {
    // Create a key using product name and brand (case insensitive)
    const key = `${product.productName?.toLowerCase().trim() || ''}-${product.brand?.toLowerCase().trim() || ''}`;
    
    if (seen.has(key)) {
      duplicates.push({
        duplicate: product,
        original: seen.get(key).product,
        duplicateIndex: index,
        originalIndex: seen.get(key).index
      });
      console.log(`🔍 DUPLICATE FOUND:`);
      console.log(`  Original: "${seen.get(key).product.productName}" by ${seen.get(key).product.brand} (index ${seen.get(key).index})`);
      console.log(`  Duplicate: "${product.productName}" by ${product.brand} (index ${index})`);
      console.log(`  → Keeping original, removing duplicate\n`);
    } else {
      seen.set(key, { product, index });
      unique.push(product);
    }
  });

  if (duplicates.length > 0) {
    console.log(`❌ Removed ${duplicates.length} duplicate products:`);
    duplicates.forEach(dup => {
      console.log(`   - "${dup.duplicate.productName}" by ${dup.duplicate.brand}`);
    });
    console.log('');
  } else {
    console.log('✅ No duplicate products found\n');
  }

  return unique;
}

// Remove duplicates
console.log('🔄 Checking for duplicate products...\n');
const uniqueProducts = removeDuplicates(allProducts);

// Add searchable fields to each product
const allProductsWithSearch = uniqueProducts.map(product => ({
  ...product,
  searchTerms: [
    product.productName?.toLowerCase() || '',
    product.brand?.toLowerCase() || '',
    product.category?.toLowerCase() || '',
    product.productType?.toLowerCase() || ''
  ].join(' ')
}));

// Create the final data structure
const finalData = {
  allProducts: allProductsWithSearch
};

// Write to file
const outputPath = path.join(__dirname, '../src/data/allProducts.json');
fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));

console.log(`📝 Generated allProducts.json with ${allProductsWithSearch.length} unique products`);
console.log(`📊 Sources included:`);
console.log(`   - Cleansers: ${cleansersData.cleansers.length}`);
console.log(`   - Moisturizers: ${moisturizersData.moisturizers.length}`);
console.log(`   - Serums: ${serumsData.serums.length}`);
console.log(`   - Exfoliators: ${exfoliatorsData.exfoliators.length}`);
console.log(`   - Sunscreens: ${sunscreensData.sunscreens.length}`);
console.log(`   - Dark Skin Products: ${darkskinData.darkSkinProducts.length}`);
console.log(`   - Treatments: ${treatmentsData.treatments.length}`);
console.log(`   - Trending Products (explore.json): ${exploreData.trendingProducts.length}`);
console.log(`   Total before deduplication: ${allProducts.length}`);
console.log(`   Final unique products: ${allProductsWithSearch.length}`);
console.log('\n✅ All products consolidated successfully!');