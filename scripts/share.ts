// Draws one picture per daily object for link previews and compact-feed thumbnails, and the images for the app's listing.
// Everything comes from the game's own sprites. Run: node --import tsx scripts/share.ts
import {mkdirSync,writeFileSync} from 'node:fs';
import {OBJ,textPath,type Look} from '../src/client/px';
import {DAILY,OBJECTS,An} from '../src/shared/scenes';
import {Canvas,INK,PAPER,GAP,pet,text,width} from './canvas';

const LOOK:Look={shape:'bold',stage:'child',eyes:'wide',mouth:'o',mark:0,gx:2};
/** The scene every find begins with: the pet, the thing, a floor, and the question. */
function scene(W:number,H:number,g:number,object:string,title:string,foot:string):Canvas{
 const c=new Canvas(W,H,PAPER);c.grid(g,GAP);
 const cols=Math.floor(W/g),rows=Math.floor(H/g),floor=Math.round(rows*.68),head=3+7*2+3;
 // Header and rule, as on the handheld.
 text(c,title,Math.round((cols-width(title)*2)/2)*g,3*g,2*g);c.rect(0,head*g,W,g,INK);
 // The pet on the left, looking at the thing on the right, both standing on the floor line, clear of the rule above.
 const ps=Math.floor((floor-head-4)/20),art=OBJ[object],as=ps,aw=art[0].length*as,ah=art.length*as,petW=28*ps,gap=8,x0=Math.round((cols-(petW+gap+aw))/2);
 pet(c,LOOK,x0*g,(floor-20*ps)*g,ps*g);c.bits(art,(x0+petW+gap)*g,(floor-ah)*g,as*g,INK);
 c.rect(0,floor*g,W,g,INK);
 text(c,foot,Math.round((cols-width(foot)*2)/2)*g,(floor+5)*g,2*g);
 return c;
}
mkdirSync('src/client/public/share',{recursive:true});mkdirSync('brand',{recursive:true});
// 1200x630: the size link previews are cut to. Four dots of margin all round survives a square crop of the middle.
for(const id of DAILY){const name=OBJECTS[id].name;writeFileSync(`src/client/public/share/${id}.png`,scene(1200,630,5,id,An(name),'What will yours do?').png());}
// The listing: a wide feature image and a square tile, both the same scene with the name on it.
writeFileSync('brand/kimama-feature-1920x1080.png',scene(1920,1080,8,'boat','Kimama','A pet that reviews you').png());
{const S=1024,g=8,c=new Canvas(S,S,PAPER);c.grid(g,GAP);const cols=S/g,name='Kimama';
 c.path(textPath(name.toUpperCase(),0,0),Math.round((cols-width(name)*3)/2)*g,14*g,3*g,INK);
 pet(c,{shape:'bold',stage:'child',eyes:'low',mouth:'flat',mark:0},Math.round((cols-28*3)/2)*g,40*g,3*g);
 text(c,'**---',Math.round((cols-29*3)/2)*g,104*g,3*g);
 writeFileSync('brand/kimama-tile-1024.png',c.png());}
// Devpost's thumbnail is cut to 3:2 and shown small, so it carries only the idea: the pet, its rating of you, and what it said.
{const W=1440,H=960,g=8,c=new Canvas(W,H,PAPER);c.grid(g,GAP);
 pet(c,{shape:'bold',stage:'child',eyes:'low',mouth:'flat',mark:0},10*g,30*g,3*g);
 const x=102*g;c.path(textPath('KIMAMA',0,0),x,32*g,2*g,INK);text(c,'**---',x,54*g,2*g);text(c,'Have we met?',x,78*g,g);
 writeFileSync('brand/kimama-devpost-1440x960.png',c.png());}
console.log(`wrote ${DAILY.length} share pictures, the feature image, the tile and the Devpost thumbnail`);
