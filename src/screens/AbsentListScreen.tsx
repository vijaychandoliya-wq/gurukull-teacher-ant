import React, {useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Card, DatePicker, Flex, List, Picker, Text, View, WhiteSpace} from '@ant-design/react-native';
import {AnyRecord, getAbsentList} from '../api';
import {formatDate, useAsyncData} from '../hooks';
import {AntIcon, EmptyBlock, LoadingBlock, PageTitle, Screen, SectionTitle} from '../components/ui';
import {ScreenParams} from '../navigation';
import {colors, font, radius, spacing} from '../theme';

const SESSIONS = [
  {label: 'Forenoon', value: 'forenoon'},
  {label: 'Afternoon', value: 'afternoon'},
];

/** Who was marked absent on a given day, for a roll already submitted. */
export default function AbsentListScreen({params}: {params?: ScreenParams}) {
  const [date, setDate] = useState(new Date());
  const [session, setSession] = useState<any[]>(['forenoon']);
  const classId = params?.classId;

  const loader = useCallback(async () => {
    if (!classId) {
      return [];
    }
    return getAbsentList(classId, formatDate(date), String(session[0]));
  }, [classId, date, session]);

  const {data, loading, refreshing, error, refresh, clearError} = useAsyncData<AnyRecord[]>(loader, []);

  if (!classId) {
    return (
      <Screen>
        <EmptyBlock title="No class" message="Open this from the Attendance screen." icon="team" />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Absentees" subtitle={params?.className || 'Attendance already recorded.'} />

      <Card>
        <Card.Body>
          <List>
            <DatePicker value={date} mode="date" maxDate={new Date()} onChange={setDate}>
              <List.Item arrow="horizontal">Date</List.Item>
            </DatePicker>
            <Picker data={SESSIONS} cols={1} value={session} onChange={setSession} onOk={setSession}>
              <List.Item arrow="horizontal">Session</List.Item>
            </Picker>
          </List>
        </Card.Body>
      </Card>

      <WhiteSpace size="xl" />

      {loading ? (
        <LoadingBlock />
      ) : data.length ? (
        <>
          <SectionTitle title={`${data.length} absent`} />
          <Card>
            <Card.Body>
              {data.map((student, index) => (
                <View key={student.id || index} style={styles.row}>
                  <Flex align="center">
                    <View style={styles.avatar}>
                      <AntIcon name="user" size={18} color={colors.danger} />
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.name}>{student.name || student.student_name || 'Student'}</Text>
                      <Text style={styles.reason}>
                        {student.reason || student.absent_reason || 'No reason recorded'}
                        {student.remarks ? ` · ${student.remarks}` : ''}
                      </Text>
                    </View>
                  </Flex>
                </View>
              ))}
            </Card.Body>
          </Card>
        </>
      ) : (
        <EmptyBlock
          title="Full attendance"
          message="Nobody was marked absent for this date and session."
          icon="check-circle"
        />
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
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.m,
    backgroundColor: '#fff1f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  info: {flex: 1},
  name: {fontSize: font.l, color: colors.text, fontWeight: '500'},
  reason: {fontSize: font.ms, color: colors.textSecondary, marginTop: 2},
});
