import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const service='com.gurukull.teacher.session';
const legacyKey='gurukull.teacher.token';
let migration:Promise<void>|undefined;
// Never delete legacy material until the secure write succeeds. Concurrent
// requests share migration so logout cannot race a late legacy-token copy.
async function migrate(){
 if(!migration){migration=(async()=>{
   const existing=await Keychain.getGenericPassword({service});
   const legacy=await AsyncStorage.getItem(legacyKey);
   if(legacy&&!existing&&!await Keychain.setGenericPassword('session',legacy,{service,accessible:Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY}))throw new Error('Secure session storage unavailable');
   if(legacy)await AsyncStorage.removeItem(legacyKey);
 })().catch(error=>{migration=undefined;throw error;});}
 await migration;
}
// Order native reads/writes so a late migration or write cannot resurrect a
// session after an already-requested logout. Failures do not poison the queue.
let operations:Promise<unknown>=Promise.resolve();
function serial<T>(work:()=>Promise<T>):Promise<T>{const result=operations.then(work,work);operations=result.then(()=>undefined,()=>undefined);return result;}
export function getSessionToken(){return serial(async()=>{await migrate();const value=await Keychain.getGenericPassword({service});return value?value.password:null;});}
export function setSessionToken(token:string){return serial(async()=>{await migrate();if(!await Keychain.setGenericPassword('session',token,{service,accessible:Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY}))throw new Error('Secure session storage unavailable');await AsyncStorage.removeItem(legacyKey);});}
export function clearSessionToken(){return serial(async()=>{if(migration)await migration.catch(()=>{});await Keychain.resetGenericPassword({service});await AsyncStorage.removeItem(legacyKey);});}
