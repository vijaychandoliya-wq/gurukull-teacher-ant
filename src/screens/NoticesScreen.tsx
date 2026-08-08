import React, {useCallback, useState} from 'react';
import {Tabs, View, WhiteSpace} from '@ant-design/react-native';
import {AnyRecord, getExpiredNotices, getNotices} from '../api';
import {cleanDate, useAsyncData} from '../hooks';
import {EmptyBlock, LoadingBlock, PageTitle, RecordCard, Screen, SectionTitle} from '../components/ui';

const TABS = [
  {title: 'Active', key: 'active'},
  {title: 'Expired', key: 'expired'},
];

export default function NoticesScreen() {
  const [tab, setTab] = useState(0);
  const loader = useCallback(() => (tab === 0 ? getNotices() : getExpiredNotices()), [tab]);
  const {data, loading, refreshing, error, refresh, clearError} = useAsyncData<AnyRecord[]>(loader, []);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Notice board" subtitle="Announcements from your school." />

      <Tabs tabs={TABS} page={tab} onChange={(_item, index) => setTab(index)} swipeable={false} noRenderContent>
        <View />
      </Tabs>
      <WhiteSpace size="lg" />

      {loading ? (
        <LoadingBlock />
      ) : data.length ? (
        <>
          <SectionTitle title={`${data.length} ${data.length === 1 ? 'notice' : 'notices'}`} />
          {data.map((notice, index) => (
            <RecordCard
              key={notice.id || index}
              title={notice.title || 'School notice'}
              status={notice.type}
              icon="notification"
              meta={[
                notice.class_name && notice.class_name !== '--' ? `For ${notice.class_name}` : 'Whole school',
                notice.publish_date ? `Published ${cleanDate(notice.publish_date)}` : null,
                notice.expire_date ? `Expires ${cleanDate(notice.expire_date)}` : null,
              ]}
              body={notice.description}
            />
          ))}
        </>
      ) : (
        <EmptyBlock
          title="No notices"
          message={tab === 0 ? 'New announcements will appear here.' : 'No notices have expired yet.'}
          icon="bell"
        />
      )}
    </Screen>
  );
}
