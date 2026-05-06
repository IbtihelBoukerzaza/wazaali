import React, { useEffect } from 'react';
import { StatusBar, I18nManager } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';

// Force RTL for Arabic
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function App() {
  useEffect(() => {
    // Ensure RTL is applied
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, []);

  return (
    <AuthProvider>
      <AuthNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
