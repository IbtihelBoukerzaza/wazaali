import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { getProductsByDairy } from '../services/firestoreService';

const { width } = Dimensions.get('window');

export default function DairyDetailsScreen({ route, navigation }) {
  const { dairy } = route.params;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProductsByDairy(dairy.id);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredProducts = categoryFilter === 'all'
    ? products
    : products.filter(p => p.category === categoryFilter);

  const handleImageError = (productId) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{dairy.businessName || dairy.name || 'الملبنة'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{dairy.businessName || dairy.name || 'الملبنة'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        {/* Dairy Info Card */}
        <View style={styles.dairyInfoCard}>
          <View style={styles.dairyAvatar}>
            <Ionicons name="business" size={32} color={colors.primary} />
          </View>
          <View style={styles.dairyInfo}>
            <Text style={styles.dairyName}>{dairy.businessName || dairy.name}</Text>
            {dairy.wilaya && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.dairyLocation}>{dairy.wilaya}</Text>
              </View>
            )}
            {dairy.phone && (
              <View style={styles.locationRow}>
                <Ionicons name="call-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.dairyLocation}>{dairy.phone}</Text>
              </View>
            )}
          </View>
          <View style={styles.productsCount}>
            <Text style={styles.productsCountNum}>{products.length}</Text>
            <Text style={styles.productsCountLabel}>منتج</Text>
          </View>
        </View>

        {/* Category Filter */}
        {categories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, categoryFilter === cat && styles.categoryPillActive]}
                onPress={() => setCategoryFilter(cat)}
              >
                <Text style={[styles.categoryPillText, categoryFilter === cat && styles.categoryPillTextActive]}>
                  {cat === 'all' ? 'الكل' : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Products Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>المنتجات ({filteredProducts.length})</Text>
        </View>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={56} color={colors.text.light} />
            <Text style={styles.emptyText}>لا توجد منتجات متاحة</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => {
              const isAvailable = (product.stock || 0) > 0;
              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => navigation.navigate('ProductDetail', { product, dairy })}
                  activeOpacity={0.7}
                >
                  <View style={styles.productImageContainer}>
                    {product.image && !imageErrors[product.id] ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                        onError={() => handleImageError(product.id)}
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons name="cube-outline" size={28} color={colors.text.light} />
                      </View>
                    )}
                    <View style={[styles.availabilityBadge, { backgroundColor: isAvailable ? '#22C55E' : '#EF4444' }]}>
                      <Text style={styles.availabilityText}>{isAvailable ? 'متوفر' : 'غير متوفر'}</Text>
                    </View>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productDescription} numberOfLines={2}>{product.description || ''}</Text>
                    <View style={styles.productFooter}>
                      <Text style={styles.productPrice}>{product.price} دج</Text>
                      <Text style={styles.productStock}>{product.stock || 0} صندوق</Text>
                    </View>
                  </View>
                </TouchableOpacity>
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
  loader: {
    marginTop: 40,
  },
  scrollContent: {
    flex: 1,
  },
  dairyInfoCard: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dairyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  dairyInfo: {
    flex: 1,
  },
  dairyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dairyLocation: {
    fontSize: 13,
    color: colors.text.secondary,
    marginRight: 4,
  },
  productsCount: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  productsCountNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productsCountLabel: {
    fontSize: 11,
    color: colors.primary,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 12,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  productCard: {
    width: (width - 40) / 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  productImageContainer: {
    height: 120,
    backgroundColor: colors.background,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  availabilityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  availabilityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productStock: {
    fontSize: 11,
    color: colors.text.light,
  },
});
