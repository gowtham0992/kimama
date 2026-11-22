import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ClueRail} from '../src/client/ClueRail';
import {SNACKS,type Observation} from '../src/shared/rules';

it('renders every clue, with all four ingredient names, after a longer session',()=>{
  const observations:Observation[]=SNACKS.slice(0,12).map((snack,i)=>({snack,ate:i%2===0,source:i<2?'starter':'feed'}));
  const html=renderToStaticMarkup(<ClueRail observations={observations} selected={SNACKS[0]} onSelect={()=>{}}/>);
  expect((html.match(/aria-label="Clue /g)||[])).toHaveLength(12);
  expect(html).toContain('Clue 1:');expect(html).toContain('Clue 12:');
  expect(html).toContain('1 piece');expect(html).toContain('2 pieces');expect(html).toContain('cherry');
});
