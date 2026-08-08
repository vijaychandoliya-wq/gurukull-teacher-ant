import React, {useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {
  Button,
  Card,
  DatePicker,
  Flex,
  Input,
  List,
  Modal,
  Picker,
  Tabs,
  Text,
  Toast,
  View,
  WhiteSpace,
} from '@ant-design/react-native';
import {
  AnyRecord,
  addAssignment,
  deleteAssignment,
  getAssignmentSubjects,
  getAssignments,
  getClasses,
} from '../api';
import {formatDate, friendlyError, pickerData, useAsyncData} from '../hooks';
import {
  AntIcon,
  EmptyBlock,
  LoadingBlock,
  PageTitle,
  RecordCard,
  Screen,
  SectionTitle,
  ButtonLabel,
} from '../components/ui';
import {ScreenKey, ScreenParams} from '../navigation';
import {colors, spacing} from '../theme';

const TABS: {title: string; scope: 'active' | 'completed'}[] = [
  {title: 'Active', scope: 'active'},
  {title: 'Completed', scope: 'completed'},
];

type AssignmentData = {items: AnyRecord[]; classes: AnyRecord[]};

const EMPTY: AssignmentData = {items: [], classes: []};

export default function AssignmentsScreen({
  navigate,
}: {
  navigate: (screen: ScreenKey, params?: ScreenParams) => void;
}) {
  const [scope, setScope] = useState<'active' | 'completed'>('active');
  const [composing, setComposing] = useState(false);

  const loader = useCallback(async (): Promise<AssignmentData> => {
    const [items, classes] = await Promise.all([getAssignments(scope), getClasses()]);
    return {items, classes};
  }, [scope]);

  const {data, loading, refreshing, error, setError, reload, refresh, clearError} = useAsyncData(loader, EMPTY);

  const remove = (item: AnyRecord) => {
    Modal.alert('Delete assignment', `Remove “${item.title || 'this assignment'}”?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAssignment(item.id);
            Toast.success('Assignment deleted', 2);
            await reload();
          } catch (reason) {
            setError(friendlyError(reason));
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Assignments" subtitle="Set graded work and follow it through approval." />

      <Button type="primary" onPress={() => setComposing(value => !value)}>
        <ButtonLabel icon={composing ? 'up' : 'plus'} tone="onPrimary">
          {composing ? 'Close form' : 'Add assignment'}
        </ButtonLabel>
      </Button>
      <WhiteSpace size="lg" />

      {composing ? (
        <>
          <AssignmentForm
            classes={data.classes}
            onDone={async () => {
              setComposing(false);
              await reload();
            }}
            onError={setError}
          />
          <WhiteSpace size="xl" />
        </>
      ) : null}

      <Tabs
        tabs={TABS.map(tab => ({title: tab.title, key: tab.scope}))}
        page={TABS.findIndex(tab => tab.scope === scope)}
        onChange={(_tab, index) => setScope(TABS[index].scope)}
        swipeable={false}
        noRenderContent>
        <View />
      </Tabs>
      <WhiteSpace size="lg" />

      {loading ? (
        <LoadingBlock />
      ) : data.items.length ? (
        <>
          <SectionTitle title={`${data.items.length} ${data.items.length === 1 ? 'assignment' : 'assignments'}`} />
          {data.items.map((item, index) => (
            <RecordCard
              key={item.id || index}
              title={item.title || 'Assignment'}
              status={item.status_display || item.status}
              icon="file-text"
              meta={[
                `${item.subject_name || item.subject || ''} · ${item.class_name || item.class || ''}`,
                item.assigned_date ? `Assigned ${item.assigned_date}` : null,
                item.submission_date ? `Due ${item.submission_date}` : null,
                item.marks ? `Max marks: ${item.marks}` : null,
              ]}
              body={item.description}
              footer={
                <>
                  <WhiteSpace size="sm" />
                  <Flex>
                    <Button
                      size="small"
                      type="primary"
                      style={styles.footerAction}
                      onPress={() =>
                        navigate('submissions', {
                          assignmentId: item.id,
                          title: `${item.title || 'Assignment'} · ${item.class_name || item.class || ''}`,
                          maxMarks: item.marks,
                        })
                      }>
                      Submissions
                    </Button>
                    <View style={styles.footerGap} />
                    <Button size="small" style={styles.footerAction} onPress={() => remove(item)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Button>
                  </Flex>
                </>
              }
            />
          ))}
        </>
      ) : (
        <EmptyBlock title="No assignments" message="Assignments you create appear here." icon="file-text" />
      )}
    </Screen>
  );
}

function AssignmentForm({
  classes,
  onDone,
  onError,
}: {
  classes: AnyRecord[];
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [classId, setClassId] = useState<any[]>([]);
  const [subjectId, setSubjectId] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<AnyRecord[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [marks, setMarks] = useState('');
  const [assignedDate, setAssignedDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const chooseClass = async (value: any[]) => {
    setClassId(value);
    setSubjectId([]);
    setSubjects([]);
    if (!value[0]) {
      return;
    }
    try {
      setSubjects(await getAssignmentSubjects(value[0]));
    } catch (reason) {
      onError(friendlyError(reason));
    }
  };

  const save = async () => {
    if (!classId[0] || !subjectId[0] || !title.trim()) {
      onError('Choose a class and subject, and give the assignment a title.');
      return;
    }
    setSaving(true);
    try {
      await addAssignment({
        standardLink_id: classId[0],
        subject_id: subjectId[0],
        title: title.trim(),
        description: description.trim(),
        assigned_date: formatDate(assignedDate),
        submission_date: formatDate(dueDate),
        marks: marks.trim() || 0,
      });
      Toast.success('Assignment added', 2);
      setTitle('');
      setDescription('');
      setMarks('');
      await onDone();
    } catch (reason) {
      onError(friendlyError(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Card.Header title="New assignment" thumb={<AntIcon name="plus-circle" />} />
      <Card.Body>
        <List>
          <Picker
            data={pickerData(classes, 'standard_section')}
            cols={1}
            value={classId}
            onChange={chooseClass}
            onOk={chooseClass}>
            <List.Item arrow="horizontal">Class</List.Item>
          </Picker>
          <Picker data={pickerData(subjects)} cols={1} value={subjectId} onChange={setSubjectId} onOk={setSubjectId}>
            <List.Item arrow="horizontal">Subject</List.Item>
          </Picker>
          <DatePicker value={assignedDate} mode="date" onChange={setAssignedDate}>
            <List.Item arrow="horizontal">Assigned on</List.Item>
          </DatePicker>
          <DatePicker value={dueDate} mode="date" minDate={assignedDate} onChange={setDueDate}>
            <List.Item arrow="horizontal">Submission date</List.Item>
          </DatePicker>
        </List>
        <WhiteSpace size="lg" />
        <Input value={title} onChangeText={setTitle} placeholder="Assignment title" allowClear />
        <WhiteSpace size="lg" />
        <Input value={marks} onChangeText={setMarks} placeholder="Maximum marks" keyboardType="number-pad" />
        <WhiteSpace size="lg" />
        <Input.TextArea
          value={description}
          onChangeText={setDescription}
          placeholder="Instructions for students"
          rows={4}
          maxLength={500}
          showCount
        />
        <WhiteSpace size="lg" />
        <Button type="primary" loading={saving} disabled={saving} onPress={save}>
          Save assignment
        </Button>
      </Card.Body>
    </Card>
  );
}

const styles = StyleSheet.create({
  footerAction: {flex: 1},
  footerGap: {width: spacing.s},
  deleteText: {color: colors.danger},
});
