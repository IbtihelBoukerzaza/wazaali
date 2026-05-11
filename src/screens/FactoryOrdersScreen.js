import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { getOrdersByDairy, updateOrderStatusWithNotification, subscribeToDairyOrders, subscribeToNotifications } from '../services/firestoreService';
import NotificationDropdown from '../components/NotificationDropdown';
import { useAuth } from '../context/AuthContext';

export default function FactoryOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Use real-time subscription
    const unsubscribe = subscribeToDairyOrders(user.uid, (ordersData) => {
      setOrders(ordersData);
      setLoading(false);
    });

    const unsubNotif = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubscribe();
      unsubNotif && unsubNotif();
    };
  }, [user]);

  const handleAcceptOrder = async (orderId, order) => {
    try {
      const result = await updateOrderStatusWithNotification(
        orderId, 'accepted', order.shopId, order.shopName, 'الملبنة'
      );
      if (result.success) {
        Alert.alert('نجاح', 'تم قبول الطلب بنجاح');
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('خطأ', 'فشل في قبول الطلب');
    }
  };

  const handleRejectOrder = async (orderId, order) => {
    Alert.alert(
      'تأكيد الرفض',
      'هل أنت متأكد من رفض هذا الطلب؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'رفض',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await updateOrderStatusWithNotification(
                orderId, 'rejected', order.shopId, order.shopName, 'الملبنة'
              );
              if (result.success) {
                Alert.alert('نجاح', 'تم رفض الطلب بنجاح');
              } else {
                Alert.alert('خطأ', result.error);
              }
            } catch (error) {
              console.error('Error rejecting order:', error);
              Alert.alert('خطأ', 'فشل في رفض الطلب');
            }
          }
        }
      ]
    );
  };

  const handleCompleteOrder = async (orderId, order) => {
    try {
      const result = await updateOrderStatusWithNotification(
        orderId, 'completed', order.shopId, order.shopName, 'الملبنة'
      );
      if (result.success) {
        Alert.alert('نجاح', 'تم إكمال الطلب بنجاح');
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      console.error('Error completing order:', error);
      Alert.alert('خطأ', 'فشل في إكمال الطلب');
    }
  };

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
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Calculate dashboard stats
  const totalOrdersThisMonth = orders.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  }).length;

  const deliveredCount = orders.filter(o => o.status === 'completed').length;
  const acceptedCount = orders.filter(o => o.status === 'accepted').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const rejectedCount = orders.filter(o => o.status === 'rejected').length;

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        <Text style={styles.headerTitle}>الطلبات الواردة</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dashboard Stats Header */}
        <View style={styles.statsHeader}>
          {/* Purple Gradient Card */}
          <View style={styles.mainStatsCard}>
            <View style={styles.mainStatsContent}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="bag" size={24} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.statLabel}>إجمالي الطلبات</Text>
                  <Text style={styles.statValue}>{totalOrdersThisMonth}</Text>
                  <Text style={styles.statSubtext}>هذا الشهر</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View>
                  <Text style={styles.statLabelLight}>طلبات اليوم</Text>
                  <Text style={styles.statValueLight}>{todayOrders}</Text>
                  <Text style={styles.statSubtextLight}>0% من أمس</Text>
                </View>
              </View>
            </View>
            <View style={styles.chartIconContainer}>
              <Ionicons name="trending-up" size={24} color="#FFFFFF" />
            </View>
          </View>

          {/* Status Cards Grid */}
          <View style={styles.statusGrid}>
            <View style={[styles.statusCard, styles.statusCardActive]}>
              <Text style={styles.statusCardNumber}>{deliveredCount}</Text>
              <View style={styles.statusCardIcon}>
                <Ionicons name="car" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statusCardLabel}>تم التوصيل</Text>
            </View>

            <View style={styles.statusCard}>
              <Text style={styles.statusCardNumber}>{acceptedCount}</Text>
              <View style={[styles.statusCardIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.statusCardLabel}>مقبولة</Text>
            </View>

            <View style={styles.statusCard}>
              <Text style={styles.statusCardNumber}>{pendingCount}</Text>
              <View style={[styles.statusCardIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="document-text" size={20} color="#2196F3" />
              </View>
              <Text style={styles.statusCardLabel}>طلبات جديدة</Text>
            </View>

            <View style={styles.statusCard}>
              <Text style={styles.statusCardNumber}>{rejectedCount}</Text>
              <View style={[styles.statusCardIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="close-circle" size={20} color="#F44336" />
              </View>
              <Text style={styles.statusCardLabel}>مرفوضة</Text>
            </View>
          </View>
        </View>

        {/* Recent Orders Section Header */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity>
            <Text style={styles.viewAllLink}>عرض الكل</Text>
          </TouchableOpacity>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>الطلبات الحديثة</Text>
            <Ionicons name="list" size={18} color={colors.text.secondary} style={{ marginLeft: 6 }} />
          </View>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color={colors.text.light} />
            <Text style={styles.emptyText}>لا توجد طلبات حتى الآن</Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => setSelectedOrder(order)}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>طلب #{order.id.slice(-6)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                </View>
              </View>
              <View style={styles.orderInfo}>
                <Ionicons name="storefront" size={16} color={colors.text.secondary} />
                <Text style={styles.shopName}>{order.shopName || 'محل'}</Text>
              </View>
              <View style={styles.orderFooter}>
                <Text style={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                </Text>
                <Text style={styles.orderTotal}>
                  {calculateTotal(order.items)} دج
                </Text>
              </View>

              {order.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAcceptOrder(order.id, order)}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>قبول</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleRejectOrder(order.id, order)}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>رفض</Text>
                  </TouchableOpacity>
                </View>
              )}

              {order.status === 'accepted' && (
                <TouchableOpacity
                  style={[styles.completeButton]}
                  onPress={() => handleCompleteOrder(order.id, order)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.completeButtonText}>إكمال الطلب</Text>
                </TouchableOpacity>
              )}
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
  content: {
    flex: 1,
    padding: 20,
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
    marginBottom: 12,
  },
  shopName: {
    fontSize: 14,
    color: colors.text.secondary,
    marginRight: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    gap: 8,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
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

  // Dashboard Stats Styles
  statsHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statSubtext: {
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
  statLabelLight: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statValueLight: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statSubtextLight: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
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
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  statusCardNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  statusCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusCardLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
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
