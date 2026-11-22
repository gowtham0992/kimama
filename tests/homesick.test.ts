import {describe,expect,it} from 'vitest';
import {SNACKS,accepts} from '../src/shared/rules';
import {createGame,act,view} from '../src/server/game';
import {packGame,restoreGame} from '../src/server/redis-state';

describe('Homesick',()=>{
  it('starts with 27 favourites consistent with two valid clues',()=>{
    const g=createGame(0,'homesick');
    expect(g.allowedRules).toHaveLength(81);expect(g.candidates).toHaveLength(27);
    expect(g.observations.map(o=>accepts(g.secret,o.snack))).toEqual([true,false]);
    expect(view(g).reveal).toBeNull();expect(view(g).favourite).toBeNull();
    expect(view(g).families).toEqual(['HOMESICK']);
  });
  it('has 81 distinct favourite response patterns, each accepting 33 snacks',()=>{
    const g=createGame(0,'homesick');
    const signatures=g.allowedRules.map(r=>SNACKS.map(s=>+accepts(r,s)).join(''));
    expect(new Set(signatures).size).toBe(81);
    for(const sig of signatures)expect([...sig].filter(v=>v==='1')).toHaveLength(33);
  });
  it('liking even the exact favourite during a feed does not solve the game',()=>{
    const g=createGame(0,'homesick'),favourite=SNACKS[g.secret.a];
    act(g,{type:'feed',snack:favourite,version:0});
    expect(g.status).toBe('playing');expect(g.event.ate).toBe(true);expect(g.feeds).toBe(1);
    expect(view(g).favourite).toBeNull();
    act(g,{type:'claim',snack:favourite,version:g.version});
    expect(g.status).toBe('solved');expect(view(g).favourite).toEqual(favourite);
    expect(view(g).score).toBe(1);
  });
  it('a likeable but incorrect favourite claim produces a real counterexample',()=>{
    const g=createGame(0,'homesick');
    const wrong=g.candidates.find(r=>r.id!==g.secret.id&&accepts(g.secret,SNACKS[r.a]))!;
    expect(wrong).toBeTruthy();
    act(g,{type:'claim',snack:SNACKS[wrong.a],version:0});
    expect(g.status).toBe('playing');expect(g.wrong).toBe(1);expect(g.feeds).toBe(0);
    expect(g.event.kind).toBe('wrong');expect(g.event.claimSnack).toEqual(SNACKS[wrong.a]);
    expect(accepts(wrong,g.event.snack!)).not.toBe(g.event.ate);
    expect(view(g).score).toBe(3);
  });
  it('uses free contradiction feedback and rejects malformed favourite claims',()=>{
    const g=createGame(0,'homesick');
    const r=g.allowedRules.find(r=>g.observations.some(o=>accepts(r,o.snack)!==o.ate))!;
    act(g,{type:'claim',snack:SNACKS[r.a],version:0});expect(g.wrong).toBe(0);expect(g.event.kind).toBe('contradiction');
    expect(()=>act(g,{type:'claim',snack:[9,9],version:g.version})).toThrow(/snack/);
    expect(()=>act(g,{type:'claim',ruleId:g.secret.id,version:g.version})).toThrow(/snack/);
  });
  it('retains the three-claim limit and stale-request protection',()=>{
    const g=createGame(0,'homesick');g.wrong=2;
    const r=g.candidates.find(r=>r.id!==g.secret.id)!;
    act(g,{type:'claim',snack:SNACKS[r.a],version:0});expect(g.status).toBe('lost');
    expect(view(g).favourite).toEqual(SNACKS[g.secret.a]);
    expect(()=>act(g,{type:'feed',snack:SNACKS[0],version:0})).toThrow(/changed/);
    expect(()=>act(g,{type:'feed',snack:SNACKS[0],version:g.version})).toThrow(/finished/);
  });
  it('restores candidate favourites and isolates progress from the mixed menu',()=>{
    const g=createGame(0,'homesick');act(g,{type:'feed',snack:view(g).suggestedSnack,version:0});
    const restored=restoreGame(createGame(0,'homesick'),packGame(g));
    expect(view(restored)).toEqual(view(g));expect(restored.candidates.map(r=>r.id)).toEqual(g.candidates.map(r=>r.id));
    expect(createGame(0,'mixed').feeds).toBe(0);
  });
  it('supports three authored cravings without exposing the answer',()=>{
    for(let i=0;i<3;i++){
      const g=createGame(i,'homesick');expect(g.candidates).toHaveLength(27);
      expect(g.candidates.some(r=>r.id===g.secret.id)).toBe(true);
      expect(JSON.stringify(view(g))).not.toContain(g.secret.id);
    }
    expect(()=>createGame(3,'homesick')).toThrow();
  });
});
