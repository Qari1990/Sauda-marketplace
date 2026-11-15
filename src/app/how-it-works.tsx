import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { Button, Card, Icon, IconName, Row, Screen, TopBar, Txt } from '@/components/ui';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'add-circle', title: '1. Seller posts for free', text: 'Photos, price and city. The phone number is never shown on the ad.' },
  { icon: 'pricetag', title: '2. Buyers send their best offer', text: 'Each offer has a timer (2 hours to 2 days). After that it expires on its own, so nobody waits forever.' },
  { icon: 'eye', title: '3. Everyone sees the offer board', text: 'All offers on an ad are public: amount, time left and status. Buyer names stay hidden, so there is no pressure or harassment.' },
  { icon: 'swap-horizontal', title: '4. Accept, decline or counter', text: 'The seller can accept, decline, or send a counter price. The buyer can accept the counter in one tap.' },
  { icon: 'call', title: '5. Numbers shared only on agreement', text: 'When both agree, the deal opens and both can see each other\'s number. Every time a number is opened, it is logged for both to see.' },
  { icon: 'star', title: '6. Ratings only after real deals', text: 'After both confirm the hand-over, they can rate each other. People who back out of agreed deals get a public back-out count.' },
];

export default function HowItWorks() {
  const { c } = useTheme();
  return (
    <Screen header={<TopBar title="How Sauda works" />} maxWidth={720}>
      <Txt v="h1">Khula sauda, saaf deal.</Txt>
      <Txt muted>Sauda is a marketplace built on transparency, so buyers and sellers can trust each other.</Txt>
      {STEPS.map(s => (
        <Card key={s.title}>
          <Row gap={14} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={s.icon} size={22} color={c.brand} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="h3">{s.title}</Txt>
              <Txt v="small" muted>{s.text}</Txt>
            </View>
          </Row>
        </Card>
      ))}
      <Button title="Start browsing" size="lg" onPress={() => router.replace('/')} />
    </Screen>
  );
}
