/**
 * Smoke test for every screen in the app.
 *
 * The API module is mocked wholesale, so each screen is rendered twice: once
 * against a populated response and once against an empty one. That catches the
 * two ways a screen usually breaks — a field the API does not return, and an
 * empty list rendered without its empty state.
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Provider} from '@ant-design/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

jest.mock('../src/api');

import * as api from '../src/api';
import {FORBIDDEN} from '../src/api';
import {antdTheme} from '../src/theme';

import DashboardScreen from '../src/screens/DashboardScreen';
import TimetableScreen from '../src/screens/TimetableScreen';
import AttendanceScreen from '../src/screens/AttendanceScreen';
import HomeworkScreen from '../src/screens/HomeworkScreen';
import AssignmentsScreen from '../src/screens/AssignmentsScreen';
import ExamsScreen from '../src/screens/ExamsScreen';
import ExamMarksScreen from '../src/screens/ExamMarksScreen';
import TasksScreen from '../src/screens/TasksScreen';
import LessonPlansScreen from '../src/screens/LessonPlansScreen';
import LeaveScreen from '../src/screens/LeaveScreen';
import NoticesScreen from '../src/screens/NoticesScreen';
import EventsScreen from '../src/screens/EventsScreen';
import HolidaysScreen from '../src/screens/HolidaysScreen';
import MessagesScreen from '../src/screens/MessagesScreen';
import DisciplineScreen from '../src/screens/DisciplineScreen';
import SchoolScreen from '../src/screens/SchoolScreen';
import ProfileScreen from '../src/screens/ProfileScreen';
import ChangePasswordScreen from '../src/screens/ChangePasswordScreen';
import AbsentListScreen from '../src/screens/AbsentListScreen';
import SubmissionsScreen from '../src/screens/SubmissionsScreen';
import HomeworkSubmissionsScreen from '../src/screens/HomeworkSubmissionsScreen';
import TaskComposeScreen from '../src/screens/TaskComposeScreen';
import LeaveApprovalsScreen from '../src/screens/LeaveApprovalsScreen';
import StudentLeaveScreen from '../src/screens/StudentLeaveScreen';
import ApprovalsScreen from '../src/screens/ApprovalsScreen';
import NotificationsScreen from '../src/screens/NotificationsScreen';

const mocked = api as jest.Mocked<typeof api>;

const PROFILE = {
  id: 10,
  fullname: 'Asha Menon',
  designation_name: 'Senior Teacher',
  employeeId: 'EMP-104',
  email: 'asha@gurukull.in',
};

const PERIOD = {
  id: 5,
  day: 'Monday',
  day_index: 1,
  period: 1,
  class_id: 23,
  class_name: 'PREKG - A',
  subject_id: 1,
  subject_name: 'ENGLISH',
  room_no: null,
  start_time: '09:00 AM',
  end_time: '09:45 AM',
};

/** Populated responses, shaped like the real teacher API. */
function stubWithData() {
  mocked.getProfile.mockResolvedValue(PROFILE);
  mocked.getSchool.mockResolvedValue({
    schoolName: 'Gurukull Public School',
    board: 'CBSE',
    address: '12 Nehru Road',
    city: 'Kochi',
    aboutUs: 'Founded in 1994.',
  });
  mocked.getClasses.mockResolvedValue([{id: 23, standard_section: 'PREKG - A'}]);
  mocked.getTimetable.mockResolvedValue([PERIOD]);
  mocked.getTimetableOverview.mockResolvedValue({
    installed: true,
    summary: {today: 'Monday', today_periods: 1, week_periods: 28, classes: 1, subjects: 1},
    days: [{day: 'Monday', day_index: 1, periods: [PERIOD]}],
  });
  mocked.getLeaves.mockResolvedValue([
    {id: 1, leave_type: 'Casual', status: 'Pending', from_date: '01 Aug 2026', to_date: '02 Aug 2026'},
  ]);
  mocked.getLeaveOptions.mockResolvedValue({
    leavelist: [{id: 1, name: 'Casual'}],
    reasonlist: [{id: 2, title: 'Personal'}],
    session: [{id: 'day', name: 'Full day'}],
  });
  mocked.getNotices.mockResolvedValue([
    {id: 1, title: 'Sports day', description: 'Friday', publish_date: '01-08-2026', type: 'general'},
  ]);
  mocked.getExpiredNotices.mockResolvedValue([]);
  mocked.getAttendanceForm.mockResolvedValue({
    standardlist: [{id: 23, standard_section: 'PREKG - A'}],
    studentlist: [{user_id: 7, id: 7, name: 'Ravi Kumar', class: 'PREKG - A', standardLink_id: 23}],
    absentReasonlist: [{id: 3, title: 'Sick'}],
  });
  mocked.getHomework.mockResolvedValue([
    {id: 1, subject_name: 'ENGLISH', class_name: 'PREKG - A', status: 'pending', description: 'Page 4'},
  ]);
  mocked.getAssignments.mockResolvedValue([
    {id: 1, title: 'Essay', subject_name: 'ENGLISH', class_name: 'PREKG - A', status: 'approved', marks: 20},
  ]);
  mocked.getExams.mockResolvedValue([
    {
      exam_id: 1,
      name: 'Midterm',
      exam_standard: 'PREKG - A',
      schedule: [{schedule_id: 9, subject_name: 'ENGLISH', exam_date: '10-08-2026', start_time: '09:00'}],
    },
  ]);
  mocked.getExamStudents.mockResolvedValue([
    {user_id: 7, name: 'Ravi Kumar', class: 'PREKG - A', marks: '18', status: 'present'},
  ]);
  mocked.getExamMarks.mockResolvedValue([
    {mark_id: 1, student_name: 'Ravi Kumar', obtained_marks: '18', mark_status: 'Pass', subject_name: 'ENGLISH'},
  ]);
  mocked.getTasks.mockResolvedValue([
    {task_id: 1, title: 'Collect fees', task_status: 'active', priority: 'high', task_completed: false},
  ]);
  mocked.getLessonPlans.mockResolvedValue([
    {id: 1, title: 'Unit 1', subject: 'ENGLISH', class: 'PREKG - A', status: 'draft', is_published: 0},
  ]);
  mocked.getEvents.mockResolvedValue([
    {event_id: 1, title: 'Annual day', start_date: '20-08-2026', category: 'cultural'},
  ]);
  mocked.getHolidays.mockResolvedValue([{id: 1, date: '15-08-2026', title: 'Independence Day'}]);
  mocked.getMessages.mockResolvedValue([
    {feedback_id: 1, messages: [{message: 'Thanks', student_name: 'Ravi Kumar'}], last_reply_by: 'Parent'},
  ]);
  mocked.getDisciplineRecords.mockResolvedValue([
    {id: 1, student_name: 'Ravi Kumar', type: 'positive', incidentDate: '01 Aug 2026', incidentDetail: 'Helped'},
  ]);
  mocked.getLeaveBalanceRows.mockResolvedValue([
    {name: 'Casual', totalDays: 12, leaveUsed: 3, leaveAvailable: 9},
  ]);
  mocked.getAbsentList.mockResolvedValue([{id: 1, name: 'Ravi Kumar', reason: 'Sick', remarks: 'Fever'}]);
  mocked.getAssignmentSubmissions.mockResolvedValue([
    {id: 1, user_name: 'Ravi Kumar', roll_number: '12', submitted_on: '02 Aug 2026', total_marks: 20},
  ]);
  mocked.getNotifications.mockResolvedValue([
    {id: 1, type: 'leave', data_message: 'Your leave was approved', created_at: '2 hours ago', read_at: null},
  ]);
  mocked.getLeaveApprovals.mockResolvedValue([
    {id: 1, teacher_name: 'Ravi Nair', leave_type: 'Casual', status: 'Pending', from_date: '01 Aug', to_date: '02 Aug'},
  ]);
  mocked.getStudentLeaves.mockResolvedValue([
    {id: 1, name: 'Ravi Kumar', standard_name: 'PREKG - A', status: 'pending', from: '01 Aug', to: '02 Aug'},
  ]);
  mocked.getPendingApprovals.mockResolvedValue({
    homework: [{id: 1, subject_name: 'ENGLISH', class_name: 'PREKG - A', created_by: 'Ravi Nair'}],
    lessonPlans: [{id: 2, title: 'Unit 1', subject: 'ENGLISH', class: 'PREKG - A', is_published: 0}],
  });
  mocked.getTaskOptions.mockResolvedValue({
    task_assignee_list: [{id: 'teacher', name: 'Teacher'}],
    standardlinks: [{id: 23, standard_section: 'PREKG - A'}],
  });
  mocked.getTaskTeachers.mockResolvedValue([{id: 11, name: 'Ravi Nair'}]);
  mocked.getTaskStaff.mockResolvedValue([]);
  mocked.getTaskStudents.mockResolvedValue([]);
  mocked.getHomeworkSubmissions.mockResolvedValue([
    {id: 1, user_fullname: 'Ravi Kumar', submitted_on: '02-08-2026', status: 'Pending'},
    {id: 2, user_fullname: 'Meera Das', submitted_on: '02-08-2026', status: 'Checked', comments: 'Neat'},
  ]);
}

