import type {Pet} from './pet';
import {ACTS, traitsFor, type ActKind} from './autonomy';
import {pickView} from './views';

export type ObjectId='windmill'|'leaf'|'bell'|'spool'|'pebble'|'umbrella'|'boat'|'acorn'|'feather'|'snail'|'puddle'|'kite'|'mushroom'|'button'|'dandelion'|'shell'|'sock'|'ice'|'ladybird'|'bag'|'plane'|'key'|'can'|'mitten'|'petal'|'bee'|'caterpillar'|'whistle'|'musicbox'|'duck';
export type ScenePet={mark?:number;name:string;stage:'baby'|'child'|'grown';temperament:Pet['temperament'];signature:string|null;bold:number};
export type Beat={text:string;pose:string;otherPose?:string;motion:'arrive'|'notice'|'play'|'hide'|'share'|'race'|'bye'|'keep'|'shelter'|'rest';duration:number};
export type Choice='try'|'gentle'|'watch';
/** What sort of thing a find is. A pet has a habit with each sort, and that is what an owner learns. */
export type Kind='moving'|'still'|'wet'|'soft'|'alive'|'noisy';
export type PetScene={id:string;kind:'daily'|'playdate';at:number;title:string;object:ObjectId;actors:ScenePet[];beats:Beat[];choice?:'try'|'gentle'|'watch';guess?:'try'|'gentle'|'watch';guessed?:boolean;tell?:'try'|'gentle'|'watch';cue?:'try'|'gentle'|'watch';sure?:boolean;habit?:Choice;mind?:Mind;noted?:boolean;was?:number;kept?:boolean;playedAt?:number;streak?:number;view?:string;viewNew?:boolean;awaitingChoice?:boolean;summary?:string;effect?:string;standing?:string;you?:number;alreadyRewarded?:boolean};
export type SceneState={encounterSceneDay?:string;scenes?:PetScene[];sceneAlbum?:PetScene[];relations?:Record<string,{score:number;visits:number;name:string}>;copiedHabitDay?:string;reads?:{streak:number;best:number;right:number;total:number;lastDay?:string};picks?:('try'|'gentle'|'watch')[];finds?:Partial<Record<ObjectId,'try'|'gentle'|'watch'>>;views?:string[];kinds?:Partial<Record<Kind,Choice[]>>};
export const OBJECTS:Record<ObjectId,{name:string;arrival:string;try:string;gentle:string;watch:string;habit:ActKind}>={
 windmill:{name:'paper windmill',arrival:'A paper windmill catches the breeze. It turns, then stops.',try:'Blow on it',gentle:'Hold it steady',watch:'Wait for wind',habit:'window'},
 leaf:{name:'fallen leaf',arrival:'A curled leaf skitters past. Something is moving without feet.',try:'Chase it',gentle:'Make a soft nest',watch:'Watch it drift',habit:'toy'},
 bell:{name:'little bell',arrival:'A little bell waits on the step. One touch: ting.',try:'Ring it',gentle:'Cup it softly',watch:'Just listen',habit:'greet'},
 spool:{name:'wooden spool',arrival:'A wooden spool rolls in a crooked circle, trailing a thread.',try:'Send it rolling',gentle:'Wind it neatly',watch:'Watch it roll',habit:'toy'},
 pebble:{name:'smooth pebble',arrival:'Rain has left a smooth pebble, shining like a tiny moon.',try:'Flip it over',gentle:'Tidy it away',watch:'Sit and watch it',habit:'tidy'},
 umbrella:{name:'leaf umbrella',arrival:'Drip. Drop. A broad leaf makes a very small roof.',try:'Dash into rain',gentle:'Share the roof',watch:'Stay and listen',habit:'greet'},
 boat:{name:'paper boat',arrival:'A paper boat bobs in a puddle, waiting for a captain.',try:'Launch it',gentle:'Keep it safe',watch:'Watch it float',habit:'window'},
 acorn:{name:'acorn',arrival:'An acorn drops with a tock and wobbles to a stop.',try:'Crack it',gentle:'Tuck it away',watch:'Keep watch',habit:'toy'},
 feather:{name:'feather',arrival:'A feather seesaws down, in no hurry at all.',try:'Blow it back up',gentle:'Wear it gently',watch:'Watch it fall',habit:'window'},
 snail:{name:'slow snail',arrival:'A snail crosses the step, carrying its whole house.',try:'Race it',gentle:'Clear its path',watch:'Wait and watch',habit:'greet'},
 puddle:{name:'puddle',arrival:'Last night left a puddle with a small sky in it.',try:'Jump in',gentle:'Touch it softly',watch:'Just look in',habit:'toy'},
 kite:{name:'lost kite',arrival:'A lost kite lies on the grass, its string in a knot.',try:'Fly it',gentle:'Untangle it',watch:'Watch its tail',habit:'window'},
 mushroom:{name:'mushroom',arrival:'A mushroom has come up overnight, exactly pet-sized.',try:'Bounce on it',gentle:'Tidy it up',watch:'Watch from afar',habit:'tidy'},
 button:{name:'lost button',arrival:'A lost button lies in the dust, four holes staring up.',try:'Spin it',gentle:'Polish it',watch:'Peer through it',habit:'tidy'},
 dandelion:{name:'dandelion clock',arrival:'A dandelion clock stands ready, every seed in place.',try:'Blow it all away',gentle:'Carry it home',watch:'Count the seeds',habit:'window'},
 shell:{name:'spiral shell',arrival:'A spiral shell has turned up, far from any sea.',try:'Roll it downhill',gentle:'Hold it close',watch:'Wait politely',habit:'greet'},
 sock:{name:'odd sock',arrival:'One sock, no partner. It smells faintly of you.',try:'Wrestle it',gentle:'Snuggle into it',watch:'Sniff and wait',habit:'greet'},
 ice:{name:'ice cube',arrival:'An ice cube skates across the floor, shrinking as it goes.',try:'Bat it about',gentle:'Lick it gently',watch:'Watch it melt',habit:'toy'},
 ladybird:{name:'ladybird',arrival:'A ladybird lands and folds its wings away like a tiny coat.',try:'Chase after it',gentle:'Offer a ride',watch:'Count the spots',habit:'greet'},
 bag:{name:'paper bag',arrival:'A paper bag rustles in the corner, open at one end.',try:'Charge in',gentle:'Fold it neatly',watch:'Listen from afar',habit:'toy'},
 plane:{name:'paper plane',arrival:'A paper plane glides in and lands nose-first.',try:'Throw it again',gentle:'Smooth the wings',watch:'Watch its path',habit:'window'},
 key:{name:'old key',arrival:'An old key lies on the mat. It opens nothing here.',try:'Try every door',gentle:'Put it away safe',watch:'Peer at it',habit:'tidy'},
 can:{name:'watering can',arrival:'Someone left a watering can out. It is half full.',try:'Tip it over',gentle:'Water the plant',watch:'Listen to it',habit:'tidy'},
 mitten:{name:'lost mitten',arrival:'One small mitten, still warm on the inside.',try:'Wear it as a hat',gentle:'Keep it warm',watch:'Wait for a hand',habit:'greet'},
 petal:{name:'pink petal',arrival:'A single petal drifts in, pink at the edge.',try:'Jump for it',gentle:'Press it to keep',watch:'Watch it land',habit:'window'},
 bee:{name:'bumblebee',arrival:'A bumblebee bumps against the glass. Twice.',try:'Bat at it',gentle:'Open the window',watch:'Hum from afar',habit:'greet'},
 caterpillar:{name:'caterpillar',arrival:'A caterpillar is eating a leaf, at its own pace.',try:'Poke it',gentle:'Bring it leaves',watch:'Count its feet',habit:'greet'},
 whistle:{name:'tin whistle',arrival:'A tin whistle lies on the step, waiting for breath.',try:'Blow it hard',gentle:'Play it softly',watch:'Wait for a tune',habit:'toy'},
 musicbox:{name:'music box',arrival:'A tiny music box plays three notes and stops.',try:'Wind it right up',gentle:'Let it rest',watch:'Wait for more',habit:'window'},
 duck:{name:'rubber duck',arrival:'A rubber duck squeaks whenever the wind leans on it.',try:'Squeeze it',gentle:'Squeak it softly',watch:'Stare from afar',habit:'toy'},
};
export const KIND:Record<ObjectId,Kind>={plane:'moving',key:'still',can:'wet',mitten:'soft',petal:'soft',bee:'alive',caterpillar:'alive',whistle:'noisy',musicbox:'noisy',duck:'noisy',windmill:'moving',leaf:'moving',spool:'moving',kite:'moving',pebble:'still',acorn:'still',mushroom:'still',button:'still',umbrella:'wet',boat:'wet',puddle:'wet',ice:'wet',feather:'soft',dandelion:'soft',sock:'soft',snail:'alive',ladybird:'alive',shell:'alive',bell:'noisy',bag:'noisy'};
export const KIND_NAME:Record<Kind,string>={moving:'Moving things',still:'Still things',wet:'Wet things',soft:'Soft things',alive:'Living things',noisy:'Noisy things'};
export const SIGN:Record<Choice,string>={try:'!',gentle:'?',watch:'…'};
/** The order the three answers are listed in: different each day, the same for everyone. The answers carry no sign of which is which,
 * so telling the bold one from the careful one from the wary one is part of the read. */
