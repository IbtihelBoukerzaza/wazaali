import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { getAllDairies, subscribeToNotifications } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';

export default function FactoriesScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [dairies, setDairies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    loadDairies();
    if (user) {
      const unsub = subscribeToNotifications(user.uid, (notifs) => {
        setNotifications(notifs);
      });
      return () => unsub();
    }
  }, [user]);

  const loadDairies = async () => {
    try {
      const data = await getAllDairies();
      setDairies(data);
    } catch (error) {
      console.error('Error loading dairies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDairies = dairies.filter(dairy =>
    (dairy.businessName || dairy.name || '').includes(searchText) ||
    (dairy.wilaya || '').includes(searchText)
  );

  const handleNotificationPress = () => {
    navigation.navigate('طلباتي');
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
        <Text style={styles.headerTitle}>الملابن</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>أهلاً بك في وزعلي</Text>
        <Text style={styles.welcomeSubtitle}>تطبيق يربط الملابن وموزعي الحليب بأصحاب المحلات بكل سهولة وسرعة</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.text.light} style={styles.searchIconRight} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن ملبنة أو منتج..."
            placeholderTextColor={colors.text.light}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>الملابن المتاحة ({filteredDairies.length})</Text>
      </View>

      {/* Dairy Cards */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {filteredDairies.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={56} color={colors.text.light} />
                <Text style={styles.emptyText}>لا توجد ملابن متاحة حالياً</Text>
              </View>
            ) : (
              filteredDairies.map((dairy) => (
                <TouchableOpacity
                  key={dairy.id}
                  style={styles.factoryCard}
                  onPress={() => navigation.navigate('DairyDetails', { dairy })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.text.light} />
                  <View style={styles.factoryInfo}>
                    <Text style={styles.factoryName}>{dairy.businessName || dairy.name || 'الملبنة'}</Text>
                    {dairy.wilaya && (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                        <Text style={styles.factoryLocation}>{dairy.wilaya}</Text>
                      </View>
                    )}
                    <View style={styles.availableTag}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                      <Text style={styles.availableText}>متاح للتوزيع</Text>
                    </View>
                  </View>
                  <View style={styles.factoryIconContainer}>
                    <Ionicons name="business" size={28} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
  menuButton: {
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
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 10,
  },
  searchIconRight: {
    marginRight: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  loader: {
    marginTop: 40,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  factoryCard: {
    backgroundColor: colors.surface,
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
  factoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  factoryInfo: {
    flex: 1,
  },
  factoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  factoryLocation: {
    fontSize: 12,
    color: colors.text.secondary,
    marginRight: 4,
  },
  availableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  availableText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
});
