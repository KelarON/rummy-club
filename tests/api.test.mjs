// Exercise the actual route handlers against an isolated SQLite-backed D1 adapter.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const sqlite=new DatabaseSync(':memory:');
for(const file of ['0000_cheerful_tenebrous.sql','0001_chemical_golden_guardian.sql','0002_pale_randall_flagg.sql'])sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
globalThis.__rummyTestDb={prepare(sql){let values=[];const q={bind(...v){values=v;return q;},async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:r.changes}};}};return q;}};
const dir=mkdtempSync(path.join(tmpdir(),'rummy-routes-'));
async function loadRoute(name){
 const result=await build({entryPoints:[new URL(`../app/api/${name}/route.ts`,import.meta.url).pathname],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'local-test-d1',setup(b){b.onResolve({filter:/db\/raw$/},()=>({path:'test-db',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export function db(){return globalThis.__rummyTestDb}',loader:'js'}));}}]});
 const file=path.join(dir,name+'.mjs');writeFileSync(file,result.outputFiles[0].text);return import(pathToFileURL(file).href);
}
try{
 const game=await loadRoute('game'),lobby=await loadRoute('lobbies');
 async function call(data,cookie='',query=''){
  const req=new Request('http://localhost/api/game'+query,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','Cookie':cookie},...(data?{body:JSON.stringify(data)}:{})});
  const res=await (data?game.POST(req):game.GET(req));return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]??cookie};
 }
 const create=(name,extra={})=>call({action:'create',name,...extra});
 const list=async()=>{const r=await lobby.GET();assert.equal(r.status,200);return (await r.json()).lobbies;};
 await test('route lifecycle: room settings, public list, private draws, shared threshold, legacy defaults',async()=>{
  const priv=await create('Private'),a=await create('A',{isPublic:true,openingRule:'shared'});assert.equal(a.status,200);
  let publicRooms=await list();assert.ok(publicRooms.some(r=>r.code===a.data.code));assert.ok(!publicRooms.some(r=>r.code===priv.data.code));
  assert.deepEqual(Object.keys(publicRooms[0]).sort(),['botCount','canJoin','code','expiresAt','host','isPublic','openingRule','playerCount','randomMode','replaceLeavers','status','turnSeconds']);
  assert.equal(priv.data.openingRule,'classic');assert.equal(priv.data.isPublic,false);
  const code=a.data.code;const b=await call({action:'join',name:'B',code});assert.equal(b.status,200);assert.equal(b.data.openingRule,'shared');
  let state=(await call(null,a.cookie,'?room='+code)).data;
  assert.equal((await call({action:'start',code,version:state.version},b.cookie)).status,400);
  let r=await call({action:'start',code,version:state.version},a.cookie);assert.equal(r.status,200);state=r.data;
  assert.ok(!(await list()).some(r=>r.code===code));
  assert.equal((await call({action:'draw',code,version:state.version},b.cookie)).status,400);
  r=await call({action:'draw',code,version:state.version},a.cookie);assert.equal(r.status,200);state=r.data;
  const drawn=state.lastDrawn;assert.ok(state.rack.includes(drawn));assert.equal(state.openingUnlocked,false);
  const opponent=(await call(null,b.cookie,'?room='+code)).data;
  assert.equal(opponent.lastDrawn,null);assert.ok(opponent.players.every(p=>!('lastDrawn' in p)&&!('rack' in p)));assert.ok(!('pool' in opponent));
  r=await call({action:'draw',code,version:state.version},b.cookie);assert.equal(r.status,200);assert.equal(r.data.openingUnlocked,true);assert.ok(r.data.players.every(p=>!p.requiresOpening));
  state=(await call(null,a.cookie,'?room='+code)).data;assert.equal(state.lastDrawn,drawn);
  const replies=await Promise.all([0,1].map(()=>call({action:'draw',code,version:state.version},a.cookie)));
  assert.equal(replies.filter(r=>r.status===200).length,1);
  assert.equal((await call({action:'join',code,name:'Late'})).status,400);
  const invite=await call(null,'','?room='+code);assert.equal(invite.status,200);assert.equal(invite.data.join,true);assert.equal(invite.data.invite.canJoin,false);assert.ok(!('rack' in invite.data));
 });
 await test('full, expired, finished and private rooms are not listed',async()=>{
  const a=await create('Full',{isPublic:true});
  for(const name of ['B','C','D'])assert.equal((await call({action:'join',code:a.data.code,name})).status,200);
  assert.ok(!(await list()).some(r=>r.code===a.data.code));
  assert.equal((await call({action:'join',code:a.data.code,name:'Fifth'})).status,400);
  const expired=await create('Expired',{isPublic:true});sqlite.prepare('UPDATE rooms SET activity_at=? WHERE code=?').run(Date.now()-86400001,expired.data.code);
  assert.ok(!(await list()).some(r=>r.code===expired.data.code));
  const finished=await create('Finished',{isPublic:true});sqlite.prepare("UPDATE rooms SET state=json_set(state,'$.status','finished') WHERE code=?").run(finished.data.code);
  assert.ok(!(await list()).some(r=>r.code===finished.data.code));
 });
 await test('invalid lobby settings are rejected',async()=>{
  for(const settings of [{isPublic:'true'},{openingRule:'bogus'},{turnSeconds:-1},{turnSeconds:1},{turnSeconds:'60'}])assert.equal((await create('Invalid',settings)).status,400);
 });

 await test('invitation is safe, timer defaults to unlimited, host leave transfers ownership and last leave closes',async()=>{
  const a=await create('Host',{isPublic:true}),code=a.data.code;
  assert.equal(a.data.turnSeconds,0);
  const invite=(await call(null,'','?room='+code)).data;
  assert.deepEqual(Object.keys(invite).sort(),['invite','join']);assert.equal(invite.invite.host,'Host');assert.equal(invite.invite.canJoin,true);
  const b=await call({action:'join',code,name:'Guest'});
  assert.equal((await call({action:'leave',code},a.cookie)).status,200);
  let state=(await call(null,b.cookie,'?room='+code)).data;assert.equal(state.players.length,1);assert.equal(state.players[0].name,'Guest');
  assert.equal((await call({action:'leave',code},b.cookie)).status,200);
  assert.equal((await call(null,b.cookie,'?room='+code)).status,410);assert.ok(!(await list()).some(r=>r.code===code));
 });
 await test('current player leaving returns every tile, advances the turn and rejects stale writes',async()=>{
  const a=await create('A',{turnSeconds:30}),code=a.data.code;
  const b=await call({action:'join',code,name:'B'}),c=await call({action:'join',code,name:'C'});
  let state=(await call(null,a.cookie,'?room='+code)).data;
  state=(await call({action:'start',code,version:state.version},a.cookie)).data;
  const oldVersion=state.version,oldPool=state.poolCount;
  assert.equal(state.turnSeconds,30);assert.ok(state.startedAt);assert.equal(state.turnStartedAt,state.startedAt);
  await call({action:'leave',code},a.cookie);
  state=(await call(null,b.cookie,'?room='+code)).data;
  assert.equal(state.players.length,2);assert.equal(state.players[state.turn].name,'B');assert.equal(state.poolCount,oldPool+14);
  assert.equal((await call({action:'draw',code,version:oldVersion},b.cookie)).status,409);
  state=(await call({action:'draw',code,version:state.version},b.cookie)).data;assert.equal(state.players[state.turn].name,'C');
  await call({action:'leave',code},c.cookie);state=(await call(null,b.cookie,'?room='+code)).data;
  assert.equal(state.status,'finished');assert.equal(state.winner,state.me);assert.ok(state.endedAt>=state.startedAt);
 });
 await test('server enforces turn timeout and read-only polling cannot postpone room expiry',async()=>{
  const a=await create('Timer',{turnSeconds:30}),code=a.data.code;
  const b=await call({action:'join',code,name:'B'});
  let state=(await call(null,a.cookie,'?room='+code)).data;state=(await call({action:'start',code,version:state.version},a.cookie)).data;
  const raw=JSON.parse(sqlite.prepare('SELECT state FROM rooms WHERE code=?').get(code).state);raw.turnStartedAt=Date.now()-31000;
  sqlite.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(raw),code);
  state=(await call(null,a.cookie,'?room='+code)).data;assert.equal(state.rack.length,15);assert.ok(state.rack.includes(state.lastDrawn));assert.equal(state.players[state.turn].name,'B');
  sqlite.prepare('UPDATE rooms SET activity_at=? WHERE code=?').run(Date.now()-3599000,code);
  const oldActivity=sqlite.prepare('SELECT activity_at FROM rooms WHERE code=?').get(code).activity_at;
  assert.equal((await call(null,a.cookie,'?room='+code)).status,200);assert.equal(sqlite.prepare('SELECT activity_at FROM rooms WHERE code=?').get(code).activity_at,oldActivity);
  assert.equal((await call({action:'activity',code},a.cookie)).status,200);assert.ok(sqlite.prepare('SELECT activity_at FROM rooms WHERE code=?').get(code).activity_at>oldActivity);
  sqlite.prepare('UPDATE rooms SET activity_at=? WHERE code=?').run(Date.now()-3600001,code);
  assert.equal((await call({action:'activity',code},b.cookie)).status,410);assert.equal((await call({action:'join',code,name:'Late'})).status,410);
 });
 await test('disconnect has a reconnect grace; expired disconnect removes the seat',async()=>{
  const a=await create('A'),code=a.data.code;const b=await call({action:'join',code,name:'B'});
  assert.equal((await call({action:'disconnect',code},a.cookie)).status,200);
  assert.equal((await call(null,a.cookie,'?room='+code)).status,200);
  let raw=JSON.parse(sqlite.prepare('SELECT state FROM rooms WHERE code=?').get(code).state);assert.equal(raw.players[0].departureAt,null);
  raw.players[0].departureAt=Date.now()-1;sqlite.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(raw),code);
  const state=(await call(null,b.cookie,'?room='+code)).data;assert.equal(state.players.length,1);assert.equal(state.players[0].name,'B');
  assert.equal((await call(null,a.cookie,'?room='+code)).data.join,true);
 });

 await test('bot settings, solo start, human host after replacement and closing with only bots',async()=>{
  const a=await create('Human',{botCount:2,replaceLeavers:true,randomMode:'balanced',isPublic:true}),code=a.data.code;
  assert.equal(a.status,200);assert.equal(a.data.players.filter(p=>p.bot).length,2);assert.equal(a.data.ownerId,a.data.me);assert.equal(a.data.randomMode,'balanced');
  const listed=(await list()).find(r=>r.code===code);assert.equal(listed.botCount,2);assert.equal(listed.host,'Human');
  const b=await call({action:'join',code,name:'Guest'});assert.equal(b.status,200);
  let state=(await call(null,a.cookie,'?room='+code)).data;
  state=(await call({action:'start',code,version:state.version},a.cookie)).data;assert.equal(state.status,'playing');
  const oldRack=state.rack.length;await call({action:'leave',code},a.cookie);state=(await call(null,b.cookie,'?room='+code)).data;
  assert.equal(state.players.length,4);assert.equal(state.players.filter(p=>p.bot).length,3);assert.equal(state.ownerId,state.me);assert.ok(state.players.some(p=>p.bot&&p.count===oldRack));
  await call({action:'leave',code},b.cookie);assert.equal((await call(null,b.cookie,'?room='+code)).status,410);
  const solo=await create('Solo',{botCount:1,randomMode:'easy'});state=(await call({action:'start',code:solo.data.code,version:solo.data.version},solo.cookie)).data;assert.equal(state.status,'playing');assert.equal(state.players.length,2);
 });
 await test('server bot turns progress once under simultaneous polling and do not leak hidden racks',async()=>{
  const a=await create('A',{botCount:1}),code=a.data.code;
  let state=(await call({action:'start',code,version:a.data.version},a.cookie)).data;
  const raw=JSON.parse(sqlite.prepare('SELECT state FROM rooms WHERE code=?').get(code).state);raw.turn=1;raw.turnStartedAt=Date.now()-2100;
  sqlite.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(raw),code);
  const replies=await Promise.all([0,1,2].map(()=>call(null,a.cookie,'?room='+code)));assert.ok(replies.every(r=>r.status===200));
  state=(await call(null,a.cookie,'?room='+code)).data;assert.equal(state.players[state.turn].id,state.me);assert.ok(state.players.filter(p=>p.bot).every(p=>!('rack' in p)));assert.equal(state.version,a.data.version+2);
 });
 await test('chat is private to members, deduplicates retries and concurrent sends preserve both messages',async()=>{
  const a=await create('Alice'),code=a.data.code,b=await call({action:'join',code,name:'Bob'});
  const firstId=crypto.randomUUID(),input={action:'chat',code,messageId:firstId,kind:'text',content:'Привет 😼 <b>текст</b>'};
  let reply=await call(input,a.cookie);assert.equal(reply.status,200);assert.equal(reply.data.chat.length,1);assert.equal(reply.data.chat[0].name,'Alice');assert.equal(reply.data.chat[0].content,input.content);
  reply=await call(input,a.cookie);assert.equal(reply.status,200);assert.equal(reply.data.chat.length,1);
  assert.equal((await call({...input,messageId:crypto.randomUUID()},'')).status,403);
  assert.ok(!('chat' in (await call(null,'','?room='+code)).data));
  const raw=JSON.parse(sqlite.prepare('SELECT state FROM rooms WHERE code=?').get(code).state);raw.chat[0].createdAt=Date.now()-1000;sqlite.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(raw),code);
  const sends=await Promise.all([call({...input,messageId:crypto.randomUUID(),content:'coffee',kind:'sticker'},a.cookie),call({...input,messageId:crypto.randomUUID(),content:'Привет!'},b.cookie)]);
  assert.ok(sends.every(r=>r.status===200));reply=await call(null,b.cookie,'?room='+code);assert.equal(reply.data.chat.length,3);assert.ok(reply.data.chat.some(m=>m.kind==='sticker'));
  await call({action:'leave',code},a.cookie);assert.equal((await call({...input,messageId:crypto.randomUUID()},a.cookie)).status,403);
 });
 await test('chat metadata cannot overwrite a valid gameplay turn; recent history remains bounded',async()=>{
  const a=await create('A'),code=a.data.code,b=await call({action:'join',code,name:'B'});
  let state=(await call(null,a.cookie,'?room='+code)).data;state=(await call({action:'start',code,version:state.version},a.cookie)).data;
  const replies=await Promise.all([call({action:'draw',code,version:state.version},a.cookie),call({action:'chat',code,messageId:crypto.randomUUID(),kind:'text',content:'Удачи!'},b.cookie)]);
  assert.equal(replies[1].status,200);if(replies[0].status===409){state=(await call(null,a.cookie,'?room='+code)).data;assert.equal((await call({action:'draw',code,version:state.version},a.cookie)).status,200);}else assert.equal(replies[0].status,200);
  state=(await call(null,a.cookie,'?room='+code)).data;assert.equal(state.rack.length,15);assert.equal(state.chat.length,1);
  const raw=JSON.parse(sqlite.prepare('SELECT state FROM rooms WHERE code=?').get(code).state);raw.chat=Array.from({length:80},(_,i)=>({id:crypto.randomUUID(),authorId:'old',name:'Old',kind:'text',content:String(i),createdAt:Date.now()-20000}));sqlite.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(raw),code);
  const reply=await call({action:'chat',code,messageId:crypto.randomUUID(),kind:'text',content:'Новое'},a.cookie);assert.equal(reply.status,200);assert.equal(reply.data.chat.length,80);assert.equal(reply.data.chat.at(-1).content,'Новое');
 });
 await test('bad bot, random and chat options are rejected',async()=>{
  for(const extra of [{botCount:-1},{botCount:4},{botCount:1.5},{botCount:'2'},{replaceLeavers:'yes'},{randomMode:'fake'}])assert.equal((await create('Bad',extra)).status,400);
  const a=await create('A');for(const extra of [{kind:'sticker',content:'fake'},{kind:'text',content:'x'.repeat(501)},{kind:'text',content:''}])assert.equal((await call({action:'chat',code:a.data.code,messageId:crypto.randomUUID(),...extra},a.cookie)).status,400);
 });
}finally{sqlite.close();delete globalThis.__rummyTestDb;rmSync(dir,{recursive:true,force:true});}
