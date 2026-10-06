// Docker exposes the Worker only inside its network. Nginx overwrites Host and
// both forwarded headers. Require matching authorities; never accept a list.
export function allowedOrigin(req:Request){
 const origin=req.headers.get('origin');if(!origin)return true;
 let expected=new URL(req.url).origin;
 const host=req.headers.get('host'),forwardedHost=req.headers.get('x-forwarded-host'),protocol=req.headers.get('x-forwarded-proto');
 if(host&&forwardedHost===host&&protocol&&/^https?$/.test(protocol)&&/^[\w.:[\]-]+$/.test(host)){
  try{expected=new URL(`${protocol}://${host}`).origin;}catch{return false;}
 }
 return origin===expected;
}
