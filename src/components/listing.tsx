import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { display, font, useTheme } from '@/theme';
import { catOf } from '@/lib/catalog';
import { ago, rsShort, timeLeft } from '@/lib/format';
import { useApp } from '@/lib/app-state';
import type { FeedItem, Listing, Profile } from '@/lib/types';
import { Icon, Pill, Row, Stars, Txt } from './ui';

export function ListingPhoto({ listing, height, radius = 16, index = 0 }: { listing: Pick<Listing, 'photos' | 'category'>; height: number; radius?: number; index?: number }) {
  const uri = listing.photos[index];
  if (uri) return <Image source={{ uri }} style={{ width: '100%', height, borderRadius: radius }} contentFit="cover" transition={150} />;
  const cat = catOf(listing.category);
  return (
    <LinearGradient colors={cat.tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: '100%', height, borderRadius: radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', width: height * 1.1, height: height * 1.1, borderRadius: height, borderWidth: height * 0.12, borderColor: 'rgba(255,255,255,0.08)', right: -height * 0.45, top: -height * 0.35 }} />
      <Icon name={cat.icon as any} size={height * 0.34} color="rgba(255,255,255,0.95)" />
    </LinearGradient>
  );
}

export function useGridColumns() {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 1100);
  return w >= 1000 ? 4 : w >= 720 ? 3 : 2;
}

export function ListingGrid({ items }: { items: Listing[] }) {
  const cols = useGridColumns();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
      {items.map(l => (
        <View key={l.id} style={{ width: `${100 / cols}%`, padding: 6 }}>
          <ListingCard l={l} />
        </View>
      ))}
    </View>
  );
}

/**
 * The "deal meter": how close the best live offer is to the asking price.
 * This is Sauda's signature element, shown on cards and on the ad page.
 */
export function DealMeter({ asking, top, size = 'sm' }: { asking: number; top: number | null | undefined; size?: 'sm' | 'lg' }) {
  const { c } = useTheme();
  const pct = top ? Math.min(1, top / asking) : 0;
  const h = size === 'lg' ? 14 : 6;
  return (
    <View style={{ gap: size === 'lg' ? 8 : 5 }}>
      <View style={{ height: h, borderRadius: h, backgroundColor: c.input, overflow: 'hidden' }}>
        {top ? (
          <LinearGradient colors={[c.brand, pct >= 0.9 ? '#14A06A' : c.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ width: `${Math.max(6, pct * 100)}%`, height: '100%', borderRadius: h }} />
        ) : null}
      </View>
      {size === 'sm' ? (
        <Txt v="tiny" muted numberOfLines={1}>
          {top ? <Text style={{ color: pct >= 0.9 ? c.ok : c.brand, fontFamily: font.bold }}>Top offer {Math.round(pct * 100)}%</Text> : 'No offers yet, be first'}
        </Txt>
      ) : null}
    </View>
  );
}

export function ListingCard({ l, wide }: { l: Listing; wide?: boolean }) {
  const { c } = useTheme();
  const { saved, toggleSaved } = useApp();
  const isSaved = saved.has(l.id);
  const featured = !!l.featured_until && l.featured_until > new Date().toISOString();
  const closingMs = l.next_expiry ? new Date(l.next_expiry).getTime() - Date.now() : Infinity;
  return (
    <Pressable onPress={() => router.push(`/listing/${l.id}`)}
      style={({ pressed }) => ({ backgroundColor: c.card, borderRadius: 26, padding: 6, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View>
        <ListingPhoto listing={l} height={wide ? 170 : 140} radius={21} />
        <View style={{ position: 'absolute', top: 8, left: 8, right: 48, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
          {l.status === 'reserved' ? <Pill label="Deal in progress" tone="info" />
            : l.status === 'sold' ? <Pill label="Sold" tone="muted" />
              : closingMs < 6 * 3600_000 ? <Pill label={timeLeft(l.next_expiry!).replace(' left', '')} icon="timer" tone="hot" />
                : featured ? <Pill label="Featured" icon="flash" tone="accent" /> : null}
        </View>
        <Pressable onPress={() => toggleSaved(l.id)} hitSlop={8}
          style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={isSaved ? 'heart' : 'heart-outline'} size={18} color={isSaved ? '#E5484D' : '#16131D'} />
        </Pressable>
        {l.offer_count ? (
          <View style={{ position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(22,19,29,0.86)', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
            <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 11 }}>{l.offer_count} live offer{l.offer_count > 1 ? 's' : ''}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8, gap: 6 }}>
        <Txt v="price" numberOfLines={1}>{rsShort(l.price)}</Txt>
        <Txt v="small" numberOfLines={1} style={{ fontFamily: font.semibold, marginTop: -4 }}>{l.title}</Txt>
        <Txt v="tiny" muted numberOfLines={1} style={{ marginTop: -4 }}>{l.city} · {ago(l.created_at)}</Txt>
        <DealMeter asking={l.price} top={l.top_offer} />
      </View>
    </Pressable>
  );
}

/** Auto-scrolling strip of the latest offers across Sauda. */
export function LiveTicker({ items }: { items: FeedItem[] }) {
  const { c } = useTheme();
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const anim = Animated.loop(Animated.timing(x, { toValue: -w, duration: w * 28, easing: Easing.linear, useNativeDriver: true }));
    anim.start();
    return () => anim.stop();
  }, [w, x]);
  if (!items.length) return null;
  const row = (key: string, measure: boolean) => (
    <View key={key} style={{ flexDirection: 'row' }} onLayout={measure ? e => setW(e.nativeEvent.layout.width) : undefined}>
      {items.map(it => (
        <Pressable key={key + it.id} onPress={() => router.push(`/listing/${it.listing_id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: c.accent, fontFamily: display.bold, fontSize: 14 }}>{rsShort(it.amount)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: font.medium, fontSize: 13 }} numberOfLines={1}>
            on {it.title.length > 26 ? it.title.slice(0, 25) + '…' : it.title}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: font.semibold, fontSize: 12 }}>{Math.round((it.amount / it.asking) * 100)}% · {ago(it.created_at)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 8 }}>/</Text>
        </Pressable>
      ))}
    </View>
  );
  return (
    <View style={{ backgroundColor: '#16131D', borderRadius: 20, height: 46, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accent, height: '100%', paddingHorizontal: 12, zIndex: 2 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#E5484D' }} />
        <Text style={{ fontFamily: display.heavy, fontSize: 13, color: '#16131D', letterSpacing: 0.5 }}>LIVE</Text>
      </View>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
          {row('a', true)}
          {row('b', false)}
        </Animated.View>
      </View>
    </View>
  );
}

/** Compact trust summary shown wherever a person appears. */
export function TrustLine({ p }: { p: Profile }) {
  const { c } = useTheme();
  return (
    <Row gap={6} style={{ flexWrap: 'wrap' }}>
      {p.phone_verified ? <Pill label="Phone verified" icon="checkmark-circle" tone="ok" /> : null}
      {p.cnic_verified ? <Pill label="ID verified" icon="shield-checkmark" tone="info" /> : null}
      {p.rating_count ? (
        <Row gap={4}><Stars value={p.rating_avg ?? 0} size={12} /><Txt v="tiny" muted>{p.rating_avg} ({p.rating_count})</Txt></Row>
      ) : <Txt v="tiny" muted>No ratings yet</Txt>}
      <Txt v="tiny" muted>· {p.deals_completed} deals</Txt>
      {p.backouts ? <Txt v="tiny" color={c.danger}>· {p.backouts} backed out</Txt> : null}
    </Row>
  );
}
