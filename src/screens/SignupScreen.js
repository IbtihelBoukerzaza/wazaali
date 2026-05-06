import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { wilayas } from '../data/wilayas';
import { auth } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { createUserDocument } from '../services/firestoreService';
import { seedSafiliProducts } from '../scripts/seedSafiliProducts';

// Custom LTR placeholder component
const LTRInput = ({ placeholder, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  
  return (
    <View style={styles.ltrInputContainer}>
      <TextInput
        style={[styles.input, props.style]}
        {...props}
        onFocus={(e) => {
          setIsFocused(true);
          if (props.onFocus) props.onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          if (props.onBlur) props.onBlur(e);
        }}
        onChangeText={(text) => {
          setHasValue(text.length > 0);
          if (props.onChangeText) props.onChangeText(text);
        }}
      />
      {!isFocused && !hasValue && (
        <Text style={styles.ltrPlaceholder}>{placeholder}</Text>
      )}
    </View>
  );
};

export default function SignupScreen({ navigation, route }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('shop_owner');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [wilayaModalVisible, setWilayaModalVisible] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState('');

  // Handle terms acceptance when returning from Terms screen
  useEffect(() => {
    if (route.params?.termsAccepted) {
      setTermsAccepted(true);
      // Clear the params to prevent re-checking
      navigation.setParams({ termsAccepted: undefined });
    }
  }, [route.params?.termsAccepted, navigation]);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword || !phone || !businessName || !wilaya) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('خطأ', 'كلمات المرور غير متطابقة');
      return;
    }

    if (password.length < 6) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('خطأ', 'يرجى قبول الشروط والأحكام');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      const role = userType === 'factory' ? 'dairy_owner' : 'shop_owner';
      const result = await createUserDocument(user.uid, {
        name,
        email,
        phone,
        businessName,
        wilaya,
        role,
      });

      if (result.success) {
        // Auto-seed Safili products if businessName matches
        const bName = businessName.trim().toLowerCase();
        if (role === 'dairy_owner' && (bName === 'safili' || bName === 'صفيلي' || bName.includes('safili') || bName.includes('صفيلي'))) {
          try {
            await seedSafiliProducts(user.uid);
            console.log('✅ Safili products auto-seeded for user:', user.uid);
          } catch (seedError) {
            console.error('⚠️ Failed to seed Safili products:', seedError);
          }
        }

        Alert.alert(
          'تم إنشاء الحساب',
          'تم إنشاء حسابك بنجاح. حسابك قيد المراجعة من قبل المسؤول. سيتم إشعارك عند الموافقة.',
          [
            {
              text: 'حسناً',
              onPress: () => {
                auth.signOut();
                navigation.replace('Login');
              }
            }
          ]
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'البريد الإلكتروني مسجل بالفعل';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'البريد الإلكتروني غير صالح';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'كلمة المرور ضعيفة جداً';
      }
      
      Alert.alert('خطأ', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/wazali logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>إنشاء حساب جديد</Text>
          <Text style={styles.subtitle}>انضم إلى شبكة وزعلي</Text>

          {/* User Type Selection */}
          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[styles.userTypeButton, userType === 'factory' && styles.selectedUserType]}
              onPress={() => setUserType('factory')}
            >
              <Ionicons 
                name="cube" 
                size={24} 
                color={userType === 'factory' ? '#FFFFFF' : colors.primary} 
              />
              <Text style={[styles.userTypeButtonText, userType === 'factory' && styles.selectedUserTypeText]}>
                صاحب ملبنة
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.userTypeButton, userType === 'shop_owner' && styles.selectedUserType]}
              onPress={() => setUserType('shop_owner')}
            >
              <Ionicons 
                name="storefront" 
                size={24} 
                color={userType === 'shop_owner' ? '#FFFFFF' : colors.secondary} 
              />
              <Text style={[styles.userTypeButtonText, userType === 'shop_owner' && styles.selectedUserTypeText]}>
                صاحب محل
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={colors.text.light} style={styles.inputIcon} />
            <LTRInput
              style={styles.input}
              placeholder="الاسم الكامل"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={colors.text.light} style={styles.inputIcon} />
            <LTRInput
              style={styles.input}
              placeholder="البريد الإلكتروني"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color={colors.text.light} style={styles.inputIcon} />
            <LTRInput
              style={styles.input}
              placeholder="رقم الهاتف"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Business Name Input */}
          <View style={styles.inputContainer}>
            <Ionicons name={userType === 'factory' ? "cube" : "storefront"} size={20} color={colors.text.light} style={styles.inputIcon} />
            <LTRInput
              style={styles.input}
              placeholder={userType === 'factory' ? "اسم الملبنة" : "اسم المحل"}
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>

          {/* Wilaya Picker */}
          <TouchableOpacity style={styles.inputContainer} onPress={() => { setWilayaSearch(''); setWilayaModalVisible(true); }}>
            <Ionicons name="location" size={20} color={colors.text.light} style={styles.inputIcon} />
            <Text style={[styles.pickerText, !wilaya && styles.pickerTextPlaceholder]}>
              {wilaya || 'الولاية'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.text.light} />
          </TouchableOpacity>

          {/* Wilaya Modal */}
          <Modal
            visible={wilayaModalVisible}
            animationType="slide"
            transparent={true}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>اختر الولاية</Text>
                  <TouchableOpacity onPress={() => setWilayaModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={colors.text.light} style={styles.inputIcon} />
                  <LTRInput
                    style={styles.searchInput}
                    placeholder="بحث عن ولاية..."
                    value={wilayaSearch}
                    onChangeText={setWilayaSearch}
                  />
                </View>
                <FlatList
                  data={wilayas.filter(w => w.name.includes(wilayaSearch) || w.code.includes(wilayaSearch))}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.wilayaItem, wilaya === item.name && styles.wilayaItemSelected]}
                      onPress={() => {
                        setWilaya(item.name);
                        setWilayaModalVisible(false);
                      }}
                    >
                      <Text style={[styles.wilayaItemText, wilaya === item.name && styles.wilayaItemTextSelected]}>
                        {item.name}
                      </Text>
                      <Text style={styles.wilayaCode}>{item.code}</Text>
                    </TouchableOpacity>
                  )}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            </View>
          </Modal>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={colors.text.light} style={styles.inputIcon} />
            <LTRInput
              style={styles.input}
              placeholder="كلمة المرور"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color={colors.text.light} 
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={colors.text.light} style={styles.inputIcon} />
            <LTRInput
              style={styles.input}
              placeholder="تأكيد كلمة المرور"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons 
                name={showConfirmPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color={colors.text.light} 
              />
            </TouchableOpacity>
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity style={styles.termsContainer} onPress={() => setTermsAccepted(!termsAccepted)}>
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              أوافق على{' '}
              <Text
                style={styles.termsLink}
                onPress={() => navigation.navigate('Terms')}
              >
                الشروط والأحكام
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Signup Button */}
          <TouchableOpacity 
            style={[styles.signupButton, loading && styles.signupButtonDisabled]} 
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginText}>
              لديك حساب بالفعل؟ <Text style={styles.loginTextBold}>تسجيل الدخول</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  userTypeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedUserType: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  userTypeButtonText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  selectedUserTypeText: {
    color: '#FFFFFF',
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  ltrInput: {
    writingDirection: 'ltr',
  },
  ltrInputContainer: {
    flex: 1,
    position: 'relative',
  },
  ltrPlaceholder: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    fontSize: 16,
    color: colors.text.light,
    writingDirection: 'ltr',
    textAlignVertical: 'center',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  termsText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signupButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  loginTextBold: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  inputPlaceholder: {
    color: colors.text.light,
  },
  pickerText: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  pickerTextPlaceholder: {
    color: colors.text.light,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: colors.text.primary,
  },
  wilayaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  wilayaItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  wilayaItemText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  wilayaItemTextSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  wilayaCode: {
    fontSize: 14,
    color: colors.text.light,
    fontWeight: '600',
  },
});
