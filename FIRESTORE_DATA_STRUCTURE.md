# Firestore Data Structure for Skin Analysis

## 🔥 **What Gets Saved to Firestore**

When you use the app starting from "Begin Scan", here's exactly what data will be stored:

### **1. Analysis Results Collection (with Embedded Images)**
```
/users/{userId}/analyses/{analysisId}
```
**Data saved when analysis completes:**
```json
{
  "id": "analysis_id",
  "overall": 78,
  "potential": 85,
  "hydration": 75,
  "smoothness": 80,
  "tone": 82,
  "clarity": 78,
  "skinType": "combination",
  "hyperpigmentation": 0.3,
  "redness": 0.2,
  "breakouts": 0.1,
  "wrinkles": 0.15,
  "texture": 0.25,
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z",
  "images": [
    {
      "id": "analysis_id",
      "imageUrl": "https://firebasestorage.googleapis.com/...",
      "storagePath": "users/{userId}/images/skin_analysis_1234567890.jpg",
      "metadata": {
        "size": 2048576,
        "type": "image/jpeg"
      }
    }
  ]
}
```

### **2. User Profile Data**
```
/users/{userId}
```
**Basic user profile information:**
```json
{
  "dreamSkin": "Glass",
  "skinType": "combination",
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

### **3. Skincare Routines**
```
/users/{userId}/skincare/{AM|PM}
```
**Generated skincare routines:**
```json
{
  "stepCount": "4 steps",
  "dreamSkinType": "Glass",
  "skinType": "combination",
  "steps": [
    {
      "step": 1,
      "name": "Gentle Cleanser",
      "category": "Cleanser",
      "purpose": "Remove impurities",
      "productType": "Gel cleanser"
    }
  ],
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

## 🧪 **Testing Flow**

1. **Sign In** → App starts at "Begin Scan"
2. **Take/Select Photo** → Photo selected but not yet saved
3. **Run Analysis** → Analysis results saved to Firestore with embedded image data
4. **Check Data** → Use Firebase Console to see your stored data in `/users/{userId}/analyses/`

## 🛠 **Key Changes Made**

- ✅ **Fixed Duplicates**: Analysis now saved only to `analyses` collection (not both `userRatings/latest` and `analyses`)
- ✅ **Embedded Images**: Image data now embedded directly in analysis documents
- ✅ **No Separate Images Collection**: Images no longer saved separately to `/images/` collection
- ✅ **Streamlined**: Single document per analysis with all related data

## 📱 **How to Test**

1. **Run the app**: `npm start` or `expo start`
2. **Sign in** with Google
3. **Go to Camera** from Begin Scan screen
4. **Select photo** from gallery or take new photo
5. **Run analysis** 
6. **Check Firebase Console** to see stored data

## 🔄 **Reverting for Production**

When you're done testing, simply uncomment the original navigation code in `App.tsx`:

```typescript
// Remove the testing lines:
// console.log('App: Going to beginScan for testing image storage');
// setCurrentScreen('beginScan');

// Uncomment the original logic:
if (existingRatings) {
  console.log('App: User has existing ratings, going to dashboard');
  setCurrentScreen('dashboard');
} else {
  console.log('App: No existing ratings, going to beginScan');
  setCurrentScreen('beginScan');
}
```

## 📊 **Data Benefits**

- **Complete History**: Every photo and analysis is saved
- **User Journey**: Track skin improvement over time  
- **Analytics**: Understand usage patterns
- **Recovery**: Never lose user data
- **Personalization**: Enhanced recommendations based on history