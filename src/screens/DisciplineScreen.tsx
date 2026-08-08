import React, {useCallback} from 'react';
import {Flex, WhiteSpace} from '@ant-design/react-native';
import {AnyRecord, getDisciplineRecords} from '../api';
import {useAsyncData} from '../hooks';
import {
  EmptyBlock,
  LoadingBlock,
  PageTitle,
  RecordCard,
  Screen,
  SectionTitle,
  StatCard,
} from '../components/ui';
import {colors} from '../theme';

/** The API stores both commendations and incidents under `type`. */
const isPositive = (type?: string) => /positive|good|appreciat|commend|reward/i.test(String(type || ''));

export default function DisciplineScreen() {
  const loader = useCallback(() => getDisciplineRecords(), []);
  const {data, loading, refreshing, error, refresh, clearError} = useAsyncData<AnyRecord[]>(loader, []);

  if (loading) {
    return <LoadingBlock />;
  }

  const positive = data.filter(record => isPositive(record.type)).length;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Performance" subtitle="Behaviour notes and commendations you have recorded." />

      {data.length ? (
        <>
          <Flex justify="between">
            <StatCard icon="profile" value={data.length} label="Records" />
            <StatCard icon="like" value={positive} label="Positive" color={colors.success} />
            <StatCard icon="warning" value={data.length - positive} label="Concerns" color={colors.warning} />
          </Flex>
          <WhiteSpace size="xl" />

          <SectionTitle title="All records" />
          {data.map((record, index) => (
            <RecordCard
              key={record.id || index}
              title={record.student_name || 'Student'}
              status={record.type || 'Note'}
              icon={isPositive(record.type) ? 'like' : 'warning'}
              meta={[
                record.class_name ? String(record.class_name) : null,
                record.incidentDate ? `Recorded ${record.incidentDate}` : null,
                record.action_taken ? `Action: ${record.action_taken}` : null,
                record.notifyParents ? 'Parents notified' : null,
              ]}
              body={record.incidentDetail}
            />
          ))}
        </>
      ) : (
        <EmptyBlock
          title="No records"
          message="Behaviour notes you record for students will appear here."
          icon="trophy"
        />
      )}
    </Screen>
  );
}
