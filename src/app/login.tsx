import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp } from '@/lib/app-state';
import { CITIES } from '@/lib/catalog';
import { normalizePkPhone, prettyPhone } from '@/lib/format';
import { Button, Chip, ErrorBox, Icon, Input, Row, Screen, TopBar, Txt } from '@/components/ui';

export default function Login() {
  const { c } = useTheme();
  const { reloadMe, refresh } = useApp();
  const [step, setStep] = useState<'phone' | 'code' | 'profile'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('Lahore');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const e164 = normalizePkPhone(phone);

  async function go(fn: () => Promise<void>) {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  const done = () => { refresh(); router.canGoBack() ? router.back() : router.replace('/'); };

  return (
    <Screen header={<TopBar title="" />} maxWidth={460}>
      <LinearGradient colors={[c.brand, '#18A88A']} style={{ width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={step === 'profile' ? 'person' : 'phone-portrait'} size={30} color="#fff" />
      </LinearGradient>

      {step === 'phone' ? (
        <>
          <Txt v="h1">Log in with your number</Txt>
          <Txt muted>We'll send a 6-digit code by SMS. Your number is never shown on your ads.</Txt>
          <Input label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="03XX XXXXXXX" autoFocus
            left={<Txt v="bodyStrong" muted>🇵🇰</Txt>} error={phone.length > 9 && !e164 ? 'Enter a valid Pakistani mobile number' : null} />
          {err ? <ErrorBox text={err} /> : null}
          <Button title="Send code" size="lg" disabled={!e164} loading={busy} onPress={() => go(async () => { await backend.sendOtp(e164!); setStep('code'); })} />
        </>
      ) : null}

      {step === 'code' ? (
        <>
          <Txt v="h1">Enter the code</Txt>
          <Txt muted>Sent to {prettyPhone(e164!)}. {backend.mode === 'demo' ? 'Demo mode: use 123456.' : ''}</Txt>
          <Input value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="••••••" autoFocus
            style={{ fontSize: 26, letterSpacing: 10, textAlign: 'center' }} />
          {err ? <ErrorBox text={err} /> : null}
          <Button title="Verify" size="lg" disabled={code.length !== 6} loading={busy} onPress={() => go(async () => {
            const s = await backend.verifyOtp(e164!, code);
            const p = await backend.getProfile(s.userId);
            await reloadMe();
            if (!p?.name) setStep('profile'); else done();
          })} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Button kind="ghost" size="sm" title="Change number" onPress={() => { setStep('phone'); setCode(''); }} />
            <Button kind="ghost" size="sm" title="Resend code" onPress={() => go(() => backend.sendOtp(e164!))} />
          </Row>
        </>
      ) : null}

      {step === 'profile' ? (
        <>
          <Txt v="h1">Almost done</Txt>
          <Txt muted>Your name is shown to the other person only after a deal. On the offer board you appear as "Buyer 1, 2...".</Txt>
          <Input label="Your name" value={name} onChangeText={setName} placeholder="e.g. Ali Khan" autoFocus maxLength={60} />
          <Txt v="smallStrong">City</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CITIES.slice(0, 10).map(ct => <Chip key={ct} label={ct} on={city === ct} onPress={() => setCity(ct)} />)}
          </View>
          {err ? <ErrorBox text={err} /> : null}
          <Button title="Start using Sauda" size="lg" disabled={name.trim().length < 2} loading={busy} onPress={() => go(async () => {
            await backend.updateMyProfile({ name: name.trim(), city });
            await reloadMe();
            done();
          })} />
        </>
      ) : null}

      <Row gap={6} style={{ justifyContent: 'center', marginTop: 8 }}>
        <Icon name="lock-closed" size={13} color={c.muted} />
        <Txt v="tiny" muted>By continuing you agree to Sauda's terms and privacy policy.</Txt>
      </Row>
    </Screen>
  );
}
