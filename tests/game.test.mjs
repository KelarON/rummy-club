import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModule} from './load-module.mjs';
const {newGame,begin,play,draw,view,requiresOpening,sortRack,meld,leave,advance,IDLE_MS,NO_TIMER_KICK_MS,TIMER_TIMEOUT_KICKS,RECONNECT_MS}=await loadModule('../lib/game.ts');
function game(rule='shared',count=2){
 const g=newGame(rule);
 g.players=Array.from({length:count},(_,i)=>({id:String(i),name:`P${i}`,rack:[],opened:false}));
 begin(g);return g;
}
test('shared opening rejects <30 without changing state, then unlocks everybody on a valid play',()=>{
 const g=game();g.players[0].rack=[0,1,2,9,10,11];g.players[1].rack=[12,25];
 const before=JSON.stringify(g);assert.throws(()=>play(g,'0',[[0,1,2]]),/30/);assert.equal(JSON.stringify(g),before);
 play(g,'0',[[9,10,11]]);assert.equal(g.openingUnlocked,true);assert.equal(requiresOpening(g,g.players[1]),false);
 // A player who has never opened may immediately extend an existing run.
 play(g,'1',[[9,10,11,12]]);assert.deepEqual(g.players[1].rack,[25]);
});
for(const count of [2,3,4])test(`shared opening unlocks only after all ${count} players draw`,()=>{
 const g=game('shared',count);g.turn=count-1;
 for(let i=0;i<count;i++){
  const player=g.players[g.turn];draw(g,player.id);
  assert.equal(g.openingUnlocked,i===count-1);
 }
 assert.equal(g.status,'playing');assert.equal(g.passes,0); // The bank still contains tiles.
 const p=g.players[g.turn];p.rack=[0,1,2,40];play(g,p.id,[[0,1,2]]);assert.equal(p.opened,true);
});
test('classic and old rooms still require each player to open independently',()=>{
 for(const legacy of [false,true]){
  const g=game('classic');if(legacy){delete g.openingRule;delete g.openingUnlocked;delete g.openingPasses;}
  g.players[0].rack=[9,10,11,40];g.players[1].rack=[0,1,2,12,50];play(g,'0',[[9,10,11]]);
  assert.equal(requiresOpening(g,g.players[1]),true);
  assert.throws(()=>play(g,'1',[[9,10,11,12]]),/До открытия/);
  assert.throws(()=>play(g,'1',[[9,10,11],[0,1,2]]),/30/);
  draw(g,'1');draw(g,'0');assert.equal(requiresOpening(g,g.players[1]),true);
  assert.equal(view(g,'1').openingRule,'classic');
 }
});
test('rematch preserves chosen rules but resets threshold, passes and last drawn tiles',()=>{
 const g=game();draw(g,'0');draw(g,'1');assert.equal(g.openingUnlocked,true);begin(g);
 assert.equal(g.openingRule,'shared');assert.equal(g.openingUnlocked,false);assert.equal(g.openingPasses,0);
 assert.ok(g.players.every(p=>!p.opened&&p.lastDrawn===null&&p.rack.length===14));
});
test('a drawn tile, including id zero and jokers, is private and survives readback',()=>{
 for(const id of [0,104]){
  const g=game();g.pool=[id];g.players.forEach(p=>p.rack=p.rack.filter(t=>t!==id));draw(g,'0');
  const a=JSON.parse(JSON.stringify(view(g,'0'))),b=JSON.parse(JSON.stringify(view(g,'1')));
  assert.equal(a.lastDrawn,id);assert.equal(b.lastDrawn,null);
  assert.ok(a.rack.includes(id));assert.ok(!('pool' in a));
  assert.ok(b.players.every(p=>!('lastDrawn' in p)&&!('rack' in p)));
  assert.equal(view(JSON.parse(JSON.stringify(g)),'0').lastDrawn,id);
 }
});
test('invalid or out-of-turn actions do not unlock the game or change the last drawn tile',()=>{
 const g=game();draw(g,'0');const before=JSON.stringify(g);
 assert.throws(()=>draw(g,'0'));assert.throws(()=>play(g,'1',[[0,0,0]]));assert.equal(JSON.stringify(g),before);
});
test('empty-bank termination still works with shared opening',()=>{
 const g=game();g.pool=[];draw(g,'0');draw(g,'1');assert.equal(g.status,'finished');
});
test('sorting is deterministic across server updates, duplicate tiles and new draws',()=>{
 const ids=[104,26,14,1,0,52,53,105],original=[...ids];
 assert.deepEqual(sortRack(ids,'number'),[0,52,26,1,53,14,104,105]);
 assert.deepEqual(sortRack(ids,'color'),[0,52,1,53,14,26,104,105]);
 for(const mode of ['color','number']){
  const sorted=sortRack(ids,mode);assert.deepEqual(sortRack([...ids].reverse(),mode),sorted);
  assert.deepEqual(sortRack([...sorted,13],mode).filter(id=>id!==13),sorted);
 }
 assert.deepEqual(ids,original);
});
test('existing joker and run validation remains intact',()=>{
 assert.equal(meld([0,1,2]).points,6);assert.deepEqual(meld([8,10,104]).order,[8,104,10]);
 assert.equal(meld([0,52,13]),null);assert.equal(meld([11,12,0]),null);
});

