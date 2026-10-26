import React, {useCallback} from 'react';
import {StyleSheet} from 'react-native';
import {Badge, Button, Flex, Text, View, WhiteSpace} from '@ant-design/react-native';
import {AnyRecord, getExams} from '../api';
import {useAsyncData} from '../hooks';
import {AntIcon, Card, EmptyBlock, LoadingBlock, PageTitle, Screen} from '../components/ui';
import {ScreenKey, ScreenParams} from '../navigation';
import {colors, font, radius, spacing} from '../theme';

export default function ExamsScreen({
  navigate,
}: {
  navigate: (screen: ScreenKey, params?: ScreenParams) => void;
}) {
  const loader = useCallback(() => getExams(), []);
  const {data, loading, refreshing, error, refresh, clearError} = useAsyncData<AnyRecord[]>(loader, []);

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Exams & marks" subtitle="Exam schedules for the classes you are class teacher of." />

      {data.length ? (
        data.map((exam, index) => (
          <React.Fragment key={exam.exam_id || index}>
            <Card>
              <Card.Header
                title={exam.name || 'Exam'}
                thumb={<AntIcon name="solution" />}
                extra={<Badge text={`${(exam.schedule || []).length} papers`} />}
              />
              <Card.Body>
                <Text style={styles.className}>{exam.exam_standard || 'Your class'}</Text>
                {(exam.schedule || []).map((schedule: AnyRecord) => (
                  <View key={schedule.schedule_id} style={styles.scheduleRow}>
                    <Flex justify="between" align="start">
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.subject}>{schedule.subject_name || 'Subject'}</Text>
                        <Text style={styles.meta}>
                          <AntIcon name="calendar" size={13} color={colors.weak} /> {schedule.exam_date || '—'}
                          {schedule.start_time ? ` · ${schedule.start_time}–${schedule.end_time}` : ''}
                        </Text>
                        {schedule.portion ? <Text style={styles.portion}>{schedule.portion}</Text> : null}
                      </View>
                    </Flex>
                    <WhiteSpace size="sm" />
                    <Flex>
                      <Button
                        size="small"
                        type="primary"
                        style={styles.action}
                        onPress={() =>
                          navigate('examMarks', {
                            scheduleId: schedule.schedule_id,
                            title: `${schedule.subject_name || 'Subject'} · ${exam.name || 'Exam'}`,
                            mode: 'edit',
                          })
                        }>
                        Enter marks
                      </Button>
                      <View style={styles.actionGap} />
                      <Button
                        size="small"
                        style={styles.action}
                        onPress={() =>
                          navigate('examMarks', {
                            scheduleId: schedule.schedule_id,
                            title: `${schedule.subject_name || 'Subject'} · ${exam.name || 'Exam'}`,
                            mode: 'view',
                          })
                        }>
                        View marks
                      </Button>
                    </Flex>
                  </View>
                ))}
              </Card.Body>
            </Card>
            <WhiteSpace size="lg" />
          </React.Fragment>
        ))
      ) : (
        <EmptyBlock
          title="No exams scheduled"
          message="Exam schedules for your class will appear here once the admin publishes them."
          icon="solution"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  className: {fontSize: font.main, color: colors.primary, marginBottom: spacing.s},
  scheduleRow: {
    paddingVertical: spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  scheduleInfo: {flex: 1},
  subject: {fontSize: font.l, fontWeight: '600', color: colors.text},
  meta: {fontSize: font.ms, color: colors.textSecondary, marginTop: 4},
  portion: {fontSize: font.ms, color: colors.weak, marginTop: 4},
  action: {flex: 1, borderRadius: radius.m},
  actionGap: {width: spacing.s},
});
