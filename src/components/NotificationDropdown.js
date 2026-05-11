import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../services/firestoreService';

const { width } = Dimensions.get('window');

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

export default function NotificationDropdown({
  notifications,
  userId,
  onNotificationPress,
  onViewAllPress,
  bellColor = '#2563EB',
  badgeColor = colors.error,
}) {
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  const unreadCount = notifications.filter((n) => !n.read).length;
  
  // Always show notifications if they exist, regardless of read status
  const displayNotifications = notifications.length > 0 ? notifications : [];

  const openDropdown = useCallback(() => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const closeDropdown = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -10,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [fadeAnim, slideAnim]);

  const handleMarkAllRead = async () => {
    if (userId && unreadCount > 0) {
      await markAllNotificationsAsRead(userId);
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    closeDropdown();
    if (onNotificationPress) {
      onNotificationPress(notification);
    }
  };

  const handleViewAll = () => {
    closeDropdown();
    if (onViewAllPress) {
      onViewAllPress();
    }
  };

  return (
    <>
      {/* Bell Button with Badge */}
      <TouchableOpacity style={styles.bellButton} onPress={openDropdown} activeOpacity={0.7}>
        <Ionicons name="notifications-outline" size={24} color="#2563EB" />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={closeDropdown}
      >
        <Pressable style={styles.overlay} onPress={closeDropdown}>
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>الإشعارات</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead}>
                  <Text style={styles.markAllText}>قراءة الكل</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notifications List */}
            {displayNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.text.light} />
                <Text style={styles.emptyText}>لا توجد إشعارات بعد</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {displayNotifications.slice(0, 4).map((notification) => {
                  const { icon, color, bg } = getNotificationIcon(notification.type);
                  const isUnread = !notification.read;

                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        isUnread && styles.unreadItem,
                      ]}
                      onPress={() => handleNotificationPress(notification)}
                      activeOpacity={0.7}
                    >
                      {/* Icon */}
                      <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                        <Ionicons name={icon} size={20} color={color} />
                      </View>

                      {/* Content */}
                      <View style={styles.content}>
                        <Text style={styles.title} numberOfLines={1}>
                          {notification.title || 'Notification'}
                        </Text>
                        <Text style={styles.description} numberOfLines={2}>
                          {notification.body || notification.message || ''}
                        </Text>
                      </View>

                      {/* Right side: Time + Unread dot */}
                      <View style={styles.right}>
                        <Text style={styles.time}>{getTimeAgo(notification.createdAt)}</Text>
                        {isUnread && <View style={styles.unreadDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Footer */}
            {displayNotifications.length > 0 && (
              <TouchableOpacity style={styles.footer} onPress={handleViewAll}>
                <Ionicons name="expand-outline" size={16} color={colors.primary} />
                <Text style={styles.footerText}>عرض كل الإشعارات</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 110,
    right: 16,
    width: Math.min(360, width - 32),
    maxHeight: 480,
    backgroundColor: colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  markAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    maxHeight: 380,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#EBF5FF',
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  right: {
    alignItems: 'flex-end',
    minWidth: 50,
    flexShrink: 0,
  },
  time: {
    fontSize: 11,
    color: colors.text.light,
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.light,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
