import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Button,
  Form,
  Input,
  Text,
  Toast,
  WhiteSpace,
} from '@ant-design/react-native';
import { changePassword, ApiError } from '../api';
import { friendlyError } from '../hooks';
import { AntIcon, Card, PageTitle, Screen } from '../components/ui';
import { font, useThemedStyles, type AppColors } from '../theme';

export default function ChangePasswordScreen({
  onDone,
}: {
  onDone: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!current || !next) {
      setError('Enter your current and new password.');
      return;
    }
    if (next.trim().length < 15 || next.length > 128) {
      setError('The new password must be 15–128 characters.');
      return;
    }
    if (next === current) {
      setError('Choose a password different from the current password.');
      return;
    }
    if (next !== confirm) {
      setError('The confirmation does not match the new password.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await changePassword({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      Toast.success('Password changed', 2);
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone();
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? friendlyError(reason)
          : 'The change could not be confirmed. If your connection was interrupted, try signing in with the new password before retrying.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen error={error} onDismissError={() => setError('')}>
      <PageTitle
        title="Change password"
        subtitle="Use 15–128 characters. All devices will be signed out."
      />

      <Card>
        <Card.Header title="New password" thumb={<AntIcon name="lock" />} />
        <Card.Body>
          <Form layout="vertical">
            <Form.Item label="Current password or access key" required>
              <Input
                value={current}
                onChangeText={setCurrent}
                type="password"
                placeholder="Current password or access key"
              />
            </Form.Item>
            <Form.Item label="New password" required>
              <Input
                value={next}
                onChangeText={setNext}
                type="password"
                placeholder="15–128 characters"
              />
            </Form.Item>
            <Form.Item label="Confirm new password" required>
              <Input
                value={confirm}
                onChangeText={setConfirm}
                type="password"
                placeholder="Repeat new password"
              />
            </Form.Item>
          </Form>
          <WhiteSpace size="lg" />
          <Button
            type="primary"
            size="large"
            loading={saving}
            disabled={saving}
            onPress={submit}
          >
            Update password
          </Button>
        </Card.Body>
      </Card>

      <WhiteSpace size="lg" />
      <Text style={styles.hint}>
        All devices are signed out. Sign in again with your new password.
      </Text>
    </Screen>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    hint: { fontSize: font.ms, color: colors.weak, textAlign: 'center' },
  });
