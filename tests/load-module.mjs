import {build} from 'esbuild';
const cache=new Map();
export async function loadModule(relative){
 if(!cache.has(relative))cache.set(relative,(async()=>{
  const result=await build({entryPoints:[new URL(relative,import.meta.url).pathname],bundle:true,format:'esm',platform:'node',write:false});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 })());
 return cache.get(relative);
}
