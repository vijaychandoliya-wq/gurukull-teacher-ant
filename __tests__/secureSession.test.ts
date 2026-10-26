let storage:any,keychain:any,session:any;
beforeEach(()=>{jest.resetModules();storage=require('@react-native-async-storage/async-storage').default;keychain=require('react-native-keychain');session=require('../src/secureSession');});
test('migrates an installed session only after a secure write succeeds',async()=>{
 const oldKey='gurukull.teacher.token';
 await storage.setItem(oldKey,'scalar-session');
 keychain.setGenericPassword.mockRejectedValueOnce(new Error('device locked'));
 await expect(session.getSessionToken()).rejects.toThrow('device locked');expect(await storage.getItem(oldKey)).toBe('scalar-session');
 expect(await session.getSessionToken()).toBe('scalar-session');expect(await storage.getItem(oldKey)).toBeNull();
});
test('stores new sessions only in native secure storage and erases them on logout',async()=>{
 await session.setSessionToken('scalar-session');expect(await session.getSessionToken()).toBe('scalar-session');
 expect((await storage.getAllKeys()).some((key:string)=>key.endsWith('.token'))).toBe(false);
 await session.clearSessionToken();expect(await session.getSessionToken()).toBeNull();
});
test('does not claim success if secure storage refuses a write',async()=>{
 keychain.setGenericPassword.mockResolvedValueOnce(false);await expect(session.setSessionToken('scalar')).rejects.toThrow('Secure session storage unavailable');
});

test('a pending secure write cannot resurrect a session after logout',async()=>{
 let release!:()=>void,started!:()=>void;const pending=new Promise<void>(r=>{release=r;}),writing=new Promise<void>(r=>{started=r;});
 const save=keychain.setGenericPassword.getMockImplementation();
 keychain.setGenericPassword.mockImplementationOnce(async(...args:unknown[])=>{started();await pending;return save(...args);});
 const write=session.setSessionToken('scalar-session');await writing;const clear=session.clearSessionToken();release();await Promise.all([write,clear]);
 expect(await session.getSessionToken()).toBeNull();
});
