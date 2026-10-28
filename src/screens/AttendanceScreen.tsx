import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Button,
  DatePicker,
  Flex,
  List,
  Modal,
  Picker,
  SearchBar,
  Switch,
  Text,
  Toast,
  View,
  WhiteSpace,
} from '@ant-design/react-native';
import { AnyRecord, getAttendanceForm, submitAttendance } from '../api';
import { formatDate, friendlyError, pickerData, useAsyncData } from '../hooks';
import {
  AntIcon,
  Card,
  EmptyBlock,
  LoadingBlock,
  PageTitle,
  Screen,
  SectionTitle,
  StatCard,
} from '../components/ui';
import { ScreenKey, ScreenParams } from '../navigation';
import {
  font,
  radius,
  spacing,
  useThemeColors,
  useThemedStyles,
  type AppColors,
} from '../theme';

type FormData = {
  standardlist: AnyRecord[];
  studentlist: AnyRecord[];
  absentReasonlist: AnyRecord[];
};

const EMPTY: FormData = {
  standardlist: [],
  studentlist: [],
  absentReasonlist: [],
};

const SESSIONS = [
  { label: 'Forenoon', value: 'forenoon' },
  { label: 'Afternoon', value: 'afternoon' },
];

/** An absentee awaiting a reason before the roll can be submitted. */
type Absentee = { reasonId: string; remarks: string };

