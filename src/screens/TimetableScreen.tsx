import React, {useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Badge, Card, Flex, NoticeBar, Text, View, WhiteSpace} from '@ant-design/react-native';
import {Tabs} from '@ant-design/react-native';
import {AnyRecord, getTimetableOverview} from '../api';
import {useAsyncData} from '../hooks';
import {AntIcon, EmptyBlock, LoadingBlock, PageTitle, Screen, StatCard} from '../components/ui';
import {colors, font, radius, spacing} from '../theme';

type Overview = {
  installed: boolean;
  summary: AnyRecord | null;
  days: {day: string; day_index: number; periods: AnyRecord[]}[];
};

const EMPTY: Overview = {installed: true, summary: null, days: []};

/** Monday-first index for today; Sunday falls back to Monday. */
function todayIndex(days: Overview['days']) {
  const today = new Date().toLocaleDateString('en-US', {weekday: 'long'});
  const index = days.findIndex(day => day.day === today);
  return index >= 0 ? index : 0;
}

export default function TimetableScreen() {
  const loader = useCallback(() => getTimetableOverview(), []);
  const {data, loading, refreshing, error, refresh, clearError} = useAsyncData<Overview>(loader, EMPTY);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  if (loading) {
    return <LoadingBlock />;
  }

  const days = data.days.length ? data.days : [];
  // Settle on today the first time real data lands, but let the teacher's own
  // tab choice stick across pull-to-refresh.
  const active = activeDay ?? todayIndex(days);
  const current = days[active];
  const periods = current?.periods || [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="My timetable" subtitle="Your live weekly schedule from the Gurukull server." />

      {!data.installed ? (
        <>
          <NoticeBar icon={<AntIcon name="info-circle" color={colors.warning} size={18} />}>
            The timetable module is not enabled for your school yet.
          </NoticeBar>
          <WhiteSpace size="lg" />
        </>
      ) : null}

      {data.summary ? (
        <>
          <Flex justify="between">
            <StatCard icon="calendar" value={data.summary.week_periods ?? 0} label="Periods / week" />
            <StatCard icon="team" value={data.summary.classes ?? 0} label="Classes" color={colors.cyan} />
            <StatCard icon="book" value={data.summary.subjects ?? 0} label="Subjects" color={colors.violet} />
          </Flex>
          <WhiteSpace size="xl" />
        </>
      ) : null}

      {days.length ? (
        <Tabs
          tabs={days.map(day => ({title: day.day.slice(0, 3), key: day.day}))}
          page={active}
          onChange={(_tab, index) => setActiveDay(index)}
          swipeable={false}
          noRenderContent>
          <View />
        </Tabs>
      ) : null}

      <WhiteSpace size="lg" />
      <Card>
        <Card.Header
          title={current?.day || 'Timetable'}
          thumb={<AntIcon name="calendar" />}
          extra={<Badge text={`${periods.length} ${periods.length === 1 ? 'class' : 'classes'}`} />}
        />
        <Card.Body>
          {periods.length ? (
            periods.map((period, index) => (
              <View key={period.id || `${current?.day}-${index}`} style={styles.row}>
                <View style={styles.periodBadge}>
                  <Text style={styles.periodText}>{period.period ?? index + 1}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.subject}>{period.subject_name || 'Class'}</Text>
                  <Text style={styles.class}>{period.class_name || 'Assigned class'}</Text>
                  <Text style={styles.time}>
                    <AntIcon name="clock-circle" size={14} color={colors.weak} /> {period.start_time || '—'} –{' '}
                    {period.end_time || '—'}
                    {period.room_no ? ` · Room ${period.room_no}` : ''}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyBlock
              title="No classes"
              message={`Nothing is scheduled for ${current?.day || 'this day'}.`}
              icon="calendar"
            />
          )}
        </Card.Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  periodBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.l,
    backgroundColor: colors.wathet,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  periodText: {fontSize: font.l, fontWeight: '700', color: colors.primary},
  body: {flex: 1},
  subject: {fontSize: font.xl, fontWeight: '600', color: colors.text},
  class: {fontSize: font.main, color: colors.primary, marginTop: 2},
  time: {fontSize: font.ms, color: colors.textSecondary, marginTop: 5},
});
