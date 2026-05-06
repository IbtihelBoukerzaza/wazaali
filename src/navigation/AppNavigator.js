import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';

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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Shop Owner Tab Navigator
function ShopOwnerTabs() {
  return (
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
      })}
    >
      <Tab.Screen name="الرئيسية" component={HomeScreen} />
      <Tab.Screen name="الملابن" component={FactoriesScreen} />
      <Tab.Screen name="الخريطة" component={MapScreen} />
      <Tab.Screen name="طلباتي" component={OrdersScreen} />
      <Tab.Screen name="حسابي" component={AccountScreen} />
    </Tab.Navigator>
  );
}

// Shop Owner Stack Navigator (wraps tabs + detail screens)
function ShopOwnerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainApp" component={ShopOwnerTabs} />
      <Stack.Screen name="DairyDetails" component={DairyDetailsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

// Dairy Owner Navigator
function DairyOwnerNavigator() {
  return <DairyOwnerScreen />;
}

// Admin Navigator
function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminScreen} />
    </Stack.Navigator>
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
