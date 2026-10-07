import {db,cleanupOldRooms} from '../db/raw';
import {advance,host,IDLE_MS,type Game} from './game';
export class RoomError extends Error {constructor(message:string,public status=400){super(message);}}
export type RoomRecord={g:Game,version:number,isPublic:boolean,activityAt:number,created:number};
export function roomCode(v:unknown){if(typeof v!=='string'||!/^[A-Z2-9]{8}$/.test(v))throw new RoomError('Введите код комнаты из 8 символов.');return v;}
export async function loadRoom(code:string):Promise<RoomRecord>{
 cleanupOldRooms();
 for(let attempt=0;attempt<5;attempt++){
  const row=await db().prepare('SELECT state,version,created,is_public,activity_at FROM rooms WHERE code=?').bind(code).first<{state:string,version:number,created:number,is_public:number,activity_at:number}>();
  if(!row)throw new RoomError('Комната не найдена.',404);
  const g=JSON.parse(row.state) as Game,activityAt=row.activity_at||row.created;
  if(advance(g,activityAt)){
   // advance() may execute a bot turn; persist it atomically below.

   const saved=await db().prepare('UPDATE rooms SET state=?,version=version+1 WHERE code=? AND version=?').bind(JSON.stringify(g),code,row.version).run();
   if(!saved.meta.changes)continue;
   row.version++;
  }
  if(g.status==='closed')throw new RoomError(g.closedReason||'Комната закрыта.',410);
  return {g,version:row.version,isPublic:row.is_public===1,activityAt,created:row.created};
 }
 throw new RoomError('Комната обновляется. Повторите действие.',409);
}
export async function saveRoom(code:string,room:RoomRecord,active=false){
 const activity=active?Date.now():room.activityAt;
 const result=await db().prepare('UPDATE rooms SET state=?,version=version+1,activity_at=? WHERE code=? AND version=?').bind(JSON.stringify(room.g),activity,code,room.version).run();
 if(!result.meta.changes)throw new RoomError('Комната обновилась. Повторите действие.',409);
 room.version++;room.activityAt=activity;
}
export function lobbyInfo(code:string,room:RoomRecord){return {code,host:host(room.g)?.name??'',playerCount:room.g.players.length,openingRule:room.g.openingRule??'classic',turnSeconds:room.g.turnSeconds??0,randomMode:room.g.randomMode??'classic',botCount:room.g.players.filter(p=>p.bot).length,replaceLeavers:room.g.replaceLeavers??false,status:room.g.status,canJoin:room.g.status==='lobby'&&room.g.players.length<4,isPublic:room.isPublic,expiresAt:room.activityAt+IDLE_MS};}
