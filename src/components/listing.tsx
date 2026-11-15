import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme, font } from '@/theme';
import { catOf } from '@/lib/catalog';
import { ago, rsShort } from '@/lib/format';
import { useApp } from '@/lib/app-state';
import type { Listing, Profile } from '@/lib/types';
import { Icon, Pill, Row, Stars, Txt, shadow } from './ui';

export function ListingPhoto({ listing, height, radius = 16, index = 0 }: { listing: Pick<Listing, 'photos' | 'category'>; height: number; radius?: number; index?: number }) {
  const uri = listing.photos[index];
  if (uri) return <Image source={{ uri }} style={{ width: '100%', height, borderRadius: radius }} contentFit="cover" transition={150} />;
  const cat = catOf(listing.category);
  return (
    <LinearGradient colors={cat.tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: '100%', height, borderRadius: radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Icon name={cat.icon as any} size={height * 0.36} color="rgba(255,255,255,0.92)" />
      <Icon name={cat.icon as any} size={height * 0.9} color="rgba(255,255,255,0.08)" style={{ position: 'absolute', right: -height * 0.18, bottom: -height * 0.2, transform: [{ rotate: '-14deg' }] }} />
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

export function ListingCard({ l }: { l: Listing }) {
  const { c, dark } = useTheme();
  const { saved, toggleSaved } = useApp();
  const isSaved = saved.has(l.id);
  const featured = !!l.featured_until && l.featured_until > new Date().toISOString();
  return (
    <Pressable onPress={() => router.push(`/listing/${l.id}`)}
      style={({ pressed }) => [{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: featured ? c.accent : c.line, padding: 8, opacity: pressed ? 0.9 : 1 }, !dark && shadow]}>
      <View>
        <ListingPhoto listing={l} height={128} radius={14} />
        <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 }}>
          {featured ? <Pill label="Featured" icon="flash" tone="accent" /> : null}
          {l.status === 'reserved' ? <Pill label="Deal in progress" tone="info" /> : null}
          {l.status === 'sold' ? <Pill label="Sold" tone="muted" /> : null}
        </View>
        <Pressable onPress={() => toggleSaved(l.id)} hitSlop={8}
          style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={isSaved ? 'heart' : 'heart-outline'} size={18} color={isSaved ? '#D9443B' : '#121620'} />
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 4, paddingTop: 10, paddingBottom: 4, gap: 3 }}>
        <Txt v="price">{rsShort(l.price)}</Txt>
        <Txt v="small" numberOfLines={1} style={{ fontFamily: font.semibold }}>{l.title}</Txt>
        {l.offer_count ? (
          <Row gap={5} style={{ marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.ok }} />
            <Txt v="tiny" color={c.ok}>{l.offer_count} live offer{l.offer_count > 1 ? 's' : ''} · top {rsShort(l.top_offer ?? 0)}</Txt>
          </Row>
        ) : (
          <Txt v="tiny" muted style={{ marginTop: 2 }}>No offers yet, be first</Txt>
        )}
        <Row gap={4} style={{ marginTop: 2 }}>
          <Icon name="location-outline" size={12} color={c.muted} />
          <Txt v="tiny" muted numberOfLines={1} style={{ flex: 1 }}>{l.city} · {ago(l.created_at)}</Txt>
        </Row>
      </View>
    </Pressable>
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
