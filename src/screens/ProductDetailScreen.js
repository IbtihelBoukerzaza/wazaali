import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import { getUserByUid, createOrderWithNotification, subscribeToNotifications } from '../services/firestoreService';
import NotificationDropdown from '../components/NotificationDropdown';

const { width } = Dimensions.get('window');

const PRODUCT_TYPES = [
  { id: 'حليب', label: 'حليب', icon: 'water' },
  { id: 'ألبان', label: 'ألبان', icon: 'cafe' },
  { id: 'أجبان', label: 'أجبان', icon: 'pie-chart' },
  { id: 'زبدة', label: 'زبدة', icon: 'ellipse' },
  { id: 'أخرى', label: 'أخرى', icon: 'ellipsis-horizontal' },
];

export default function ProductDetailScreen({ route, navigation }) {
  const { product, dairy } = route.params || {};
  
  // Safety check - if no product, go back
  if (!product) {
    navigation.goBack();
    return null;
  }
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [shopData, setShopData] = useState(null);
  const [ordering, setOrdering] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadShopData();
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

  const loadShopData = async () => {
    if (!user) return;
    const data = await getUserByUid(user.uid);
    setShopData(data);
  };

  const isAvailable = (product?.stock || 0) > 0;
  const maxOrderQty = product?.stock || 0;
  const totalPrice = (product?.price || 0) * quantity;

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

  const handlePlaceOrder = async () => {
    if (!isAvailable) {
      Alert.alert('غير متوفر', 'هذا المنتج غير متوفر حالياً');
      return;
    }
    if (quantity <= 0) {
      Alert.alert('خطأ', 'يرجى اختيار كمية صحيحة');
      return;
    }

    Alert.alert(
      'تأكيد الطلب',
      `هل تريد طلب ${quantity} من ${product.name}؟\nالإجمالي: ${totalPrice} دج`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          onPress: async () => {
            setOrdering(true);
            try {
              const orderData = {
                shopId: user.uid,
                shopName: shopData?.businessName || shopData?.name || 'صاحب محل',
                shopPhone: shopData?.phone || '',
                shopBusinessName: shopData?.businessName || '',
                shopWilaya: shopData?.wilaya || '',
                dairyId: dairy.id,
                dairyName: dairy.businessName || dairy.name || 'الملبنة',
                items: [{
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  quantity: quantity,
                }],
                totalAmount: totalPrice,
              };

              const result = await createOrderWithNotification(orderData);
              if (result.success) {
                Alert.alert(
                  'تم إرسال الطلب',
                  'تم إرسال طلبك بنجاح. ستتلقى إشعاراً عند الرد عليه.',
                  [
                    {
                      text: 'حسناً',
                      onPress: () => navigation.replace('DairyDetails', { dairy }),
                    },
                  ]
                );
              } else {
                Alert.alert('خطأ', result.error || 'فشل في إرسال الطلب');
              }
            } catch (error) {
              console.error('Error placing order:', error);
              Alert.alert('خطأ', 'فشل في إرسال الطلب');
            } finally {
              setOrdering(false);
            }
          }
        }
      ]
    );
  };

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
        <Text style={styles.headerTitle}>تفاصيل المنتج</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Product Hero Image */}
        <View style={styles.heroImageContainer}>
          {product.image && !imageError ? (
            <Image
              source={{ uri: product.image }}
              style={styles.heroImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Ionicons name={getTypeIcon(product.type) || 'cube-outline'} size={56} color={colors.text.light} />
            </View>
          )}
          {/* Availability Badge */}
          <View style={[styles.availBadge, { backgroundColor: isAvailable ? '#22C55E' : '#EF4444' }]}>
            <Ionicons name={isAvailable ? 'checkmark-circle' : 'close-circle'} size={14} color="#FFFFFF" />
            <Text style={styles.availBadgeText}>{isAvailable ? 'متوفر' : 'غير متوفر'}</Text>
          </View>
          {/* Type Tag */}
          {product.type && (
            <View style={styles.heroTypeTag}>
              <Ionicons name={getTypeIcon(product.type)} size={12} color="#FFFFFF" />
              <Text style={styles.heroTypeTagText}>{product.type}</Text>
            </View>
          )}
        </View>

        {/* Product Info Card */}
        <View style={styles.infoCard}>
          {/* Name + Price Row */}
          <View style={styles.namePriceRow}>
            <View style={styles.nameCol}>
              <Text style={styles.productName}>{product.name}</Text>
              {product.type && (
                <View style={styles.typePillSmall}>
                  <Ionicons name={getTypeIcon(product.type)} size={12} color={colors.primary} />
                  <Text style={styles.typePillSmallText}>{product.type}</Text>
                </View>
              )}
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.productPrice}>{product.price}</Text>
              <Text style={styles.productPriceUnit}>دج / صندوق</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Stock Info */}
          <View style={styles.stockRow}>
            <View style={[styles.stockIconWrap, { backgroundColor: getStockStatus(product.stock).color + '20' }]}>
              <Ionicons name={getStockStatus(product.stock).icon} size={18} color={getStockStatus(product.stock).color} />
            </View>
            <Text style={styles.stockLabel}>حالة المخزون</Text>
            <Text style={[styles.stockValue, { color: getStockStatus(product.stock).color }]}>
              {getStockStatus(product.stock).text}
            </Text>
          </View>

          {/* Description */}
          {product.description ? (
            <View style={styles.descSection}>
              <Text style={styles.descLabel}>الوصف</Text>
              <Text style={styles.descText}>{product.description}</Text>
            </View>
          ) : null}

          {/* Dairy Info */}
          <View style={styles.dairySection}>
            <Text style={styles.dairyLabel}>الملبنة</Text>
            <View style={styles.dairyCard}>
              <View style={styles.dairyAvatar}>
                {dairy.photoURL ? (
                  <Image source={{ uri: dairy.photoURL }} style={styles.dairyAvatarImage} />
                ) : (
                  <Ionicons name="business" size={22} color={colors.primary} />
                )}
              </View>
              <View style={styles.dairyInfo}>
                <Text style={styles.dairyName}>{dairy.businessName || dairy.name}</Text>
                {dairy.wilaya && (
                  <View style={styles.dairyLocationRow}>
                    <Ionicons name="location-outline" size={12} color={colors.text.secondary} />
                    <Text style={styles.dairyLocation}>{dairy.wilaya}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-back" size={18} color={colors.text.light} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Order Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.qtySection}>
          <TouchableOpacity
            style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={18} color={quantity <= 1 ? '#CBD5E1' : colors.primary} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, quantity >= maxOrderQty && styles.qtyBtnDisabled]}
            onPress={() => setQuantity(Math.min(maxOrderQty, quantity + 1))}
            disabled={quantity >= maxOrderQty}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={quantity >= maxOrderQty ? '#CBD5E1' : colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.orderBtn, (!isAvailable || ordering) && styles.orderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={!isAvailable || ordering}
          activeOpacity={0.8}
        >
          {ordering ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cart" size={20} color="#FFFFFF" />
              <Text style={styles.orderBtnText}>
                {isAvailable ? `طلب (${totalPrice} دج)` : 'غير متوفر'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero Image
  heroImageContainer: {
    height: 260,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  availBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  availBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTypeTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  heroTypeTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  namePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameCol: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  typePillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  typePillSmallText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  productPriceUnit: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },

  // Stock Row
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stockLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Description
  descSection: {
    marginBottom: 16,
  },
  descLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
  },
  descText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // Dairy Section
  dairySection: {
    marginBottom: 4,
  },
  dairyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  dairyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
  },
  dairyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  dairyAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dairyInfo: {
    flex: 1,
  },
  dairyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  dairyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dairyLocation: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  qtySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginRight: 12,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyBtnDisabled: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginHorizontal: 14,
    minWidth: 28,
    textAlign: 'center',
  },
  orderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  orderBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  orderBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
