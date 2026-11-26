import {gardenView,recordGardenChoice,setGardenMembership,gardenTarget,directoryKey} from './garden';
import {randomUUID} from 'node:crypto';
import {Hono} from 'hono';
import {bodyLimit} from 'hono/body-limit';
import {serve} from '@hono/node-server';
import {context,createServer,getServerPort,redis,reddit,notifications,media} from '@devvit/web/server';
import {createGame,view} from './game';
import {restoreGame,transition,StateConflict} from './redis-state';
import {resolveSelection} from './selection';
import {newPet,petView,advancePet,type Pet} from '../shared/pet';
import {tellLine,dayAt,dailyObject,OBJECTS,an,An} from '../shared/scenes';
import {telemetry} from '@devvit/analytics/server/reddit';
import {pickVisitor,walkerId,type Walker} from '../shared/street';
import {reviewOf,retortsFor,knowsOf,crowdLine,starText} from '../shared/review';
import {transitionPet,savePlaydate,settlePet} from './pet-state';
import {tickAutonomy} from '../shared/autonomy';
import {findOn,picksOn,pickOn,knowRecentFinds,type FindStore} from './finds';
import {isObject} from '../shared/finds';
import {recapText,type RecapPet} from '../shared/recap';

const BADGE=false;
// Reddit's push notifications are a gated beta: an app applies, and its wording is approved. Until Kimama is in it, set this to false
// for anything judged or public: the switch and the question disappear from the game and nothing is sent.
const ALERTS=false;
// Each daily post carries its own picture for link previews and compact feeds. Off switch, in case Reddit lays the post out differently with it.
const SHARE_PICTURES=true;
const app=new Hono();
app.use('/api/*',bodyLimit({maxSize:2048,onError:c=>c.json({error:'Request too large.'},413)}));
// Where the game's own files are served from, as the last player's browser reported it. The daily post's share picture is fetched from there.
let seenOrigin='';
app.use('/api/*',async(c,next)=>{c.header('Cache-Control','no-store');
  try{const o=c.req.header('origin')??'';if(o!==seenOrigin&&/^https:\/\/[a-z0-9-]+\.devvit\.net$/.test(o)){seenOrigin=o;await redis.set('picky:origin:v1',o,{expiration:new Date(Date.now()+30*86400000)});}}catch{/* a missing picture is not worth a failed request */}
  await next();});
