import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>وزعلي</Text>
        <TouchableOpacity style={styles.bellButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>مرحباً بك 👋</Text>
          <Text style={styles.welcomeSubtitle}>ابحث عن أفضل المنتجات من الملابن القريبة</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.text.light} style={styles.searchIconRight} />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن منتج أو ملبنة..."
              placeholderTextColor={colors.text.light}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('الملابن')}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="business" size={24} color={colors.primary} />
            </View>
            <Text style={styles.quickActionText}>الملابن</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('الخريطة')}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="location" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.quickActionText}>الخريطة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('طلباتي')}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="cart" size={24} color={colors.accent} />
            </View>
            <Text style={styles.quickActionText}>طلباتي</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('حسابي')}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="person" size={24} color={colors.purple} />
            </View>
            <Text style={styles.quickActionText}>حسابي</Text>
          </TouchableOpacity>
        </View>

        {/* Price Update Card */}
        <View style={styles.priceCard}>
          <View style={styles.priceIconContainer}>
            <Ionicons name="pricetag" size={28} color={colors.primary} />
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.priceTitle}>سعر الحليب اليوم</Text>
            <Text style={styles.priceValue}>25 دج للكيس (مقنّن)</Text>
          </View>
        </View>

        {/* Featured Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>العروض الخاصة</Text>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>عرض الكل</Text>
            <Ionicons name="chevron-back" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Offer Card */}
        <View style={styles.offerCard}>
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>عرض خاص</Text>
          </View>
          <Text style={styles.offerTitle}>توصيل مجاني!</Text>
          <Text style={styles.offerDescription}>لأول 3 طلبيات من موزعين جدد في منطقتك</Text>
          <TouchableOpacity style={styles.offerButton} onPress={() => navigation.navigate('الملابن')}>
            <Text style={styles.offerButtonText}>اطلب الآن</Text>
          </TouchableOpacity>
        </View>

        {/* Distributors Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>أشهر الموزعين</Text>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>عرض الكل</Text>
            <Ionicons name="chevron-back" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Distributor Cards */}
        <View style={styles.distributorCard}>
          <View style={styles.distributorAvatar}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={styles.distributorInfo}>
            <Text style={styles.distributorName}>موزع الحليب الجزائري</Text>
            <Text style={styles.distributorLocation}>الجزائر العاصمة</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={colors.accent} />
              <Text style={styles.ratingText}>4.8</Text>
            </View>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.text.light} />
        </View>

        <View style={styles.distributorCard}>
          <View style={styles.distributorAvatar}>
            <Ionicons name="person" size={32} color={colors.secondary} />
          </View>
          <View style={styles.distributorInfo}>
            <Text style={styles.distributorName}>موزع البريد</Text>
            <Text style={styles.distributorLocation}>وهران</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={colors.accent} />
              <Text style={styles.ratingText}>4.6</Text>
            </View>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.text.light} />
        </View>
      </ScrollView>
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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.background,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIconRight: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  quickActionCard: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  priceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  priceInfo: {
    flex: 1,
  },
  priceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  offerCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  offerBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  offerButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  offerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  distributorCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  distributorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  distributorInfo: {
    flex: 1,
  },
  distributorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  distributorLocation: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginRight: 4,
  },
});
