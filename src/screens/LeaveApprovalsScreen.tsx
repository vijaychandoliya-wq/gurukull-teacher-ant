import React, {useCallback, useState} from 'react';
import {Tabs, View, WhiteSpace} from '@ant-design/react-native';
import {
  AnyRecord,
  FORBIDDEN,
  MaybeForbidden,
  approveLeaveRequest,
  getLeaveApprovals,
  rejectLeaveRequest,
} from '../api';
import {useAsyncData} from '../hooks';
import {ApprovalActions} from '../components/ApprovalActions';
import {EmptyBlock, LoadingBlock, PageTitle, RecordCard, Screen, SectionTitle} from '../components/ui';

const TABS: {title: string; scope: 'pending' | 'approved' | 'rejected'}[] = [
  {title: 'Pending', scope: 'pending'},
  {title: 'Approved', scope: 'approved'},
  {title: 'Rejected', scope: 'rejected'},
];

export default function LeaveApprovalsScreen() {
  const [tab, setTab] = useState(0);
  const scope = TABS[tab].scope;

  const loader = useCallback(() => getLeaveApprovals(scope), [scope]);
  const {data, loading, refreshing, error, setError, reload, refresh, clearError} = useAsyncData<
    MaybeForbidden<AnyRecord[]>
  >(loader, []);

  if (loading) {
    return <LoadingBlock />;
  }

  if (data === FORBIDDEN) {
    return (
      <Screen>
        <PageTitle title="Leave approvals" />
        <EmptyBlock
          title="Not available"
          message="Approving staff leave needs the leave checker role. Ask your admin if you should have it."
          icon="lock"
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Leave approvals" subtitle="Staff leave waiting on your decision." />

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
              title={leave.teacher_name || 'Teacher'}
              status={leave.status}
              icon="user"
              meta={[
                `${leave.leave_type || 'Leave'} · ${leave.leave_days || 1} day(s) · ${leave.session || 'Full day'}`,
                `${leave.from_date} — ${leave.to_date}`,
                leave.reason ? `Reason: ${leave.reason}` : null,
                leave.applied_at ? `Applied ${leave.applied_at}` : null,
                leave.approved_by && scope !== 'pending' ? `Decided by ${leave.approved_by}` : null,
              ]}
              body={leave.remarks || leave.comments}
              footer={
                scope === 'pending' ? (
                  <ApprovalActions
                    label={`${leave.teacher_name || 'this teacher'}'s leave`}
                    onApprove={comments => approveLeaveRequest(leave.id, comments)}
                    onReject={comments => rejectLeaveRequest(leave.id, comments)}
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
          message={scope === 'pending' ? 'No leave is waiting for your decision.' : `No ${scope} requests.`}
          icon="form"
        />
      )}
    </Screen>
  );
}
