import React, {useCallback} from 'react';
import {StyleSheet} from 'react-native';
import {Badge, Flex, Text, View} from '@ant-design/react-native';
import {AnyRecord, getNotifications} from '../api';
import {useAsyncData} from '../hooks';
import {AntIcon, Card, EmptyBlock, LoadingBlock, PageTitle, Screen} from '../components/ui';
import {colors, font, radius, spacing} from '../theme';

/** Picks an icon from the notification's `type` string. */
function iconFor(type?: string) {
  const value = String(type || '').toLowerCase();
  if (value.includes('leave')) {
    return 'form' as const;
  }
  if (value.includes('attendance')) {
    return 'check-square' as const;
  }
  if (value.includes('homework') || value.includes('assignment')) {
    return 'book' as const;
  }
  if (value.includes('task')) {
    return 'check-circle' as const;
  }
  return 'bell' as const;
}

export default function NotificationsScreen({profile}: {profile: AnyRecord | null}) {
  const teacherId = profile?.id;

  const loader = useCallback(async () => {
    if (!teacherId) {
      return [];
    }
    return getNotifications(teacherId);
  }, [teacherId]);

  const {data, loading, refreshing, error, refresh, clearError} = useAsyncData<AnyRecord[]>(loader, []);

  if (loading) {
    return <LoadingBlock />;
  }

  const unread = data.filter(item => !item.read_at).length;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Notifications" subtitle="Everything the school has pushed to you." />

      {data.length ? (
        <Card>
          <Card.Header
            title="Recent"
            thumb={<AntIcon name="bell" />}
            extra={unread ? <Badge text={`${unread} new`} /> : undefined}
          />
          <Card.Body>
            {data.map((item, index) => (
              <View key={item.id || index} style={[styles.row, !item.read_at && styles.unreadRow]}>
                <Flex align="start">
                  <View style={styles.iconWrap}>
                    <AntIcon name={iconFor(item.type)} size={18} />
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.message}>{item.data_message || item.type || 'Notification'}</Text>
                    <Text style={styles.time}>{item.created_at || item.datetime}</Text>
                  </View>
                  {!item.read_at ? <View style={styles.dot} /> : null}
                </Flex>
              </View>
            ))}
          </Card.Body>
        </Card>
      ) : (
        <EmptyBlock title="Nothing yet" message="School notifications will show up here." icon="bell" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  unreadRow: {backgroundColor: colors.wathet, marginHorizontal: -spacing.l, paddingHorizontal: spacing.l},
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.m,
    backgroundColor: colors.wathet,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  body: {flex: 1},
  message: {fontSize: font.m, lineHeight: 20, color: colors.text},
  time: {fontSize: font.ms, color: colors.weak, marginTop: 3},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6},
});
