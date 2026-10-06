import {tile,meld} from "./tiles";
import {shuffle,deal,takeTile,type RandomMode} from "./random";
import {planBotMove} from "./bots";
import type {ChatMessage} from "./chat";
export type {Tile} from "./tiles";
export type {RandomMode} from "./random";
export type OpeningRule = "classic" | "shared";
export type Player={id:string,name:string,rack:number[],opened:boolean,lastDrawn?:number|null,lastSeen?:number,departureAt?:number|null,bot?:boolean,timeoutPasses?:number};
export type Game={players:Player[],board:number[][],pool:number[],turn:number,status:'lobby'|'playing'|'finished'|'closed',winner:string|null,passes:number,log:string[],round:number,openingRule?:OpeningRule,openingUnlocked?:boolean,openingPasses?:number,openingSkipped?:string[],turnSeconds?:number,startedAt?:number|null,endedAt?:number|null,turnStartedAt?:number|null,closedReason?:string,randomMode?:RandomMode,replaceLeavers?:boolean,chat?:ChatMessage[]};
export {tile,meld} from "./tiles";
export function newGame(openingRule:OpeningRule="classic"):Game{return {openingRule,openingUnlocked:false,openingPasses:0,players:[],board:[],pool:[],turn:0,status:'lobby',winner:null,passes:0,log:[],round:0};}
export function requiresOpening(g:Game,p:Player){
 return g.openingRule === "shared" ? !g.openingUnlocked : !p.opened;
}
export function begin(g:Game,now=Date.now()){
 const {hands,pool}=deal(g.players.length,g.randomMode??'classic');
 g.players.forEach((p,i)=>{p.rack=hands[i];p.opened=false;p.lastDrawn=null;});g.pool=pool;g.board=[];g.status='playing';g.startedAt=now;g.endedAt=null;g.turnStartedAt=now;g.openingSkipped=[];g.round++;g.turn=(g.round-1)%g.players.length;g.winner=null;g.passes=0;g.openingUnlocked=false;g.openingPasses=0;g.log=[g.openingRule==='shared'?'Первый выход — от 30. После выкладывания или круга без выкладываний ограничение снимется для всех.':'Фишки розданы. Первое выкладывание каждого игрока — от 30 очков.'];
}
export function play(g:Game,id:string,board:unknown,now=Date.now()){
 const p=g.players[g.turn];if(g.status!=='playing'||p.id!==id)throw Error('Сейчас ход другого игрока.');
 if(!Array.isArray(board)||board.length>35||board.some(r=>!Array.isArray(r)||r.length>13||r.some(x=>!Number.isInteger(x)||x<0||x>105)))throw Error('Некорректный стол.');
 const rows=board as number[][],all=rows.flat(),old=g.board.flat(),allowed=new Set([...old,...p.rack]);
 if(new Set(all).size!==all.length||all.some(t=>!allowed.has(t))||old.some(t=>!all.includes(t)))throw Error('Все фишки со стола должны остаться на столе.');
 const added=all.filter(t=>p.rack.includes(t));if(!added.length)throw Error('Выложите хотя бы одну свою фишку.');
 const valid=rows.map(meld);if(valid.some(v=>!v))throw Error('Каждая комбинация должна быть рядом или группой из 3–13 фишек.');
 if(requiresOpening(g,p)){
  const keys=rows.map(r=>[...r].sort((a,b)=>a-b).join(','));
  if(g.board.some(r=>!keys.includes([...r].sort((a,b)=>a-b).join(','))))throw Error('До открытия нельзя менять комбинации на столе.');
  const fresh=rows.filter(r=>r.some(t=>added.includes(t)));
  if(fresh.some(r=>r.some(t=>!p.rack.includes(t))))throw Error('Первое выкладывание — только из своих фишек.');
  if(fresh.reduce((s,r)=>s+meld(r)!.points,0)<30)throw Error('Для первого выкладывания нужно минимум 30 очков.');
 }
 p.opened=true;p.lastDrawn=null;p.timeoutPasses=0;
 const unlockedNow=g.openingRule==='shared'&&!g.openingUnlocked;
 if(unlockedNow)g.openingUnlocked=true;
 p.rack=p.rack.filter(t=>!added.includes(t));g.board=valid.map(v=>v!.order);g.passes=0;g.openingPasses=0;g.openingSkipped=[];
 g.log.unshift(`${p.name}: на стол ${added.length} фишек.`);if(unlockedNow)g.log.unshift('Первый выход состоялся — ограничение 30 очков снято для всех.');g.log=g.log.slice(0,12);
 if(!p.rack.length){g.status='finished';g.endedAt=now;g.winner=p.id;g.log.unshift(`${p.name} — победитель!`);}else {g.turn=(g.turn+1)%g.players.length;g.turnStartedAt=now;}
}
export function draw(g:Game,id:string,now=Date.now()){
 const p=g.players[g.turn];if(g.status!=='playing'||p.id!==id)throw Error('Сейчас ход другого игрока.');
 p.lastDrawn=null;p.timeoutPasses=0;
 if(g.pool.length){p.lastDrawn=takeTile(g.pool,p.rack,g.board,g.randomMode??'classic');p.rack.push(p.lastDrawn);g.passes=0;g.log.unshift(`${p.name} берёт фишку.`);}else{g.passes++;g.log.unshift(`${p.name} пропускает ход.`);}
 if(g.openingRule==='shared'&&!g.openingUnlocked){
  g.openingSkipped=[...new Set([...(g.openingSkipped??[]),id])];g.openingPasses=g.openingSkipped.length;
  if(g.openingPasses>=g.players.length){g.openingUnlocked=true;g.log.unshift('Все пропустили выкладывание — ограничение 30 очков снято для всех.');}
 }
 if(g.passes>=g.players.length){g.status='finished';g.endedAt=now;const score=(p:Player)=>p.rack.reduce((s,id)=>s+(tile(id).n||30),0);const min=Math.min(...g.players.map(score));const wins=g.players.filter(p=>score(p)===min);g.winner=wins.length===1?wins[0].id:null;g.log.unshift('Банк пуст, все пропустили. Побеждает минимум очков на подставке.');}
 g.turn=(g.turn+1)%g.players.length;g.turnStartedAt=now;g.log=g.log.slice(0,12);
}
export function view(g:Game,id:string){const own=g.players.find(p=>p.id===id);return {...g,randomMode:g.randomMode??"classic",replaceLeavers:g.replaceLeavers??false,ownerId:host(g)?.id,chat:g.chat??[],openingRule:g.openingRule??"classic",openingUnlocked:g.openingUnlocked??false,lastDrawn:own?.lastDrawn!=null&&own.rack.includes(own.lastDrawn)?own.lastDrawn:null,pool:undefined,poolCount:g.pool.length,players:g.players.map(p=>({id:p.id,name:p.name,bot:p.bot===true,opened:p.opened,requiresOpening:requiresOpening(g,p),count:p.rack.length,penalty:g.status==='finished'?p.rack.reduce((s,t)=>s+(tile(t).n||30),0):undefined})),rack:g.players.find(p=>p.id===id)?.rack??[],me:id};}

