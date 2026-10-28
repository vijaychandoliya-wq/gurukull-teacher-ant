import React, { useCallback, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Tabs, View, WhiteSpace } from '@ant-design/react-native';
import { AnyRecord, getEvents } from '../api';
import { useAsyncData } from '../hooks';
import {
  EmptyBlock,
  LoadingBlock,
  PageTitle,
  RecordCard,
  Screen,
  SectionTitle,
} from '../components/ui';
import { radius, useThemedStyles, type AppColors } from '../theme';

const TABS: { title: string; scope: 'upcoming' | 'past' | 'school' }[] = [
  { title: 'Upcoming', scope: 'upcoming' },
  { title: 'Past', scope: 'past' },
  { title: 'School', scope: 'school' },
];

export default function EventsScreen() {
  const styles = useThemedStyles(createStyles);

  const [tab, setTab] = useState(0);
  const scope = TABS[tab].scope;
  const loader = useCallback(() => getEvents(scope), [scope]);
  const { data, loading, refreshing, error, refresh, clearError } =
    useAsyncData<AnyRecord[]>(loader, []);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      error={error}
      onDismissError={clearError}
    >
      <PageTitle
        title="Events"
        subtitle="What is happening around the school."
      />

      <Tabs
        tabs={TABS.map(item => ({ title: item.title, key: item.scope }))}
        page={tab}
        onChange={(_item, index) => setTab(index)}
        swipeable={false}
        noRenderContent
      >
        <View />
      </Tabs>
      <WhiteSpace size="lg" />

      {loading ? (
        <LoadingBlock />
      ) : data.length ? (
        <>
          <SectionTitle
            title={`${data.length} ${data.length === 1 ? 'event' : 'events'}`}
          />
          {data.map((event, index) => (
            <RecordCard
              key={event.event_id || index}
              title={event.title || 'Event'}
              status={event.category}
              icon="flag"
              meta={[
                event.start_date
                  ? `${event.start_date}${
                      event.end_date ? ` — ${event.end_date}` : ''
                    }`
                  : null,
                event.location ? `At ${event.location}` : null,
                event.photos ? `${event.photos} photos` : null,
              ]}
              body={event.description}
              footer={
                event.image ? (
                  <>
                    <WhiteSpace size="sm" />
                    <Image
                      source={{ uri: event.image }}
                      style={styles.banner}
                      resizeMode="cover"
                    />
                  </>
                ) : undefined
              }
            />
          ))}
        </>
      ) : (
        <EmptyBlock
          title="No events"
          message="Scheduled events will appear here."
          icon="flag"
        />
      )}
    </Screen>
  );
}

const createStyles = (_colors: AppColors) =>
  StyleSheet.create({
    banner: { width: '100%', height: 150, borderRadius: radius.m },
  });
