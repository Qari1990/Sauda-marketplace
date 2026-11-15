import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useLoad } from '@/lib/app-state';
import { ago, memberSince } from '@/lib/format';
import { ListingGrid, TrustLine } from '@/components/listing';
import { Avatar, Card, Divider, Empty, Icon, Loading, Row, Screen, Stars, TopBar, Txt } from '@/components/ui';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { data: p, loading } = useLoad(() => backend.getProfile(id), [id]);
  const { data: ads } = useLoad(() => backend.listListings({ sellerId: id }), [id]);
  const { data: reviews } = useLoad(() => backend.getReviews(id), [id]);

  if (loading && !p) return <Screen header={<TopBar title="Profile" />}><Loading /></Screen>;
  if (!p) return <Screen header={<TopBar title="Profile" />}><Empty icon="person" title="User not found" /></Screen>;
  const lastSeen = p.show_last_seen && p.last_seen_at ? `Active ${ago(p.last_seen_at)}` : null;

  return (
    <Screen header={<TopBar title="Trust profile" />}>
      <Card style={{ gap: 14 }}>
        <Row gap={14}>
          <Avatar name={p.name} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h2">{p.name || 'Sauda user'}</Txt>
            <Txt v="small" muted>{p.city} · since {memberSince(p.created_at)}{lastSeen ? ` · ${lastSeen}` : ''}</Txt>
          </View>
        </Row>
        <TrustLine p={p} />
        <Row gap={10}>
          {[
            ['Completed deals', String(p.deals_completed), c.brand],
            ['Rating', p.rating_avg ? `${p.rating_avg}★` : '-', c.gold],
            ['Backed out', String(p.backouts), p.backouts ? c.danger : c.muted],
          ].map(([k, v, col]) => (
            <View key={k} style={{ flex: 1, backgroundColor: c.input, borderRadius: 14, padding: 10, alignItems: 'center' }}>
              <Txt v="h2" color={col}>{v}</Txt>
              <Txt v="tiny" muted style={{ textAlign: 'center' }}>{k}</Txt>
            </View>
          ))}
        </Row>
        <Row gap={6} style={{ alignItems: 'flex-start' }}>
          <Icon name="information-circle-outline" size={14} color={c.muted} />
          <Txt v="tiny" muted style={{ flex: 1 }}>Ratings can only be left after a completed deal on Sauda, so they can't be faked. Back-outs are counted when someone cancels after agreeing.</Txt>
        </Row>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt v="h3">Reviews ({reviews?.length ?? 0})</Txt>
        {!reviews?.length ? <Txt v="small" muted>No reviews yet.</Txt> : reviews.map((r, i) => (
          <View key={r.id} style={{ gap: 4 }}>
            {i ? <Divider /> : null}
            <Row style={{ justifyContent: 'space-between', paddingTop: i ? 8 : 0 }}>
              <Row gap={8}><Avatar name={r.reviewer?.name} size={28} /><Txt v="smallStrong">{r.reviewer?.name || 'Buyer'}</Txt></Row>
              <Txt v="tiny" muted>{ago(r.created_at)}</Txt>
            </Row>
            <Stars value={r.stars} />
            {r.text ? <Txt v="small">{r.text}</Txt> : null}
          </View>
        ))}
      </Card>

      <Txt v="h2">Ads ({ads?.length ?? 0})</Txt>
      {ads?.length ? <ListingGrid items={ads} /> : <Txt muted>No active ads.</Txt>}
    </Screen>
  );
}
