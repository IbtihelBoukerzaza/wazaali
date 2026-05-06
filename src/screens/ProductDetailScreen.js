import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import { getUserByUid, createOrderWithNotification } from '../services/firestoreService';

export default function ProductDetailScreen({ route, navigation }) {
  const { product, dairy } = route.params;
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [shopData, setShopData] = useState(null);
  const [ordering, setOrdering] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    loadShopData();
  }, []);

  const loadShopData = async () => {
    if (!user) return;
    const data = await getUserByUid(user.uid);
    setShopData(data);
  };

  const isAvailable = (product.stock || 0) > 0;
  const maxOrderQty = product.stock || 0;
  const totalPrice = product.price * quantity;

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
                      text: 'طلباتي',
                      onPress: () => navigation.navigate('MainApp'),
                    },
                    { text: 'حسناً' },
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل المنتج</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.image && !imageError ? (
            <Image
              source={{ uri: product.image }}
              style={styles.productImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={64} color={colors.text.light} />
            </View>
          )}
          <View style={[styles.availabilityOverlay, { backgroundColor: isAvailable ? '#22C55E' : '#EF4444' }]}>
            <Ionicons name={isAvailable ? 'checkmark-circle' : 'close-circle'} size={16} color="#FFFFFF" />
            <Text style={styles.availabilityOverlayText}>
              {isAvailable ? 'Disponible' : 'Non disponible'}
            </Text>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productPrice}>{product.price} دج</Text>
          </View>

          {product.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
          )}

          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>الوصف</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Stock Info */}
          <View style={styles.stockSection}>
            <View style={styles.stockRow}>
              <Ionicons name="cube-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.stockLabel}>الكمية المتوفرة</Text>
              <Text style={[styles.stockValue, { color: isAvailable ? colors.success : colors.error }]}>
                {product.stock || 0} صندوق
              </Text>
            </View>
          </View>

          {/* Dairy Info */}
          <View style={styles.dairySection}>
            <Text style={styles.sectionLabel}>الملبنة</Text>
            <View style={styles.dairyCard}>
              <View style={styles.dairyAvatar}>
                <Ionicons name="business" size={24} color={colors.primary} />
              </View>
              <View style={styles.dairyInfo}>
                <Text style={styles.dairyName}>{dairy.businessName || dairy.name}</Text>
                {dairy.wilaya && (
                  <View style={styles.dairyLocationRow}>
                    <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.dairyLocation}>{dairy.wilaya}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-back" size={20} color={colors.text.light} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Order Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantitySection}>
          <TouchableOpacity
            style={[styles.qtyButton, quantity <= 1 && styles.qtyButtonDisabled]}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Ionicons name="remove" size={20} color={quantity <= 1 ? colors.text.light : colors.primary} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyButton, quantity >= maxOrderQty && styles.qtyButtonDisabled]}
            onPress={() => setQuantity(Math.min(maxOrderQty, quantity + 1))}
            disabled={quantity >= maxOrderQty}
          >
            <Ionicons name="add" size={20} color={quantity >= maxOrderQty ? colors.text.light : colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.orderButton, (!isAvailable || ordering) && styles.orderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={!isAvailable || ordering}
        >
          {ordering ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cart" size={20} color="#FFFFFF" />
              <Text style={styles.orderButtonText}>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  imageContainer: {
    height: 240,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  availabilityOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  infoSection: {
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  categoryBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  stockSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dairySection: {
    marginBottom: 16,
  },
  dairyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  dairyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  dairyInfo: {
    flex: 1,
  },
  dairyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  dairyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dairyLocation: {
    fontSize: 12,
    color: colors.text.secondary,
    marginRight: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 28,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  orderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  orderButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
