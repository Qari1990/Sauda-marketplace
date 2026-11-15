import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { ago } from '@/lib/format';
import { ListingPhoto } from '@/components/listing';
import { Avatar, Button, Divider, Empty, Loading, Row, Screen, TopBar, Txt } from '@/components/ui';

export default function Chats() {
  const { c } = useTheme();
  const { session } = useApp();
  const { data, loading } = useLoad(async () => (session ? backend.listConversations() : []), [session?.userId]);

  if (!session) {
    return (
      <Screen header={<TopBar title="Chats" back={false} />}>
        <Empty icon="chatbubbles" title="Chat safely" text="Ask questions inside Sauda without sharing your number."
          action={<Button title="Log in" onPress={() => router.push('/login')} style={{ marginTop: 8 }} />} />
      </Screen>
    );
  }
  return (
    <Screen header={<TopBar title="Chats" back={false} />} maxWidth={760}>
      {loading && !data ? <Loading /> : !data?.length ? (
        <Empty icon="chatbubbles-outline" title="No chats yet" text="Open any ad and tap 'Chat with seller' to ask a question." />
      ) : (
        <View style={{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
          {data.map((cv, i) => (
            <View key={cv.id}>
              {i ? <Divider /> : null}
              <Pressable onPress={() => router.push(`/chat/${cv.id}`)} style={({ pressed }) => ({ padding: 14, backgroundColor: pressed ? c.input : 'transparent' })}>
                <Row gap={12}>
                  <View>
                    <Avatar name={cv.other?.name} size={48} />
                    {cv.listing ? <View style={{ position: 'absolute', right: -4, bottom: -4, width: 24, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: c.card }}><ListingPhoto listing={cv.listing} height={20} radius={6} /></View> : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt v="smallStrong">{cv.other?.name || 'Sauda user'}</Txt>
                      <Txt v="tiny" muted>{ago(cv.last_at)}</Txt>
                    </Row>
                    <Txt v="tiny" color={c.brand} numberOfLines={1}>{cv.listing?.title}</Txt>
                    <Txt v="small" muted numberOfLines={1}>{cv.last_message ?? 'Say salam 👋'}</Txt>
                  </View>
                </Row>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
