import {tile,meld} from './tiles';

export type Candidate={ids:number[],points:number,mask:bigint};
const mask=(ids:number[])=>ids.reduce((m,id)=>m|(BigInt(1)<<BigInt(id)),BigInt(0));

// Enumerate groups and runs by printed face. Copies have distinct physical IDs.
// Limit equivalent copy/joker permutations so a large rack stays inexpensive.
export function candidates(ids:number[]):Candidate[]{
 const faces=Array.from({length:4},()=>Array.from({length:14},()=>[] as number[]));
 const jokers=ids.filter(id=>id>=104),result:Candidate[]=[],seen=new Set<string>();
 for(const id of ids){const t=tile(id);if(t.n)faces[t.c][t.n].push(id);}
 const add=(options:number[][],missing:number)=>{
  if(missing>jokers.length||options.length+missing<3)return;
  const variations:number[][]=[];
  // Include both all-first and all-second copies, plus mixed copy assignments.
  for(let variant=0;variant<Math.min(8,2**options.filter(a=>a.length>1).length);variant++){
   let bit=0;const row=options.map(a=>a.length===1?a[0]:a[(variant>>bit++)&1]);
   variations.push(row);
  }
  if(options.some(a=>a.length>1))variations.push(options.map(a=>a.at(-1)!));
  for(const base of variations){
   const jokerSets=missing===0?[[]]:missing===1?jokers.map(j=>[j]):[jokers.slice(0,missing)];
   for(const js of jokerSets){const row=[...base,...js],key=[...row].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;
    const valid=meld(row);if(valid){seen.add(key);result.push({ids:valid.order,points:valid.points,mask:mask(row)});}
   }
  }
 };
 for(let n=1;n<=13;n++)for(let colors=1;colors<16;colors++){
  const cs=[0,1,2,3].filter(c=>colors&(1<<c));if(cs.length<3)continue;
  const present=cs.filter(c=>faces[c][n].length),missing=cs.length-present.length;
  if(present.length)add(present.map(c=>faces[c][n]),missing);
 }
 for(let c=0;c<4;c++)for(let start=1;start<=11;start++)for(let end=start+2;end<=13;end++){
  const ns=Array.from({length:end-start+1},(_,i)=>start+i),present=ns.filter(n=>faces[c][n].length),missing=ns.length-present.length;
  if(missing>jokers.length)continue;
  add(present.map(n=>faces[c][n]),missing);
 }
 return result;
}

// A bounded beam search picks disjoint melds; it never sees an opponent's rack.
export function chooseMelds(ids:number[],minimumPoints=0):number[][]{
 const options=candidates(ids).sort((a,b)=>b.ids.length-a.ids.length||b.points-a.points);
 type State={used:bigint,rows:number[][],count:number,points:number};
 let beam:State[]=[{used:BigInt(0),rows:[],count:0,points:0}],best=beam[0];
 for(let depth=0;depth<8;depth++){
  const next:State[]=[],seen=new Set<bigint>();
  for(const state of beam){
   let branches=0;
   for(const option of options){
    if(state.used&option.mask)continue;
    const used=state.used|option.mask;if(seen.has(used))continue;seen.add(used);
    const node={used,rows:[...state.rows,option.ids],count:state.count+option.ids.length,points:state.points+option.points};
    if(node.points>=minimumPoints&&(node.count>best.count||node.count===best.count&&node.points>best.points))best=node;
    next.push(node);if(++branches>=16)break;
   }
  }
  if(!next.length)break;
  beam=next.sort((a,b)=>(b.points>=minimumPoints?1000:0)+b.count*20+b.points/20-((a.points>=minimumPoints?1000:0)+a.count*20+a.points/20)).slice(0,24);
 }
 return best.points>=minimumPoints?best.rows.map(r=>[...r]):[];
}

export function handQuality(ids:number[]){
 const faces=new Set(ids.map(id=>id>=104?String(id):`${tile(id).c}:${tile(id).n}`));
 const options=candidates(ids),max=Math.max(0,...options.map(c=>c.points));
 const coverage=new Set(options.flatMap(c=>c.ids)).size;
 const high=options.filter(c=>c.points>=30).length;
 return coverage*3+Math.min(high,3)*8+Math.min(max,40)/4-(ids.length-faces.size)*12;
}
