import React, {useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Input,
  List,
  Picker,
  Text,
  Toast,
  View,
  WhiteSpace,
} from '@ant-design/react-native';
import {
  AnyRecord,
  addTask,
  getTaskOptions,
  getTaskStaff,
  getTaskStudents,
  getTaskTeachers,
} from '../api';
import {formatDateTime, friendlyError, pickerData, useAsyncData} from '../hooks';
import {AntIcon, EmptyBlock, LoadingBlock, PageTitle, Screen, SectionTitle} from '../components/ui';
import {colors, font, spacing} from '../theme';

const PRIORITIES = [
  {label: 'Low', value: 'low'},
  {label: 'Medium', value: 'medium'},
  {label: 'High', value: 'high'},
];

/** Who a task can be handed to. Mirrors the server's assignee types. */
const TYPES = [
  {label: 'Teacher', value: 'teacher'},
  {label: 'Staff', value: 'nonteacher'},
  {label: 'Student', value: 'student'},
];

export default function TaskComposeScreen({onDone}: {onDone: () => void}) {
  const loader = useCallback(() => getTaskOptions(), []);
  const {data: options, loading, error, setError, clearError} = useAsyncData<AnyRecord>(loader, {});

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [type, setType] = useState<any[]>(['teacher']);
  const [priority, setPriority] = useState<any[]>(['medium']);
  const [dueDate, setDueDate] = useState(new Date());
  const [reminderDate, setReminderDate] = useState(new Date());
  const [classId, setClassId] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<AnyRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [saving, setSaving] = useState(false);

  const classes: AnyRecord[] = options.standardlinks || [];

  /** The candidate list depends on the assignee type, and on the class for students. */
  const loadCandidates = useCallback(
    async (nextType: string, nextClassId?: string) => {
      setLoadingPeople(true);
      setSelected([]);
      try {
        if (nextType === 'teacher') {
          setCandidates(await getTaskTeachers());
        } else if (nextType === 'nonteacher') {
          setCandidates(await getTaskStaff());
        } else if (nextClassId) {
          setCandidates(await getTaskStudents(nextClassId));
        } else {
          setCandidates([]);
        }
      } catch (reason) {
        setError(friendlyError(reason));
        setCandidates([]);
      } finally {
        setLoadingPeople(false);
      }
    },
    [setError],
  );

  const chooseType = (value: any[]) => {
    setType(value);
    loadCandidates(String(value[0]), classId[0]);
  };

  const chooseClass = (value: any[]) => {
    setClassId(value);
    if (type[0] === 'student') {
      loadCandidates('student', String(value[0]));
    }
  };

  const toggle = (id: string) =>
    setSelected(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));

  const save = async () => {
    if (!title.trim()) {
      setError('Give the task a title.');
      return;
    }
    if (!selected.length) {
      setError('Choose at least one person to assign this to.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addTask({
        title: title.trim(),
        to_do_list: details.trim(),
        task_date: formatDateTime(dueDate),
        reminder_date: formatDateTime(reminderDate),
        type: String(type[0]),
        priority: String(priority[0]),
        assignee: selected,
        ...(type[0] === 'student' && classId[0] ? {standardLink_id: classId[0]} : {}),
      });
      Toast.success('Task created', 2);
      setTitle('');
      setDetails('');
      setSelected([]);
      onDone();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen error={error} onDismissError={clearError}>
      <PageTitle title="New task" subtitle="Hand a to-do to a colleague or a student." />

      <Card>
        <Card.Header title="Task details" thumb={<AntIcon name="plus-circle" />} />
        <Card.Body>
          <Input value={title} onChangeText={setTitle} placeholder="Task title" allowClear />
          <WhiteSpace size="lg" />
          <Input.TextArea
            value={details}
            onChangeText={setDetails}
            placeholder="What needs to be done?"
            rows={3}
            maxLength={500}
            showCount
          />
          <WhiteSpace size="lg" />
          <List>
            <Picker data={PRIORITIES} cols={1} value={priority} onChange={setPriority} onOk={setPriority}>
              <List.Item arrow="horizontal">Priority</List.Item>
            </Picker>
            <DatePicker value={dueDate} mode="minute" onChange={setDueDate}>
              <List.Item arrow="horizontal">Due</List.Item>
            </DatePicker>
            <DatePicker value={reminderDate} mode="minute" onChange={setReminderDate}>
              <List.Item arrow="horizontal">Remind on</List.Item>
            </DatePicker>
            <Picker data={TYPES} cols={1} value={type} onChange={chooseType} onOk={chooseType}>
              <List.Item arrow="horizontal">Assign to</List.Item>
            </Picker>
          </List>
          {/* Only students are scoped to a class, so this row appears on demand.
              It sits outside the List above because Ant's List rejects a null
              child. */}
          {type[0] === 'student' ? (
            <List>
              <Picker
                data={pickerData(classes, 'standard_section')}
                cols={1}
                value={classId}
                onChange={chooseClass}
                onOk={chooseClass}>
                <List.Item arrow="horizontal">Class</List.Item>
              </Picker>
            </List>
          ) : null}
        </Card.Body>
      </Card>

      <WhiteSpace size="xl" />
      <SectionTitle
        title="Assignees"
        extra={selected.length ? <Text style={styles.count}>{selected.length} selected</Text> : undefined}
      />

      {loadingPeople ? (
        <LoadingBlock text="Loading people…" />
      ) : candidates.length ? (
        <Card>
          <Card.Body>
            {candidates.map(person => {
              const id = String(person.id ?? person.user_id);
              return (
                <View key={id} style={styles.personRow}>
                  <Checkbox checked={selected.includes(id)} onChange={() => toggle(id)}>
                    <Text style={styles.personName}>{person.name || person.fullname || person.FullName}</Text>
                  </Checkbox>
                </View>
              );
            })}
          </Card.Body>
        </Card>
      ) : (
        <EmptyBlock
          title="Nobody to assign"
          message={
            type[0] === 'student' && !classId[0]
              ? 'Pick a class to list its students.'
              : 'No one is available for this assignee type.'
          }
          icon="team"
        />
      )}

      <WhiteSpace size="xl" />
      <Button type="primary" size="large" loading={saving} disabled={saving} onPress={save}>
        Create task
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: {fontSize: font.ms, color: colors.primary},
  personRow: {
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  personName: {fontSize: font.m, color: colors.text, marginLeft: spacing.s},
});
