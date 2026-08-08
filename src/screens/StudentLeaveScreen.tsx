import React, {useCallback, useState} from 'react';
import {Tabs, View, WhiteSpace} from '@ant-design/react-native';
import {
  AnyRecord,
  FORBIDDEN,
  MaybeForbidden,
  approveStudentLeave,
  getStudentLeaves,
  rejectStudentLeave,
} from '../api';
import {useAsyncData} from '../hooks';
import {ApprovalActions} from '../components/ApprovalActions';
import {EmptyBlock, LoadingBlock, PageTitle, RecordCard, Screen, SectionTitle} from '../components/ui';

const TABS: {title: string; scope: 'pending' | 'approved' | 'rejected'}[] = [
  {title: 'Pending', scope: 'pending'},
  {title: 'Approved', scope: 'approved'},
  {title: 'Rejected', scope: 'rejected'},
];

export default function StudentLeaveScreen() {
  const [tab, setTab] = useState(0);
  const scope = TABS[tab].scope;

  const loader = useCallback(() => getStudentLeaves(scope), [scope]);
  const {data, loading, refreshing, error, setError, reload, refresh, clearError} = useAsyncData<
    MaybeForbidden<AnyRecord[]>
  >(loader, []);

  if (loading) {
    return <LoadingBlock />;
  }

  if (data === FORBIDDEN) {
    return (
      <Screen>
        <PageTitle title="Student leave" />
        <EmptyBlock
          title="Not available"
          message="Approving student leave needs the student leave checker role. Ask your admin if you should have it."
          icon="lock"
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Student leave" subtitle="Leave requests from students in your classes." />

      <Tabs
        tabs={TABS.map(item => ({title: item.title, key: item.scope}))}
        page={tab}
        onChange={(_item, index) => setTab(index)}
        swipeable={false}
        noRenderContent>
        <View />
      </Tabs>
      <WhiteSpace size="lg" />

      {data.length ? (
        <>
          <SectionTitle title={`${data.length} ${data.length === 1 ? 'request' : 'requests'}`} />
          {data.map((leave, index) => (
            <RecordCard
              key={leave.id || index}
              title={leave.name || 'Student'}
              status={leave.status_name || leave.status}
              icon="team"
              meta={[
                leave.standard_name ? String(leave.standard_name) : null,
                `${leave.from} — ${leave.to}`,
                leave.reason ? `Reason: ${leave.reason}` : null,
                leave.approved_by && scope !== 'pending' ? `Decided by ${leave.approved_by}` : null,
              ]}
              body={leave.remarks || leave.comments}
              footer={
                scope === 'pending' ? (
                  <ApprovalActions
                    label={`${leave.name || 'this student'}'s leave`}
                    onApprove={comments => approveStudentLeave(leave.id, comments)}
                    onReject={comments => rejectStudentLeave(leave.id, comments)}
                    onDone={reload}
                    onError={setError}
                  />
                ) : undefined
              }
            />
          ))}
        </>
      ) : (
        <EmptyBlock
          title="Nothing here"
          message={scope === 'pending' ? 'No student leave is waiting on you.' : `No ${scope} requests.`}
          icon="team"
        />
      )}
    </Screen>
  );
}
