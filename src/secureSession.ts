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
export async function getSessionToken(){await migrate();const value=await Keychain.getGenericPassword({service});return value?value.password:null;}
export async function setSessionToken(token:string){await migrate();if(!await Keychain.setGenericPassword('session',token,{service,accessible:Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY}))throw new Error('Secure session storage unavailable');await AsyncStorage.removeItem(legacyKey);}
export async function clearSessionToken(){if(migration)await migration.catch(()=>{});await Keychain.resetGenericPassword({service});await AsyncStorage.removeItem(legacyKey);}
