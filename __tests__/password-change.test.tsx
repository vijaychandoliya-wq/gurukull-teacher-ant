import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ChangePasswordScreen from '../src/screens/ChangePasswordScreen';
import {changePassword,ApiError} from '../src/api';

jest.mock('../src/api',()=>({changePassword:jest.fn(),ApiError:class extends Error{}}));
jest.mock('@ant-design/react-native',()=>{
 const R=require('react');const Box=({children}:any)=>R.createElement('Box',null,children);
 return {Button:(p:any)=>R.createElement('Action',p,p.children),Form:Object.assign(Box,{Item:Box}),Input:(p:any)=>R.createElement('InputField',p),Text:Box,Toast:{success:jest.fn()},WhiteSpace:Box};
});
jest.mock('../src/components/ui',()=>{
 const R=require('react');const Box=({children}:any)=>R.createElement('Box',null,children);
 return {Screen:({children,error}:any)=>R.createElement('Screen',null,error,children),PageTitle:Box,Card:Object.assign(Box,{Header:Box,Body:Box}),AntIcon:Box,ButtonLabel:Box,ErrorBar:Box};
});
const change=changePassword as jest.Mock;
async function form(values:string[]){
 const done=jest.fn();let tree:ReactTestRenderer.ReactTestRenderer;
 await ReactTestRenderer.act(async()=>{tree=ReactTestRenderer.create(<ChangePasswordScreen onDone={done}/>);});
 await ReactTestRenderer.act(async()=>{tree!.root.findAllByType('InputField' as any).forEach((field,index)=>field.props.onChangeText(values[index]));});
 await ReactTestRenderer.act(async()=>{await tree!.root.findByType('Action' as any).props.onPress();});
 return {tree:tree!,done};
}
beforeEach(()=>jest.clearAllMocks());
test('does not send short or mismatched passwords',async()=>{
 for(const values of [['current scalar','short','short'],['current scalar','a long unique new passphrase','mismatch']]){
  const {tree,done}=await form(values);expect(change).not.toHaveBeenCalled();expect(done).not.toHaveBeenCalled();await ReactTestRenderer.act(async()=>tree.unmount());
 }
});
test('clears entered secrets and completes sign-out flow only after success',async()=>{
 change.mockResolvedValue({sessionsRevoked:true});const {tree,done}=await form(['current scalar','a long unique new passphrase','a long unique new passphrase']);
 expect(change).toHaveBeenCalledTimes(1);expect(done).toHaveBeenCalledTimes(1);expect(tree.root.findAllByType('InputField' as any).map(f=>f.props.value)).toEqual(['','','']);await ReactTestRenderer.act(async()=>tree.unmount());
});
test('keeps the user signed in and shows the server explanation on rejected current proof',async()=>{
 change.mockRejectedValue(new ApiError('Your current password is incorrect.',422));const {tree,done}=await form(['current scalar','a long unique new passphrase','a long unique new passphrase']);
 expect(done).not.toHaveBeenCalled();expect(JSON.stringify(tree.toJSON())).toContain('Your current password is incorrect.');await ReactTestRenderer.act(async()=>tree.unmount());
});
