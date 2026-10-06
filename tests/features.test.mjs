import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {loadModule} from './load-module.mjs';
import {migrateLocal} from '../scripts/migrate-local.mjs';
const {deal,takeTile}=await loadModule('../lib/random.ts');
const {chooseMelds,handQuality}=await loadModule('../lib/solver.ts');
const {newGame,makeBot,begin,leave,advance,play,draw,view,meld,host,BOT_THINK_MS}=await loadModule('../lib/game.ts');
const {planBotMove}=await loadModule('../lib/bots.ts');
const {createDraft,restoreDraft,moveDraft}=await loadModule('../lib/sandbox.ts');
const {chatMessage,STICKERS}=await loadModule('../lib/chat.ts');
const {allowedOrigin}=await loadModule('../lib/request-origin.ts');
const inventory=g=>[...g.pool,...g.board.flat(),...g.players.flatMap(p=>p.rack)].sort((a,b)=>a-b);
const allTiles=Array.from({length:106},(_,i)=>i);
function seed(t,value=42){t.mock.method(crypto,'getRandomValues',array=>{for(let i=0;i<array.length;i++){value=(Math.imul(value,1664525)+1013904223)>>>0;array[i]=value;}return array;});}
function game(count=2,replace=false){const g=newGame('shared');g.replaceLeavers=replace;g.players=Array.from({length:count},(_,i)=>({id:String(i),name:`P${i}`,rack:[],opened:false}));begin(g,1000000);return g;}

