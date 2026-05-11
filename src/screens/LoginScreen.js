import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getUserByUid, getUserByEmail } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUserRole, setIsApproved } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      // First check if user has a pending/rejected account (no Auth account yet)
      const firestoreUser = await getUserByEmail(email);
      if (firestoreUser && !firestoreUser.uid) {
        // No Auth account exists yet — account is pending or rejected
        if (firestoreUser.status === 'pending') {
          Alert.alert('حساب قيد المراجعة', 'حسابك قيد المراجعة من قبل المسؤول. سيتم إشعارك عند الموافقة.');
          setLoading(false);
          return;
        }
        if (firestoreUser.status === 'rejected') {
          Alert.alert('حساب مرفوض', 'تم رفض طلب تسجيلك من قبل المسؤول. يمكنك إنشاء حساب جديد بنفس البريد الإلكتروني.');
          setLoading(false);
          return;
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user data from Firestore
      let userData = await getUserByUid(user.uid);

      // Fallback: if not found by UID, search by email (edge case: uid was not set during approval)
      if (!userData) {
        const firestoreUser = await getUserByEmail(email);
        if (firestoreUser) {
          userData = firestoreUser;
          // Link the auth UID to the Firestore document for future logins
          try {
            const userRef = doc(db, 'users', firestoreUser.id);
            await updateDoc(userRef, { uid: user.uid });
            console.log('Linked auth UID to Firestore document:', user.uid);
          } catch (linkError) {
            console.error('Failed to link UID:', linkError);
          }
        }
      }

      if (userData) {
        setUserRole(userData.role);
        setIsApproved(userData.approved);

        if (userData.status === 'rejected') {
          Alert.alert(
            'حساب مرفوض',
            'تم رفض طلب تسجيلك من قبل المسؤول. يرجى التواصل مع الإدارة لمزيد من المعلومات.'
          );
          auth.signOut();
          setLoading(false);
          return;
        }

        if (!userData.approved) {
          Alert.alert(
            'حساب قيد المراجعة',
            'حسابك قيد المراجعة من قبل المسؤول. سيتم إشعارك عند الموافقة.'
          );
          auth.signOut();
          setLoading(false);
          return;
        }

        navigation.replace('MainApp');
      } else {
        Alert.alert('خطأ', 'لم يتم العثور على بيانات المستخدم');
        auth.signOut();
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق من البيانات والمحاولة مرة أخرى، أو استخدام خيار "نسيت كلمة المرور".';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني. يرجى التحقق من البريد أو إنشاء حساب جديد.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى أو استخدام خيار "نسيت كلمة المرور".';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'صيغة البريد الإلكتروني غير صحيحة. يرجى إدخال بريد إلكتروني صالح مثل example@email.com.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة مرة أخرى بعد بضع دقائق.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'حدث خطأ في الاتصال. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'تم تعطيل هذا الحساب. يرجى التواصل مع الدعم للحصول على المساعدة.';
      }
      
      Alert.alert('خطأ في تسجيل الدخول', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      Alert.alert('البريد الإلكتروني مطلوب', 'يرجى إدخال البريد الإلكتروني في حقل تسجيل الدخول أولاً.');
      return;
    }
    Alert.alert(
      'إعادة تعيين كلمة المرور',
      `سيتم إرسال رابط إعادة تعيين كلمة المرور إلى: ${email}`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إرسال',
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Alert.alert(
                'تم الإرسال بنجاح',
                'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد والبريد العشوائي.',
                [{ text: 'حسناً' }]
              );
            } catch (error) {
              let errorMessage = 'حدث خطأ أثناء إرسال الرابط. يرجى المحاولة مرة أخرى.';
              if (error.code === 'auth/user-not-found') {
                errorMessage = 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني. يرجى التحقق من البريد أو إنشاء حساب جديد.';
              } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'صيغة البريد الإلكتروني غير صحيحة. يرجى إدخال بريد إلكتروني صالح.';
              } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة مرة أخرى بعد بضع دقائق.';
              } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'حدث خطأ في الاتصال. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
              }
              Alert.alert('فشل الإرسال', errorMessage);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        <Text style={styles.title}>مرحباً بعودتك</Text>
        <Text style={styles.subtitle}>سجل دخولك للمتابعة</Text>

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

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
          <Text style={styles.forgotPasswordText}>نسيت كلمة المرور؟</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </Text>
        </TouchableOpacity>

        {/* Sign Up Link */}
        <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.signupText}>
            ليس لديك حساب؟ <Text style={styles.signupTextBold}>أنشئ حساب جديد</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
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
    marginBottom: 40,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  loginButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  signupLink: {
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  signupTextBold: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
