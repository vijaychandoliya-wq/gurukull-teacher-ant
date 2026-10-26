/* global jest */
/**
 * Native modules Ant Design Mobile pulls in have to be stubbed before any
 * component is imported, otherwise `TurboModuleRegistry.getEnforcing` throws
 * while the module graph is still loading.
 */
require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  // Ant's NoticeBar marquee drives its scroll from a frame callback, which the
  // shipped mock does not stub.
  useFrameCallback: () => ({setActive: jest.fn(), isActive: false}),
}));

/**
 * In-memory AsyncStorage. The package's own mock is not reachable through its
 * `exports` map, and `src/api.ts` reads the session token on every request.
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(key => Promise.resolve(key in store ? store[key] : null)),
      setItem: jest.fn((key, value) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn(key => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
      multiGet: jest.fn(keys => Promise.resolve(keys.map(key => [key, store[key] ?? null]))),
      multiSet: jest.fn(pairs => {
        pairs.forEach(([key, value]) => {
          store[key] = value;
        });
        return Promise.resolve();
      }),
      multiRemove: jest.fn(keys => {
        keys.forEach(key => delete store[key]);
        return Promise.resolve();
      }),
    },
  };
});

// Native secure storage boundary; test secrets never leave process memory.
jest.mock('react-native-keychain',()=>{const values=new Map();return {ACCESSIBLE:{WHEN_UNLOCKED_THIS_DEVICE_ONLY:'deviceOnly'},setGenericPassword:jest.fn(async(user,password,options)=>{values.set(options.service,{username:user,password});return true;}),getGenericPassword:jest.fn(async options=>values.get(options.service)||false),resetGenericPassword:jest.fn(async options=>{values.delete(options.service);return true;})};});
