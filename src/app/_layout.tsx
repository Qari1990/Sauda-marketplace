import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { ThemeProvider, useTheme } from '@/theme';
import { AppStateProvider } from '@/lib/app-state';
import { ToastHost } from '@/components/ui';

function Shell() {
  const { c, dark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <ToastHost />
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
    BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <Shell />
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
