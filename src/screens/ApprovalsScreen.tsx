import React, {useCallback, useState} from 'react';
import {Tabs, View, WhiteSpace} from '@ant-design/react-native';
import {
  AnyRecord,
  FORBIDDEN,
  MaybeForbidden,
  approveHomework,
  approveLessonPlan,
  getPendingApprovals,
  rejectHomework,
  rejectLessonPlan,
} from '../api';
import {useAsyncData} from '../hooks';
import {ApprovalActions} from '../components/ApprovalActions';
import {EmptyBlock, LoadingBlock, PageTitle, RecordCard, Screen, SectionTitle} from '../components/ui';

type Approvals = {homework: AnyRecord[]; lessonPlans: AnyRecord[]};

const EMPTY: Approvals = {homework: [], lessonPlans: []};

const TABS = [
  {title: 'Homework', key: 'homework'},
  {title: 'Lesson plans', key: 'lessonPlans'},
];

/**
 * Principal sign-off queue.
 *
 * Homework and lesson plans are the two modules whose approve/reject endpoints
 * take an id the app can discover from a list. Assignment approval uses the
 * same buttons but its pending queue is only exposed on the web portal, so it
 * is not listed here.
 */
export default function ApprovalsScreen() {
  const [tab, setTab] = useState(0);

  const loader = useCallback(() => getPendingApprovals(), []);
  const {data, loading, refreshing, error, setError, reload, refresh, clearError} = useAsyncData<
    MaybeForbidden<Approvals>
  >(loader, EMPTY);

  if (loading) {
    return <LoadingBlock />;
  }

  if (data === FORBIDDEN) {
    return (
      <Screen>
        <PageTitle title="Approvals" />
        <EmptyBlock
          title="Not available"
          message="Approving other teachers' work needs the principal role."
          icon="lock"
        />
      </Screen>
    );
  }

  const items = tab === 0 ? data.homework : data.lessonPlans;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Approvals" subtitle="Work from your teachers waiting on sign-off." />

      <Tabs tabs={TABS} page={tab} onChange={(_item, index) => setTab(index)} swipeable={false} noRenderContent>
        <View />
      </Tabs>
      <WhiteSpace size="lg" />

      {items.length ? (
        <>
          <SectionTitle title={`${items.length} awaiting`} />
          {items.map((item, index) =>
            tab === 0 ? (
              <RecordCard
                key={item.id || index}
                title={`${item.subject_name || 'Homework'} · ${item.class_name || ''}`}
                status={item.status_display || item.status}
                icon="book"
                meta={[
                  item.created_by ? `By ${item.created_by}` : null,
                  item.date ? `Given ${item.date}` : null,
                  item.submission_date ? `Due ${item.submission_date}` : null,
                ]}
                body={item.description}
                footer={
                  <ApprovalActions
                    label={`this ${item.subject_name || ''} homework`}
                    onApprove={comments => approveHomework(item.id, comments)}
                    onReject={comments => rejectHomework(item.id, comments)}
                    onDone={reload}
                    onError={setError}
                  />
                }
              />
            ) : (
              <RecordCard
                key={item.id || index}
                title={item.title || `Unit ${item.unitNo || ''}`}
                status={item.status}
                icon="read"
                meta={[
                  `${item.subject || ''} · ${item.class || ''}`,
                  item.teacherFullname ? `By ${item.teacherFullname}` : null,
                  item.start_date ? `${item.start_date} — ${item.end_date || 'ongoing'}` : null,
                ]}
                footer={
                  <ApprovalActions
                    label={`the lesson plan “${item.title || ''}”`}
                    onApprove={comments => approveLessonPlan(item.id, comments)}
                    onReject={comments => rejectLessonPlan(item.id, comments)}
                    onDone={reload}
                    onError={setError}
                  />
                }
              />
            ),
          )}
        </>
      ) : (
        <EmptyBlock
          title="All clear"
          message="Nothing is waiting for your approval right now."
          icon="check-circle"
        />
      )}
    </Screen>
  );
}
