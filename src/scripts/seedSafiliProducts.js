// Seed script to add Safili dairy products
// Run this in the app or as a standalone script

import { db } from '../config/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { safiliProducts } from '../data/safiliProducts';

export const seedSafiliProducts = async (dairyId) => {
  if (!dairyId) {
    console.error('Error: dairyId is required');
    return { success: false, error: 'dairyId is required' };
  }

  const results = {
    success: [],
    failed: []
  };

  for (const product of safiliProducts) {
    try {
      const productData = {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        image: product.image,
        category: product.category,
        dairyId: dairyId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'products'), productData);
      results.success.push({ id: docRef.id, name: product.name });
      console.log(`✅ Added: ${product.name}`);
    } catch (error) {
      results.failed.push({ name: product.name, error: error.message });
      console.error(`❌ Failed: ${product.name}`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully added: ${results.success.length} products`);
  console.log(`❌ Failed: ${results.failed.length} products`);

  return { 
    success: true, 
    added: results.success.length, 
    failed: results.failed.length,
    details: results
  };
};

// Function to find Safili user by name or email
export const findSafiliUser = async () => {
  try {
    // Try to find by dairyName containing "Safili" or "صفيلي"
    const q = query(
      collection(db, 'users'),
      where('dairyName', '>=', 'Safili'),
      where('dairyName', '<=', 'Safili\uf8ff')
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    // Try Arabic name
    const q2 = query(
      collection(db, 'users'),
      where('dairyName', '>=', 'صفيلي'),
      where('dairyName', '<=', 'صفيلي\uf8ff')
    );
    
    const snapshot2 = await getDocs(q2);
    if (!snapshot2.empty) {
      return snapshot2.docs[0].id;
    }

    // Try by userType = dairy
    const q3 = query(
      collection(db, 'users'),
      where('userType', '==', 'dairy')
    );
    
    const snapshot3 = await getDocs(q3);
    if (!snapshot3.empty) {
      // Return first dairy user found
      return snapshot3.docs[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error finding Safili user:', error);
    return null;
  }
};

// Auto-seed function that finds the user and adds products
export const autoSeedSafiliProducts = async () => {
  console.log('🔍 Looking for Safili dairy user...');
  
  const dairyId = await findSafiliUser();
  
  if (!dairyId) {
    console.error('❌ Safili dairy user not found. Please provide dairyId manually.');
    return { 
      success: false, 
      error: 'Safili dairy user not found',
      message: 'Please call seedSafiliProducts(dairyId) with the correct user ID'
    };
  }

  console.log(`✅ Found Safili user: ${dairyId}`);
  console.log('🌱 Seeding products...\n');

  return await seedSafiliProducts(dairyId);
};

export default { seedSafiliProducts, findSafiliUser, autoSeedSafiliProducts };
