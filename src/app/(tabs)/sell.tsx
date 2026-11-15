import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { CATEGORIES, CITIES, CONDITIONS } from '@/lib/catalog';
import type { Category, Condition } from '@/lib/types';
import { PriceCheck } from '@/components/offers';
import { Button, Chip, Empty, ErrorBox, Icon, Input, Row, Screen, TopBar, Txt, toast } from '@/components/ui';

const MAX_PHOTOS = 8;

export default function Sell() {
  const { c } = useTheme();
  const { session, me, refresh } = useApp();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [condition, setCondition] = useState<Condition>('used');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState(me?.city || 'Lahore');
  const [area, setArea] = useState('');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const n = Number(price.replace(/\D/g, '')) || 0;
  const { data: insight } = useLoad(
    async () => (category && title.trim().length >= 3 ? backend.priceInsight(category, title) : null),
    [category, title.trim().toLowerCase()],
  );

  if (!session) {
    return (
      <Screen header={<TopBar title="Sell something" back={false} />}>
        <Empty icon="add-circle" title="Post your ad for free" text="Log in with your phone number to post. Your number stays private until you agree on a deal."
          action={<Button title="Log in to sell" onPress={() => router.push('/login')} style={{ marginTop: 8 }} />} />
      </Screen>
    );
  }

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.6, base64: backend.mode === 'demo',
    });
    if (res.canceled) return;
    const uris = res.assets.map(a => (backend.mode === 'demo' && a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri));
    setPhotos(p => [...p, ...uris].slice(0, MAX_PHOTOS));
  }

  async function submit() {
    setErr(null);
    if (title.trim().length < 5) return setErr('Write a clear title (at least 5 letters).');
    if (!category) return setErr('Choose a category.');
    if (!n) return setErr('Enter your asking price.');
    setBusy(true);
    try {
      const l = await backend.createListing({ title: title.trim(), description: desc.trim(), category, condition, price: n, city, area: area.trim(), photos });
      toast('Your ad is live!');
      setTitle(''); setCategory(null); setPrice(''); setArea(''); setDesc(''); setPhotos([]);
      refresh();
      router.push(`/listing/${l.id}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={<TopBar title="Sell something" back={false} />} maxWidth={720}>
      <View style={{ gap: 8 }}>
        <Txt v="smallStrong">Photos ({photos.length}/{MAX_PHOTOS})</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {photos.length < MAX_PHOTOS ? (
            <Pressable onPress={pick} style={{ width: 96, height: 96, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: c.brand, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name="camera" size={26} color={c.brand} />
              <Txt v="tiny" color={c.brand}>Add photos</Txt>
            </Pressable>
          ) : null}
          {photos.map((p, i) => (
            <View key={i}>
              <Image source={{ uri: p }} style={{ width: 96, height: 96, borderRadius: 18 }} contentFit="cover" />
              {i === 0 ? <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: c.ink, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}><Txt v="tiny" color={c.bg}>Cover</Txt></View> : null}
              <Pressable onPress={() => setPhotos(ps => ps.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, backgroundColor: c.danger, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={15} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <Txt v="tiny" muted>Ads with real photos get far more offers. First photo is the cover.</Txt>
      </View>

      <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. iPhone 13 128GB, PTA approved" maxLength={90} />

      <View style={{ gap: 8 }}>
        <Txt v="smallStrong">Category</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map(cat => <Chip key={cat.id} label={cat.label} icon={cat.icon as any} on={category === cat.id} onPress={() => setCategory(cat.id)} />)}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Txt v="smallStrong">Condition</Txt>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {CONDITIONS.map(cd => <Chip key={cd.id} label={cd.label} on={condition === cd.id} onPress={() => setCondition(cd.id)} />)}
        </Row>
      </View>

      <Input label="Asking price (Rs)" value={n ? n.toLocaleString('en-PK') : ''} onChangeText={setPrice} keyboardType="number-pad" placeholder="e.g. 145,000"
        hint="Buyers can send offers below this. Offers under 40% are blocked automatically." />
      <PriceCheck insight={insight} price={n || undefined} />

      <View style={{ gap: 8 }}>
        <Txt v="smallStrong">City</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CITIES.map(ct => <Chip key={ct} label={ct} on={city === ct} onPress={() => setCity(ct)} />)}
        </ScrollView>
      </View>
      <Input label="Area (optional)" value={area} onChangeText={setArea} placeholder="e.g. DHA Phase 5" />
      <Input label="Description" value={desc} onChangeText={setDesc} multiline maxLength={4000}
        placeholder="Condition, age, what's included, reason for selling..." />

      <Row gap={8} style={{ backgroundColor: c.brandSoft, padding: 12, borderRadius: 14, alignItems: 'flex-start' }}>
        <Icon name="lock-closed" size={17} color={c.brand} />
        <Txt v="small" color={c.brand} style={{ flex: 1 }}>Your phone number is never shown on the ad. It is shared only with the buyer whose offer you accept.</Txt>
      </Row>
      {err ? <ErrorBox text={err} /> : null}
      <Button title="Post ad" icon="rocket" size="lg" loading={busy} onPress={submit} />
    </Screen>
  );
}
