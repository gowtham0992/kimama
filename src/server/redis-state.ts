// The shape of the store the game writes through, and the error for two writers meeting. Devvit's Redis and the local stand-in both fit it.
export interface StateStore {
  get(key:string):Promise<string|undefined>;
  watch(...keys:string[]):Promise<{multi():Promise<void>;set(key:string,value:string,options?:{expiration:Date}):Promise<unknown>;exec():Promise<unknown[]>;unwatch():Promise<unknown>;discard():Promise<unknown>}>;
}
export class StateConflict extends Error {}
