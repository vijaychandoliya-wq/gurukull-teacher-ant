import AsyncStorage from '@react-native-async-storage/async-storage';

/** Live Gurukull school platform. Paths already include `/api`. */
export const PRODUCTION_BASE_URL = 'https://app.gurukull.in';

const DEFAULT_BASE_URL = PRODUCTION_BASE_URL;

const TOKEN_KEY = 'gurukull.teacher.token';
const DEVICE_KEY = 'gurukull.teacher.device';
const SCHOOL_CODE_KEY = 'gurukull.teacher.school_code';
const BASE_URL_KEY = 'gurukull.teacher.base_url';
const ROLES_KEY = 'gurukull.teacher.roles';

let baseUrlCache: string | null = null;

function isLocalDevUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+)(:\d+)?$/i.test(url);
}

export async function getBaseUrl(): Promise<string> {
  if (baseUrlCache) {
    return baseUrlCache;
  }
  const stored = ((await AsyncStorage.getItem(BASE_URL_KEY)) || '').replace(/\/$/, '');
  baseUrlCache = stored && !isLocalDevUrl(stored) ? stored : DEFAULT_BASE_URL;
  return baseUrlCache;
}

/** Turn a relative upload path into an absolute URL on the school platform. */
export function resolveMediaUrl(value?: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }
  const raw = String(value).trim();
  if (!raw || raw === 'null' || raw === 'undefined') {
    return undefined;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  const origin = baseUrlCache || DEFAULT_BASE_URL;
  if (raw.startsWith('/')) {
    return `${origin}${raw}`;
  }
  return `${origin}/${raw}`;
}

export async function setBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/$/, '');
  baseUrlCache = trimmed || DEFAULT_BASE_URL;
  await AsyncStorage.setItem(BASE_URL_KEY, baseUrlCache);
}

export async function setSchoolCode(code: string) {
  await AsyncStorage.setItem(SCHOOL_CODE_KEY, code.trim() || 'GW101');
}

export async function getSchoolCode() {
  return (await AsyncStorage.getItem(SCHOOL_CODE_KEY)) || 'GW101';
}

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
  const schoolCode = (await AsyncStorage.getItem(SCHOOL_CODE_KEY)) || 'GW101';
  const baseUrl = await getBaseUrl();

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'x-school-code': schoolCode,
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
  const payload = await request('/api/teacher/login', {
    method: 'POST',
    body: encode({email: email.trim(), password, device_name: 'Gurukull Teacher', device_id: deviceId}),
  });
  if (!payload.token) {
    throw new ApiError(payload.message || 'Login did not return an access token.', 500);
  }
  await AsyncStorage.setItem(TOKEN_KEY, payload.token);
  const roles = Array.isArray(payload.permissions) ? payload.permissions : [];
  await AsyncStorage.setItem(ROLES_KEY, JSON.stringify(roles));
  return payload;
}

export async function logout() {
  try {
    await request('/api/teacher/logout', {method: 'POST', body: ''});
  } finally {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(ROLES_KEY);
  }
}

export const hasSession = async () => Boolean(await AsyncStorage.getItem(TOKEN_KEY));
export const clearSession = async () => AsyncStorage.removeItem(TOKEN_KEY);

export const changePassword = (values: {current_password: string; password: string; password_confirmation: string}) =>
  request('/api/teacher/change/password', {
    method: 'POST',
    body: encode({
      ...values,
      old_password: values.current_password,
      new_password: values.password,
      oldpassword: values.current_password,
      newpassword: values.password,
      confirmpassword: values.password_confirmation,
    }),
  });

// ------------------------------------------------------------------- me -----

export const getProfile = async (): Promise<AnyRecord> => {
  const data = (await request('/api/teacher/myinfo')).data || {};
  const nested = data.profile || {};
  let storedRoles: string[] = [];
  try {
    storedRoles = JSON.parse((await AsyncStorage.getItem(ROLES_KEY)) || '[]');
  } catch {
    storedRoles = [];
  }
  return {
    ...nested,
    ...data,
    fullname: data.fullname || data.name || nested.name,
    designation: data.designation || nested.designation,
    designation_name: data.designation_name || nested.designation || data.designation,
    mobile_no: data.mobile_no || data.mobileNo || data.mobile || nested.mobile,
    email: data.email || data.emailId,
    employeeId: data.employeeId || data.employee_id,
    date_of_birth: data.date_of_birth || nested.dob,
    gender: data.gender || nested.gender,
    bloodGroup: data.bloodGroup || nested.bloodGroup,
    permissions: data.permissions || storedRoles,
    avatar: resolveMediaUrl(data.avatar || nested.avatar),
  };
};
export const getSchool = async (): Promise<AnyRecord> => (await request('/api/teacher/school/details')).data || {};
export const getClasses = async () => listOf(await request('/api/teacher/assignment/standardLinklist'));
export const getSubjects = async () => listOf(await request('/api/teacher/subject'));

