import {it,expect} from 'vitest';
import {isPetLaunch} from '../src/shared/launch';
it('preserves untagged legacy posts and only opens the pet for an explicit pet tag',()=>{for(const data of [undefined,null,{}, {day:'2026-11-13'}, {mode:'mixed'}, {mode:'homesick'}, {mode:'classic'}])expect(isPetLaunch(data)).toBe(false);expect(isPetLaunch({mode:'pet'})).toBe(true);});
