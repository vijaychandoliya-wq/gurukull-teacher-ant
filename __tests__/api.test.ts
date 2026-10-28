import {clearSessionToken} from '../src/secureSession';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {changePassword, getBaseUrl, hasSession, login, setSchoolCode} from '../src/api';

const fetchMock = jest.fn();

beforeEach(async () => {
  fetchMock.mockReset();
  (globalThis as any).fetch = fetchMock;
  await clearSessionToken();
  await AsyncStorage.clear();
});

test('uses the shared API for school 117 and sends the tenant header', async () => {
  await setSchoolCode('117');
  expect(await getBaseUrl()).toBe('https://gurukul-worker-api.gurukull.workers.dev');

  fetchMock.mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify({token: 'teacher-token', permissions: ['attendance']}),
  });

  await login('teacher@example.test', 'access-key');

  expect(fetchMock).toHaveBeenCalledWith(
    'https://gurukul-worker-api.gurukull.workers.dev/api/teacher/login',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({'x-school-code': '117'}),
    }),
  );
  expect(await hasSession()).toBe(true);
});

test('keeps another configured school on the same shared API', async () => {
  await setSchoolCode('RAJESH');
  expect(await getBaseUrl()).toBe('https://gurukul-worker-api.gurukull.workers.dev');
});

test('rejects a failed login without creating a session', async () => {
  await setSchoolCode('117');
  fetchMock.mockResolvedValue({ok: false, status: 401, text: async () => JSON.stringify({message: 'Invalid credentials'})});

  await expect(login('teacher@example.test', 'wrong')).rejects.toThrow('Invalid credentials');
  expect(await hasSession()).toBe(false);
});

// Request/response contract only; no account or password is persisted.
test('sends the own-password contract with the selected school and no target identity', async () => {
 await setSchoolCode('108');
 fetchMock.mockResolvedValue({ok:true,text:async()=>JSON.stringify({success:true,sessionsRevoked:true})});
 const values={current_password: 'old scalar password', password: 'a sufficiently long new passphrase', password_confirmation: 'a sufficiently long new passphrase'};
 await changePassword(values);
 const [url,options]=fetchMock.mock.calls[0];
 expect(url).toBe('https://gurukul-worker-api.gurukull.workers.dev/api/teacher/change/password');
 expect(options.headers['x-school-code']).toBe('108');
 const keys=String(options.body).split('&').map(pair=>decodeURIComponent(pair.split('=')[0]));
 expect(keys.sort()).toEqual(Object.keys(values).sort());
 expect(keys).not.toContain('userId');
});
