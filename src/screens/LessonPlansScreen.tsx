import React, {useCallback} from 'react';
import {Button, Toast, WhiteSpace} from '@ant-design/react-native';
import {AnyRecord, getLessonPlans, publishLessonPlan} from '../api';
import {friendlyError, useAsyncData} from '../hooks';
import {EmptyBlock, LoadingBlock, PageTitle, RecordCard, Screen, SectionTitle} from '../components/ui';

export default function LessonPlansScreen() {
  const loader = useCallback(() => getLessonPlans(), []);
  const {data, loading, refreshing, error, setError, reload, refresh, clearError} = useAsyncData<AnyRecord[]>(
    loader,
    [],
  );

  const publish = async (plan: AnyRecord) => {
    try {
      await publishLessonPlan(plan.id);
      Toast.success('Lesson plan published', 2);
      await reload();
    } catch (reason) {
      setError(friendlyError(reason));
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Lesson plans" subtitle="Unit plans you have drafted, submitted or published." />

      {data.length ? (
        <>
          <SectionTitle title={`${data.length} ${data.length === 1 ? 'plan' : 'plans'}`} />
          {data.map((plan, index) => (
            <RecordCard
              key={plan.id || index}
              title={plan.title || `Unit ${plan.unitNo || ''}`}
              status={plan.is_published ? 'Published' : plan.status}
              icon="read"
              meta={[
                `${plan.subject || ''} · ${plan.class || ''}`,
                plan.unitName ? `Unit ${plan.unitNo || ''}: ${plan.unitName}` : null,
                plan.start_date ? `${plan.start_date} — ${plan.end_date || 'ongoing'}` : null,
                plan.duration ? `Duration: ${plan.duration}` : null,
                plan.published_at ? `Published ${plan.published_at}` : null,
              ]}
              footer={
                !plan.is_published ? (
                  <>
                    <WhiteSpace size="sm" />
                    <Button size="small" type="primary" onPress={() => publish(plan)}>
                      Publish
                    </Button>
                  </>
                ) : undefined
              }
            />
          ))}
        </>
      ) : (
        <EmptyBlock
          title="No lesson plans"
          message="Lesson plans created on the web portal appear here."
          icon="read"
        />
      )}
    </Screen>
  );
}
