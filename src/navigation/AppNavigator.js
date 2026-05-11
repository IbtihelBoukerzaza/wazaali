import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import ChatBot from '../components/ChatBot';

import HomeScreen from '../screens/HomeScreen';
import FactoriesScreen from '../screens/FactoriesScreen';
import MapScreen from '../screens/MapScreen';
import AccountScreen from '../screens/AccountScreen';
import AdminScreen from '../screens/AdminScreen';
import OrdersScreen from '../screens/OrdersScreen';
import DairyOwnerScreen from '../screens/DairyOwnerScreen';
import ProductsScreen from '../screens/ProductsScreen';
import DairyDetailsScreen from '../screens/DairyDetailsScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Per-tab Stack Navigators — keeps tab bar visible when pushing detail screens
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="DairyDetails" component={DairyDetailsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

function FactoriesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FactoriesScreen" component={FactoriesScreen} />
      <Stack.Screen name="DairyDetails" component={DairyDetailsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapScreen" component={MapScreen} />
      <Stack.Screen name="DairyDetails" component={DairyDetailsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersScreen" component={OrdersScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

function AccountStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountScreen" component={AccountScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

// Shop Owner Tab Navigator — now each tab is a Stack, so tab bar persists
function ShopOwnerNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'الرئيسية') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'الملابن') {
              iconName = focused ? 'business' : 'business-outline';
            } else if (route.name === 'الخريطة') {
              iconName = focused ? 'map' : 'map-outline';
            } else if (route.name === 'طلباتي') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (route.name === 'حسابي') {
              iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.text.light,
          headerShown: false,
          tabBarStyle: {
            paddingBottom: 10 + insets.bottom,
            paddingTop: 8,
            height: 64 + insets.bottom,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
        })}
      >
        <Tab.Screen name="الرئيسية" component={HomeStack} />
        <Tab.Screen name="الملابن" component={FactoriesStack} />
        <Tab.Screen name="الخريطة" component={MapStack} />
        <Tab.Screen name="طلباتي" component={OrdersStack} />
        <Tab.Screen name="حسابي" component={AccountStack} />
      </Tab.Navigator>
      <ChatBot />
    </>
  );
}

// Dairy Owner Navigator
function DairyOwnerNavigator() {
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DairyOwnerMain" component={DairyOwnerScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
      <ChatBot />
    </>
  );
}

// Admin Navigator
function AdminNavigator() {
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminDashboard" component={AdminScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
      <ChatBot />
    </>
  );
}

export default function AppNavigator() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (userRole === 'admin') {
    return <AdminNavigator />;
  }

  if (userRole === 'dairy_owner') {
    return <DairyOwnerNavigator />;
  }

  if (userRole === 'shop_owner') {
    return <ShopOwnerNavigator />;
  }

  // Default to shop owner navigator for now
  return <ShopOwnerNavigator />;
}
