import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { display, font, useTheme } from '@/theme';
import { Icon, IconName, shadow } from '@/components/ui';

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'compass', label: 'Explore' },
  chats: { icon: 'chatbubbles', label: 'Chats' },
  sell: { icon: 'add', label: 'Sell' },
  offers: { icon: 'pricetags', label: 'Offers' },
  account: { icon: 'person', label: 'Me' },
};

/** Floating dock instead of a classic tab bar. */
function Dock({ state, navigation }: any) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 12, alignItems: 'center' }}>
      <View style={[{
        flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.dock, borderRadius: 32, padding: 6,
        width: '92%', maxWidth: 440, justifyContent: 'space-between',
      }, shadow]}>
        {state.routes.map((r: any, i: number) => {
          const t = TABS[r.name];
          if (!t) return null;
          const on = state.index === i;
          const go = () => {
            const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
            if (!on && !e.defaultPrevented) navigation.navigate(r.name);
          };
          if (r.name === 'sell') {
            return (
              <Pressable key={r.key} onPress={go} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.accent, height: 48, paddingHorizontal: 16, borderRadius: 24 }}>
                <Icon name="add" size={22} color={c.accentInk} />
                <Text style={{ fontFamily: display.heavy, fontSize: 15, color: c.accentInk }}>Sell</Text>
              </Pressable>
            );
          }
          return (
            <Pressable key={r.key} onPress={go} style={{ flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? 'rgba(127,127,127,0.18)' : 'transparent' }}>
              <Icon name={(on ? t.icon : `${t.icon}-outline`) as IconName} size={20} color={c.dockInk} style={{ opacity: on ? 1 : 0.6 }} />
              <Text style={{ fontFamily: font.semibold, fontSize: 10, color: c.dockInk, opacity: on ? 1 : 0.6 }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs tabBar={props => <Dock {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="sell" />
      <Tabs.Screen name="offers" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
