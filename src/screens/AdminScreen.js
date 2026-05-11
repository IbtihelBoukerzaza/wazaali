import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Modal, TextInput, Image, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../utils/colors';
import { getPendingUsers, updateUserApproval, getAllUsers, getApprovedUsers, getRejectedUsers, getAllOrders, subscribeToNotifications, getUserByUid } from '../services/firestoreService';
import NotificationDropdown from '../components/NotificationDropdown';
import { auth, db } from '../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import {
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

const { width } = Dimensions.get('window');

export default function AdminScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [rejectedUsers, setRejectedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // Auto-select pending tab on login
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showAccount, setShowAccount] = useState(false);
  const [userData, setUserData] = useState(null);
  const [profilePic, setProfilePic] = useState(auth.currentUser?.photoURL || null);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWilaya, setEditWilaya] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    rejectedUsers: 0,
    totalOrders: 0,
    shopOwners: 0,
    factoryOwners: 0,
  });

  useEffect(() => {
    loadData();
    loadUserData();
    if (auth.currentUser) {
      const unsub = subscribeToNotifications(auth.currentUser.uid, (notifs) => {
        setNotifications(notifs);
      });
      return () => unsub && unsub();
    }
  }, []);

  const loadAdminName = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setAdminName(data.name || '');
        }
      }
    } catch (error) {
      console.error('Error loading admin name:', error);
    }
  };

  const loadUserData = async () => {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setProfilePic(auth.currentUser.photoURL || data?.photoURL || null);
        setEditName(data?.name || auth.currentUser?.displayName || '');
        setEditPhone(data?.phone || '');
        setEditWilaya(data?.wilaya || '');
        setEditBusinessName(data?.businessName || '');
        setEditEmail(auth.currentUser?.email || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تنبيه', 'نحتاج إذن الوصول إلى الصور لتغيير صورة الملف الشخصي');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
      
      // For admin, only update auth profile
      // For dairy owners and shop owners, update both auth profile and Firestore document
      if (userData?.role === 'admin') {
        setUserData(prev => ({ ...prev, name: editName, phone: editPhone, wilaya: editWilaya, email: editEmail }));
      } else {
        // Update Firestore document with email field
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          name: editName,
          phone: editPhone,
          wilaya: editWilaya,
          businessName: userData?.businessName || ''
        });
        setUserData(prev => ({ ...prev, name: editName, phone: editPhone, wilaya: editWilaya, businessName: userData?.businessName || '', email: editEmail }));
      }
      
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
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
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

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      loadAdminName();
      const [pending, approved, rejected, all, orders] = await Promise.all([
        getPendingUsers(),
        getApprovedUsers(),
        getRejectedUsers(),
        getAllUsers(),
        getAllOrders(),
      ]);
      
      setPendingUsers(pending);
      setApprovedUsers(approved.filter(u => u.role !== 'admin'));
      setRejectedUsers(rejected);
      setAllUsers(all);
      setAllOrders(orders);
      
      const approvedNonAdmin = approved.filter(u => u.role !== 'admin');
      const approvedShopOwners = approved.filter(u => u.role === 'shop_owner');
      const approvedDairyOwners = approved.filter(u => u.role === 'dairy_owner');
      
      setStats({
        totalUsers: approvedNonAdmin.length, // Only count approved users
        pendingUsers: pending.length,
        approvedUsers: approvedNonAdmin.length,
        rejectedUsers: rejected.length,
        totalOrders: orders.length,
        shopOwners: approvedShopOwners.length, // Only count approved shop owners
        factoryOwners: approvedDairyOwners.length, // Only count approved dairy owners
      });
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const result = await updateUserApproval(userId, true);
      if (result.success) {
        Alert.alert('نجاح', 'تمت الموافقة على الحساب بنجاح');
        
        // Send email notification to user
        const user = await getUserByUid(userId);
        if (user) {
          const { sendUserStatusEmail } = require('../services/firestoreService');
          console.log('User data for email notification:', { userId, user });
          if (user.email) {
            await sendUserStatusEmail(
              userId,
              user.email,
              'approved',
              user.name || 'مستخدم',
              user.role || 'user'
            );
          } else {
            console.error('User email not found for notification:', userId);
          }
        } else {
          console.error('User not found for email notification:', userId);
        }
        
        loadData();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('Error approving user:', error);
      Alert.alert('خطأ', 'فشل في الموافقة على الحساب');
    }
  };

  const handleReject = async (userId) => {
    Alert.alert(
      'تأكيد الرفض',
      'هل أنت متأكد من رفض هذا الحساب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'رفض',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await updateUserApproval(userId, false);
              if (result.success) {
                Alert.alert('نجاح', 'تم رفض الحساب بنجاح. البريد الإلكتروني متاح للتسجيل مجدداً.');

                // Send email notification to user
                const user = await getUserByUid(userId);
                if (user) {
                  const { sendUserStatusEmail } = require('../services/firestoreService');
                  await sendUserStatusEmail(
                    userId,
                    user.email,
                    'rejected',
                    user.name || 'مستخدم',
                    user.role || 'user'
                  );
                }

                loadData();
              } else {
                Alert.alert('خطأ', result.error);
              }
            } catch (error) {
              console.error('Error rejecting user:', error);
              Alert.alert('خطأ', 'فشل في رفض الحساب');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const getFilteredUsers = () => {
    switch (activeTab) {
      case 'pending':
        return pendingUsers;
      case 'approved':
        return approvedUsers;
      case 'rejected':
        return rejectedUsers;
      default:
        return pendingUsers;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredUsers = getFilteredUsers();

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'pending': return 'time-outline';
      case 'approved': return 'checkmark-circle-outline';
      case 'rejected': return 'close-circle-outline';
      default: return 'time-outline';
    }
  };

  const getStatusColor = () => {
    switch (activeTab) {
      case 'pending': return colors.warning;
      case 'approved': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.warning;
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <NotificationDropdown
          notifications={notifications}
          userId={auth.currentUser?.uid}
          onViewAllPress={() => navigation.navigate('Notifications')}
        />
        <Text style={styles.headerTitle}>{activeTab === 'account' ? 'حسابي' : 'لوحة التحكم'}</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {activeTab === 'account' ? (
          // Account View
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                  {userData?.name || auth.currentUser?.displayName || 'مدير النظام'}
                </Text>
                <Text style={styles.profileRole}>مدير النظام</Text>
                <Text style={styles.profileEmail} numberOfLines={1}>{auth.currentUser?.email || ''}</Text>
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
          </ScrollView>
        ) : (
          // Admin Dashboard View
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Overview Stats */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>نظرة عامة</Text>
          </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
            <View style={styles.statTop}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
            </View>
            <Text style={styles.statLabel}>إجمالي المستخدمين</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.warning }]}>
            <View style={styles.statTop}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="time" size={20} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{stats.pendingUsers}</Text>
            </View>
            <Text style={styles.statLabel}>قيد المراجعة</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
            <View style={styles.statTop}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.secondaryLight }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{stats.approvedUsers}</Text>
            </View>
            <Text style={styles.statLabel}>مقبولين</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.accent }]}>
            <View style={styles.statTop}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="cube" size={20} color={colors.accent} />
              </View>
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
            </View>
            <Text style={styles.statLabel}>إجمالي الطلبات</Text>
          </View>
        </View>

        {/* Role Breakdown Card */}
        <View style={styles.roleCard}>
          <Text style={styles.roleCardTitle}>توزيع الأدوار</Text>
          <View style={styles.roleRow}>
            <View style={styles.roleItem}>
              <View style={[styles.roleIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="storefront" size={22} color={colors.primary} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleCount}>{stats.shopOwners}</Text>
                <Text style={styles.roleLabel}>أصحاب المحلات</Text>
              </View>
            </View>
            <View style={styles.roleDivider} />
            <View style={styles.roleItem}>
              <View style={[styles.roleIconBox, { backgroundColor: colors.secondaryLight }]}>
                <Ionicons name="cube" size={22} color={colors.secondary} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleCount}>{stats.factoryOwners}</Text>
                <Text style={styles.roleLabel}>أصحاب الملبن</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Request Tabs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>طلبات التسجيل</Text>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.pendingTab]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={getTabIcon('pending')} 
              size={18} 
              color={activeTab === 'pending' ? '#FFFFFF' : colors.warning} 
            />
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              قيد المراجعة
            </Text>
            <View style={[styles.tabBadge, activeTab === 'pending' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === 'pending' && styles.activeTabBadgeText]}>
                {stats.pendingUsers}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'approved' && styles.approvedTab]}
            onPress={() => setActiveTab('approved')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={getTabIcon('approved')} 
              size={18} 
              color={activeTab === 'approved' ? '#FFFFFF' : colors.success} 
            />
            <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
              مقبولين
            </Text>
            <View style={[styles.tabBadge, { backgroundColor: colors.secondaryLight }, activeTab === 'approved' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, { color: colors.success }, activeTab === 'approved' && styles.activeTabBadgeText]}>
                {stats.approvedUsers}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'rejected' && styles.rejectedTab]}
            onPress={() => setActiveTab('rejected')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={getTabIcon('rejected')} 
              size={18} 
              color={activeTab === 'rejected' ? '#FFFFFF' : colors.error} 
            />
            <Text style={[styles.tabText, activeTab === 'rejected' && styles.activeTabText]}>
              مرفوضين
            </Text>
            <View style={[styles.tabBadge, { backgroundColor: colors.errorLight }, activeTab === 'rejected' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, { color: colors.error }, activeTab === 'rejected' && styles.activeTabBadgeText]}>
                {stats.rejectedUsers}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: getStatusColor() + '15' }]}>
              <Ionicons 
                name={activeTab === 'pending' ? 'hourglass-outline' : activeTab === 'approved' ? 'checkmark-done-circle-outline' : 'ban-outline'} 
                size={48} 
                color={getStatusColor()} 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? 'لا توجد طلبات' : 
               activeTab === 'approved' ? 'لا توجد حسابات مقبولة' : 
               'لا توجد حسابات مرفوضة'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'pending' ? 'جميع الطلبات تمت معالجتها' : 
               activeTab === 'approved' ? 'لم يتم قبول أي حساب بعد' : 
               'لم يتم رفض أي حساب بعد'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userCardInner}>
                <View style={styles.userMainInfo}>
                  <View style={[
                    styles.avatar, 
                    activeTab === 'approved' && { backgroundColor: colors.secondaryLight },
                    activeTab === 'rejected' && { backgroundColor: colors.errorLight }
                  ]}>
                    <Ionicons 
                      name="person" 
                      size={28} 
                      color={
                        activeTab === 'approved' ? colors.success : 
                        activeTab === 'rejected' ? colors.error : 
                        colors.primary
                      } 
                    />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <TouchableOpacity 
                      style={styles.userMeta} 
                      onPress={() => handleCall(user.phone)}
                    >
                      <Ionicons name="call-outline" size={14} color={colors.primary} />
                      <Text style={[styles.userPhone, { color: colors.primary }]}>{user.phone}</Text>
                    </TouchableOpacity>
                    {user.businessName ? (
                      <View style={styles.userMeta}>
                        <Ionicons name={user.role === 'dairy_owner' ? "cube-outline" : "storefront-outline"} size={14} color={colors.text.light} />
                        <Text style={styles.userPhone}>{user.businessName}</Text>
                      </View>
                    ) : null}
                    {user.wilaya ? (
                      <View style={styles.userMeta}>
                        <Ionicons name="location-outline" size={14} color={colors.text.light} />
                        <Text style={styles.userPhone}>{user.wilaya}</Text>
                      </View>
                    ) : null}
                    {user.email ? (
                      <View style={styles.userMeta}>
                        <Ionicons name="mail-outline" size={14} color={colors.text.light} />
                        <Text style={styles.userPhone}>{user.email}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[
                    styles.statusBadge,
                    activeTab === 'pending' && styles.pendingBadge,
                    activeTab === 'approved' && styles.approvedBadge,
                    activeTab === 'rejected' && styles.rejectedBadge,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      activeTab === 'pending' && styles.pendingText,
                      activeTab === 'approved' && styles.approvedText,
                      activeTab === 'rejected' && styles.rejectedText,
                    ]}>
                      {user.role === 'dairy_owner' ? 'ملبنة' : 'محل'}
                    </Text>
                  </View>
                </View>

                {activeTab === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApprove(user.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>موافقة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleReject(user.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>رفض</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeTab === 'approved' && (
                  <View style={styles.approvedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.approvedText}>تمت الموافقة</Text>
                  </View>
                )}

                {activeTab === 'rejected' && (
                  <View style={styles.rejectedRow}>
                    <Ionicons name="close-circle" size={16} color={colors.error} />
                    <Text style={styles.rejectedLabel}>تم الرفض</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 30 }} />
        </ScrollView>
      )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavContainer}>
        <TouchableOpacity
          style={[styles.bottomTab, activeTab === 'home' && styles.activeBottomTab]}
          onPress={() => setActiveTab('home')}
        >
          <Ionicons 
            name="home" 
            size={22} 
            color={activeTab === 'home' ? colors.primary : colors.text.secondary} 
          />
          <Text style={[styles.bottomTabText, activeTab === 'home' && styles.activeBottomTabText]}>
            الرئيسية
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomTab, activeTab === 'account' && styles.activeBottomTab]}
          onPress={() => setActiveTab('account')}
        >
          <Ionicons 
            name="person" 
            size={22} 
            color={activeTab === 'account' ? colors.primary : colors.text.secondary} 
          />
          <Text style={[styles.bottomTabText, activeTab === 'account' && styles.activeBottomTabText]}>
            حسابي
          </Text>
        </TouchableOpacity>
      </View>

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
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  content: {
    padding: 20,
  },
  contentArea: {
    flex: 1,
  },
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
  scrollContent: {
    flex: 1,
  },
  bottomNavContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeBottomTab: {
    backgroundColor: colors.primaryLight,
  },
  bottomTabText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  activeBottomTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
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
  roleCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  roleLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  roleDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    
  },
  pendingTab: {
    backgroundColor: colors.warning,
  },
  approvedTab: {
    backgroundColor: colors.success,
  },
  rejectedTab: {
    backgroundColor: colors.error,
  },
  tabText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.accentLight,
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.warning,
  },
  activeTabBadgeText: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    marginTop: 10,

    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  userCardInner: {
    padding: 16,
  },
  userMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: colors.accentLight,
  },
  approvedBadge: {
    backgroundColor: colors.secondaryLight,
  },
  rejectedBadge: {
    backgroundColor: colors.errorLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pendingText: {
    color: colors.warning,
  },
  approvedText: {
    color: colors.success,
  },
  rejectedText: {
    color: colors.error,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.success,
    gap: 6,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.error,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  approvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  approvedText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  rejectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  rejectedLabel: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
});
