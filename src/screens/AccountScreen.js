import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../config/firebase';
import { getUserByUid, subscribeToNotifications } from '../services/firestoreService';
import NotificationDropdown from '../components/NotificationDropdown';
import {
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  updateProfile,
} from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, userRole } = useAuth();
  const [userType, setUserType] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [userData, setUserData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [profilePic, setProfilePic] = useState(user?.photoURL || null);

  // Modals
  const [notifications, setNotifications] = useState([]);

  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Personal info form
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWilaya, setEditWilaya] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (user) {
      setIsLoggedIn(true);
      loadUserData();
      setProfilePic(user.photoURL || userData?.photoURL || null);
      const unsub = subscribeToNotifications(user.uid, (notifs) => {
        setNotifications(notifs);
      });
      return () => unsub && unsub();
    } else {
      setIsLoggedIn(false);
      setLoadingData(false);
    }
  }, [user]);

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
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const pickImage = async () => {
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
      // Update Firebase Auth profile (photoURL needs a hosted URL in production)
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

  const roleLabel = () => {
    if (userRole === 'dairy_owner') return 'صاحب ملبنة';
    if (userRole === 'shop_owner') return 'صاحب محل';
    if (userRole === 'admin') return 'مدير';
    return 'مستخدم';
  };

  // ============ NOT LOGGED IN ============
  if (!isLoggedIn) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>حسابي</Text>
          <Text style={styles.headerSubtitle}>سجل دخولك أو أنشئ حساب جديد</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>نوع الحساب</Text>
          
          <TouchableOpacity
            style={[styles.userTypeCard, userType === 'distributor' && styles.selectedCard]}
            onPress={() => setUserType('distributor')}
          >
            {userType === 'distributor' && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
            <View style={styles.userTypeInfo}>
              <Text style={[styles.userTypeTitle, userType === 'distributor' && styles.selectedText]}>موزع</Text>
              <Text style={styles.userTypeDescription}>للموزعين الذين يريدون تقديم خدمات التوصيل</Text>
            </View>
            <View style={[styles.userTypeIcon, userType === 'distributor' && styles.selectedIcon]}>
              <Ionicons name="bicycle" size={32} color={userType === 'distributor' ? '#FFFFFF' : colors.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.userTypeCard, userType === 'shop' && styles.selectedCard]}
            onPress={() => setUserType('shop')}
          >
            {userType === 'shop' && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
            <View style={styles.userTypeInfo}>
              <Text style={[styles.userTypeTitle, userType === 'shop' && styles.selectedText]}>صاحب محل</Text>
              <Text style={styles.userTypeDescription}>لأصحاب المحلات الذين يريدون طلب المنتجات</Text>
            </View>
            <View style={[styles.userTypeIcon, userType === 'shop' && styles.selectedIcon]}>
              <Ionicons name="storefront" size={32} color={userType === 'shop' ? '#FFFFFF' : colors.secondary} />
            </View>
          </TouchableOpacity>

          {userType && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>معلومات التسجيل</Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="الاسم الكامل"
                  placeholderTextColor={colors.text.light}
                />
                <Ionicons name="person" size={20} color={colors.text.light} style={styles.inputIcon} />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="رقم الهاتف"
                  placeholderTextColor={colors.text.light}
                  keyboardType="phone-pad"
                />
                <Ionicons name="call" size={20} color={colors.text.light} style={styles.inputIcon} />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="البريد الإلكتروني"
                  placeholderTextColor={colors.text.light}
                  keyboardType="email-address"
                />
                <Ionicons name="mail" size={20} color={colors.text.light} style={styles.inputIcon} />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="كلمة المرور"
                  placeholderTextColor={colors.text.light}
                  secureTextEntry
                />
                <Ionicons name="lock-closed" size={20} color={colors.text.light} style={styles.inputIcon} />
              </View>

              {userType === 'distributor' && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="منطقة التغطية"
                    placeholderTextColor={colors.text.light}
                  />
                  <Ionicons name="location" size={20} color={colors.text.light} style={styles.inputIcon} />
                </View>
              )}

              {userType === 'shop' && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="اسم المحل"
                    placeholderTextColor={colors.text.light}
                  />
                  <Ionicons name="storefront" size={20} color={colors.text.light} style={styles.inputIcon} />
                </View>
              )}

              <TouchableOpacity style={styles.registerButton}>
                <Text style={styles.registerButtonText}>إنشاء حساب</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginButton}>
                <Text style={styles.loginButtonText}>لديك حساب بالفعل؟ تسجيل الدخول</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // ============ LOGGED IN ============
  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <NotificationDropdown
            notifications={notifications}
            userId={user?.uid}
          />
          <Text style={styles.headerTitle}>حسابي</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

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
              <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.profileName}>
              {userData?.businessName || userData?.name || user?.displayName || 'مستخدم'}
            </Text>
            <Text style={styles.profileRole}>{roleLabel()}</Text>
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
      </ScrollView>

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
    </>
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
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  userTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: colors.primary,
  },
  userTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedIcon: {
    backgroundColor: colors.primary,
  },
  userTypeInfo: {
    flex: 1,
  },
  userTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  selectedText: {
    color: colors.primary,
  },
  userTypeDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  formContainer: {
    marginTop: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  registerButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: colors.primary,
    fontSize: 14,
  },

  // === Logged-in Profile ===
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
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.text.light,
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 12,
    color: colors.text.light,
  },

  // === Menu Items ===
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

  // === Logout ===
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

  // === Modals ===
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

  // === About ===
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
});
