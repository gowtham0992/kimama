import {expect,it} from 'vitest';
import {resolveSelection} from '../src/server/selection';

it('keeps the existing mixed daily save scope unchanged',()=>{
  expect(resolveSelection({}, {schema:3,day:'2026-11-13',puzzle:0})).toEqual({mode:'mixed',puzzle:0,daily:'2026-11-13',scope:'daily:2026-11-13'});
});
it('homesick daily and practice saves cannot collide with mixed saves',()=>{
  const a=resolveSelection({}, {schema:4,mode:'homesick',day:'2026-11-13',puzzle:1});
  const b=resolveSelection({mode:'homesick',puzzle:'1',practice:'1'}, {schema:3,day:'2026-11-13',puzzle:0});
  expect(a.mode).toBe('homesick');expect(a.scope).toBe('daily:homesick:2026-11-13');
  expect(b.scope).toBe('practice:homesick:1');expect(b.daily).toBeNull();
});
it('rejects invalid modes, indexes, and an out-of-range Homesick puzzle',()=>{
  for(const q of [{mode:'fake'},{mode:'homesick',puzzle:'3'},{mode:'homesick',puzzle:'-1'},{mode:'mixed',puzzle:'NaN'}])expect(()=>resolveSelection(q)).toThrow();
});
it('the post chooses the daily game unless a player explicitly requests practice',()=>{
  expect(resolveSelection({mode:'mixed',puzzle:'4'}, {schema:4,mode:'homesick',day:'2026-11-13',puzzle:0}).mode).toBe('homesick');
  expect(resolveSelection({mode:'mixed',puzzle:'4',practice:'1'}, {schema:4,mode:'homesick',day:'2026-11-13',puzzle:0}).mode).toBe('mixed');
});
