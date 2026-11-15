import React from 'react';
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { CATEGORIES } from '@/lib/catalog';
import { ListingCard, ListingGrid } from '@/components/listing';
import { Icon, Loading, Row, Txt, shadow } from '@/components/ui';

export default function Home() {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { me, session } = useApp();
  const { data, loading, reload } = useLoad(() => backend.listListings({ sort: 'newest' }));
  const featured = (data ?? []).filter(l => l.featured_until && l.featured_until > new Date().toISOString());
  const hot = [...(data ?? [])].filter(l => (l.offer_count ?? 0) > 0).sort((a, b) => (b.offer_count ?? 0) - (a.offer_count ?? 0)).slice(0, 8);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={c.brand} />}>
      <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 16, paddingTop: insets.top + 10, gap: 18 }}>
        {/* header */}
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={10}>
            <LinearGradient colors={[c.brand, '#18A88A']} style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="h2" color="#fff" style={{ fontFamily: font.heavy }}>S</Txt>
            </LinearGradient>
            <View>
              <Txt v="h1" style={{ lineHeight: 26 }}>Sauda</Txt>
              <Txt v="tiny" muted>Khula sauda, saaf deal</Txt>
            </View>
          </Row>
          <Pressable onPress={() => router.push(session ? '/account' : '/login')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 99, paddingHorizontal: 12, height: 38 }}>
            <Icon name="location" size={15} color={c.brand} />
            <Txt v="smallStrong">{me?.city || 'Pakistan'}</Txt>
          </Pressable>
        </Row>

        {backend.mode === 'demo' ? (
          <View style={{ backgroundColor: c.accentSoft, borderRadius: 14, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="flask" size={16} color={dark ? c.accent : '#8A5A00'} />
            <Txt v="small" color={dark ? c.accent : '#8A5A00'} style={{ flex: 1 }}>Demo mode: sample ads, other people are simulated. Login code is 123456.</Txt>
          </View>
        ) : null}

        {/* search */}
        <Pressable onPress={() => router.push('/search')}
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderRadius: 16, height: 52, paddingHorizontal: 16, borderWidth: 1, borderColor: c.line }, !dark && shadow]}>
          <Icon name="search" size={20} color={c.muted} />
          <Txt muted style={{ flex: 1 }}>Search mobiles, bikes, cars...</Txt>
          <View style={{ backgroundColor: c.brandSoft, borderRadius: 10, padding: 6 }}><Icon name="options" size={16} color={c.brand} /></View>
        </Pressable>

        {/* hero */}
        <LinearGradient colors={['#0E7C66', '#0A5446']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 26, padding: 22, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -40, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,176,32,0.28)' }} />
          <Icon name="pricetags" size={130} color="rgba(255,255,255,0.08)" style={{ position: 'absolute', right: -10, bottom: -30, transform: [{ rotate: '-12deg' }] }} />
          <Txt v="display" color="#fff" style={{ maxWidth: 420 }}>Apni qeemat lagao.{'\n'}Sab ke saamne.</Txt>
          <Txt color="rgba(255,255,255,0.88)" style={{ marginTop: 8, maxWidth: 460 }}>
            Every offer is public and time-limited. Numbers are shared only when buyer and seller both agree.
          </Txt>
          <Row gap={8} style={{ flexWrap: 'wrap', marginTop: 14 }}>
            {[['eye', 'Open offer board'], ['timer', 'Offers expire'], ['lock-closed', 'Number private'], ['star', 'Real-deal ratings']].map(([i, t]) => (
              <Row key={t} gap={5} style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Icon name={i as any} size={13} color="#fff" />
                <Txt v="tiny" color="#fff">{t}</Txt>
              </Row>
            ))}
          </Row>
          <Pressable onPress={() => router.push('/how-it-works')} style={{ marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Txt v="smallStrong" color={c.accent}>How Sauda works</Txt>
            <Icon name="arrow-forward" size={14} color={c.accent} />
          </Pressable>
        </LinearGradient>

        {/* categories */}
        <View style={{ gap: 10 }}>
          <Txt v="h2">Categories</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
            {CATEGORIES.map(cat => (
              <Pressable key={cat.id} onPress={() => router.push({ pathname: '/search', params: { category: cat.id } })}
                style={{ width: width >= 720 ? '10%' : '20%', padding: 4, alignItems: 'center', gap: 6 }}>
                <LinearGradient colors={cat.tint} style={{ width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={cat.icon as any} size={25} color="#fff" />
                </LinearGradient>
                <Txt v="tiny" numberOfLines={1}>{cat.label}</Txt>
              </Pressable>
            ))}
          </View>
        </View>

        {loading && !data ? <Loading /> : null}

        {featured.length ? (
          <View style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6}><Icon name="flash" size={18} color={c.accent} /><Txt v="h2">Featured</Txt></Row>
            </Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {featured.map(l => <View key={l.id} style={{ width: 200 }}><ListingCard l={l} /></View>)}
            </ScrollView>
          </View>
        ) : null}

        {hot.length ? (
          <View style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6}><Icon name="flame" size={18} color={c.danger} /><Txt v="h2">Most offers right now</Txt></Row>
              <Pressable onPress={() => router.push({ pathname: '/search', params: { sort: 'most_offers' } })}><Txt v="smallStrong" color={c.brand}>See all</Txt></Pressable>
            </Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {hot.map(l => <View key={l.id} style={{ width: 200 }}><ListingCard l={l} /></View>)}
            </ScrollView>
          </View>
        ) : null}

        {data?.length ? (
          <View style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Txt v="h2">Fresh recommendations</Txt>
              <Pressable onPress={() => router.push('/search')}><Txt v="smallStrong" color={c.brand}>See all</Txt></Pressable>
            </Row>
            <ListingGrid items={data} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
