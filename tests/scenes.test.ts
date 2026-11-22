import {expect,it} from 'vitest';
import {careForPet,newPet,petView,meetPets,type Pet} from '../src/shared/pet';
import {dailyObject,OBJECTS,DAILY,KIND} from '../src/shared/scenes';
const t=Date.UTC(2026,10,13,12);
function baby(name='Pip'){return careForPet(newPet(t),{action:'hatch',name,version:0},t);}
function act(p:Pet,action:string,extra:Record<string,unknown>={},now=t){return careForPet(p,{action,version:p.version,...extra},now);}
function finish(p:Pet,now=t){return act(p,'sceneFinish',{sceneId:p.scenes![0].id},now);}
it('persists an unfinished daily choice across views without rewards, and suppresses autonomous prompts',()=>{
 const p=baby(),n=act(p,'explore');expect(n.joy).toBe(p.joy);expect(n.keepsake).toBeUndefined();
 const v=petView(JSON.parse(JSON.stringify(n)),t+60000);expect(v.scenes![0].awaitingChoice).toBe(true);expect(v.intent).toBeNull();
 expect(()=>finish(n)).toThrow(/Choose/);expect(()=>act(n,'meal')).toThrow(/scene/);
});
it('resolves a choice once; forged, repeated and stale choices cannot earn rewards',()=>{
 const p=act(baby(),'explore'),id=p.scenes![0].id;
 expect(()=>act(p,'sceneChoose',{sceneId:'someone-else',choice:'try'})).toThrow(/changed/);
 expect(()=>act(p,'sceneChoose',{sceneId:id,choice:'anything'})).toThrow(/Choose/);
 const n=act(p,'sceneChoose',{sceneId:id,choice:'try'});expect(n.keepsake).toBe(OBJECTS[dailyObject(t)].name);expect(n.learning?.count).toBe(1);
 expect(()=>act(n,'sceneChoose',{sceneId:id,choice:'try'})).toThrow(/changed/);
 const done=finish(n);expect(done.scenes).toHaveLength(0);expect(done.sceneAlbum![0].choice).toBe('try');expect(done.joy).toBe(n.joy);
 expect(()=>finish(done)).toThrow();expect(()=>act(done,'explore')).toThrow(/already/);
});
it('makes watch, gentle and bold choices meaningfully different without forcing souvenirs',()=>{
 const p=act(baby(),'explore'),sceneId=p.scenes![0].id;
 const bold=act(p,'sceneChoose',{sceneId,choice:'try'}),gentle=act(p,'sceneChoose',{sceneId,choice:'gentle'}),watch=act(p,'sceneChoose',{sceneId,choice:'watch'});
 expect(bold.traits!.bold).toBeGreaterThan(gentle.traits!.bold);expect(watch.habits).toBeUndefined();expect(watch.keepsake).toBeUndefined();expect(watch.sceneAlbum).toBeUndefined();expect(new Set([bold,gentle,watch].map(n=>n.scenes![0].summary)).size).toBe(3);
});
it('has thirty shared daily objects, five of each sort, with authored outcomes for every choice and temperament',()=>{
 const objects=new Set();for(let day=0;day<30;day++){const now=t+day*86400000;objects.add(dailyObject(now));
 for(const bold of [-5,5])for(const choice of ['try','gentle','watch']){const p=baby();p.traits={bold,selective:0,social:0};const n=act(p,'explore',{},now);const done=act(n,'sceneChoose',{sceneId:n.scenes![0].id,choice},now);expect(done.scenes![0].beats).toHaveLength(3);expect(done.scenes![0].summary!.length).toBeGreaterThan(30);}}
 expect(objects.size).toBe(30);
 const sorts:Record<string,number>={};for(const o of DAILY)sorts[KIND[o]]=(sorts[KIND[o]]??0)+1;expect(Object.values(sorts)).toEqual([5,5,5,5,5,5]);
 // The day the cycle grew kept its object.
 expect(dailyObject(Date.parse('2026-11-18T12:00:00Z'))).toBe('kite');
 for(const o of DAILY){const x=OBJECTS[o];for(const k of ['try','gentle','watch'] as const)expect(x[k].length).toBeLessThanOrEqual(16);}
});
it('keeps an old daily find and its choice stable across UTC rollover',()=>{
 const p=act(baby(),'explore'),object=p.scenes![0].object;
 const n=act(p,'sceneChoose',{sceneId:p.scenes![0].id,choice:'gentle'},t+86400000);expect(n.scenes![0].object).toBe(object);
 const next=act(finish(n,t+86400000),'explore',{},t+86400000);expect(next.scenes![0].object).not.toBe(object);
});
it('respects the shared teaching cap while allowing a daily scene to complete',()=>{
 const p=baby();p.learning={day:'2026-11-13',count:5};const n=act(p,'explore'),done=act(n,'sceneChoose',{sceneId:n.scenes![0].id,choice:'try'});
 expect(done.learning!.count).toBe(5);expect(done.habits).toBeUndefined();expect(done.scenes![0].effect).not.toMatch(/lesson|limit|cap/i);
});
it('stores a three-beat playdate for both owners, hides identities and preserves absent-host replay',()=>{
 const [x,y]=meetPets(baby(),baby('Nori'),'secret-a','secret-b',t);
 expect(x.scenes![0].beats).toHaveLength(3);expect(y.scenes![0].you).toBe(1);expect(x.scenes![0].you).toBe(0);
 expect(JSON.stringify(petView(y,t))).not.toContain('secret-');
 const seen=finish(x);expect(seen.sceneAlbum![0].kind).toBe('playdate');expect(y.scenes).toHaveLength(1);
 expect(()=>meetPets(seen,finish(y),'secret-a','secret-b',t+1000)).toThrow(/already/);
});
it('uses learned traits, remembers rivalry and changes the next greeting',()=>{
 const a=baby(),b=baby('Nori');a.traits=b.traits={bold:6,selective:0,social:0};
 const [x,y]=meetPets(a,b,'a','b',t);expect(x.scenes![0].beats[1].motion).toBe('race');
 const [xx]=meetPets(finish(x),finish(y),'a','b',t+86400000);expect(xx.scenes![0].standing).toBe('Friendly rivals');expect(xx.scenes![0].beats[0].text).toContain('Rematch');
});
it('copies a real habit on friendly visits at most once per day and bounds pending host scenes',()=>{
 const a=baby(),b=baby('Nori');a.traits=b.traits={bold:0,selective:0,social:4};b.habits={greet:4};
 const [x,y]=meetPets(a,b,'a','b',t);expect(x.habits!.greet).toBe(1);expect(x.scenes![0].effect).toContain('picked up warm greetings');
 const [xx]=meetPets(finish(x),b,'a','c',t+1000);expect(xx.habits!.greet).toBe(1);
 let host=y;for(let i=0;i<3;i++)[,host]=meetPets(baby(),host,`guest${i}`,'b',t+2000+i);
 expect(host.scenes).toHaveLength(4);expect(()=>meetPets(baby(),host,'guest4','b',t+3000)).toThrow(/busy/);
});
it('blocks new playdates during a pending choice and does not mutate either input on failure',()=>{
 const a=baby(),b=act(baby('Nori'),'explore'),before=JSON.stringify([a,b]);
 expect(()=>meetPets(a,b,'a','b',t)).toThrow(/busy/);expect(JSON.stringify([a,b])).toBe(before);
});
it('respects independent personalities and disambiguates pets with matching names',()=>{
 const a=baby('Mochi'),b=baby('Mochi');a.traits={bold:5,selective:0,social:-7};b.traits={bold:5,selective:0,social:0};
 const [x]=meetPets(a,b,'a','b',t);expect(x.scenes![0].beats[1].motion).toBe('notice');expect(x.scenes![0].summary).toContain('Mochi the visitor');expect(x.scenes![0].summary).toContain('Mochi the host');expect(x.scenes![0].standing).toBe('Comfortable company');
});
it('keeps replay albums bounded and never rewards acknowledging or re-reading scenes',()=>{
 let a=baby(),b=baby('Nori');for(let day=0;day<9;day++){const now=t+day*86400000;[a,b]=meetPets(a,b,'a','b',now);const bond=a.bond,habits=JSON.stringify(a.habits);a=finish(a,now);b=finish(b,now);expect(a.bond).toBe(bond);expect(JSON.stringify(a.habits)).toBe(habits);}
 expect(a.sceneAlbum).toHaveLength(6);expect(a.relations!.b.visits).toBe(9);
});
it('lets a legacy daily encounter upgrade once without granting its care reward again',()=>{
 const p=baby();p.encounterDay='2026-11-13';p.keepsake='paper windmill';expect(petView(p,t).dailyFind.available).toBe(true);
 const n=act(p,'explore');expect(n.scenes![0].alreadyRewarded).toBe(true);
 const chosen=act(n,'sceneChoose',{sceneId:n.scenes![0].id,choice:'gentle'});expect(chosen.joy).toBe(p.joy);expect(chosen.bond).toBe(p.bond);
 const done=finish(chosen);expect(petView(done,t).dailyFind.available).toBe(false);expect(()=>act(done,'explore')).toThrow(/already/);
});
