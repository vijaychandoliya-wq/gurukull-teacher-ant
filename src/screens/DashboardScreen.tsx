import React, {useCallback} from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';
import {Badge, Card, Flex, List, Text, View, WhiteSpace} from '@ant-design/react-native';
import {AnyRecord, getLeaves, getNotices, getTasks, getTimetableOverview} from '../api';
import {useAsyncData} from '../hooks';
import {AntIcon, EmptyBlock, LoadingBlock, PageTitle, Screen, SectionTitle, StatCard} from '../components/ui';
import {ScreenKey} from '../navigation';
import {colors, font, radius, spacing} from '../theme';

type DashboardData = {
  todayPeriods: AnyRecord[];
  summary: AnyRecord | null;
  notices: AnyRecord[];
  leaves: AnyRecord[];
  tasks: AnyRecord[];
};

const EMPTY: DashboardData = {todayPeriods: [], summary: null, notices: [], leaves: [], tasks: []};

/** Shortcuts surfaced above the fold, in the order a teacher's day runs. */
const SHORTCUTS: {key: ScreenKey; label: string; icon: 'calendar' | 'check-square' | 'book' | 'solution' | 'form' | 'check-circle'}[] = [
  {key: 'attendance', label: 'Attendance', icon: 'check-square'},
  {key: 'timetable', label: 'Timetable', icon: 'calendar'},
  {key: 'homework', label: 'Homework', icon: 'book'},
  {key: 'exams', label: 'Marks', icon: 'solution'},
  {key: 'tasks', label: 'Tasks', icon: 'check-circle'},
  {key: 'leave', label: 'Apply leave', icon: 'form'},
];

