import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Button,
  Flex,
  Input,
  Text,
  Toast,
  WhiteSpace,
} from '@ant-design/react-native';
import {
  AnyRecord,
  getHomeworkSubmissions,
  reviewStudentHomework,
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
  StatusTag,
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

/**
 * Students who submitted one homework, with a check-off action.
 *
 * The server refuses to re-check a submission, so a checked row shows its
 * recorded comment read-only instead of offering the button again.
 */
export default function HomeworkSubmissionsScreen({
  params,
}: {
  params?: ScreenParams;
}) {
  const colors = useThemeColors();

  const homeworkId = params?.homeworkId;

  const loader = useCallback(async () => {
    if (!homeworkId) {
      return [];
    }
    return getHomeworkSubmissions(homeworkId);
  }, [homeworkId]);

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

  if (!homeworkId) {
    return (
      <Screen>
        <EmptyBlock
          title="No homework selected"
          message="Open a homework entry first."
          icon="book"
        />
      </Screen>
    );
  }

  if (loading) {
    return <LoadingBlock />;
  }

  const checked = data.filter(
    item => String(item.status).toLowerCase() === 'checked',
  ).length;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      error={error}
      onDismissError={clearError}
    >
      <PageTitle title="Submissions" subtitle={params?.title} />

      {data.length ? (
        <>
          <Flex justify="between">
            <StatCard icon="team" value={data.length} label="Submitted" />
            <StatCard
              icon="check-circle"
              value={checked}
              label="Checked"
              color={colors.success}
            />
            <StatCard
              icon="clock-circle"
              value={data.length - checked}
              label="Pending"
              color={colors.warning}
            />
          </Flex>
          <WhiteSpace size="xl" />
          <SectionTitle title="Students" />
          {data.map(submission => (
            <SubmissionRow
              key={submission.id}
              submission={submission}
              onDone={reload}
              onError={setError}
            />
          ))}
        </>
      ) : (
        <EmptyBlock
          title="No submissions"
          message="No student has handed this homework in yet."
          icon="book"
        />
      )}
    </Screen>
  );
}

function SubmissionRow({
  submission,
  onDone,
  onError,
}: {
  submission: AnyRecord;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const isChecked = String(submission.status).toLowerCase() === 'checked';

  const check = async () => {
    setSaving(true);
    try {
      await reviewStudentHomework(submission.id, comments.trim());
      Toast.success('Marked as checked', 2);
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
          <Text style={styles.name}>
            {submission.user_fullname || 'Student'}
          </Text>
        }
        thumb={<AntIcon name="user" size={20} />}
        extra={<StatusTag status={submission.status} />}
      />
      <Card.Body>
        <Text style={styles.meta}>
          Submitted {submission.submitted_on || '—'}
        </Text>
        {submission.attachments ? (
          <Text style={styles.meta}>
            <AntIcon name="paper-clip" size={13} color={colors.weak} />{' '}
            Attachment on the web portal
          </Text>
        ) : null}
        {isChecked ? (
          <>
            <Text style={styles.meta}>
              Checked {submission.checked_on || ''} by{' '}
              {submission.checked_by || 'you'}
            </Text>
            {submission.comments ? (
              <Text style={styles.comment}>{submission.comments}</Text>
            ) : null}
          </>
        ) : (
          <>
            <WhiteSpace size="sm" />
            <Input
              value={comments}
              onChangeText={setComments}
              placeholder="Feedback (optional, letters and numbers)"
              maxLength={100}
            />
            <WhiteSpace size="sm" />
            <Button
              size="small"
              type="primary"
              loading={saving}
              disabled={saving}
              onPress={check}
            >
              Mark as checked
            </Button>
          </>
        )}
      </Card.Body>
    </Card>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: { marginBottom: spacing.m, borderRadius: radius.l },
    name: { fontSize: font.l, fontWeight: '600', color: colors.text },
    meta: { fontSize: font.main, lineHeight: 20, color: colors.textSecondary },
    comment: {
      fontSize: font.main,
      lineHeight: 20,
      color: colors.text,
      marginTop: spacing.s,
      paddingTop: spacing.s,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
