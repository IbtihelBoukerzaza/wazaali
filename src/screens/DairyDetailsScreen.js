import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, RefreshControl, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { getProductsByDairy, subscribeToNotifications } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';

const { width } = Dimensions.get('window');

const PRODUCT_TYPES = [
  { id: 'all', label: 'الكل', icon: 'apps' },
  { id: 'حليب', label: 'حليب', icon: 'water' },
  { id: 'ألبان', label: 'ألبان', icon: 'cafe' },
  { id: 'أجبان', label: 'أجبان', icon: 'pie-chart' },
  { id: 'زبدة', label: 'زبدة', icon: 'ellipse' },
  { id: 'أخرى', label: 'أخرى', icon: 'ellipsis-horizontal' },
];

export default function DairyDetailsScreen({ route, navigation }) {
  const { dairy } = route.params || {};
  
  // Safety check - if no dairy, go back
  if (!dairy) {
    navigation.goBack();
    return null;
  }
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [imageErrors, setImageErrors] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadProducts();
    if (user) {
      const unsub = subscribeToNotifications(user.uid, (notifs) => {
        setNotifications(notifs);
      });
      return () => unsub();
    }
  }, [user]);

  const handleNotificationPress = () => {
    navigation.navigate('طلباتي');
  };

  const handleCall = () => {
    if (dairy.phone) {
      Linking.openURL(`tel:${dairy.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (dairy.phone) {
      const phone = dairy.phone.replace(/\s/g, '');
      Linking.openURL(`https://wa.me/${phone}`);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProductsByDairy(dairy.id);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
  };

  const filteredProducts = products
    .filter(p => typeFilter === 'all' || p.type === typeFilter)
    .filter(p => !searchQuery || (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())));

  const handleImageError = (productId) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  const getTypeIcon = (type) => {
    const found = PRODUCT_TYPES.find(t => t.id === type);
    return found ? found.icon : 'cube';
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <NotificationDropdown
            notifications={notifications}
            userId={user?.uid}
            onNotificationPress={handleNotificationPress}
            onViewAllPress={() => navigation.navigate('Notifications')}
          />
          <Text style={styles.headerTitle}>{dairy.businessName || dairy.name || 'الملبنة'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>جاري تحميل المنتجات...</Text>
        </View>
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
          onNotificationPress={handleNotificationPress}
          onViewAllPress={() => navigation.navigate('Notifications')}
        />
        <Text style={styles.headerTitle}>{dairy.businessName || dairy.name || 'الملبنة'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Dairy Cover Card */}
        <View style={styles.coverCard}>
          <View style={styles.coverGradient}>
            <View style={styles.coverContent}>
              <View style={styles.coverAvatar}>
                {dairy.photoURL ? (
                  <Image source={{ uri: dairy.photoURL }} style={styles.coverAvatarImage} />
                ) : (
                  <Ionicons name="business" size={28} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.coverInfo}>
                <Text style={styles.coverName}>{dairy.businessName || dairy.name}</Text>
                <View style={styles.coverMeta}>
                  {dairy.wilaya && (
                    <View style={styles.coverMetaItem}>
                      <Ionicons name="location" size={13} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.coverMetaText}>{dairy.wilaya}</Text>
                    </View>
                  )}
                  {dairy.phone && (
                    <View style={styles.coverMetaItem}>
                      <Ionicons name="call" size={13} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.coverMetaText}>{dairy.phone}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeNum}>{products.length}</Text>
                <Text style={styles.coverBadgeLabel}>منتج</Text>
              </View>
            </View>
          </View>
                  </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={colors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن منتج..."
              placeholderTextColor={colors.text.light}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Product Type Filter */}
        <View style={styles.typeFilterRow}>
          {PRODUCT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typePill, typeFilter === type.id && styles.typePillActive]}
              onPress={() => setTypeFilter(type.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={type.icon}
                size={16}
                color={typeFilter === type.id ? '#FFFFFF' : colors.text.secondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.typePillText, typeFilter === type.id && styles.typePillTextActive]}>
                {type.label}
              </Text>
              {typeFilter === type.id && (
                <View style={styles.typePillCount}>
                  <Text style={styles.typePillCountText}>
                    {type.id === 'all' ? products.length : products.filter(p => p.type === type.id).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Products Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>المنتجات</Text>
          <Text style={styles.sectionCount}>{filteredProducts.length} منتج</Text>
        </View>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد منتجات</Text>
            <Text style={styles.emptySubtitle}>
              {typeFilter !== 'all' ? 'لا توجد منتجات في هذا التصنيف' : 'هذه الملبنة لم تضف منتجات بعد'}
            </Text>
          </View>
        ) : (
          <View style={styles.productsList}>
            {filteredProducts.map((product) => {
              const isAvailable = (product.stock || 0) > 0;
              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productRow}>
                    {/* Product Image */}
                    <View style={styles.productImageWrap}>
                      {product.image && !imageErrors[product.id] ? (
                        <Image
                          source={{ uri: product.image }}
                          style={styles.productListImage}
                          onError={() => handleImageError(product.id)}
                        />
                      ) : (
                        <View style={styles.productListImagePlaceholder}>
                          <Ionicons name={getTypeIcon(product.type) || 'cube-outline'} size={28} color={colors.text.light} />
                        </View>
                      )}
                    </View>
                    {/* Product Info */}
                    <View style={styles.productListInfo}>
                      <Text style={styles.productListName} numberOfLines={1}>{product.name}</Text>
                      <Text style={styles.productListDairy}>{dairy.businessName || dairy.name}</Text>
                      <Text style={styles.productListPrice}>{product.price} دج / صندوق</Text>
                      <View style={styles.stockStatusRow}>
                        <Ionicons name={getStockStatus(product.stock).icon} size={14} color={getStockStatus(product.stock).color} />
                        <Text style={[styles.stockStatusText, { color: getStockStatus(product.stock).color }]}>
                          {getStockStatus(product.stock).text}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {/* Action Buttons */}
                  <View style={styles.productActions}>
                    <TouchableOpacity
                      style={[styles.productActionBtn, styles.productActionBtnPrimary]}
                      onPress={() => navigation.navigate('ProductDetail', { product, dairy })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.productActionBtnPrimaryText}>اطلب</Text>
                      <Ionicons name="cart-outline" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.productActionBtn, styles.productActionBtnSecondary]}
                      onPress={handleCall}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.productActionBtnSecondaryText}>اتصال</Text>
                      <Ionicons name="call-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
    paddingTop: 25,
    paddingBottom: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.secondary,
  },

  // Cover Card
  coverCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  coverGradient: {
    backgroundColor: colors.primary,
    padding: 20,
  },
  coverContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  coverAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverInfo: {
    flex: 1,
  },
  coverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  coverMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  coverMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coverMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  coverBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  coverBadgeNum: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  coverBadgeLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  coverActions: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 12,
  },
  coverActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverActionDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  coverActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 4,
  },

  // Type Filter
  typeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  typePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  typePillCount: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  typePillCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Products List
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productListImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productListImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productListInfo: {
    flex: 1,
  },
  productListName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  productListDairy: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  productListPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  stockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  productActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  productActionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  productActionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  productActionBtnSecondary: {
    backgroundColor: colors.primaryLight,
  },
  productActionBtnSecondaryText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
