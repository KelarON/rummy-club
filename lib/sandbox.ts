import {meld} from './tiles';
export type DraftSource={code:string,me:string,round:number,board:number[][],rack:number[]};
export type Draft={schema:1,code:string,me:string,round:number,baseBoard:number[][],baseRack:number[],board:number[][],rack:number[],savedAt:number};
const rows=(board:number[][])=>board.map(r=>[...r]);
export const draftKey=(s:Pick<DraftSource,'code'|'me'|'round'>)=>`rummy-draft:${s.code}:${s.me}:${s.round}`;
export function createDraft(s:DraftSource):Draft{
 return {schema:1,code:s.code,me:s.me,round:s.round,baseBoard:rows(s.board),baseRack:[...s.rack],board:rows(s.board),rack:[...s.rack],savedAt:Date.now()};
}
const validIds=(x:unknown):x is number[]=>Array.isArray(x)&&x.length<=106&&x.every(id=>Number.isInteger(id)&&id>=0&&id<106);
const validRows=(x:unknown):x is number[][]=>Array.isArray(x)&&x.length<=106&&x.every(r=>validIds(r)&&r.length>0&&r.length<=13);
export function restoreDraft(raw:string|null,source:DraftSource):Draft|null{
 if(!raw||raw.length>16000)return null;
 try{
  const d=JSON.parse(raw) as Draft;
  if(d.schema!==1||d.code!==source.code||d.me!==source.me||d.round!==source.round||!Number.isFinite(d.savedAt))return null;
  if(!validRows(d.baseBoard)||!validRows(d.board)||!validIds(d.baseRack)||!validIds(d.rack))return null;
  const base=[...d.baseBoard.flat(),...d.baseRack],current=[...d.board.flat(),...d.rack];
  if(new Set(base).size!==base.length||new Set(current).size!==current.length||base.length!==current.length||current.some(id=>!base.includes(id)))return null;
  if(d.rack.some(id=>!d.baseRack.includes(id)))return null;
  // Restore only the saved snapshot; the live source never replaces its arrays.
  return {...d,baseBoard:rows(d.baseBoard),baseRack:[...d.baseRack],board:rows(d.board),rack:[...d.rack]};
 }catch{return null;}
}
export function moveDraft(d:Draft,selected:number[],target:number|'rack'|'new'):Draft{
 if(!selected.length)return d;
 const all=[...d.board.flat(),...d.rack];
 if(new Set(selected).size!==selected.length||selected.some(id=>!all.includes(id)))throw Error('Некорректные фишки черновика.');
 if(target==='rack'&&selected.some(id=>!d.baseRack.includes(id)))throw Error('Фишки копии общего стола нельзя забрать в руку.');
 if(typeof target==='number'&&(!Number.isInteger(target)||target<0||target>=d.board.length))throw Error('Комбинация не найдена.');
 let board=d.board.map(r=>r.filter(id=>!selected.includes(id))),rack=d.rack.filter(id=>!selected.includes(id));
 if(target==='rack')rack.push(...selected);else if(target==='new')board.push([...selected]);else board[target].push(...selected);
 if(board.some(r=>r.length>13))throw Error('В комбинации не может быть больше 13 фишек.');
 board=board.filter(r=>r.length).map(r=>meld(r)?.order??r);
 return {...d,board,rack,savedAt:Date.now()};
}