const inventory=g=>[...g.pool,...g.board.flat(),...g.players.flatMap(p=>p.rack)].sort((a,b)=>a-b);
test('leaving preserves all 106 tiles and current player identity, including host transfer',()=>{
 const g=game('shared',4),before=inventory(g);g.turn=2;const timer=g.turnStartedAt;
 leave(g,'0',1000);assert.equal(g.players[0].id,'1');assert.equal(g.players[g.turn].id,'2');assert.equal(g.turnStartedAt,timer);assert.deepEqual(inventory(g),before);
 leave(g,'2',2000);assert.equal(g.players[g.turn].id,'3');assert.equal(g.turnStartedAt,2000);assert.deepEqual(inventory(g),before);
 leave(g,'3',3000);assert.equal(g.status,'finished');assert.equal(g.winner,'1');assert.equal(g.endedAt,3000);assert.deepEqual(inventory(g),before);
 leave(g,'1',4000);assert.equal(g.status,'closed');assert.equal(g.pool.length,106);
});
test('leaving the last seat in turn order wraps correctly and a skipped player can leave before global opening',()=>{
 const g=game('shared',3);g.turn=2;leave(g,'2',100);assert.equal(g.players[g.turn].id,'0');
 draw(g,'0',200);leave(g,'1',300);assert.equal(g.openingUnlocked,true);
});
test('timed games skip expired turns and kick after three timed-out turns by the same player',()=>{
 const start=1000000,g=game('shared',2);g.turnSeconds=30;begin(g,start);const before=inventory(g);
 assert.equal(advance(g,start,start+29999),false);
 for(let i=0;i<5;i++){
  const deadline=g.turnStartedAt+30000;
  assert.equal(advance(g,start,deadline),true);
  if(i<4)assert.equal(g.players.length,2);
 }
 assert.equal(g.players.some(p=>p.id==='0'),false);
 assert.deepEqual(inventory(g),before);
});
test('manual activity prevents presence kicks, while no-timer turns kick after 30 minutes',()=>{
 const start=1000000,g=game('shared',3);g.players.forEach(p=>p.lastSeen=start);g.players[0].departureAt=start+RECONNECT_MS;
 assert.equal(advance(g,start,start+RECONNECT_MS-1),false);advance(g,start,start+RECONNECT_MS);assert.equal(g.players.length,2);
 // Being quiet in the browser is no longer enough to remove a player.
 assert.equal(advance(g,start,start+PRESENCE_MS),false);
 const noTimer=game('shared',2);begin(noTimer,start);
 assert.equal(advance(noTimer,start,start+NO_TIMER_KICK_MS-1),false);
 assert.equal(advance(noTimer,start,start+NO_TIMER_KICK_MS),true);
 assert.equal(noTimer.players.length,1);
 const idle=game();idle.turnSeconds=30;begin(idle,start);assert.equal(advance(idle,start,start+IDLE_MS),true);assert.equal(idle.status,'closed');assert.match(idle.closedReason,/час/);assert.ok(idle.players.every(p=>p.rack.length===14));
});
