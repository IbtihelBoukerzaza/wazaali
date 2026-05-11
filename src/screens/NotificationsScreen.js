import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { auth } from '../config/firebase';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/firestoreService';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'new_order': return { icon: 'cart-outline', color: colors.primary, bg: colors.primaryLight };
    case 'order_accepted': return { icon: 'checkmark-circle-outline', color: colors.success, bg: '#ECFDF5' };
    case 'order_rejected': return { icon: 'close-circle-outline', color: colors.error, bg: colors.errorLight };
    case 'order_completed': return { icon: 'checkmark-done-circle-outline', color: colors.success, bg: '#ECFDF5' };
    case 'payment': return { icon: 'card-outline', color: colors.purple, bg: colors.purpleLight };
    case 'offer': return { icon: 'pricetag-outline', color: colors.pink, bg: colors.pinkLight };
    case 'delivery': return { icon: 'car-outline', color: colors.info, bg: colors.infoLight };
    case 'invoice': return { icon: 'document-text-outline', color: colors.accent, bg: colors.accentLight };
    case 'low_stock': return { icon: 'alert-circle-outline', color: colors.warning, bg: colors.accentLight };
    case 'new_inscription': return { icon: 'person-add-outline', color: colors.primary, bg: colors.primaryLight };
    case 'account_status': return { icon: 'shield-checkmark-outline', color: colors.success, bg: '#ECFDF5' };
    default: return { icon: 'notifications-outline', color: colors.primary, bg: colors.primaryLight };
  }
};

const getTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return date.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' });
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = subscribeToNotifications(auth.currentUser.uid, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsub && unsub();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Subscription already handles real-time updates
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleMarkAllRead = async () => {
    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount === 0) return;
    Alert.alert(
      'تحديد الكل كمقروء',
      `هل تريد تحديد ${unreadCount} إشعار كمقروء؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم',
          onPress: async () => {
            await markAllNotificationsAsRead(auth.currentUser.uid);
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = ({ item }) => {
    const { icon, color, bg } = getNotificationIcon(item.type);
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
            {item.title || 'إشعار'}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {item.body || item.message || ''}
          </Text>
          <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
        </View>

        <View style={styles.rightSide}>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإشعارات</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
            <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
            <Text style={styles.markAllText}>قراءة الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            الكل ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
            غير مقروء ({unreadCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'read' && styles.activeFilterTab]}
          onPress={() => setFilter('read')}
        >
          <Text style={[styles.filterText, filter === 'read' && styles.activeFilterText]}>
            مقروء ({notifications.length - unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={filter === 'unread' ? 'checkmark-done-circle-outline' : 'notifications-off-outline'}
            size={64}
            color={colors.text.light}
          />
          <Text style={styles.emptyTitle}>
            {filter === 'unread' ? 'جميع الإشعارات مقروءة' : 'لا توجد إشعارات'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'ستظهر الإشعارات هنا عند استلامها'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  markAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  activeFilterTab: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#EBF5FF',
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 3,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#1E40AF',
  },
  description: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: colors.text.light,
  },
  rightSide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    flexShrink: 0,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.light,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
