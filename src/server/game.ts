import { accepts, isSnack, RULES, FAVOURITE_RULES, SNACKS, sentence, snackName, type Family, type GameEvent, type GameView, type Mode, type Observation, type Rule, type Snack } from '../shared/rules';

const CONTENT = [
  { title: 'A very particular picnic', id: 'EITHER:0:8' },
  { title: 'A matter of taste', id: 'ONE:1:4' },
  { title: 'The midnight munchies', id: 'BOTH:2:7' },
  { title: 'Second helpings', id: 'ONE:5:10' },
  { title: 'Something to chew on', id: 'EITHER:3:11' },
  { title: 'A tiny dinner party', id: 'BOTH:0:5' },
];
const CLASSIC = ['IS:0', 'EITHER:0:8', 'ONE:1:4'];
export const MIXED_FAMILIES: Family[] = ['EITHER', 'BOTH', 'ONE'];
export const sameSnack = (a: Snack, b: Snack) => a.every((v, i) => v === b[i]);
const distance = (a: Snack, b: Snack) => a.filter((v, i) => v !== b[i]).length;
export type Game = {
  puzzle: number; mode: Mode; title: string; secret: Rule; allowedRules: Rule[];
  candidates: Rule[]; families: Family[]; par: number|null; observations: Observation[];
  feeds: number; wrong: number; version: number; status: GameView['status'];
  airtight: boolean; trail: string[]; notice: string; event: GameEvent; suggestedSnack: Snack;
};

function exactPar(rules: Rule[]): number {
  const memo = new Map<string, number>();
  function search(rs: Rule[]): number {
    if (rs.length <= 1) return 0;
    const key = rs.map(r => r.id).join('|');
    if (memo.has(key)) return memo.get(key)!;
    let best = Infinity;
    for (const s of SNACKS) {
      const yes = rs.filter(r => accepts(r, s));
      if (!yes.length || yes.length === rs.length) continue;
      const no = rs.filter(r => !accepts(r, s));
      best = Math.min(best, 1 + Math.max(search(yes), search(no)));
    }
    memo.set(key, best); return best;
  }
  return search(rules);
}

function createHomesick(puzzle:number):Game {
  if(!Number.isInteger(puzzle)||puzzle<0||puzzle>2)throw new Error('Unknown practice craving.');
  const favourites:Snack[]=[[1,0,1,0],[0,2,2,1],[2,1,0,2]];
  const favourite=favourites[puzzle];
  const sample:Snack=[1,0,1,0],yes:Snack=[1,0,2,1],no:Snack=[0,2,0,0];
  const shift=(snack:Snack)=>snack.map((v,i)=>(v+favourite[i]-sample[i]+3)%3) as Snack;
  const observations:Observation[]=[{snack:shift(yes),ate:true,source:'starter'},{snack:shift(no),ate:false,source:'starter'}];
  const secret=FAVOURITE_RULES.find(r=>sameSnack(SNACKS[r.a],favourite))!;
  const candidates=FAVOURITE_RULES.filter(r=>observations.every(o=>accepts(r,o.snack)===o.ate));
  if(candidates.length!==27)throw new Error('Invalid Homesick starters.');
  const suggestedSnack=SNACKS.find(s=>distance(s,observations[0].snack)===1&&!observations.some(o=>sameSnack(o.snack,s)))!;
  return {puzzle,mode:'homesick',title:['Homesick today','A taste of home','Comfort food'][puzzle],secret,allowedRules:FAVOURITE_RULES,candidates,families:['HOMESICK'],par:null,observations,feeds:0,wrong:0,version:0,status:'playing',airtight:false,trail:[],notice:'It misses one exact snack. Two or more matching parts earn a chomp.',event:{kind:'start'},suggestedSnack};
}

const contentCache = new Map<string, Game>();
export function createGame(puzzle: number, mode: Mode = 'classic'): Game {
  if(mode==='homesick')return createHomesick(puzzle);
  const key = `${mode}:${puzzle}`;
  if (contentCache.has(key)) return structuredClone(contentCache.get(key)!);
  const item = CONTENT[puzzle];
  if (!item || (mode === 'classic' && puzzle > 2)) throw new Error('Unknown practice craving.');
  const secret = RULES.find(r => r.id === (mode === 'classic' ? CLASSIC[puzzle] : item.id))!;
  const families = mode === 'mixed' ? MIXED_FAMILIES : [secret.family];
  const allowedRules = RULES.filter(r => families.includes(r.family));
  let starters: Observation[] = [], candidates: Rule[] = [], best = -Infinity;
  for (let a = 0; a < 81; a++) {
    const yes = SNACKS[a]; if (!accepts(secret, yes)) continue;
    for (let b = 0; b < 81; b++) {
      const no = SNACKS[b]; if (accepts(secret, no) || (mode === 'mixed' && distance(yes, no) < 3)) continue;
      const c = allowedRules.filter(r => accepts(r, yes) && !accepts(r, no));
      if (mode === 'mixed' ? c.length < 30 || c.length > 60 : c.length < 3 || c.length > 12) continue;
      if (mode === 'mixed' && families.some(f => c.filter(r => r.family === f).length < 3)) continue;
      const tie = ((a * 73856093 ^ b * 19349663 ^ puzzle * 83492791) >>> 0) / 2**32;
      const score = mode === 'mixed' ? -Math.abs(c.length - 42) + tie : 0;
      if (score > best) {
        best = score; candidates = c;
        starters = [{ snack: yes, ate: true, source: 'starter' }, { snack: no, ate: false, source: 'starter' }];
      }
    }
  }
  if (!candidates.length) throw new Error(`No validated starters for ${key}`);
  const suggestedSnack = SNACKS.find(s => distance(s, starters[0].snack) === 1 && !starters.some(o => sameSnack(o.snack, s)))!;
  const game: Game = { puzzle, mode, title: item.title, secret, allowedRules, families, candidates,
    par: mode === 'classic' ? exactPar(candidates) : null, observations: starters,
    feeds: 0, wrong: 0, version: 0, status: 'playing', airtight: false, trail: [],
    notice: 'Two clues. One secret craving. Change a snack and see what happens.',
    event: { kind: 'start' }, suggestedSnack };
  contentCache.set(key, structuredClone(game)); return game;
}

