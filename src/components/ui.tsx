import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet,
  Text, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { display, font, useTheme } from '@/theme';
import { timeLeft } from '@/lib/format';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export const Icon = Ionicons;

type TxtVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'smallStrong' | 'tiny' | 'price';
const variants: Record<TxtVariant, TextStyle> = {
  display: { fontFamily: display.heavy, fontSize: 34, letterSpacing: -1.2, lineHeight: 36 },
  h1: { fontFamily: display.heavy, fontSize: 26, letterSpacing: -0.8, lineHeight: 30 },
  h2: { fontFamily: display.bold, fontSize: 20, letterSpacing: -0.4, lineHeight: 25 },
  h3: { fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: font.bold, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14 },
  price: { fontFamily: display.heavy, fontSize: 20, letterSpacing: -0.5 },
};

export function Txt({ v = 'body', color, muted, style, ...rest }: React.ComponentProps<typeof Text> & { v?: TxtVariant; color?: string; muted?: boolean }) {
  const { c } = useTheme();
  return <Text {...rest} style={[variants[v], { color: color ?? (muted ? c.muted : c.ink) }, style]} />;
}

type BtnKind = 'brand' | 'accent' | 'ghost' | 'danger' | 'dark' | 'soft';
export function Button({
  title, onPress, kind = 'brand', icon, size = 'md', disabled, loading, style, block,
}: {
  title: string; onPress?: () => void; kind?: BtnKind; icon?: IconName; size?: 'sm' | 'md' | 'lg';
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; block?: boolean;
}) {
  const { c } = useTheme();
  const palette: Record<BtnKind, { bg: string; fg: string; border?: string }> = {
    brand: { bg: c.brand, fg: '#fff' },
    accent: { bg: c.accent, fg: c.accentInk },
    ghost: { bg: 'transparent', fg: c.ink, border: c.line },
    danger: { bg: 'transparent', fg: c.danger, border: c.danger },
    dark: { bg: c.ink, fg: c.bg },
    soft: { bg: c.brandSoft, fg: c.brand },
  };
  const p = palette[kind];
  const h = size === 'sm' ? 36 : size === 'lg' ? 54 : 46;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: h, borderRadius: h / 2, paddingHorizontal: size === 'sm' ? 12 : 18,
          backgroundColor: p.bg, borderWidth: p.border ? 1.5 : 0, borderColor: p.border,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        block && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={p.fg} /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={p.fg} /> : null}
      <Text style={{ color: p.fg, fontFamily: font.bold, fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress, pad = 16 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; pad?: number }) {
  const { c, dark } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.card, borderRadius: 24, borderWidth: 0, padding: pad,
    ...(dark ? {} : shadow),
  };
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.92 : 1 }, style]}>{children}</Pressable>;
  }
  return <View style={[base, style]}>{children}</View>;
}

export const shadow: ViewStyle = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(20,23,31,.04), 0 8px 24px rgba(20,23,31,.06)' } as ViewStyle,
  default: { shadowColor: '#14171F', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
})!;

export function Input({ label, hint, error, left, style, ...rest }: TextInputProps & { label?: string; hint?: string; error?: string | null; left?: React.ReactNode }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="smallStrong">{label}</Txt> : null}
      <View style={{
        flexDirection: 'row', alignItems: rest.multiline ? 'flex-start' : 'center', gap: 8,
        backgroundColor: c.input, borderRadius: 18, paddingHorizontal: 16,
        borderWidth: 1.5, borderColor: error ? c.danger : focus ? c.brand : 'transparent',
      }}>
        {left}
        <TextInput
          placeholderTextColor={c.muted}
          onFocus={e => { setFocus(true); rest.onFocus?.(e); }}
          onBlur={e => { setFocus(false); rest.onBlur?.(e); }}
          {...rest}
          style={[{
            flex: 1, minHeight: rest.multiline ? 110 : 48, paddingVertical: rest.multiline ? 12 : 0,
            color: c.ink, fontFamily: font.medium, fontSize: 15, textAlignVertical: rest.multiline ? 'top' : 'center',
          }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any), style]}
        />
      </View>
      {error ? <Txt v="small" color={c.danger}>{error}</Txt> : hint ? <Txt v="small" muted>{hint}</Txt> : null}
    </View>
  );
}

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 99,
      backgroundColor: on ? c.ink : c.card, borderWidth: 1, borderColor: on ? c.ink : c.line,
    }}>
      {icon ? <Icon name={icon} size={15} color={on ? c.bg : c.ink} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? c.bg : c.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, tone = 'brand', icon, style }: { label: string; tone?: 'brand' | 'accent' | 'danger' | 'ok' | 'info' | 'muted' | 'hot'; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const map = {
    brand: [c.brandSoft, c.brand], accent: [c.accent, c.accentInk], danger: [c.dangerSoft, c.danger], hot: [c.hotSoft, c.hot],
    ok: [c.okSoft, c.ok], info: [c.infoSoft, c.info], muted: [c.input, c.muted],
  } as const;
  const [bg, fg] = (map as any)[tone] as [string, string];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start' }, style]}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: font.bold, fontSize: 11.5 }}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 40, uri }: { name?: string; size?: number; uri?: string | null }) {
  const { c } = useTheme();
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  const hue = [...(name || 'x')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 5;
  const bgs = [c.brand, '#2F6FED', '#D9443B', '#7C4DDB', '#F08A24'];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: bgs[hue], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 8 : 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Pressable key={n} disabled={!onChange} onPress={() => onChange?.(n)} hitSlop={6}>
          <Icon name={value >= n ? 'star' : value >= n - 0.5 ? 'star-half' : 'star-outline'} size={size} color="#F5B92E" />
        </Pressable>
      ))}
    </View>
  );
}

