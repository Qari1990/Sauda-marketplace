import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { isOpen } from '@/lib/rules';
import { ago, rs, rsShort } from '@/lib/format';
import type { Deal, Offer } from '@/lib/types';
import { ListingPhoto } from '@/components/listing';
import { CounterSheet, OfferCountdown, StatusPill, useOfferActions } from '@/components/offers';
import { Button, Card, Empty, Icon, Loading, Pill, Row, Screen, Segmented, TopBar, Txt, confirmAsk } from '@/components/ui';

type Tab = 'received' | 'sent' | 'deals';

export default function Offers() {
  const { session } = useApp();
  const [tab, setTab] = useState<Tab>('received');
  const recv = useLoad(async () => (session ? backend.myOffersReceived() : []), [session?.userId]);
  const sent = useLoad(async () => (session ? backend.myOffersSent() : []), [session?.userId]);
  const deals = useLoad(async () => (session ? backend.myDeals() : []), [session?.userId]);
  const reloadAll = () => { recv.reload(); sent.reload(); deals.reload(); };

  if (!session) {
    return (
      <Screen header={<TopBar title="Offers & deals" back={false} />}>
        <Empty icon="pricetags" title="Your offers live here" text="Log in to send offers, respond to buyers and track your deals."
          action={<Button title="Log in" onPress={() => router.push('/login')} style={{ marginTop: 8 }} />} />
      </Screen>
    );
  }
  const openRecv = (recv.data ?? []).filter(isOpen).length;
  const openSent = (sent.data ?? []).filter(o => isOpen(o) && o.status === 'countered').length;
  const activeDeals = (deals.data ?? []).filter(d => d.status === 'agreed').length;

  return (
    <Screen header={<TopBar title="Offers & deals" back={false} />} maxWidth={760}>
      <Segmented value={tab} onChange={setTab} options={[
        { id: 'received', label: 'Received', count: openRecv },
        { id: 'sent', label: 'Sent', count: openSent },
        { id: 'deals', label: 'Deals', count: activeDeals },
      ]} />
      {tab === 'received' ? <OfferList data={recv.data} loading={recv.loading} role="seller" onChange={reloadAll} /> : null}
      {tab === 'sent' ? <OfferList data={sent.data} loading={sent.loading} role="buyer" onChange={reloadAll} /> : null}
      {tab === 'deals' ? <DealList data={deals.data} loading={deals.loading} /> : null}
    </Screen>
  );
}

