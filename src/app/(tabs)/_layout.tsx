import React from 'react';
import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, useTheme } from '@/theme';
import { Icon, IconName } from '@/components/ui';

function TabIcon({ name, color, focused }: { name: IconName; color: any; focused: boolean }) {
  return <Icon name={(focused ? name : `${name}-outline`) as IconName} size={23} color={color} />;
}

export default function TabsLayout() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.brand,
      tabBarInactiveTintColor: c.muted,
      tabBarLabelPosition: 'below-icon',
      tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
      tabBarStyle: {
        backgroundColor: c.card, borderTopColor: c.line, height: 62 + insets.bottom, paddingTop: 6,
        paddingBottom: Platform.OS === 'web' ? 8 : insets.bottom + 4,
      },
      sceneStyle: { backgroundColor: c.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: p => <TabIcon name="home" {...p} /> }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats', tabBarIcon: p => <TabIcon name="chatbubbles" {...p} /> }} />
      <Tabs.Screen name="sell" options={{
        title: 'Sell',
        tabBarIcon: () => (
          <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginTop: -24, borderWidth: 4, borderColor: c.card }}>
            <Icon name="add" size={28} color="#fff" />
          </View>
        ),
      }} />
      <Tabs.Screen name="offers" options={{ title: 'Offers', tabBarIcon: p => <TabIcon name="pricetags" {...p} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: p => <TabIcon name="person-circle" {...p} /> }} />
    </Tabs>
  );
}