/** Live countdown text, re-renders every second. */
export function Countdown({ to, style }: { to: string; style?: StyleProp<TextStyle> }) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const { c } = useTheme();
  const ms = new Date(to).getTime() - Date.now();
  const urgent = ms > 0 && ms < 3600_000;
  return <Text style={[variants.tiny, { color: ms <= 0 ? c.muted : urgent ? c.danger : c.muted }, style]}>{timeLeft(to)}</Text>;
}

/** Page wrapper: safe area, scroll, and a comfortable max width on web/desktop. */
export function Screen({
  children, scroll = true, pad = 16, header, footer, refreshControl, maxWidth = 1100,
}: {
  children: React.ReactNode; scroll?: boolean; pad?: number; header?: React.ReactNode; footer?: React.ReactNode;
  refreshControl?: React.ReactElement<any>; maxWidth?: number;
}) {
  const { c } = useTheme();
  const inner = <View style={{ width: '100%', maxWidth, alignSelf: 'center', padding: pad, gap: 16 }}>{children}</View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
          {inner}
        </ScrollView>
      ) : <View style={{ flex: 1 }}>{inner}</View>}
      {footer}
    </KeyboardAvoidingView>
  );
}

export function TopBar({ title, right, back = true, transparent }: { title?: string; right?: React.ReactNode; back?: boolean; transparent?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      paddingTop: insets.top + 6, paddingBottom: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: transparent ? 'transparent' : c.bg, borderBottomWidth: 0,
    }}>
      {back ? (
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-back" size={22} color={c.ink} />
        </Pressable>
      ) : null}
      <Txt v="h1" style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
      {right}
    </View>
  );
}

export function IconBtn({ name, onPress, color, badge }: { name: IconName; onPress?: () => void; color?: string; badge?: number }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={20} color={color ?? c.ink} />
      {badge ? (
        <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontFamily: font.bold }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={32} color={c.brand} />
      </View>
      <Txt v="h3" style={{ textAlign: 'center' }}>{title}</Txt>
      {text ? <Txt muted style={{ textAlign: 'center', maxWidth: 340 }}>{text}</Txt> : null}
      {action}
    </View>
  );
}

export function Loading() {
  const { c } = useTheme();
  return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={c.brand} size="large" /></View>;
}

export function ErrorBox({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, backgroundColor: c.dangerSoft, borderRadius: 14, padding: 12, alignItems: 'center' }}>
      <Icon name="alert-circle" size={18} color={c.danger} />
      <Txt v="small" color={c.danger} style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.input, borderRadius: 14, padding: 4, gap: 4 }}>
      {options.map(o => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={{
            flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
            backgroundColor: on ? c.card : 'transparent', ...(on ? shadow : {}),
          }}>
            <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? c.ink : c.muted }}>{o.label}</Text>
            {o.count ? (
              <View style={{ backgroundColor: on ? c.brand : c.line, borderRadius: 99, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' }}>
                <Text style={{ fontFamily: font.bold, fontSize: 11, color: on ? '#fff' : c.muted }}>{o.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bottom sheet built on Modal; works on Android, iOS and web. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 16, maxHeight: '92%', width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', paddingTop: 10 }}><View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: c.line }} /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
            <Txt v="h2" style={{ flex: 1 }}>{title}</Txt>
            <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={24} color={c.muted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Row({ children, gap = 8, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />;
}

/** Cross-platform confirm (Alert on native, window.confirm on web). */
export function confirmAsk(title: string, msg: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${msg}`));
  const { Alert } = require('react-native');
  return new Promise(res => Alert.alert(title, msg, [
    { text: 'No', style: 'cancel', onPress: () => res(false) },
    { text: 'Yes', style: 'destructive', onPress: () => res(true) },
  ]));
}

export function toast(msg: string) {
  if (Platform.OS === 'android') {
    const { ToastAndroid } = require('react-native');
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    toastBus.forEach(cb => cb(msg));
  }
}
const toastBus = new Set<(m: string) => void>();
export function ToastHost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const cb = (m: string) => { setMsg(m); clearTimeout(t); t = setTimeout(() => setMsg(null), 2600); };
    toastBus.add(cb);
    return () => { toastBus.delete(cb); };
  }, []);
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 90, alignItems: 'center' }}>
      <View style={{ backgroundColor: c.ink, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, maxWidth: 420 }}>
        <Text style={{ color: c.bg, fontFamily: font.semibold }}>{msg}</Text>
      </View>
    </View>
  );
}
