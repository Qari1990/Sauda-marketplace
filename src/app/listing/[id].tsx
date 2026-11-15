import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { catOf, conditionLabel } from '@/lib/catalog';
import { ago, rs, rsShort } from '@/lib/format';
import { isOpen } from '@/lib/rules';
import type { PublicOffer } from '@/lib/types';
import { ListingPhoto, TrustLine } from '@/components/listing';
import { CounterSheet, MakeOfferSheet, OfferCountdown, PriceCheck, StatusPill, useOfferActions } from '@/components/offers';
import {
  Avatar, Button, Card, Divider, Empty, Icon, IconBtn, Input, Loading, Pill, Row, Sheet, Txt, confirmAsk, shadow, toast,
} from '@/components/ui';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, saved, toggleSaved, requireLogin, refresh } = useApp();
  const { data: l, loading, reload } = useLoad(() => backend.getListing(id), [id]);
  const { data: board, reload: reloadBoard } = useLoad(() => backend.getOfferBoard(id), [id]);
  const { data: insight } = useLoad(async () => (l ? backend.priceInsight(l.category, l.title, l.id) : null), [l?.id]);
  const [offerOpen, setOfferOpen] = useState(false);
  const [counterFor, setCounterFor] = useState<PublicOffer | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [photo, setPhoto] = useState(0);
  const after = () => { reload(); reloadBoard(); refresh(); };
  const { busy, run } = useOfferActions(after);

  useEffect(() => { if (id) backend.recordView(id); }, [id]);

  if (loading && !l) return <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}><Loading /></View>;
  if (!l) return <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}><Empty icon="alert-circle" title="Ad not found" text="It may have been removed." /></View>;

  const mine = session?.userId === l.seller_id;
  const myOffer = board?.find(o => o.is_mine && isOpen(o));
  const live = (board ?? []).filter(isOpen);
  const closed = (board ?? []).filter(o => !isOpen(o));
  const wide = width >= 900;
  const photoW = Math.min(width, wide ? 640 : width);
  const photoCount = Math.max(1, l.photos.length);

  async function share() {
    const msg = `${l!.title} for ${rs(l!.price)} on Sauda`;
    if (Platform.OS === 'web') {
      try { await (navigator as any).share?.({ title: 'Sauda', text: msg, url: location.href }) ?? navigator.clipboard.writeText(location.href); toast('Link copied'); } catch {}
    } else Share.share({ message: msg });
  }

  const offerBox = (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="tiny" muted>ASKING PRICE</Txt>
          <Txt v="h1">{rs(l.price)}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Txt v="tiny" muted>HIGHEST LIVE OFFER</Txt>
          <Txt v="h2" color={live.length ? c.ok : c.muted}>{live.length ? rsShort(Math.max(...live.map(o => o.amount))) : 'None yet'}</Txt>
        </View>
      </Row>
      {l.status === 'reserved' ? (
        <Row gap={8} style={{ backgroundColor: c.infoSoft, padding: 12, borderRadius: 14 }}>
          <Icon name="hand-left" size={18} color={c.info} />
          <Txt v="small" color={c.info} style={{ flex: 1 }}>A deal is in progress on this ad. If it falls through, offers open again.</Txt>
        </Row>
      ) : l.status === 'sold' ? (
        <Pill label="Sold through Sauda" tone="muted" icon="checkmark-done" />
      ) : mine ? (
        <Txt v="small" muted>This is your ad. Respond to offers below before they expire.</Txt>
      ) : myOffer ? (
        <View style={{ gap: 10, backgroundColor: c.brandSoft, borderRadius: 14, padding: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="smallStrong" color={c.brand}>Your offer: {rs(myOffer.amount)}</Txt>
            <OfferCountdown expires_at={myOffer.expires_at} status={myOffer.status} />
          </Row>
          {myOffer.status === 'countered' ? (
            <>
              <Txt v="small">Seller countered with <Txt v="smallStrong">{rs(myOffer.counter_amount)}</Txt>. Accept to close the deal.</Txt>
              <Row gap={8}>
                <Button title={`Accept ${rsShort(myOffer.counter_amount ?? 0)}`} style={{ flex: 1 }} loading={busy === 'ac'}
                  onPress={() => run('ac', () => backend.respondOffer(myOffer.id, 'accept_counter'))} />
                <Button title="Withdraw" kind="ghost" loading={busy === 'wd'} onPress={() => run('wd', () => backend.withdrawOffer(myOffer.id))} />
              </Row>
            </>
          ) : (
            <Row gap={8}>
              <Txt v="small" muted style={{ flex: 1 }}>Waiting for the seller to respond.</Txt>
              <Button title="Withdraw" kind="ghost" size="sm" loading={busy === 'wd'} onPress={() => run('wd', () => backend.withdrawOffer(myOffer.id))} />
            </Row>
          )}
        </View>
      ) : (
        <Button title="Make an offer" icon="pricetag" size="lg" onPress={() => requireLogin() && setOfferOpen(true)} />
      )}
      {!mine ? (
        <Button title="Chat with seller" kind="ghost" icon="chatbubble-ellipses-outline" onPress={async () => {
          if (!requireLogin()) return;
          try {
            const conv = await backend.openConversation(l.id);
            router.push(`/chat/${conv.id}`);
          } catch (e: any) { toast(e.message); }
        }} />
      ) : (
        <Row gap={8}>
          {l.status === 'active' || l.status === 'paused' ? (
            <Button style={{ flex: 1 }} kind="ghost" icon={l.status === 'paused' ? 'play' : 'pause'} title={l.status === 'paused' ? 'Resume ad' : 'Pause ad'}
              onPress={() => run('st', () => backend.updateListingStatus(l.id, l.status === 'paused' ? 'active' : 'paused'))} />
          ) : null}
          {l.status !== 'sold' && l.status !== 'reserved' ? (
            <Button style={{ flex: 1 }} kind="ghost" icon="checkmark-done" title="Sold elsewhere" onPress={async () => {
              if (await confirmAsk('Mark as sold?', 'The ad will close and open offers will end.')) run('sold', () => backend.updateListingStatus(l.id, 'sold'));
            }} />
          ) : null}
        </Row>
      )}
    </Card>
  );

  const boardCard = (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}><Icon name="eye" size={17} color={c.brand} /><Txt v="h3">Open offer board</Txt></Row>
        <Pill label={`${live.length} live`} tone={live.length ? 'ok' : 'muted'} />
      </Row>
      <Txt v="small" muted>Every offer on this ad is shown here, so everyone sees the real demand. Buyer names stay hidden until a deal.</Txt>
      {!board?.length ? <Txt v="small" muted style={{ paddingVertical: 8 }}>No offers yet. Be the first.</Txt> : null}
      {[...live, ...closed].map((o, i) => (
        <View key={o.id} style={{ gap: 8 }}>
          {i ? <Divider /> : null}
          <Row gap={10}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: o.is_mine ? c.brand : c.input, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="person" size={17} color={o.is_mine ? '#fff' : c.muted} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Row gap={6}>
                <Txt v="smallStrong">{o.is_mine ? 'You' : o.buyer_label}</Txt>
                {o.buyer_verified ? <Icon name="shield-checkmark" size={13} color={c.info} /> : null}
                <Txt v="tiny" muted>{o.buyer_deals} deals · {ago(o.created_at)}</Txt>
              </Row>
              <Row gap={8}>
                <StatusPill status={o.status} expires_at={o.expires_at} />
                <OfferCountdown expires_at={o.expires_at} status={o.status} />
              </Row>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt v="h3" color={isOpen(o) ? c.ink : c.muted} style={!isOpen(o) ? { textDecorationLine: 'line-through' } : undefined}>{rsShort(o.amount)}</Txt>
              {o.counter_amount ? <Txt v="tiny" color={c.accent}>counter {rsShort(o.counter_amount)}</Txt> : null}
            </View>
          </Row>
          {mine && isOpen(o) && l.status === 'active' ? (
            <Row gap={8}>
              <Button size="sm" title={o.status === 'countered' ? `Accept ${rsShort(o.counter_amount ?? 0)}` : 'Accept'} icon="checkmark" style={{ flex: 1 }} loading={busy === `a${o.id}`}
                onPress={async () => {
                  if (await confirmAsk('Accept this offer?', `You agree to sell for ${rs(o.status === 'countered' ? o.counter_amount : o.amount)}. Both numbers will be shared.`)) {
                    run(`a${o.id}`, () => backend.respondOffer(o.id, 'accept'));
                  }
                }} />
              {o.status === 'pending' ? <Button size="sm" kind="soft" title="Counter" style={{ flex: 1 }} onPress={() => setCounterFor(o)} /> : null}
              <Button size="sm" kind="ghost" title="Decline" loading={busy === `r${o.id}`} onPress={() => run(`r${o.id}`, () => backend.respondOffer(o.id, 'reject'))} />
            </Row>
          ) : null}
        </View>
      ))}
    </Card>
  );

  const details = (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Pill label={catOf(l.category).label} tone="brand" />
          <Pill label={conditionLabel(l.condition)} tone="muted" />
          {l.featured_until && l.featured_until > new Date().toISOString() ? <Pill label="Featured" icon="flash" tone="accent" /> : null}
        </Row>
        <Txt v="h1">{l.title}</Txt>
        <Row gap={12} style={{ flexWrap: 'wrap' }}>
          <Row gap={4}><Icon name="location-outline" size={14} color={c.muted} /><Txt v="small" muted>{l.area ? `${l.area}, ` : ''}{l.city}</Txt></Row>
          <Row gap={4}><Icon name="time-outline" size={14} color={c.muted} /><Txt v="small" muted>{ago(l.created_at)}</Txt></Row>
          <Row gap={4}><Icon name="eye-outline" size={14} color={c.muted} /><Txt v="small" muted>{l.views} views</Txt></Row>
        </Row>
      </View>
      {!wide ? offerBox : null}
      <PriceCheck insight={insight} price={l.price} />
      {boardCard}
      <Card style={{ gap: 8 }}>
        <Txt v="h3">Description</Txt>
        <Txt>{l.description || 'No description.'}</Txt>
      </Card>
      {l.seller ? (
        <Card onPress={() => router.push(`/user/${l.seller_id}`)} style={{ gap: 10 }}>
          <Row gap={12}>
            <Avatar name={l.seller.name} size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">{l.seller.name || 'Seller'}</Txt>
              <Txt v="tiny" muted>{l.seller.city} · on Sauda since {new Date(l.seller.created_at).getFullYear()}</Txt>
            </View>
            <Icon name="chevron-forward" size={20} color={c.muted} />
          </Row>
          <TrustLine p={l.seller} />
        </Card>
      ) : null}
      <Card style={{ gap: 8, backgroundColor: c.accentSoft, borderColor: 'transparent' }}>
        <Row gap={6}><Icon name="shield-half" size={17} color={dark ? c.accent : '#8A5A00'} /><Txt v="h3">Stay safe</Txt></Row>
        {['Meet in a public place and check the item before paying.', 'Never pay in advance or share OTP codes.', 'For phones, check PTA status and IMEI before buying.'].map(t => (
          <Row key={t} gap={8} style={{ alignItems: 'flex-start' }}><Txt v="small">•</Txt><Txt v="small" style={{ flex: 1 }}>{t}</Txt></Row>
        ))}
      </Card>
      {!mine ? (
        <Pressable onPress={() => requireLogin() && setReportOpen(true)} style={{ alignSelf: 'center', padding: 8 }}>
          <Row gap={6}><Icon name="flag-outline" size={15} color={c.danger} /><Txt v="smallStrong" color={c.danger}>Report this ad</Txt></Row>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center', flexDirection: wide ? 'row' : 'column', gap: wide ? 24 : 0, padding: wide ? 16 : 0, paddingTop: wide ? insets.top + 64 : 0 }}>
          <View style={{ flex: wide ? 1.4 : undefined, gap: 16 }}>
            <View>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onScroll={e => setPhoto(Math.round(e.nativeEvent.contentOffset.x / photoW))} scrollEventThrottle={32}
                style={{ width: wide ? '100%' : photoW }}>
                {Array.from({ length: photoCount }).map((_, i) => (
                  <View key={i} style={{ width: wide ? photoW : photoW }}>
                    <ListingPhoto listing={l} index={i} height={wide ? 420 : 320} radius={wide ? 24 : 0} />
                  </View>
                ))}
              </ScrollView>
              {photoCount > 1 ? (
                <View style={{ position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 }}>
                  {Array.from({ length: photoCount }).map((_, i) => <View key={i} style={{ width: i === photo ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === photo ? '#fff' : 'rgba(255,255,255,0.55)' }} />)}
                </View>
              ) : null}
            </View>
            <View style={{ paddingHorizontal: wide ? 0 : 16 }}>{details}</View>
          </View>
          {wide ? <View style={{ flex: 1, gap: 16 }}><View style={{ position: 'sticky' as any, top: 16 }}>{offerBox}</View></View> : null}
        </View>
      </ScrollView>

      {/* floating top bar */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconBtn name="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Row gap={8}>
          <IconBtn name="share-social-outline" onPress={share} />
          <IconBtn name={saved.has(l.id) ? 'heart' : 'heart-outline'} color={saved.has(l.id) ? c.danger : undefined} onPress={() => toggleSaved(l.id)} />
        </Row>
      </View>

      {/* sticky bottom actions on phones */}
      {!wide && !mine && l.status === 'active' && !myOffer ? (
        <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line, padding: 12, paddingBottom: insets.bottom + 12, flexDirection: 'row', gap: 10 }, !dark && shadow]}>
          <View style={{ flex: 1 }}>
            <Txt v="tiny" muted>Asking</Txt>
            <Txt v="price">{rsShort(l.price)}</Txt>
          </View>
          <Button title="Make offer" icon="pricetag" style={{ flex: 1.4 }} onPress={() => requireLogin() && setOfferOpen(true)} />
        </View>
      ) : null}

      <MakeOfferSheet listing={l} visible={offerOpen} onClose={() => setOfferOpen(false)} onDone={after} />
      {counterFor ? (
        <CounterSheet visible offerId={counterFor.id} amount={counterFor.amount} asking={l.price} onClose={() => setCounterFor(null)} onDone={after} />
      ) : null}
      <Sheet visible={reportOpen} onClose={() => setReportOpen(false)} title="Report ad">
        <Txt muted>Tell us what is wrong. Our team reviews every report.</Txt>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {['Fake or scam', 'Wrong price', 'Already sold', 'Offensive', 'Prohibited item'].map(r => (
            <Button key={r} size="sm" kind={reportText === r ? 'dark' : 'ghost'} title={r} onPress={() => setReportText(r)} />
          ))}
        </Row>
        <Input value={reportText} onChangeText={setReportText} placeholder="Details" multiline />
        <Button title="Send report" kind="accent" disabled={!reportText.trim()} onPress={async () => {
          try { await backend.reportListing(l.id, reportText.trim()); toast('Thanks, we will review it.'); setReportOpen(false); setReportText(''); }
          catch (e: any) { toast(e.message); }
        }} />
      </Sheet>
    </View>
  );
}