// -------------------------------------------------------------- timetable ---

/** Flat weekly list: one entry per scheduled period. */
export async function getTimetable() {
  const payload = await request('/api/teacher/timetable');
  const value = payload?.data ?? payload;
  if (Array.isArray(value)) {
    return value.map(period => normalizePeriod(period));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([day, periods]) =>
      (Array.isArray(periods) ? periods : []).map(period => normalizePeriod(period, day)),
    );
  }
  return [];
}

function normalizePeriod(period: AnyRecord, day?: string) {
  const time = String(period.time || '');
  const [start, end] = time.split(' - ');
  return {
    ...period,
    day: period.day || day,
    class_name: period.class_name || period.class,
    start_time: period.start_time || start || '',
    end_time: period.end_time || end || '',
  };
}

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
    const payload = await request('/api/teacher/timetable/overview');
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

export const getLeaves = async () =>
  listOf(await request('/api/teacher/myleaves')).map(item => ({
    ...item,
    leave_days: item.leave_days ?? item.total_days,
    remarks: item.remarks || item.reason,
  }));
export const getLeaveBalance = async () => listOf(await request('/api/teacher/myleaves/available'));

export async function getLeaveOptions(): Promise<AnyRecord> {
  const payload = await request('/api/teacher/leave/add/list');
  const data = payload.data ?? payload;
  if (Array.isArray(data)) {
    return {
      leavelist: data.map((row: AnyRecord) => ({id: row.id, name: row.name})),
      reasonlist: [
        {id: 'personal', title: 'Personal'},
        {id: 'medical', title: 'Medical'},
        {id: 'other', title: 'Other'},
      ],
      session: [
        {id: 'day', name: 'Full day'},
        {id: 'forenoon', name: 'Forenoon'},
        {id: 'afternoon', name: 'Afternoon'},
      ],
    };
  }
  return data || {};
}

export async function applyLeave(values: {
  from_date: string;
  to_date: string;
  reason_id: string | number;
  remarks: string;
  session: string;
  leave_type_id: string | number;
}) {
  return request('/api/teacher/leave/add', {
    method: 'POST',
    body: encode({
      ...values,
      reason: values.remarks,
    }),
  });
}

export const deleteLeave = (id: string | number) =>
  request(`/api/teacher/leave/delete/${id}`, {method: 'DELETE'});

/**
 * Leave entitlement per type. The endpoint returns parallel arrays
 * (`{name: [], totalDays: [], leaveUsed: [], leaveAvailable: []}`) rather than
 * a list of objects, so zip them back into rows here.
 */
export async function getLeaveBalanceRows(): Promise<AnyRecord[]> {
  const payload = await request('/api/teacher/myleaves/available');
  const source = payload.data || payload || {};
  if (Array.isArray(source)) {
    return source.map((row: AnyRecord) => ({
      name: row.name,
      totalDays: row.totalDays ?? row.days_allowed ?? 0,
      leaveUsed: row.leaveUsed ?? 0,
      leaveAvailable: row.leaveAvailable ?? row.days_allowed ?? 0,
    }));
  }
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
      pending: '/api/teacher/checkleave/list',
      approved: '/api/teacher/checkleave/approve/list',
      rejected: '/api/teacher/checkleave/reject/list',
    }[scope];
    return listOf(await request(path)).map(leave => ({
      ...leave,
      leave_type: leave.leave_type || leave.leave_type_name,
      leave_days: leave.leave_days ?? leave.total_days,
      remarks: leave.remarks || leave.reason,
    }));
  });