export default function DashboardScreen({
  navigate,
  profile,
  reloadProfile,
}: {
  navigate: (screen: ScreenKey) => void;
  profile: AnyRecord | null;
  reloadProfile: () => Promise<void>;
}) {
  const loader = useCallback(async (): Promise<DashboardData> => {
    // Settled rather than all: one unavailable module must not blank the whole
    // dashboard, which is the first thing a teacher sees each morning.
    const [timetable, notices, leaves, tasks] = await Promise.allSettled([
      getTimetableOverview(),
      getNotices(),
      getLeaves(),
      getTasks('mine'),
    ]);

    const today = new Date().toLocaleDateString('en-US', {weekday: 'long'});
    const overview = timetable.status === 'fulfilled' ? timetable.value : null;

    await reloadProfile();

    return {
      todayPeriods: overview?.days.find(day => day.day === today)?.periods || [],
      summary: overview?.summary || null,
      notices: notices.status === 'fulfilled' ? notices.value : [],
      leaves: leaves.status === 'fulfilled' ? leaves.value : [],
      tasks: tasks.status === 'fulfilled' ? tasks.value : [],
    };
  }, [reloadProfile]);

  const {data, loading, refreshing, error, refresh, clearError} = useAsyncData(loader, EMPTY);

  if (loading) {
    return <LoadingBlock />;
  }

  const pendingLeaves = data.leaves.filter(item => String(item.status).toLowerCase() === 'pending').length;
  const openTasks = data.tasks.filter(item => !item.task_completed).length;
  const firstName = String(profile?.fullname || 'Teacher').split(' ')[0];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title={`Hello, ${firstName}`} subtitle="Here is your school day at a glance." />

      <Card style={styles.heroCard}>
        <Card.Body>
          <Flex justify="between" align="center">
            <View style={styles.flex}>
              <Text style={styles.heroLabel}>TODAY · {data.summary?.today || new Date().toLocaleDateString('en-US', {weekday: 'long'})}</Text>
              <Text style={styles.heroValue}>
                {data.todayPeriods.length
                  ? `${data.todayPeriods.length} ${data.todayPeriods.length === 1 ? 'class' : 'classes'}`
                  : 'No classes today'}
              </Text>
              <Text style={styles.heroMeta}>
                {profile?.designation_name || profile?.designation || 'Teacher'}
                {profile?.employeeId ? ` · ${profile.employeeId}` : ''}
              </Text>
            </View>
            <View style={styles.heroIcon}>
              <AntIcon name="read" color="#fff" size={30} />
            </View>
          </Flex>
        </Card.Body>
      </Card>

      <WhiteSpace size="lg" />
      <Flex justify="between">
        <StatCard icon="calendar" value={data.summary?.week_periods ?? 0} label="Periods / week" />
        <StatCard icon="check-circle" value={openTasks} label="Open tasks" color={colors.cyan} />
        <StatCard icon="clock-circle" value={pendingLeaves} label="Leave pending" color={colors.warning} />
      </Flex>

      <WhiteSpace size="xl" />
      <SectionTitle title="Quick actions" />
      <View style={styles.actionGrid}>
        {SHORTCUTS.map(shortcut => (
          <TouchableOpacity
            key={shortcut.key}
            style={styles.actionTile}
            activeOpacity={0.7}
            onPress={() => navigate(shortcut.key)}>
            <View style={styles.actionIcon}>
              <AntIcon name={shortcut.icon} size={20} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {shortcut.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <WhiteSpace size="xl" />
      <Card>
        <Card.Header
          title="Today's schedule"
          thumb={<AntIcon name="clock-circle" />}
          extra={data.todayPeriods.length ? <Badge text={String(data.todayPeriods.length)} /> : undefined}
        />
        <Card.Body>
          {data.todayPeriods.length ? (
            data.todayPeriods.map((period, index) => (
              <List.Item
                key={period.id || index}
                thumb={
                  <View style={styles.periodBadge}>
                    <Text style={styles.periodText}>{period.period ?? index + 1}</Text>
                  </View>
                }
                extra={<Text style={styles.periodTime}>{period.start_time || '—'}</Text>}
                multipleLine
                onPress={() => navigate('timetable')}>
                {period.subject_name || 'Class'}
                <List.Item.Brief>{period.class_name || 'Assigned class'}</List.Item.Brief>
              </List.Item>
            ))
          ) : (
            <EmptyBlock
              title="Nothing scheduled"
              message="You have no periods on the timetable today."
              icon="calendar"
            />
          )}
        </Card.Body>
      </Card>

      <WhiteSpace size="xl" />
      <Card>
        <Card.Header
          title="Recent notices"
          thumb={<AntIcon name="bell" />}
          extra={data.notices.length ? <Badge text={String(data.notices.length)} /> : undefined}
        />
        <Card.Body>
          {data.notices.length ? (
            data.notices.slice(0, 3).map((notice, index) => (
              <List.Item
                key={notice.id || index}
                thumb={<AntIcon name="notification" color={colors.violet} size={20} />}
                multipleLine
                onPress={() => navigate('notices')}>
                {notice.title || 'School notice'}
                <List.Item.Brief>{notice.description || notice.publish_date || 'Open for details.'}</List.Item.Brief>
              </List.Item>
            ))
          ) : (
            <EmptyBlock title="No notices" message="New school announcements will appear here." icon="bell" />
          )}
        </Card.Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  heroCard: {backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: radius.l},
  heroLabel: {fontSize: font.s, fontWeight: '700', color: '#d6e4ff', letterSpacing: 1},
  heroValue: {fontSize: 21, fontWeight: '700', color: '#fff', marginTop: 5},
  heroMeta: {fontSize: font.main, color: '#e6f4ff', marginTop: 5},
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.l + 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  // A fixed-height Ant Button clipped the label, because the icon and the text
  // laid out as two lines inside it. These tiles size to their own content.
  actionTile: {
    width: '31.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.l,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.wathet,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  actionLabel: {fontSize: font.ms, color: colors.text, textAlign: 'center'},
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
  periodTime: {fontSize: font.ms, color: colors.textSecondary},
});
