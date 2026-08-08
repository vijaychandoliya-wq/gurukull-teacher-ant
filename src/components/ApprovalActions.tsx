/**
 * Approve / reject buttons with the optional comment every approval endpoint
 * accepts. Shared by staff leave, student leave and principal approvals so the
 * confirmation wording and the comment field behave identically everywhere.
 */
import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {Button, Flex, Input, Modal, Text, Toast, View, WhiteSpace} from '@ant-design/react-native';
import {friendlyError} from '../hooks';
import {colors, font, spacing} from '../theme';

export function ApprovalActions({
  label,
  onApprove,
  onReject,
  onDone,
  onError,
}: {
  /** What is being decided, e.g. "Ravi Kumar's leave". Used in the prompt. */
  label: string;
  onApprove: (comments: string) => Promise<unknown>;
  onReject: (comments: string) => Promise<unknown>;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const decide = (action: 'approve' | 'reject') => {
    const verb = action === 'approve' ? 'Approve' : 'Reject';
    Modal.alert(`${verb}?`, `${verb} ${label}. The applicant is notified straight away.`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: verb,
        style: action === 'reject' ? 'destructive' : 'default',
        onPress: async () => {
          setBusy(true);
          try {
            await (action === 'approve' ? onApprove(comments.trim()) : onReject(comments.trim()));
            Toast.success(action === 'approve' ? 'Approved' : 'Rejected', 2);
            setComments('');
            setExpanded(false);
            await onDone();
          } catch (reason) {
            onError(friendlyError(reason));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View>
      <WhiteSpace size="sm" />
      {expanded ? (
        <>
          <Input
            value={comments}
            onChangeText={setComments}
            placeholder="Comment (optional)"
            maxLength={200}
            allowClear
          />
          <WhiteSpace size="sm" />
        </>
      ) : (
        <Text style={styles.addComment} onPress={() => setExpanded(true)}>
          + Add a comment
        </Text>
      )}
      <WhiteSpace size="sm" />
      <Flex>
        <Button
          size="small"
          type="primary"
          style={styles.action}
          loading={busy}
          disabled={busy}
          onPress={() => decide('approve')}>
          Approve
        </Button>
        <View style={styles.gap} />
        <Button size="small" style={styles.action} disabled={busy} onPress={() => decide('reject')}>
          <Text style={styles.rejectText}>Reject</Text>
        </Button>
      </Flex>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {flex: 1},
  gap: {width: spacing.s},
  rejectText: {color: colors.danger},
  addComment: {fontSize: font.ms, color: colors.primary},
});
