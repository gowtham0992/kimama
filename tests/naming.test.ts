import {expect,it} from 'vitest';
import {VALUES,TRAITS,snackName,RULES,sentence} from '../src/shared/rules';
it('uses the same ingredient names in chips, clues and sentences',()=>{
  expect(VALUES[2][2]).toBe('cherry');
  expect([...VALUES[3]]).toEqual(['1 piece','2 pieces','3 pieces']);
  expect(snackName([0,0,2,0])).toBe('1 piece round tomato, cherry');
  expect(TRAITS[11].label).toBe('3 pieces');
  expect(sentence(RULES.find(r=>r.id==='EITHER:0:8')!)).toContain('cherry');
  expect(sentence(RULES.find(r=>r.id==='EITHER:0:8')!)).not.toContain('cherry-topped');
});
