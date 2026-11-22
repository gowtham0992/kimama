// Early deduction posts have no mode tag. Never reinterpret those existing posts.
export function isPetLaunch(data:unknown):boolean{return !!data&&typeof data==='object'&&'mode' in data&&data.mode==='pet';}
/** Who made it, shown on the start screen as the hackathon's guidance asks. One place to change or blank. */
export const MAKER='Fun-Disaster-8179';
