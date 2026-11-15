import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, useTheme } from '@/theme';
import { backend } from '@/lib/backend';
import { useApp, useLoad } from '@/lib/app-state';
import { rsShort } from '@/lib/format';
import type { Message } from '@/lib/types';
import { ListingPhoto } from '@/components/listing';
import { Icon, Row, TopBar, Txt, toast } from '@/components/ui';

const QUICK = ['Is it still available?', 'What is your final price?', 'Where can I see it?', 'Can you send more photos?'];
// Block phone numbers in chat so people use the deal flow (keeps numbers private and logged).
const PHONE_RE = /(\+?92|0)?\s*3\d{2}[\s-]?\d{7}/;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useApp();
  const { data: conv } = useLoad(() => backend.getConversation(id), [id]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const list = useRef<FlatList<Message>>(null);

  useEffect(() => {
    let alive = true;
    backend.listMessages(id).then(m => alive && setMsgs(m));
    const off = backend.subscribeMessages(id, m => setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m])));
    return () => { alive = false; off(); };
  }, [id]);

  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50); }, [msgs.length]);

  async function send(body: string) {
    const b = body.trim();
    if (!b) return;
    if (PHONE_RE.test(b.replace(/[^\d+\s-]/g, ' '))) {
      toast('For your safety, numbers are shared only after a deal is agreed. Send an offer instead.');
      return;
    }
    setText('');
    try {
      const m = await backend.sendMessage(id, b);
      setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
    } catch (e: any) { toast(e.message); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title={conv?.other?.name || 'Chat'} />
      {conv?.listing ? (
        <Pressable onPress={() => router.push(`/listing/${conv.listing_id}`)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, paddingHorizontal: 14, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ width: 44 }}><ListingPhoto listing={conv.listing} height={44} radius={12} /></View>
          <View style={{ flex: 1 }}>
            <Txt v="smallStrong" numberOfLines={1}>{conv.listing.title}</Txt>
            <Txt v="tiny" muted>{rsShort(conv.listing.price)} · tap to make an offer</Txt>
          </View>
          <Icon name="chevron-forward" size={18} color={c.muted} />
        </Pressable>
      ) : null}
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 14, gap: 8, flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 40 }}>
            <Icon name="lock-closed" size={22} color={c.muted} />
            <Txt v="small" muted style={{ textAlign: 'center', maxWidth: 280 }}>Chat inside Sauda. Your number stays hidden until you both agree on a deal.</Txt>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === session?.userId;
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: mine ? c.brand : c.card, borderWidth: mine ? 0 : 1, borderColor: c.line, borderRadius: 18, borderBottomRightRadius: mine ? 6 : 18, borderBottomLeftRadius: mine ? 18 : 6, paddingHorizontal: 14, paddingVertical: 9 }}>
              <Txt color={mine ? '#fff' : c.ink}>{item.body}</Txt>
              <Txt v="tiny" color={mine ? 'rgba(255,255,255,0.7)' : c.muted} style={{ alignSelf: 'flex-end', marginTop: 2 }}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Txt>
            </View>
          );
        }}
      />
      <View style={{ backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom + 8, paddingTop: 8 }}>
        <FlatList horizontal data={QUICK} keyExtractor={q => q} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => send(item)} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Txt v="tiny">{item}</Txt>
            </Pressable>
          )} />
        <Row gap={8} style={{ paddingHorizontal: 12, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          <TextInput value={text} onChangeText={setText} placeholder="Type a message" placeholderTextColor={c.muted}
            onSubmitEditing={() => send(text)} returnKeyType="send"
            style={[{ flex: 1, height: 46, borderRadius: 23, backgroundColor: c.input, paddingHorizontal: 16, color: c.ink, fontFamily: font.medium, fontSize: 15 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
          <Pressable onPress={() => send(text)} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={19} color="#fff" />
          </Pressable>
        </Row>
      </View>
    </KeyboardAvoidingView>
  );
}