export type SortMode='color'|'number';
export function sortRack(ids:number[],mode:SortMode):number[]{
 return [...ids].sort((a,b)=>{
  const x=tile(a),y=tile(b);
  // Jokers stay at the end in both modes; duplicate tiles keep a stable order.
  if((x.n===0)!==(y.n===0))return x.n===0?1:-1;
  return (mode==='color'?x.c-y.c||x.n-y.n:x.n-y.n||x.c-y.c)||a-b;
 });
}

export const IDLE_MS=60*60*1000;
export const NO_TIMER_KICK_MS=30*60*1000;
export const TIMER_TIMEOUT_KICKS=3;
// Kept for backwards compatibility; ordinary presence is no longer a kick condition.
export const PRESENCE_MS=120000;
export const RECONNECT_MS=30000;
export function closeGame(g:Game,reason:string,now=Date.now()){
 g.status='closed';g.closedReason=reason;g.endedAt=now;g.turnStartedAt=null;
}
export function leave(g:Game,id:string,now=Date.now()){
 const index=g.players.findIndex(p=>p.id===id);if(index<0)return;
 const current=g.players[g.turn]?.id,player=g.players[index];
 if(!player.bot&&g.status==='playing'&&g.replaceLeavers&&g.players.some(p=>!p.bot&&p.id!==id)){
  const bot=makeBot(g);bot.rack=[...player.rack];bot.opened=player.opened;bot.lastDrawn=player.lastDrawn??null;
  g.players[index]=bot;g.openingSkipped=(g.openingSkipped??[]).map(x=>x===id?bot.id:x);
  if(current===id)g.turnStartedAt=now;
  g.log.unshift(`${player.name} выходит. ${bot.name} продолжит с его фишками.`);g.log=g.log.slice(0,12);return;
 }
 g.pool.push(...player.rack);
 shuffle(g.pool);
 g.players.splice(index,1);g.passes=0;
 g.openingSkipped=(g.openingSkipped??[]).filter(x=>x!==id);g.openingPasses=g.openingSkipped.length;
 if(g.openingRule==='shared'&&g.players.length>0&&g.openingPasses>=g.players.length)g.openingUnlocked=true;
 g.log.unshift(`${player.name} покидает комнату. ${player.rack.length} фишек возвращено в банк.`);g.log=g.log.slice(0,12);
 if(!host(g)){for(const p of g.players)g.pool.push(...p.rack);g.players=[];g.turn=0;closeGame(g,'Все игроки вышли.',now);return;}
 if(current===id){g.turn=index%g.players.length;g.turnStartedAt=now;}
 else {const next=g.players.findIndex(p=>p.id===current);g.turn=next<0?0:next;}
 if(g.status==='playing'&&g.players.length===1){g.status='finished';g.endedAt=now;g.winner=g.players[0].id;g.log.unshift('Остался один игрок — партия завершена.');}
}
// Request-driven clock: checked before reads and writes, independent of a client's timer.
export function advance(g:Game,lastActivity:number,now=Date.now()){
 if(g.status==='closed')return false;
 if(now-lastActivity>=IDLE_MS){closeGame(g,'Лобби закрыто: час без активности.',now);return true;}
 let changed=false;
 // A short reconnect grace period is still honoured. Ordinary presence is not a kick condition.
 for(const p of [...g.players]){
  if(!p.bot&&p.departureAt!=null&&now>=p.departureAt){
   leave(g,p.id,now);changed=true;
  }
 }
 // Bots have their own short server deadline, including games without a human timer.
 for(let n=0;g.status==='playing'&&g.turnStartedAt!=null&&n<120;n++){
  const p=g.players[g.turn];
  if(!p)break;
  const seconds=p.bot?BOT_THINK_MS/1000:(g.turnSeconds??0);
  const deadline=p.bot?g.turnStartedAt+seconds*1000:(seconds>0?g.turnStartedAt+seconds*1000:g.turnStartedAt+NO_TIMER_KICK_MS);
  if(now<deadline)break;
  if(p.bot){
   const move=planBotMove(p.rack,g.board,requiresOpening(g,p));
   if(move)play(g,p.id,move,deadline);else draw(g,p.id,deadline);
   changed=true;
  }else if(seconds>0){
   // A timed-out turn counts toward this player's three-strike limit.
   draw(g,p.id,deadline);
   p.timeoutPasses=(p.timeoutPasses??0)+1;
   g.log.unshift(`${p.name}: время хода истекло.`);g.log=g.log.slice(0,12);
   changed=true;
   if(p.timeoutPasses>=TIMER_TIMEOUT_KICKS){
    leave(g,p.id,deadline);
    g.log.unshift(`${p.name} исключён после ${TIMER_TIMEOUT_KICKS} пропусков по таймеру.`);
    g.log=g.log.slice(0,12);
   }
  }else{
   // Without a turn timer, only the player whose turn is stuck for 30 minutes is removed.
   leave(g,p.id,deadline);
   g.log.unshift(`${p.name} исключён: 30 минут без хода.`);
   g.log=g.log.slice(0,12);
   changed=true;
  }
 }
 return changed;
}
export const BOT_THINK_MS=2000;
export function host(g:Game){return g.players.find(p=>!p.bot);}
export function makeBot(g:Game):Player{
 const names=['Бот Кофе','Бот Печенька','Бот Перерыв','Бот Комбинация'];
 const name=names.find(n=>!g.players.some(p=>p.name===n))??`Бот ${crypto.randomUUID().slice(0,4)}`;
 return {id:`bot:${crypto.randomUUID()}`,name,rack:[],opened:false,bot:true};
}
