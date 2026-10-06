'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../ui/dialog';
import {Plus,RotateCcw,LockKeyhole} from 'lucide-react';
import {createDraft,restoreDraft,moveDraft,draftKey,type DraftSource} from '../../lib/sandbox';
import {tile,meld} from '../../lib/tiles';
import {sortRack,type SortMode} from '../../lib/game';

type Props={source:DraftSource,sort:SortMode,yourTurn:boolean,onClose:()=>void};
type DragTile={id:number,x:number,y:number};
type DragState={
 ids:number[];
 primaryId:number|null;
 pointerId:number;
 moved:boolean;
 target:string;
 startX:number;
 startY:number;
 currentX:number;
 currentY:number;
 offsets:DragTile[];
};
const colors=['Красная','Синяя','Жёлтая','Чёрная','Джокер'],symbols=['◆','●','▲','■','✦'];
const emptyDrag=():DragState=>({ids:[],primaryId:null,pointerId:-1,moved:false,target:'',startX:0,startY:0,currentX:0,currentY:0,offsets:[]});

export function Sandbox({source,sort,yourTurn,onClose}:Props){
 const [draft,setDraft]=useState(()=>{try{return restoreDraft(localStorage.getItem(draftKey(source)),source)??createDraft(source);}catch{return createDraft(source);}});
 const [selected,setSelected]=useState<number[]>([]),[error,setError]=useState(''),[storageError,setStorageError]=useState(false);
 const [dragging,setDragging]=useState<number[]>([]),
      [dragPos,setDragPos]=useState({x:0,y:0}),
      [dragTarget,setDragTarget]=useState(''),
      [dragOffsets,setDragOffsets]=useState<DragTile[]>([]);
 const dragRef=useRef<DragState>(emptyDrag());
 const suppressClick=useRef(false);
 useEffect(()=>{try{localStorage.setItem(draftKey(draft),JSON.stringify(draft));setStorageError(false);}catch{setStorageError(true);}},[draft]);
 const stale=JSON.stringify(draft.baseBoard)!==JSON.stringify(source.board)||JSON.stringify(draft.baseRack)!==JSON.stringify(source.rack);
 function move(target:number|'rack'|'new'){try{setDraft(moveDraft(draft,selected,target));setSelected([]);setError('');}catch(e){setError((e as Error).message);}}
 const reset=()=>{setDraft(createDraft(source));setSelected([]);setError('');};

 const getTileElement=(id:number)=>document.querySelector<HTMLElement>(`[data-sandbox-tile-id="${id}"]`);
 const dropTarget=(x:number,y:number)=>{
  const el=document.elementFromPoint(x,y) as HTMLElement|null;
  const meldEl=el?.closest<HTMLElement>('[data-sandbox-meld-index]');
  if(meldEl)return `meld:${meldEl.dataset.sandboxMeldIndex}`;
  if(el?.closest('[data-sandbox-rack-drop]')){
   const d=dragRef.current;
   const originallyInRack=new Set(draft.baseRack);
   if(d.ids.some(id=>!originallyInRack.has(id)))return '';
   return 'rack';
  }
  if(el?.closest('[data-sandbox-table-drop]'))return 'new';
  return '';
 };
 const buildGroupedOffsets=(ids:number[],primaryId:number,e:PointerEvent<HTMLButtonElement>)=>{
  const positions=ids.map(id=>{
   const rect=getTileElement(id)?.getBoundingClientRect();
   return {id,left:rect?.left??e.clientX,top:rect?.top??e.clientY,width:rect?.width??0,center:(rect?.left??e.clientX)+(rect?.width??0)/2};
  });
  const primary=positions.find(item=>item.id===primaryId);
  if(!primary)return positions.map(item=>({id:item.id,x:item.left-e.clientX,y:item.top-e.clientY}));
  const step=(primary.width||40)+5;
  const others=positions.filter(item=>item.id!==primaryId);
  const left=others.filter(item=>item.center<primary.center).sort((a,b)=>a.center-b.center);
  const right=others.filter(item=>item.center>=primary.center).sort((a,b)=>a.center-b.center);
  return [
   {id:primaryId,x:primary.left-e.clientX,y:primary.top-e.clientY},
   ...left.map((item,index)=>({id:item.id,x:primary.left-e.clientX-step*(left.length-index),y:primary.top-e.clientY})),
   ...right.map((item,index)=>({id:item.id,x:primary.left-e.clientX+step*(index+1),y:primary.top-e.clientY}))
  ];
 };
 const beginDrag=(id:number,e:PointerEvent<HTMLButtonElement>)=>{
  if(e.button!==0)return;
  if(selected.length>0&&!selected.includes(id))return;
  const ids=selected.length?[...selected]:[id];
  const grouped=buildGroupedOffsets(ids,id,e);
dragRef.current={ids,primaryId:id,pointerId:e.pointerId,moved:false,target:'',startX:e.clientX,startY:e.clientY,currentX:e.clientX,currentY:e.clientY,offsets:grouped};
setDragOffsets(grouped);
setDragPos({x:e.clientX,y:e.clientY});
  e.currentTarget.setPointerCapture(e.pointerId);
 };
 const updateDrag=(e:PointerEvent<HTMLButtonElement>)=>{
  const d=dragRef.current;
  if(d.pointerId!==e.pointerId)return;
  d.currentX=e.clientX;d.currentY=e.clientY;
  if(!d.moved&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>5){
   d.moved=true;
   suppressClick.current=true;
   setDragging([...d.ids]);
  }
  if(d.moved){
   setDragPos({x:e.clientX,y:e.clientY});
   const target=dropTarget(e.clientX,e.clientY);
   if(target!==d.target){d.target=target;setDragTarget(target);}
  }
 };
 const finishDrag=(cancel=false)=>{
  const d=dragRef.current;
  if(!d.ids.length)return;
  if(d.moved)suppressClick.current=true;
  if(!cancel&&d.moved&&d.target){
   const target=d.target==='rack'?'rack':d.target==='new'?'new':Number(d.target.slice(5));
   try{
    setDraft(current=>moveDraft(current,d.ids,target));
    setSelected([]);
    setError('');
   }catch(e){setError((e as Error).message);}
  }
dragRef.current=emptyDrag();
setDragging([]);
setDragTarget('');
setDragOffsets([]);
 };
 const endDrag=(e:PointerEvent<HTMLButtonElement>)=>{
  const d=dragRef.current;
  if(d.pointerId!==e.pointerId)return;
  try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}
  finishDrag(false);
 };

 const render=(id:number)=>{
  const t=tile(id);
  const isDragging=dragging.includes(id);
  return <button
   key={id}
   data-sandbox-tile-id={id}
   type="button"
   className={`tile color-${t.c} ${selected.includes(id)?'selected':''} ${isDragging?'dragging':''}`}
   aria-label={t.n?`${colors[t.c]} ${t.n}`:'Джокер'}
   aria-pressed={selected.includes(id)}
   onClick={()=>{
    if(suppressClick.current)return;
    setSelected(s=>s.includes(id)?s.filter(t=>t!==id):[...s,id]);
  }}
   onPointerDown={e=>{
    suppressClick.current=false;
    beginDrag(id,e);
  }}
   onPointerMove={updateDrag}
   onPointerUp={endDrag}
   onPointerCancel={()=>finishDrag(true)}
  ><span>{t.n||'✦'}</span><small>{symbols[t.c]}</small></button>;
 };
