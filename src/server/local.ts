import {gardenView,recordGardenChoice,setGardenMembership,gardenTarget,directoryKey} from './garden';
import {savePlaydate} from './pet-state';
import type {StateStore} from './redis-state';
import {tickAutonomy} from '../shared/autonomy';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getCookie, setCookie } from 'hono/cookie';
import { serve } from '@hono/node-server';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { createServer as createViteServer } from 'vite';
import {newPet,careForPet,petView,meetPets,advancePet,type Pet} from '../shared/pet';
import {pickVisitor,walkerId,addCard,type Walker,type Card} from '../shared/street';
import {reviewOf,knowsOf} from '../shared/review';
import {picksOn,pickOn,knowRecentFinds,type FindStore} from './finds';
import {isObject} from '../shared/finds';

// Local pets and votes are kept in files under .local/.
const directory = new URL('../../.local/', import.meta.url);
mkdirSync(directory, { recursive: true });
const app = new Hono();
app.use('/api/*', bodyLimit({ maxSize: 2048, onError: c => c.json({ error: 'Request too large.' }, 413) }));
app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  const origin = c.req.header('origin');
  if (c.req.method === 'POST' && origin !== 'http://localhost:5173' && origin !== 'http://127.0.0.1:5173') return c.json({ error: 'Invalid request origin.' }, 403);
  await next();
});
const petFile=new URL('pets-v1.json',directory);
const pets:Record<string,Pet>=existsSync(petFile)?JSON.parse(readFileSync(petFile,'utf8')):{};
const invitations=new Map<string,{owner:string;expires:number}>();
// Tomorrow's find, chosen by today's pets: the same rules as on Reddit, kept in a local file.
const findFile=new URL('finds-v1.json',directory);
const findData:{kv:Record<string,string>;h:Record<string,Record<string,string>>}=existsSync(findFile)?JSON.parse(readFileSync(findFile,'utf8')):{kv:{},h:{}};
const saveFinds=()=>{const t=new URL('finds-v1.tmp',directory);writeFileSync(t,JSON.stringify(findData),{mode:0o600});renameSync(t,findFile);};
const findStore:FindStore={
 async get(k){return findData.kv[k]??null;},
 async set(k,v,o){if(o?.nx&&k in findData.kv)return null;findData.kv[k]=v;saveFinds();return 'OK';},
 async hGetAll(k){return {...(findData.h[k]??{})};},
 async hSet(k,v){findData.h[k]={...(findData.h[k]??{}),...v};saveFinds();return 1;},
};
app.use('/api/*',async(_c,next)=>{try{await knowRecentFinds(findStore,Date.now());}catch{/* the rotation still works */}await next();});
app.get('/api/pick',async c=>c.json(await picksOn(findStore,new Date().toISOString().slice(0,10),getCookie(c,'picky-pocket-session'))));
app.post('/api/pick',async c=>{
 const id=getCookie(c,'picky-pocket-session');if(!id||!pets[id])return c.json({error:'Sign in to Reddit to choose.'},401);
 const input=await c.req.json().catch(()=>null) as {object?:unknown;version?:unknown}|null,now=Date.now(),day=new Date(now).toISOString().slice(0,10);
 try{
  if(!input||!isObject(input.object))throw new Error('Choose one of the things on the path.');
  if(!(await picksOn(findStore,day,id)).offer.includes(input.object))throw new Error('That is not on today\u2019s path.');
  const next=careForPet(pets[id],{action:'bring',object:input.object,version:input.version},now);pets[id]=next;persistPetsAndGarden();
  return c.json({pick:await pickOn(findStore,day,id,input.object),pet:petView(next,now)});
 }catch(e){return c.json({error:e instanceof Error?e.message:'Could not choose.'},400);}
});
app.all('/api/pet',async c=>{
 if(c.req.method!=='GET'&&c.req.method!=='POST')return c.json({error:'Unsupported method.'},405);
 let id=getCookie(c,'picky-pocket-session');if(!id||!pets[id]){id=randomUUID();pets[id]=newPet(Date.now());setCookie(c,'picky-pocket-session',id,{httpOnly:true,sameSite:'Strict',path:'/',maxAge:365*86400});}
 pets[id]=tickAutonomy(advancePet(pets[id],Date.now()),Date.now());
 const previous=pets[id];
 try{if(c.req.method==='POST'){const input=await c.req.json();if(input.action==='invite'){if(previous.hatchedAt===null)throw new Error('Hatch your pet first.');const code=randomUUID().replace(/-/g,'').slice(0,12);invitations.set(code,{owner:id,expires:Date.now()+86400000});return c.json({...petView(previous,Date.now()),inviteCode:code});}else if(input.action==='visit'){const invitation=invitations.get(input.code);const other=invitation?.owner;if(!other||!pets[other]||invitation!.expires<Date.now())throw new Error('Pet invitation expired.');if(input.version!==previous.version)throw new Error('Your pet changed.');const [a,b]=meetPets(previous,pets[other],id,other,Date.now());pets[id]=a;pets[other]=b;}else pets[id]=careForPet(previous,input,Date.now());}
 const temp=new URL('pets-v1.tmp',directory);writeFileSync(temp,JSON.stringify(pets),{mode:0o600});renameSync(temp,petFile);return c.json(petView(pets[id],Date.now()));
 }catch(e){pets[id]=previous;return c.json({error:e instanceof Error?e.message:'Could not save your pet.',code:e instanceof Error&&e.message==='Pet moment passed.'?'moment_passed':undefined},400);}
});
// Local garden uses the same transaction contract as Reddit; identities stay in HttpOnly cookies.
const gardenFile=new URL('garden-v1.json',directory);
const gardenData:Record<string,string>=existsSync(gardenFile)?JSON.parse(readFileSync(gardenFile,'utf8')):{};
const getLocal=(key:string)=>key.startsWith('local-pet:')?(pets[key.slice(10)]?JSON.stringify(pets[key.slice(10)]):undefined):gardenData[key];
function persistPetsAndGarden(){
 const tmp=new URL('pets-v1.tmp',directory);writeFileSync(tmp,JSON.stringify(pets),{mode:0o600});renameSync(tmp,petFile);
 const gtmp=new URL('garden-v1.tmp',directory);writeFileSync(gtmp,JSON.stringify(gardenData),{mode:0o600});renameSync(gtmp,gardenFile);
}
const localStore:StateStore={get:async key=>getLocal(key),watch:async(...keys)=>{
 const snapshot=keys.map(getLocal),writes:{key:string;value:string}[]=[];
 return{multi:async()=>{},unwatch:async()=>{},discard:async()=>{},set:async(key,value)=>{writes.push({key,value});},exec:async()=>{
 if(keys.some((k,i)=>getLocal(k)!==snapshot[i]))return[];
 for(const w of writes){if(w.key.startsWith('local-pet:'))pets[w.key.slice(10)]=JSON.parse(w.value);else gardenData[w.key]=w.value;}persistPetsAndGarden();return writes.map(()=>'OK');
 }};
}};
// The street, locally: every hatched local pet is out walking. Counters live in memory.
const streetGrown={n:0},streetCards:Record<string,Card[]>={},streetSeen:Record<string,number>={},streetWaves:Record<string,number>={},streetOnce=new Set<string>();
const callsOn=new Set<string>();
app.all('/api/calls',async c=>{const id=getCookie(c,'picky-pocket-session')??'guest';if(c.req.method==='POST'){const input=await c.req.json();if(input?.on)callsOn.add(id);else callsOn.delete(id);}/* Alerts are switched off in the installed game; the local server says the same, so the two look alike. */return c.json({on:callsOn.has(id),available:false});});
app.post('/api/join',c=>c.json({ok:true}));
app.get('/api/me',c=>c.json({signedIn:true,avatar:null}));
app.all('/api/street',async c=>{
 const id=getCookie(c,'picky-pocket-session'),now=Date.now(),day=new Date(now).toISOString().slice(0,10),self=id?walkerId(id,day):'guest';
 const roster=Object.entries(pets).filter(([,p])=>p.hatchedAt!==null).slice(-40).map(([k,p])=>{const done=[...(p.scenes??[]),...(p.sceneAlbum??[])].some(s=>s.kind==='daily'&&new Date(s.at).toISOString().slice(0,10)===day&&s.choice),rv=done?reviewOf(p,now):null,knows=knowsOf(p);return{...(knows!==undefined?{knows}:{}),...(rv?{stars:rv.stars,line:rv.line}:{}),id:walkerId(k,day),view:[...(p.scenes??[]),...(p.sceneAlbum??[])].find(s=>s.kind==='daily'&&new Date(s.at).toISOString().slice(0,10)===day&&s.view)?.view??p.views?.[p.views.length-1],name:p.name,temperament:p.temperament,stage:petView(p,now).stage as Walker['stage']};});
 if(c.req.method==='POST'){const input=await c.req.json();if(id&&roster.some(w=>w.id===input?.id)&&input.id!==self&&!streetOnce.has(`w${self}${input.id}`)){streetOnce.add(`w${self}${input.id}`);streetWaves[input.id]=(streetWaves[input.id]??0)+1;const her=roster.find(w=>w.id===input.id)!,me=roster.find(w=>w.id===self);if(her.view)streetCards[self]=addCard(streetCards[self]??[],{view:her.view,from:her.name,day});if(me?.view)streetCards[her.id]=addCard(streetCards[her.id]??[],{view:me.view,from:me.name,day});}return c.json({ok:true});}
 const mine=id?pets[id]:null,visitor=pickVisitor(roster,self,now,!!mine&&mine.hatchedAt!==null&&now-mine.hatchedAt<900000);
 if(visitor&&!visitor.stray&&!streetOnce.has(`s${self}${visitor.id}`)){streetOnce.add(`s${self}${visitor.id}`);streetSeen[visitor.id]=(streetSeen[visitor.id]??0)+1;}
 return c.json({count:roster.length,visitor,news:id?{seen:streetSeen[self]??0,waves:streetWaves[self]??0}:null,cards:streetCards[self]??[],grown:streetGrown.n,wall:roster.filter(w=>w.line&&w.id!==self).slice(-8)});
});
// Local play has no thread; accept the request so the result card can be exercised.
app.post('/api/tell',c=>c.json({ok:true,local:true}));
app.all('/api/garden',async c=>{
 if(!['GET','POST'].includes(c.req.method))return c.json({error:'Unsupported method.'},405);
 const id=getCookie(c,'picky-pocket-session'),owner=id&&pets[id]?`local-pet:${id}`:null,own=id?pets[id]:undefined,now=Date.now(),post='local-pocket';
 try{
 if(c.req.method==='POST'){
  if(!owner)return c.json({error:'Open your pet first.'},401);const input=await c.req.json();
  if(input.action==='join'||input.action==='leave')await setGardenMembership(localStore,post,owner,'Local neighbour',input.action==='join',now);
  else if(input.action==='visit'){const target=await gardenTarget(localStore,post,input.id,now);const pet=await savePlaydate(localStore,owner,target,owner,target,input.version,now,{key:directoryKey(post,now),id:input.id});return c.json({pet:petView(pet,now)});}
  else return c.json({error:'Choose a garden action.'},400);
 }
 if(owner&&own&&await recordGardenChoice(localStore,post,owner,own,now))streetGrown.n++;
 return c.json(await gardenView(localStore,post,owner,now,own));
 }catch(e){return c.json({error:e instanceof Error?e.message:'The garden could not load.'},400);}
});
const api = serve({ fetch: app.fetch, port: 5174, hostname: '127.0.0.1' });
const vite = await createViteServer({ server: { middlewareMode: true, hmr: false, proxy: { '/api': 'http://127.0.0.1:5174' } } });
const web = createServer((req, res) => { vite.middlewares(req, res, () => { res.statusCode = 404; res.end('Not found'); }); });
web.listen(5173, '127.0.0.1', () => console.log('Kimama, locally: http://localhost:5173/pet.html'));
for (const event of ['SIGINT', 'SIGTERM'] as const) process.on(event, () => { web.close(); api.close(); void vite.close().then(() => process.exit(0)); });
