import React, {useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {
  Button,
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
  addHomework,
  deleteHomework,
  getClasses,
  getHomework,
  getHomeworkSubjects,
} from '../api';
import {formatDate, friendlyError, pickerData, useAsyncData} from '../hooks';
import {
  AntIcon,
  Card,
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

type Scope = 'pending' | 'completed' | 'approval' | 'rejected';

const TABS: {title: string; scope: Scope}[] = [
  {title: 'Pending', scope: 'pending'},
  {title: 'All', scope: 'completed'},
  {title: 'Awaiting', scope: 'approval'},
  {title: 'Rejected', scope: 'rejected'},
];

type HomeworkData = {items: AnyRecord[]; classes: AnyRecord[]};

const EMPTY: HomeworkData = {items: [], classes: []};

export default function HomeworkScreen({
  navigate,
}: {
  navigate: (screen: ScreenKey, params?: ScreenParams) => void;
}) {
  const [scope, setScope] = useState<Scope>('pending');
  const [composing, setComposing] = useState(false);

  const loader = useCallback(async (): Promise<HomeworkData> => {
    const [items, classes] = await Promise.all([getHomework(scope), getClasses()]);
    return {items, classes};
  }, [scope]);

  const {data, loading, refreshing, error, setError, reload, refresh, clearError} = useAsyncData(loader, EMPTY);

  const remove = (item: AnyRecord) => {
    Modal.alert('Delete homework', `Remove the ${item.subject_name || ''} homework for ${item.class_name || 'this class'}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHomework(item.id);
            Toast.success('Homework deleted', 2);
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
      <PageTitle title="Homework" subtitle="Assign daily homework and track what is still pending." />

      <Button type="primary" onPress={() => setComposing(value => !value)}>
        <ButtonLabel icon={composing ? 'up' : 'plus'} tone="onPrimary">
          {composing ? 'Close form' : 'Add homework'}
        </ButtonLabel>
      </Button>
      <WhiteSpace size="lg" />

      {composing ? (
        <>
          <HomeworkForm
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
          <SectionTitle title={`${data.items.length} ${data.items.length === 1 ? 'entry' : 'entries'}`} />
          {data.items.map((item, index) => (
            <RecordCard
              key={item.id || index}
              title={`${item.subject_name || 'Homework'} · ${item.class_name || ''}`}
              status={item.status_display || item.status}
              icon="book"
              meta={[
                item.date ? `Given ${item.date}` : null,
                item.submission_date ? `Due ${item.submission_date}` : null,
                item.pending_count !== undefined ? `${item.pending_count} pending submissions` : null,
                item.comments ? `Approver: ${item.comments}` : null,
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
                        navigate('homeworkSubmissions', {
                          homeworkId: item.id,
                          title: `${item.subject_name || 'Homework'} · ${item.class_name || ''}`,
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
        <EmptyBlock
          title="Nothing here"
          message="No homework matches this filter yet."
          icon="book"
        />
      )}
    </Screen>
  );
}

function HomeworkForm({
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
  const [date, setDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Subjects depend on the class, so reload them whenever the class changes.
  const chooseClass = async (value: any[]) => {
    setClassId(value);
    setSubjectId([]);
    setSubjects([]);
    if (!value[0]) {
      return;
    }
    try {
      setSubjects(await getHomeworkSubjects(value[0]));
    } catch (reason) {
      onError(friendlyError(reason));
    }
  };

  const save = async () => {
    if (!classId[0] || !subjectId[0] || !description.trim()) {
      onError('Choose a class and subject, and describe the homework.');
      return;
    }
    setSaving(true);
    try {
      await addHomework({
        standardLink_id: classId[0],
        subject_id: subjectId[0],
        date: formatDate(date),
        submission_date: formatDate(dueDate),
        description: description.trim(),
      });
      Toast.success('Homework added', 2);
      setDescription('');
      await onDone();
    } catch (reason) {
      onError(friendlyError(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Card.Header title="New homework" thumb={<AntIcon name="plus-circle" />} />
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
          <DatePicker value={date} mode="date" onChange={setDate}>
            <List.Item arrow="horizontal">Given on</List.Item>
          </DatePicker>
          <DatePicker value={dueDate} mode="date" minDate={date} onChange={setDueDate}>
            <List.Item arrow="horizontal">Submission date</List.Item>
          </DatePicker>
        </List>
        <WhiteSpace size="lg" />
        <Input.TextArea
          value={description}
          onChangeText={setDescription}
          placeholder="What should students complete?"
          rows={4}
          maxLength={500}
          showCount
        />
        <WhiteSpace size="lg" />
        <Button type="primary" loading={saving} disabled={saving} onPress={save}>
          Save homework
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
