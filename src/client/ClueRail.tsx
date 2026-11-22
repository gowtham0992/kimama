import { useEffect, useRef } from 'react';
import { snackName, VALUES, type Observation, type Snack } from '../shared/rules';
import { SnackArt } from './art';

export function ClueRail({observations,onSelect,selected}:{observations:Observation[];onSelect:(snack:Snack)=>void;selected:Snack}){
  const ateRef=useRef<HTMLDivElement>(null),spatRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const last=observations.at(-1);const rail=last?.ate?ateRef.current:spatRef.current;
    if(rail)rail.scrollLeft=rail.scrollWidth;
  },[observations.length]);
  return <section className="clue-rail" aria-label="All tasted snacks">
    <div className="clue-rail-heading"><b>THE EVIDENCE</b><span>Tap to load · slide for more</span></div>
    {[true,false].map(ate=><div className={`clue-row ${ate?'accepted':'rejected'}`} key={String(ate)}>
      <span className="clue-row-label">{ate?'● ATE':'○ SPAT'}<small>{observations.filter(o=>o.ate===ate).length}</small></span>
      <div className="clue-scroll" ref={ate?ateRef:spatRef} role="group" aria-label={ate?'Snacks Picky ate':'Snacks Picky spat out'} tabIndex={0}>
        {observations.map((o,i)=>o.ate===ate&&<button key={i} type="button" className={`clue-tile ${o.snack.every((v,p)=>v===selected[p])?'loaded':''}`} onClick={()=>onSelect(o.snack)} aria-label={`Clue ${i+1}: ${snackName(o.snack)}. ${ate?'Ate':'Spat'}. Tap to load.`} title={snackName(o.snack)}>
          <SnackArt snack={o.snack} small/>
          <span>{VALUES[0][o.snack[0]]} · {VALUES[1][o.snack[1]]}</span>
          <span>{VALUES[2][o.snack[2]]} · {VALUES[3][o.snack[3]]}</span>
        </button>)}
      </div>
    </div>)}
  </section>;
}
