import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp } from '@/lib/app-state';
import { effectiveStatus, OFFER_HOURS, validateOffer } from '@/lib/rules';
import { rs, rsShort } from '@/lib/format';
import type { Deal, Listing, OfferStatus, PriceInsight } from '@/lib/types';
import { Button, Chip, Countdown, ErrorBox, Icon, Input, Pill, Row, Sheet, Txt, toast } from './ui';

export function StatusPill({ status, expires_at }: { status: OfferStatus; expires_at: string }) {
  const s = effectiveStatus({ status, expires_at });
  const map: Record<OfferStatus, [string, any]> = {
    pending: ['Live', 'ok'], countered: ['Counter sent', 'accent'], accepted: ['Accepted', 'brand'],
    rejected: ['Declined', 'danger'], withdrawn: ['Withdrawn', 'muted'], expired: ['Expired', 'muted'],
  };
  return <Pill label={map[s][0]} tone={map[s][1]} />;
}

const toInt = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;

export function MakeOfferSheet({ listing, visible, onClose, onDone }: { listing: Listing; visible: boolean; onClose: () => void; onDone: () => void }) {
  const { c } = useTheme();
  const [amount, setAmount] = useState('');
  const [hours, setHours] = useState<number>(24);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const n = toInt(amount);
  const live = n ? validateOffer(listing, n, hours) : null;
  const pct = n ? Math.round((n / listing.price) * 100) : 0;

  async function submit() {
    const e = validateOffer(listing, n, hours);
    if (e) return setErr(e);
    setBusy(true);
    setErr(null);
    try {
      await backend.makeOffer(listing.id, n, hours, msg.trim());
      toast('Offer sent. The seller will see it right away.');
      setAmount(''); setMsg('');
      onDone();
      onClose();
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Make an offer">
      <View style={{ backgroundColor: c.input, borderRadius: 16, padding: 14, gap: 4 }}>
        <Txt v="small" muted numberOfLines={1}>{listing.title}</Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="smallStrong">Asking {rs(listing.price)}</Txt>
          {listing.top_offer ? <Txt v="smallStrong" color={c.ok}>Highest live {rs(listing.top_offer)}</Txt> : <Txt v="small" muted>No live offers</Txt>}
        </Row>
      </View>
      <Input label="Your offer (Rs)" value={amount ? Number(toInt(amount)).toLocaleString('en-PK') : ''} onChangeText={setAmount}
        keyboardType="number-pad" placeholder="e.g. 130,000" error={live && n ? live : null}
        hint={n ? `${pct}% of asking price` : 'Everyone can see the amount. Your name stays hidden until a deal.'} />
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {[0.95, 0.9, 0.85, 0.8].map(r => {
          const v = Math.round((listing.price * r) / 500) * 500;
          return <Chip key={r} label={`${Math.round(r * 100)}% · ${rsShort(v)}`} on={n === v} onPress={() => setAmount(String(v))} />;
        })}
      </Row>
      <Txt v="smallStrong">Offer valid for</Txt>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {OFFER_HOURS.map(h => <Chip key={h} label={h < 24 ? `${h} hours` : `${h / 24} day${h > 24 ? 's' : ''}`} on={hours === h} onPress={() => setHours(h)} />)}
      </Row>
      <Input label="Message to seller (optional)" value={msg} onChangeText={setMsg} placeholder="e.g. I can pick up today, cash ready" maxLength={300} />
      <Row gap={8} style={{ backgroundColor: c.brandSoft, padding: 12, borderRadius: 14 }}>
        <Icon name="information-circle" size={18} color={c.brand} />
        <Txt v="small" color={c.brand} style={{ flex: 1 }}>
          If the seller accepts within {hours < 24 ? `${hours} hours` : `${hours / 24} day(s)`}, it is a deal and both of you can see each other's number. Backing out after that shows on your profile.
        </Txt>
      </Row>
      {err ? <ErrorBox text={err} /> : null}
      <Button title={n ? `Send offer of ${rs(n)}` : 'Send offer'} size="lg" loading={busy} disabled={!n || !!live} onPress={submit} />
    </Sheet>
  );
}

export function CounterSheet({ offerId, amount, asking, visible, onClose, onDone }: { offerId: string; amount: number; asking: number; visible: boolean; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const n = toInt(v);
  const mid = Math.round(((amount + asking) / 2) / 500) * 500;
  return (
    <Sheet visible={visible} onClose={onClose} title="Send a counter offer">
      <Txt muted>Buyer offered {rs(amount)}. Your asking price is {rs(asking)}.</Txt>
      <Input label="Your counter (Rs)" value={n ? n.toLocaleString('en-PK') : ''} onChangeText={setV} keyboardType="number-pad" placeholder={mid.toLocaleString('en-PK')} />
      <Row gap={8}>
        <Chip label={`Meet halfway · ${rsShort(mid)}`} on={n === mid} onPress={() => setV(String(mid))} />
        <Chip label={`Asking · ${rsShort(asking)}`} on={n === asking} onPress={() => setV(String(asking))} />
      </Row>
      {err ? <ErrorBox text={err} /> : null}
      <Button title="Send counter" size="lg" loading={busy} disabled={!n} onPress={async () => {
        setBusy(true); setErr(null);
        try {
          await backend.respondOffer(offerId, 'counter', n);
          toast('Counter sent');
          onDone(); onClose();
        } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
      }} />
    </Sheet>
  );
}

export function PriceCheck({ insight, price }: { insight: PriceInsight | null | undefined; price?: number }) {
  const { c } = useTheme();
  if (!insight) return null;
  const span = Math.max(1, insight.high - insight.low);
  const pos = price != null ? Math.min(1, Math.max(0, (price - insight.low) / span)) : null;
  let verdict: [string, string] | null = null;
  if (price != null) {
    if (price < insight.median * 0.9) verdict = ['Below market', c.ok];
    else if (price > insight.median * 1.1) verdict = ['Above market', c.danger];
    else verdict = ['Fair price', c.brand];
  }
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.line, padding: 14, gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}><Icon name="analytics" size={17} color={c.brand} /><Txt v="h3">Price check</Txt></Row>
        {verdict ? <Txt v="smallStrong" color={verdict[1]}>{verdict[0]}</Txt> : null}
      </Row>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: c.input, overflow: 'visible' }}>
        <View style={{ position: 'absolute', left: '10%', right: '10%', top: 0, bottom: 0, borderRadius: 5, backgroundColor: c.brandSoft }} />
        {pos != null ? <View style={{ position: 'absolute', left: `${pos * 100}%`, top: -4, width: 18, height: 18, marginLeft: -9, borderRadius: 9, backgroundColor: c.brand, borderWidth: 3, borderColor: c.card }} /> : null}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="tiny" muted>Low {rsShort(insight.low)}</Txt>
        <Txt v="tiny">Typical {rsShort(insight.median)}</Txt>
        <Txt v="tiny" muted>High {rsShort(insight.high)}</Txt>
      </Row>
      <Txt v="tiny" muted>Based on {insight.sample} similar ads on Sauda.</Txt>
    </View>
  );
}

export function goToDeal(d: Deal | null) {
  if (d) {
    toast('Deal agreed! Numbers are now visible to both of you.');
    router.push(`/deal/${d.id}`);
  }
}

export function useOfferActions(onChange: () => void) {
  const { requireLogin } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(key: string, fn: () => Promise<Deal | null | void>) {
    if (!requireLogin()) return;
    setBusy(key);
    try {
      const d = await fn();
      if (d) goToDeal(d);
      onChange();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(null);
    }
  }
  return { busy, run };
}

export function OfferCountdown({ expires_at, status }: { expires_at: string; status: OfferStatus }) {
  const s = effectiveStatus({ status, expires_at });
  if (s !== 'pending' && s !== 'countered') return null;
  return (
    <Row gap={4}>
      <Icon name="timer-outline" size={12} color="#9AA3AF" />
      <Countdown to={expires_at} />
    </Row>
  );
}
