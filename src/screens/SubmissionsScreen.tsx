import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Button,
  Flex,
  Input,
  Tabs,
  Text,
  Toast,
  View,
  WhiteSpace,
} from '@ant-design/react-native';
import {
  AnyRecord,
  getAssignmentSubmissions,
  gradeSubmission,
  updateSubmissionGrade,
} from '../api';
import { friendlyError, useAsyncData } from '../hooks';
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
import { ScreenParams } from '../navigation';
import {
  font,
  radius,
  spacing,
  useThemeColors,
  useThemedStyles,
  type AppColors,
} from '../theme';

const TABS: { title: string; scope: 'submitted' | 'completed' }[] = [
  { title: 'To grade', scope: 'submitted' },
  { title: 'Graded', scope: 'completed' },
];

/**
 * Students who handed in one assignment, with inline grading.
 *
 * Reached from the Assignments screen. A first grade posts to `addMarks`; a
 * correction to an already-graded row posts to `editMarks`, which is the split
 * the API makes.
 */
export default function SubmissionsScreen({
  params,
}: {
  params?: ScreenParams;
}) {
  const colors = useThemeColors();

  const assignmentId = params?.assignmentId;
  const maxMarks = params?.maxMarks;
  const [tab, setTab] = useState(0);
  const scope = TABS[tab].scope;

  const loader = useCallback(async () => {
    if (!assignmentId) {
      return [];
    }
    return getAssignmentSubmissions(assignmentId, scope);
  }, [assignmentId, scope]);

  const {
    data,
    loading,
    refreshing,
    error,
    setError,
    reload,
    refresh,
    clearError,
  } = useAsyncData<AnyRecord[]>(loader, []);

  if (!assignmentId) {
    return (
      <Screen>
        <EmptyBlock
          title="No assignment selected"
          message="Open an assignment first."
          icon="file-text"
        />
      </Screen>
    );
  }

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      error={error}
      onDismissError={clearError}
    >
      <PageTitle title="Submissions" subtitle={params?.title} />

      <Tabs
        tabs={TABS.map(item => ({ title: item.title, key: item.scope }))}
        page={tab}
        onChange={(_item, index) => setTab(index)}
        swipeable={false}
        noRenderContent
      >
        <View />
      </Tabs>
      <WhiteSpace size="lg" />

      {data.length ? (
        <>
          <Flex justify="between">
            <StatCard icon="team" value={data.length} label="Students" />
            <StatCard
              icon="check-circle"
              value={
                data.filter(
                  item =>
                    item.obtained_marks != null && item.obtained_marks !== '',
                ).length
              }
              label="Graded"
              color={colors.success}
            />
            <StatCard
              icon="trophy"
              value={maxMarks ?? data[0]?.total_marks ?? '—'}
              label="Max marks"
              color={colors.cyan}
            />
          </Flex>
          <WhiteSpace size="xl" />
          <SectionTitle
            title={scope === 'submitted' ? 'Awaiting grade' : 'Already graded'}
          />
          {data.map(submission => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              maxMarks={maxMarks ?? submission.total_marks}
              isRegrade={scope === 'completed'}
              onDone={reload}
              onError={setError}
            />
          ))}
        </>
      ) : (
        <EmptyBlock
          title={
            scope === 'submitted' ? 'Nothing to grade' : 'Nothing graded yet'
          }
          message={
            scope === 'submitted'
              ? 'No student has submitted this assignment yet.'
              : 'Grades you record will appear here.'
          }
          icon="file-text"
        />
      )}
    </Screen>
  );
}

function SubmissionCard({
  submission,
  maxMarks,
  isRegrade,
  onDone,
  onError,
}: {
  submission: AnyRecord;
  maxMarks?: number | string;
  isRegrade: boolean;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const [marks, setMarks] = useState(String(submission.obtained_marks ?? ''));
  const [comments, setComments] = useState(String(submission.comments ?? ''));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (marks.trim() === '') {
      onError('Enter the marks obtained.');
      return;
    }
    const limit = Number(maxMarks);
    if (Number.isFinite(limit) && Number(marks) > limit) {
      onError(`Marks cannot exceed ${limit}.`);
      return;
    }
    setSaving(true);
    try {
      const values = {
        obtained_marks: marks.trim(),
        comments: comments.trim(),
      };
      await (isRegrade
        ? updateSubmissionGrade(submission.id, values)
        : gradeSubmission(submission.id, values));
      Toast.success('Grade saved', 2);
      await onDone();
    } catch (reason) {
      onError(friendlyError(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Header
        title={
          <Text style={styles.name}>{submission.user_name || 'Student'}</Text>
        }
        thumb={<AntIcon name="user" size={20} />}
        extra={
          submission.roll_number ? (
            <Text style={styles.roll}>Roll {submission.roll_number}</Text>
          ) : undefined
        }
      />
      <Card.Body>
        {submission.submitted_on ? (
          <Text style={styles.meta}>Submitted {submission.submitted_on}</Text>
        ) : null}
        {submission.assignment_file ? (
          <Text style={styles.meta}>
            <AntIcon name="paper-clip" size={13} color={colors.weak} />{' '}
            Attachment on the web portal
          </Text>
        ) : null}
        <WhiteSpace size="sm" />
        <Flex align="center">
          <View style={styles.marksField}>
            <Input
              value={marks}
              onChangeText={setMarks}
              keyboardType="numeric"
              placeholder="Marks"
            />
          </View>
          <Text style={styles.outOf}>/ {maxMarks ?? '—'}</Text>
        </Flex>
        <WhiteSpace size="sm" />
        <Input
          value={comments}
          onChangeText={setComments}
          placeholder="Feedback (optional)"
          maxLength={200}
        />
        <WhiteSpace size="sm" />
        <Button
          size="small"
          type="primary"
          loading={saving}
          disabled={saving}
          onPress={save}
        >
          {isRegrade ? 'Update grade' : 'Save grade'}
        </Button>
      </Card.Body>
    </Card>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: { marginBottom: spacing.m, borderRadius: radius.l },
    name: { fontSize: font.l, fontWeight: '600', color: colors.text },
    roll: { fontSize: font.ms, color: colors.weak },
    meta: { fontSize: font.main, color: colors.textSecondary },
    marksField: { width: 90 },
    outOf: {
      fontSize: font.m,
      color: colors.textSecondary,
      marginLeft: spacing.s,
    },
  });
