import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { getPendingUsers, updateUserApproval, getAllUsers, getApprovedUsers, getRejectedUsers, getAllOrders } from '../services/firestoreService';
import { auth, db } from '../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function AdminScreen() {
  const navigation = useNavigation();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [rejectedUsers, setRejectedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    rejectedUsers: 0,
    totalOrders: 0,
    shopOwners: 0,
    factoryOwners: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadAdminName = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setAdminName(data.name || '');
        }
      }
    } catch (error) {
      console.error('Error loading admin name:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      loadAdminName();
      const [pending, approved, rejected, all, orders] = await Promise.all([
        getPendingUsers(),
        getApprovedUsers(),
        getRejectedUsers(),
        getAllUsers(),
        getAllOrders(),
      ]);
      
      setPendingUsers(pending);
      setApprovedUsers(approved);
      setRejectedUsers(rejected);
      setAllUsers(all);
      setAllOrders(orders);
      
      setStats({
        totalUsers: all.length,
        pendingUsers: pending.length,
        approvedUsers: approved.length,
        rejectedUsers: rejected.length,
        totalOrders: orders.length,
        shopOwners: all.filter(u => u.role === 'shop_owner').length,
        factoryOwners: all.filter(u => u.role === 'dairy_owner').length,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const result = await updateUserApproval(userId, true);
      if (result.success) {
        Alert.alert('نجاح', 'تمت الموافقة على الحساب بنجاح');
        loadData();
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('Error approving user:', error);
      Alert.alert('خطأ', 'فشل في الموافقة على الحساب');
    }
  };

  const handleReject = async (userId) => {
    Alert.alert(
      'تأكيد الرفض',
      'هل أنت متأكد من رفض هذا الحساب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'رفض',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await updateUserApproval(userId, false);
              if (result.success) {
                Alert.alert('نجاح', 'تم رفض الحساب بنجاح');
                loadData();
              } else {
                Alert.alert('خطأ', result.error);
              }
            } catch (error) {
              console.error('Error rejecting user:', error);
              Alert.alert('خطأ', 'فشل في رفض الحساب');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const getFilteredUsers = () => {
    switch (activeTab) {
      case 'pending':
        return pendingUsers;
      case 'approved':
        return approvedUsers;
      case 'rejected':
        return rejectedUsers;
      default:
        return pendingUsers;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredUsers = getFilteredUsers();

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'pending': return 'time-outline';
      case 'approved': return 'checkmark-circle-outline';
      case 'rejected': return 'close-circle-outline';
      default: return 'time-outline';
    }
  };

  const getStatusColor = () => {
    switch (activeTab) {
      case 'pending': return colors.warning;
      case 'approved': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.warning;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerRight}>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerGreeting}>مرحباً بك</Text>
              <Text style={styles.headerTitle}>{adminName || 'المسؤول'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Overview Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>نظرة عامة</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
            <View style={styles.statTop}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
            </View>
            <Text style={styles.statLabel}>إجمالي المستخدمين</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.warning }]}>
            <View style={styles.statTop}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="time" size={20} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{stats.pendingUsers}</Text>
            </View>
            <Text style={styles.statLabel}>قيد المراجعة</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
            <View style={styles.statTop}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.secondaryLight }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{stats.approvedUsers}</Text>
            </View>
            <Text style={styles.statLabel}>مقبولين</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.accent }]}>
            <View style={styles.statTop}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="cube" size={20} color={colors.accent} />
              </View>
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
            </View>
            <Text style={styles.statLabel}>إجمالي الطلبات</Text>
          </View>
        </View>

        {/* Role Breakdown Card */}
        <View style={styles.roleCard}>
          <Text style={styles.roleCardTitle}>توزيع الأدوار</Text>
          <View style={styles.roleRow}>
            <View style={styles.roleItem}>
              <View style={[styles.roleIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="storefront" size={22} color={colors.primary} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleCount}>{stats.shopOwners}</Text>
                <Text style={styles.roleLabel}>أصحاب المحلات</Text>
              </View>
            </View>
            <View style={styles.roleDivider} />
            <View style={styles.roleItem}>
              <View style={[styles.roleIconBox, { backgroundColor: colors.secondaryLight }]}>
                <Ionicons name="cube" size={22} color={colors.secondary} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleCount}>{stats.factoryOwners}</Text>
                <Text style={styles.roleLabel}>أصحاب الملبن</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Request Tabs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>طلبات التسجيل</Text>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.pendingTab]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={getTabIcon('pending')} 
              size={18} 
              color={activeTab === 'pending' ? '#FFFFFF' : colors.warning} 
            />
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              قيد المراجعة
            </Text>
            <View style={[styles.tabBadge, activeTab === 'pending' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === 'pending' && styles.activeTabBadgeText]}>
                {stats.pendingUsers}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'approved' && styles.approvedTab]}
            onPress={() => setActiveTab('approved')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={getTabIcon('approved')} 
              size={18} 
              color={activeTab === 'approved' ? '#FFFFFF' : colors.success} 
            />
            <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
              مقبولين
            </Text>
            <View style={[styles.tabBadge, { backgroundColor: colors.secondaryLight }, activeTab === 'approved' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, { color: colors.success }, activeTab === 'approved' && styles.activeTabBadgeText]}>
                {stats.approvedUsers}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'rejected' && styles.rejectedTab]}
            onPress={() => setActiveTab('rejected')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={getTabIcon('rejected')} 
              size={18} 
              color={activeTab === 'rejected' ? '#FFFFFF' : colors.error} 
            />
            <Text style={[styles.tabText, activeTab === 'rejected' && styles.activeTabText]}>
              مرفوضين
            </Text>
            <View style={[styles.tabBadge, { backgroundColor: colors.errorLight }, activeTab === 'rejected' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, { color: colors.error }, activeTab === 'rejected' && styles.activeTabBadgeText]}>
                {stats.rejectedUsers}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: getStatusColor() + '15' }]}>
              <Ionicons 
                name={activeTab === 'pending' ? 'hourglass-outline' : activeTab === 'approved' ? 'checkmark-done-circle-outline' : 'ban-outline'} 
                size={48} 
                color={getStatusColor()} 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? 'لا توجد طلبات' : 
               activeTab === 'approved' ? 'لا توجد حسابات مقبولة' : 
               'لا توجد حسابات مرفوضة'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'pending' ? 'جميع الطلبات تمت معالجتها' : 
               activeTab === 'approved' ? 'لم يتم قبول أي حساب بعد' : 
               'لم يتم رفض أي حساب بعد'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userCardInner}>
                <View style={styles.userMainInfo}>
                  <View style={[
                    styles.avatar, 
                    activeTab === 'approved' && { backgroundColor: colors.secondaryLight },
                    activeTab === 'rejected' && { backgroundColor: colors.errorLight }
                  ]}>
                    <Ionicons 
                      name="person" 
                      size={28} 
                      color={
                        activeTab === 'approved' ? colors.success : 
                        activeTab === 'rejected' ? colors.error : 
                        colors.primary
                      } 
                    />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <View style={styles.userMeta}>
                      <Ionicons name="call-outline" size={14} color={colors.text.light} />
                      <Text style={styles.userPhone}>{user.phone}</Text>
                    </View>
                    {user.businessName ? (
                      <View style={styles.userMeta}>
                        <Ionicons name={user.role === 'dairy_owner' ? "cube-outline" : "storefront-outline"} size={14} color={colors.text.light} />
                        <Text style={styles.userPhone}>{user.businessName}</Text>
                      </View>
                    ) : null}
                    {user.wilaya ? (
                      <View style={styles.userMeta}>
                        <Ionicons name="location-outline" size={14} color={colors.text.light} />
                        <Text style={styles.userPhone}>{user.wilaya}</Text>
                      </View>
                    ) : null}
                    {user.email ? (
                      <View style={styles.userMeta}>
                        <Ionicons name="mail-outline" size={14} color={colors.text.light} />
                        <Text style={styles.userPhone}>{user.email}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[
                    styles.statusBadge,
                    activeTab === 'pending' && styles.pendingBadge,
                    activeTab === 'approved' && styles.approvedBadge,
                    activeTab === 'rejected' && styles.rejectedBadge,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      activeTab === 'pending' && styles.pendingText,
                      activeTab === 'approved' && styles.approvedText,
                      activeTab === 'rejected' && styles.rejectedText,
                    ]}>
                      {user.role === 'dairy_owner' ? 'ملبنة' : 'محل'}
                    </Text>
                  </View>
                </View>

                {activeTab === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApprove(user.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>موافقة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleReject(user.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>رفض</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeTab === 'approved' && (
                  <View style={styles.approvedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.approvedText}>تمت الموافقة</Text>
                  </View>
                )}

                {activeTab === 'rejected' && (
                  <View style={styles.rejectedRow}>
                    <Ionicons name="close-circle" size={16} color={colors.error} />
                    <Text style={styles.rejectedLabel}>تم الرفض</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 30 }} />
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
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    width: (width - 52) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  roleCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  roleLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  roleDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    
  },
  pendingTab: {
    backgroundColor: colors.warning,
  },
  approvedTab: {
    backgroundColor: colors.success,
  },
  rejectedTab: {
    backgroundColor: colors.error,
  },
  tabText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.accentLight,
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.warning,
  },
  activeTabBadgeText: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    marginTop: 10,

    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  userCardInner: {
    padding: 16,
  },
  userMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: colors.accentLight,
  },
  approvedBadge: {
    backgroundColor: colors.secondaryLight,
  },
  rejectedBadge: {
    backgroundColor: colors.errorLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pendingText: {
    color: colors.warning,
  },
  approvedText: {
    color: colors.success,
  },
  rejectedText: {
    color: colors.error,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.success,
    gap: 6,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.error,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  approvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  approvedText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  rejectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  rejectedLabel: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
});
