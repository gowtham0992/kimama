import type {ObjectId} from './scenes';
export type Choice='try'|'gentle'|'watch';
export type GardenPet={id:string;name:string;username:string;temperament?:'bold'|'shy'|'gentle';available:boolean;status:string};
export type GardenView={day:string;object:ObjectId;counts:Record<Choice,number>;total:number;myChoice?:Choice;joined:boolean;canJoin:boolean;pets:GardenPet[]};
