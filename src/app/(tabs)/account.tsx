import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { resetDemo } from '@/lib/backend/demo';
import { useApp } from '@/lib/app-state';
import { CITIES } from '@/lib/catalog';
import { memberSince } from '@/lib/format';
import { TrustLine } from '@/components/listing';
import { Avatar, Button, Card, Chip, Divider, Empty, Icon, IconName, Input, Row, Screen, Segmented, Sheet, TopBar, Txt, confirmAsk, toast } from '@/components/ui';

function Item({ icon, label, onPress, right }: { icon: IconName; label: string; onPress?: () => void; right?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: pressed && onPress ? c.input : 'transparent' })}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={c.brand} />
      </View>
      <Txt v="bodyStrong" style={{ flex: 1 }}>{label}</Txt>
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color={c.muted} /> : null)}
    </Pressable>
  );
}

export default function Account() {
  const { c, pref, setPref } = useTheme();
  const { session, me, reloadMe } = useApp();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');

  if (!session) {
    return (
      <Screen header={<TopBar title="Account" back={false} />}>
        <Empty icon="person-circle" title="Welcome to Sauda" text="Log in with your mobile number. No password needed."
          action={<Button title="Log in / Sign up" onPress={() => router.push('/login')} style={{ marginTop: 8 }} />} />
        <Card pad={0}><Item icon="help-circle" label="How Sauda works" onPress={() => router.push('/how-it-works')} /></Card>
        <AppearanceCard pref={pref} setPref={setPref} />
      </Screen>
    );
  }

  const groups = (
    <>
      <Card pad={0}>
        <Item icon="albums" label="My ads" onPress={() => router.push('/my-ads')} />
        <Divider />
        <Item icon="heart" label="Saved ads" onPress={() => router.push('/saved')} />
        <Divider />
        <Item icon="person" label="My public profile" onPress={() => router.push(`/user/${session.userId}`)} />
      </Card>
      <Card pad={0}>
        <Item icon="eye-off" label="Show when I was last online" right={
          <Switch value={me?.show_last_seen ?? true} trackColor={{ true: c.brand, false: c.line }}
            onValueChange={async v => { await backend.updateMyProfile({ show_last_seen: v }); reloadMe(); }} />
        } />
        <Divider />
        <Item icon="lock-closed" label="Phone number: private until a deal" />
        <Divider />
        <Item icon="help-circle" label="How Sauda works" onPress={() => router.push('/how-it-works')} />
      </Card>
    </>
  );

  return (
    <Screen header={<TopBar title="Account" back={false} />} maxWidth={720}>
      <Card style={{ gap: 12 }}>
        <Row gap={14}>
          <Avatar name={me?.name || 'You'} size={60} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h2">{me?.name || 'Add your name'}</Txt>
            <Txt v="small" muted>{me?.city} · member since {me ? memberSince(me.created_at) : ''}</Txt>
          </View>
          <Button size="sm" kind="ghost" title="Edit" icon="create-outline" onPress={() => { setName(me?.name ?? ''); setCity(me?.city ?? ''); setEdit(true); }} />
        </Row>
        {me ? <TrustLine p={me} /> : null}
        <Row gap={10}>
          {[['Deals', me?.deals_completed ?? 0], ['Rating', me?.rating_avg ?? '-'], ['Back-outs', me?.backouts ?? 0]].map(([k, v]) => (
            <View key={k as string} style={{ flex: 1, backgroundColor: c.input, borderRadius: 14, padding: 10, alignItems: 'center' }}>
              <Txt v="h2">{String(v)}</Txt>
              <Txt v="tiny" muted>{k}</Txt>
            </View>
          ))}
        </Row>
        {!me?.cnic_verified ? (
          <Row gap={8} style={{ backgroundColor: c.infoSoft, padding: 12, borderRadius: 14 }}>
            <Icon name="shield-checkmark" size={18} color={c.info} />
            <Txt v="small" color={c.info} style={{ flex: 1 }}>Get an "ID verified" badge to receive more offers. (CNIC check coming soon)</Txt>
          </Row>
        ) : null}
      </Card>
      {groups}
      <AppearanceCard pref={pref} setPref={setPref} />
      <Button kind="danger" title="Log out" icon="log-out-outline" onPress={() => backend.signOut()} />
      {backend.mode === 'demo' ? (
        <Button kind="ghost" title="Reset demo data" icon="refresh" onPress={async () => {
          if (await confirmAsk('Reset demo?', 'All demo ads, offers and chats go back to the start.')) { await resetDemo(); toast('Demo reset'); }
        }} />
      ) : null}

      <Sheet visible={edit} onClose={() => setEdit(false)} title="Edit profile">
        <Input label="Your name" value={name} onChangeText={setName} placeholder="e.g. Ali Khan" maxLength={60} />
        <Txt v="smallStrong">City</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CITIES.map(ct => <Chip key={ct} label={ct} on={city === ct} onPress={() => setCity(ct)} />)}
        </View>
        <Button title="Save" disabled={!name.trim()} onPress={async () => {
          await backend.updateMyProfile({ name: name.trim(), city });
          await reloadMe();
          setEdit(false);
          toast('Profile saved');
        }} />
      </Sheet>
    </Screen>
  );
}

function AppearanceCard({ pref, setPref }: { pref: 'system' | 'light' | 'dark'; setPref: (p: 'system' | 'light' | 'dark') => void }) {
  return (
    <Card style={{ gap: 10 }}>
      <Txt v="h3">Appearance</Txt>
      <Segmented value={pref} onChange={setPref} options={[{ id: 'system', label: 'Auto' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} />
    </Card>
  );
}
