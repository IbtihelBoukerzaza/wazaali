import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { colors } from '../utils/colors';
import { getAllDairies, subscribeToNotifications } from '../services/firestoreService';
import { getWilayaCoords } from '../data/wilayas';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';

// Haversine distance in kilometers
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const { user } = useAuth();

  const [location, setLocation] = useState(null);
  const [dairies, setDairies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDairyId, setSelectedDairyId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('nearest');
  const [searchText, setSearchText] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [mapRegion, setMapRegion] = useState({
    latitude: 36.7538,
    longitude: 3.0588,
    latitudeDelta: 5,
    longitudeDelta: 5,
  });

  const checkExistingLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        return loc.coords;
      }
    } catch (e) {
      console.log('Location check error:', e);
    }
    return null;
  };

  const requestAndGetLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'إذن الموقع مطلوب',
        'يحتاج التطبيق إلى الوصول إلى موقعك الحالي لعرض أقرب الملبنات إليك.',
        [{ text: 'حسناً' }]
      );
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return loc.coords;
  };

  const loadDairies = async (coords) => {
    setLoading(true);
    try {
      const dairiesData = await getAllDairies();

      const enriched = dairiesData
        .map((dairy) => {
          const wilayaCoords = getWilayaCoords(dairy.wilaya);
          if (wilayaCoords && coords) {
            const distance = getDistance(
              coords.latitude,
              coords.longitude,
              wilayaCoords.latitude,
              wilayaCoords.longitude
            );
            return { ...dairy, approxCoords: wilayaCoords, distance };
          }
          if (wilayaCoords) {
            return { ...dairy, approxCoords: wilayaCoords, distance: null };
          }
          return { ...dairy, approxCoords: null, distance: null };
        })
        .sort((a, b) => {
          if (activeFilter === 'nearest') {
            if (a.distance != null && b.distance != null) return a.distance - b.distance;
            if (a.distance != null) return -1;
            if (b.distance != null) return 1;
            return 0;
          }
          // price fallback — sort by name until price data is available
          return (a.businessName || a.name || '').localeCompare(b.businessName || b.name || '');
        });

      setDairies(enriched);

      if (coords) {
        setMapRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 2.5,
          longitudeDelta: 2.5,
        });
      }
    } catch (error) {
      console.error('Error loading dairies:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات الملبنات');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableLocation = async () => {
    const coords = await requestAndGetLocation();
    if (coords) {
      setLocation(coords);
      await loadDairies(coords);
    }
  };

  const handleCenterOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }, 500);
    } else {
      handleEnableLocation();
    }
  };

  const zoomIn = () => {
    mapRef.current?.animateToRegion({
      ...mapRegion,
      latitudeDelta: mapRegion.latitudeDelta / 2,
      longitudeDelta: mapRegion.longitudeDelta / 2,
    }, 200);
  };

  const zoomOut = () => {
    mapRef.current?.animateToRegion({
      ...mapRegion,
      latitudeDelta: mapRegion.latitudeDelta * 2,
      longitudeDelta: mapRegion.longitudeDelta * 2,
    }, 200);
  };

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const coords = await checkExistingLocation();
        if (coords) {
          setLocation(coords);
          await loadDairies(coords);
        } else {
          await loadDairies(null);
        }
      };
      init();
      
      // Subscribe to notifications
      if (user) {
        const unsubNotifications = subscribeToNotifications(user.uid, (notifs) => {
          setNotifications(notifs);
        });
        
        return () => {
          unsubNotifications();
        };
      }
    }, [user])
  );

  const handleDairyPress = (dairy) => {
    navigation.navigate('DairyDetails', { dairy });
  };

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف متاح');
    }
  };

  const handleWhatsApp = (phone) => {
    if (phone) {
      const clean = phone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${clean}`);
    } else {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف متاح');
    }
  };

  const handleMarkerPress = (dairy) => {
    setSelectedDairyId(dairy.id);
  };

  const filteredDairies = dairies.filter((dairy) => {
    const text = searchText.trim();
    if (!text) return true;
    const name = (dairy.businessName || dairy.name || '').toLowerCase();
    const wilaya = (dairy.wilaya || '').toLowerCase();
    const address = (dairy.address || dairy.commune || '').toLowerCase();
    return (
      name.includes(text.toLowerCase()) ||
      wilaya.includes(text.toLowerCase()) ||
      address.includes(text.toLowerCase())
    );
  });

  const renderDairyItem = ({ item }) => {
    const name = item.businessName || item.name || 'ملبنة';
    const address = item.address || item.commune
      ? `${item.commune || ''}، ${item.wilaya || ''}`
      : item.wilaya || '';
    const tags = Array.isArray(item.products) && item.products.length > 0
      ? item.products.slice(0, 3)
      : item.productTypes?.slice(0, 3) || ['حليب', 'لبن', 'زبادي'];

    return (
      <View style={styles.dairyCard}>
        {/* Tappable content area navigates to details */}
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => handleDairyPress(item)}
          activeOpacity={0.9}
        >
          {/* Card header: name + distance badge */}
          <View style={styles.cardHeader}>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>
                {item.distance != null ? `${item.distance.toFixed(1)}كم` : '—'}
              </Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {name}
            </Text>
          </View>

          {/* Address */}
          {address ? (
            <View style={styles.cardAddressRow}>
              <Ionicons name="location-outline" size={14} color={colors.text.light} />
              <Text style={styles.cardAddressText}>{address}</Text>
            </View>
          ) : null}

          {/* Product tags */}
          <View style={styles.tagsRow}>
            {tags.map((tag, idx) => (
              <View key={idx} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(item.phone)}
            activeOpacity={0.8}
          >
            <Ionicons name="call-outline" size={16} color="#FFFFFF" />
            <Text style={styles.callButtonText}>اتصال</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={() => handleWhatsApp(item.phone)}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={16} color={colors.primary} />
            <Text style={styles.whatsappButtonText}>واتساب</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const showLocationPrompt = !location && !loading;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <NotificationDropdown
          notifications={notifications}
          userId={user?.uid}
        />
        <Text style={styles.headerTitle}>خريطة الملبنات</Text>
        <TouchableOpacity style={[styles.headerIcon, styles.menuIcon]} activeOpacity={0.7}>
          <Ionicons name="menu-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.text.light} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن ملبنة..."
            placeholderTextColor={colors.text.light}
            value={searchText}
            onChangeText={setSearchText}
            textAlign="right"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchText('')}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color={colors.text.light} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Location prompt banner */}
        {showLocationPrompt && (
          <View style={styles.locationBanner}>
            <View style={styles.bannerIconWrap}>
              <Ionicons name="locate" size={22} color={colors.primary} />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle}>تحديد موقعك التلقائي</Text>
              <Text style={styles.bannerSubtitle}>
                اسمح بالوصول لرؤية الملبنات الأقرب إليك
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bannerButton}
              onPress={handleEnableLocation}
              activeOpacity={0.8}
            >
              <Text style={styles.bannerButtonText}>سماح</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Map container */}
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
          >
            {location && (
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="موقعك الحالي"
              >
                <View style={styles.userMarker}>
                  <View style={styles.userMarkerDot} />
                  <View style={styles.userMarkerRing} />
                </View>
              </Marker>
            )}
            {filteredDairies.map(
              (dairy) =>
                dairy.approxCoords && (
                  <Marker
                    key={dairy.id}
                    coordinate={{
                      latitude: dairy.approxCoords.latitude,
                      longitude: dairy.approxCoords.longitude,
                    }}
                    onPress={() => handleMarkerPress(dairy)}
                  >
                    <View style={[
                      styles.dairyMarker,
                      selectedDairyId === dairy.id && styles.dairyMarkerActive,
                    ]}>
                      <Ionicons name="business" size={14} color="#FFFFFF" />
                    </View>
                  </Marker>
                )
            )}
          </MapView>

          {/* Map controls overlay */}
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapCtrlBtn} onPress={zoomIn} activeOpacity={0.7}>
              <Text style={styles.mapCtrlText}>+</Text>
            </TouchableOpacity>
            <View style={styles.mapCtrlDivider} />
            <TouchableOpacity style={styles.mapCtrlBtn} onPress={zoomOut} activeOpacity={0.7}>
              <Text style={styles.mapCtrlText}>−</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.mapLocateBtn}
            onPress={handleCenterOnUser}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filter toggle */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'nearest' && styles.filterBtnActive]}
            onPress={() => setActiveFilter('nearest')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterBtnText,
                activeFilter === 'nearest' && styles.filterBtnTextActive,
              ]}
            >
              الأقرب
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'price' && styles.filterBtnActive]}
            onPress={() => {
              Alert.alert('تنبيه', 'ميزة التصفية حسب السعر قيد التطوير وستكون متاحة قريباً');
              setActiveFilter('nearest'); // Keep nearest filter active
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterBtnText,
                activeFilter === 'price' && styles.filterBtnTextActive,
              ]}
            >
              السعر
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dairy list */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingBoxText}>جاري تحميل الملبنات...</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredDairies.map((item) => (
              <View key={item.id}>
                {renderDairyItem({ item })}
              </View>
            ))}
            {filteredDairies.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name="business-outline" size={40} color={colors.text.light} />
                <Text style={styles.emptyBoxText}>لا توجد ملبنات متاحة</Text>
              </View>
            )}
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    backgroundColor: '#DBEAFE',
  },
  menuIcon: {
    backgroundColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  /* Search bar */
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 14,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'right',
  },
  clearButton: {
    padding: 2,
  },

  /* Location banner */
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'right',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  bannerButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 4,
  },
  bannerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },

  /* Map */
  mapWrap: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 14,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControls: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  mapCtrlBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCtrlDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  mapCtrlText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  mapLocateBtn: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  /* Markers */
  userMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },
  userMarkerRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(37,99,235,0.2)',
  },
  dairyMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dairyMarkerActive: {
    backgroundColor: '#EF4444',
    transform: [{ scale: 1.15 }],
  },

  /* Filter toggle */
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  filterBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },

  /* List & cards */
  listWrap: {
    gap: 12,
  },
  dairyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'right',
  },
  distanceBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cardAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'flex-end',
  },
  cardAddressText: {
    fontSize: 12,
    color: colors.text.light,
    marginRight: 4,
    textAlign: 'right',
  },
  tagsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
    gap: 6,
  },
  tagPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  whatsappButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* Loading & empty */
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingBoxText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyBoxText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.text.light,
  },
});
