import {OutlineGlyphMapType} from '@ant-design/icons-react-native';

export type ScreenKey =
  | 'dashboard'
  | 'timetable'
  | 'attendance'
  | 'absentList'
  | 'homework'
  | 'homeworkSubmissions'
  | 'assignments'
  | 'submissions'
  | 'exams'
  | 'examMarks'
  | 'tasks'
  | 'taskCompose'
  | 'lessonPlans'
  | 'leave'
  | 'leaveApprovals'
  | 'studentLeave'
  | 'approvals'
  | 'notices'
  | 'notifications'
  | 'events'
  | 'holidays'
  | 'messages'
  | 'discipline'
  | 'school'
  | 'profile'
  | 'changePassword';

/** Params carried into drill-down screens (exam mark entry needs a schedule). */
export type ScreenParams = Record<string, any>;

export type Route = {key: ScreenKey; params?: ScreenParams};

export type ScreenMeta = {
  key: ScreenKey;
  title: string;
  icon: OutlineGlyphMapType;
  /** Hidden from the drawer: reached by drilling down from another screen. */
  nested?: boolean;
  /**
   * Only listed when the teacher holds this role. The server enforces the same
   * roles on the underlying endpoints; this just keeps the drawer honest about
   * what the teacher can actually do.
   */
  role?: string;
};

/**
 * Single source of truth for screen titles, drawer icons and menu order. The
 * top bar title, the drawer and the dashboard shortcuts all read from here, so
 * a new screen is added in exactly one place.
 */
export const SCREENS: ScreenMeta[] = [
  {key: 'dashboard', title: 'Dashboard', icon: 'dashboard'},
  {key: 'timetable', title: 'Timetable', icon: 'calendar'},
  {key: 'attendance', title: 'Attendance', icon: 'check-square'},
  {key: 'absentList', title: 'Absentees', icon: 'history', nested: true},
  {key: 'homework', title: 'Homework', icon: 'book'},
  {key: 'homeworkSubmissions', title: 'Homework submissions', icon: 'audit', nested: true},
  {key: 'assignments', title: 'Assignments', icon: 'file-text'},
  {key: 'submissions', title: 'Submissions', icon: 'audit', nested: true},
  {key: 'exams', title: 'Exams & marks', icon: 'solution'},
  {key: 'examMarks', title: 'Enter marks', icon: 'edit', nested: true},
  {key: 'tasks', title: 'My tasks', icon: 'check-circle'},
  {key: 'taskCompose', title: 'New task', icon: 'plus-circle', nested: true},
  {key: 'lessonPlans', title: 'Lesson plans', icon: 'read'},
  {key: 'leave', title: 'Leave', icon: 'form'},
  {key: 'leaveApprovals', title: 'Leave approvals', icon: 'audit', role: 'leave_checker'},
  {key: 'studentLeave', title: 'Student leave', icon: 'team', role: 'student_leave_checker'},
  {key: 'approvals', title: 'Approvals', icon: 'safety-certificate', role: 'principal'},
  {key: 'notices', title: 'Notice board', icon: 'notification'},
  {key: 'notifications', title: 'Notifications', icon: 'bell'},
  {key: 'events', title: 'Events', icon: 'flag'},
  {key: 'holidays', title: 'Holidays', icon: 'gift'},
  {key: 'messages', title: 'Messages', icon: 'message'},
  {key: 'discipline', title: 'Performance', icon: 'trophy'},
  {key: 'school', title: 'My school', icon: 'bank'},
  {key: 'profile', title: 'My profile', icon: 'user'},
  {key: 'changePassword', title: 'Change password', icon: 'lock', nested: true},
];

/**
 * Drawer entries for a teacher, given the roles `myinfo` reports in
 * `permissions`. Role-gated screens are left out entirely rather than shown and
 * then refused.
 */
export function menuFor(roles: string[] | undefined): ScreenMeta[] {
  const held = roles || [];
  return SCREENS.filter(screen => !screen.nested && (!screen.role || held.includes(screen.role)));
}

export const screenTitle = (key: ScreenKey) =>
  SCREENS.find(screen => screen.key === key)?.title ?? 'Gurukull Teacher';
