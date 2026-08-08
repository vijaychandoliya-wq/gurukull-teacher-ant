import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://app.gurukull.in/api';
const TOKEN_KEY = 'gurukull.teacher.token';
const DEVICE_KEY = 'gurukull.teacher.device';

export type AnyRecord = Record<string, any>;

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;

  constructor(message: string, status: number, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

function encode(values: Record<string, string | number | undefined>) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

async function request(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? {'Content-Type': 'application/x-www-form-urlencoded'} : {}),
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload: any = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError('The server returned an unreadable response.', response.status);
  }

  if (!response.ok || payload.success === false) {
    const firstFieldError = payload.errors
      ? Object.values(payload.errors).flat()[0]
      : undefined;
    throw new ApiError(
      String(firstFieldError || payload.message || 'Request failed. Please try again.'),
      response.status,
      payload.errors,
    );
  }
  return payload;
}

/**
 * POST a JSON body. Endpoints that take nested arrays (attendance rolls, exam
 * mark sheets) cannot be expressed in the flat form encoding the rest of the
 * API uses.
 */
function postJson(path: string, body: AnyRecord) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
  });
}

/** Endpoints wrap their payload in `data`; a few return the array directly. */
const listOf = (payload: any): any[] => {
  const value = payload?.data ?? payload;
  return Array.isArray(value) ? value : [];
};

/**
 * Marks a screen's data as unavailable to this teacher rather than as an error.
 *
 * Approval endpoints are gated behind roles (`leave_checker`, `principal`,
 * `student_leave_checker`). A teacher without the role gets 401/403, which is a
 * normal answer — "you cannot do this" — not a failure worth a red banner.
 */
export const FORBIDDEN = Symbol('forbidden');
export type MaybeForbidden<T> = T | typeof FORBIDDEN;

async function allowForbidden<T>(load: () => Promise<T>): Promise<MaybeForbidden<T>> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return FORBIDDEN;
    }
    throw error;
  }
}

// ---------------------------------------------------------------- session ---