function OfferList({ data, loading, role, onChange }: { data?: Offer[]; loading: boolean; role: 'seller' | 'buyer'; onChange: () => void }) {
  const { c } = useTheme();
  const { busy, run } = useOfferActions(onChange);
  const [counter, setCounter] = useState<Offer | null>(null);
  if (loading && !data) return <Loading />;
  if (!data?.length) {
    return role === 'seller'
      ? <Empty icon="file-tray" title="No offers yet" text="When buyers send offers on your ads, they appear here with a timer." />
      : <Empty icon="paper-plane" title="You haven't sent offers" text="Find something you like and offer your price." action={<Button title="Browse ads" onPress={() => router.push('/search')} style={{ marginTop: 8 }} />} />;
  }
  const sorted = [...data].sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)));
  return (
    <View style={{ gap: 12 }}>
      {sorted.map(o => {
        const open = isOpen(o) && o.listing?.status === 'active';
        return (
          <Card key={o.id} pad={12} style={{ gap: 12 }} onPress={() => router.push(`/listing/${o.listing_id}`)}>
            <Row gap={12} style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 64 }}>{o.listing ? <ListingPhoto listing={o.listing} height={64} radius={14} /> : null}</View>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt v="smallStrong" numberOfLines={1}>{o.listing?.title}</Txt>
                <Txt v="tiny" muted>Asking {rsShort(o.listing?.price ?? 0)} · {ago(o.created_at)}{role === 'seller' && o.buyer ? ` · ${o.buyer.name || 'Buyer'} (${o.buyer.deals_completed} deals)` : ''}</Txt>
                <Row gap={8} style={{ marginTop: 2 }}>
                  <StatusPill status={o.status} expires_at={o.expires_at} />
                  <OfferCountdown status={o.status} expires_at={o.expires_at} />
                </Row>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt v="h3">{rsShort(o.amount)}</Txt>
                {o.counter_amount ? <Txt v="tiny" color={c.hot}>counter {rsShort(o.counter_amount)}</Txt> : null}
              </View>
            </Row>
            {o.message ? <Txt v="small" muted style={{ fontStyle: 'italic' }}>"{o.message}"</Txt> : null}
            {open && role === 'seller' ? (
              <Row gap={8}>
                <Button size="sm" icon="checkmark" title={o.status === 'countered' ? `Accept ${rsShort(o.counter_amount ?? 0)}` : 'Accept'} style={{ flex: 1 }} loading={busy === `a${o.id}`}
                  onPress={async () => {
                    if (await confirmAsk('Accept this offer?', `You agree to sell for ${rs(o.status === 'countered' ? o.counter_amount : o.amount)}. Both numbers will be shared.`)) {
                      run(`a${o.id}`, () => backend.respondOffer(o.id, 'accept'));
                    }
                  }} />
                {o.status === 'pending' ? <Button size="sm" kind="soft" title="Counter" style={{ flex: 1 }} onPress={() => setCounter(o)} /> : null}
                <Button size="sm" kind="ghost" title="Decline" loading={busy === `r${o.id}`} onPress={() => run(`r${o.id}`, () => backend.respondOffer(o.id, 'reject'))} />
              </Row>
            ) : null}
            {open && role === 'buyer' ? (
              <Row gap={8}>
                {o.status === 'countered' ? (
                  <Button size="sm" icon="checkmark" title={`Accept ${rsShort(o.counter_amount ?? 0)}`} style={{ flex: 1 }} loading={busy === `ac${o.id}`}
                    onPress={() => run(`ac${o.id}`, () => backend.respondOffer(o.id, 'accept_counter'))} />
                ) : <Txt v="small" muted style={{ flex: 1 }}>Waiting for seller</Txt>}
                <Button size="sm" kind="ghost" title="Withdraw" loading={busy === `w${o.id}`} onPress={() => run(`w${o.id}`, () => backend.withdrawOffer(o.id))} />
              </Row>
            ) : null}
          </Card>
        );
      })}
      {counter ? (
        <CounterSheet visible offerId={counter.id} amount={counter.amount} asking={counter.listing?.price ?? counter.amount} onClose={() => setCounter(null)} onDone={onChange} />
      ) : null}
    </View>
  );
}

function DealList({ data, loading }: { data?: Deal[]; loading: boolean }) {
  const { c } = useTheme();
  const { session } = useApp();
  if (loading && !data) return <Loading />;
  if (!data?.length) return <Empty icon="hand-left" title="No deals yet" text="When a seller accepts your offer (or you accept one), the deal shows here with the contact number." />;
  return (
    <View style={{ gap: 12 }}>
      {data.map(d => {
        const iAmSeller = d.seller_id === session?.userId;
        const other = iAmSeller ? d.buyer : d.seller;
        const tone = d.status === 'agreed' ? 'ok' : d.status === 'completed' ? 'brand' : 'danger';
        return (
          <Pressable key={d.id} onPress={() => router.push(`/deal/${d.id}`)}>
            <Card pad={12} style={{ gap: 10 }}>
              <Row gap={12}>
                <View style={{ width: 64 }}>{d.listing ? <ListingPhoto listing={d.listing} height={64} radius={14} /> : null}</View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt v="smallStrong" numberOfLines={1}>{d.listing?.title}</Txt>
                  <Txt v="tiny" muted>{iAmSeller ? 'Selling to' : 'Buying from'} {other?.name || 'user'} · {ago(d.created_at)}</Txt>
                  <Pill label={d.status === 'agreed' ? 'Agreed · numbers shared' : d.status === 'completed' ? 'Completed' : 'Cancelled'} tone={tone as any} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Txt v="h3">{rsShort(d.price)}</Txt>
                  <Icon name="chevron-forward" size={18} color={c.muted} />
                </View>
              </Row>
              {d.status === 'completed' && !d.my_review_done ? (
                <Row gap={6}><Icon name="star" size={14} color={c.gold} /><Txt v="small" color={c.brand}>Rate {other?.name || 'them'} to help others</Txt></Row>
              ) : null}
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}
