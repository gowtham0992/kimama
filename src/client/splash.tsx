import {isPetLaunch} from '../shared/launch';
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {context,requestExpandedMode} from '@devvit/web/client';
import {Creature} from './art';
import './style.css';
function Splash(){
  const[error,setError]=useState('');
  const homesick=(context.postData as {mode?:string}|undefined)?.mode==='homesick';
  return <main className="splash"><a className="wordmark">picky<span>✳</span></a><h1>{homesick?<>Homesick today.<br/>Find its favourite snack.</>:<>A little creature.<br/>A secret craving.</>}</h1><Creature mood="idle"/><p>{homesick?<>Two matching parts earn a chomp.<br/>Only the exact favourite solves it.</>:<>Build snacks. Try a theory.<br/>Picky will tell you what it thinks.</>}</p><button className="primary" onClick={e=>{try{requestExpandedMode(e.nativeEvent,'game');}catch{setError('Could not open the table. Reopen this post and try again.');}}}>{homesick?'Find its favourite →':'Pull up a chair →'}</button>{error&&<p role="alert">{error}</p>}</main>;
}
if(isPetLaunch(context.postData))void import('./pet-splash');
else createRoot(document.getElementById('root')!).render(<Splash/>);
