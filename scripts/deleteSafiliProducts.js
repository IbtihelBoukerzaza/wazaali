import { db } from '../config/firebase';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

// Find safili user and delete all their products
const deleteSafiliProducts = async () => {
  try {
    console.log('🔍 Finding safili user...');
    
    // Find user with businessName containing 'safili' or 'صفيلي'
    const usersQuery = query(
      collection(db, 'users'),
      where('businessName', '>=', 'safili'),
      where('businessName', '<=', 'safilj')
    );
    
    const safiliQuery = query(
      collection(db, 'users'),
      where('businessName', '>=', 'صفيلي'),
      where('businessName', '<=', 'صفيلي\ufffd')
    );
    
    const [usersSnapshot, safiliSnapshot] = await Promise.all([
      getDocs(usersQuery),
      getDocs(safiliQuery)
    ]);
    
    const allUsers = [...usersSnapshot.docs, ...safiliSnapshot.docs];
    
    if (allUsers.length === 0) {
      console.log('❌ No safili user found');
      return;
    }
    
    // Get the first safili user found
    const safiliUser = allUsers[0];
    const safiliUserId = safiliUser.data().uid || safiliUser.id;
    
    console.log(`✅ Found safili user: ${safiliUser.data().businessName} (ID: ${safiliUserId})`);
    
    // Get all products for this user
    const productsQuery = query(
      collection(db, 'products'),
      where('dairyId', '==', safiliUserId)
    );
    
    const productsSnapshot = await getDocs(productsQuery);
    const productCount = productsSnapshot.size;
    
    console.log(`📦 Found ${productCount} products to delete`);
    
    if (productCount === 0) {
      console.log('ℹ️ No products to delete');
      return;
    }
    
    // Delete all products
    const deletePromises = productsSnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    
    console.log(`🗑️ Successfully deleted all ${productCount} products for safili user`);
    console.log('✅ Operation completed successfully');
    
  } catch (error) {
    console.error('❌ Error deleting safili products:', error);
  }
};

// Run the deletion
deleteSafiliProducts();