export default function AttendanceScreen({
  navigate,
}: {
  navigate: (screen: ScreenKey, params?: ScreenParams) => void;
}) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const loader = useCallback(() => getAttendanceForm(), []);
  const { data, loading, refreshing, error, setError, refresh, clearError } =
    useAsyncData(loader, EMPTY);

  const [date, setDate] = useState(new Date());
  const [session, setSession] = useState<any[]>(['forenoon']);
  const [classId, setClassId] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [absentees, setAbsentees] = useState<Record<string, Absentee>>({});
  const [submitting, setSubmitting] = useState(false);

  const students = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return data.studentlist;
    }
    return data.studentlist.filter(student =>
      String(student.name || '')
        .toLowerCase()
        .includes(term),
    );
  }, [data.studentlist, query]);

  const selectedClass = classId[0] || data.studentlist[0]?.standardLink_id;
  const absentCount = Object.keys(absentees).length;
  const presentCount = data.studentlist.length - absentCount;

  const toggleAbsent = (studentId: string, absent: boolean) => {
    setAbsentees(current => {
      const next = { ...current };
      if (absent) {
        next[studentId] = {
          reasonId: String(data.absentReasonlist[0]?.id || ''),
          remarks: '',
        };
      } else {
        delete next[studentId];
      }
      return next;
    });
  };

  const setReason = (studentId: string, reasonId: string) => {
    setAbsentees(current => ({
      ...current,
      [studentId]: { ...current[studentId], reasonId },
    }));
  };

  const submit = () => {
    if (!selectedClass) {
      setError('No class is assigned to you for attendance.');
      return;
    }
    const missingReason = Object.entries(absentees).find(
      ([, value]) => !value.reasonId,
    );
    if (missingReason) {
      setError('Pick an absence reason for every absent student.');
      return;
    }

    Modal.alert(
      'Submit attendance',
      `${presentCount} present · ${absentCount} absent for ${
        session[0]
      } on ${formatDate(
        date,
      )}. Parents of absent students are notified immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            setError('');
            try {
              await submitAttendance({
                Standardlinkid: selectedClass,
                Date: formatDate(date),
                Session: String(session[0] || 'forenoon'),
                AbsentList: Object.entries(absentees).map(
                  ([studentId, value]) => ({
                    student_id: studentId,
                    reasonId: value.reasonId,
                    remarks: value.remarks,
                  }),
                ),
              });
              Toast.success('Attendance recorded', 2);
              setAbsentees({});
            } catch (reason) {
              setError(friendlyError(reason));
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <LoadingBlock />;
  }

  if (!data.studentlist.length) {
    return (
      <Screen
        refreshing={refreshing}
        onRefresh={refresh}
        error={error}
        onDismissError={clearError}
      >
        <PageTitle
          title="Attendance"
          subtitle="Mark the daily roll for your class."
        />
        <EmptyBlock
          title="No class assigned"
          message="Attendance is only available to a class teacher. Ask your admin to assign you a class."
          icon="team"
        />
      </Screen>
    );
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      error={error}
      onDismissError={clearError}
    >
      <PageTitle
        title="Attendance"
        subtitle="Mark absentees — everyone else is recorded present."
      />

      <Flex justify="between">
        <StatCard
          icon="team"
          value={data.studentlist.length}
          label="Students"
        />
        <StatCard
          icon="check-circle"
          value={presentCount}
          label="Present"
          color={colors.success}
        />
        <StatCard
          icon="close-circle"
          value={absentCount}
          label="Absent"
          color={colors.danger}
        />
      </Flex>

      <WhiteSpace size="xl" />
      <Card>
        <Card.Header title="Roll details" thumb={<AntIcon name="calendar" />} />
        <Card.Body>
          <List>
            <DatePicker
              value={date}
              mode="date"
              maxDate={new Date()}
              onChange={setDate}
            >
              <List.Item arrow="horizontal">Date</List.Item>
            </DatePicker>
            <Picker
              data={SESSIONS}
              cols={1}
              value={session}
              onChange={setSession}
              onOk={setSession}
            >
              <List.Item arrow="horizontal">Session</List.Item>
            </Picker>
            {data.standardlist.length > 1 ? (
              <Picker
                data={pickerData(data.standardlist, 'standard_section')}
                cols={1}
                value={classId}
                onChange={setClassId}
                onOk={setClassId}
              >
                <List.Item arrow="horizontal">Class</List.Item>
              </Picker>
            ) : (
              <List.Item extra={data.studentlist[0]?.class || '—'}>
                Class
              </List.Item>
            )}
          </List>
        </Card.Body>
      </Card>

      <WhiteSpace size="xl" />
      <SectionTitle
        title="Students"
        extra={<Text style={styles.hint}>Toggle to mark absent</Text>}
      />
      <SearchBar
        value={query}
        placeholder="Search a student"
        onChange={setQuery}
        onCancel={() => setQuery('')}
      />
      <WhiteSpace size="lg" />

      {students.length ? (
        <Card>
          <Card.Body>
            {students.map(student => {
              const id = String(student.user_id ?? student.id);
              const absent = Boolean(absentees[id]);
              return (
                <View key={id} style={styles.studentRow}>
                  <Flex justify="between" align="center">
                    <View style={styles.studentInfo}>
                      <Text
                        style={[
                          styles.studentName,
                          absent && styles.studentAbsent,
                        ]}
                      >
                        {student.name || student.student_name || 'Student'}
                      </Text>
                      <Text style={styles.studentClass}>{student.class}</Text>
                    </View>
                    <Switch
                      checked={absent}
                      onChange={value => toggleAbsent(id, value)}
                      color={colors.danger}
                    />
                  </Flex>
                  {absent ? (
                    <Picker
                      data={pickerData(data.absentReasonlist, 'title')}
                      cols={1}
                      value={[absentees[id].reasonId]}
                      onChange={value => setReason(id, String(value[0]))}
                      onOk={value => setReason(id, String(value[0]))}
                    >
                      <List.Item
                        arrow="horizontal"
                        styles={{ Line: styles.reasonLine }}
                      >
                        <Text style={styles.reasonLabel}>Absence reason</Text>
                      </List.Item>
                    </Picker>
                  ) : null}
                </View>
              );
            })}
          </Card.Body>
        </Card>
      ) : (
        <EmptyBlock
          title="No match"
          message={`No student matches “${query}”.`}
          icon="search"
        />
      )}

      <WhiteSpace size="xl" />
      <Button
        type="primary"
        size="large"
        loading={submitting}
        disabled={submitting}
        onPress={submit}
      >
        Submit attendance
      </Button>
      <WhiteSpace size="lg" />
      <Button
        onPress={() =>
          navigate('absentList', {
            classId: selectedClass,
            className: data.studentlist[0]?.class,
          })
        }
      >
        <AntIcon name="history" size={16} /> View past absentees
      </Button>
    </Screen>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    hint: { fontSize: font.ms, color: colors.weak },
    studentRow: {
      paddingVertical: spacing.m,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    studentInfo: { flex: 1 },
    studentName: { fontSize: font.l, color: colors.text, fontWeight: '500' },
    studentAbsent: { color: colors.danger },
    studentClass: { fontSize: font.ms, color: colors.weak, marginTop: 2 },
    reasonLine: {
      backgroundColor: colors.dangerSoftBg,
      borderRadius: radius.m,
      paddingHorizontal: spacing.m,
      marginTop: spacing.s,
    },
    reasonLabel: { fontSize: font.main, color: colors.danger },
  });
