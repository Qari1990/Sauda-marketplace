import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { ago, rs } from '@/lib/format';
import { ListingPhoto, TrustLine } from '@/components/listing';
import { Avatar, Button, Card, Divider, Empty, ErrorBox, Icon, Input, Loading, Pill, Row, Screen, Stars, TopBar, Txt, confirmAsk, toast } from '@/components/ui';

export default function DealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { session, refresh, reloadMe } = useApp();
  const { data: d, loading, reload } = useLoad(() => backend.getDeal(id), [id, session?.userId]);
  const { data: log, reload: reloadLog } = useLoad(() => backend.getRevealLog(id), [id]);
  const [phone, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (loading && !d) return <Screen header={<TopBar title="Deal" />}><Loading /></Screen>;
  if (!d) return <Screen header={<TopBar title="Deal" />}><Empty icon="lock-closed" title="Deal not found" text="Only the buyer and seller can open a deal." /></Screen>;

  const iAmSeller = d.seller_id === session?.userId;
  const other = iAmSeller ? d.buyer : d.seller;
  const iConfirmed = iAmSeller ? d.seller_confirmed : d.buyer_confirmed;
  const theyConfirmed = iAmSeller ? d.buyer_confirmed : d.seller_confirmed;

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key); setErr(null);
    try { await fn(); reload(); reloadLog(); refresh(); reloadMe(); } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  const steps = [
    { label: 'Offer accepted', done: true },
    { label: 'Contact & meet', done: !!phone || (log?.length ?? 0) > 0 || d.status === 'completed' },
    { label: 'Both confirm', done: d.status === 'completed' },
  ];

  return (
    <Screen header={<TopBar title="Your deal" />} maxWidth={680}>
      <Card style={{ gap: 14 }}>
        <Row gap={12}>
          <View style={{ width: 72 }}>{d.listing ? <ListingPhoto listing={d.listing} height={72} radius={16} /> : null}</View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="h3" numberOfLines={2}>{d.listing?.title}</Txt>
            <Txt v="h2" color={c.brand}>{rs(d.price)}</Txt>
          </View>
        </Row>
        <Pill label={d.status === 'agreed' ? 'Agreed by both' : d.status === 'completed' ? 'Completed' : 'Cancelled'}
          tone={d.status === 'agreed' ? 'ok' : d.status === 'completed' ? 'brand' : 'danger'} icon={d.status === 'cancelled' ? 'close-circle' : 'checkmark-circle'} />
        <Row gap={0}>
          {steps.map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Row gap={0} style={{ width: '100%' }}>
                <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? 'transparent' : s.done ? c.brand : c.line }} />
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: s.done ? c.brand : c.input, alignItems: 'center', justifyContent: 'center' }}>
                  {s.done ? <Icon name="checkmark" size={16} color="#fff" /> : <Txt v="tiny" muted>{i + 1}</Txt>}
                </View>
                <View style={{ flex: 1, height: 3, backgroundColor: i === steps.length - 1 ? 'transparent' : steps[i + 1].done ? c.brand : c.line }} />
              </Row>
              <Txt v="tiny" muted={!s.done} style={{ textAlign: 'center' }}>{s.label}</Txt>
            </View>
          ))}
        </Row>
      </Card>

      {other ? (
        <Card style={{ gap: 12 }}>
          <Txt v="tiny" muted>{iAmSeller ? 'BUYER' : 'SELLER'}</Txt>
          <Row gap={12}>
            <Avatar name={other.name} size={48} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="h3">{other.name || 'Sauda user'}</Txt>
              <TrustLine p={other} />
            </View>
          </Row>
          {d.status === 'cancelled' ? (
            <Txt v="small" muted>This deal was cancelled{d.cancelled_by === session?.userId ? ' by you' : ''}. Contact numbers are hidden again.</Txt>
          ) : phone ? (
            <View style={{ gap: 10 }}>
              <View style={{ backgroundColor: c.brandSoft, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 }}>
                <Txt v="tiny" color={c.brand}>CONTACT NUMBER</Txt>
                <Txt v="h1" color={c.brand} selectable>{phone}</Txt>
              </View>
              <Row gap={8}>
                <Button style={{ flex: 1 }} title="Call" icon="call" onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)} />
                <Button style={{ flex: 1 }} kind="soft" title="WhatsApp" icon="logo-whatsapp"
                  onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)} />
                <Button kind="ghost" title="" icon="copy-outline" onPress={async () => { await Clipboard.setStringAsync(phone); toast('Number copied'); }} />
              </Row>
            </View>
          ) : (
            <Button title="Show contact number" icon="call-outline" size="lg" loading={busy === 'reveal'}
              onPress={() => act('reveal', async () => setPhone(await backend.revealPhone(d.id)))} />
          )}
          <Row gap={6} style={{ alignItems: 'flex-start' }}>
            <Icon name="eye-outline" size={14} color={c.muted} />
            <Txt v="tiny" muted style={{ flex: 1 }}>Every time a number is opened it is logged below, and both of you can see the log.</Txt>
          </Row>
        </Card>
      ) : null}

      {d.status === 'agreed' ? (
        <Card style={{ gap: 10 }}>
          <Txt v="h3">After you meet</Txt>
          <Txt v="small" muted>When the item is handed over and paid, both of you confirm. Only then can you rate each other.</Txt>
          {iConfirmed ? (
            <Pill label={theyConfirmed ? 'Both confirmed' : `You confirmed · waiting for ${other?.name || 'them'}`} tone="ok" icon="checkmark-done" />
          ) : (
            <Button title="Item handed over, deal done" icon="checkmark-done" loading={busy === 'confirm'} onPress={() => act('confirm', () => backend.confirmDeal(d.id))} />
          )}
          <Divider />
          <Button kind="danger" title="Back out of deal" icon="exit-outline" loading={busy === 'cancel'} onPress={async () => {
            if (await confirmAsk('Back out of this deal?', 'This will be shown on your public profile as a back-out. The ad will open for offers again.')) {
              act('cancel', () => backend.cancelDeal(d.id));
            }
          }} />
        </Card>
      ) : null}

      {d.status === 'completed' ? (
        d.my_review_done ? (
          <Card style={{ alignItems: 'center', gap: 6 }}>
            <Icon name="heart" size={26} color={c.danger} />
            <Txt v="h3">Thanks for rating!</Txt>
            <Txt v="small" muted>Your review is on {other?.name || 'their'} profile.</Txt>
          </Card>
        ) : (
          <Card style={{ gap: 12 }}>
            <Txt v="h3">Rate {other?.name || 'this person'}</Txt>
            <Stars value={stars} size={34} onChange={setStars} />
            <Input value={text} onChangeText={setText} placeholder="How was the deal? (optional)" multiline maxLength={500} />
            <Button title="Submit rating" disabled={!stars} loading={busy === 'review'} onPress={() => act('review', () => backend.leaveReview(d.id, stars, text.trim()))} />
          </Card>
        )
      ) : null}

      {err ? <ErrorBox text={err} /> : null}

      <Card style={{ gap: 10 }}>
        <Row gap={6}><Icon name="list" size={16} color={c.brand} /><Txt v="h3">Number reveal log</Txt></Row>
        {!log?.length ? <Txt v="small" muted>No one has opened a number yet.</Txt> : log.map(r => (
          <Row key={r.id} gap={8}>
            <Icon name="eye" size={14} color={c.muted} />
            <Txt v="small" style={{ flex: 1 }}>{r.viewer_id === session?.userId ? 'You' : r.viewer_name} viewed the number</Txt>
            <Txt v="tiny" muted>{ago(r.created_at)}</Txt>
          </Row>
        ))}
      </Card>

      <Button kind="ghost" title="Open the ad" icon="open-outline" onPress={() => router.push(`/listing/${d.listing_id}`)} />
    </Screen>
  );
}
