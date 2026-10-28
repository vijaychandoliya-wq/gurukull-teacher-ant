const path=require('node:path');
const assert=require('node:assert/strict');
const {getAssetData}=require('metro/private/Assets');
(async()=>{const file=path.resolve(__dirname,'../src/assets/dronacharya-logo.png');const result=await getAssetData(file,'src/assets/dronacharya-logo.png',[],null,'/assets');assert(result.width>0&&result.height>0);console.log('Patched image parser accepts the real Metro file-path contract');})().catch(error=>{console.error(error.message);process.exitCode=1;});