const dragPreview=dragging.length>0&&dragOffsets.map(({id,x,y})=>{
  const t=tile(id);

  return <button
    key={id}
    type="button"
    className={`tile drag-preview-tile selected color-${t.c}`}
    style={{left:dragPos.x+x,top:dragPos.y+y}}
    tabIndex={-1}
    aria-hidden="true"
  >
    <span>{t.n||'✦'}</span>
    <small>{symbols[t.c]}</small>
  </button>;
});

 return <Dialog open onOpenChange={value=>{if(!value)onClose();}}><DialogContent className="sandbox-dialog">
  {dragging.length>0&&typeof document!=='undefined'&&createPortal(<div className="drag-preview-layer" aria-hidden="true" style={{position:'fixed',inset:0,zIndex:10000,pointerEvents:'none'}}>{dragPreview}</div>,document.body)}
  <div className="sandbox-title"><div><DialogTitle>Черновик хода</DialogTitle><DialogDescription>Отдельная копия стола и ваших фишек. Сохраняется только в этом браузере.</DialogDescription></div><span className="draft-label"><LockKeyhole size={16}/> Рука в игре заблокирована</span></div>
  {yourTurn&&<div className="sandbox-alert">Ваш ход наступил. Закройте черновик, чтобы играть на настоящем столе.</div>}
  {stale&&<p className="sandbox-note">Настоящий стол изменился. Черновик сохранён; «Сбросить» загрузит свежую копию.</p>}
  {storageError&&<p className="sandbox-note">Браузер не разрешил сохранение. Черновик доступен до закрытия этого окна.</p>}
  {error&&<p className="chat-error" role="alert">{error}</p>}
  <section className={`sandbox-table felt ${dragTarget==='new'?'drag-over-new':''}`} aria-label="Стол черновика" data-sandbox-table-drop>
   <div className="melds">{draft.board.map((row,i)=><div className={`meld ${meld(row)?'valid':'invalid'} ${dragTarget===`meld:${i}`?'drag-over':''}`} data-sandbox-meld-index={i} key={i}><div className="meld-tiles">{row.map(render)}</div><button className="add-to-set" aria-label={`Добавить в комбинацию черновика ${i+1}`} disabled={!selected.length} onClick={()=>move(i)}><Plus size={16}/></button><span className="meld-status">{meld(row)?'✓':'!'}</span></div>)}{!draft.board.length&&<p className="sandbox-empty">Выберите фишки и создайте комбинацию.</p>}</div>
   <button className="new-set" disabled={!selected.length} onClick={()=>move('new')}><Plus size={17}/> Новая комбинация</button>
  </section>
  <section className="sandbox-rack"><h3>Фишки черновика · {draft.rack.length}</h3><div className={`rack ${dragTarget==='rack'?'drag-over':''}`} data-sandbox-rack-drop>{sortRack(draft.rack,sort).map(render)}</div><button className="secondary compact" disabled={!selected.length||selected.some(id=>!draft.baseRack.includes(id))} onClick={()=>move('rack')}>Вернуть в руку черновика</button></section>
  <div className="sandbox-footer"><span>{draft.board.every(row=>meld(row))?'Все комбинации правильные':'Есть незавершённые комбинации — можно продолжать эксперимент'}</span><div><button className="secondary" onClick={reset}><RotateCcw size={16}/> Сбросить</button><button className="primary" onClick={onClose}>Выйти из черновика</button></div></div>
 </DialogContent></Dialog>;
}
