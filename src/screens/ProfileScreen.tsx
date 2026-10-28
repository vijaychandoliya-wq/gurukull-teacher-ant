import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Button, Text, View, WhiteSpace } from '@ant-design/react-native';
import { AnyRecord, getLocalePreference, saveLocalePreference } from '../api';
import { friendlyError, initials } from '../hooks';
import {
  ButtonLabel,
  Card,
  DetailRows,
  PageTitle,
  Screen,
  SectionTitle,
} from '../components/ui';
import { ScreenKey } from '../navigation';
import { font, radius, useThemedStyles, type AppColors } from '../theme';
import { AVAILABLE_MOBILE_LOCALES, useLanguage } from '../i18n';
import { ThemePicker } from '../components/ThemePicker';

export default function ProfileScreen({
  profile,
  navigate,
}: {
  profile: AnyRecord | null;
  navigate: (screen: ScreenKey) => void;
}) {
  const styles = useThemedStyles(createStyles);

  const { locale, setLocale, t } = useLanguage();
  const [preferenceVersion, setPreferenceVersion] = useState(0);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState('');
  useEffect(() => {
    Promise.resolve(getLocalePreference())
      .then(value => {
        if (
          value &&
          AVAILABLE_MOBILE_LOCALES.some(
            option => option.tag === value.localeTag,
          )
        )
          void setLocale(value.localeTag);
        setPreferenceVersion(Number(value?.version) || 0);
      })
      .catch(() => undefined);
  }, [setLocale]);
  const saveLanguage = async () => {
    try {
      setSavingLanguage(true);
      setLanguageError('');
      const saved = await saveLocalePreference(locale, preferenceVersion);
      setPreferenceVersion(Number(saved.version) || preferenceVersion + 1);
    } catch (error) {
      setLanguageError(friendlyError(error));
    } finally {
      setSavingLanguage(false);
    }
  };
  const rows: [string, any][] = [
    ['Employee ID', profile?.employeeId],
    ['Designation', profile?.designation_name || profile?.designation],
    ['Class teacher', profile?.classTeacher],
    ['Email', profile?.email || profile?.emailId],
    ['Mobile', profile?.mobile_no || profile?.mobileNo],
    ['Date of birth', profile?.date_of_birth],
    ['Joining date', profile?.joiningDate],
    ['Gender', profile?.gender],
    ['Blood group', profile?.bloodGroup],
    ['Address', profile?.address],
  ];

  return (
    <Screen>
      <PageTitle
        title="My profile"
        subtitle="Teacher information from your school account."
      />

      <Card style={styles.profileCard}>
        <Card.Body>
          <View style={styles.avatar}>
            {profile?.avatar ? (
              <Image
                source={{ uri: profile.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitials}>
                {initials(profile?.fullname)}
              </Text>
            )}
          </View>
          <Text style={styles.name}>{profile?.fullname || 'Teacher'}</Text>
          <Text style={styles.role}>
            {profile?.designation_name ||
              profile?.designation ||
              'Gurukull Teacher'}
          </Text>
        </Card.Body>
      </Card>

      <WhiteSpace size="lg" />
      <Card style={styles.profileCard}>
        <Card.Header title="Appearance" />
        <Card.Body>
          <Text style={styles.languageHint}>
            Choose light, dark, or follow your phone. Your preference is saved
            on this device.
          </Text>
          <WhiteSpace size="md" />
          <ThemePicker />
        </Card.Body>
      </Card>
      <WhiteSpace size="lg" />
      <SectionTitle title="Account details" />
      <DetailRows rows={rows} />

      <WhiteSpace size="lg" />
      <Card style={styles.profileCard}>
        <Card.Header title={t('language')} />
        <Card.Body>
          <Text style={styles.languageHint}>{t('languageHelp')}</Text>
          <View style={styles.languageOptions}>
            {AVAILABLE_MOBILE_LOCALES.map(option => (
              <Button
                key={option.tag}
                type={locale === option.tag ? 'primary' : 'ghost'}
                size="small"
                style={styles.languageButton}
                onPress={() => void setLocale(option.tag)}
              >
                {option.label}
              </Button>
            ))}
          </View>
          {languageError ? (
            <Text style={styles.languageError}>{languageError}</Text>
          ) : null}
          <WhiteSpace size="md" />
          <Button
            type="primary"
            loading={savingLanguage}
            onPress={() => void saveLanguage()}
          >
            {t('saveLanguage')}
          </Button>
        </Card.Body>
      </Card>

      <WhiteSpace size="xl" />
      <Button onPress={() => navigate('changePassword')}>
        <ButtonLabel icon="lock">Change password</ButtonLabel>
      </Button>
    </Screen>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    profileCard: { borderRadius: radius.l },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.wathet,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: 84, height: 84 },
    avatarInitials: { fontSize: 28, fontWeight: '700', color: colors.primary },
    name: {
      fontSize: 21,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginTop: 12,
    },
    role: {
      fontSize: font.m,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 3,
    },
    languageHint: {
      fontSize: font.m,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    languageOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    languageButton: { flex: 1 },
    languageError: {
      fontSize: font.m,
      color: colors.danger,
      marginTop: 10,
      lineHeight: 20,
    },
  });
