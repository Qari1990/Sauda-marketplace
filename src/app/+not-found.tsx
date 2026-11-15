import React from 'react';
import { router } from 'expo-router';
import { Button, Empty, Screen, TopBar } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen header={<TopBar title="" />}>
      <Empty icon="compass-outline" title="Page not found" action={<Button title="Go home" onPress={() => router.replace('/')} style={{ marginTop: 8 }} />} />
    </Screen>
  );
}
