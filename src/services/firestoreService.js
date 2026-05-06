import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';

// User Operations
export const createUserDocument = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      uid: userId,
      ...userData,
      approved: false,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating user document:', error);
    return { success: false, error: error.message };
  }
};

export const getUserByUid = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const updateUserApproval = async (userId, approved) => {
  try {
    const userRef = doc(db, 'users', userId);
    const status = approved ? 'approved' : 'rejected';
    await updateDoc(userRef, { approved, status });
    return { success: true };
  } catch (error) {
    console.error('Error updating user approval:', error);
    return { success: false, error: error.message };
  }
};

export const getPendingUsers = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting pending users:', error);
    return [];
  }
};

export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

export const getApprovedUsers = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      where('approved', '==', true)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting approved users:', error);
    return [];
  }
};

export const getRejectedUsers = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      where('status', '==', 'rejected')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting rejected users:', error);
    return [];
  }
};

export const getAllOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all orders:', error);
    return [];
  }
};

// Product Operations
export const addProduct = async (productData) => {
  try {
    await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding product:', error);
    return { success: false, error: error.message };
  }
};

export const getProductsByDairy = async (dairyId) => {
  try {
    const q = query(
      collection(db, 'products'),
      where('dairyId', '==', dairyId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

export const getAllProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all products:', error);
    return [];
  }
};

export const updateProduct = async (productId, productData) => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, productData);
    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error: error.message };
  }
};

export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, 'products', productId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: error.message };
  }
};

// Order Operations
export const createOrder = async (orderData) => {
  try {
    await addDoc(collection(db, 'orders'), {
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: error.message };
  }
};

export const getOrdersByShop = async (shopId) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting shop orders:', error);
    return [];
  }
};

export const getOrdersByDairy = async (dairyId) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('dairyId', '==', dairyId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting dairy orders:', error);
    return [];
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status });
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
};

// Dairy Operations
export const getAllDairies = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'dairy_owner'),
      where('approved', '==', true)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting dairies:', error);
    return [];
  }
};

// Subscribe to orders for real-time updates (Dairy Owner)
export const subscribeToDairyOrders = (dairyId, callback) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('dairyId', '==', dairyId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(orders);
    });
  } catch (error) {
    console.log('Index not ready, using fallback query without ordering');
    const fallbackQ = query(
      collection(db, 'orders'),
      where('dairyId', '==', dairyId)
    );
    return onSnapshot(fallbackQ, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(orders);
    });
  }
};

// Subscribe to orders for real-time updates (Shop Owner)
export const subscribeToShopOrders = (shopId, callback) => {
  const q = query(
    collection(db, 'orders'),
    where('shopId', '==', shopId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(orders);
  }, (error) => {
    console.error('Error in shop orders subscription:', error);
    // Fallback to query without ordering if index issue
    const fallbackQ = query(
      collection(db, 'orders'),
      where('shopId', '==', shopId)
    );
    return onSnapshot(fallbackQ, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(orders);
    });
  });
};

// Notification Operations
export const createNotification = async (userId, notificationData) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      ...notificationData,
      read: false,
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

export const subscribeToNotifications = (userId, callback) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(notifications);
  }, (error) => {
    console.error('Error in notifications subscription:', error);
    // Fallback to query without ordering if index issue
    const fallbackQ = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );
    return onSnapshot(fallbackQ, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(notifications);
    });
  });
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const batch = [];
    snapshot.docs.forEach((docSnap) => {
      batch.push(updateDoc(doc(db, 'notifications', docSnap.id), { read: true }));
    });
    await Promise.all(batch);
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

// Enhanced createOrder with notifications
export const createOrderWithNotification = async (orderData) => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Notify the dairy owner about the new order
    await createNotification(orderData.dairyId, {
      type: 'new_order',
      title: 'طلب جديد',
      body: `طلب جديد من ${orderData.shopName || 'صاحب محل'}`,
      orderId: docRef.id,
      shopId: orderData.shopId,
      shopName: orderData.shopName,
    });

    return { success: true, orderId: docRef.id };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: error.message };
  }
};

// Enhanced updateOrderStatus with notifications
export const updateOrderStatusWithNotification = async (orderId, status, shopId, shopName, dairyName) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { 
      status,
      updatedAt: new Date().toISOString()
    });

    // Notify the shop owner about the status change
    const statusMessages = {
      accepted: { title: 'طلب مقبول', body: `تم قبول طلبك من ${dairyName || 'الملبنة'}` },
      rejected: { title: 'طلب مرفوض', body: `تم رفض طلبك من ${dairyName || 'الملبنة'}` },
      completed: { title: 'طلب مكتمل', body: `تم إكمال طلبك من ${dairyName || 'الملبنة'}` },
    };

    const msg = statusMessages[status];
    if (msg && shopId) {
      await createNotification(shopId, {
        type: `order_${status}`,
        title: msg.title,
        body: msg.body,
        orderId,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
};