export function view(g: Game): GameView {
  const seen = (s: Snack) => g.observations.some(o => sameSnack(o.snack, s));
  const last = g.observations.at(-1)!.snack;
  const suggestedSnack = !seen(g.suggestedSnack) ? g.suggestedSnack : SNACKS.find(s => !seen(s) && distance(s, last) === 1) ?? SNACKS.find(s => !seen(s)) ?? g.suggestedSnack;
  return { puzzle: g.puzzle, mode: g.mode, title: g.title, families: g.families,
    family: g.mode === 'classic' ? g.families[0] : null, par: g.par, version: g.version,
    status: g.status, feeds: g.feeds, wrong: g.wrong, score: g.feeds + 3 * g.wrong,
    observations: g.observations, trail: g.trail, notice: g.notice, event: g.event,
    reveal: g.status === 'playing' ? null : sentence(g.secret), airtight: g.airtight,
    favourite:g.mode==='homesick'&&g.status!=='playing'?SNACKS[g.secret.a]:null,
    remaining: g.status === 'playing' ? null : g.candidates.length, suggestedSnack };
}

export function act(g: Game, input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Invalid action.');
  const x = input as Record<string, unknown>;
  if (x.version !== g.version) throw new Error('Your game changed. Refresh and try again.');
  if (g.status !== 'playing') throw new Error('This craving is finished. Try another.');
  if (x.type === 'feed') {
    if (!isSnack(x.snack)) throw new Error('Choose all four snack parts.');
    const snack = x.snack;
    const seen = g.observations.findIndex(o => sameSnack(o.snack, snack));
    if (seen >= 0) {
      g.event = { kind: 'repeat', snack, ate: g.observations[seen].ate, observationIndex: seen };
      g.notice = 'Already tasted. Change an ingredient to try something new. No point charged.';
      g.version++; return;
    }
    const ate = accepts(g.secret, snack);
    g.observations.push({ snack: [...snack], ate, source: 'feed' });
    g.feeds++; g.trail.push(ate ? '●' : '○');
    g.candidates = g.candidates.filter(r => accepts(r, snack) === ate);
    g.event = { kind: 'feed', snack: [...snack], ate };
    g.notice = g.mode==='homesick' ? ate ? 'At least two parts match. Liked is not the same as favourite.' : 'Fewer than two parts match the favourite.' : ate ? 'A little chomp of approval.' : 'Politely, absolutely not.';
  } else if (x.type === 'claim') {
    if(g.mode==='homesick'&&!isSnack(x.snack))throw new Error('Build a valid snack to claim the favourite.');
    const r = g.mode==='homesick'?g.allowedRules.find(r=>sameSnack(SNACKS[r.a],x.snack as Snack)):g.allowedRules.find(r => r.id === x.ruleId);
    if (!r) throw new Error('Choose an offered sentence and two traits from different parts.');
    const conflict = g.observations.findIndex(o => accepts(r, o.snack) !== o.ate);
    if (conflict >= 0) {
      const o = g.observations[conflict];
      g.event = { kind: 'contradiction', snack: o.snack, ate: o.ate, claim: sentence(r), predicted: accepts(r, o.snack), observationIndex: conflict, ...(g.mode==='homesick'?{claimSnack:x.snack as Snack}:{}) };
      g.notice = `Check this clue: ${snackName(o.snack)}. Picky ${o.ate ? 'ate' : 'rejected'} it. No penalty.`;
      g.version++; return;
    }
    if (SNACKS.every(s => accepts(r, s) === accepts(g.secret, s))) {
      g.airtight = g.candidates.length === 1; g.status = 'solved'; g.trail.push('✓');
      g.event = { kind: 'solved', claim: sentence(r), ...(g.mode==='homesick'?{claimSnack:x.snack as Snack}:{}) };
      g.notice = g.airtight ? 'Every other theory ruled out. Beautifully done.' : 'You read my mind. Exactly right.';
    } else {
      let chosen: Snack | undefined, best = Infinity;
      for (const s of SNACKS) if (accepts(r, s) !== accepts(g.secret, s)) {
        const d = Math.min(...g.observations.map(o => distance(s, o.snack)));
        const remaining = g.candidates.filter(c => accepts(c, s) === accepts(g.secret, s)).length;
        const cost = d * 1000 + remaining;
        if (cost < best) { best = cost; chosen = s; }
      }
      const snack = chosen!, ate = accepts(g.secret, snack);
      g.observations.push({ snack, ate, source: 'claim' });
      g.candidates = g.candidates.filter(c => accepts(c, snack) === ate);
      g.wrong++; g.trail.push('✕');
      g.event = { kind: 'wrong', snack, ate, claim: sentence(r), predicted: accepts(r, snack), ...(g.mode==='homesick'?{claimSnack:x.snack as Snack}:{}) };
      g.notice = g.mode==='homesick'?'Not the exact favourite. Here’s a snack that disproves your guess.':'A good theory. One tiny problem…';
      if (g.wrong === 3) { g.status = 'lost'; g.notice = 'A stubborn craving. Let’s peek at the answer.'; }
    }
  } else throw new Error('Unknown action.');
  g.version++;
}
