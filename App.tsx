import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Button, List, Provider, Text, View } from '@ant-design/react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  AnyRecord,
  ApiError,
  clearSession,
  getProfile,
  hasSession,
  logout,
} from './src/api';
import { initials } from './src/hooks';
import { AntIcon, ButtonLabel, LoadingBlock } from './src/components/ui';
import {
  Route,
  SCREENS,
  ScreenKey,
  ScreenParams,
  menuFor,
  screenTitle,
} from './src/navigation';
import {
  ThemeProvider,
  useAppTheme,
  font,
  spacing,
  useThemeColors,
  useThemedStyles,
  type AppColors,
} from './src/theme';
import { ThemePicker } from './src/components/ThemePicker';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TimetableScreen from './src/screens/TimetableScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import HomeworkScreen from './src/screens/HomeworkScreen';
import AssignmentsScreen from './src/screens/AssignmentsScreen';
import ExamsScreen from './src/screens/ExamsScreen';
import ExamMarksScreen from './src/screens/ExamMarksScreen';
import TasksScreen from './src/screens/TasksScreen';
import LessonPlansScreen from './src/screens/LessonPlansScreen';
import LeaveScreen from './src/screens/LeaveScreen';
import NoticesScreen from './src/screens/NoticesScreen';
import EventsScreen from './src/screens/EventsScreen';
import HolidaysScreen from './src/screens/HolidaysScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import DisciplineScreen from './src/screens/DisciplineScreen';
import SchoolScreen from './src/screens/SchoolScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import AbsentListScreen from './src/screens/AbsentListScreen';
import SubmissionsScreen from './src/screens/SubmissionsScreen';
import HomeworkSubmissionsScreen from './src/screens/HomeworkSubmissionsScreen';
import TaskComposeScreen from './src/screens/TaskComposeScreen';
import LeaveApprovalsScreen from './src/screens/LeaveApprovalsScreen';
import StudentLeaveScreen from './src/screens/StudentLeaveScreen';
import ApprovalsScreen from './src/screens/ApprovalsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

import { Drawer } from '@ant-design/react-native';
import enUS from '@ant-design/react-native/lib/locale-provider/en_US';
import { LanguageProvider } from './src/i18n';

function DrawerSidebar({
  profile,
  active,
  navigate,
  signOut,
}: {
  profile: AnyRecord | null;
  active: ScreenKey;
  navigate: (screen: ScreenKey) => void;
  signOut: () => void;
}) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.drawerSafe} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.drawerContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatar}>
            {profile?.avatar ? (
              <Image
                source={{ uri: profile.avatar }}
                style={styles.drawerImage}
              />
            ) : (
              <Text style={styles.drawerInitials}>
                {initials(profile?.fullname)}
              </Text>
            )}
          </View>
          <Text style={styles.drawerName}>
            {profile?.fullname || 'Gurukull Teacher'}
          </Text>
          <Text style={styles.drawerRole}>
            {profile?.designation_name || profile?.designation || 'Teacher'}
          </Text>
        </View>
        <List style={styles.drawerList}>
          {menuFor(profile?.permissions).map(item => {
            const isActive = active === item.key;
            return (
              <List.Item
                key={item.key}
                onPress={() => navigate(item.key)}
                thumb={
                  <AntIcon
                    name={item.icon}
                    color={isActive ? colors.primary : colors.weak}
                    size={20}
                  />
                }
                arrow={isActive ? 'horizontal' : undefined}
                styles={{ Line: isActive ? styles.activeMenuLine : undefined }}
              >
                <Text
                  style={isActive ? styles.activeMenuText : styles.menuText}
                >
                  {item.title}
                </Text>
              </List.Item>
            );
          })}
        </List>
      </ScrollView>
      <View style={styles.drawerFooter}>
        <ThemePicker />
        <Button type="warning" onPress={signOut}>
          <ButtonLabel icon="logout" tone="danger">
            Sign out
          </ButtonLabel>
        </Button>
        <Text style={styles.versionText}>
          Gurukull Teacher · Ant Design Mobile
        </Text>
      </View>
    </SafeAreaView>
  );
}

