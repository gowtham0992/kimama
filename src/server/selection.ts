import {PUZZLE_COUNTS,type Mode} from '../shared/rules';
export function resolveSelection(query:{mode?:string;puzzle?:string;practice?:string},postData?:unknown):{mode:Mode;puzzle:number;daily:string|null;scope:string}{
  const mode=query.mode??'mixed',puzzle=Number(query.puzzle??0);
  if(!(mode==='mixed'||mode==='classic'||mode==='homesick')||!Number.isInteger(puzzle)||puzzle<0||puzzle>=PUZZLE_COUNTS[mode])throw new RangeError('Unknown craving.');
  const data=postData as {schema?:number;day?:string;puzzle?:number;mode?:string}|undefined;
  const postMode:Mode=data?.schema===4&&data.mode==='homesick'?'homesick':'mixed';
  const daily=query.practice!=='1'&&(data?.schema===3||data?.schema===4)&&typeof data.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(data.day)&&Number.isFinite(Date.parse(data.day))&&Number.isInteger(data.puzzle)&&data.puzzle!>=0&&data.puzzle!<PUZZLE_COUNTS[postMode];
  if(daily)return {mode:postMode,puzzle:data!.puzzle!,daily:data!.day!,scope:postMode==='homesick'?`daily:homesick:${data!.day}`:`daily:${data!.day}`};
  return {mode,puzzle,daily:null,scope:`practice:${mode}:${puzzle}`};
}
