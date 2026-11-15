import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const light = {
  bg: '#F3F0EA', card: '#FFFFFF', ink: '#16131D', muted: '#6E6979', line: '#E6E1D8', input: '#EDE9E1',
  brand: '#4F2FE0', brandDeep: '#2E1A99', brandSoft: '#ECE8FF', accent: '#D4F53C', accentInk: '#16131D',
  accentSoft: '#F3FCD0', hot: '#FF5A36', hotSoft: '#FFE8E1', gold: '#E2A100',
  danger: '#E5484D', dangerSoft: '#FDE8E8', ok: '#14A06A', okSoft: '#DDF6EA',
  info: '#2F6FED', infoSoft: '#E6EEFD', overlay: 'rgba(14,10,24,0.5)', dock: '#16131D', dockInk: '#FFFFFF',
};
const dark: typeof light = {
  bg: '#0C0A11', card: '#16131E', ink: '#F2F0F7', muted: '#9A95A6', line: '#262230', input: '#1F1B29',
  brand: '#8C74FF', brandDeep: '#6B52F0', brandSoft: '#221B3D', accent: '#D4F53C', accentInk: '#16131D',
  accentSoft: '#2A3311', hot: '#FF7552', hotSoft: '#3A1B14', gold: '#F5B92E',
  danger: '#F2686C', dangerSoft: '#3A1A1C', ok: '#3CCB8A', okSoft: '#13301F',
  info: '#6F9BFF', infoSoft: '#18233D', overlay: 'rgba(0,0,0,0.65)', dock: '#F2F0F7', dockInk: '#16131D',
};
export type Colors = typeof light;

export const display = {
  bold: 'BricolageGrotesque_700Bold',
  heavy: 'BricolageGrotesque_800ExtraBold',
  semibold: 'BricolageGrotesque_600SemiBold',
};

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
    AsyncStorage.getItem('sauda.theme').then(v => { if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v); }).catch(() => {});
  }, []);
  const setPref = (p: Pref) => { setPrefState(p); AsyncStorage.setItem('sauda.theme', p).catch(() => {}); };
  const isDark = pref === 'system' ? sys === 'dark' : pref === 'dark';
  const value = useMemo(() => ({ c: isDark ? dark : light, dark: isDark, pref, setPref }), [isDark, pref]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