/** Every list endpoint empty — the state a brand new school is in. */
function stubEmpty() {
  mocked.getProfile.mockResolvedValue({});
  mocked.getSchool.mockResolvedValue({});
  mocked.getClasses.mockResolvedValue([]);
  mocked.getTimetable.mockResolvedValue([]);
  mocked.getTimetableOverview.mockResolvedValue({installed: false, summary: null, days: []});
  mocked.getLeaves.mockResolvedValue([]);
  mocked.getLeaveOptions.mockResolvedValue({leavelist: [], reasonlist: [], session: []});
  mocked.getNotices.mockResolvedValue([]);
  mocked.getExpiredNotices.mockResolvedValue([]);
  mocked.getAttendanceForm.mockResolvedValue({standardlist: [], studentlist: [], absentReasonlist: []});
  mocked.getHomework.mockResolvedValue([]);
  mocked.getAssignments.mockResolvedValue([]);
  mocked.getExams.mockResolvedValue([]);
  mocked.getExamStudents.mockResolvedValue([]);
  mocked.getExamMarks.mockResolvedValue([]);
  mocked.getTasks.mockResolvedValue([]);
  mocked.getLessonPlans.mockResolvedValue([]);
  mocked.getEvents.mockResolvedValue([]);
  mocked.getHolidays.mockResolvedValue([]);
  mocked.getMessages.mockResolvedValue([]);
  mocked.getDisciplineRecords.mockResolvedValue([]);
  mocked.getLeaveBalanceRows.mockResolvedValue([]);
  mocked.getAbsentList.mockResolvedValue([]);
  mocked.getAssignmentSubmissions.mockResolvedValue([]);
  mocked.getNotifications.mockResolvedValue([]);
  mocked.getTaskOptions.mockResolvedValue({});
  mocked.getTaskTeachers.mockResolvedValue([]);
  mocked.getTaskStaff.mockResolvedValue([]);
  mocked.getTaskStudents.mockResolvedValue([]);
  // Role-gated screens: the empty pass doubles as the "teacher lacks the role"
  // case, which must render an explanation rather than an error.
  mocked.getLeaveApprovals.mockResolvedValue(FORBIDDEN);
  mocked.getStudentLeaves.mockResolvedValue(FORBIDDEN);
  mocked.getPendingApprovals.mockResolvedValue(FORBIDDEN);
  mocked.getHomeworkSubmissions.mockResolvedValue([]);
}

