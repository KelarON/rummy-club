import {db} from '../../../db/raw';
import {IDLE_MS} from '../../../lib/game';
import {loadRoom,lobbyInfo,RoomError} from '../../../lib/rooms';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(){try{
 const {results}=await db().prepare(`SELECT code FROM rooms WHERE is_public=1
  AND COALESCE(NULLIF(activity_at,0),created)>?
  AND json_extract(state,'$.status')='lobby'
  ORDER BY created DESC,code ASC LIMIT 100`).bind(Date.now()-IDLE_MS).all<{code:string}>();
 const lobbies=[];
 for(const {code} of results){try{const room=await loadRoom(code);const info=lobbyInfo(code,room);if(info.canJoin)lobbies.push(info);}catch(e){if(!(e instanceof RoomError)||![404,409,410].includes(e.status))throw e;}if(lobbies.length>=50)break;}
 return Response.json({lobbies},{headers});
 }catch(e){console.error('lobbies:',e);return Response.json({error:'Не удалось загрузить комнаты. Попробуйте обновить список.'},{status:503,headers});}}
