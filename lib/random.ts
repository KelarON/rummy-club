import {tile,meld} from './tiles';
import {candidates,handQuality} from './solver';
export type RandomMode='classic'|'balanced'|'easy';
export const RANDOM_MODES=['classic','balanced','easy'] as const;

export function randomIndex(length:number){
 const ceiling=Math.floor(4294967296/length)*length;let value:number;
 do{value=crypto.getRandomValues(new Uint32Array(1))[0];}while(value>=ceiling);
 return value%length;
}
export function shuffle<T>(items:T[]){for(let i=items.length-1;i>0;i--){const j=randomIndex(i+1);[items[i],items[j]]=[items[j],items[i]];}return items;}
const face=(id:number)=>{const t=tile(id);return `${t.c}:${t.n}`;};

function drawWeight(id:number,rack:number[],board:number[][]){
 const t=tile(id);if(!t.n)return 18;
 if(rack.some(r=>face(r)===face(id)))return .15;
 const peers=rack.map(tile),same=peers.filter(r=>r.n===t.n&&r.c!==t.c),near=peers.filter(r=>r.c===t.c&&Math.abs(r.n-t.n)<=2);
 const colors=new Set(same.map(r=>r.c));
 const run=near.some(a=>near.some(b=>a.n!==b.n&&Math.max(a.n,b.n,t.n)-Math.min(a.n,b.n,t.n)===2));
 const extend=board.some(row=>row.length<13&&meld([...row,id]));
 if(colors.size>=2||run||extend)return 36;
 if(same.length||near.length)return 5+colors.size*3+near.length*2;
 return 2;
}
export function takeTile(pool:number[],rack:number[],board:number[][],mode:RandomMode):number{
 if(!pool.length)throw Error('Банк пуст.');
 if(mode==='classic')return pool.pop()!;
 let weights=pool.map(id=>drawWeight(id,rack,board));
 if(mode==='easy'){
  const best=Math.max(...weights);weights=weights.map(w=>w===best?1:.015);
 }
 const total=weights.reduce((s,w)=>s+w,0),roll=randomIndex(1000000)/1000000*total;
 let sum=0,index=pool.length-1;for(let i=0;i<pool.length;i++){sum+=weights[i];if(roll<sum){index=i;break;}}
 return pool.splice(index,1)[0];
}

export function deal(count:number,mode:RandomMode){
 if(count<1||count>4)throw Error('Нужно от 1 до 4 игроков.');
 const fresh=()=>shuffle(Array.from({length:106},(_,i)=>i));
 if(mode==='easy'){
  const pool=fresh(),hands:number[][]=[];
  // Guarantee one legitimate 30+ opening from each rack, without minting tiles.
  for(let i=0;i<count;i++){
   const openings=candidates(pool).filter(c=>c.ids.length===3&&c.points>=30&&c.ids.every(id=>id<104));
   const opening=openings[randomIndex(openings.length)].ids;hands.push([...opening]);
   for(const id of opening)pool.splice(pool.indexOf(id),1);
  }
  while(hands.some(h=>h.length<14))for(const hand of hands)if(hand.length<14)hand.push(takeTile(pool,hand,[],'balanced'));
  return {hands,pool:shuffle(pool)};
 }
 if(mode==='classic'){const pool=fresh(),hands=Array.from({length:count},()=>pool.splice(0,14));return {hands,pool};}
 let bestPool=fresh(),bestScore=-Infinity;
 // Classic is one uniform shuffle. Balanced selects among complete shuffled sets.
 for(let attempt=0;attempt<24;attempt++){
  const deck=attempt===0?bestPool:fresh();
  const scores=Array.from({length:count},(_,i)=>handQuality(deck.slice(i*14,(i+1)*14)));
  const score=Math.min(...scores)*3+scores.reduce((s,n)=>s+n,0)/count;
  if(score>bestScore){bestScore=score;bestPool=deck;}
 }
 const hands=Array.from({length:count},(_,i)=>bestPool.slice(i*14,(i+1)*14));
 return {hands,pool:bestPool.slice(count*14)};
}
