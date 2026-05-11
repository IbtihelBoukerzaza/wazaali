import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { subscribeToShopOrders, subscribeToNotifications } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    // Set loading to true when starting subscription
    setLoading(true);
    
    let hasReceivedOrders = false;
    let hasReceivedNotifs = false;
    
    const unsubOrders = subscribeToShopOrders(user.uid, (data) => {
      console.log('OrdersScreen - received orders:', data.length);
      setOrders(data);
      hasReceivedOrders = true;
      if (hasReceivedNotifs) {
        setLoading(false);
      }
    });
    
    const unsubNotifs = subscribeToNotifications(user.uid, (notifs) => {
      console.log('OrdersScreen - received notifications:', notifs.length);
      setNotifications(notifs);
      hasReceivedNotifs = true;
      if (hasReceivedOrders) {
        setLoading(false);
      }
    });
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('OrdersScreen - timeout, setting loading to false');
        setLoading(false);
        // Set empty arrays as fallback
        if (!hasReceivedOrders) setOrders([]);
        if (!hasReceivedNotifs) setNotifications([]);
      }
    }, 5000);
    
    return () => { 
      unsubOrders(); 
      unsubNotifs();
      clearTimeout(timeout);
    };
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'accepted':
        return colors.success;
      case 'rejected':
        return colors.error;
      case 'completed':
        return colors.primary;
      default:
        return colors.text.secondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'accepted':
        return 'مقبول';
      case 'rejected':
        return 'مرفوض';
      case 'completed':
        return 'تم التوصيل';
      default:
        return status;
    }
  };

  const calculateTotal = (items) => {
    return items?.reduce((total, item) => total + (item.price * item.quantity), 0) || 0;
  };

  const formatOrderTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return date.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' });
  };

  // Calculate order counts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  }).length;

  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    accepted: orders.filter(o => o.status === 'accepted').length,
    completed: orders.filter(o => o.status === 'completed').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
  };

  const filteredOrders = activeFilter === 'all' ? orders : orders.filter(o => o.status === activeFilter);
  const unreadCount = notifications.length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>طلباتي</Text>
          <NotificationDropdown
            notifications={notifications}
            userId={user?.uid}
          />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <NotificationDropdown
          notifications={notifications}
          userId={user?.uid}
        />
        <Text style={styles.headerTitle}>طلباتي</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Dashboard Stats Header */}
      <View style={styles.dashboardHeader}>
        {/* Purple Stats Card */}
        <View style={styles.mainStatsCard}>
          <View style={styles.mainStatsContent}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="bag" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.statLabelWhite}>إجمالي الطلبات</Text>
                <Text style={styles.statValueWhite}>{orders.length}</Text>
                <Text style={styles.statSubtextWhite}>هذا الشهر</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View>
                <Text style={styles.statLabelWhite}>طلبات اليوم</Text>
                <Text style={styles.statValueWhiteSmall}>{todayOrders}</Text>
              </View>
            </View>
          </View>
          <View style={styles.chartIconContainer}>
            <Ionicons name="trending-up" size={24} color="#FFFFFF" />
          </View>
        </View>

        {/* Status Cards Grid */}
        <View style={styles.statusGrid}>
          <TouchableOpacity
            style={[styles.statusCard, activeFilter === 'completed' && styles.statusCardActive]}
            onPress={() => setActiveFilter(activeFilter === 'completed' ? 'all' : 'completed')}
          >
            <View style={styles.statusCardTop}>
              <Text style={styles.statusCardNumber}>{orderCounts.completed}</Text>
              <View style={[styles.statusCardIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="car" size={20} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.statusCardLabel, { color: colors.primary }]}>تم التوصيل</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusCard, activeFilter === 'accepted' && styles.statusCardActiveAccepted]}
            onPress={() => setActiveFilter(activeFilter === 'accepted' ? 'all' : 'accepted')}
          >
            <View style={styles.statusCardTop}>
              <Text style={styles.statusCardNumber}>{orderCounts.accepted}</Text>
              <View style={[styles.statusCardIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              </View>
            </View>
            <Text style={[styles.statusCardLabel, { color: '#4CAF50' }]}>مقبولة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusCard, activeFilter === 'pending' && styles.statusCardActivePending]}
            onPress={() => setActiveFilter(activeFilter === 'pending' ? 'all' : 'pending')}
          >
            <View style={styles.statusCardTop}>
              <Text style={styles.statusCardNumber}>{orderCounts.pending}</Text>
              <View style={[styles.statusCardIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="document-text" size={20} color="#2196F3" />
              </View>
            </View>
            <Text style={[styles.statusCardLabel, { color: '#2196F3' }]}>طلبات جديدة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusCard, activeFilter === 'rejected' && styles.statusCardActiveRejected]}
            onPress={() => setActiveFilter(activeFilter === 'rejected' ? 'all' : 'rejected')}
          >
            <View style={styles.statusCardTop}>
              <Text style={styles.statusCardNumber}>{orderCounts.rejected}</Text>
              <View style={[styles.statusCardIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="close-circle" size={20} color="#FF9800" />
              </View>
            </View>
            <Text style={[styles.statusCardLabel, { color: '#FF9800' }]}>مرفوضة</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Orders Section Header */}
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={() => setActiveFilter('all')}>
          <Text style={styles.viewAllLink}>عرض الكل</Text>
        </TouchableOpacity>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>الطلبات الحديثة</Text>
          <Ionicons name="list" size={18} color={colors.text.secondary} style={{ marginLeft: 6 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={56} color={colors.text.light} />
            <Text style={styles.emptyText}>{activeFilter === 'all' ? 'لا توجد طلبات حتى الآن' : 'لا توجد طلبات بهذه الحالة'}</Text>
          </View>
        ) : (
          <>
            {filteredOrders.map((order) => (
              <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => setSelectedOrder(order)} activeOpacity={0.7}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>طلب #{order.id.slice(-6)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                  </View>
                </View>
                <View style={styles.orderInfo}>
                  <Ionicons name="business" size={16} color={colors.text.secondary} />
                  <Text style={styles.factoryName}>{order.dairyName || 'الملبنة'}</Text>
                </View>
                <Text style={styles.orderProducts} numberOfLines={1}>
                  {order.items?.map(i => `${i.name} ×${i.quantity}`).join('، ') || 'منتجات'}
                </Text>
                <View style={styles.orderFooter}>
                  <Text style={styles.orderDate}>{formatOrderTime(order.createdAt)}</Text>
                  <Text style={styles.orderTotal}>{calculateTotal(order.items)} دج</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>

      {/* Order Details Modal */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تفاصيل الطلب</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>رقم الطلب:</Text>
                  <Text style={styles.detailValue}>#{selectedOrder.id.slice(-6)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>الحالة:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(selectedOrder.status)}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>الملبنة:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.dairyName || 'الملبنة'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>التاريخ:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedOrder.createdAt).toLocaleDateString('ar-EG')}
                  </Text>
                </View>

                <Text style={styles.itemsTitle}>المنتجات:</Text>
                {selectedOrder.items?.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetails}>
                      {item.quantity} × {item.price} دج
                    </Text>
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>الإجمالي:</Text>
                  <Text style={styles.totalValue}>
                    {calculateTotal(selectedOrder.items)} دج
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterCountText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bottomSpacer: {
    height: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  factoryName: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  orderProducts: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderDate: {
    fontSize: 12,
    color: colors.text.light,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    fontSize: 14,
    color: colors.text.primary,
  },
  itemDetails: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },

  // Dashboard Styles
  dashboardHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  mainStatsCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  statLabelWhite: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  statValueWhite: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statValueWhiteSmall: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statSubtextWhite: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  chartIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Status Grid
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  statusCardActiveAccepted: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  statusCardActivePending: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  statusCardActiveRejected: {
    borderColor: '#FF9800',
    borderWidth: 2,
  },
  statusCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusCardNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'left',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
});