export const approveLeaveRequest = (id: string | number, comments = '') =>
  request(`/api/teacher/checkleave/approve/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

export const rejectLeaveRequest = (id: string | number, comments = '') =>
  request(`/api/teacher/checkleave/reject/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

/** Student leave. Requires `student_leave_checker`. */
export const getStudentLeaves = (status: 'pending' | 'approved' | 'rejected' = 'pending') =>
  allowForbidden(async () => listOf(await request(`/api/teacher/student/leave/${status}`)));

export const approveStudentLeave = (id: string | number, comments = '') =>
  request(`/api/teacher/student/leave/approve/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

export const rejectStudentLeave = (id: string | number, comments = '') =>
  request(`/api/teacher/student/leave/reject/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

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
  request(`/api/teacher/assignment/approve/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

export const rejectAssignment = (id: string | number, comments = '') =>
  request(`/api/teacher/assignment/reject/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

export const approveHomework = (id: string | number, comments = '') =>
  request(`/api/teacher/homework/approve/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

export const rejectHomework = (id: string | number, comments = '') =>
  request(`/api/teacher/homework/reject/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

export const approveLessonPlan = (id: string | number, comments = '') =>
  request(`/api/teacher/lessonplan/approve/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

export const rejectLessonPlan = (id: string | number, comments = '') =>
  request(`/api/teacher/lessonplan/reject/${id}`, {method: 'POST', body: encode({comments, remarks: comments})});

// ------------------------------------------------------------- attendance ---

/** Roll-call form data: class list, students of the teacher's class, reasons. */
export async function getAttendanceForm(): Promise<{
  standardlist: AnyRecord[];
  studentlist: AnyRecord[];
  absentReasonlist: AnyRecord[];
}> {
  const payload = await request('/api/teacher/attendance/list');
  const source = payload.data || payload;
  const standards = source?.standardlist?.data || source?.standardlist || [];
  const students = source?.studentlist?.data || source?.studentlist || [];
  const reasons = source?.absentReasonlist?.data || source?.absentReasonlist || [];
  return {
    standardlist: (Array.isArray(standards) ? standards : []).map((row: AnyRecord) => ({
      ...row,
      standard_section: row.standard_section || row.name,
    })),
    studentlist: (Array.isArray(students) ? students : []).map((row: AnyRecord) => ({
      ...row,
      user_id: row.user_id ?? row.student_id ?? row.id,
      id: row.id ?? row.student_id ?? row.user_id,
      class: row.class || row.class_name || '',
    })),
    absentReasonlist: (Array.isArray(reasons) ? reasons : []).map((row: AnyRecord) => ({
      ...row,
      title: row.title || row.name,
    })),
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
}) => postJson('/api/teacher/attendance/add', values);

export const getAbsentList = async (classId: string | number, date: string, session: string) =>
  listOf(await request(`/api/teacher/attendance/absentList/${classId}/${date}/${session}`));

// --------------------------------------------------------------- homework ---

/** `{standards: [{standard_name, subjects: [{subject_name, homeworks: []}]}]}` */
export async function getHomework(scope: 'pending' | 'completed' | 'approval' | 'rejected' = 'pending') {
  const path = {
    pending: '/api/teacher/homeworks/pending',
    completed: '/api/teacher/homeworks',
    approval: '/api/teacher/homeworks/pendingApproval',
    rejected: '/api/teacher/homeworks/rejectedApproval',
  }[scope];
  const payload = await request(path);
  return flattenStandards(payload?.data, 'homeworks');
}

export const getHomeworkOptions = async () => (await request('/api/teacher/homework/add/list')).data || {};
export const getHomeworkSubjects = async (classId: string | number) =>
  listOf(await request(`/api/teacher/homework/subjectlist/${classId}`));

export const addHomework = (values: {
  standardLink_id: string | number;
  subject_id: string | number;
  date: string;
  submission_date: string;
  description: string;
}) =>
  postJson('/api/teacher/homework/add', {
    standardLink_id: values.standardLink_id,
    subject_id: values.subject_id,
    date: values.date,
    submission_date: values.submission_date,
    description: values.description,
    Standardlink_id: values.standardLink_id,
    Subject_id: values.subject_id,
    Title: values.description?.slice(0, 80) || 'Homework',
    Description: values.description,
    DueDate: values.submission_date || values.date,
  });

export const deleteHomework = (id: string | number) =>
  request(`/api/teacher/homework/delete/${id}`, {method: 'DELETE'});

// ------------------------------------------------------------- assignment ---

export async function getAssignments(scope: 'active' | 'completed' = 'active') {
  const payload = await request(scope === 'active' ? '/api/teacher/assignments' : '/api/teacher/assignments/completed');
  return flattenStandards(payload?.data, 'assignments');
}

export const getAssignmentSubjects = async (classId: string | number) =>
  listOf(await request(`/api/teacher/assignment/subjectlist/${classId}`));

export const addAssignment = (values: {
  standardLink_id: string | number;
  subject_id: string | number;
  title: string;
  description: string;
  assigned_date: string;
  submission_date: string;
  marks: string | number;
}) => request('/api/teacher/assignment/add', {method: 'POST', body: encode(values)});

export const deleteAssignment = (id: string | number) =>
  request(`/api/teacher/assignment/delete/${id}`, {method: 'DELETE'});

// ---------------------------------------------- student work and grading ---

/** Students who have handed an assignment in, or whose work is already graded. */
export const getAssignmentSubmissions = async (
  assignmentId: string | number,
  scope: 'submitted' | 'completed' = 'submitted',
) => listOf(await request(`/api/teacher/assignment/show/${assignmentId}/${scope}`));

/** First grading of one student's submission. */
export const gradeSubmission = (
  studentAssignmentId: string | number,
  values: {obtained_marks: string | number; comments: string},
) => request(`/api/teacher/assignment/addMarks/${studentAssignmentId}`, {method: 'POST', body: encode(values)});

/** Correcting a grade already recorded. */
export const updateSubmissionGrade = (
  studentAssignmentId: string | number,
  values: {obtained_marks: string | number; comments: string},
) => request(`/api/teacher/assignment/editMarks/${studentAssignmentId}`, {method: 'POST', body: encode(values)});

export const getSubmissionGrade = async (studentAssignmentId: string | number): Promise<AnyRecord> =>
  (await request(`/api/teacher/assignment/showMarks/${studentAssignmentId}`)).data || {};

/** Every student's submission for one homework. */
export const getHomeworkSubmissions = async (homeworkId: string | number) =>
  listOf(await request(`/api/teacher/homework/show/${homeworkId}`));

/** One student's homework submission, by `student_homework` row id. */
export const getStudentHomework = async (studentHomeworkId: string | number): Promise<AnyRecord> => {
  const payload = await request(`/api/teacher/student/homework/show/${studentHomeworkId}`);
  return payload.data || payload || {};
};

/**
 * Marks one submission as checked. The server also reads `id` out of the body
 * to reject double-checking, so send it alongside the route parameter.
 */
export const reviewStudentHomework = (studentHomeworkId: string | number, comments = '') =>
  request(`/api/teacher/student/homework/edit/${studentHomeworkId}`, {
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
  const looksFlat = standards.length > 0 && !standards[0]?.subjects;
  if (looksFlat) {
    return standards.map((item: AnyRecord) => ({
      ...item,
      class_name: item.class_name || item.class,
      subject_name: item.subject_name || item.subject,
    }));
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
export const getExams = async () => listOf(await request('/api/teacher/exam/list'));

/** Students of a scheduled exam, pre-filled with any marks already saved. */
export async function getExamStudents(scheduleId: string | number): Promise<AnyRecord[]> {
  const payload = await request(`/api/teacher/exam/add/list/${scheduleId}`);
  return payload.students || listOf(payload);
}

export const saveExamMarks = (
  scheduleId: string | number,
  students: {user_id: number | string; marks: string; status: string}[],
) => postJson(`/api/teacher/exam/add/marks/${scheduleId}`, {students});

export const getExamMarks = async (scheduleId: string | number) =>
  listOf(await request(`/api/teacher/exam/marks/show/${scheduleId}`));

// ------------------------------------------------------------------ tasks ---

export async function getTasks(scope: 'mine' | 'assigned' = 'mine', completed = false) {
  const path = scope === 'mine'
    ? (completed ? '/api/teacher/mytasks/completed' : '/api/teacher/mytasks/active')
    : (completed ? '/api/teacher/tasks/completed' : '/api/teacher/tasks/active');
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
  postJson('/api/teacher/tasks/mark/complete', {task_completed: assigneeIds});

/** Finds this teacher's own assignee row on a task, which is what closes it. */
export function ownAssigneeId(task: AnyRecord): string | number | null {
  const assignees: AnyRecord[] = task.task_assignee || [];
  const mine = assignees.find(assignee => String(assignee.user_id) === String(task.auth_id));
  return mine?.id ?? null;
}

export const snoozeTask = (taskId: string | number, reminderDate: string) =>
  request(`/api/teacher/task/snooze/${taskId}`, {method: 'POST', body: encode({reminder_date: reminderDate})});

/** Assignee types, reminder presets and the classes a task can target. */
export async function getTaskOptions(): Promise<AnyRecord> {
  const payload = await request('/api/teacher/task/add/list');
  return payload.data || payload || {};
}

export const getTaskTeachers = async () => listOf(await request('/api/teacher/task/add/teacher/list'));
export const getTaskStaff = async () => listOf(await request('/api/teacher/task/add/nonteacher/list'));
export const getTaskStudents = async (classId: string | number) =>
  listOf(await request(`/api/teacher/task/add/student/${classId}`));

export const addTask = (values: {
  title: string;
  to_do_list: string;
  task_date: string;
  reminder_date: string;
  type: string;
  priority: string;
  assignee: (string | number)[];
  standardLink_id?: string | number;
}) => postJson('/api/teacher/task/add', values);

// ------------------------------------------------------------ lesson plan ---

export const getLessonPlans = async () => listOf(await request('/api/teacher/lessonplans'));
export const getLessonPlan = async (id: string | number): Promise<AnyRecord> =>
  (await request(`/api/teacher/lessonplan/show/${id}`)).data || {};
export const publishLessonPlan = (id: string | number) =>
  request(`/api/teacher/lesson-plans/${id}/publish`, {method: 'POST', body: ''});

// ---------------------------------------------------------------- notices ---

function normalizeNotice(notice: AnyRecord): AnyRecord {
  return {
    ...notice,
    description: notice.description || notice.notice,
    publish_date: notice.publish_date || notice.date,
    expire_date: notice.expire_date || notice.expiry_date,
    type: notice.type || notice.audience,
  };
}

export const getNotices = async () => listOf(await request('/api/teacher/my-school/notices')).map(normalizeNotice);
export const getExpiredNotices = async () =>
  listOf(await request('/api/teacher/my-school/notices/expired')).map(normalizeNotice);
export const getNotice = async (id: string | number): Promise<AnyRecord> =>
  (await request(`/api/teacher/notice/show/${id}`)).data || {};

// ----------------------------------------------------------------- events ---

export const getEvents = async (scope: 'all' | 'upcoming' | 'past' | 'school' = 'upcoming') => {
  const path = {
    all: '/api/teacher/my-school/list-events',
    upcoming: '/api/teacher/my-events/upcoming',
    past: '/api/teacher/my-events/past',
    school: '/api/teacher/my-events/school',
  }[scope];
  return listOf(await request(path)).map(event => ({
    ...event,
    event_id: event.event_id || event.id,
    category: event.category || event.type,
    location: event.location || event.venue,
  }));
};

export const getHolidays = async () =>
  listOf(await request('/api/teacher/holidays')).map(holiday => ({
    ...holiday,
    title: holiday.title || holiday.name,
  }));

export const getEvent = async (id: string | number): Promise<AnyRecord> => {
  const payload = await request(`/api/teacher/my-events/show/${id}`);
  return payload.data || payload || {};
};

export const getEventGallery = async (eventId: string | number) =>
  listOf(await request(`/api/teacher/my-events/gallery/show/${eventId}`));

// ------------------------------------------------------------- discipline ---

export const getDisciplineRecords = async () => listOf(await request('/api/teacher/performance/list'));
export const getDisciplineTypes = async () => listOf(await request('/api/teacher/performance/add/type'));

// --------------------------------------------------------------- messages ---

export const getMessages = async (): Promise<AnyRecord[]> => {
  const rooms = listOf(await request('/api/teacher/chat/rooms'));
  return rooms.map(room => ({
    feedback_id: room.id,
    last_reply_by: room.type || 'Chat',
    last_reply_on: room.lastTime || room.lastTimestamp,
    messages: [{message: room.lastMessage || '', student_name: room.name || 'Conversation'}],
  }));
};
export const getNotifications = async (teacherId: string | number) =>
  listOf(await request(`/api/teacher/notifications/${teacherId}`));
