import React, { useCallback } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Text, View, WhiteSpace } from '@ant-design/react-native';
import { AnyRecord, getSchool } from '../api';
import { useAsyncData } from '../hooks';
import {
  AntIcon,
  Card,
  DetailRows,
  LoadingBlock,
  PageTitle,
  Screen,
  SectionTitle,
} from '../components/ui';
import {
  font,
  radius,
  useThemeColors,
  useThemedStyles,
  type AppColors,
} from '../theme';

export default function SchoolScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const loader = useCallback(() => getSchool(), []);
  const { data, loading, refreshing, error, refresh, clearError } =
    useAsyncData<AnyRecord>(loader, {});

  if (loading) {
    return <LoadingBlock />;
  }

  const address = [
    data.address,
    data.city,
    data.state,
    data.country,
    data.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      error={error}
      onDismissError={clearError}
    >
      <PageTitle
        title="My school"
        subtitle="Institution details from your school account."
      />

      <Card style={styles.hero}>
        <Card.Body>
          <View style={styles.logoWrap}>
            {data.schoolLogo ? (
              <Image
                source={{ uri: data.schoolLogo }}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <AntIcon name="bank" size={36} color={colors.primary} />
            )}
          </View>
          <Text style={styles.name}>{data.schoolName || 'Your school'}</Text>
          {data.moto ? <Text style={styles.moto}>“{data.moto}”</Text> : null}
        </Card.Body>
      </Card>

      <WhiteSpace size="lg" />
      <SectionTitle title="Details" />
      <DetailRows
        rows={[
          ['Board', data.board],
          ['Affiliated by', data.affiliatedBy],
          ['Affiliation no.', data.affiliationNo],
          ['Established', data.dateOfEstablishment],
          ['Landline', data.landlineNo],
          ['Website', data.website],
          ['Address', address],
        ]}
      />

      {data.aboutUs ? (
        <>
          <WhiteSpace size="xl" />
          <SectionTitle title="About" />
          <Card>
            <Card.Body>
              <Text style={styles.about}>{data.aboutUs}</Text>
            </Card.Body>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    hero: { borderRadius: radius.l },
    logoWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.wathet,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      overflow: 'hidden',
    },
    logo: { width: 72, height: 72 },
    name: {
      fontSize: 21,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginTop: 12,
    },
    moto: {
      fontSize: font.m,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      fontStyle: 'italic',
    },
    about: { fontSize: font.m, lineHeight: 22, color: colors.text },
  });
