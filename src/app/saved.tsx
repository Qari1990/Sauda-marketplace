import React from 'react';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { ListingGrid } from '@/components/listing';
import { Empty, Loading, Screen, TopBar } from '@/components/ui';

export default function Saved() {
  const { session, saved } = useApp();
  const { data, loading } = useLoad(async () => (session ? backend.listSaved() : []), [session?.userId, saved.size]);
  return (
    <Screen header={<TopBar title="Saved ads" />}>
      {loading && !data ? <Loading /> : data?.length ? <ListingGrid items={data} /> : (
        <Empty icon="heart-outline" title="Nothing saved" text="Tap the heart on any ad to keep it here." />
      )}
    </Screen>
  );
}