test('every randomness mode preserves all 106 distinct tiles and 14 tiles per seat',t=>{
 seed(t);for(const mode of ['classic','balanced','easy'])for(const count of [1,2,3,4])for(let n=0;n<4;n++){
  const {hands,pool}=deal(count,mode);assert.ok(hands.every(h=>h.length===14));assert.deepEqual([...hands.flat(),...pool].sort((a,b)=>a-b),allTiles);
  if(mode==='easy')assert.ok(hands.every(h=>chooseMelds(h,30).length>0));
 }
});
test('balanced starts improve combination quality over classic on a fixed repeatable sample',t=>{
 seed(t,123);let classic=0,balanced=0,classicDuplicates=0,balancedDuplicates=0;
 for(let n=0;n<30;n++){for(const mode of ['classic','balanced'])for(const hand of deal(4,mode).hands){const duplicates=hand.filter(id=>id<104).length-new Set(hand.filter(id=>id<104).map(id=>id%52)).size;if(mode==='classic'){classic+=handQuality(hand);classicDuplicates+=duplicates;}else{balanced+=handQuality(hand);balancedDuplicates+=duplicates;}}}
 assert.ok(balancedDuplicates<classicDuplicates,{classicDuplicates,balancedDuplicates});
 assert.ok(balanced>classic*1.3,{classic,balanced});
});
test('classic draws keep the original bank order; assisted draws prefer useful tiles without creating copies',t=>{
 seed(t);const rack=[7,8];assert.equal(takeTile([9,59],rack,[],'classic'),59);
 for(const mode of ['balanced','easy']){
  let useful=0;for(let i=0;i<100;i++){const pool=[59,60,9],taken=takeTile(pool,rack,[],mode);if(taken===9)useful++;assert.equal(pool.length,2);assert.ok(!pool.includes(taken));}
  assert.ok(useful>85,`${mode}: ${useful}`);
 }
});
test('two physical copies can be used in separate valid melds',()=>{
 const hand=[0,1,2,52,53,54];const rows=chooseMelds(hand);assert.equal(rows.flat().length,6);assert.ok(rows.every(r=>meld(r)));assert.equal(new Set(rows.flat()).size,6);
});
test('bots open legitimately, extend public rows and split a run to use a duplicate',()=>{
 for(const [rack,board,opening] of [[[9,10,11,20],[],true],[[12,30],[[9,10,11]],false],[[54,33],[[0,1,2,3,4,5]],false]]){
  const move=planBotMove(rack,board,opening);assert.ok(move);const g=newGame('classic');g.players=[{id:'bot',name:'Bot',rack:[...rack],opened:!opening},{id:'human',name:'Human',rack:[50],opened:true}];g.status='playing';g.board=board.map(r=>[...r]);g.pool=[];
  play(g,'bot',move);assert.ok(g.players[0].rack.length<rack.length);assert.ok(g.board.every(r=>meld(r)));
 }
 assert.equal(planBotMove([0,15,39],[],true),null);
});
test('bot replacement inherits the exact rack, keeps the turn, transfers host and closes after the last human',()=>{
 const g=game(3,true),rack=[...g.players[0].rack],before=inventory(g);g.players[0].opened=true;
 leave(g,'0',1000100);assert.equal(g.players.length,3);assert.equal(g.players[0].bot,true);assert.deepEqual(g.players[0].rack,rack);assert.equal(g.players[0].opened,true);assert.equal(g.turn,0);assert.equal(host(g).id,'1');assert.deepEqual(inventory(g),before);
 leave(g,'1',1000200);assert.equal(host(g).id,'2');leave(g,'2',1000300);assert.equal(g.status,'closed');assert.equal(g.players.length,0);assert.deepEqual(inventory(g),before);
});
test('bots take server-driven turns with no human timer and do not need heartbeat or keep an empty room alive',()=>{
 const g=game();g.players[1].bot=true;g.players[1].id='bot:1';g.players[1].lastSeen=0;g.turn=1;g.players[1].rack=[9,10,11,20];g.pool=g.pool.filter(id=>!g.players[1].rack.includes(id));const before=inventory(g);
 assert.equal(advance(g,1000000,1000000+BOT_THINK_MS-1),false);assert.equal(advance(g,1000000,1000000+BOT_THINK_MS),true);assert.equal(g.turn,0);assert.equal(g.players.length,2);assert.deepEqual(inventory(g),before);
 leave(g,'0',1003000);assert.equal(g.status,'closed');
});
test('full bot games run through real rule validation without losing tiles',t=>{
 seed(t,11);for(const mode of ['classic','balanced','easy']){
  const g=newGame('shared');g.randomMode=mode;g.players.push({id:'human',name:'Human',rack:[],opened:false});for(let i=0;i<3;i++)g.players.push(makeBot(g));begin(g,1000000);
  for(let n=0;n<180&&g.status==='playing';n++){
   const p=g.players[g.turn],move=planBotMove(p.rack,g.board,!g.openingUnlocked);
   if(move)play(g,p.id,move,1000000+n*2000);else draw(g,p.id,1000000+n*2000);
   assert.deepEqual(inventory(g),allTiles);assert.ok(g.board.every(r=>meld(r)));
  }
  assert.equal(g.status,'finished',mode);
 }
});
test('bot hands and bank stay private in the client projection',()=>{
 const g=game();g.players[1].bot=true;const state=JSON.parse(JSON.stringify(view(g,'0')));assert.ok(!('pool' in state));assert.equal(state.players[1].bot,true);assert.ok(!('rack' in state.players[1]));assert.ok(!('lastDrawn' in state.players[1]));
});
test('sandbox owns all its arrays and never mutates live or base state',()=>{
 const source={code:'ABCD2345',me:'A',round:1,board:[[9,10,11]],rack:[0,1,2,12]},original=structuredClone(source),d=createDraft(source),copy=structuredClone(d);
 const next=moveDraft(d,[0,1,2],'new');assert.deepEqual(source,original);assert.deepEqual(d,copy);assert.equal(next.board.length,2);
 const returned=moveDraft(next,[0,1,2],'rack');assert.deepEqual(returned.board,source.board);assert.deepEqual([...returned.rack].sort((a,b)=>a-b),[0,1,2,12]);
 assert.throws(()=>moveDraft(d,[9],'rack'),/нельзя/);assert.throws(()=>moveDraft(d,[40],'new'));
 source.board.push([20,21,22]);assert.equal(next.baseBoard.length,1);assert.equal(next.board.length,2);
});
test('sandbox restore is local to room/player/round and rejects corrupted or forged tile caches',()=>{
 const source={code:'ABCD2345',me:'A',round:1,board:[[9,10,11]],rack:[0,1,2]},d=moveDraft(createDraft(source),[0,1,2],'new');
 assert.deepEqual(restoreDraft(JSON.stringify(d),source),d);
 for(const change of [{code:'ZZZZ2345'},{me:'B'},{round:2}])assert.equal(restoreDraft(JSON.stringify(d),{...source,...change}),null);
 for(const bad of [{...d,rack:[99]},{...d,board:[[0,0,1]]},{...d,rack:[9]},{...d,baseRack:[0,1,106]}])assert.equal(restoreDraft(JSON.stringify(bad),source),null);
 assert.equal(restoreDraft('{',source),null);
});
test('chat supports escaped plain text, emoji and stickers, deduplicates retries and rejects invalid payloads',()=>{
 const author={id:'A',name:'Alice'},id='a'.repeat(8)+'-aaaa-aaaa-aaaa-'+'a'.repeat(12),make=(content,kind='text',messageId=id)=>chatMessage({content,kind,messageId},author,[],1000000);
 const text=make('<script> 😼');assert.equal(text.content,'<script> 😼');assert.equal(make(STICKERS[0].id,'sticker').kind,'sticker');
 assert.equal(chatMessage({messageId:id,kind:'text',content:'retry'},author,[text],1000000),null);
 for(const payload of [[''],['x'.repeat(501)],['unknown','sticker'],['x','bad'],['x','text','bad']])assert.throws(()=>make(...payload));
 assert.throws(()=>chatMessage({messageId:crypto.randomUUID(),kind:'text',content:'spam'},author,[text],1000100),/быстро/);
});
test('Docker migration runner handles clean, legacy and partial installs and repeated restarts',async()=>{
 const names=['0000_cheerful_tenebrous.sql','0001_chemical_golden_guardian.sql','0002_pale_randall_flagg.sql'],files=names.map(name=>({name,sql:readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8')}));
 for(const legacy of [0,1,2,3]){
  const db=new DatabaseSync(':memory:');try{
   for(let i=0;i<legacy;i++)db.exec(files[i].sql);
   if(legacy===2)db.exec('DROP INDEX idx_rooms_public_created');
   if(legacy)db.exec(`INSERT INTO rooms (code,state,created) VALUES ('ABCD2345','{}',1)`);
   const execute=async sql=>/^(SELECT|PRAGMA)/.test(sql)?db.prepare(sql).all():(db.exec(sql),[]);
   await migrateLocal(execute,files);await migrateLocal(execute,files);
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rummy_migrations').get().n,3);assert.ok(db.prepare('PRAGMA table_info(rooms)').all().some(c=>c.name==='activity_at'));
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n,legacy?1:0);
  }finally{db.close();}
 }
});
test('origin checking accepts the HTTPS Docker proxy while rejecting foreign origins and mismatched authorities',()=>{
 const make=headers=>new Request('http://game.example.test/api/game',{headers});
 const proxy={'Origin':'https://game.example.test','Host':'game.example.test','X-Forwarded-Host':'game.example.test','X-Forwarded-Proto':'https'};
 assert.equal(allowedOrigin(make(proxy)),true);assert.equal(allowedOrigin(make({Origin:'http://game.example.test'})),true);
 for(const change of [{Origin:'https://evil.example'},{'X-Forwarded-Host':'evil.example'},{'X-Forwarded-Host':'game.example.test,evil.example'},{'X-Forwarded-Proto':'ftp'}])assert.equal(allowedOrigin(make({...proxy,...change})),false);
});
