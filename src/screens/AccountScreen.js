import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../config/firebase';
import { getUserByUid } from '../services/firestoreService';

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, userRole } = useAuth();
  const [userType, setUserType] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [userData, setUserData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoggedIn(true);
      loadUserData();
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حسابي</Text>
        <Text style={styles.headerSubtitle}>مرحباً بك</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={48} color={colors.primary} />
          </View>
          <Text style={styles.profileName}>{userData?.businessName || userData?.name || user?.email || 'مستخدم'}</Text>
          <Text style={styles.profileType}>
            {userRole === 'dairy_owner' ? 'صاحب ملبنة' : userRole === 'shop_owner' ? 'صاحب محل' : 'مستخدم'}
          </Text>
          {userData?.phone && <Text style={styles.profileInfo}>{userData.phone}</Text>}
          {userData?.wilaya && <Text style={styles.profileInfo}>{userData.wilaya}</Text>}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color={colors.text.light} />
            <Text style={styles.menuText}>الملف الشخصي</Text>
            <Ionicons name="person-circle" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color={colors.text.light} />
            <Text style={styles.menuText}>طلباتي</Text>
            <Ionicons name="list" size={24} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color={colors.text.light} />
            <Text style={styles.menuText}>العناوين</Text>
            <Ionicons name="location" size={24} color={colors.accent} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color={colors.text.light} />
            <Text style={styles.menuText}>الإعدادات</Text>
            <Ionicons name="settings" size={24} color={colors.purple} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="chevron-back" size={20} color={colors.text.light} />
            <Text style={styles.menuText}>المساعدة</Text>
            <Ionicons name="help-circle" size={24} color={colors.pink} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <Text style={[styles.menuText, styles.logoutText]}>تسجيل الخروج</Text>
            <Ionicons name="log-out" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
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
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  profileType: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  profileInfo: {
    fontSize: 13,
    color: colors.text.light,
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    marginRight: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: colors.error,
  },
});
