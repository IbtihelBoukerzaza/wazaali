import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { subscribeToShopOrders, subscribeToNotifications, markAllNotificationsAsRead } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

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
      setNotifications(notifs.filter(n => !n.read));
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
        return 'مكتمل';
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

  const filterOptions = [
    { id: 'all', label: 'الكل', count: orders.length },
    { id: 'pending', label: 'قيد الانتظار', count: orders.filter(o => o.status === 'pending').length },
    { id: 'accepted', label: 'مقبول', count: orders.filter(o => o.status === 'accepted').length },
    { id: 'completed', label: 'مكتمل', count: orders.filter(o => o.status === 'completed').length },
    { id: 'rejected', label: 'مرفوض', count: orders.filter(o => o.status === 'rejected').length },
  ];

  const filteredOrders = activeFilter === 'all' ? orders : orders.filter(o => o.status === activeFilter);
  const unreadCount = notifications.length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>طلباتي</Text>
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
        <Text style={styles.headerTitle}>طلباتي</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.refreshButton} onPress={() => {
            setLoading(true);
            // Force re-subscription by toggling user dependency
            const tempUser = user;
            if (tempUser) {
              subscribeToShopOrders(tempUser.uid, (data) => {
                setOrders(data);
                setLoading(false);
              });
              subscribeToNotifications(tempUser.uid, (notifs) => {
                setNotifications(notifs.filter(n => !n.read));
              });
            }
          }}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.notifBadge} onPress={async () => {
              try {
                await markAllNotificationsAsRead(user.uid);
                setNotifications([]);
              } catch (error) {
                console.error('Error marking notifications as read:', error);
              }
            }}>
              <Ionicons name="notifications" size={16} color="#FFFFFF" />
              <Text style={styles.notifBadgeText}>{unreadCount}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
        {filterOptions.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[styles.filterPill, activeFilter === filter.id && styles.filterPillActive]}
            onPress={() => setActiveFilter(filter.id)}
          >
            <Text style={[styles.filterPillText, activeFilter === filter.id && styles.filterPillTextActive]}>{filter.label}</Text>
            <View style={[styles.filterCount, activeFilter === filter.id && styles.filterCountActive]}>
              <Text style={[styles.filterCountText, activeFilter === filter.id && styles.filterCountTextActive]}>{filter.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={56} color={colors.text.light} />
            <Text style={styles.emptyText}>{activeFilter === 'all' ? 'لا توجد طلبات حتى الآن' : 'لا توجد طلبات بهذه الحالة'}</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
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
          ))
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  notifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
});
