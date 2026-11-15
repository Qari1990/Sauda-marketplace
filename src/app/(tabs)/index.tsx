import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { display, font, useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { CATEGORIES } from '@/lib/catalog';
import { DealMeter, ListingGrid, ListingPhoto, LiveTicker } from '@/components/listing';
import { Avatar, Icon, Loading, Row, Txt } from '@/components/ui';
import { rsShort, timeLeft } from '@/lib/format';
import type { Listing } from '@/lib/types';

function Section({ title, kicker, onMore, children }: { title: string; kicker?: string; onMore?: () => void; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          {kicker ? <Txt v="tiny" color={c.brand} style={{ letterSpacing: 1 }}>{kicker}</Txt> : null}
          <Txt v="h1">{title}</Txt>
        </View>
        {onMore ? (
          <Pressable onPress={onMore} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-forward" size={18} color={c.ink} />
          </Pressable>
        ) : null}
      </Row>
      {children}
    </View>
  );
}

/** Big horizontal card for "closing soon" and "almost a deal". */
function SpotlightCard({ l, mode }: { l: Listing; mode: 'closing' | 'close' }) {
  const { c } = useTheme();
  const pct = l.top_offer ? Math.round((l.top_offer / l.price) * 100) : 0;
  return (
    <Pressable onPress={() => router.push(`/listing/${l.id}`)} style={{ width: 290, backgroundColor: c.card, borderRadius: 28, padding: 8, gap: 10 }}>
      <View>
        <ListingPhoto listing={l} height={150} radius={22} />
        <View style={{ position: 'absolute', left: 10, bottom: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ backgroundColor: mode === 'closing' ? c.hot : c.accent, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Icon name={mode === 'closing' ? 'timer' : 'flame'} size={13} color={mode === 'closing' ? '#fff' : c.accentInk} />
            <Text style={{ fontFamily: font.bold, fontSize: 12, color: mode === 'closing' ? '#fff' : c.accentInk }}>
              {mode === 'closing' ? `Offer ends in ${timeLeft(l.next_expiry!).replace(' left', '')}` : `${pct}% of asking offered`}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: 8, paddingBottom: 8, gap: 8 }}>
        <Txt v="bodyStrong" numberOfLines={1}>{l.title}</Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt v="tiny" muted>ASKING</Txt>
            <Txt v="price">{rsShort(l.price)}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt v="tiny" muted>TOP OFFER</Txt>
            <Txt v="price" color={c.brand}>{l.top_offer ? rsShort(l.top_offer) : '-'}</Txt>
          </View>
        </Row>
        <DealMeter asking={l.price} top={l.top_offer} size="lg" />
      </View>
    </Pressable>
  );
}

export default function Home() {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { me, session } = useApp();
  const { data, loading, reload } = useLoad(() => backend.listListings({ sort: 'newest' }));
  const { data: feed } = useLoad(() => backend.liveFeed(16));
  const all = data ?? [];
  const now = Date.now();
  const closing = all.filter(l => l.next_expiry && new Date(l.next_expiry).getTime() - now < 24 * 3600_000 && l.status === 'active')
    .sort((a, b) => a.next_expiry!.localeCompare(b.next_expiry!));
  const nearDeal = all.filter(l => !closing.includes(l) && l.top_offer && l.top_offer / l.price >= 0.85 && l.status === 'active')
    .sort((a, b) => b.top_offer! / b.price - a.top_offer! / a.price);
  const liveOffers = all.reduce((a, l) => a + (l.offer_count ?? 0), 0);
  const wide = width >= 760;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 130 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={c.brand} />}>
      <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, gap: 26 }}>
        {/* header */}
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={2} style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: display.heavy, fontSize: 30, color: c.ink, letterSpacing: -1.5 }}>sauda</Text>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.brand, marginBottom: 8 }} />
          </Row>
          <Row gap={8}>
            <Pressable onPress={() => router.push('/how-it-works')} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="sparkles" size={15} color={c.brand} />
              <Txt v="smallStrong">How it works</Txt>
            </Pressable>
            <Pressable onPress={() => router.push(session ? '/account' : '/login')}>
              {session ? <Avatar name={me?.name || 'Me'} size={40} /> : (
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="person" size={18} color={c.bg} />
                </View>
              )}
            </Pressable>
          </Row>
        </Row>

        {/* headline + search */}
        <View style={{ gap: 16, flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'flex-end' : 'stretch' }}>
          <View style={{ flex: wide ? 1 : undefined }}>
            <Text style={{ fontFamily: display.heavy, fontSize: wide ? 56 : 40, lineHeight: wide ? 56 : 42, letterSpacing: -2, color: c.ink }}>
              Apni qeemat{'\n'}lagao.{' '}
              <Text style={{ color: c.brand }}>Sab ke{'\n'}saamne.</Text>
            </Text>
            <Txt muted style={{ marginTop: 10, maxWidth: 440 }}>
              Every offer is public with a timer. Numbers are shared only when both of you say yes.
            </Txt>
          </View>
          <View style={{ flex: wide ? 1 : undefined, gap: 10 }}>
            <Pressable onPress={() => router.push('/search')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderRadius: 30, height: 60, paddingLeft: 20, paddingRight: 6 }}>
              <Icon name="search" size={20} color={c.ink} />
              <Txt muted style={{ flex: 1 }}>iPhone, CD 70, sofa...</Txt>
              <View style={{ height: 48, paddingHorizontal: 18, borderRadius: 24, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Txt v="smallStrong" color="#fff">Search</Txt>
              </View>
            </Pressable>
            <Row gap={8}>
              {[
                [String(liveOffers), 'live offers', c.brand],
                [String(closing.length), 'closing today', c.hot],
                [String(all.length), 'active ads', c.ink],
              ].map(([n, label, col]) => (
                <View key={label} style={{ flex: 1, backgroundColor: c.card, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14 }}>
                  <Text style={{ fontFamily: display.heavy, fontSize: 24, color: col, letterSpacing: -0.5 }}>{n}</Text>
                  <Txt v="tiny" muted>{label}</Txt>
                </View>
              ))}
            </Row>
          </View>
        </View>

        {feed?.length ? <LiveTicker items={feed} /> : null}

        {backend.mode === 'demo' ? (
          <Row gap={8} style={{ backgroundColor: c.accentSoft, borderRadius: 16, padding: 10 }}>
            <Icon name="flask" size={15} color={dark ? c.accent : c.ink} />
            <Txt v="tiny" color={dark ? c.accent : c.ink} style={{ flex: 1 }}>Demo: sample ads, other people are simulated. Login code 123456.</Txt>
          </Row>
        ) : null}

        {/* categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }} style={{ marginHorizontal: -16, paddingLeft: 16 }}>
          {CATEGORIES.map(cat => (
            <Pressable key={cat.id} onPress={() => router.push({ pathname: '/search', params: { category: cat.id } })}
              style={{ width: 116, height: 112, borderRadius: 26, overflow: 'hidden' }}>
              <LinearGradient colors={cat.tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={cat.icon as any} size={20} color="#fff" />
                </View>
                <Text numberOfLines={1} style={{ fontFamily: display.bold, fontSize: 15, color: '#fff' }}>{cat.label}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

        {loading && !data ? <Loading /> : null}

        {closing.length ? (
          <Section kicker="HURRY" title="Offers closing soon" onMore={() => router.push('/search')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {closing.map(l => <SpotlightCard key={l.id} l={l} mode="closing" />)}
            </ScrollView>
          </Section>
        ) : null}

        {nearDeal.length ? (
          <Section kicker="HOT" title="Almost a deal" onMore={() => router.push({ pathname: '/search', params: { sort: 'most_offers' } })}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {nearDeal.map(l => <SpotlightCard key={l.id} l={l} mode="close" />)}
            </ScrollView>
          </Section>
        ) : null}

        {all.length ? (
          <Section kicker="NEW" title="Fresh on Sauda" onMore={() => router.push('/search')}>
            <ListingGrid items={all} />
          </Section>
        ) : null}
      </View>
    </ScrollView>
  );
}
