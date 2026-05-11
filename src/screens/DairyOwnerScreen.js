import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import { getOrdersByDairy, updateOrderStatusWithNotification, subscribeToDairyOrders, subscribeToNotifications, getProductsByDairy, addProduct, updateProduct, deleteProduct, getUserByUid } from '../services/firestoreService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../config/firebase';
import NotificationDropdown from '../components/NotificationDropdown';
import { useNavigation } from '@react-navigation/native';
import {
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  updateProfile,
} from 'firebase/auth';

const { width } = Dimensions.get('window');

export default function DairyOwnerScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('home');
  const [activeFilter, setActiveFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    activeProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    image: null,
    type: '',
  });
  const [editProduct, setEditProduct] = useState({
    id: '',
    name: '',
    description: '',
    price: '',
    stock: '',
    image: null,
    type: '',
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const { user } = useAuth();
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [showWarningOnly, setShowWarningOnly] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userData, setUserData] = useState(null);
  const [showProductTypePicker, setShowProductTypePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Function to get Arabic display name for product type
  const getTypeDisplayName = (typeId) => {
    const typeMap = {
      'حليب': 'حليب',
      'ألبان': 'ألبان', 
      'أجبان': 'أجبان',
      'زبدة': 'زبدة',
      'أخرى': 'أخرى'
    };
    return typeMap[typeId] || typeId;
  };

  const getStockStatus = (stock) => {
    if (!stock || stock === 0) {
      return { text: 'غير متوفر', color: colors.error, icon: 'close-circle' };
    } else if (stock >= 1 && stock <= 20) {
      return { text: `${stock} متبق`, color: colors.warning, icon: 'warning' };
    } else {
      return { text: 'متوفر', color: colors.success, icon: 'checkmark-circle' };
    }
  };

  const [profilePic, setProfilePic] = useState(user?.photoURL || null);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWilaya, setEditWilaya] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribeOrders = subscribeToDairyOrders(user.uid, (ordersData) => {
      setOrders(ordersData);
      updateStats(ordersData, products);
      setLoading(false);
    });

    const unsubscribeNotifs = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });

    loadProducts();
    loadUserData();

    return () => {
      unsubscribeOrders();
      unsubscribeNotifs();
    };
  }, [user]);

  const loadProducts = async () => {
    try {
      const productsData = await getProductsByDairy(user.uid, productCategoryFilter);
      setProducts(productsData);

      // Auto-seed Safili products is disabled to prevent unwanted product creation
      // Commented out to prevent auto-seeding after deletion
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadUserData = async () => {
    if (!user) return;
    try {
      const data = await getUserByUid(user.uid);
      setUserData(data);
      setProfilePic(user.photoURL || data?.photoURL || null);
      setEditName(data?.businessName || data?.name || user?.displayName || '');
      setEditPhone(data?.phone || '');
      setEditWilaya(data?.wilaya || '');
      setEditEmail(user?.email || '');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const navigation = useNavigation();

  const handleLogout = () => {
    auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تنبيه', 'نحتاج إذن الوصول إلى الصور لتغيير صورة الملف الشخصي');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      setProfilePic(uri);
      try {
        await updateProfile(auth.currentUser, { photoURL: uri });
      } catch (e) {
        console.log('Profile update (local only):', e.message);
      }
    }
  };

  const savePersonalInfo = async () => {
    setSavingProfile(true);
    try {
      await updateProfile(auth.currentUser, { displayName: editName });
      setUserData(prev => ({ ...prev, businessName: editName, phone: editPhone, wilaya: editWilaya, email: editEmail }));
      Alert.alert('نجاح', 'تم حفظ المعلومات الشخصية');
      setShowPersonalInfo(false);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ المعلومات');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('تنبيه', 'كلمتا المرور الجديدتان غير متطابقتين');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('تنبيه', 'يجب أن تكون كلمة المرور 6 أحرف على الأقل');
      return;
    }
    setChangingPass(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      Alert.alert('نجاح', 'تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowSecurity(false);
    } catch (error) {
      let msg = 'فشل في تغيير كلمة المرور';
      if (error.code === 'auth/wrong-password') msg = 'كلمة المرور الحالية غير صحيحة';
      if (error.code === 'auth/weak-password') msg = 'كلمة المرور الجديدة ضعيفة جداً';
      Alert.alert('خطأ', msg);
    } finally {
      setChangingPass(false);
    }
  };

  const updateStats = (ordersData, productsData) => {
    const totalOrders = ordersData.length;
    const pendingOrders = ordersData.filter(o => o.status === 'pending').length;
    const completedOrders = ordersData.filter(o => o.status === 'completed').length;
    const totalRevenue = ordersData
      .filter(o => o.status === 'completed')
      .reduce((sum, order) => {
        const orderTotal = order.items?.reduce((total, item) => total + (item.price * item.quantity), 0) || 0;
        return sum + orderTotal;
      }, 0);

    setStats({
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      activeProducts: productsData.length,
    });
  };

  const handleAcceptOrder = async (orderId, order) => {
    try {
      // Check if all products have sufficient stock
      const stockValidation = order.items?.map(item => {
        const product = products.find(p => p.id === item.productId);
        const currentStock = product?.stock || 0;
        const requiredStock = item.quantity || 0;
        return {
          productName: item.name,
          currentStock,
          requiredStock,
          hasEnoughStock: currentStock >= requiredStock
        };
      }) || [];

      const insufficientStock = stockValidation.filter(item => !item.hasEnoughStock);
      
      if (insufficientStock.length > 0) {
        const stockDetails = insufficientStock.map(item => 
          `${item.productName}: ${item.currentStock} صندوق متاح، ${item.requiredStock} صندوق مطلوب`
        ).join('\n');
        
        Alert.alert(
          'مخزون غير كافي',
          `لا يمكن قبول هذا الطلب بسبب مخزون غير كافي:\n\n${stockDetails}`,
          [{ text: 'حسناً', style: 'default' }]
        );
        return;
      }

      // Update order status
      const result = await updateOrderStatusWithNotification(
        orderId, 'accepted', order.shopId, order.shopName, user?.displayName || 'الملبنة'
      );

      if (result.success) {
        // Reduce stock for each product in the order
        const stockUpdatePromises = order.items?.map(async (item) => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const newStock = (product.stock || 0) - (item.quantity || 0);
            return await updateProduct(item.productId, { stock: Math.max(0, newStock) });
          }
          return null;
        }) || [];

        await Promise.all(stockUpdatePromises);

        // Refresh products data to show updated stock
        const updatedProducts = await getProductsByDairy(user.uid);
        setProducts(updatedProducts);

        Alert.alert('نجاح', 'تم قبول الطلب وتحديث المخزون بنجاح');
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('خطأ', 'فشل في قبول الطلب');
    }
  };

  const handleRejectOrder = async (orderId, order) => {
    Alert.alert(
      'تأكيد الرفض',
      'هل أنت متأكد من رفض هذا الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'رفض',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await updateOrderStatusWithNotification(
                orderId, 'rejected', order.shopId, order.shopName, user?.displayName || 'الملبنة'
              );
              if (result.success) {
                Alert.alert('نجاح', 'تم رفض الطلب بنجاح');
              } else {
                Alert.alert('خطأ', result.error);
              }
            } catch (error) {
              console.error('Error rejecting order:', error);
              Alert.alert('خطأ', 'فشل في رفض الطلب');
            }
          }
        }
      ]
    );
  };

  const handleCompleteOrder = async (orderId, order) => {
    try {
      const result = await updateOrderStatusWithNotification(
        orderId, 'completed', order.shopId, order.shopName, user?.displayName || 'الملبنة'
      );
      if (result.success) {
        Alert.alert('نجاح', 'تم إكمال الطلب بنجاح');
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('Error completing order:', error);
      Alert.alert('خطأ', 'فشل في إكمال الطلب');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      case 'completed': return colors.primary;
      case 'in_transit': return '#3B82F6';
      case 'unpaid': return '#EF4444';
      default: return colors.text.secondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'accepted': return 'مقبول';
      case 'rejected': return 'مرفوض';
      case 'completed': return 'تم التوصيل';
      case 'in_transit': return 'في الطريق';
      case 'unpaid': return 'غير مدفوع';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'rejected': return 'close-circle-outline';
      case 'completed': return 'checkmark-done-circle-outline';
      case 'in_transit': return 'car-outline';
      case 'unpaid': return 'cash-outline';
      default: return 'ellipse-outline';
    }
  };

  const formatOrderTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return date.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' });
  };

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getMaxStock = () => {
    if (products.length === 0) return 100;
    return Math.max(...products.map(p => p.stock || 0), 100);
  };

  const calculateTotal = (items) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `products/${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      const metadata = {
        contentType: 'image/jpeg',
      };
      
      await uploadBytes(storageRef, blob, metadata);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Storage upload failed, using Base64:', error);
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (base64Error) {
        console.error('Base64 conversion failed:', base64Error);
        return null;
      }
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      let imageUrl = newProduct.image;
      if (newProduct.image && !newProduct.image.startsWith('http')) {
        imageUrl = await uploadImage(newProduct.image);
      }
      
      const result = await addProduct({
        name: newProduct.name,
        description: newProduct.description,
        dairyId: user.uid,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock),
        image: imageUrl,
        type: newProduct.type,
        createdAt: new Date().toISOString()
      });

      if (result.success) {
        Alert.alert('نجاح', 'تم إضافة المنتج بنجاح');
        setNewProduct({ name: '', description: '', price: '', stock: '', image: null, type: '' });
        setShowAddProductModal(false);
        loadProducts();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('خطأ', 'فشل في إضافة المنتج');
    }
  };

  
  const handleDeleteProduct = async (productId) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا المنتج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteProduct(productId);
              if (result.success) {
                Alert.alert('نجاح', 'تم حذف المنتج بنجاح');
                setSelectedProduct(null);
                loadProducts();
              } else {
                Alert.alert('خطأ', result.error);
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('خطأ', 'فشل في حذف المنتج');
            }
          }
        }
      ]
    );
  };

  const handleImageLoadStart = (productId) => {
    setImageLoadingStates(prev => ({ ...prev, [productId]: true }));
    setImageErrors(prev => ({ ...prev, [productId]: false }));
  };

  const handleImageLoadEnd = (productId) => {
    setImageLoadingStates(prev => ({ ...prev, [productId]: false }));
  };

  const handleImageError = (productId) => {
    setImageLoadingStates(prev => ({ ...prev, [productId]: false }));
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setNewProduct(prev => ({ ...prev, image: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const pickImageForEdit = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setEditProduct(prev => ({ ...prev, image: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const openEditModal = (product) => {
    setSelectedProduct(null); // Close detail modal
    setEditProduct({
      id: product.id,
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      stock: product.stock?.toString() || '',
      image: product.image || null,
      type: product.type || '',
    });
    setShowEditProductModal(true);
  };

  const handleEditProduct = async () => {
    if (!editProduct.name || !editProduct.price || !editProduct.stock) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      let imageUrl = editProduct.image;
      if (editProduct.image && !editProduct.image.startsWith('http')) {
        imageUrl = await uploadImage(editProduct.image);
      }
      
      const result = await updateProduct(editProduct.id, {
        name: editProduct.name,
        description: editProduct.description,
        price: parseFloat(editProduct.price),
        stock: parseInt(editProduct.stock),
        image: imageUrl,
        type: editProduct.type,
        updatedAt: new Date().toISOString()
      });

      if (result.success) {
        Alert.alert('نجاح', 'تم تحديث المنتج بنجاح');
        setShowEditProductModal(false);
        loadProducts();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('خطأ', 'فشل في تحديث المنتج');
    }
  };

  const renderHome = () => {
    const todayOrders = orders.filter(o => isToday(o.createdAt || o.timestamp) && o.status !== 'completed' && o.status !== 'rejected');
    const lowStockProducts = products.filter(p => (p.stock || 0) <= 20);
    const pendingCount = orders.filter(o => o.status === 'pending').length;

    return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={styles.dashHeaderCard}>
        <View style={styles.dashHeaderTop}>
          <View style={styles.dashHeaderInfo}>
            <Text style={styles.dashGreeting}>مرحباً بك 👋</Text>
            <Text style={styles.dashDate}>{new Date().toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
          {pendingCount > 0 && (
            <TouchableOpacity style={styles.dashPendingBadge} onPress={() => setActiveTab('orders')}>
              <Ionicons name="notifications" size={18} color="#FFFFFF" />
              <Text style={styles.dashPendingText}>{pendingCount} جديدة</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.dashStatsRow}>
          <View style={styles.dashStatItem}>
            <View style={[styles.dashStatDot, { backgroundColor: colors.primary }]} />
            <View>
              <Text style={styles.dashStatNum}>{stats.totalOrders}</Text>
              <Text style={styles.dashStatLbl}>طلب</Text>
            </View>
          </View>
          <View style={styles.dashStatDivider} />
          <View style={styles.dashStatItem}>
            <View style={[styles.dashStatDot, { backgroundColor: colors.success }]} />
            <View>
              <Text style={styles.dashStatNum}>{stats.totalRevenue > 0 ? stats.totalRevenue.toLocaleString() : 0}</Text>
              <Text style={styles.dashStatLbl}>دج أرباح</Text>
            </View>
          </View>
          <View style={styles.dashStatDivider} />
          <View style={styles.dashStatItem}>
            <View style={[styles.dashStatDot, { backgroundColor: colors.warning }]} />
            <View>
              <Text style={styles.dashStatNum}>{stats.pendingOrders}</Text>
              <Text style={styles.dashStatLbl}>قيد الانتظار</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions - Horizontal */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dashQuickActions}>
        <TouchableOpacity style={styles.dashQuickBtn} onPress={() => setActiveTab('orders')}>
          <View style={[styles.dashQuickIcon, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="receipt-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.dashQuickLabel}>الطلبات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dashQuickBtn} onPress={() => setActiveTab('products')}>
          <View style={[styles.dashQuickIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="cube-outline" size={22} color={colors.success} />
          </View>
          <Text style={styles.dashQuickLabel}>المنتجات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dashQuickBtn} onPress={() => setShowAddProductModal(true)}>
          <View style={[styles.dashQuickIcon, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="add-circle-outline" size={22} color="#F97316" />
          </View>
          <Text style={styles.dashQuickLabel}>إضافة منتج</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dashQuickBtn} onPress={() => setActiveTab('account')}>
          <View style={[styles.dashQuickIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="settings-outline" size={22} color={colors.error} />
          </View>
          <Text style={styles.dashQuickLabel}>الحساب</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Live Orders Feed */}
      <View style={styles.dashSection}>
        <View style={styles.dashSectionHeader}>
          <View style={styles.dashSectionTitleRow}>
            <Ionicons name="flash" size={18} color={colors.primary} />
            <Text style={styles.dashSectionTitle}>طلبات اليوم</Text>
          </View>
          <TouchableOpacity onPress={() => setActiveTab('orders')}>
            <Text style={styles.dashSeeAll}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        {todayOrders.length === 0 ? (
          <View style={styles.dashEmptyState}>
            <Ionicons name="document-text-outline" size={40} color={colors.text.light} />
            <Text style={styles.dashEmptyText}>لا توجد طلبات حالياً</Text>
          </View>
        ) : (
          todayOrders.slice(0, 4).map((order) => (
            <TouchableOpacity 
              key={order.id} 
              style={styles.dashOrderCard}
              onPress={() => setSelectedOrder(order)}
              activeOpacity={0.7}
            >
              <View style={[styles.dashOrderIcon, { backgroundColor: getStatusColor(order.status) + '18' }]}>
                <Ionicons name={getStatusIcon(order.status)} size={20} color={getStatusColor(order.status)} />
              </View>
              <View style={styles.dashOrderInfo}>
                <Text style={styles.dashOrderClient}>{order.shopName || order.clientName || 'عميل'}</Text>
                <Text style={styles.dashOrderProducts} numberOfLines={1}>
                  {order.items?.map(i => `${i.name} ×${i.quantity}`).join('، ') || 'منتجات'}
                </Text>
              </View>
              <View style={styles.dashOrderRight}>
                <Text style={styles.dashOrderAmount}>{calculateTotal(order.items)} دج</Text>
                <View style={[styles.dashOrderPill, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.dashOrderPillText}>{getStatusText(order.status)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <View style={styles.dashSection}>
          <View style={styles.dashSectionHeader}>
            <View style={styles.dashSectionTitleRow}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.dashSectionTitle}>تنبيه المخزون</Text>
            </View>
            <TouchableOpacity onPress={() => {
              setShowWarningOnly(true);
              setActiveTab('products');
            }}>
              <Text style={styles.dashSeeAll}>إدارة</Text>
            </TouchableOpacity>
          </View>

          {lowStockProducts.slice(0, 4).map((product) => {
            const isCritical = (product.stock || 0) <= 5;
            return (
              <View key={product.id} style={styles.dashStockAlertCard}>
                <View style={[styles.dashStockAlertDot, { backgroundColor: isCritical ? colors.error : colors.warning }]} />
                <View style={styles.dashStockAlertInfo}>
                  <Text style={styles.dashStockAlertName}>{product.name}</Text>
                  <Text style={[styles.dashStockAlertVal, { color: isCritical ? colors.error : colors.warning }]}>
                    {product.stock || 0} صندوق فقط
                  </Text>
                </View>
                <View style={styles.dashStockBarMini}>
                  <View style={[styles.dashStockBarMiniFill, { 
                    width: `${Math.min((product.stock || 0) / 50 * 100, 100)}%`,
                    backgroundColor: isCritical ? colors.error : colors.warning
                  }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Products Overview - Horizontal Scroll */}
      <View style={styles.dashSection}>
        <View style={styles.dashSectionHeader}>
          <View style={styles.dashSectionTitleRow}>
            <Ionicons name="cube" size={18} color={colors.success} />
            <Text style={styles.dashSectionTitle}>منتجاتي ({products.length})</Text>
          </View>
          <TouchableOpacity onPress={() => setActiveTab('products')}>
            <Text style={styles.dashSeeAll}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        {products.length === 0 ? (
          <View style={styles.dashEmptyState}>
            <Ionicons name="cube-outline" size={40} color={colors.text.light} />
            <Text style={styles.dashEmptyText}>لا توجد منتجات بعد</Text>
            <TouchableOpacity style={styles.dashEmptyBtn} onPress={() => setShowAddProductModal(true)}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.dashEmptyBtnText}>إضافة منتج</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dashProductScroll}>
            {products.slice(0, 8).map((product) => (
              <TouchableOpacity 
                key={product.id} 
                style={styles.dashProductMini}
                onPress={() => setSelectedProduct(product)}
                activeOpacity={0.7}
              >
                <View style={styles.dashProductMiniImg}>
                  {product.image && !imageErrors[product.id] ? (
                    <Image source={{ uri: product.image }} style={styles.dashProductMiniImage} onError={() => handleImageError(product.id)} />
                  ) : (
                    <View style={styles.dashProductMiniPlaceholder}>
                      <Ionicons name="cube-outline" size={22} color={colors.text.light} />
                    </View>
                  )}
                </View>
                <Text style={styles.dashProductMiniName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.dashProductMiniPrice}>{product.price} دج</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
  };

  const renderOrders = () => {
    // Calculate order counts for each status
    const orderCounts = {
      new: orders.filter(o => o.status === 'pending').length,
      accepted: orders.filter(o => o.status === 'accepted').length,
      rejected: orders.filter(o => o.status === 'rejected').length,
      delivered: orders.filter(o => o.status === 'completed').length,
    };

    const statCards = [
      { id: 'new', label: 'طلبات جديدة', count: orderCounts.new, color: '#2563EB', icon: 'document-text', bg: '#EFF6FF' },
      { id: 'accepted', label: 'مقبولة', count: orderCounts.accepted, color: '#10B981', icon: 'checkmark-circle', bg: '#ECFDF5' },
      { id: 'rejected', label: 'مرفوضة', count: orderCounts.rejected, color: '#F59E0B', icon: 'close-circle', bg: '#FFFBEB' },
      { id: 'delivered', label: 'تم التوصيل', count: orderCounts.delivered, color: '#8B5CF6', icon: 'car', bg: '#F5F3FF' },
    ];

    const filteredOrders = activeFilter === 'all'
      ? orders
      : orders.filter(order => {
          if (activeFilter === 'new') return order.status === 'pending';
          if (activeFilter === 'accepted') return order.status === 'accepted';
          if (activeFilter === 'delivered') return order.status === 'completed';
          if (activeFilter === 'rejected') return order.status === 'rejected';
          return true;
        });

    const getStatusConfig = (status) => {
      switch (status) {
        case 'pending': return { label: 'جديد', color: '#2563EB', bg: '#EFF6FF', icon: 'ellipse' };
        case 'accepted': return { label: 'مقبول', color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle' };
        case 'rejected': return { label: 'مرفوض', color: '#F59E0B', bg: '#FFFBEB', icon: 'close-circle' };
        case 'completed': return { label: 'تم التوصيل', color: '#8B5CF6', bg: '#F5F3FF', icon: 'car' };
        default: return { label: status, color: colors.text.secondary, bg: '#F3F4F6', icon: 'ellipse' };
      }
    };

    const formatItemsSummary = (items) => {
      if (!items || items.length === 0) return '';
      return items.map(i => `${i.name} ×${i.quantity}`).join(' + ');
    };

    const formatDate = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // Calculate today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    }).length;

    return (
      <View style={styles.content}>
        {/* Dashboard Stats Header */}
        <View style={styles.dashboardHeader}>
          {/* Purple Gradient Card */}
          <View style={styles.mainStatsCard}>
            <View style={styles.mainStatsContent}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="bag" size={24} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.statLabelWhite}>إجمالي الطلبات</Text>
                  <Text style={styles.statValueWhite}>{orders.length}</Text>
                  <Text style={styles.statSubtextWhite}>هذا الشهر</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View>
                  <Text style={styles.statLabelWhite}>طلبات اليوم</Text>
                  <Text style={styles.statValueWhiteSmall}>{todayOrders}</Text>
                </View>
              </View>
            </View>
            <View style={styles.chartIconContainer}>
              <Ionicons name="trending-up" size={24} color="#FFFFFF" />
            </View>
          </View>

          {/* Status Cards Grid */}
          <View style={styles.statusGrid}>
            <TouchableOpacity
              style={[styles.statusCard, activeFilter === 'delivered' && styles.statusCardActive]}
              onPress={() => setActiveFilter(activeFilter === 'delivered' ? 'all' : 'delivered')}
            >
              <View style={styles.statusCardTop}>
                <Text style={styles.statusCardNumber}>{orderCounts.delivered}</Text>
                <View style={[styles.statusCardIcon, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="car" size={20} color={colors.primary} />
                </View>
              </View>
              <Text style={[styles.statusCardLabel, { color: colors.primary }]}>تم التوصيل</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusCard, activeFilter === 'accepted' && styles.statusCardActiveAccepted]}
              onPress={() => setActiveFilter(activeFilter === 'accepted' ? 'all' : 'accepted')}
            >
              <View style={styles.statusCardTop}>
                <Text style={styles.statusCardNumber}>{orderCounts.accepted}</Text>
                <View style={[styles.statusCardIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
              </View>
              <Text style={[styles.statusCardLabel, { color: '#4CAF50' }]}>مقبولة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusCard, activeFilter === 'new' && styles.statusCardActivePending]}
              onPress={() => setActiveFilter(activeFilter === 'new' ? 'all' : 'new')}
            >
              <View style={styles.statusCardTop}>
                <Text style={styles.statusCardNumber}>{orderCounts.new}</Text>
                <View style={[styles.statusCardIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="document-text" size={20} color="#2196F3" />
                </View>
              </View>
              <Text style={[styles.statusCardLabel, { color: '#2196F3' }]}>طلبات جديدة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusCard, activeFilter === 'rejected' && styles.statusCardActiveRejected]}
              onPress={() => setActiveFilter(activeFilter === 'rejected' ? 'all' : 'rejected')}
            >
              <View style={styles.statusCardTop}>
                <Text style={styles.statusCardNumber}>{orderCounts.rejected}</Text>
                <View style={[styles.statusCardIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="close-circle" size={20} color="#FF9800" />
                </View>
              </View>
              <Text style={[styles.statusCardLabel, { color: '#FF9800' }]}>مرفوضة</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Orders Section Header */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => setActiveTab('orders')}>
            <Text style={styles.viewAllLink}>عرض الكل</Text>
          </TouchableOpacity>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>الطلبات الحديثة</Text>
            <Ionicons name="list" size={18} color={colors.text.secondary} style={{ marginLeft: 6 }} />
          </View>
        </View>

        {/* Orders List — vertical card layout */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={56} color={colors.text.light} />
              <Text style={styles.emptyText}>
                {activeFilter === 'all' ? 'لا توجد طلبات حتى الآن' : 'لا توجد طلبات بهذه الحالة'}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const cfg = getStatusConfig(order.status);
              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => setSelectedOrder(order)}
                  activeOpacity={0.7}
                >
                  {/* Top row: Icon + Order# + Status + Chevron */}
                  <View style={styles.orderCardTop}>
                    <View style={styles.orderCardTopLeft}>
                      <View style={[styles.orderCardIcon, { backgroundColor: cfg.bg }]}>
                        <Ionicons name="water" size={18} color={cfg.color} />
                      </View>
                      <Text style={styles.orderCardNum}>#{order.id.slice(-6)}</Text>
                    </View>
                    <View style={styles.orderCardTopRight}>
                      <View style={[styles.orderCardStatusBadge, { backgroundColor: cfg.bg }]}>
                        <View style={[styles.orderCardStatusDot, { backgroundColor: cfg.color }]} />
                        <Text style={[styles.orderCardStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <Ionicons name="chevron-back" size={18} color={colors.text.light} />
                    </View>
                  </View>

                  {/* Store name */}
                  <Text style={styles.orderCardStore} numberOfLines={1}>
                    {order.shopName || 'صاحب محل'}
                  </Text>

                  {/* Branch */}
                  <View style={styles.orderCardBranchRow}>
                    <Ionicons name="location-outline" size={12} color={colors.text.light} />
                    <Text style={styles.orderCardBranch} numberOfLines={1}>
                      {order.shopWilaya || 'الفرع الرئيسي'}
                    </Text>
                  </View>

                  {/* Products summary */}
                  <Text style={styles.orderCardItems} numberOfLines={1}>
                    {formatItemsSummary(order.items)}
                  </Text>

                  {/* Bottom row: Date / Time */}
                  <View style={styles.orderCardBottom}>
                    <View style={styles.orderCardMeta}>
                      <Ionicons name="calendar-outline" size={12} color={colors.text.light} />
                      <Text style={styles.orderCardMetaText}>{formatDate(order.createdAt)}</Text>
                    </View>
                    <View style={styles.orderCardMeta}>
                      <Ionicons name="time-outline" size={12} color={colors.text.light} />
                      <Text style={styles.orderCardMetaText}>{formatTime(order.createdAt)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  };

  const renderProducts = () => {
    const categories = [
      { key: 'all', label: 'الكل' },
      { key: 'حليب', label: 'حليب' },
      { key: 'ألبان', label: 'ألبان' },
      { key: 'أجبان', label: 'أجبان' },
      { key: 'زبدة', label: 'زبدة' },
      { key: 'أخرى', label: 'أخرى' },
    ];

    const filteredProducts = products.filter(product => {
      const matchesCategory = productCategoryFilter === 'all' || product.type === productCategoryFilter;
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWarning = !showWarningOnly || (product.stock || 0) <= 20;
      return matchesCategory && matchesSearch && matchesWarning;
    });

    return (
    <View style={styles.content}>
      {/* Warning Filter Indicator */}
      {showWarningOnly && (
        <View style={styles.warningFilterIndicator}>
          <View style={styles.warningFilterContent}>
            <Ionicons name="warning" size={16} color={colors.warning} />
            <Text style={styles.warningFilterText}>عرض المنتجات ذات المخزون المنخفض فقط</Text>
          </View>
          <TouchableOpacity 
            style={styles.clearWarningFilter} 
            onPress={() => setShowWarningOnly(false)}
          >
            <Ionicons name="close" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Products Header */}
      <View style={styles.productsHeader}>
        <Text style={styles.productsTitle}>إدارة المنتجات</Text>
        <TouchableOpacity style={styles.addProductButtonNew} onPress={() => setShowAddProductModal(true)}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addProductTextNew}>إضافة منتج</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder="بحث عن منتج..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.secondary}
          />
          <Ionicons name="search" size={20} color={colors.text.secondary} style={styles.searchIcon} />
        </View>
      </View>

      {/* Category Filter Bar */}
      <View style={styles.categoryFilterWrap}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryPill,
              productCategoryFilter === cat.key && styles.categoryPillActive
            ]}
            onPress={() => setProductCategoryFilter(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.categoryPillText,
              productCategoryFilter === cat.key && styles.categoryPillTextActive
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Products Grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.text.light} />
            <Text style={styles.emptyText}>
              {productCategoryFilter === 'all' 
                ? 'لا توجد منتجات حتى الآن' 
                : `لا توجد منتجات في قسم ${categories.find(c => c.key === productCategoryFilter)?.label}`}
            </Text>
            <Text style={styles.emptySubtitle}>أضف منتجاتك لبدء استقبال الطلبات</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => (
            <TouchableOpacity 
              key={product.id} 
              style={styles.modernProductCard}
              onPress={() => setSelectedProduct(product)}
              activeOpacity={0.7}
            >
              {/* Product Image - TOP */}
              <View style={styles.modernProductImageWrap}>
                {product.image && !imageErrors[product.id] ? (
                  <Image 
                    source={{ uri: product.image }} 
                    style={styles.modernProductImage}
                    onLoadStart={() => handleImageLoadStart(product.id)}
                    onLoadEnd={() => handleImageLoadEnd(product.id)}
                    onError={() => handleImageError(product.id)}
                  />
                ) : (
                  <View style={styles.modernProductImagePlaceholder}>
                    <Ionicons name="cube-outline" size={36} color={colors.text.light} />
                  </View>
                )}
                <View style={styles.modernProductCategoryBadge}>
                  <Text style={styles.modernProductCategoryText}>{getTypeDisplayName(product.type) || 'منتج'}</Text>
                </View>
              </View>

              {/* Product Info - BOTTOM */}
              <View style={styles.modernProductInfo}>
                <Text style={styles.modernProductName} numberOfLines={2}>{product.name}</Text>
                <View style={styles.modernProductMeta}>
                  <View style={styles.modernProductPriceRow}>
                    <Text style={styles.modernProductPrice}>{product.price} دج</Text>
                    <View style={styles.modernProductStockRow}>
                      <Ionicons 
                        name={getStockStatus(product.stock).icon} 
                        size={14} 
                        color={getStockStatus(product.stock).color} 
                      />
                      <Text style={[styles.modernProductStock, { color: getStockStatus(product.stock).color }]}>
                        {getStockStatus(product.stock).text}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
  };

  const renderFeatures = () => (
    <View style={styles.content}>
      {/* Title Section */}
      <View style={styles.featuresHeader}>
        <Text style={styles.featuresTitle}>اكتشف مميزات وزعلي</Text>
        <Text style={styles.featuresSubtitle}>نحن نعيد تعريف تجربة التوزيع في المنطقة</Text>
      </View>

      {/* Features List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.featuresList}>
          {/* Feature 1 - توزيع سريع */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="rocket" size={24} color="#1976D2" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>توزيع سريع</Text>
              <Text style={styles.featureDescription}>نضمن وصول منتجاتك في وقت قياسي من خلال شبكة لوجستية متطورة تغطي كافة المناطق بفعالية عالية.</Text>
            </View>
          </View>

          {/* Feature 2 - تواصل مباشر */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="people" size={24} color="#4CAF50" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>تواصل مباشر بدون وسطاء</Text>
              <Text style={styles.featureDescription}>نربط الملابن والموزعين مباشرة مع تجار التجزئة، مما يقلل من تعقيدات التوريد التقليدية</Text>
            </View>
          </View>

          {/* Feature 3 - شفافية الأسعار */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="wallet" size={24} color="#FF9800" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>شفافية الأسعار</Text>
              <Text style={styles.featureDescription}>أسعار واضحة وتنافسية معلنة للجميع، دون رسوم خفية، لضمان أفضل قيمة لجميع الأطراف.</Text>
            </View>
          </View>

          {/* Feature 4 - تقليل ضياع المنتجات */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#FCE4EC' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#E91E63" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>تقليل ضياع المنتجات</Text>
              <Text style={styles.featureDescription}>نظام تتبع ذكي ومستودعات مطورة تحافظ على جودة المنتجات وتقلل من الهالك والضياع بشكل كبير.</Text>
            </View>
          </View>

          {/* Feature 5 - دعم الملابن المحلية */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#E1F5FE' }]}>
              <Ionicons name="business" size={24} color="#03A9F4" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>دعم الملابن المحلية</Text>
              <Text style={styles.featureDescription}>نهدف لنمو الصناعة الوطنية من خلال منح الأولوية للملابن المحلية وتسهيل وصولها للسوق.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderAccount = () => (
    <View style={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#FFFFFF" />
            </View>
          )}
          <TouchableOpacity style={styles.cameraBtn} onPress={pickProfileImage}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.profileName}>
          {userData?.businessName || userData?.name || user?.displayName || 'مستخدم'}
        </Text>
        <Text style={styles.profileRole}>صاحب ملبنة</Text>
        <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || ''}</Text>
        {userData?.phone && <Text style={styles.profilePhone}>{userData.phone}</Text>}
      </View>

      {/* Menu Items */}
      <View style={styles.menuWrap}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPersonalInfo(true)}>
          <View style={styles.menuIconWrap}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>المعلومات الشخصية</Text>
            <Text style={styles.menuSubtitle}>إدارة تفاصيلك الشخصية</Text>
          </View>
          <Ionicons name="chevron-back" size={18} color={colors.text.light} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowSecurity(true)}>
          <View style={[styles.menuIconWrap, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#F59E0B" />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>الأمان</Text>
            <Text style={styles.menuSubtitle}>تغيير كلمة المرور والأمان</Text>
          </View>
          <Ionicons name="chevron-back" size={18} color={colors.text.light} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowAbout(true)}>
          <View style={[styles.menuIconWrap, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>عن التطبيق</Text>
            <Text style={styles.menuSubtitle}>إصدار التطبيق 1.0.0</Text>
          </View>
          <Ionicons name="chevron-back" size={18} color={colors.text.light} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutBtnText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </View>
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return renderHome();
      case 'orders': return renderOrders();
      case 'products': return renderProducts();
      case 'features': return renderFeatures();
      case 'account': return renderAccount();
      default: return renderHome();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <NotificationDropdown
          notifications={notifications}
          userId={user?.uid}
          onNotificationPress={() => setActiveTab('orders')}
          onViewAllPress={() => navigation.navigate('Notifications')}
        />
        
        <Text style={styles.headerTitle}>
          {activeTab === 'home' && 'الرئيسية'}
          {activeTab === 'orders' && 'الطلبات'}
          {activeTab === 'products' && 'المنتجات'}
          {activeTab === 'features' && 'لماذا وزعلي؟'}
          {activeTab === 'account' && 'حسابي'}
        </Text>
        
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentWrapper}>
        {renderContent()}
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNavContainer, { paddingBottom: insets.bottom }]}>
        {[
          { id: 'home', name: 'الرئيسية', icon: 'home' },
          { id: 'orders', name: 'الطلبات', icon: 'list' },
          { id: 'products', name: 'المنتجات', icon: 'cube' },
          { id: 'features', name: 'المميزات', icon: 'star' },
          { id: 'account', name: 'حسابي', icon: 'person' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.bottomTab, activeTab === tab.id && styles.activeBottomTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={22} 
              color={activeTab === tab.id ? colors.primary : colors.text.secondary} 
            />
            <Text style={[styles.bottomTabText, activeTab === tab.id && styles.activeBottomTabText]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Order Details Modal */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تفاصيل الطلب</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>رقم الطلب:</Text>
                  <Text style={styles.detailValue}>#{selectedOrder.id.slice(-6)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>الحالة:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(selectedOrder.status)}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>التاريخ:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedOrder.createdAt).toLocaleDateString('ar-EG')}
                  </Text>
                </View>

                <Text style={styles.itemsTitle}>المنتجات:</Text>
                {selectedOrder.items?.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetails}>
                      {item.quantity} × {item.price} دج
                    </Text>
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>الإجمالي:</Text>
                  <Text style={styles.totalValue}>
                    {calculateTotal(selectedOrder.items)} دج
                  </Text>
                </View>

                {/* Order Action Buttons */}
                {selectedOrder.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.acceptButton]} 
                      onPress={() => {
                        handleAcceptOrder(selectedOrder.id, selectedOrder);
                        setSelectedOrder(null);
                      }}
                    >
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>قبول الطلب</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.rejectButton]} 
                      onPress={() => {
                        handleRejectOrder(selectedOrder.id, selectedOrder);
                        setSelectedOrder(null);
                      }}
                    >
                      <Ionicons name="close" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>رفض الطلب</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedOrder.status === 'accepted' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.completeButton]} 
                      onPress={() => {
                        handleCompleteOrder(selectedOrder.id, selectedOrder);
                        setSelectedOrder(null);
                      }}
                    >
                      <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>تم التوصيل</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedOrder.status === 'completed' && (
                  <View style={styles.modalActions}>
                    <View style={[styles.actionButton, styles.completedButton]}>
                      <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>تم التوصيل</Text>
                    </View>
                  </View>
                )}

                {selectedOrder.status === 'rejected' && (
                  <View style={styles.modalActions}>
                    <View style={[styles.actionButton, styles.rejectedButton]}>
                      <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>تم الرفض</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        visible={showAddProductModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddProductModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة منتج جديد</Text>
              <TouchableOpacity onPress={() => setShowAddProductModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Product Image Upload */}
              <View style={styles.imageUploadContainer}>
                <Text style={styles.inputLabel}>صورة المنتج</Text>
                <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
                  {newProduct.image ? (
                    <Image source={{ uri: newProduct.image }} style={styles.uploadedImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera" size={32} color={colors.text.light} />
                      <Text style={styles.imagePlaceholderText}>أضف صورة</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
                  <Ionicons name="images" size={16} color={colors.primary} />
                  <Text style={styles.changeImageText}>تغيير الصورة</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>اسم المنتج</Text>
                <TextInput
                  style={styles.modernTextInput}
                  placeholder="أدخل اسم المنتج"
                  value={newProduct.name}
                  onChangeText={(text) => setNewProduct({...newProduct, name: text})}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>نوع المنتج</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity 
                    style={styles.pickerButton}
                    onPress={() => setShowProductTypePicker(true)}
                  >
                    <Text style={styles.pickerText}>
                      {newProduct.type ? getTypeDisplayName(newProduct.type) : 'اختر نوع المنتج'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>الوصف</Text>
                <TextInput
                  style={[styles.modernTextInput, styles.textArea]}
                  placeholder="أدخل وصف المنتج"
                  multiline
                  numberOfLines={3}
                  value={newProduct.description}
                  onChangeText={(text) => setNewProduct({...newProduct, description: text})}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>السعر (دج)</Text>
                  <TextInput
                    style={styles.modernTextInput}
                    placeholder="السعر"
                    keyboardType="numeric"
                    value={newProduct.price}
                    onChangeText={(text) => setNewProduct({...newProduct, price: text})}
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>المخزون</Text>
                  <TextInput
                    style={styles.modernTextInput}
                    placeholder="الكمية"
                    keyboardType="numeric"
                    value={newProduct.stock}
                    onChangeText={(text) => setNewProduct({...newProduct, stock: text})}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddProductModal(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddProduct}
              >
                <Text style={styles.saveButtonText}>إضافة المنتج</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Type Picker Modal */}
      <Modal
        visible={showProductTypePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProductTypePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر نوع المنتج</Text>
              <TouchableOpacity onPress={() => setShowProductTypePicker(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {[
                { id: 'حليب', name: 'حليب' },
                { id: 'ألبان', name: 'ألبان' },
                { id: 'أجبان', name: 'أجبان' },
                { id: 'زبدة', name: 'زبدة' },
                { id: 'أخرى', name: 'أخرى' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeOption,
                    ((showEditProductModal ? editProduct.type : newProduct.type) === type.id) && styles.typeOptionSelected
                  ]}
                  onPress={() => {
                    if (showEditProductModal) {
                      setEditProduct({ ...editProduct, type: type.id });
                    } else {
                      setNewProduct({ ...newProduct, type: type.id });
                    }
                    setShowProductTypePicker(false);
                  }}
                >
                  <Text style={[
                    styles.typeOptionText,
                    ((showEditProductModal ? editProduct.type : newProduct.type) === type.id) && styles.typeOptionTextSelected
                  ]}>
                    {type.name}
                  </Text>
                  {((showEditProductModal ? editProduct.type : newProduct.type) === type.id) && (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Product Detail Modal */}
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.detailModalContent}>
            {selectedProduct && (
              <>
                {/* Header with close button */}
                <View style={styles.detailHeader}>
                  <Text style={styles.detailHeaderTitle}>تفاصيل المنتج</Text>
                  <TouchableOpacity style={styles.detailCloseButton} onPress={() => setSelectedProduct(null)}>
                    <Ionicons name="close" size={22} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.detailScrollBody}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Product Image */}
                  <View style={styles.detailImageSection}>
                    {selectedProduct.image && !imageErrors[selectedProduct.id] ? (
                      <Image 
                        source={{ uri: selectedProduct.image }} 
                        style={styles.detailImage}
                        onLoadStart={() => handleImageLoadStart(selectedProduct.id)}
                        onLoadEnd={() => handleImageLoadEnd(selectedProduct.id)}
                        onError={() => handleImageError(selectedProduct.id)}
                      />
                    ) : (
                      <View style={styles.detailImagePlaceholder}>
                        <Ionicons name="image" size={40} color={colors.text.light} />
                      </View>
                    )}
                    {imageLoadingStates[selectedProduct.id] && (
                      <View style={styles.detailImageLoading}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                  </View>

                  {/* Product Name & Status */}
                  <View style={styles.detailNameRow}>
                    <Text style={styles.detailProductName}>{selectedProduct.name}</Text>
                    <View style={[
                      styles.detailStatusPill,
                      { backgroundColor: selectedProduct.stock > 0 ? colors.success : colors.error }
                    ]}>
                      <Ionicons 
                        name={selectedProduct.stock > 0 ? "checkmark-circle" : "close-circle"} 
                        size={14} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.detailStatusPillText}>
                        {selectedProduct.stock > 0 ? 'متاح' : 'نفد المخزون'}
                      </Text>
                    </View>
                  </View>

                  {/* Info Row */}
                  <View style={styles.detailInfoRow}>
                    <View style={styles.detailInfoItem}>
                      <View style={[styles.detailInfoIcon, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="pricetag" size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.detailInfoLabel}>السعر</Text>
                      <Text style={styles.detailInfoValue}>{selectedProduct.price} دج</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <View style={[styles.detailInfoIcon, { backgroundColor: colors.accentLight }]}>
                        <Ionicons name="water" size={18} color={colors.accent} />
                      </View>
                      <Text style={styles.detailInfoLabel}>المخزون</Text>
                      <Text style={styles.detailInfoValue}>{selectedProduct.stock || 0} صندوق</Text>
                    </View>
                  </View>

                  {/* Description */}
                  {selectedProduct.description ? (
                    <View style={styles.detailDescCard}>
                      <Text style={styles.detailDescTitle}>الوصف</Text>
                      <Text style={styles.detailDescText}>{selectedProduct.description}</Text>
                    </View>
                  ) : null}

                  {/* Product Type */}
                  {selectedProduct.type ? (
                    <View style={styles.detailDescCard}>
                      <Text style={styles.detailDescTitle}>نوع المنتج</Text>
                      <Text style={styles.detailDescText}>{getTypeDisplayName(selectedProduct.type)}</Text>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Bottom Action Buttons */}
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={styles.detailDeleteBtn}
                    onPress={() => handleDeleteProduct(selectedProduct.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={styles.detailDeleteBtnText}>حذف</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.detailEditBtn}
                    onPress={() => openEditModal(selectedProduct)}
                  >
                    <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.detailEditBtnText}>تعديل</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        visible={showEditProductModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditProductModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تعديل المنتج</Text>
              <TouchableOpacity onPress={() => setShowEditProductModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Product Image Upload */}
              <View style={styles.imageUploadContainer}>
                <Text style={styles.inputLabel}>صورة المنتج</Text>
                <TouchableOpacity style={styles.imageUploadButton} onPress={pickImageForEdit}>
                  {editProduct.image ? (
                    <Image source={{ uri: editProduct.image }} style={styles.uploadedImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera" size={32} color={colors.text.light} />
                      <Text style={styles.imagePlaceholderText}>أضف صورة</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeImageButton} onPress={pickImageForEdit}>
                  <Ionicons name="images" size={16} color={colors.primary} />
                  <Text style={styles.changeImageText}>تغيير الصورة</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>اسم المنتج</Text>
                <TextInput
                  style={styles.modernTextInput}
                  placeholder="أدخل اسم المنتج"
                  value={editProduct.name}
                  onChangeText={(text) => setEditProduct({...editProduct, name: text})}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>نوع المنتج</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity 
                    style={styles.pickerButton}
                    onPress={() => setShowProductTypePicker(true)}
                  >
                    <Text style={styles.pickerText}>
                      {editProduct.type ? getTypeDisplayName(editProduct.type) : 'اختر نوع المنتج'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>الوصف</Text>
                <TextInput
                  style={[styles.modernTextInput, styles.textArea]}
                  placeholder="أدخل وصف المنتج"
                  multiline
                  numberOfLines={3}
                  value={editProduct.description}
                  onChangeText={(text) => setEditProduct({...editProduct, description: text})}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>السعر (دج)</Text>
                  <TextInput
                    style={styles.modernTextInput}
                    placeholder="السعر"
                    keyboardType="numeric"
                    value={editProduct.price}
                    onChangeText={(text) => setEditProduct({...editProduct, price: text})}
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>المخزون</Text>
                  <TextInput
                    style={styles.modernTextInput}
                    placeholder="الكمية"
                    keyboardType="numeric"
                    value={editProduct.stock}
                    onChangeText={(text) => setEditProduct({...editProduct, stock: text})}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditProductModal(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleEditProduct}
              >
                <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== Personal Info Modal ========== */}
      <Modal visible={showPersonalInfo} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>المعلومات الشخصية</Text>
              <TouchableOpacity onPress={() => setShowPersonalInfo(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>الاسم الكامل</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="الاسم الكامل"
                placeholderTextColor={colors.text.light}
              />

              <Text style={styles.inputLabel}>رقم الهاتف</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="رقم الهاتف"
                placeholderTextColor={colors.text.light}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
              <TextInput
                style={styles.modalInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="البريد الإلكتروني"
                placeholderTextColor={colors.text.light}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>الولاية / العنوان</Text>
              <TextInput
                style={styles.modalInput}
                value={editWilaya}
                onChangeText={setEditWilaya}
                placeholder="الولاية أو العنوان"
                placeholderTextColor={colors.text.light}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={savePersonalInfo}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========== Security Modal ========== */}
      <Modal visible={showSecurity} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>الأمان</Text>
              <TouchableOpacity onPress={() => setShowSecurity(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>كلمة المرور الحالية</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="أدخل كلمة المرور الحالية"
                placeholderTextColor={colors.text.light}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>كلمة المرور الجديدة</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="أدخل كلمة المرور الجديدة"
                placeholderTextColor={colors.text.light}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>تأكيد كلمة المرور الجديدة</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                placeholderTextColor={colors.text.light}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={changePassword}
                disabled={changingPass}
              >
                {changingPass ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>تغيير كلمة المرور</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========== About App Modal ========== */}
      <Modal visible={showAbout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>عن التطبيق</Text>
              <TouchableOpacity onPress={() => setShowAbout(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.aboutBody}>
              <View style={styles.aboutIconWrap}>
                <Ionicons name="cube" size={48} color={colors.primary} />
              </View>
              <Text style={styles.aboutAppName}>وَزْعَلِي</Text>
              <Text style={styles.aboutVersion}>الإصدار 1.0.0</Text>
              <Text style={styles.aboutDesc}>
                تطبيق وَزْعَلِي يربط بين أصحاب الملبنات وأصحاب المحلات لتسهيل طلب وتوصيل منتجات الألبان بكل سهولة وفعالية.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  contentWrapper: {
    flex: 1,
    paddingBottom: 80, // Space for bottom navigation
  },
  content: {
    flex: 1,
    padding: 20,
  },
  // Bottom Navigation Styles
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    paddingBottom: 8,
    paddingTop: 12,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  activeBottomTab: {
    // No background needed, just icon/text color change
  },
  bottomTabText: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 2,
    fontWeight: '600',
  },
  activeBottomTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    width: (width - 52) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  productsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productsCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginHorizontal: 12,
  },
  productsLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  manageProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  manageProductsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recentOrderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recentOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentOrderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  recentOrderShop: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  recentOrderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  // Orders specific styles
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.light,
    marginTop: 8,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopName: {
    fontSize: 14,
    color: colors.text.secondary,
    marginRight: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderDate: {
    fontSize: 12,
    color: colors.text.light,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    gap: 8,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Products specific styles
  productsHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productsHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginVertical: 12,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  addProductText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productStock: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Distribution specific styles
  distributionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  distributionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 12,
  },
  distributionOrderCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  distributionOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionOrderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  distributionOrderShop: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  distributionProgress: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    width: '60%',
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  // Profits specific styles
  profitOverviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  profitOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profitOverviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 12,
  },
  profitAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
  },
  profitPeriod: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  profitOrderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  profitOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profitOrderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  profitOrderDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  profitOrderShop: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  profitOrderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    fontSize: 14,
    color: colors.text.primary,
  },
  itemDetails: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  // Add Product Modal Styles
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'right',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // New Filter Section Styles (matching image design)
  filterSectionNew: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  filterItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    position: 'relative',
  },
  filterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD', // Light blue background
    marginBottom: 6,
  },
  activeFilterBadge: {
    backgroundColor: '#1976D2', // Blue background for active
  },
  filterBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2', // Blue text
  },
  activeFilterBadgeText: {
    color: '#FFFFFF', // White text for active
  },
  filterItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  activeFilterItemLabel: {
    color: '#1976D2', // Blue text for active
    fontWeight: '600',
  },
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3,
    backgroundColor: '#1976D2', // Blue underline
    borderRadius: 2,
  },
  // New Order Card Styles
  newOrderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  newOrderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
  },
  orderDetails: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 8,
  },
  orderDateTime: {
    fontSize: 12,
    color: colors.text.light,
    marginBottom: 16,
  },
  newActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButtonOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  acceptButtonSolid: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButtonSolid: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deliveredBadge: {
    backgroundColor: colors.success,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  deliveredText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rejectedBadge: {
    backgroundColor: colors.error,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // === Mobile-Friendly Stat Cards & Order Card Styles ===
  statCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  statCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statViewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  statViewAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recentOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  recentOrdersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterDropdownText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  // Order Card — vertical layout for mobile
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderCardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  orderCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCardNum: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  orderCardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  orderCardStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  orderCardStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderCardStore: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  orderCardBranchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  orderCardBranch: {
    fontSize: 12,
    color: colors.text.light,
  },
  orderCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderCardMetaText: {
    fontSize: 11,
    color: colors.text.light,
  },
  orderCardItems: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  // New Product Card Styles
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  addProductButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  addProductTextNew: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  warningFilterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningFilterText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  clearWarningFilter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Category Filter Styles
  categoryFilterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  newProductCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productNameNew: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
  },
  productDescriptionNew: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  productDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.success,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  stockContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  stockLabel: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productActionsNew: {
    flexDirection: 'row',
    gap: 12,
  },
  editButtonNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButtonNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  // Features Screen Styles
  featuresTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  featuresTopTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  featuresHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  featuresSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  featuresList: {
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 4, // Reduced from 16 to 8
  },
  featureTextContainer: {
    flex: 1,
    marginLeft: 16, // Changed from marginRight to marginLeft for LTR layout
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'left',
  },
  featureDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
    textAlign: 'left',
  },
  // Dashboard Home Styles
  dashHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dashHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dashHeaderInfo: {
    flex: 1,
  },
  dashGreeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  dashDate: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  dashPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  dashPendingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dashStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  dashStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dashStatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dashStatNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  dashStatLbl: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  dashStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  dashQuickActions: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  dashQuickBtn: {
    alignItems: 'center',
    gap: 8,
    minWidth: 80,
  },
  dashQuickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashQuickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  dashSection: {
    marginBottom: 24,
  },
  dashSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dashSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashSectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  dashSeeAll: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  dashEmptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  dashEmptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 10,
  },
  dashEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  dashEmptyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Dashboard Order Cards
  dashOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  dashOrderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashOrderInfo: {
    flex: 1,
  },
  dashOrderClient: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  dashOrderProducts: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  dashOrderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  dashOrderAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  dashOrderPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dashOrderPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Dashboard Stock Alert
  dashStockAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  dashStockAlertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dashStockAlertInfo: {
    flex: 1,
  },
  dashStockAlertName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  dashStockAlertVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  dashStockBarMini: {
    width: 60,
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dashStockBarMiniFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Dashboard Product Mini Cards
  dashProductScroll: {
    gap: 12,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  dashProductMini: {
    width: 120,
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dashProductMiniImg: {
    width: '100%',
    height: 90,
    backgroundColor: colors.background,
  },
  dashProductMiniImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dashProductMiniPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  dashProductMiniName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    paddingHorizontal: 10,
    paddingTop: 8,
    textAlign: 'right',
  },
  dashProductMiniPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: 10,
    paddingBottom: 10,
    textAlign: 'right',
  },

  // Modern Product Grid Styles
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 20,
  },
  modernProductCard: {
    width: (width - 52) / 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  modernProductImageWrap: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: colors.background,
  },
  modernProductImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modernProductImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  modernProductCategoryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  modernProductCategoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  modernProductInfo: {
    padding: 12,
  },
  modernProductName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'right',
    lineHeight: 20,
  },
  modernProductMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernProductPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  modernProductPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  modernProductStock: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.light,
  },
  modernProductStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Modern Product Detail Modal
  detailModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  detailCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailScrollBody: {
    paddingHorizontal: 20,
  },
  detailImageSection: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginTop: 16,
    marginBottom: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailImageLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailProductName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  detailStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  detailStatusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailInfoItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  detailInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailInfoLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  detailInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  detailDescCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  detailDescTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  detailDescText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorLight,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailDeleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  detailEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailEditBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Image Upload Styles
  imageUploadContainer: {
    marginBottom: 20,
  },
  imageUploadButton: {
    width: '100%',
    height: 150,
    backgroundColor: colors.background,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 8,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    gap: 8,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Modern Input Styles
  modernTextInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },

  // Account Screen Styles
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileRole: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 12,
    color: colors.text.light,
  },
  menuWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.text.light,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'right',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  aboutBody: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  aboutIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutAppName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 13,
    color: colors.text.light,
    marginBottom: 16,
  },
  aboutDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // Dashboard Styles
  dashboardHeader: {
    marginBottom: 16,
  },
  mainStatsCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  statLabelWhite: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  statValueWhite: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statValueWhiteSmall: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statSubtextWhite: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  chartIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Status Grid
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  statusCardActiveAccepted: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  statusCardActivePending: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  statusCardActiveRejected: {
    borderColor: '#FF9800',
    borderWidth: 2,
  },
  statusCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusCardNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'left',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  viewAllLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
  },

  // Product Type Picker Styles
  pickerContainer: {
    marginBottom: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeOptionSelected: {
    backgroundColor: '#F3E5F5',
  },
  typeOptionText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  typeOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Search Bar Styles
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0FDF4',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 12,
  },
  searchIcon: {
    marginLeft: 12,
  },

  // Order Action Buttons Styles
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  completeButton: {
    backgroundColor: colors.primary,
  },
  completedButton: {
    backgroundColor: colors.success,
  },
  rejectedButton: {
    backgroundColor: colors.error,
  },
});
