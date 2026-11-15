import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useLoad } from '@/lib/app-state';
import { CATEGORIES, CITIES, CONDITIONS } from '@/lib/catalog';
import type { Category, Condition, ListingFilters } from '@/lib/types';
import { ListingGrid } from '@/components/listing';
import { Button, Chip, Empty, Icon, Input, Loading, Row, Screen, Sheet, TopBar, Txt } from '@/components/ui';

const SORTS: { id: NonNullable<ListingFilters['sort']>; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'most_offers', label: 'Most offers' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
];

export default function Search() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ category?: Category; sort?: ListingFilters['sort']; q?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  const [debounced, setDebounced] = useState(q);
  const [f, setF] = useState<ListingFilters>({ category: params.category, sort: params.sort ?? 'newest' });
  const [open, setOpen] = useState(false);
  const [minP, setMinP] = useState('');
  const [maxP, setMaxP] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading } = useLoad(() => backend.listListings({ ...f, q: debounced }), [JSON.stringify(f), debounced]);
  const activeCount = [f.city, f.condition, f.minPrice, f.maxPrice].filter(x => x != null).length;

  return (
    <Screen header={<TopBar title="Search" />}>
      <Input autoFocus={!params.category && !params.sort} value={q} onChangeText={setQ} placeholder="What are you looking for?"
        left={<Icon name="search" size={19} color={c.muted} />} returnKeyType="search" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={activeCount ? `Filters (${activeCount})` : 'Filters'} icon="options" on={activeCount > 0} onPress={() => setOpen(true)} />
        <Chip label="All" on={!f.category} onPress={() => setF({ ...f, category: undefined })} />
        {CATEGORIES.map(cat => (
          <Chip key={cat.id} label={cat.label} on={f.category === cat.id} onPress={() => setF({ ...f, category: f.category === cat.id ? undefined : cat.id })} />
        ))}
      </ScrollView>

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="small" muted>{data ? `${data.length} ad${data.length === 1 ? '' : 's'}` : ' '}</Txt>
        <Pressable onPress={() => {
          const i = SORTS.findIndex(s => s.id === f.sort);
          setF({ ...f, sort: SORTS[(i + 1) % SORTS.length].id });
        }}>
          <Row gap={4}><Icon name="swap-vertical" size={15} color={c.brand} /><Txt v="smallStrong" color={c.brand}>{SORTS.find(s => s.id === f.sort)?.label}</Txt></Row>
        </Pressable>
      </Row>

      {loading && !data ? <Loading /> : data?.length ? <ListingGrid items={data} /> : (
        <Empty icon="search" title="Nothing found" text="Try another word, or remove some filters." />
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title="Filters">
        <Txt v="smallStrong">City</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="All Pakistan" on={!f.city} onPress={() => setF({ ...f, city: undefined })} />
          {CITIES.map(ct => <Chip key={ct} label={ct} on={f.city === ct} onPress={() => setF({ ...f, city: ct })} />)}
        </View>
        <Txt v="smallStrong">Condition</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="Any" on={!f.condition} onPress={() => setF({ ...f, condition: undefined })} />
          {CONDITIONS.map(cd => <Chip key={cd.id} label={cd.label} on={f.condition === cd.id} onPress={() => setF({ ...f, condition: cd.id as Condition })} />)}
        </View>
        <Txt v="smallStrong">Price (Rs)</Txt>
        <Row gap={10}>
          <View style={{ flex: 1 }}><Input value={minP} onChangeText={setMinP} placeholder="Min" keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Input value={maxP} onChangeText={setMaxP} placeholder="Max" keyboardType="number-pad" /></View>
        </Row>
        <Row gap={10} style={{ marginTop: 6 }}>
          <Button kind="ghost" title="Clear" style={{ flex: 1 }} onPress={() => {
            setMinP(''); setMaxP('');
            setF({ category: f.category, sort: f.sort });
            setOpen(false);
          }} />
          <Button title="Show results" style={{ flex: 2 }} onPress={() => {
            const n = (s: string) => (s.trim() ? Number(s.replace(/\D/g, '')) : undefined);
            setF({ ...f, minPrice: n(minP), maxPrice: n(maxP) });
            setOpen(false);
          }} />
        </Row>
      </Sheet>
    </Screen>
  );
}
