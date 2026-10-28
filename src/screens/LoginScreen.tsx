import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Button, Input, Text, View } from '@ant-design/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSchoolCode, login, setSchoolCode } from '../api';
import { friendlyError } from '../hooks';
import { AntIcon, Card, ErrorBar } from '../components/ui';
import { ThemePicker } from '../components/ThemePicker';
import {
  font,
  radius,
  spacing,
  useAppTheme,
  useThemedStyles,
  type AppColors,
} from '../theme';
import { AVAILABLE_MOBILE_LOCALES, useLanguage } from '../i18n';

export default function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const { colors, isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { locale, setLocale, t } = useLanguage();
  const [schoolCode, setSchool] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    getSchoolCode()
      .then(setSchool)
      .catch(() => {});
  }, []);
  const submit = async () => {
    if (!schoolCode.trim() || !identifier.trim() || !password) {
      setError('Enter your school code, teacher mobile/email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await setSchoolCode(schoolCode);
      await login(identifier, password);
      onSuccess();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.column}>
            <View style={styles.toolbar}>
              <ThemePicker compact />
            </View>
            <View style={styles.brand}>
              <Image
                source={require('../assets/dronacharya-logo.png')}
                style={styles.brandMark}
                resizeMode="cover"
              />
              <Text style={styles.title}>Dronacharya</Text>
              <Text style={styles.subtitle}>
                Your teaching day, in one place.
              </Text>
            </View>
            <View style={styles.languageRow} accessibilityLabel="Language">
              {AVAILABLE_MOBILE_LOCALES.map(option => (
                <TouchableOpacity
                  key={option.tag}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label + ' language'}
                  accessibilityState={{ selected: locale === option.tag }}
                  onPress={() => void setLocale(option.tag)}
                  style={[
                    styles.languageButton,
                    locale === option.tag && styles.languageSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageLabel,
                      locale === option.tag && { color: colors.primary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Card>
              <Card.Header
                title={t('teacherSignIn')}
                thumb={<AntIcon name="safety-certificate" />}
              />
              <Card.Body>
                <ErrorBar message={error} onClose={() => setError('')} />
                <View style={styles.field}>
                  <Text style={styles.label}>{t('schoolCode')}</Text>
                  <View style={styles.input}>
                    <Input
                      accessibilityLabel={t('schoolCode')}
                      value={schoolCode}
                      onChangeText={setSchool}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      placeholder="Enter school code"
                      prefix={
                        <AntIcon name="bank" color={colors.weak} size={19} />
                      }
                    />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>{t('identifier')}</Text>
                  <View style={styles.input}>
                    <Input
                      accessibilityLabel={t('identifier')}
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      placeholder="Registered mobile or email"
                      prefix={
                        <AntIcon name="mail" color={colors.weak} size={19} />
                      }
                    />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>{t('password')}</Text>
                  <View style={styles.input}>
                    <Input
                      accessibilityLabel={t('password')}
                      value={password}
                      onChangeText={setPassword}
                      type="password"
                      placeholder="Enter your password"
                      prefix={
                        <AntIcon name="lock" color={colors.weak} size={19} />
                      }
                    />
                  </View>
                </View>
                <Button
                  type="primary"
                  size="large"
                  loading={loading}
                  disabled={loading}
                  onPress={submit}
                >
                  {t('signIn')}
                </Button>
              </Card.Body>
            </Card>
            <View style={styles.secure}>
              <AntIcon name="safety" color={colors.success} size={16} />
              <Text style={styles.secureText}>
                Secure access for your school
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.background },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.page,
      paddingTop: spacing.m,
      paddingBottom: spacing.xl,
    },
    column: { width: '100%', maxWidth: 480, alignSelf: 'center' },
    toolbar: { alignItems: 'flex-end', marginBottom: spacing.l },
    brand: { alignItems: 'center', paddingVertical: spacing.m },
    brandMark: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.brandGold,
    },
    title: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.l,
    },
    subtitle: {
      fontSize: font.l,
      lineHeight: 24,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.s,
    },
    languageRow: {
      flexDirection: 'row',
      gap: spacing.s,
      marginTop: spacing.m,
      marginBottom: spacing.xl,
    },
    languageButton: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.s,
      borderRadius: radius.m,
      borderWidth: 1,
      borderColor: colors.border,
    },
    languageSelected: {
      backgroundColor: colors.wathet,
      borderColor: colors.primary,
    },
    languageLabel: {
      fontSize: font.m,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    field: { marginBottom: spacing.l },
    label: {
      fontSize: font.m,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.s,
      lineHeight: 20,
    },
    input: {
      minHeight: 52,
      paddingHorizontal: spacing.m,
      paddingVertical: spacing.xs,
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.m,
    },
    secure: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.s,
      marginTop: spacing.xl,
    },
    secureText: {
      fontSize: font.ms,
      color: colors.textSecondary,
      flexShrink: 1,
      lineHeight: 20,
    },
  });
