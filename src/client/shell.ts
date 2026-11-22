// The case comes in six colours. Each pocket starts in the colour its pet was born into;
// tapping the name on the case changes it, and the choice is remembered on this device.
export const SHELLS:{name:string;vars:Record<string,string>}[]=[
 ['coral','#d9694f','#b24f3a','#ee8a70','#5c2418'],['mint','#6fb8a0','#4f9480','#96d4be','#1f4a3d'],['lemon','#e2be4c','#b79638','#f2d878','#5a4612'],
 ['lilac','#a48fd0','#8170ad','#c3b2e7','#372a5c'],['sky','#6ea6d6','#4f84b2','#95c4eb','#1d3d5c'],['milk','#e4dac4','#c2b79d','#f6efdf','#5a4c34'],
].map(([name,a,b,c,d])=>({name,vars:{'--shell':a,'--shell-dark':b,'--shell-light':c,'--label':d}}));
export function shellFor(bornAt:number|undefined):number{
 try{const s=localStorage.getItem('picky-shell');if(s!==null&&SHELLS[Number(s)])return Number(s);}catch{/* private mode */}
 return bornAt?Math.floor(bornAt/1000)%SHELLS.length:0;
}
export function saveShell(i:number){try{localStorage.setItem('picky-shell',String(i));}catch{/* private mode */}}
