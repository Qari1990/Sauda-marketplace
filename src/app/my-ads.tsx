import React from 'react';
import { router } from 'expo-router';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { ListingGrid } from '@/components/listing';
import { Button, Empty, Loading, Screen, TopBar } from '@/components/ui';

export default function MyAds() {
  const { session } = useApp();
  const { data, loading } = useLoad(async () => (session ? backend.listListings({ sellerId: session.userId, includeInactive: true }) : []), [session?.userId]);
  return (
    <Screen header={<TopBar title="My ads" />}>
      {loading && !data ? <Loading /> : data?.length ? <ListingGrid items={data} /> : (
        <Empty icon="albums-outline" title="No ads yet" text="Post your first ad in under a minute."
          action={<Button title="Post an ad" onPress={() => router.push('/sell')} style={{ marginTop: 8 }} />} />
      )}
    </Screen>
  );
}
