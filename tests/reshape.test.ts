import { describe, expect, it } from 'vitest';
import { createGame, act, view } from '../src/server/game';
import { accepts, SNACKS } from '../src/shared/rules';

describe('discovery loop',()=>{
  it('starts mixed days with three possible frames and meaningful ambiguity',()=>{
    const g=createGame(0,'mixed');
    expect(view(g).families).toHaveLength(3);
    expect(g.candidates.length).toBeGreaterThanOrEqual(30);
    expect(g.candidates.length).toBeLessThanOrEqual(60);
    expect(g.observations[0].snack.filter((x,i)=>x!==g.observations[1].snack[i]).length).toBeGreaterThanOrEqual(3);
  });
  it('provides an unseen default snack so the first feed actually plays',()=>{
    for(let p=0;p<6;p++){
      const g=createGame(p,'mixed');const s=view(g).suggestedSnack;
      expect(g.observations.some(o=>o.snack.every((x,i)=>x===s[i]))).toBe(false);
      act(g,{type:'feed',snack:s,version:0});expect(g.feeds).toBe(1);
    }
  });
  it('records a wrong theory separately from Picky’s snack verdict',()=>{
    const g=createGame(0,'mixed');const wrong=g.candidates.find(r=>r.id!==g.secret.id)!;
    act(g,{type:'claim',ruleId:wrong.id,version:0});const e=view(g).event;
    expect(e.kind).toBe('wrong');expect(e.claim).toBeTruthy();expect(e.snack).toBeTruthy();
    expect(e.predicted).not.toBe(e.ate);expect(e.ate).toBe(accepts(g.secret,e.snack!));
  });
  it('points to the exact observed snack when a theory contradicts it',()=>{
    const g=createGame(0,'mixed');const r=g.allowedRules.find(r=>g.observations.some(o=>accepts(r,o.snack)!==o.ate))!;
    act(g,{type:'claim',ruleId:r.id,version:0});const e=view(g).event;
    expect(e.kind).toBe('contradiction');expect(e.observationIndex).toBeGreaterThanOrEqual(0);expect(g.wrong).toBe(0);
  });
  it('handles candidate sets larger than 31 without bitmask truncation',()=>{
    const g=createGame(0,'mixed');expect(g.candidates.length).toBeGreaterThan(31);
    for(const s of SNACKS){if(g.candidates.length===1)break;act(g,{type:'feed',snack:s,version:g.version});}
    expect(g.candidates).toHaveLength(1);expect(g.candidates[0].id).toBe(g.secret.id);
  });
  it('keeps every family viable across all six authored openings',()=>{
    for(let p=0;p<6;p++){
      const g=createGame(p,'mixed');
      for(const family of g.families)expect(g.candidates.filter(r=>r.family===family).length).toBeGreaterThanOrEqual(3);
      expect(g.par).toBeNull();
    }
  });
  it('offers an unseen snack on refresh after feeding the original suggestion',()=>{
    const g=createGame(0,'mixed');act(g,{type:'feed',snack:view(g).suggestedSnack,version:0});
    const next=view(g).suggestedSnack;
    expect(g.observations.some(o=>o.snack.every((v,i)=>v===next[i]))).toBe(false);
  });
  it('a deterministic balanced-feed strategy distinguishes every mixed craving in at most six feeds',()=>{
    function depth(rs:typeof g.candidates):number{
      if(rs.length<2)return 0;
      let best:{yes:typeof rs;no:typeof rs;cost:number}|undefined;
      for(const snack of SNACKS){
        const yes=rs.filter(r=>accepts(r,snack)),no=rs.filter(r=>!accepts(r,snack));
        if(!yes.length||!no.length)continue;
        const cost=Math.max(yes.length,no.length);
        if(!best||cost<best.cost)best={yes,no,cost};
      }
      if(!best)throw new Error('Indistinguishable rules');
      return 1+Math.max(depth(best.yes),depth(best.no));
    }
    const g=createGame(0,'mixed');
    for(let p=0;p<6;p++)expect(depth(createGame(p,'mixed').candidates)).toBeLessThanOrEqual(6);
  });
});
