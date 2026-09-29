import React, {useEffect, useState} from 'react';
import {Image, KeyboardAvoidingView, ScrollView, StatusBar, StyleSheet} from 'react-native';
import {Button, Card, Form, Input, Text, WhiteSpace} from '@ant-design/react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getSchoolCode, login, PRODUCTION_BASE_URL, setBaseUrl, setSchoolCode} from '../api';
import {friendlyError} from '../hooks';
import {AntIcon, ErrorBar} from '../components/ui';
import {colors, font, radius, spacing} from '../theme';

export default function LoginScreen({onSuccess}: {onSuccess: () => void}) {
  const [schoolCode, setSchool] = useState('GW101');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSchoolCode().then(setSchool);
  }, []);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your teacher email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await setSchoolCode(schoolCode);
      await setBaseUrl(PRODUCTION_BASE_URL);
      await login(email, password);
      onSuccess();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {/* `padding` on Android too: the app targets SDK 36, where edge-to-edge
          is mandatory and the manifest's `adjustResize` no longer shrinks the
          window, so leaving behavior undefined lets the keyboard bury the
          password field and the sign-in button. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image
            source={require('../assets/dronacharya-logo.png')}
            style={styles.brandMark}
            resizeMode="cover"
          />
          <Text style={styles.title}>Dronacharya</Text>
          <Text style={styles.subtitle}>Your classes, timetable and leave requests in one place.</Text>
          <WhiteSpace size="xl" />
          <Card style={styles.card}>
            <Card.Header title="Teacher sign in" thumb={<AntIcon name="safety-certificate" />} />
            <Card.Body>
              <ErrorBar message={error} onClose={() => setError('')} />
              <WhiteSpace size="lg" />
              <Form layout="vertical">
                <Form.Item label="School code" required>
                  <Input
                    value={schoolCode}
                    onChangeText={setSchool}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="GW101"
                    prefix={<AntIcon name="bank" color={colors.weak} size={19} />}
                  />
                </Form.Item>
                <Form.Item label="Email" required>
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="teacher@gurukull.in"
                    prefix={<AntIcon name="mail" color={colors.weak} size={19} />}
                    allowClear
                  />
                </Form.Item>
                <Form.Item label="Password" required>
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    type="password"
                    placeholder="Enter password"
                    prefix={<AntIcon name="lock" color={colors.weak} size={19} />}
                  />
                </Form.Item>
              </Form>
              <WhiteSpace size="lg" />
              <Button type="primary" size="large" loading={loading} disabled={loading} onPress={submit}>
                Sign in
              </Button>
            </Card.Body>
          </Card>
          <Text style={styles.secure}>
            <AntIcon name="safety" color={colors.success} size={15} /> Secure connection to app.gurukull.in
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  safe: {flex: 1, backgroundColor: colors.background},
  content: {flexGrow: 1, justifyContent: 'center', padding: spacing.xl},
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#CD9D56',
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#CD9D56',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {fontSize: 28, lineHeight: 36, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 18},
  subtitle: {fontSize: font.l, lineHeight: 22, color: colors.textSecondary, textAlign: 'center', marginTop: 6},
  card: {borderRadius: radius.l, overflow: 'hidden'},
  secure: {fontSize: font.ms, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl - 4},
});
