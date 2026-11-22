import { describe, it, expect } from 'vitest';
import { RULES, SNACKS, accepts } from '../src/shared/rules';
import { createGame, act, view } from '../src/server/game';

describe('rule grammar', () => {
  it('has 294 unique truth tables and the declared family sizes', () => {
    expect(RULES).toHaveLength(294);
    expect(new Set(RULES.map(r => SNACKS.map(s => +accepts(r,s)).join(''))).size).toBe(294);
    expect(['IS','NOT','EITHER','BOTH','ONE','UNLESS'].map(f=>RULES.filter(r=>r.family===f).length)).toEqual([12,12,54,54,54,108]);
  });
});
describe('authoritative game', () => {
  it('does not expose the secret until the game ends', () => {
    const g=createGame(1); expect(view(g)).not.toHaveProperty('secret'); expect(JSON.stringify(view(g))).not.toContain(g.secret.id);
    expect(view(g).reveal).toBeNull();
    act(g,{type:'claim',ruleId:g.secret.id,version:0});
    expect(view(g).status).toBe('solved'); expect(view(g).airtight).toBe(false);
  });
  it('rejects stale actions without charging again', () => {
    const g=createGame(1);act(g,{type:'feed',snack:[2,2,2,2],version:0});
    expect(()=>act(g,{type:'feed',snack:[2,2,2,2],version:0})).toThrow(/changed/);
    expect(g.feeds).toBe(1);
  });
  it('makes contradictions free and charges 3 for a compatible wrong claim', () => {
    const g=createGame(1);const bad=RULES.find(r=>r.family===g.secret.family && g.observations.some(o=>accepts(r,o.snack)!==o.ate))!;
    act(g,{type:'claim',ruleId:bad.id,version:0});expect(g.wrong).toBe(0);
    const wrong=g.candidates.find(r=>r.id!==g.secret.id)!;const n=g.observations.length;
    act(g,{type:'claim',ruleId:wrong.id,version:g.version});
    expect(view(g).score).toBe(3);expect(g.observations).toHaveLength(n+1);
    const o=g.observations.at(-1)!;expect(accepts(wrong,o.snack)).not.toBe(o.ate);
  });
  it('ends after three wrong claims and prevents further play', () => {
    const g=createGame(1);g.wrong=2;
    act(g,{type:'claim',ruleId:g.candidates.find(r=>r.id!==g.secret.id)!.id,version:0});
    expect(g.status).toBe('lost');expect(view(g).reveal).not.toBeNull();
    expect(()=>act(g,{type:'feed',snack:[1,1,1,1],version:g.version})).toThrow(/finished/);
  });
  it('awards Airtight after observations isolate the true rule', () => {
    const g=createGame(1);
    for(const snack of SNACKS){if(g.candidates.length===1)break;act(g,{type:'feed',snack,version:g.version});}
    act(g,{type:'claim',ruleId:g.secret.id,version:g.version});expect(view(g).airtight).toBe(true);
  });
  it('rejects malformed snacks', () => {
    const g=createGame(0);expect(()=>act(g,{type:'feed',snack:[0,0,0,99],version:0})).toThrow(/snack/);
  });
});
