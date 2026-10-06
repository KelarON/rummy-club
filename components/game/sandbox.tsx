'use client';
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../ui/dialog';
import {Plus,RotateCcw,LockKeyhole} from 'lucide-react';
import {createDraft,restoreDraft,moveDraft,draftKey,type DraftSource} from '../../lib/sandbox';
import {tile,meld} from '../../lib/tiles';
import {sortRack,type SortMode} from '../../lib/game';

type Props={source:DraftSource,sort:SortMode,yourTurn:boolean,onClose:()=>void};
const colors=['Красная','Синяя','Жёлтая','Чёрная','Джокер'],symbols=['◆','●','▲','■','✦'];
export function Sandbox({source,sort,yourTurn,onClose}:Props){
 const [draft,setDraft]=useState(()=>{try{return restoreDraft(localStorage.getItem(draftKey(source)),source)??createDraft(source);}catch{return createDraft(source);}});
 const [selected,setSelected]=useState<number[]>([]),[error,setError]=useState(''),[storageError,setStorageError]=useState(false);
 useEffect(()=>{try{localStorage.setItem(draftKey(draft),JSON.stringify(draft));setStorageError(false);}catch{setStorageError(true);}},[draft]);
 const stale=JSON.stringify(draft.baseBoard)!==JSON.stringify(source.board)||JSON.stringify(draft.baseRack)!==JSON.stringify(source.rack);
 function move(target:number|'rack'|'new'){try{setDraft(moveDraft(draft,selected,target));setSelected([]);setError('');}catch(e){setError((e as Error).message);}}
 const reset=()=>{setDraft(createDraft(source));setSelected([]);setError('');};
 const render=(id:number)=>{const t=tile(id);return <button key={id} type="button" className={`tile color-${t.c} ${selected.includes(id)?'selected':''}`} aria-label={t.n?`${colors[t.c]} ${t.n}`:'Джокер'} aria-pressed={selected.includes(id)} onClick={()=>setSelected(s=>s.includes(id)?s.filter(t=>t!==id):[...s,id])}><span>{t.n||'✦'}</span><small>{symbols[t.c]}</small></button>;};
 return <Dialog open onOpenChange={value=>{if(!value)onClose();}}><DialogContent className="sandbox-dialog"><div className="sandbox-title"><div><DialogTitle>Черновик хода</DialogTitle><DialogDescription>Отдельная копия стола и ваших фишек. Сохраняется только в этом браузере.</DialogDescription></div><span className="draft-label"><LockKeyhole size={16}/> Рука в игре заблокирована</span></div>
  {yourTurn&&<div className="sandbox-alert">Ваш ход наступил. Закройте черновик, чтобы играть на настоящем столе.</div>}
  {stale&&<p className="sandbox-note">Настоящий стол изменился. Черновик сохранён; «Сбросить» загрузит свежую копию.</p>}
  {storageError&&<p className="sandbox-note">Браузер не разрешил сохранение. Черновик доступен до закрытия этого окна.</p>}
  {error&&<p className="chat-error" role="alert">{error}</p>}
  <section className="sandbox-table felt" aria-label="Стол черновика"><div className="melds">{draft.board.map((row,i)=><div className={`meld ${meld(row)?'valid':'invalid'}`} key={i}><div className="meld-tiles">{row.map(render)}</div><button className="add-to-set" aria-label={`Добавить в комбинацию черновика ${i+1}`} disabled={!selected.length} onClick={()=>move(i)}><Plus size={16}/></button><span className="meld-status">{meld(row)?'✓':'!'}</span></div>)}{!draft.board.length&&<p className="sandbox-empty">Выберите фишки и создайте комбинацию.</p>}</div><button className="new-set" disabled={!selected.length} onClick={()=>move('new')}><Plus size={17}/> Новая комбинация</button></section>
  <section className="sandbox-rack"><h3>Фишки черновика · {draft.rack.length}</h3><div className="rack">{sortRack(draft.rack,sort).map(render)}</div><button className="secondary compact" disabled={!selected.length||selected.some(id=>!draft.baseRack.includes(id))} onClick={()=>move('rack')}>Вернуть в руку черновика</button></section>
  <div className="sandbox-footer"><span>{draft.board.every(row=>meld(row))?'Все комбинации правильные':'Есть незавершённые комбинации — можно продолжать эксперимент'}</span><div><button className="secondary" onClick={reset}><RotateCcw size={16}/> Сбросить</button><button className="primary" onClick={onClose}>Выйти из черновика</button></div></div>
 </DialogContent></Dialog>;
}