// Every request first learns which find yesterday and today were, so the game, the post and the recap agree on it.
const finds=redis as unknown as FindStore;
const learnFinds=async(_c:unknown,next:()=>Promise<void>)=>{try{await knowRecentFinds(finds,Date.now());}catch(e){console.error('Finds not loaded',e instanceof Error?e.name:'');}await next();};
app.use('/api/*',learnFinds);app.use('/internal/*',learnFinds);
// Today's path: the three things every pet spotted on the way home, and how the vote for tomorrow stands.
app.get('/api/pick',async c=>{try{return c.json(await picksOn(finds,dayAt(Date.now()),context.userId));}catch{console.error('Pick view failed');return c.json({error:'The path is not ready yet.'},503);}});
app.post('/api/pick',async c=>{
  const user=context.userId,now=Date.now();if(!user)return c.json({error:'Sign in to Reddit to choose.'},401);
  try{
    const input=await c.req.json().catch(()=>null) as {object?:unknown;version?:unknown}|null;
    if(!input||!isObject(input.object))return c.json({error:'Choose one of the things on the path.'},400);
    const view=await picksOn(finds,dayAt(now),user);if(!view.offer.includes(input.object))return c.json({error:'That is not on today\u2019s path.'},400);
    const pet=await transitionPet(redis,`picky:pet:v1:u:${user}`,{action:'bring',object:input.object,version:input.version},now);
    return c.json({pick:await pickOn(finds,dayAt(now),user,input.object),pet:petView(pet,now)});
  }catch(e){if(e instanceof StateConflict)return c.json({error:e.message},409);if(e instanceof Error&&/path|today|pet|find/i.test(e.message))return c.json({error:e.message},400);console.error('Pick failed');return c.json({error:'Could not choose just now. Try again.'},503);}
});
function dayIndex(day:string){return ((Math.floor(Date.parse(`${day}T00:00:00Z`)/86400000)-Math.floor(Date.parse('2026-11-13T00:00:00Z')/86400000))%6+6)%6;}
// Devvit Journeys: one journey per daily find. It starts when the pet goes outside and ends, complete,
// when the owner has guessed and the pet has acted. Telemetry must never affect play, so every call is guarded.
async function journey(key:string,input:{action?:unknown;guess?:unknown},pet:Pet,now:number){
 try{
  const slot=`picky:journey:v1:${key}:${dayAt(now)}`;
  if(input.action==='explore'){const started=await telemetry.startJourney();if(started.journeyId)await redis.set(slot,started.journeyId,{expiration:new Date(now+2*86400000)});return;}
  if(input.action!=='sceneChoose')return;
  const journeyId=await redis.get(slot),scene=pet.scenes?.[0];if(!journeyId||!scene)return;
  await telemetry.journeyProgress({journeyId,progress:.6,action:'guess_made'});
  await telemetry.endJourney({journeyId,complete:true,game:{win:!!scene.guessed,score:scene.streak??0}});
  await redis.del(slot);
 }catch{/* not allowlisted yet, or telemetry unavailable: the game carries on */}
}
// What went wrong, for the log, with anything that could identify a player taken out.
const safe=(e:unknown)=>e instanceof Error?`${e.name}: ${e.message}`.replace(/t2_[a-z0-9]+/gi,'t2_x').replace(/[a-f0-9]{8}-[a-f0-9-]{27}/gi,'id').slice(0,160):'unknown';
app.all('/api/pet',async c=>{
  if(c.req.method!=='GET'&&c.req.method!=='POST')return c.json({error:'Unsupported method.'},405);
  const guest=c.req.header('x-picky-guest');
  const identity=context.userId?`u:${context.userId}`:context.loid?`l:${context.loid}`:guest&&/^[a-f0-9-]{36}$/i.test(guest)?`g:${guest}`:null;
  if(!identity)return c.json({error:'Please reopen the pet or sign in to Reddit.'},401);
  const key=`picky:pet:v1:${identity}`,now=Date.now();
  try{
    // Signing in keeps the pet. A visitor's pet lives under a guest id; the first time the same browser arrives signed in with no pet of its own, it moves across.
    if(context.userId&&c.req.method==='GET'&&!await redis.get(key))for(const from of[context.loid?`picky:pet:v1:l:${context.loid}`:'',guest&&/^[a-f0-9-]{36}$/i.test(guest)?`picky:pet:v1:g:${guest}`:''].filter(Boolean)){
      const raw=await redis.get(from);if(raw&&(JSON.parse(raw) as Pet).hatchedAt!==null){await redis.set(key,raw,{expiration:new Date(now+30*86400000)});await redis.del(from);break;}}
    let pet:Pet;
    if(c.req.method==='POST'){
      const input=await c.req.json();
      if(input.action==='invite'){
        const raw=await redis.get(key);if(!raw)return c.json({error:'Hatch your pet first.'},400);const current=JSON.parse(raw);if(current.hatchedAt===null)return c.json({error:'Hatch your pet first.'},400);
        const code=randomUUID().replace(/-/g,'').slice(0,12);await redis.set(`picky:invite:${code}`,key,{expiration:new Date(now+86400000)});return c.json({...petView(current,now),inviteCode:code});
      }else if(input.action==='visit'){
        if(typeof input.code!=='string'||!/^([a-f0-9]{12})$/.test(input.code))return c.json({error:'Enter a valid pet invitation.'},400);
        const other=await redis.get(`picky:invite:${input.code}`);if(!other)return c.json({error:'Pet invitation expired.'},400);
        pet=await savePlaydate(redis,key,other,key,other,input.version,now);
      }else{pet=await transitionPet(redis,key,input,now);await journey(key,input,pet,now);}
    }
    else{
      // Opening the game only reads the pet and tidies it. If that tidy-up cannot be saved (the same post is often on screen twice, as a
      // highlight and in the feed, and both ask at once), the player is still owed their pet: show it as it stands, and let the next request save.
      try{pet=await settlePet(redis,key,now);}
      catch(e){console.error('Pet settle not saved',safe(e));const raw=await redis.get(key);pet=tickAutonomy(advancePet(raw?JSON.parse(raw) as Pet:newPet(now),now),now);}
    }
    return c.json(petView(pet,now));
  }catch(e){if(e instanceof Error&&e.message==='Pet moment passed.')return c.json({error:e.message,code:'moment_passed'},409);if(e instanceof StateConflict)return c.json({error:e.message},409);if(e instanceof SyntaxError)return c.json({error:'Invalid care request.'},400);if(e instanceof Error&&/pet|care|snack|meal|tummy|egg|friend|moment|rest|awake|Wake/i.test(e.message))return c.json({error:e.message},400);console.error('Pet state failed',safe(e));return c.json({error:'Could not save. Please try again.'},503);}
});
// The tally and the garden belong to the day, not to one post: every day's post opens onto the same community.
app.all('/api/garden',async c=>{
 if(!['GET','POST'].includes(c.req.method))return c.json({error:'Unsupported method.'},405);
 const opened=context.postId,post='all',owner=context.userId?`picky:pet:v1:u:${context.userId}`:null,now=Date.now();
 if(!opened)return c.json({error:'Open the garden from a Reddit post.'},400);
 try{
  const raw=owner?await redis.get(owner):undefined;const own:Pet|undefined=raw?JSON.parse(raw):undefined;
  if(c.req.method==='POST'){
   if(!owner)return c.json({error:'Sign in to Reddit to join or visit pets.'},401);
   const input=await c.req.json();if(!input||typeof input!=='object')return c.json({error:'Choose a garden action.'},400);
   if(input.action==='join'||input.action==='leave')await setGardenMembership(redis,post,owner,context.username??'Reddit neighbour',input.action==='join',now);
   else if(input.action==='visit'){
    const target=await gardenTarget(redis,post,input.id,now);
    const pet=await savePlaydate(redis,owner,target,owner,target,input.version,now,{key:directoryKey(post,now),id:input.id});
    return c.json({pet:petView(pet,now)});
   }else return c.json({error:'Choose a garden action.'},400);
  }
  if(owner&&own&&await recordGardenChoice(redis,post,owner,own,now))await redis.incrBy(GROWN,1);
  return c.json(await gardenView(redis,post,owner,now,own));
 }catch(e){if(e instanceof StateConflict)return c.json({error:e.message},409);if(e instanceof Error&&/pet|garden|Hatch|sleeping/i.test(e.message))return c.json({error:e.message},400);console.error('Garden operation failed');return c.json({error:'The garden could not load. Please try again.'},503);}
});
// The street. A read registers the caller's pet as out walking today and says who is at their window;
// a wave is counted once per pair per day. Owner keys never leave the server.
const GROWN='picky:street:grown:v1';
app.all('/api/street',async c=>{
 const post=context.postId,now=Date.now(),day=dayAt(now),empty={count:0,visitor:null,news:null};
 if(!post)return c.json(empty);
 const owner=context.userId?`picky:pet:v1:u:${context.userId}`:null,self=owner?walkerId(owner,day):'guest',base=`picky:street:v2:${day}`,keep={expiration:new Date(now+3*86400000)};
 try{
  let roster:(Walker&{owner:string})[]=JSON.parse(await redis.get(base+':roster')??'[]');
  if(c.req.method==='POST'){
   if(!owner)return c.json({error:'Sign in to wave.'},401);
   const input=await c.req.json(),target=roster.find(w=>w.id===input?.id);
   if(target&&target.id!==self){const once=`${base}:waved:${self}:${target.id}`;if(!await redis.get(once)){await redis.set(once,'1',keep);const k=`${base}:waves:${target.id}`;await redis.set(k,String(Number(await redis.get(k)??0)+1),keep);}}
   return c.json({ok:true});
  }
  let fresh=false;
  if(owner){const raw=await redis.get(owner),p:Pet|null=raw?JSON.parse(raw):null;fresh=!!p&&p.hatchedAt!==null&&now-p.hatchedAt<900000;
   if(p&&p.hatchedAt!==null){const view=[...(p.scenes??[]),...(p.sceneAlbum??[])].find(s=>s.kind==='daily'&&dayAt(s.at)===day&&s.view)?.view??p.views?.[p.views.length-1],rv=todayDone(p,day)?reviewOf(advancePet(p,now),now):null,knows=knowsOf(p),did=[...(p.scenes??[]),...(p.sceneAlbum??[])].find(s=>s.kind==='daily'&&dayAt(s.at)===day&&s.choice)?.choice,entry={id:self,owner,...(did?{did}:{}),...(knows!==undefined?{knows}:{}),...(view?{view}:{}),...(rv?{stars:rv.stars,line:rv.line}:{}),mark:Math.floor(p.bornAt/7)%6,name:p.name,temperament:p.temperament,stage:petView(p,now).stage as Walker['stage']},next=[...roster.filter(w=>w.id!==self),entry].slice(-40);
    if(JSON.stringify(next)!==JSON.stringify(roster)){roster=next;await redis.set(base+':roster',JSON.stringify(roster),keep);}}}
  const visitor=pickVisitor(roster.map(({owner:_hidden,...w})=>w),self,now,fresh);
  if(visitor&&!visitor.stray&&owner){const once=`${base}:saw:${self}:${visitor.id}`;if(!await redis.get(once)){await redis.set(once,'1',keep);const k=`${base}:seen:${visitor.id}`;await redis.set(k,String(Number(await redis.get(k)??0)+1),keep);}}
  const[seen,waves]=owner?await Promise.all([redis.get(`${base}:seen:${self}`),redis.get(`${base}:waves:${self}`)]):[null,null];const grown=Number(await redis.get(GROWN)??0);
  return c.json({count:roster.length,visitor,news:owner?{seen:Number(seen??0),waves:Number(waves??0)}:null,grown,told:!!(context.userId&&await redis.get(`picky:tell:v1:${post}:${day}:${context.userId}`)),wall:roster.filter(w=>w.line&&w.id!==self).slice(-8).map(({owner:_hidden,...w})=>w)});
 }catch{console.error('Street unavailable');return c.json(empty);}
});
// An explicit, optional button on the result card: one comment a day, in words the game wrote.
app.post('/api/tell',async c=>{
 const post=context.postId,user=context.userId,now=Date.now();
 if(!post||!user)return c.json({error:'Sign in to Reddit to tell the thread.'},401);
 try{
  const input=await c.req.json().catch(()=>null) as {retort?:unknown;remove?:unknown}|null,pick=typeof input?.retort==='number'?input.retort:undefined;
  const receipt=`picky:tell:v1:${post}:${dayAt(now)}:${user}`,mine=`picky:tellc:v1:${dayAt(now)}:${user}`;
  // Taking it down again. Reddit's rules ask that people can remove what they posted; while the app's account is the author, only the app can.
  if(input?.remove===true){const id=await redis.get(mine);if(id){const made=await reddit.getCommentById(id as Parameters<typeof reddit.getCommentById>[0]);try{await made.delete();}catch{await made.remove();}}await redis.del(receipt);await redis.del(mine);return c.json({ok:true,removed:true});}
  const raw=await redis.get(`picky:pet:v1:u:${user}`),said=raw?tellLine(JSON.parse(raw) as Pet,now):null,rv=raw?reviewOf(advancePet(JSON.parse(raw) as Pet,now),now):null;
  // The comment ends with the pet's review of its owner: the part people answer.
  // What the rest of the street's pets did, so a comment has something to compare against.
  let crowd='';try{const mine=raw?[...((JSON.parse(raw) as Pet).scenes??[]),...((JSON.parse(raw) as Pet).sceneAlbum??[])].find(s=>s.kind==='daily'&&dayAt(s.at)===dayAt(now)&&s.choice)?.choice:undefined,g=mine?await gardenView(redis,'all',null,now):null;if(g&&mine)crowd=crowdLine(g.counts[mine],g.total);}catch{/* the tally is a courtesy */}
  // The verdict leads: it is the one part no two comments share, and the part people answer. What happened comes after it.
  const retort=rv&&pick!==undefined?retortsFor(rv.stars)[pick]:undefined;
  const line=said&&rv?`${(JSON.parse(raw!) as Pet).name}'s review of me today: ${starText(rv.stars)} "${rv.line}"${retort?`\n\nMy reply: ${retort}`:''}\n\n${said.replace(/ What did yours do\?$/,'')}\n\n${crowd?crowd+' ':''}${[`Did the other ${(JSON.parse(raw!) as Pet).temperament??'gentle'} ones do the same?`,'How did yours rate you?','What did yours say?'][(Math.floor(now/86400000)+[...user].reduce((a,ch)=>a+ch.charCodeAt(0),0))%3]}`:said;
  if(!line)return c.json({error:'Explore today\u2019s find first.'},400);
  if(await redis.get(receipt))return c.json({ok:true,already:true});
  await redis.set(receipt,'1',{expiration:new Date(now+3*86400000)});
  let made:Awaited<ReturnType<typeof reddit.submitComment>>;
  // Reddit's rule for score-style comments: they go under a pinned comment, not at the top of the thread. Each day's post has one.
  let under=await redis.get(pinKey(now));if(!under){const todays=await redis.get(`picky:pet-post:day:v1:${dayAt(now)}`);if(todays){await recap(todays,now);under=await redis.get(pinKey(now));}}
  try{made=await reddit.submitComment({id:(under??post) as Parameters<typeof reddit.submitComment>[0]['id'],text:line,runAs:'USER'});}catch(e){await redis.del(receipt);throw e;}
  await redis.set(mine,made.id,{expiration:new Date(now+3*86400000)});
  // Until the app is approved Reddit posts a player's comment under the app's own name. Sign those, so the thread shows whose pet it is.
  let by:'app'|'you'='you';
  try{const me=context.username;if(me&&made.authorName&&made.authorName.toLowerCase()!==me.toLowerCase()){by='app';await made.edit({text:`${line}\n\n— u/${me}`});}}catch{console.error('Comment not signed');}
  // Flair is a courtesy on top of the comment: never fail the request over it.
  try{const p=JSON.parse(raw!) as Pet,streak=p.reads?.streak??0;if(context.username&&context.subredditName)await reddit.setUserFlair({subredditName:context.subredditName,username:context.username,text:(rv?`rated ${starText(rv.stars)} by ${p.name}`:streak>1?`${p.name} · streak ${streak}`:p.name).slice(0,60)});}catch{console.error('Flair not set');}
  return c.json({ok:true,by});
 }catch{console.error('Tell the thread failed');return c.json({error:'Could not post just now. Try again.'},503);}
});
app.all('/api/game',async c=>{
  if(c.req.method!=='GET'&&c.req.method!=='POST')return c.json({error:'Unsupported method.'},405);
  let selection:ReturnType<typeof resolveSelection>;
  try{selection=resolveSelection({mode:c.req.query('mode'),puzzle:c.req.query('puzzle'),practice:c.req.query('practice')},context.postData);}catch{return c.json({error:'Unknown craving.'},400);}
  const {puzzle,mode:effectiveMode,daily,scope}=selection;
  const guest=c.req.header('x-picky-guest');
  const identity=context.userId?`u:${context.userId}`:context.loid?`l:${context.loid}`:guest&&/^[a-f0-9-]{36}$/i.test(guest)?`g:${guest}`:null;
  if(!identity)return c.json({error:'Please sign in to Reddit, or reopen the game to start a guest session.'},401);
  const key=`picky:v3:${scope}:${identity}`;
  const base=()=>createGame(puzzle,effectiveMode);
  try{
    const game=c.req.method==='POST'?await transition(redis,key,base,await c.req.json()):restoreGame(base(),await redis.get(key));
    return c.json({...view(game),reddit:true,daily,guest:!context.userId});
  }catch(e){
    if(e instanceof StateConflict)return c.json({error:e.message},409);
    if(e instanceof SyntaxError)return c.json({error:'Invalid request.'},400);
    if(e instanceof Error&&/snack|trait|action|changed|finished|sentence/i.test(e.message))return c.json({error:e.message},400);
    console.error('Picky state operation failed');return c.json({error:'Picky couldn’t save that bite. Your previous progress is safe; try again.'},503);
  }
});
async function todayPost(mode:'mixed'|'homesick'='mixed'){
  if(!context.subredditName)throw new Error('Missing subreddit context');
  const day=new Date().toISOString().slice(0,10),key=mode==='homesick'?`picky:post:homesick:v1:${day}`:`picky:post:v3:${day}`;
  const existing=await redis.get(key);if(existing)return existing;
  const lock=`${key}:creating`,lease=await redis.set(lock,'creating',{nx:true,expiration:new Date(Date.now()+60000)});
  if(lease!=='OK')throw new Error('Today’s post is already being created. Try again shortly.');
  try{
    const again=await redis.get(key);if(again)return again;
    const post=await reddit.submitCustomPost({subredditName:context.subredditName,title:mode==='homesick'?`Picky · Homesick · ${day} · Find the favourite`:`Picky · ${day} · What’s the craving?`,entry:'default',postData:mode==='homesick'?{schema:4,mode,day,puzzle:dayIndex(day)%3}:{schema:3,day,puzzle:dayIndex(day)}});
    await redis.set(key,post.id);return post.id;
  }finally{await redis.del(lock);}
}
// One pet post a day, titled with that day's find, so the game arrives in the feed as daily content.
// The pet itself belongs to the player, not the post: any day's post opens the same pocket.
const pinKey=(now:number)=>`picky:recap:v2:${dayAt(now)}`;
// Yesterday's results, pinned under today's post: once a day, and never allowed to stop the post itself.
async function recap(post:string,now:number){
  try{
    const y=now-86400000,done=pinKey(now);if(await redis.get(done))return;
    // A short lease stops two callers posting at once. The day is only marked done once the comment exists, so a day with nothing to say, or a failed attempt, can be tried again from the menu.
    if(await redis.set(done+':lease','1',{nx:true,expiration:new Date(now+60000)})!=='OK')return;
    const pets:RecapPet[]=(JSON.parse(await redis.get(`picky:street:v2:${dayAt(y)}:roster`)??'[]') as RecapPet[]).map(({name,stars,line,knows,temperament,did})=>({name,stars,line,knows,temperament,did})),g=await gardenView(redis,'all',null,y);
    // With nobody out yesterday there are no results, but the day still gets its pinned comment: reviews are posted under it.
    const chosen=await findOn(finds,dayAt(now)).catch(()=>null),by=chosen&&chosen.votes>0?{votes:chosen.votes,total:chosen.total}:undefined;
    const text=(recapText({object:dailyObject(y),counts:g.counts,total:g.total,pets,today:dailyObject(now),chosen:by})??`**Today: ${an(OBJECTS[dailyObject(now)].name)}${by?`, brought back by ${by.votes===1&&by.total===1?'the only pet that chose':`${by.votes} of ${by.total} pets`}`:''}.** What will yours do, and what will it say about you?`)+'\n\nReviews posted from the game appear as replies to this comment.';
    const made=await reddit.submitComment({id:post as Parameters<typeof reddit.submitComment>[0]['id'],text});
    await redis.set(done,made.id,{expiration:new Date(now+2*86400000)});
    try{await made.distinguish(true);}catch{console.error('Recap not pinned');}
  }catch{console.error('Recap skipped');}
}
async function petPost(){
  if(!context.subredditName)throw new Error('Missing subreddit context');
  const now=Date.now(),day=dayAt(now),key=`picky:pet-post:day:v1:${day}`;
  const existing=await redis.get(key);if(existing){await recap(existing,now);return existing;}
  const lock=`${key}:creating`,lease=await redis.set(lock,'1',{nx:true,expiration:new Date(now+60000)});
  if(lease!=='OK')throw new Error('Busy');
  try{
    const again=await redis.get(key);if(again)return again;
    const date=new Date(now).toLocaleDateString('en',{month:'short',day:'numeric',timeZone:'UTC'}),name=OBJECTS[dailyObject(now)].name;
    // The day's picture: the pet and the thing it found, drawn from the game's own sprites. Reddit copies it from the game's files.
    let picture:string|undefined;
    if(SHARE_PICTURES)try{const origin=await redis.get('picky:origin:v1');if(origin)picture=(await media.upload({url:`${origin}/share/${dailyObject(now)}.png`,type:'image'})).mediaUrl;else console.error('Share picture skipped: no origin yet');}catch{console.error('Share picture skipped');}
    // If the community has a post flair called "Daily find", the daily post wears it. Moderators make the flair; the app only looks for it.
    let flairId:string|undefined;try{flairId=(await reddit.getPostFlairTemplates(context.subredditName)).find(f=>f.text==='Daily find')?.id;}catch{/* a post without flair is still a post */}
    const chosen=await findOn(finds,day).catch(()=>null);
    const post=await reddit.submitCustomPost({subredditName:context.subredditName,title:`${chosen&&chosen.votes>0?`Your pets chose ${an(name)}`:`Your pet found ${an(name)}`}. What will it think of you? · Kimama · ${date}`,entry:'petSplash',postData:{mode:'pet',day},...(flairId?{flairId}:{}),...(picture?{styles:{shareImageUrl:picture}}:{})});
    await redis.set(key,post.id,{expiration:new Date(now+3*86400000)});
    // Today's post takes the top of the community, and yesterday's steps down, so nobody is sent to an old find.
    try{const old=await redis.get(`picky:pet-post:day:v1:${dayAt(now-86400000)}`);if(old)await (await reddit.getPostById(old as Parameters<typeof reddit.getPostById>[0])).unsticky();}catch{console.error('Old post not unpinned');}
    try{await post.sticky(1);}catch{console.error('Post not pinned');}
    await recap(post.id,now);return post.id;
  }finally{await redis.del(lock);}
}
// Calls: a pet can ring its owner through Reddit's own notifications. Only for players who switched it on, and once a day at most:
// in the player's own late afternoon (Reddit's guidance: 4 to 9 pm local, never at night), and only while today's find is still waiting.
const todayDone=(p:Pet,day:string)=>[...(p.scenes??[]),...(p.sceneAlbum??[])].some(s=>s.kind==='daily'&&dayAt(s.at)===day&&s.choice);
const tzKey=(user:string)=>`picky:tz:v1:${user}`;
/** The streak as it stands: one missed day is forgiven, two start it again. */
const liveStreak=(p:Pet,now:number)=>{const r=p.reads;if(!r?.lastDay)return 0;return Math.round((Date.parse(dayAt(now))-Date.parse(r.lastDay))/86400000)<=2?r.streak:0;};
const callBody='{{what}} turned up outside. {{tail}}',callTail=(p:Pet,now:number)=>{const n=liveStreak(p,now);return n>=2?`Your streak is ${n}.`:`What will ${p.name} do?`;};
async function ring():Promise<number>{
  if(!ALERTS)return 0;
  const now=Date.now(),day=dayAt(now),post=await redis.get(`picky:pet-post:day:v1:${day}`);if(!post)return 0;
  const thing=OBJECTS[dailyObject(now)].name,utc=new Date(now).getUTCHours()+new Date(now).getUTCMinutes()/60;
  // A find with under three hours left is not worth a call: wait for the next one.
  if(utc>=21)return 0;
  type To=Parameters<typeof notifications.enqueue>[0]['recipients'];let batch:To=[],sent=0;
  const flush=async()=>{if(!batch.length)return;const r=await notifications.enqueue({title:'{{name}} found something',body:callBody,recipients:batch});sent+=r.successCount;batch=[];};
  for await(const userId of notifications.listOptedInUsersIterator()){
    // Minutes east of UTC, as the player's own device last reported. Unknown: assume US Eastern.
    const tz=Number(await redis.get(tzKey(userId))??-300),local=((utc+tz/60)%24+24)%24;if(local<16||local>=21)continue;
    const raw=await redis.get(`picky:pet:v1:u:${userId}`);if(!raw)continue;const p=JSON.parse(raw) as Pet;
    if(p.hatchedAt===null||todayDone(p,day))continue;
    // Once per player per day of their own calendar.
    if(await redis.set(`picky:rang:v1:${dayAt(now+tz*60000)}:${userId}`,'1',{nx:true,expiration:new Date(now+2*86400000)})!=='OK')continue;
    batch.push({userId:userId as To[number]['userId'],link:post as To[number]['link'],data:{name:p.name,what:An(thing),tail:callTail(p,now)}});if(batch.length>=500)await flush();
  }
  await flush();return sent;
}
app.all('/api/calls',async c=>{
  if(!ALERTS)return c.json({on:false,available:false});
  const user=context.userId;if(!user)return c.json({on:false,available:true,error:'Sign in to Reddit first.'},401);
  try{
    if(c.req.method==='POST'){const input=await c.req.json();
      // The device's own time zone, so a call arrives in its owner's evening. Kept a month.
      if(typeof input?.tz==='number'&&Math.abs(input.tz)<=840)await redis.set(tzKey(user),String(Math.round(input.tz)),{expiration:new Date(Date.now()+30*86400000)});
      if(input?.on===undefined)return c.json({on:await notifications.isOptedIn(user as Parameters<typeof notifications.isOptedIn>[0]),available:true});
      if(input?.on){const r=await notifications.optInCurrentUser();if(!r.success)return c.json({on:false,error:r.message??'Reddit did not switch calls on.'});
        return c.json({on:true,available:true});}
      await notifications.optOutCurrentUser();return c.json({on:false,available:true});}
    return c.json({on:await notifications.isOptedIn(user as Parameters<typeof notifications.isOptedIn>[0]),available:true});
  }catch{console.error('Calls unavailable');return c.json({on:false,available:true,error:'Calls are not switched on for this app yet.'},503);}
});
// Joining the community is its own question with its own button, never a side effect of something else. The game reports what Reddit did.
app.post('/api/join',async c=>{
  if(!context.userId)return c.json({ok:false});
  try{await reddit.subscribeToCurrentSubreddit();return c.json({ok:true});}catch{console.error('Join not done');return c.json({ok:false});}
});
// The player's own avatar, for the portrait on the review page. Nobody else's is ever fetched.
app.get('/api/me',async c=>{const signedIn=!!context.userId;try{return c.json({signedIn,avatar:context.username?await reddit.getSnoovatarUrl(context.username)??null:null});}catch{return c.json({signedIn,avatar:null});}});
// A moderator can ring themself once, to see what a call looks like on Reddit. It goes to nobody else.
app.post('/internal/test-call',async c=>{
  if(!ALERTS)return c.json({showToast:'Alerts are switched off in this version.'});
  try{const user=context.userId,now=Date.now(),post=await redis.get(`picky:pet-post:day:v1:${dayAt(now)}`);
    if(!user||!post)return c.json({showToast:'Create today\u2019s post first.'});
    if(!await notifications.isOptedIn(user as Parameters<typeof notifications.isOptedIn>[0]))return c.json({showToast:'Switch "call on" in the game first, then try again.'});
    const raw=await redis.get(`picky:pet:v1:u:${user}`),name=raw?(JSON.parse(raw) as Pet).name:'Your pet',thing=OBJECTS[dailyObject(now)].name;
    type To=Parameters<typeof notifications.enqueue>[0]['recipients'];
    const r=await notifications.enqueue({title:'{{name}} found something',body:callBody,recipients:[{userId:user as To[number]['userId'],link:post as To[number]['link'],data:{name,what:An(thing),tail:raw?callTail(JSON.parse(raw) as Pet,now):'What will it do?'}}]});
    return c.json({showToast:r.successCount?'Test call queued. Check your Reddit notifications.':`Reddit refused the call: ${r.errors[0]?.message??'no reason given'}`.slice(0,120)});
  }catch(e){console.error('Test call failed');return c.json({showToast:`Test call failed: ${e instanceof Error?e.message:'unknown'}`.slice(0,120)});}
});
app.post('/internal/nudge',async c=>{try{return c.json({sent:await ring()});}catch{console.error('Nudge failed');return c.json({sent:0});}});
app.post('/internal/pet-post',async c=>{
  try{const id=await petPost();
    // The badge is a dot on Reddit's games drawer. Its audience is undocumented, and returning dots were a named complaint among people who do not play.
    // Alerts in Kimama are something a player asks for, so the badge stays off until we know it only reaches players. Set BADGE to turn it back on.
    if(BADGE)try{await notifications.requestShowGameBadge({post:id as Parameters<typeof notifications.requestShowGameBadge>[0]['post']});}catch{console.error('Badge skipped');}
    return c.json({navigateTo:`https://www.reddit.com/comments/${id.replace(/^t3_/,'')}`});}
  catch{console.error('Pet post failed');return c.json({showToast:'Could not create the pet post. Please retry.'},500);}
});
app.post('/internal/homesick-post',async c=>{
  try{const id=await todayPost('homesick');return c.json({navigateTo:`https://www.reddit.com/comments/${id.replace(/^t3_/,'')}`,showToast:'Homesick is ready.'});}
  catch{console.error('Picky Homesick post failed');return c.json({showToast:'Could not create the Homesick post. Please retry.'},500);}
});
app.post('/internal/post',async c=>{
  try{const id=await todayPost();return c.json({navigateTo:`https://www.reddit.com/comments/${id.replace(/^t3_/,'')}`,showToast:'Today’s craving is ready.'});}
  catch{console.error('Picky daily post failed');return c.json({showToast:'Could not create today’s craving. Please retry from the subreddit menu.'},500);}
});
serve({fetch:app.fetch,createServer,port:getServerPort()});
