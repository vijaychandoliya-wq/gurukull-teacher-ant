// Metro 0.83 passes filenames to image-size's former synchronous API.
// Keep that boundary while using the patched upstream 2.0.3 byte parser.
const fs=require('node:fs');
const core=require('image-size-core');
function imageSize(input){return core.imageSize(typeof input==='string'?fs.readFileSync(input):input);}
Object.assign(imageSize,core,{default:imageSize,imageSize});
module.exports=imageSize;
