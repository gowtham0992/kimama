import { act, createGame, type Game } from './game';
import { accepts } from '../shared/rules';

export type StoredGame=Pick<Game,'observations'|'feeds'|'wrong'|'version'|'status'|'airtight'|'trail'|'notice'|'event'>;
export function packGame(game:Game):string{
  const {observations,feeds,wrong,version,status,airtight,trail,notice,event}=game;
  return JSON.stringify({observations,feeds,wrong,version,status,airtight,trail,notice,event} satisfies StoredGame);
}
export function restoreGame(base:Game,raw:string|undefined):Game{
  if(!raw)return base;
  const saved=JSON.parse(raw) as StoredGame;
  const game={...base,...saved};
  game.candidates=base.allowedRules.filter(r=>saved.observations.every(o=>accepts(r,o.snack)===o.ate));
  return game;
}
export interface StateStore {
  get(key:string):Promise<string|undefined>;
  watch(...keys:string[]):Promise<{multi():Promise<void>;set(key:string,value:string,options?:{expiration:Date}):Promise<unknown>;exec():Promise<unknown[]>;unwatch():Promise<unknown>;discard():Promise<unknown>}>;
}
export class StateConflict extends Error {}
export async function transition(store:StateStore,key:string,base:()=>Game,input:unknown):Promise<Game>{
  const tx=await store.watch(key);let started=false,finished=false;
  try{
    const game=restoreGame(base(),await store.get(key));
    act(game,input);
    await tx.multi();started=true;
    await tx.set(key,packGame(game),{expiration:new Date(Date.now()+90*86400000)});
    const result=await tx.exec();finished=true;
    if(result.length!==1||result[0]!=='OK')throw new StateConflict('Your game changed. Reload and try again.');
    return game;
  }finally{
    if(!finished){if(started)await tx.discard();else await tx.unwatch();}
  }
}
