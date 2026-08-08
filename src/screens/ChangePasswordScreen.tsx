import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {Button, Card, Form, Input, Text, Toast, WhiteSpace} from '@ant-design/react-native';
import {changePassword} from '../api';
import {friendlyError} from '../hooks';
import {AntIcon, PageTitle, Screen} from '../components/ui';
import {colors, font} from '../theme';

export default function ChangePasswordScreen({onDone}: {onDone: () => void}) {
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
    if (next.length < 8) {
      setError('The new password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('The confirmation does not match the new password.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await changePassword({current_password: current, password: next, password_confirmation: confirm});
      Toast.success('Password changed', 2);
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen error={error} onDismissError={() => setError('')}>
      <PageTitle title="Change password" subtitle="Update the password you use to sign in." />

      <Card>
        <Card.Header title="New password" thumb={<AntIcon name="lock" />} />
        <Card.Body>
          <Form layout="vertical">
            <Form.Item label="Current password" required>
              <Input value={current} onChangeText={setCurrent} type="password" placeholder="Current password" />
            </Form.Item>
            <Form.Item label="New password" required>
              <Input value={next} onChangeText={setNext} type="password" placeholder="At least 8 characters" />
            </Form.Item>
            <Form.Item label="Confirm new password" required>
              <Input value={confirm} onChangeText={setConfirm} type="password" placeholder="Repeat new password" />
            </Form.Item>
          </Form>
          <WhiteSpace size="lg" />
          <Button type="primary" size="large" loading={saving} disabled={saving} onPress={submit}>
            Update password
          </Button>
        </Card.Body>
      </Card>

      <WhiteSpace size="lg" />
      <Text style={styles.hint}>You stay signed in on this device after changing your password.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {fontSize: font.ms, color: colors.weak, textAlign: 'center'},
});
