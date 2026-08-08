import React, {useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Button, Flex, Tabs, Text, Toast, View, WhiteSpace} from '@ant-design/react-native';
import {AnyRecord, completeTask, getTasks, ownAssigneeId} from '../api';
import {friendlyError, useAsyncData} from '../hooks';
import {
  EmptyBlock,
  LoadingBlock,
  PageTitle,
  RecordCard,
  Screen,
  SectionTitle,
  ButtonLabel,
} from '../components/ui';
import {ScreenKey} from '../navigation';
import {colors, font} from '../theme';

const TABS: {title: string; scope: 'mine' | 'assigned'; completed: boolean}[] = [
  {title: 'My open', scope: 'mine', completed: false},
  {title: 'My done', scope: 'mine', completed: true},
  {title: 'Assigned', scope: 'assigned', completed: false},
];

/** Priority is a free-text field on the API; colour the common values. */
function priorityColor(priority?: string) {
  const value = String(priority || '').toLowerCase();
  if (value === 'high' || value === 'urgent') {
    return colors.danger;
  }
  if (value === 'medium') {
    return colors.warning;
  }
  return colors.textSecondary;
}

export default function TasksScreen({navigate}: {navigate: (screen: ScreenKey) => void}) {
  const [tab, setTab] = useState(0);
  const {scope, completed} = TABS[tab];

  const loader = useCallback(() => getTasks(scope, completed), [scope, completed]);
  const {data, loading, refreshing, error, setError, reload, refresh, clearError} = useAsyncData<AnyRecord[]>(
    loader,
    [],
  );

  const markDone = async (task: AnyRecord) => {
    // The endpoint closes assignee rows, not tasks — find this teacher's own.
    const assigneeId = ownAssigneeId(task);
    if (!assigneeId) {
      setError('This task is not assigned to you, so you cannot close it.');
      return;
    }
    try {
      await completeTask([assigneeId]);
      Toast.success('Task completed', 2);
      await reload();
    } catch (reason) {
      setError(friendlyError(reason));
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="My tasks" subtitle="To-dos assigned to you and by you." />

      <Button type="primary" onPress={() => navigate('taskCompose')}>
        <ButtonLabel icon="plus" tone="onPrimary">
          New task
        </ButtonLabel>
      </Button>
      <WhiteSpace size="lg" />

      <Tabs
        tabs={TABS.map(item => ({title: item.title, key: item.title}))}
        page={tab}
        onChange={(_item, index) => setTab(index)}
        swipeable={false}
        noRenderContent>
        <View />
      </Tabs>
      <WhiteSpace size="lg" />

      {loading ? (
        <LoadingBlock />
      ) : data.length ? (
        <>
          <SectionTitle title={`${data.length} ${data.length === 1 ? 'task' : 'tasks'}`} />
          {data.map((task, index) => (
            <RecordCard
              key={task.task_id || index}
              title={task.title || 'Task'}
              status={task.task_status}
              icon="check-circle"
              meta={[
                task.task_date ? `Due ${task.task_date}` : null,
                task.standardLink ? `Class: ${task.standardLink}` : null,
                task.total_count ? `${task.completion_count || 0} of ${task.total_count} assignees done` : null,
                task.reminder_date ? task.reminder : null,
              ]}
              body={task.to_do_list}
              footer={
                <>
                  <WhiteSpace size="sm" />
                  <Flex justify="between" align="center">
                    <Text style={[styles.priority, {color: priorityColor(task.priority)}]}>
                      {task.priority ? String(task.priority).toUpperCase() : 'NORMAL'} PRIORITY
                    </Text>
                    {!task.task_completed ? (
                      <Button size="small" type="primary" onPress={() => markDone(task)}>
                        Mark done
                      </Button>
                    ) : null}
                  </Flex>
                </>
              }
            />
          ))}
        </>
      ) : (
        <EmptyBlock title="Nothing to do" message="Tasks assigned to you will appear here." icon="check-circle" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  priority: {fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5},
});
