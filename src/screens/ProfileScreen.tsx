import React from 'react';
import {Image, StyleSheet} from 'react-native';
import {Button, Text, View, WhiteSpace} from '@ant-design/react-native';
import {AnyRecord} from '../api';
import {initials} from '../hooks';
import {ButtonLabel, Card, DetailRows, PageTitle, Screen, SectionTitle} from '../components/ui';
import {ScreenKey} from '../navigation';
import {colors, font, radius} from '../theme';

export default function ProfileScreen({
  profile,
  navigate,
}: {
  profile: AnyRecord | null;
  navigate: (screen: ScreenKey) => void;
}) {
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
      <PageTitle title="My profile" subtitle="Teacher information from your school account." />

      <Card style={styles.profileCard}>
        <Card.Body>
          <View style={styles.avatar}>
            {profile?.avatar ? (
              <Image source={{uri: profile.avatar}} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials(profile?.fullname)}</Text>
            )}
          </View>
          <Text style={styles.name}>{profile?.fullname || 'Teacher'}</Text>
          <Text style={styles.role}>{profile?.designation_name || profile?.designation || 'Gurukull Teacher'}</Text>
        </Card.Body>
      </Card>

      <WhiteSpace size="lg" />
      <SectionTitle title="Account details" />
      <DetailRows rows={rows} />

      <WhiteSpace size="xl" />
      <Button onPress={() => navigate('changePassword')}>
        <ButtonLabel icon="lock">Change password</ButtonLabel>
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {borderRadius: radius.l},
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
  avatarImage: {width: 84, height: 84},
  avatarInitials: {fontSize: 28, fontWeight: '700', color: colors.primary},
  name: {fontSize: 21, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 12},
  role: {fontSize: font.m, color: colors.textSecondary, textAlign: 'center', marginTop: 3},
});
