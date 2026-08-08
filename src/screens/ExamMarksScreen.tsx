import React, {useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Button, Card, Flex, Input, Switch, Text, Toast, View, WhiteSpace} from '@ant-design/react-native';
import {AnyRecord, getExamMarks, getExamStudents, saveExamMarks} from '../api';
import {friendlyError, useAsyncData} from '../hooks';
import {
  AntIcon,
  EmptyBlock,
  LoadingBlock,
  PageTitle,
  Screen,
  StatCard,
  StatusTag,
} from '../components/ui';
import {ScreenParams} from '../navigation';
import {colors, font, spacing} from '../theme';

/**
 * Mark entry and read-only mark review for one exam schedule.
 *
 * `mode: 'edit'` loads the class roll pre-filled with anything already saved —
 * submitting upserts, so the screen can be reopened to correct a score.
 */
export default function ExamMarksScreen({params}: {params?: ScreenParams}) {
  const scheduleId = params?.scheduleId;
  const mode = params?.mode === 'view' ? 'view' : 'edit';

  const loader = useCallback(async () => {
    if (!scheduleId) {
      return [];
    }
    return mode === 'view' ? getExamMarks(scheduleId) : getExamStudents(scheduleId);
  }, [scheduleId, mode]);

  const {data, setData, loading, refreshing, error, setError, refresh, clearError} = useAsyncData<AnyRecord[]>(
    loader,
    [],
  );
  const [saving, setSaving] = useState(false);

  if (!scheduleId) {
    return (
      <Screen>
        <EmptyBlock title="No exam selected" message="Open a paper from the Exams screen." icon="solution" />
      </Screen>
    );
  }

  if (loading) {
    return <LoadingBlock />;
  }

  if (mode === 'view') {
    const passed = data.filter(mark => String(mark.mark_status).toLowerCase() === 'pass').length;
    const absent = data.filter(mark => String(mark.mark_status).toLowerCase() === 'absent').length;

    return (
      <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
        <PageTitle title="Recorded marks" subtitle={params?.title} />
        {data.length ? (
          <>
            <Flex justify="between">
              <StatCard icon="team" value={data.length} label="Students" />
              <StatCard icon="check-circle" value={passed} label="Passed" color={colors.success} />
              <StatCard icon="close-circle" value={absent} label="Absent" color={colors.danger} />
            </Flex>
            <WhiteSpace size="xl" />
            <Card>
              <Card.Body>
                {data.map((mark, index) => (
                  <View key={mark.mark_id || index} style={styles.row}>
                    <Flex justify="between" align="center">
                      <View style={styles.info}>
                        <Text style={styles.name}>{mark.student_name}</Text>
                        <Text style={styles.meta}>
                          {mark.subject_name} · {mark.standard_name}
                        </Text>
                      </View>
                      <Flex align="center">
                        <Text style={styles.score}>{mark.obtained_marks}</Text>
                        <View style={styles.tagGap} />
                        <StatusTag status={mark.mark_status} />
                      </Flex>
                    </Flex>
                  </View>
                ))}
              </Card.Body>
            </Card>
          </>
        ) : (
          <EmptyBlock title="No marks yet" message="Nothing has been recorded for this paper." icon="edit" />
        )}
      </Screen>
    );
  }

  const update = (userId: string | number, patch: Partial<AnyRecord>) => {
    setData(current =>
      current.map(student => (String(student.user_id) === String(userId) ? {...student, ...patch} : student)),
    );
  };

  const entered = data.filter(student => student.status === 'absent' || String(student.marks || '').trim() !== '')
    .length;

  const save = async () => {
    if (!entered) {
      setError('Enter at least one mark before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveExamMarks(
        scheduleId,
        data.map(student => ({
          user_id: student.user_id,
          marks: String(student.marks ?? ''),
          status: student.status || 'present',
        })),
      );
      Toast.success('Marks saved', 2);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Enter marks" subtitle={params?.title} />

      {data.length ? (
        <>
          <Flex justify="between">
            <StatCard icon="team" value={data.length} label="Students" />
            <StatCard icon="edit" value={entered} label="Entered" color={colors.cyan} />
            <StatCard
              icon="close-circle"
              value={data.filter(student => student.status === 'absent').length}
              label="Absent"
              color={colors.danger}
            />
          </Flex>
          <WhiteSpace size="xl" />

          <Card>
            <Card.Header title={data[0]?.class || 'Class'} thumb={<AntIcon name="edit" />} />
            <Card.Body>
              {data.map(student => {
                const absent = student.status === 'absent';
                return (
                  <View key={student.user_id} style={styles.row}>
                    <Flex justify="between" align="center">
                      <View style={styles.info}>
                        <Text style={[styles.name, absent && styles.absentName]}>{student.name}</Text>
                        <Text style={styles.meta}>{absent ? 'Marked absent' : 'Present'}</Text>
                      </View>
                      <Flex align="center">
                        {!absent ? (
                          <View style={styles.markInput}>
                            <Input
                              value={String(student.marks ?? '')}
                              onChangeText={value => update(student.user_id, {marks: value})}
                              keyboardType="numeric"
                              placeholder="—"
                              inputStyle={styles.markInputText}
                            />
                          </View>
                        ) : null}
                        <View style={styles.tagGap} />
                        <Switch
                          checked={absent}
                          color={colors.danger}
                          onChange={value =>
                            update(student.user_id, {
                              status: value ? 'absent' : 'present',
                              marks: value ? '' : student.marks,
                            })
                          }
                        />
                      </Flex>
                    </Flex>
                  </View>
                );
              })}
            </Card.Body>
          </Card>

          <WhiteSpace size="xl" />
          <Button type="primary" size="large" loading={saving} disabled={saving} onPress={save}>
            Save marks
          </Button>
          <WhiteSpace size="sm" />
          <Text style={styles.hint}>Toggle a student to mark them absent. Saving again corrects earlier marks.</Text>
        </>
      ) : (
        <EmptyBlock title="No students" message="This class has no enrolled students." icon="team" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  info: {flex: 1},
  name: {fontSize: font.l, color: colors.text, fontWeight: '500'},
  absentName: {color: colors.danger},
  meta: {fontSize: font.ms, color: colors.weak, marginTop: 2},
  score: {fontSize: font.xl, fontWeight: '700', color: colors.text},
  tagGap: {width: spacing.s},
  markInput: {width: 68},
  markInputText: {textAlign: 'center'},
  hint: {fontSize: font.ms, color: colors.weak, textAlign: 'center'},
});
