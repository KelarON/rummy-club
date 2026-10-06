import {db} from '../../../db/raw';
import {newGame,begin,play,draw,leave,view,host,makeBot,RECONNECT_MS} from '../../../lib/game';
import {chatMessage} from '../../../lib/chat';
import {RANDOM_MODES} from '../../../lib/random';
import {allowedOrigin} from '../../../lib/request-origin';
import {loadRoom,saveRoom,roomCode,lobbyInfo,RoomError,type RoomRecord} from '../../../lib/rooms';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
function token(req:Request){return req.headers.get('cookie')?.match(/(?:^|;\s*)rummy_player=([a-f0-9-]{36})/)?.[1];}
async function identity(t:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,'0')).join('');}
function reply(room:RoomRecord,id:string,c:string,t?:string){
 const h:Record<string,string>={...headers};if(t)h['Set-Cookie']=`rummy_player=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure`;
 return Response.json({...view(room.g,id),code:c,version:room.version,isPublic:room.isPublic,serverNow:Date.now()},{headers:h});
}
function failure(e:unknown){return Response.json({error:e instanceof RoomError?e.message:'Не удалось связаться с комнатой. Попробуйте ещё раз.',closed:e instanceof RoomError&&e.status===410},{status:e instanceof RoomError?e.status:503,headers});}
export async function GET(req:Request){try{
 const c=roomCode(new URL(req.url).searchParams.get('room')),room=await loadRoom(c),t=token(req),id=t?await identity(t):'';
 const p=room.g.players.find(p=>p.id===id);
 if(!p)return Response.json({join:true,invite:lobbyInfo(c,room)},{headers});
 // Presence alone is not activity and must not keep an abandoned room open forever.
 if(p.departureAt!=null||Date.now()-(p.lastSeen??0)>15000){p.lastSeen=Date.now();p.departureAt=null;await saveRoom(c,room);}
 return reply(room,id,c);
 }catch(e){return failure(e);}}
export async function POST(req:Request){try{
 if(!allowedOrigin(req))throw new RoomError('Недопустимый источник запроса.',403);
 if(Number(req.headers.get('content-length')||0)>20000)throw new RoomError('Запрос слишком большой.');
 const b=await req.json() as {action?:string;name?:unknown;code?:unknown;version?:number;board?:unknown;isPublic?:unknown;openingRule?:unknown;turnSeconds?:unknown;botCount?:unknown;replaceLeavers?:unknown;randomMode?:unknown;messageId?:unknown;kind?:unknown;content?:unknown},oldToken=token(req),t=oldToken??crypto.randomUUID(),id=await identity(t),now=Date.now();
 if(b.action==='create'){
  const name=typeof b.name==='string'?b.name.trim().slice(0,20):'';if(!name)throw new RoomError('Как вас зовут?');
  if(b.isPublic!==undefined&&typeof b.isPublic!=='boolean')throw new RoomError('Некорректная видимость комнаты.');
  if(b.openingRule!==undefined&&b.openingRule!=='classic'&&b.openingRule!=='shared')throw new RoomError('Неизвестный вариант правил.');
  const turnSeconds=b.turnSeconds??0;if(typeof turnSeconds!=='number'||![0,30,60,120,180,300].includes(turnSeconds))throw new RoomError('Выберите время хода из списка.');
  const botCount=b.botCount??0;if(!Number.isInteger(botCount)||typeof botCount!=='number'||botCount<0||botCount>3)throw new RoomError('Выберите от 0 до 3 ботов.');
  if(b.replaceLeavers!==undefined&&typeof b.replaceLeavers!=='boolean')throw new RoomError('Некорректная настройка замены игроков.');
  const randomMode=b.randomMode??'classic';if(typeof randomMode!=='string'||!RANDOM_MODES.includes(randomMode as any))throw new RoomError('Неизвестный режим раздачи.');
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const c=Array.from(crypto.getRandomValues(new Uint8Array(8)),x=>alphabet[x%alphabet.length]).join('');
  const g=newGame(b.openingRule==='shared'?'shared':'classic');g.turnSeconds=turnSeconds;g.randomMode=randomMode as typeof g.randomMode;g.replaceLeavers=b.replaceLeavers===true;g.chat=[];g.players.push({id,name,rack:[],opened:false,lastSeen:now});for(let i=0;i<botCount;i++)g.players.push(makeBot(g));
  const room={g,version:1,isPublic:b.isPublic===true,activityAt:now,created:now};
  await db().prepare('INSERT INTO rooms (code,state,version,created,is_public,activity_at) VALUES (?,?,1,?,?,?)').bind(c,JSON.stringify(g),now,room.isPublic?1:0,now).run();return reply(room,id,c,t);
 }
 const c=roomCode(b.code);
 // Metadata and leave operations retry on CAS conflict; gameplay never replays a stale turn.
 for(let attempt=0;attempt<4;attempt++){
  const room=await loadRoom(c),g=room.g,p=g.players.find(p=>p.id===id);
  try{
   if(b.action==='join'){
    if(p){p.lastSeen=now;p.departureAt=null;await saveRoom(c,room,true);return reply(room,id,c,t);}
    if(g.status!=='lobby')throw new RoomError('Партия уже началась. Создайте новое лобби.');if(g.players.length>=4)throw new RoomError('Все четыре места заняты.');
    const name=typeof b.name==='string'?b.name.trim().slice(0,20):'';if(!name)throw new RoomError('Введите ник.');if(g.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw new RoomError('Этот ник уже занят.');
    g.players.push({id,name,rack:[],opened:false,lastSeen:now});
   }else{
    if(!p){if(b.action==='leave')return Response.json({left:true},{headers});throw new RoomError('Вы больше не участник комнаты.',403);}
    if(b.action==='chat'){
     let message;try{message=chatMessage(b,p,g.chat??[],now);}catch(e){throw new RoomError((e as Error).message);}
     if(message){g.chat=[...(g.chat??[]),message].slice(-80);p.lastSeen=now;p.departureAt=null;await saveRoom(c,room,true);}
     return reply(room,id,c);
    }
    if(b.action==='disconnect'){p.departureAt=now+RECONNECT_MS;await saveRoom(c,room);return Response.json({ok:true},{headers});}
    if(b.action==='activity'){p.lastSeen=now;p.departureAt=null;await saveRoom(c,room,true);return Response.json({ok:true},{headers});}
    if(b.action==='leave'){leave(g,id,now);await saveRoom(c,room,true);return Response.json({left:true},{headers});}
    if(b.version!==room.version)throw new RoomError('Состояние изменилось. Повторите ход.',409);
    p.lastSeen=now;p.departureAt=null;
    try{
     if(b.action==='start'||b.action==='rematch'){
      if(host(g)?.id!==id)throw Error('Партию запускает создатель комнаты.');if(g.players.length<2)throw Error('Нужны хотя бы два игрока.');
      if(b.action==='start'&&g.status!=='lobby'||b.action==='rematch'&&g.status!=='finished')throw Error('Нельзя начать партию сейчас.');begin(g,now);
     }else if(b.action==='play')play(g,id,b.board,now);else if(b.action==='draw')draw(g,id,now);else throw Error('Неизвестное действие.');
    }catch(e){throw new RoomError((e as Error).message);}
   }
   await saveRoom(c,room,true);return reply(room,id,c,oldToken?undefined:t);
  }catch(e){if(e instanceof RoomError&&e.status===409&&['join','leave','activity','disconnect','chat'].includes(b.action??'')&&attempt<3)continue;throw e;}
 }
 throw new RoomError('Попробуйте ещё раз.',409);
 }catch(e){return failure(e);}}
