import React, {useCallback} from 'react';
import {StyleSheet} from 'react-native';
import {Card, Flex, Text, View} from '@ant-design/react-native';
import {AnyRecord, getHolidays} from '../api';
import {useAsyncData} from '../hooks';
import {AntIcon, EmptyBlock, LoadingBlock, PageTitle, Screen} from '../components/ui';
import {colors, font, radius, spacing} from '../theme';

/** `26-12-2026` → `{day: '26', month: 'DEC'}` for the calendar chip. */
function splitDate(value?: string) {
  const parts = String(value || '').split('-');
  if (parts.length < 2) {
    return {day: '—', month: ''};
  }
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return {day: parts[0], month: months[Number(parts[1]) - 1] || ''};
}

export default function HolidaysScreen() {
  const loader = useCallback(() => getHolidays(), []);
  const {data, loading, refreshing, error, refresh, clearError} = useAsyncData<AnyRecord[]>(loader, []);

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Holidays" subtitle="The school holiday calendar for this academic year." />

      {data.length ? (
        <Card>
          <Card.Header title={`${data.length} holidays`} thumb={<AntIcon name="gift" />} />
          <Card.Body>
            {data.map((holiday, index) => {
              const {day, month} = splitDate(holiday.date);
              return (
                <View key={holiday.id || index} style={styles.row}>
                  <Flex align="center">
                    <View style={styles.dateChip}>
                      <Text style={styles.day}>{day}</Text>
                      <Text style={styles.month}>{month}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.title}>{holiday.title || 'Holiday'}</Text>
                      <Text style={styles.date}>{holiday.date}</Text>
                    </View>
                  </Flex>
                </View>
              );
            })}
          </Card.Body>
        </Card>
      ) : (
        <EmptyBlock title="No holidays listed" message="The holiday calendar has not been published yet." icon="gift" />
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
  dateChip: {
    width: 48,
    height: 48,
    borderRadius: radius.m,
    backgroundColor: colors.wathet,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  day: {fontSize: font.xl, fontWeight: '700', color: colors.primary, lineHeight: 20},
  month: {fontSize: font.xxs, fontWeight: '700', color: colors.primary, letterSpacing: 0.5},
  info: {flex: 1},
  title: {fontSize: font.l, fontWeight: '600', color: colors.text},
  date: {fontSize: font.ms, color: colors.weak, marginTop: 2},
});