export function answerOrder(object:ObjectId,at:number):[Choice,Choice,Choice] {
 const all:[Choice,Choice,Choice][]=[['try','gentle','watch'],['try','watch','gentle'],['gentle','try','watch'],['gentle','watch','try'],['watch','try','gentle'],['watch','gentle','try']];
 return all[hash(`${dayAt(at)}:${object}:order`)%6];
}
/** A habit, as the notes put it: "Goes straight at moving things." */
export const HABIT_SAYS:Record<Choice,string>={try:'Goes straight at',gentle:'Is gentle with',watch:'Hangs back from'};
/** "a lost kite", "an odd sock". `An` starts a sentence. */
export const an=(name:string)=>(/^[aeiou]/i.test(name)?'an ':'a ')+name,An=(name:string)=>{const s=an(name);return s[0].toUpperCase()+s.slice(1);};
export const dayAt=(now:number)=>new Date(now).toISOString().slice(0,10);
// Thirty, five of each sort. The first sixteen keep their slots so the day the cycle grew kept its object (Nov 18, 2026: the kite);
// the ten new ones are interleaved after it, so no sort comes round two days running.
export const DAILY:ObjectId[]=['windmill','acorn','leaf','snail','bell','puddle','spool','feather','pebble','mushroom','umbrella','button','boat','dandelion','shell','kite','sock','key','bee','whistle','can','plane','petal','ladybird','musicbox','ice','duck','caterpillar','mitten','bag'];
export function dailyObject(now:number):ObjectId{return DAILY[((Math.floor(now/86400000)%DAILY.length)+DAILY.length)%DAILY.length];}
function actor(p:Pet,now:number):ScenePet {const age=(now-(p.hatchedAt??now))/3600000;return{mark:Math.floor(p.bornAt/7)%6,name:p.name,stage:age>=72&&p.careDays.length>=3?'grown':age>=18&&p.careDays.length>=2?'child':'baby',temperament:p.temperament,signature:Object.entries(p.habits??{}).filter(([,v])=>v>=3).sort((a,b)=>b[1]-a[1])[0]?.[0]??null,bold:traitsFor(p).bold};}
const beat=(text:string,pose:string,motion:Beat['motion'],otherPose?:string):Beat=>({text,pose,motion,otherPose,duration:6000});
function remember(p:Pet,text:string,now:number){p.journal=[...p.journal,{at:now,text}].slice(-12);}
function learn(p:Pet,habit:ActKind,now:number):boolean {
 const day=dayAt(now);p.learning=p.learning?.day===day?p.learning:{day,count:0};
 if(p.learning.count>=5)return false;
 p.learning.count++;p.habits={...p.habits,[habit]:Math.min(5,(p.habits?.[habit]??0)+1)};return true;
}
export function hasDailyScene(p:Pet,now:number):boolean {return p.encounterSceneDay===dayAt(now)||[...(p.scenes??[]),...(p.sceneAlbum??[])].some(s=>s.kind==='daily'&&dayAt(s.at)===dayAt(now));}
export function startDaily(p:Pet,now:number):Pet {
 if(hasDailyScene(p,now))throw new Error('Your pet already explored today. A new find arrives at midnight UTC.');
 const n=structuredClone(p),object=dailyObject(now),o=OBJECTS[object],t=traitsFor(n),read=dailyRead(n,object,now);
 // The words say what the body says, so the read works for someone who cannot see the screen. On a mood day they add the smaller sign.
 const stance={try:`${n.name} leans right in. That definitely deserves a closer look.`,gentle:`${n.name} circles it carefully. There must be a proper way to do this.`,watch:`${n.name} keeps one foot behind the door. Curious, but not quite ready.`}[read.pose];
 // Care shows: a fussed-over pet is braver, a told-off one hangs back. Saying so teaches that care moves the odds.
 const m=careMood(n,now),sign=m>0?' All that fuss has made it brave.':m<0?' It has not forgotten being told off.':'';
 // A first find comes with one thing known: the egg's note, which is the pet's true habit with today's sort of thing. It goes into the notes as their first mark.
 const first=(n.reads?.total??0)<1&&!Object.keys(n.kinds??{}).length,k=KIND[object];
 const note=first?` The egg came with a note: ${HABIT_SAYS[read.habit]} ${KIND_NAME[k].toLowerCase()}.`:n.kinds?.[k]?.length?'':` You have no note on ${KIND_NAME[k].toLowerCase()} yet.`;
 if(first)n.kinds={[k]:[read.habit]};
 // The third sign, in the same words every day so it can be learned: which of the other two it goes by.
 const mind={restless:' It is restless today.',settled:' It is settled today.',torn:' It is in two minds today.'}[read.mind];
 const reaction=stance+sign+mind+note;
 const alreadyRewarded=n.encounterDay===dayAt(now);
 n.encounterDay=dayAt(now);n.encounterSceneDay=n.encounterDay;n.scenes=[{id:`daily:${n.encounterDay}:${n.version}`,kind:'daily',at:now,title:o.name,object,actors:[actor(n,now)],alreadyRewarded,awaitingChoice:true,tell:read.pose,mind:read.mind,beats:[beat(o.arrival,'watch','arrive'),beat(reaction,t.bold< -2?'turn':'window','notice')]}];
 n.version++;return n;
}
const outcomes:Record<ObjectId,{try:[string,string];gentle:[string,string];watch:string}>={
 windmill:{try:['puffs too hard. The windmill spins; then comes a delighted second puff.','tries a tiny breath. One turn! It comes closer for another.'],gentle:['holds the stem while you turn it. Soon it takes your place.','touches the still blades first. Moving things are less scary together.'],watch:'follows each turn with its nose, then waits patiently for the wind.'},
 leaf:{try:['pounces. The leaf escapes. Now it is a very serious chase.','waits for the leaf to stop, then follows it one careful step.'],gentle:['folds the leaf around its feet. A nest, exactly its size.','smooths the curled edge, then settles into the little nest.'],watch:'lets the leaf pass, then quietly follows its shadow.'},
 bell:{try:['rings it twice, then answers with a little hop.','flinches at the first ring. The second is a softer, deliberate tap.'],gentle:['cups the bell. A soft ting becomes your private greeting.','holds the bell against its cheek. This quiet sound is just right.'],watch:'tilts its head at the fading ring. When it is quiet, it listens again.'},
 spool:{try:['sends it rolling, chases it, and brings it straight back.','nudges it a finger-width. Then a little further.'],gentle:['winds the thread into a surprisingly tidy coil.','pats the thread flat, placing each loop beside the last.'],watch:'watches the thread unwind and catches the very last loop.'},
 pebble:{try:['flips it over. A muddy underside! A tiny discovery worth showing you.','tests it with one toe, then finds a dry side underneath.'],gentle:['puts it on the shelf, steps back, then moves it just a little.','makes a neat space for it. Finally, something that stays put.'],watch:'sits beside its little moon until both are warm in the sun.'},
 umbrella:{try:['dashes into the drizzle, then shakes a shower off its ears.','catches one drop on its nose and hurries back under the leaf.'],gentle:['lifts the leaf for you. There is room for two.','shuffles closer so you both fit beneath the leaf.'],watch:'counts the drops with small nods. There is no hurry to go anywhere.'},
 boat:{try:['pushes the boat into the puddle and runs along the bank.','nudges it into the shallows, following safely along the edge.'],gentle:['holds the boat by a thread. A little voyage, a safe way home.','keeps one paw at the shore until the rocking feels familiar.'],watch:'watches the boat return on a ripple. Some things come back on their own.'},
 acorn:{try:['bites down. Nothing. Bites again. The acorn wins, for now.','taps it with one foot, then jumps at its own tock.'],gentle:['digs a neat hole and pats the earth flat. A secret, kept.','tucks it under a leaf and checks twice that it is hidden.'],watch:'sits beside it like a very small guard on a very long shift.'},
 feather:{try:['huffs it back into the air and chases it in circles.','breathes on it once. It lifts. That was enough excitement.'],gentle:['balances it on its head and walks very, very straight.','tucks it behind one ear and keeps touching it to check.'],watch:'tracks it all the way down, nose moving in slow zigzags.'},
 snail:{try:['races it. Wins easily. Races it again to be sure.','walks beside it, one slow step for every ten of its own.'],gentle:['offers its back. The snail accepts, eventually.','moves a twig out of its way and steps politely back.'],watch:'waits the entire crossing. Some things cannot be hurried.'},
 puddle:{try:['jumps in with every foot at once. The sky goes everywhere.','steps in by accident and stands very still, deciding.'],gentle:['touches the surface and watches the rings travel out.','dabs one toe and shakes it dry for a long time.'],watch:'finds another small face looking up, and tilts its head. So does the other.'},
 kite:{try:['runs. The kite hops, lifts, and drags it three steps along.','pulls the string once. The kite twitches. It lets go.'],gentle:['works the knot loose, loop by patient loop.','lays the tail out straight, so it looks less sad.'],watch:'watches the tail stir whenever the wind remembers it.'},
 mushroom:{try:['bounces on the cap. It is springier than it looks.','pats the cap. It wobbles. It pats it again, softer.'],gentle:['brushes the cap clean, then sits underneath. A roof that fits.','tidies the grass around the stem into a little garden.'],watch:'studies every side of it from a safe distance. Twice.'},
 button:{try:['flicks it. It spins, hums, and falls flat. Again!','nudges it over to see if the other side is different.'],gentle:['polishes it on its tummy until it shines.','carries it somewhere it will not be stepped on.'],watch:'looks at you through one of the holes. Hello in there.'},
 dandelion:{try:['blows. The whole clock leaves at once, and it chases the lot.','sneezes. Three seeds escape. It looks guilty.'],gentle:['carries it home without losing a single seed.','shields it from the breeze with its whole body.'],watch:'counts the seeds, loses count, and happily starts again.'},
 shell:{try:['rolls it downhill and gallops after it.','turns it over carefully, in case somebody is home.'],gentle:['holds it to one ear and goes very still. The sea is in there.','hums into it, and listens to the hum come back.'],watch:'waits politely for whoever lives inside. Nobody comes out.'},
 sock:{try:['attacks the sock. The sock, to be fair, started it.','pulls it a little way, then checks you are not cross.'],gentle:['climbs inside until only its ears show.','folds it over twice and sleeps on it like a pillow.'],watch:'sniffs it for a long while, and looks toward the door.'},
 ice:{try:['bats it across the floor and slides after it.','touches it and pulls back. Cold! It touches it again.'],gentle:['licks it carefully. Its tongue does not stick. Mostly.','gives it one small lick, then moves it into the sun to keep warm. Oh.'],watch:'watches it get smaller, and looks at the puddle for a while.'},
 ladybird:{try:['chases it up a grass stem, which bends, slowly, all the way down.','trots one step behind it, stopping whenever it stops.'],gentle:['holds very still while it walks the length of its back.','lowers its head to make a bridge to the next leaf.'],watch:'counts the spots twice and gets a different number.'},
 bag:{try:['runs straight in. The bag runs around the room for a while.','pokes its head in, and reverses out twice as fast.'],gentle:['folds it flat, corner to corner, and sits on it, pleased with the crackle.','folds the top over neatly, in case of drafts.'],watch:'listens to it crackle by itself. Suspicious. Very suspicious.'},
 plane:{try:['throws it back into the air. It loops once and lands on its head.','pushes it along the floor, which is nearly flying.'],gentle:['smooths each wing and sets it down facing the window.','straightens one bent corner with its nose, very slowly.'],watch:'traces the line it flew in, over and over, with its eyes.'},
 key:{try:['tries it in every door. None of them. It tries again.','pushes it toward the door, then looks at you to finish.'],gentle:['hangs it on the hook by the door, where keys go.','tucks it back under the mat. Just in case.'],watch:'peers at it from the mat, wondering about the room it opens.'},
 can:{try:['tips it over. The floor gets watered. So do its feet.','tilts it one dot and watches a single drop fall.'],gentle:['waters the plant on the sill. The plant does not say thank you.','drags it to the plant, then waits for you to do the pouring.'],watch:'sits beside it and listens to the water settle.'},
 mitten:{try:['wears it as a hat. It covers both eyes. It wears it anyway.','gets one ear inside, decides that is enough, and stays.'],gentle:['curls up inside it. Only its tail is still out.','pats it flat and keeps it warm with its tummy.'],watch:'waits beside it for the hand that must be coming back.'},
 petal:{try:['jumps for it and catches it on its nose, first try.','reaches for it and misses. It lands on its head anyway.'],gentle:['presses it flat under a pebble, to keep.','lays it flat on the sill by the plant, and puts a pebble on it.'],watch:'watches it all the way down, and a little after it lands.'},
 bee:{try:['bats at it through the glass. The bee is not impressed.','puffs up at it, then hides behind the curtain.'],gentle:['nudges the window open. The bee leaves without a word.','waits by the latch until you open it. The bee goes.'],watch:'hums along, slightly out of tune, until the bee gives up.'},
 caterpillar:{try:['pokes it. It curls into a ring. It pokes the ring.','gets very close, then very far, then close again.'],gentle:['brings it three leaves. It eats none of them, slowly.','puts one leaf down beside it and backs away politely.'],watch:'counts its feet, loses count, and agrees it has a lot.'},
 whistle:{try:['blows it hard. The whole street hears. It looks proud.','blows once, very small, and jumps at the noise.'],gentle:['hums into it. It sounds like a kettle thinking.','breathes into it so softly that nothing comes out. Good.'],watch:'waits for it to play a tune by itself. It might yet.'},
 musicbox:{try:['winds it all the way. Three notes become seven.','turns the key one click and listens to one note.'],gentle:['closes the lid so the tune can rest.','sits on the lid, so nobody can let the tune out.'],watch:'waits for the fourth note. It waits a long time.'},
 duck:{try:['squeezes it. It squeaks. It squeezes it again. And again.','touches it. It squeaks. It does not touch it again.'],gentle:['squeaks it softly, once, like a hello.','gives it a bath in the water bowl. It squeaks thanks.'],watch:'stares it down. The duck blinks first. Probably.'},
};
const hash=(t:string)=>{let h=2166136261;for(const c of t)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
const top=(w:Record<Choice,number>):Choice=>w.try>=w.gentle&&w.try>=w.watch?'try':w.gentle>=w.watch?'gentle':'watch';
/** How today's care has left it: above zero braver (petted, treated, told yes), below zero wary (told no). */
export function careMood(p:Pet,now:number):number {const d=p.today?.day===dayAt(now)?p.today:null;if(!d)return 0;return Math.min(9,(d.pets+d.yes+d.snacks)*3)-Math.min(9,d.no*4.5);}
/** What this pet feels like doing with today's find: its nature and training, today's care, and a little mood of the day. Its body shows this. */
export function petChoice(p:Pet,object:ObjectId,now:number,usual=false):Choice {
 const t=traitsFor(p),h=p.habits??{},o=OBJECTS[object],m=usual?0:careMood(p,now);
 let seed=0;for(const c of `${p.bornAt}:${dayAt(now)}:${object}`)seed=(seed*31+c.charCodeAt(0))>>>0;
 // Character leans it one way; the day decides. `usual` is the lean alone, with no day in it.
 const day=(k:number)=>usual?10:(seed>>>(k*5))%21;
 return top({try:10+t.bold*1.2+(h[o.habit]??0)*2+day(0)+Math.max(0,m),gentle:10+t.social+t.selective+(h.greet??0)+(h.tidy??0)+day(1),watch:10-t.bold*1.2+day(2)+Math.max(0,-m)});
}
/** Its habit with a sort of thing. Fixed for life by who it was born as: not by training, not by time. That is what makes it learnable. */
export function habitFor(p:Pet,kind:Kind):Choice {
 // (The era is a leftover of a version where habits drifted. It is pinned to the birthday so pets hatched then keep the habits they had.)
 const era=Math.floor((Math.floor(p.bornAt/86400000)+hash(`${p.bornAt}:${kind}`)%28)/28),seed=hash(`${p.bornAt}:${kind}:${era}`),b=p.temperament==='bold'?4:p.temperament==='shy'?-4:0;
 return top({try:10+b*1.2+seed%21,gentle:10+(p.temperament==='gentle'?4:p.temperament==='shy'?3:-2)+(seed>>>5)%21,watch:10-b*1.2+(seed>>>10)%21});
}
/** The third sign: which of the other two it goes by today. Restless, it does as it pleases. Settled, it keeps to its habit.
 * Once an owner has three finds behind them, about one day in five it is in two minds, and says so. That is the only day anything is left to chance,
 * and the owner is told before they bet. */
export type Mind='restless'|'settled'|'torn';
export function mindOf(p:Pet,object:ObjectId,now:number):Mind {
 const h=hash(`${dayAt(now)}:${p.bornAt}:${object}:mind`);
 if((p.reads?.total??0)>=3&&h%5===0)return 'torn';
 return (h>>>4)%2?'restless':'settled';
}
/** The read, in three signs, and all three are on the screen. Its body shows what it feels like doing (`pose`). Its notes say what it does with
 * this sort of thing (`habit`). Its mind (`mindOf`) says which of those it goes by today. Nothing is decided out of sight: a wrong guess is a misread,
 * a note the owner does not have yet, or a day the pet said it was in two minds. That holds from the first find, where the egg's note gives the habit,
 * because most people who try the game play exactly one day, and that day should be the whole game.
 * A find already under way keeps the stance and mind it was started with (`scene`), so care given in between cannot move the answer. */
export function dailyRead(p:Pet,object:ObjectId,now:number,scene?:{tell?:Choice;mind?:Mind}):{will:Choice;pose:Choice;habit:Choice;mind:Mind} {
 const pose=scene?.tell??petChoice(p,object,now),habit=habitFor(p,KIND[object]),mind=scene?.mind??mindOf(p,object,now);
 const will=pose===habit||mind==='restless'?pose:mind==='settled'?habit:hash(`${dayAt(now)}:${p.bornAt}:${object}:mood`)%2?pose:habit;
 return{will,pose,habit,mind};
}
/** One sentence for the comment thread, built only from authored text. */
export function tellLine(p:Pet,now:number):string|null {
 const s=[...(p.scenes??[]),...(p.sceneAlbum??[])].find(s=>s.kind==='daily'&&dayAt(s.at)===dayAt(now)&&s.choice&&s.summary);if(!s)return null;
 const streak=s.streak??0;
 const why=!s.habit||s.tell===s.habit?'':s.mind==='restless'?' It was restless, and did as it pleased.':s.mind==='settled'?' It was settled, and kept to its habit.':s.mind==='torn'?` It was in two minds, and went with its ${s.choice===s.habit?'habit':'mood'}.`:s.choice===s.habit?' Its habit beat its mood.':s.choice===s.tell?' Its mood beat its habit.':'';
 return `${s.summary} ${p.name} is a ${p.temperament??'gentle'} one.${why}${s.guess?(s.guessed?(s.sure?' I was sure, and I was right.':streak>1?` I called it. Streak: ${streak}.`:' I called it.'):s.sure?' I was sure. I was wrong.':' I did not see that coming.'):''} What did yours do?`;
}
export function chooseDaily(p:Pet,input:Record<string,unknown>,now:number):Pet {
 const n=structuredClone(p),s=n.scenes?.[0];
 if(!s||s.id!==input.sceneId||s.kind!=='daily'||!s.awaitingChoice)throw new Error('That pet scene has changed. Reopen it to continue.');
 // The pet decides. The owner only guesses first; knowing your pet is the game.
 const guess=input.guess==='try'||input.guess==='gentle'||input.guess==='watch'?input.guess:undefined;
 const read=dailyRead(n,s.object,s.at,s),picked=guess?read.will:input.choice,sure=!!guess&&input.sure===true;
 if(picked!=='try'&&picked!=='gentle'&&picked!=='watch')throw new Error('Choose a pet scene response.');
 const choice=picked,t=traitsFor(n),o=OBJECTS[s.object],r=outcomes[s.object];
 if(guess){s.guess=guess;s.guessed=guess===choice;if(sure)s.sure=true;s.habit=read.habit;if(s.guessed&&!s.alreadyRewarded)n.bond=Math.min(100,n.bond+3);
  // The streak. A hunch is safe: right adds one, wrong costs nothing. Being sure is the wager: right adds two, wrong loses the lot.
  // Absence is not the wager. One missed day is forgiven, and the pet says so; two in a row start again.
  const r=n.reads??{streak:0,best:0,right:0,total:0},gap=r.lastDay===dayAt(now-86400000)?0:r.lastDay===dayAt(now-2*86400000)?1:2,carried=gap<2?r.streak:0,streak=s.guessed?carried+(sure?2:1):sure?0:carried;
  n.reads={streak,best:Math.max(r.best,streak),right:r.right+(s.guessed?1:0),total:r.total+1,lastDay:dayAt(now)};s.streak=streak;s.was=carried;if(gap===1&&carried>0)s.kept=true;}
 n.picks=[...(n.picks??[]),choice as 'try'|'gentle'|'watch'].slice(-7);
 // The stamp card: one square per kind of find, kept for good.
 n.finds={...n.finds,[s.object]:choice};
 // Its record with this sort of thing. Meeting a sort once is enough to know its habit there: the note is written whatever it did today.
 const k=KIND[s.object];if(!n.kinds?.[k]?.length){s.noted=true;s.habit=read.habit;}n.kinds={...n.kinds,[k]:[...(n.kinds?.[k]??[]),choice as Choice].slice(-5)};
 // On the way home it stops to look at something, and brings the view back.
 s.view=pickView(n.bornAt,now,n.views??[]);s.viewNew=!(n.views??[]).includes(s.view);if(s.viewNew)n.views=[...(n.views??[]),s.view];
 const text=`${n.name} ${choice==='watch'?r.watch:r[choice][t.bold< -2?1:0]}`;
 const habit=choice==='gentle'?(['bell','umbrella','snail','shell','sock','ladybird','mitten','bee','caterpillar'].includes(s.object)?'greet':'tidy'):o.habit;
 const learned=choice!=='watch'&&learn(n,habit,now);
 if(learned){n.traits={...t};const axis=choice==='try'?'bold':habit==='greet'?'social':'selective';n.traits[axis]=Math.min(10,n.traits[axis]+1);}
 // Watching is a valid ending: a memory, without imposing a habit or a souvenir.
 // Not everything can be carried home: a bee let out of the window is gone, and so is a puddle. The ending must not say otherwise.
 const gone=['bee','snail','ladybird','caterpillar','puddle','ice'].includes(s.object)||(s.object==='dandelion'&&choice==='try');
 if(choice!=='watch'&&!gone)n.keepsake=o.name;
 if(!s.alreadyRewarded){n.joy=Math.min(100,n.joy+6);n.bond=Math.min(100,n.bond+1);}
 if(!n.careDays.includes(dayAt(now)))n.careDays.push(dayAt(now));
 s.awaitingChoice=false;s.choice=choice;s.summary=text;s.playedAt=now;
 s.effect=choice==='watch'?`${n.name} had a quiet moment, all its own.`:gone?`${An(o.name)}, remembered. A little piece of today.`:`${An(o.name)}, kept close. A little piece of today.`;
 s.beats=[s.beats[0],beat(text,choice==='try'?'play':choice==='gentle'?'proud':'watch',choice==='try'?'play':choice==='gentle'?'keep':'notice'),beat(choice==='watch'?`${n.name} watches a little longer.`:gone?`${n.name} thinks about the ${o.name} all the way home.`:`${n.name} keeps the ${o.name} close.`,choice==='watch'||gone?'idle':'proud',choice==='watch'||gone?'rest':'keep')];
 remember(n,`${text} ${s.effect}`,now);n.nextActAt=now+22000;n.version++;return n;
}
export function finishScene(p:Pet,input:Record<string,unknown>,now:number):Pet {
 const n=structuredClone(p),s=n.scenes?.[0];
 if(!s||s.id!==input.sceneId)throw new Error('That pet scene has changed. Reopen it to continue.');
 if(s.awaitingChoice)throw new Error('Choose how your pet explores before heading home.');
 n.scenes=n.scenes!.slice(1);n.sceneAlbum=[s,...(n.sceneAlbum??[])].slice(0,6);
 if(s.kind==='playdate')delete n.visitNotice;
 n.nextActAt=now+8000;n.version++;return n;
}
export function playdateScenes(x:Pet,y:Pet,aId:string,bId:string,now:number):void {
 if((x.scenes?.length??0)>0)throw new Error('Finish your pet scene before visiting a friend.');
 if((y.scenes?.length??0)>=4||y.scenes?.some(s=>s.awaitingChoice))throw new Error('Your friend’s pet is busy. Try the playdate later.');
 const tx=traitsFor(x),ty=traitsFor(y),actors=[actor(x,now),actor(y,now)],old=x.relations?.[bId]??y.relations?.[aId];
 const independent=tx.social< -4||ty.social< -4;
 const race=tx.bold>2&&ty.bold>2&&!independent,shy=tx.bold< -2||ty.bold< -2,disagree=!shy&&!race&&Math.abs(tx.selective-ty.selective)>6;
 const delta=race||disagree?-1:1,score=Math.max(-5,Math.min(5,(old?.score??0)+delta)),visits=(old?.visits??0)+1;
 const standing=score<=-2?'Friendly rivals':score>=2?'Firm friends':race||disagree?'Competitive spark':independent?'Comfortable company':shy?'Growing trust':'New friends';
 const object:ObjectId=race?'leaf':disagree||independent?'pebble':shy?'umbrella':'spool';
 const aName=x.name===y.name?`${x.name} the visitor`:x.name,bName=x.name===y.name?`${y.name} the host`:y.name;
 const arrival=old?`${aName} is back. ${bName} ${old.score<0?'guards the starting line. Rematch?':'recognises those footsteps and comes closer.'}`:`${aName} arrives. ${bName} ${ty.bold< -2?'waits quietly by the door.':'looks over, curious.'}`;
 const interaction=independent?`${aName} finds a pebble. ${bName} sits nearby, leaving a little space. Company, on their own terms.`:race?`${aName} and ${bName} race for the same leaf. Neither will give up the finish line.`:disagree?`${aName} rolls the pebble. ${bName} puts it back. They seem to have different plans.`:shy?`A shy hello: ${aName} waits under the leaf. ${bName} edges closer, until the shelter is shared.`:`${aName} rolls the spool across. ${bName} rolls it back. A game that needs two.`;
 const goodbye=independent?'No big goodbye. Just a small nod, and room to return.':race?'One last race, then a grudging wave. Tomorrow needs a rematch.':disagree?'They leave the pebble halfway between them. A truce, for now.':shy?'The rain stops. Neither moves away just yet.':'The spool stops in the middle. They sit together for a while.';
 const copied:string[]=[];
 // Social learning is capped at one copied habit per pet per UTC day and shares the teaching cap.
 for(const [p,other] of [[x,y],[y,x]] as const){
  const donor=other===x?actors[0]:actors[1],habit=donor.signature as ActKind|null;
  if(!race&&!disagree&&habit&&p.copiedHabitDay!==dayAt(now)&&(p.habits?.[habit]??0)<3&&learn(p,habit,now)){p.copiedHabitDay=dayAt(now);copied.push(`${p.name} picked up ${ACTS[habit].habit}.`);}
 }
 const summary=`${interaction} ${goodbye}`;
 for(const [p,otherId,other,you] of [[x,bId,y,0],[y,aId,x,1]] as const){
  p.relations={...p.relations,[otherId]:{score,visits,name:other.name}};
  // Bound social storage; one-day repeat protection stays in meetings independently.
  p.relations=Object.fromEntries(Object.entries(p.relations).slice(-40));
  const scene:PetScene={id:`visit:${now}:${x.version}:${y.version}`,kind:'playdate',at:now,title:`${actors[0].name} + ${actors[1].name}`,actors:structuredClone(actors),you,object,summary,standing,effect:`${standing} · visit ${visits}${copied.length?' · '+copied.join(' '):''}`,beats:[beat(arrival,'greet','arrive',ty.bold< -2?'watch':'greet'),beat(interaction,race?'play':shy?'watch':'toy',race?'race':disagree?'hide':independent?'notice':shy?'shelter':'share',race?'play':shy?'greet':'proud'),beat(goodbye,'proud','rest','proud')]};
  p.scenes=[...(p.scenes??[]),scene];p.nextActAt=now+22000;
 }
}
