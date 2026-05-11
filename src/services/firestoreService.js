import { db } from '../config/firebase';
import { auth, app } from '../config/firebase';
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
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, getAuth, initializeAuth, getReactNativePersistence, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Secondary Firebase app instance for creating Auth accounts without affecting the admin's session
let secondaryApp = null;
const getSecondaryApp = () => {
  if (!secondaryApp) {
    const firebaseConfig = {
      apiKey: "AIzaSyAmPeFHNP97nWdgIP7BHadalAngQqtj31M",
      authDomain: "waze3li.firebaseapp.com",
      projectId: "waze3li",
      storageBucket: "waze3li.firebasestorage.app",
      messagingSenderId: "552654986809",
      appId: "1:552654986809:web:40e803ff110d8e8f4cf7e8",
      measurementId: "G-6ZC8MM3F90"
    };
    const { initializeApp } = require('firebase/app');
    secondaryApp = initializeApp(firebaseConfig, 'secondary');
  }
  return secondaryApp;
};

// User Operations
export const createUserDocument = async (userId, userData) => {
  try {
    // If no userId provided (signup before approval), use auto-generated ID
    if (!userId) {
      const docRef = await addDoc(collection(db, 'users'), {
        uid: null, // will be set to Auth UID when admin approves
        ...userData,
        approved: false,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      return { success: true, id: docRef.id };
    }
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

// Get user by email from Firestore
export const getUserByEmail = async (email) => {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
};

// Delete a rejected user's Firestore document so they can re-register
export const deleteRejectedUserDoc = async (docId) => {
  try {
    await deleteDoc(doc(db, 'users', docId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting rejected user doc:', error);
    return { success: false, error: error.message };
  }
};

export const getUserByUid = async (uid) => {
  try {
    // First try by Firestore document ID (for users created with setDoc using Auth UID)
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    // Fallback: query by uid field inside the document (for users created with addDoc)
    const q = query(collection(db, 'users'), where('uid', '==', uid));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
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
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User document not found' };
    }
    
    const userData = userDoc.data();
    const status = approved ? 'approved' : 'rejected';

    if (approved) {
      // Only create Firebase Auth account if user doesn't already have one
      let authUid = userData.uid; // may already have one
      
      if (!userData.uid) {
        // No Auth account yet — create one
        const secApp = getSecondaryApp();
        let secAuth;
        try {
          secAuth = initializeAuth(secApp, {
            persistence: getReactNativePersistence(AsyncStorage)
          });
        } catch (e) {
          secAuth = getAuth(secApp);
        }
        
        try {
          const userCredential = await createUserWithEmailAndPassword(secAuth, userData.email, userData.password);
          authUid = userCredential.user.uid;
          // Sign out from secondary auth immediately
          await signOut(secAuth);
        } catch (authError) {
          if (authError.code === 'auth/email-already-in-use') {
            // Auth account already exists — sign in to retrieve the UID
            console.warn('Auth account already exists for:', userData.email);
            try {
              const userCredential = await signInWithEmailAndPassword(secAuth, userData.email, userData.password);
              authUid = userCredential.user.uid;
              await signOut(secAuth);
              console.log('Retrieved existing auth UID:', authUid);
            } catch (signInError) {
              console.error('Could not retrieve existing auth UID:', signInError);
              authUid = null;
            }
          } else {
            console.error('Error creating Auth account:', authError);
            return { success: false, error: 'Failed to create auth account: ' + authError.message };
          }
        }
      }
      
      // Update Firestore: set approved, clear password, set auth UID
      await updateDoc(userRef, {
        approved,
        status,
        uid: authUid,
        password: null, // remove plain-text password for security
      });
    } else {
      // Rejected — just update status, no Auth account was created
      await updateDoc(userRef, { approved, status });
    }
    
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
      where('status', '==', 'approved')
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

export const getProductsByDairy = async (dairyId, productType = null) => {
  try {
    let q = query(
      collection(db, 'products'),
      where('dairyId', '==', dairyId)
    );
    
    if (productType && productType !== 'all') {
      q = query(
        collection(db, 'products'),
        where('dairyId', '==', dairyId),
        where('type', '==', productType)
      );
    }
    
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

export const deleteAllProductsForUser = async (dairyId) => {
  try {
    const q = query(collection(db, 'products'), where('dairyId', '==', dairyId));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => 
      deleteDoc(doc(db, 'products', doc.id))
    );
    
    await Promise.all(deletePromises);
    return { success: true, deletedCount: querySnapshot.size };
  } catch (error) {
    console.error('Error deleting all products for user:', error);
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

// Product Operations
export const getProductsByFactory = async (factoryId) => {
  try {
    const q = query(
      collection(db, 'products'),
      where('factoryId', '==', factoryId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting products by factory:', error);
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
  console.log('subscribeToShopOrders called with shopId:', shopId);
  try {
    // Try with ordering first
    const q = query(
      collection(db, 'orders'),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      console.log('Shop orders query snapshot size:', snapshot.size);
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(orders);
    });
  } catch (error) {
    console.log('Index not ready, using fallback query without ordering');
    const fallbackQ = query(
      collection(db, 'orders'),
      where('shopId', '==', shopId)
    );
    return onSnapshot(fallbackQ, (snapshot) => {
      console.log('Shop orders fallback query size:', snapshot.size);
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(orders);
    });
  }
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
  // Use simple query without ordering to avoid index requirement
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        // Handle missing or invalid createdAt dates
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA; // Sort descending (newest first)
      });
    callback(notifications);
  }, (error) => {
    console.error('Error in notifications subscription:', error);
    callback([]); // Return empty array on error
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

// Create notification for admin when new user registers
export const createAdminInscriptionNotification = async (newUser) => {
  try {
    // Find admin users
    const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
    const adminSnapshot = await getDocs(adminsQuery);
    
    if (adminSnapshot.empty) {
      console.log('No admin users found to notify');
      return;
    }
    
    // Create notification for each admin
    const notifications = adminSnapshot.docs.map(async (adminDoc) => {
      const notificationData = {
        type: 'new_inscription',
        title: 'طلب تسجيل جديد',
        body: `طلب تسجيل من: ${newUser.name || 'مستخدم جديد'} (${newUser.email || 'no email'}) - دور: ${newUser.role === 'dairy_owner' ? 'صاحب ملبنة' : 'صاحب محل'}`,
        read: false,
        createdAt: new Date().toISOString(),
        userId: adminDoc.id
      };
      
      await addDoc(collection(db, 'notifications'), notificationData);
      return notificationData;
    });
    
    await Promise.all(notifications);
    console.log(`Created ${notifications.length} admin notifications for new user: ${newUser.name}`);
    
  } catch (error) {
    console.error('Error creating admin inscription notifications:', error);
  }
};

// Send email notification to user about account status using EmailJS
export const sendUserStatusEmail = async (userId, userEmail, status, userName, userRole) => {
  try {
    // Create in-app notification in Firestore
    const notificationData = {
      type: 'account_status',
      title: status === 'approved' ? 'تمت الموافقة على حسابك' : 'تم رفض حسابك',
      body: `مرحباً ${userName}،\n\n${status === 'approved' ? 'لقد تمت الموافقة على حسابك في منصة وزعلي. يمكنك الآن تسجيل الدخول واستخدام جميع خدمات المنصة.' : 'نأسف، تم رفض حسابك في منصة وزعلي. يمكنك التواصل مع الدعم الفني للمزيد من المعلومات.'}`,
      read: false,
      createdAt: new Date().toISOString(),
      userId: userId
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);

    // Send email using EmailJS REST API with private key
    const templateId = status === 'approved' ? 'template_58zuku1' : 'template_5t4kkqr';

    const emailPayload = {
      service_id: 'service_z52px9l',
      template_id: templateId,
      user_id: 'CFIytbaFastq-jPWD',
      accessToken: 'mZfk62rofcK4Cb8ac4GcE',
      template_params: {
        to_email: userEmail,
        status: status,
        user_name: userName,
        user_role: userRole || 'user',
      }
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });
    
    if (response.ok) {
      console.log(`✅ ${status} email sent to ${userEmail}`);
    } else {
      const errorText = await response.text();
      console.error('❌ EmailJS API error:', errorText);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email notification:', error);
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
