import type { Snack } from '../shared/rules';
import { snackName } from '../shared/rules';

export function SnackArt({snack,small=false}:{snack:Snack;small?:boolean}){
  const [shape,flavour,topping,pieces]=snack;
  const fills=['#df765a','#eac65a','#8f91c7'];
  return <svg viewBox="0 0 160 106" className={small?'snack small':'snack'} role="img" aria-label={snackName(snack)}>
    <ellipse cx="80" cy="86" rx="65" ry="13" fill="#e8decb" stroke="#292d25" strokeWidth="2"/>
    {Array.from({length:pieces+1},(_,i)=>{const x=pieces===0?80:pieces===1?54+i*52:34+i*46;return <g key={i} transform={`translate(${x} ${pieces===0?52:58})`} stroke="#292d25" strokeWidth="2.4" strokeLinejoin="round">
      {shape===0?<circle r="25" fill={fills[flavour]}/>:shape===1?<rect x="-24" y="-24" width="48" height="48" rx="5" fill={fills[flavour]}/>:<path d="M0-29 27 22H-27Z" fill={fills[flavour]}/>}
      {flavour===0?<g stroke="#9d3e2c"><path d="m-12-7 6 2m12-5 6 2m-5 15 6 2m-22 3 6 2"/></g>:flavour===1?<g fill="#c39932" stroke="none"><circle cx="-9" cy="-9" r="4"/><circle cx="10" cy="4" r="5"/></g>:<g fill="#535d98" stroke="none"><circle cx="-9" cy="-7" r="3"/><circle cx="9" cy="8" r="3"/><circle cx="8" cy="-11" r="3"/></g>}
      {topping===1&&<g strokeWidth="3" strokeLinecap="round"><path d="m-13 2 5 3m13-12 4 4m-7 13 4 3" stroke="#fff4dc"/><path d="m-2-12 2 5m10 3-2 6" stroke="#aa4650"/></g>}
      {topping===2&&<g><path d="M1-15q-2-13 9-15" fill="none" stroke="#3c6149"/><circle cy="-14" r="8" fill="#b63c48"/></g>}
    </g>;})}
  </svg>;
}
export function Creature({mood}:{mood:'idle'|'eat'|'spit'|'solved'|'lost'|'thinking'}){
 const happy=mood==='eat'||mood==='solved',sad=mood==='spit'||mood==='lost';
 return <svg viewBox="0 0 360 250" className={`creature ${mood}`} role="img" aria-label={`Picky is ${mood}`}>
   <ellipse cx="180" cy="228" rx="105" ry="9" fill="#ded6bd"/>
   <g stroke="#292d25" strokeWidth="3.5" strokeLinejoin="round">
     <path d="m113 196-10 30q17 10 34-1l7-24m77-4 11 29q19 9 32-3l-13-29" fill="#81966e"/>
     <path d="M93 111Q53 128 59 158q6 18 28 6m186-55q41 17 30 47-7 18-24 8" fill="#9cb18a"/>
     <path d="M91 93Q63 41 91 31q16 1 39 29Q176 43 214 56q23-37 43-29 21 14 0 62 27 45 21 81-7 44-96 46-98-1-105-41-10-38 14-82Z" fill="#a7ba94"/>
     <path d="M123 190q-17-42 19-61 43-19 73 9 24 24 5 55" fill="#c5d0a9" stroke="none"/>
     <path d="m95 48 15 28m137-34-15 28" stroke="#748b62" strokeLinecap="round"/>
     <g fill="#292d25">{happy?<><path d="M116 107q12-15 24 0m78 0q12-15 24 0" fill="none" strokeLinecap="round"/></>:<><ellipse cx="128" cy="107" rx="6" ry="9"/><ellipse cx="231" cy="107" rx="6" ry="9"/></>}</g>
     <g fill="#d98a77" stroke="none"><ellipse cx="110" cy="128" rx="13" ry="6"/><ellipse cx="247" cy="128" rx="13" ry="6"/></g>
     {sad?<path d="M163 150q17-16 35 0" fill="none" strokeLinecap="round"/>:happy?<path d="M158 137q20 36 42 0Z" fill="#454136"/>:<path d="M170 141q10 8 20 0" fill="none" strokeLinecap="round"/>}
     {mood==='solved'&&<g fill="#e6ba55"><path d="m42 65 6-12 5 12 12 5-12 5-5 12-6-12-12-5Z"/><path d="m307 32 4-9 4 9 9 4-9 4-4 9-4-9-9-4Z"/></g>}
   </g>
 </svg>;
}
