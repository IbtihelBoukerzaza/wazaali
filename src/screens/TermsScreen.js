import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';

export default function TermsScreen({ navigation }) {
  const Bullet = ({ text }) => (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <LText style={styles.bulletText}>{text}</LText>
    </View>
  );

  // LTR Text Component for left-aligned Arabic
  const LText = ({ style, children }) => (
    <Text style={[style, { textAlign: 'left', writingDirection: 'ltr' }]}>
      {children}
    </Text>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-forward" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>الشروط والأحكام</Text>

        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Introduction */}
        <View style={styles.section}>
          <LText style={styles.paragraph}>
            باستخدامك لتطبيق وزعلي، فإنك توافق على الالتزام بالشروط والأحكام التالية:
          </LText>
        </View>

        {/* Section 1 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>1</Text>
            </View>
            <LText style={styles.sectionTitle}>التسجيل</LText>
          </View>
          <Bullet text="يجب أن يكون عمرك 18 سنة على الأقل" />
          <Bullet text="يجب تقديم معلومات صحيحة وكاملة" />
          <Bullet text="الحسابات تخضع للموافقة قبل التفعيل" />
          <Bullet text="يحق لنا رفض أي تسجيل دون إبداء أسباب" />
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>2</Text>
            </View>
            <LText style={styles.sectionTitle}>استخدام التطبيق</LText>
          </View>
          <Bullet text="الالتزام بالمصداقية في التعامل" />
          <Bullet text="الالتزام بالمواعيد المتفق عليها" />
          <Bullet text="احترام باقي المستخدمين" />
          <Bullet text="يحظر استخدام التطبيق لأي نشاط غير قانوني" />
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>3</Text>
            </View>
            <LText style={styles.sectionTitle}>الخصوصية</LText>
          </View>
          <Bullet text="نحترم خصوصيتك ولا نشارك بياناتك مع طرف ثالث" />
          <Bullet text="نستخدم بياناتك فقط لتشغيل التطبيق" />
          <Bullet text="يمكنك حذف حسابك في أي وقت" />
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>4</Text>
            </View>
            <LText style={styles.sectionTitle}>المدفوعات</LText>
          </View>
          <Bullet text="التطبيق مجاني حالياً" />
          <Bullet text="التعامل المالي مباشر بين الطرفين" />
          <Bullet text="التطبيق غير مسؤول عن النزاعات المالية" />
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>5</Text>
            </View>
            <LText style={styles.sectionTitle}>إنهاء الحساب</LText>
          </View>
          <Bullet text="يمكنك حذف حسابك في أي وقت" />
          <Bullet text="نحتفظ بالحق في تعطيل حسابات تخالف الشروط" />
        </View>

        {/* Section 6 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>6</Text>
            </View>
            <LText style={styles.sectionTitle}>التعديلات</LText>
          </View>
          <Bullet text="نحتفظ بالحق في تعديل هذه الشروط" />
          <Bullet text="سيتم إشعارك بالتغييرات المهمة" />
          <Bullet text="الاستخدام المستمر يعني قبول التعديلات" />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            آخر تحديث: مايو 2025
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Button */}
      <View style={styles.footerButton}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => {
            global.__termsAcceptedFromTermsScreen = true;
            navigation.goBack();
          }}
        >
          <Text style={styles.acceptButtonText}>فهمت وأوافق</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  backButton: {
    padding: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: 'CairoBold',
    color: colors.text.primary,
    textAlign: 'center',
  },

  placeholder: {
    width: 40,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  section: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },

  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  numberText: {
    fontSize: 14,
    fontFamily: 'CairoBold',
    color: '#FFFFFF',
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: 'CairoBold',
    color: colors.primary,
    flex: 1,
  },

  paragraph: {
    fontSize: 15,
    fontFamily: 'Cairo',
    color: colors.text.secondary,
    lineHeight: 26,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },

  bullet: {
    marginRight: 10,
    fontSize: 16,
    color: colors.primary,
    lineHeight: 24,
  },

  bulletText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Cairo',
    color: colors.text.secondary,
    lineHeight: 24,
  },

  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  footerText: {
    fontSize: 14,
    fontFamily: 'Cairo',
    color: colors.text.light,
    textAlign: 'center',
  },

  footerButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },

  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'CairoBold',
  },
});