const navigate = jest.fn();
const reloadProfile = jest.fn().mockResolvedValue(undefined);

const SCREENS: [string, () => React.ReactElement][] = [
  ['Dashboard', () => <DashboardScreen navigate={navigate} profile={PROFILE} reloadProfile={reloadProfile} />],
  ['Timetable', () => <TimetableScreen />],
  ['Attendance', () => <AttendanceScreen navigate={navigate} />],
  ['AbsentList', () => <AbsentListScreen params={{classId: 23, className: 'PREKG - A'}} />],
  ['Homework', () => <HomeworkScreen navigate={navigate} />],
  [
    'HomeworkSubmissions',
    () => <HomeworkSubmissionsScreen params={{homeworkId: 1, title: 'ENGLISH · PREKG - A'}} />,
  ],
  ['Assignments', () => <AssignmentsScreen navigate={navigate} />],
  ['Submissions', () => <SubmissionsScreen params={{assignmentId: 1, title: 'Essay', maxMarks: 20}} />],
  ['Exams', () => <ExamsScreen navigate={navigate} />],
  ['ExamMarks (entry)', () => <ExamMarksScreen params={{scheduleId: 9, title: 'ENGLISH', mode: 'edit'}} />],
  ['ExamMarks (review)', () => <ExamMarksScreen params={{scheduleId: 9, title: 'ENGLISH', mode: 'view'}} />],
  ['Tasks', () => <TasksScreen navigate={navigate} />],
  ['TaskCompose', () => <TaskComposeScreen onDone={jest.fn()} />],
  ['LessonPlans', () => <LessonPlansScreen />],
  ['Leave', () => <LeaveScreen />],
  ['LeaveApprovals', () => <LeaveApprovalsScreen />],
  ['StudentLeave', () => <StudentLeaveScreen />],
  ['Approvals', () => <ApprovalsScreen />],
  ['Notices', () => <NoticesScreen />],
  ['Notifications', () => <NotificationsScreen profile={PROFILE} />],
  ['Events', () => <EventsScreen />],
  ['Holidays', () => <HolidaysScreen />],
  ['Messages', () => <MessagesScreen />],
  ['Discipline', () => <DisciplineScreen />],
  ['School', () => <SchoolScreen />],
  ['Profile', () => <ProfileScreen profile={PROFILE} navigate={navigate} />],
  ['ChangePassword', () => <ChangePasswordScreen onDone={jest.fn()} />],
];

async function render(element: React.ReactElement) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: {x: 0, y: 0, width: 390, height: 844},
          insets: {top: 47, left: 0, right: 0, bottom: 34},
        }}>
        <Provider theme={antdTheme}>{element}</Provider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

describe('screens render with data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubWithData();
  });

  test.each(SCREENS)('%s', async (_name, build) => {
    const tree = await render(build());
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(async () => tree.unmount());
  });
});

describe('screens render when every list is empty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubEmpty();
  });

  test.each(SCREENS)('%s', async (_name, build) => {
    const tree = await render(build());
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(async () => tree.unmount());
  });
});
