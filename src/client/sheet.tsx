// Developer contact sheet (local only, not a post entry): every act, reaction, growth stage and
// playdate motion looping side by side, so the animation can be judged without waiting hours.
import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {PetView} from '../shared/pet';
import type {PetScene} from '../shared/scenes';
import {ACT_MS,type ActKind} from '../shared/autonomy';
import {Creature,Lcd,Txt,type Shape} from './px';
import {Play,Room,Thing} from './stage';
import {OBJECTS} from '../shared/scenes';
import {VIEWS} from '../shared/views';
import {View} from './views';
import './pet.css';
const q=new URLSearchParams(location.search),only=q.get('only'),at=q.get('t');
function pet(o:Partial<PetView>):PetView{return{temperament:'bold',stage:'baby',sleeping:false,mood:'content',bornAt:1,droppings:0,...o} as PetView;}
function Cell({label,children,night}:{label:string;children:React.ReactNode;night?:boolean}){return <figure style={{margin:0,width:Number(q.get('w')||200)}}><Lcd label={label} night={night}>{children}</Lcd><figcaption style={{font:'12px ui-monospace,monospace',padding:'2px 0 10px'}}>{label}</figcaption></figure>;}
function Sheet(){
 const[,tick]=useState(0);useEffect(()=>{const id=setInterval(()=>tick(v=>v+1),125);return()=>clearInterval(id);},[]);
 const now=Date.now(),cells:React.ReactNode[]=[];
 const styles=[['eager','bold'],['gentle','gentle'],['cautious','shy']] as const;
 for(const kind of Object.keys(ACT_MS) as ActKind[])for(const[style,shape]of styles){
  const D=ACT_MS[kind],e=at?Number(at):now%(D+1500);
  cells.push(<Cell key={kind+style} label={`act:${kind} ${style} ${(e/1000).toFixed(1)}s`}><Room now={now} fx={null} pet={pet({temperament:shape,keepsake:'little bell',mood:kind==='bowl'?'hungry':'content',activity:{id:'x',kind,startedAt:now-e,duration:D,style}})}/></Cell>);
 }
 for(const kind of['proud','cuddle','turn','call','eat','refuse','play','bath','hatch','welcome','sulk','purr','show']){const e=at?Number(at):now%(kind==='show'?7200:5600);cells.push(<Cell key={kind} label={`fx:${kind} ${(e/1000).toFixed(1)}s`}><Room now={now} fx={{kind,elapsed:e}} pet={pet({temperament:kind==='refuse'?'shy':'bold',keepsake:kind==='show'?'little bell':undefined,droppings:kind==='bath'?0:kind==='sulk'?2:0})}/></Cell>);}
 for(const[style,shape]of styles)for(const e of[2000,3600,8000,17200])cells.push(<Cell key={'manners'+style+e} label={`manners:${style} ${e/1000}s`}><Room now={now} fx={null} guest={{id:'x',name:'Sumi',temperament:'gentle',stage:'child',from:now-e,until:now-e+40000}} pet={pet({temperament:shape,style})}/></Cell>);
 for(const[e,w]of[[600,0],[6000,0],[9000,1],[39400,0]] as const)cells.push(<Cell key={'guest'+e} label={`guest at window ${e/1000}s${w?' waved':''}`}><Room now={now} fx={null} wavedAt={w?Date.now()-((now%2000)):0} guest={{id:'x',name:'Sumi',temperament:e>8000?'bold':'shy',stage:e>8000?'grown':'child',from:now-e,until:now-e+40000}} pet={pet({temperament:'gentle'})}/></Cell>);
 cells.push(<Cell key="guest-daifuku" label="guest: Daifuku"><Room now={now} fx={null} guest={{id:'stray-daifuku',name:'Daifuku',temperament:'gentle',stage:'grown',stray:true,from:now-9000,until:now+31000}} pet={pet({temperament:'shy',style:'cautious'})}/></Cell>);
 for(const shape of['bold','gentle','shy'] as Shape[])cells.push(<Cell key={'marks-'+shape} label={`marks: ${shape} (grown 1-4; grown 5, baby 2, 3, 5)`}>{[1,2,3,4,5,2,3,5].map((m,i)=><g key={i}><Creature x={18+(i%4)*31} y={46+Math.floor(i/4)*52} s={1} look={{shape,stage:i>4?'baby':'grown',mark:m,eyes:i===6?'wide':'open',gx:i===2?-2:0,mouth:i===7?'open':'flat'}}/><Txt s={String(m)} x={18+(i%4)*31} y={50+Math.floor(i/4)*52} align="center"/></g>)}</Cell>);
 cells.push(<Cell key="idle" label="idle (five-second thoughts)"><Room now={now} fx={null} pet={pet({temperament:'gentle',droppings:1})}/></Cell>);
 cells.push(<Cell key="sleep" label="asleep" night><Room now={now} fx={null} pet={pet({sleeping:true,temperament:'shy'})}/></Cell>);
 for(const shape of['bold','gentle','shy'] as Shape[])cells.push(<Cell key={'grow'+shape} label={`${shape}: baby, child, grown`}>{(['baby','child','grown'] as const).map((stage,i)=><g key={stage}><Creature x={22+i*42} y={96} s={1.5} look={{shape,stage,eyes:'open'}}/><Txt s={stage} x={22+i*42} y={104} align="center"/></g>)}{(['baby','child','grown'] as const).map((stage,i)=><Creature key={stage} x={22+i*42} y={50} s={1.5} look={{shape,stage,back:true,glance:true}}/>)}</Cell>);
 const actors=(a:Shape,b:Shape)=>[{name:'Pip',stage:'baby' as const,temperament:a,signature:null,bold:a==='shy'?-4:4},{name:'Sumi',stage:'child' as const,temperament:b,signature:null,bold:b==='shy'?-4:4}];
 const beat=(motion:string,otherPose='greet')=>({text:'',pose:'greet',otherPose,motion,duration:6000});
 const pairs:[string,string,Shape,Shape,string][]=[['share','spool','bold','gentle','New friends'],['shelter','umbrella','bold','shy','Growing trust'],['race','leaf','bold','bold','Competitive spark'],['hide','pebble','gentle','bold','Competitive spark'],['notice','pebble','gentle','shy','Comfortable company']];
 for(const[motion,object,a,b,standing]of pairs)for(const phase of[0,1,2]){const t=at?Number(at):now%7000,scene={id:'s',kind:'playdate',at:0,title:'',object,actors:actors(a,b),you:0,standing,beats:[beat('arrive',b==='shy'?'watch':'greet'),beat(motion),beat('rest')]} as unknown as PetScene;
  cells.push(<Cell key={motion+phase} label={`pair:${motion} beat ${phase+1}`}><Play scene={scene} beat={phase} t={t}/></Cell>);}
 for(const choice of['try','gentle','watch'] as const)for(const shy of[false,true])for(const phase of[0,1,2]){const t=at?Number(at):now%7000,mid=choice==='try'?'play':choice==='gentle'?'keep':'notice',scene={id:'d',kind:'daily',at:0,title:'',object:choice==='gentle'?'bell':choice==='try'?'boat':'windmill',choice:phase===0?undefined:choice,actors:[{name:'Pip',stage:'baby',temperament:shy?'shy':'bold',signature:null,bold:shy?-4:4}],beats:[beat('arrive'),beat(phase===0?'notice':mid),beat('rest')]} as unknown as PetScene;
  cells.push(<Cell key={choice+shy+phase} label={`daily:${choice}${shy?' shy':''} ${phase===0?'notices':phase===1?'acts':'after'}`}><Play scene={scene} beat={phase===0?1:phase} t={t}/></Cell>);}
 for(const v of VIEWS)cells.push(<Cell key={'view-'+v.id} label={'view: '+v.name}><View id={v.id} x={10} y={30}/><Txt s={v.name} x={64} y={92} align="center"/></Cell>);
 const ids=Object.keys(OBJECTS);
 for(let i=0;i<ids.length;i+=6)cells.push(<Cell key={'objects'+i} label={'objects: '+ids.slice(i,i+6).join(', ')}>{ids.slice(i,i+6).map((id,j)=><g key={id}><Thing id={id} x={24+(j%3)*40} y={48+Math.floor(j/3)*56}/><Txt s={id.slice(0,6)} x={24+(j%3)*40} y={52+Math.floor(j/3)*56} align="center"/></g>)}</Cell>);
 return <main style={{display:'flex',flexWrap:'wrap',gap:10,padding:10,background:'#efe9dc'}}>{cells.filter((c:any)=>!only||String(c.key).includes(only))}</main>;
}
createRoot(document.getElementById('root')!).render(<Sheet/>);