export async function login(email: string, password: string) {
  let deviceId = await AsyncStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = `gurukull-ant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await AsyncStorage.setItem(DEVICE_KEY, deviceId);
  }
  const payload = await request('/teacher/login', {
    method: 'POST',
    body: encode({email: email.trim(), password, device_name: 'Gurukull Teacher', device_id: deviceId}),
  });
  if (!payload.token) {
    throw new ApiError(payload.message || 'Login did not return an access token.', 500);
  }
  await AsyncStorage.setItem(TOKEN_KEY, payload.token);
  return payload;
}

export async function logout() {
  try {
    await request('/teacher/logout', {method: 'POST', body: ''});
  } finally {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export const hasSession = async () => Boolean(await AsyncStorage.getItem(TOKEN_KEY));
export const clearSession = async () => AsyncStorage.removeItem(TOKEN_KEY);

export const changePassword = (values: {current_password: string; password: string; password_confirmation: string}) =>
  request('/teacher/change/password', {method: 'POST', body: encode(values)});

// ------------------------------------------------------------------- me -----

export const getProfile = async (): Promise<AnyRecord> => (await request('/teacher/myinfo')).data;
export const getSchool = async (): Promise<AnyRecord> => (await request('/teacher/school/details')).data || {};
export const getClasses = async () => listOf(await request('/teacher/assignment/standardLinklist'));
export const getSubjects = async () => listOf(await request('/teacher/subject'));

// -------------------------------------------------------------- timetable ---

/** Flat weekly list: one entry per scheduled period. */
export const getTimetable = async () => listOf(await request('/teacher/timetable'));

/**
 * Week already grouped by day, plus the load counts the dashboard shows.
 * Served by the optional timetable module; falls back to regrouping the flat
 * list when the module is not installed in this build.
 */
export async function getTimetableOverview(): Promise<{
  installed: boolean;
  summary: AnyRecord | null;
  days: {day: string; day_index: number; periods: AnyRecord[]}[];
}> {
  try {
    const payload = await request('/teacher/timetable/overview');
    return {
      installed: Boolean(payload.data?.installed),
      summary: payload.data?.summary || null,
      days: payload.data?.days || [],
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
      return {installed: false, summary: null, days: groupFlatTimetable(await getTimetable())};
    }
    throw error;
  }
}

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function groupFlatTimetable(items: AnyRecord[]) {
  return WEEK.map((day, index) => ({
    day,
    day_index: index + 1,
    periods: items.filter(item => String(item.day).toLowerCase() === day.toLowerCase()),
  }));
}

// ------------------------------------------------------------------ leave ---

export const getLeaves = async () => listOf(await request('/teacher/myleaves'));
export const getLeaveBalance = async () => listOf(await request('/teacher/myleaves/available'));

export async function getLeaveOptions(): Promise<AnyRecord> {
  const payload = await request('/teacher/leave/add/list');
  return payload.data || payload;
}

export async function applyLeave(values: {
  from_date: string;
  to_date: string;
  reason_id: string | number;
  remarks: string;
  session: string;
  leave_type_id: string | number;
}) {
  return request('/teacher/leave/add', {method: 'POST', body: encode(values)});
}

export const deleteLeave = (id: string | number) =>
  request(`/teacher/leave/delete/${id}`, {method: 'DELETE'});

/**
 * Leave entitlement per type. The endpoint returns parallel arrays
 * (`{name: [], totalDays: [], leaveUsed: [], leaveAvailable: []}`) rather than
 * a list of objects, so zip them back into rows here.
 */
export async function getLeaveBalanceRows(): Promise<AnyRecord[]> {
  const payload = await request('/teacher/myleaves/available');
  const source = payload.data || payload || {};
  const names: string[] = source.name || [];
  const seen = new Set<string>();
  return names.reduce<AnyRecord[]>((rows, name, index) => {
    // The server pushes one entry per (type × application) pair, so the same
    // leave type repeats. Keep the first occurrence of each.
    if (seen.has(name)) {
      return rows;
    }
    seen.add(name);
    rows.push({
      name,
      totalDays: source.totalDays?.[index] ?? 0,
      leaveUsed: source.leaveUsed?.[index] ?? 0,
      leaveAvailable: source.leaveAvailable?.[index] ?? 0,
    });
    return rows;
  }, []);
}

// -------------------------------------------------- leave approval (role) ---

/** Staff leave awaiting this teacher's decision. Requires `leave_checker`. */
export const getLeaveApprovals = (scope: 'pending' | 'approved' | 'rejected' = 'pending') =>
  allowForbidden(async () => {
    const path = {
      pending: '/teacher/checkleave/list',
      approved: '/teacher/checkleave/approve/list',
      rejected: '/teacher/checkleave/reject/list',
    }[scope];
    return listOf(await request(path));
  });

export const approveLeaveRequest = (id: string | number, comments = '') =>
  request(`/teacher/checkleave/approve/${id}`, {method: 'POST', body: encode({comments})});

export const rejectLeaveRequest = (id: string | number, comments = '') =>
  request(`/teacher/checkleave/reject/${id}`, {method: 'POST', body: encode({comments})});

/** Student leave. Requires `student_leave_checker`. */
export const getStudentLeaves = (status: 'pending' | 'approved' | 'rejected' = 'pending') =>
  allowForbidden(async () => listOf(await request(`/teacher/student/leave/${status}`)));

export const approveStudentLeave = (id: string | number, comments = '') =>
  request(`/teacher/student/leave/approve/${id}`, {method: 'POST', body: encode({comments})});

export const rejectStudentLeave = (id: string | number, comments = '') =>
  request(`/teacher/student/leave/reject/${id}`, {method: 'POST', body: encode({comments})});

// ---------------------------------------------- principal approvals (role) ---

/**
 * Work submitted by other teachers that a principal has to sign off. Each list
 * is fetched independently so one forbidden module does not hide the others.
 */
export const getPendingApprovals = () =>
  allowForbidden(async () => {
    const [homework, lessonPlans] = await Promise.all([
      getHomework('approval').catch(() => []),
      getLessonPlans().catch(() => []),
    ]);
    return {
      homework,
      lessonPlans: lessonPlans.filter((plan: AnyRecord) => !plan.is_published),
    };
  });

export const approveAssignment = (id: string | number, comments = '') =>
  request(`/teacher/assignment/approve/${id}`, {method: 'POST', body: encode({comments})});

export const rejectAssignment = (id: string | number, comments = '') =>
  request(`/teacher/assignment/reject/${id}`, {method: 'POST', body: encode({comments})});

export const approveHomework = (id: string | number, comments = '') =>
  request(`/teacher/homework/approve/${id}`, {method: 'POST', body: encode({comments})});

export const rejectHomework = (id: string | number, comments = '') =>
  request(`/teacher/homework/reject/${id}`, {method: 'POST', body: encode({comments})});

export const approveLessonPlan = (id: string | number, comments = '') =>
  request(`/teacher/lessonplan/approve/${id}`, {method: 'POST', body: encode({comments})});

export const rejectLessonPlan = (id: string | number, comments = '') =>
  request(`/teacher/lessonplan/reject/${id}`, {method: 'POST', body: encode({comments})});

// ------------------------------------------------------------- attendance ---

/** Roll-call form data: class list, students of the teacher's class, reasons. */
export async function getAttendanceForm(): Promise<{
  standardlist: AnyRecord[];
  studentlist: AnyRecord[];
  absentReasonlist: AnyRecord[];
}> {
  const payload = await request('/teacher/attendance/list');
  const source = payload.data || payload;
  return {
    standardlist: source?.standardlist?.data || source?.standardlist || [],
    studentlist: source?.studentlist?.data || source?.studentlist || [],
    absentReasonlist: source?.absentReasonlist?.data || source?.absentReasonlist || [],
  };
}

/**
 * Submits the absentees only — the server marks everyone else present, so
 * sending an empty list records a fully present class.
 */
export const submitAttendance = (values: {
  Standardlinkid: string | number;
  Date: string;
  Session: string;
  AbsentList: {student_id: number | string; reasonId: number | string; remarks: string}[];
}) => postJson('/teacher/attendance/add', values);

export const getAbsentList = async (classId: string | number, date: string, session: string) =>
  listOf(await request(`/teacher/attendance/absentList/${classId}/${date}/${session}`));

// --------------------------------------------------------------- homework ---

/** `{standards: [{standard_name, subjects: [{subject_name, homeworks: []}]}]}` */
export async function getHomework(scope: 'pending' | 'completed' | 'approval' | 'rejected' = 'pending') {
  const path = {
    pending: '/teacher/homeworks/pending',
    completed: '/teacher/homeworks',
    approval: '/teacher/homeworks/pendingApproval',
    rejected: '/teacher/homeworks/rejectedApproval',
  }[scope];
  const payload = await request(path);
  return flattenStandards(payload?.data, 'homeworks');
}

export const getHomeworkOptions = async () => (await request('/teacher/homework/add/list')).data || {};
export const getHomeworkSubjects = async (classId: string | number) =>
  listOf(await request(`/teacher/homework/subjectlist/${classId}`));

export const addHomework = (values: {
  standardLink_id: string | number;
  subject_id: string | number;
  date: string;
  submission_date: string;
  description: string;
}) => request('/teacher/homework/add', {method: 'POST', body: encode(values)});

export const deleteHomework = (id: string | number) =>
  request(`/teacher/homework/delete/${id}`, {method: 'DELETE'});

// ------------------------------------------------------------- assignment ---

export async function getAssignments(scope: 'active' | 'completed' = 'active') {
  const payload = await request(scope === 'active' ? '/teacher/assignments' : '/teacher/assignments/completed');
  return flattenStandards(payload?.data, 'assignments');
}

export const getAssignmentSubjects = async (classId: string | number) =>
  listOf(await request(`/teacher/assignment/subjectlist/${classId}`));

export const addAssignment = (values: {
  standardLink_id: string | number;
  subject_id: string | number;
  title: string;
  description: string;
  assigned_date: string;
  submission_date: string;
  marks: string | number;
}) => request('/teacher/assignment/add', {method: 'POST', body: encode(values)});

export const deleteAssignment = (id: string | number) =>
  request(`/teacher/assignment/delete/${id}`, {method: 'DELETE'});

// ---------------------------------------------- student work and grading ---

/** Students who have handed an assignment in, or whose work is already graded. */
export const getAssignmentSubmissions = async (
  assignmentId: string | number,
  scope: 'submitted' | 'completed' = 'submitted',
) => listOf(await request(`/teacher/assignment/show/${assignmentId}/${scope}`));

/** First grading of one student's submission. */
export const gradeSubmission = (
  studentAssignmentId: string | number,
  values: {obtained_marks: string | number; comments: string},
) => request(`/teacher/assignment/addMarks/${studentAssignmentId}`, {method: 'POST', body: encode(values)});

/** Correcting a grade already recorded. */
export const updateSubmissionGrade = (
  studentAssignmentId: string | number,
  values: {obtained_marks: string | number; comments: string},
) => request(`/teacher/assignment/editMarks/${studentAssignmentId}`, {method: 'POST', body: encode(values)});

export const getSubmissionGrade = async (studentAssignmentId: string | number): Promise<AnyRecord> =>
  (await request(`/teacher/assignment/showMarks/${studentAssignmentId}`)).data || {};

/** Every student's submission for one homework. */
export const getHomeworkSubmissions = async (homeworkId: string | number) =>
  listOf(await request(`/teacher/homework/show/${homeworkId}`));

/** One student's homework submission, by `student_homework` row id. */
export const getStudentHomework = async (studentHomeworkId: string | number): Promise<AnyRecord> => {
  const payload = await request(`/teacher/student/homework/show/${studentHomeworkId}`);
  return payload.data || payload || {};
};

/**
 * Marks one submission as checked. The server also reads `id` out of the body
 * to reject double-checking, so send it alongside the route parameter.
 */
export const reviewStudentHomework = (studentHomeworkId: string | number, comments = '') =>
  request(`/teacher/student/homework/edit/${studentHomeworkId}`, {
    method: 'POST',
    body: encode({id: studentHomeworkId, comments}),
  });

/**
 * The assignment and homework lists nest items two levels deep
 * (standard → subject → items). Screens render one flat, sorted list, so
 * lift the class and subject names onto each item here.
 */
function flattenStandards(data: any, key: 'homeworks' | 'assignments'): AnyRecord[] {
  const standards = data?.standards || data || [];
  if (!Array.isArray(standards)) {
    return [];
  }
  return standards.flatMap((standard: AnyRecord) =>
    (standard.subjects || []).flatMap((subject: AnyRecord) =>
      (subject[key] || []).map((item: AnyRecord) => ({
        ...item,
        class_name: item.class_name || item.class || standard.standard_name,
        subject_name: item.subject_name || item.subject || subject.subject_name,
      })),
    ),
  );
}

// ------------------------------------------------------------------ exams ---

/** Exams with their schedules, for classes this teacher is class teacher of. */
export const getExams = async () => listOf(await request('/teacher/exam/list'));

/** Students of a scheduled exam, pre-filled with any marks already saved. */
export async function getExamStudents(scheduleId: string | number): Promise<AnyRecord[]> {
  const payload = await request(`/teacher/exam/add/list/${scheduleId}`);
  return payload.students || listOf(payload);
}

export const saveExamMarks = (
  scheduleId: string | number,
  students: {user_id: number | string; marks: string; status: string}[],
) => postJson(`/teacher/exam/add/marks/${scheduleId}`, {students});

export const getExamMarks = async (scheduleId: string | number) =>
  listOf(await request(`/teacher/exam/marks/show/${scheduleId}`));

// ------------------------------------------------------------------ tasks ---

export async function getTasks(scope: 'mine' | 'assigned' = 'mine', completed = false) {
  const path = scope === 'mine'
    ? (completed ? '/teacher/mytasks/completed' : '/teacher/mytasks/active')
    : (completed ? '/teacher/tasks/completed' : '/teacher/tasks/active');
  return listOf(await request(path));
}

/**
 * Completes a task for the signed-in teacher.
 *
 * The endpoint works on `task_assignee` rows, not tasks: it takes the ids of
 * the assignee records to close and flips the parent task once no assignee is
 * still pending. Pass the assignee row that belongs to this teacher.
 */
export const completeTask = (assigneeIds: (string | number)[]) =>
  postJson('/teacher/tasks/mark/complete', {task_completed: assigneeIds});

/** Finds this teacher's own assignee row on a task, which is what closes it. */
export function ownAssigneeId(task: AnyRecord): string | number | null {
  const assignees: AnyRecord[] = task.task_assignee || [];
  const mine = assignees.find(assignee => String(assignee.user_id) === String(task.auth_id));
  return mine?.id ?? null;
}

export const snoozeTask = (taskId: string | number, reminderDate: string) =>
  request(`/teacher/task/snooze/${taskId}`, {method: 'POST', body: encode({reminder_date: reminderDate})});

/** Assignee types, reminder presets and the classes a task can target. */
export async function getTaskOptions(): Promise<AnyRecord> {
  const payload = await request('/teacher/task/add/list');
  return payload.data || payload || {};
}

export const getTaskTeachers = async () => listOf(await request('/teacher/task/add/teacher/list'));
export const getTaskStaff = async () => listOf(await request('/teacher/task/add/nonteacher/list'));
export const getTaskStudents = async (classId: string | number) =>
  listOf(await request(`/teacher/task/add/student/${classId}`));

export const addTask = (values: {
  title: string;
  to_do_list: string;
  task_date: string;
  reminder_date: string;
  type: string;
  priority: string;
  assignee: (string | number)[];
  standardLink_id?: string | number;
}) => postJson('/teacher/task/add', values);

// ------------------------------------------------------------ lesson plan ---

export const getLessonPlans = async () => listOf(await request('/teacher/lessonplans'));
export const getLessonPlan = async (id: string | number): Promise<AnyRecord> =>
  (await request(`/teacher/lessonplan/show/${id}`)).data || {};
export const publishLessonPlan = (id: string | number) =>
  request(`/teacher/lesson-plans/${id}/publish`, {method: 'POST', body: ''});

// ---------------------------------------------------------------- notices ---

export const getNotices = async () => listOf(await request('/teacher/my-school/notices'));
export const getExpiredNotices = async () => listOf(await request('/teacher/my-school/notices/expired'));
export const getNotice = async (id: string | number): Promise<AnyRecord> =>
  (await request(`/teacher/notice/show/${id}`)).data || {};

// ----------------------------------------------------------------- events ---

export const getEvents = async (scope: 'all' | 'upcoming' | 'past' | 'school' = 'upcoming') => {
  const path = {
    all: '/teacher/my-school/list-events',
    upcoming: '/teacher/my-events/upcoming',
    past: '/teacher/my-events/past',
    school: '/teacher/my-events/school',
  }[scope];
  return listOf(await request(path));
};

export const getHolidays = async () => listOf(await request('/teacher/holidays'));

export const getEvent = async (id: string | number): Promise<AnyRecord> => {
  const payload = await request(`/teacher/my-events/show/${id}`);
  return payload.data || payload || {};
};

export const getEventGallery = async (eventId: string | number) =>
  listOf(await request(`/teacher/my-events/gallery/show/${eventId}`));

// ------------------------------------------------------------- discipline ---

export const getDisciplineRecords = async () => listOf(await request('/teacher/performance/list'));
export const getDisciplineTypes = async () => listOf(await request('/teacher/performance/add/type'));

// --------------------------------------------------------------- messages ---

export const getMessages = async () => listOf(await request('/teacher/messages'));
export const getNotifications = async (teacherId: string | number) =>
  listOf(await request(`/teacher/notifications/${teacherId}`));
