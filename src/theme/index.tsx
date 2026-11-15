import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const light = {
  bg: '#F5F4EF', card: '#FFFFFF', ink: '#121620', muted: '#6B7280', line: '#E6E3DC', input: '#F0EEE8',
  brand: '#0E7C66', brandDeep: '#0A5446', brandSoft: '#E3F2ED', accent: '#FFB020', accentInk: '#4A3000',
  accentSoft: '#FFF3D6', danger: '#D9443B', dangerSoft: '#FCE8E6', ok: '#1F9D55', okSoft: '#E2F5EA',
  info: '#2F6FED', infoSoft: '#E6EEFD', overlay: 'rgba(10,14,20,0.45)',
};
const dark: typeof light = {
  bg: '#0E1115', card: '#171B21', ink: '#EEF0F3', muted: '#9AA3AF', line: '#262C34', input: '#1E232B',
  brand: '#2BB596', brandDeep: '#1E9A7E', brandSoft: '#13302A', accent: '#FFB020', accentInk: '#2B1C00',
  accentSoft: '#3A2D10', danger: '#F06A60', dangerSoft: '#3A1A18', ok: '#3CC47A', okSoft: '#142E20',
  info: '#6F9BFF', infoSoft: '#18233D', overlay: 'rgba(0,0,0,0.6)',
};
export type Colors = typeof light;

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  heavy: 'PlusJakartaSans_800ExtraBold',
};

type Pref = 'system' | 'light' | 'dark';
interface ThemeCtx { c: Colors; dark: boolean; pref: Pref; setPref: (p: Pref) => void }
const Ctx = createContext<ThemeCtx>({ c: light, dark: false, pref: 'system', setPref: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const [pref, setPrefState] = useState<Pref>('system');
  useEffect(() => {
    AsyncStorage.getItem('sauda.theme').then(v => { if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v); });
  }, []);
  const setPref = (p: Pref) => { setPrefState(p); AsyncStorage.setItem('sauda.theme', p); };
  const isDark = pref === 'system' ? sys === 'dark' : pref === 'dark';
  const value = useMemo(() => ({ c: isDark ? dark : light, dark: isDark, pref, setPref }), [isDark, pref]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