function TeacherApp({ onSignedOut }: { onSignedOut: () => void }) {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const { isDark } = useAppTheme();
  const { width } = useWindowDimensions();

  const [route, setRoute] = useState<Route>({ key: 'dashboard' });
  const [history, setHistory] = useState<Route[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<AnyRecord | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await getProfile());
    } catch (reason) {
      // An expired token is the one failure that must bounce to the login
      // screen; everything else is left for the screen itself to report.
      if (reason instanceof ApiError && reason.status === 401) {
        await clearSession();
        onSignedOut();
      }
    }
  }, [onSignedOut]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const navigate = useCallback(
    (key: ScreenKey, params?: ScreenParams) => {
      // Only drill-downs build a back stack. Top-level destinations are reached
      // from the drawer, so they keep the menu button rather than a back arrow
      // the teacher would otherwise have to press before opening the drawer.
      const isDrillDown = SCREENS.find(screen => screen.key === key)?.nested;
      setHistory(current => (isDrillDown ? [...current, route] : []));
      setRoute({ key, params });
      setDrawerOpen(false);
    },
    [route],
  );

  const goBack = useCallback(() => {
    setHistory(current => {
      if (!current.length) {
        return current;
      }
      setRoute(current[current.length - 1]);
      return current.slice(0, -1);
    });
  }, []);

  const signOut = async () => {
    setDrawerOpen(false);
    try {
      await logout();
    } catch {
      await clearSession();
    }
    onSignedOut();
  };

  const content = useMemo(() => {
    switch (route.key) {
      case 'timetable':
        return <TimetableScreen />;
      case 'attendance':
        return <AttendanceScreen navigate={navigate} />;
      case 'absentList':
        return <AbsentListScreen params={route.params} />;
      case 'homework':
        return <HomeworkScreen navigate={navigate} />;
      case 'homeworkSubmissions':
        return <HomeworkSubmissionsScreen params={route.params} />;
      case 'assignments':
        return <AssignmentsScreen navigate={navigate} />;
      case 'submissions':
        return <SubmissionsScreen params={route.params} />;
      case 'exams':
        return <ExamsScreen navigate={navigate} />;
      case 'examMarks':
        return <ExamMarksScreen params={route.params} />;
      case 'tasks':
        return <TasksScreen navigate={navigate} />;
      case 'taskCompose':
        return <TaskComposeScreen onDone={goBack} />;
      case 'lessonPlans':
        return <LessonPlansScreen />;
      case 'leave':
        return <LeaveScreen />;
      case 'leaveApprovals':
        return <LeaveApprovalsScreen />;
      case 'studentLeave':
        return <StudentLeaveScreen />;
      case 'approvals':
        return <ApprovalsScreen />;
      case 'notices':
        return <NoticesScreen />;
      case 'notifications':
        return <NotificationsScreen profile={profile} />;
      case 'events':
        return <EventsScreen />;
      case 'holidays':
        return <HolidaysScreen />;
      case 'messages':
        return <MessagesScreen />;
      case 'discipline':
        return <DisciplineScreen />;
      case 'school':
        return <SchoolScreen />;
      case 'profile':
        return <ProfileScreen profile={profile} navigate={navigate} />;
      case 'changePassword':
        return (
          <ChangePasswordScreen
            onDone={() => {
              void clearSession()
                .catch(() => {})
                .finally(onSignedOut);
            }}
          />
        );
      default:
        return (
          <DashboardScreen
            navigate={navigate}
            profile={profile}
            reloadProfile={loadProfile}
          />
        );
    }
  }, [route, profile, loadProfile, navigate, goBack, onSignedOut]);

  const canGoBack = history.length > 0;

  return (
    <SafeAreaView style={styles.appSafe} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      <Drawer
        sidebar={
          <DrawerSidebar
            profile={profile}
            active={route.key}
            navigate={navigate}
            signOut={signOut}
          />
        }
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        drawerWidth={Math.min(320, width - 32)}
        drawerBackgroundColor={colors.surface}
      >
        <View style={styles.appShell}>
          <View style={styles.topBar}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={canGoBack ? 'Go back' : 'Open navigation'}
              style={styles.iconButton}
              onPress={() => (canGoBack ? goBack() : setDrawerOpen(true))}
            >
              <AntIcon
                name={canGoBack ? 'left' : 'menu'}
                color={colors.text}
                size={20}
              />
            </TouchableOpacity>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {screenTitle(route.key)}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Refresh profile"
              style={styles.iconButton}
              onPress={loadProfile}
            >
              <AntIcon name="sync" color={colors.text} size={20} />
            </TouchableOpacity>
          </View>
          <View style={styles.flex}>{content}</View>
        </View>
      </Drawer>
    </SafeAreaView>
  );
}

function Root() {
  const styles = useThemedStyles(createStyles);

  const [booting, setBooting] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    hasSession()
      .then(setAuthenticated)
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    return (
      <SafeAreaView style={styles.appSafe}>
        <LoadingBlock />
      </SafeAreaView>
    );
  }
  return authenticated ? (
    <TeacherApp onSignedOut={() => setAuthenticated(false)} />
  ) : (
    <LoginScreen onSuccess={() => setAuthenticated(true)} />
  );
}

function ThemedProvider({ children }: { children: React.ReactNode }) {
  const { antdTheme } = useAppTheme();
  return (
    <Provider theme={antdTheme} locale={enUS}>
      {children}
    </Provider>
  );
}

export default function App() {
  const styles = useThemedStyles(createStyles);

  return (
    // Ant's Drawer pans with react-native-gesture-handler, which requires this
    // root. Without it the drawer swipe silently stops working in release
    // builds and throws outright in development.
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        {/* Ant Design Mobile ships Chinese copy by default, which surfaced as
          "请选择" on every picker. */}
        <ThemeProvider>
          <ThemedProvider>
            <LanguageProvider>
              <Root />
            </LanguageProvider>
          </ThemedProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    appSafe: { flex: 1, backgroundColor: colors.surface },
    appShell: { flex: 1, backgroundColor: colors.background },
    topBar: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.l,
      backgroundColor: colors.surface,
      borderWidth: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    topBarTitle: {
      fontSize: font.xxl,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      textAlign: 'center',
    },
    iconButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    drawerSafe: { flex: 1, backgroundColor: colors.surface },
    drawerContent: { paddingBottom: spacing.l },
    drawerHeader: {
      paddingHorizontal: 22,
      paddingTop: 22,
      paddingBottom: spacing.xl - 4,
      backgroundColor: colors.drawerHeaderBg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.drawerHeaderBorder,
    },
    drawerAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    drawerImage: { width: 68, height: 68 },
    drawerInitials: { fontSize: 24, fontWeight: '700', color: '#fff' },
    drawerName: {
      fontSize: font.huge,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
    },
    drawerRole: {
      fontSize: font.main,
      color: colors.textSecondary,
      marginTop: 3,
    },
    drawerList: { marginTop: 10 },
    activeMenuLine: { backgroundColor: colors.wathet },
    activeMenuText: {
      fontSize: font.l,
      fontWeight: '600',
      color: colors.primary,
    },
    menuText: { fontSize: font.l, color: colors.text },
    drawerFooter: {
      padding: spacing.l,
      gap: spacing.m,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    versionText: {
      fontSize: font.s,
      color: colors.weak,
      textAlign: 'center',
      marginTop: 12,
    },
  });
