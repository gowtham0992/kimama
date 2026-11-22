import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { FRAMES, PARTS, RULES, TRAITS, VALUES, PUZZLE_COUNTS, MODE_LABELS, snackName, type Family, type GameView, type Mode, type Snack } from '../shared/rules';
import { Creature, SnackArt } from './art';
import './style.css';
import { ClueRail } from './ClueRail';

const LABELS: Partial<Record<Family, string>> = { EITHER: 'Either', BOTH: 'Both', ONE: 'One only', IS: 'One trait', NOT: 'Not this' };
const DESCRIPTIONS: Partial<Record<Family, string>> = { EITHER: 'At least one of two traits.', BOTH: 'Two traits, together.', ONE: 'One trait or the other. Never both.', IS: 'One trait is all it takes.', NOT: 'Anything without one trait.' };
function locationState() {
  const q = new URLSearchParams(location.search);
  const mode: Mode = q.get('mode') === 'homesick' ? 'homesick' : q.get('mode') === 'classic' ? 'classic' : 'mixed';
  const n = Number(q.get('craving') ?? 1) - 1;
  return { mode, puzzle: Number.isInteger(n) && n >= 0 && n < PUZZLE_COUNTS[mode] ? n : 0 };
}
async function request(puzzle: number, mode: Mode, body?: unknown): Promise<GameView> {
  let guest=sessionStorage.getItem('picky-guest'); if(!guest){guest=crypto.randomUUID();sessionStorage.setItem('picky-guest',guest);}
  const practice=new URLSearchParams(location.search).has('craving')?'1':'0';
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`/api/game?puzzle=${puzzle}&mode=${mode}&practice=${practice}`, { signal: controller.signal, headers: { 'Content-Type': 'application/json','x-picky-guest':guest }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Could not save. Your snack is safe; try again.');
    return data;
  } finally { clearTimeout(timer); }
}
function Sheet({ title, children, onClose, className = '', evidence, footer }: { title: string; children: ReactNode; onClose: () => void; className?: string; evidence?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current!; d.showModal(); return () => { if (d.open) d.close(); }; }, []);
  return <dialog ref={ref} className={`sheet ${className}`} aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="sheet-header"><span className="eyebrow">PICKY’S TABLE</span><button className="icon-button close" onClick={onClose} aria-label="Close dialog">×</button></div>
    <h2>{title}</h2>{evidence && <div className="sheet-evidence">{evidence}</div>}<div className="sheet-body">{children}</div>{footer && <div className="sheet-footer">{footer}</div>}
  </dialog>;
}
function App() {
  const [route, setRoute] = useState(locationState);
  const { mode, puzzle } = route;
  const [game, setGame] = useState<GameView|null>(null), [snack, setSnack] = useState<Snack>([0,0,0,0]);
  const [sheet, setSheet] = useState<'theory'|'favourite'|'help'|'menu'|'counter'|null>(null);
  const [family, setFamily] = useState<Family>('EITHER'), [a, setA] = useState<number|null>(null), [b, setB] = useState<number|null>(null), [slot, setSlot] = useState<0|1>(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false), [animating, setAnimating] = useState(false);
  const locked = useRef(false), animationTimer = useRef<ReturnType<typeof setTimeout>|null>(null), lastTrigger = useRef<HTMLElement|null>(null);
  useEffect(() => { const pop = () => setRoute(locationState()); addEventListener('popstate', pop); return () => removeEventListener('popstate', pop); }, []);
  useEffect(() => {
    let ignore = false; setGame(null); setError(''); setSheet(null); setA(null); setB(null);
    request(puzzle, mode).then(g => { if (!ignore) { setGame(g); setSnack(g.suggestedSnack); setFamily(g.families[0]); } }).catch(e => { if (!ignore) setError(e.message); });
    return () => { ignore = true; };
  }, [puzzle, mode]);
  useEffect(() => () => { if (animationTimer.current) clearTimeout(animationTimer.current); }, []);
  function navigate(p: number, m: Mode = mode) {
    const q = new URLSearchParams({ craving: String(p + 1), mode: m }); history.pushState(null, '', `/?${q}`); setRoute({ puzzle: p, mode: m });
  }
  function open(next: typeof sheet) { lastTrigger.current = document.activeElement as HTMLElement; setSheet(next); }
  function close() { setSheet(null); requestAnimationFrame(() => lastTrigger.current?.focus()); }
  async function perform(body: Record<string, unknown>) {
    if (!game || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const next = await request(puzzle, mode, { ...body, version: game.version }); setGame(next);
      if (next.event.kind === 'wrong' || next.event.kind === 'contradiction') { setSheet('counter'); }
      else if (next.status !== 'playing') setSheet(null);
      if (next.event.kind === 'feed') {
        setAnimating(true); if (animationTimer.current) clearTimeout(animationTimer.current);
        animationTimer.current = setTimeout(() => setAnimating(false), 780);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      try { setGame(await request(puzzle, mode)); } catch { /* Preserve game and draft for retry. */ }
    } finally { locked.current = false; setBusy(false); }
  }
  const same = (x: Snack, y: Snack) => x.every((v, i) => v === y[i]);
  const known = game?.observations.find(o => same(o.snack, snack));
  const done = game && game.status !== 'playing';
  const homesick = game?.mode === 'homesick';
  const event = game?.event;
  const mood = busy ? 'thinking' : game?.status === 'solved' ? 'solved' : game?.status === 'lost' ? 'lost' : event?.kind === 'wrong' || event?.kind === 'contradiction' ? 'idle' : event?.kind === 'feed' ? event.ate ? 'eat' : 'spit' : 'idle';
  const two = family !== 'IS' && family !== 'NOT';
  const selectedRule = a === null || (two && b === null) ? undefined : RULES.find(r => r.family === family && ((r.a === a && r.b === (two ? b : undefined)) || (two && family !== 'UNLESS' && r.a === b && r.b === a)));
  function selectTrait(i: number) {
    if (slot === 0) { setA(i); if (b !== null && TRAITS[b].part === TRAITS[i].part) setB(null); if (two) setSlot(1); }
    else { setB(i); }
  }
  function setFrame(f: Family) { setFamily(f); setSlot(0); }
  async function share() {
    if (!game) return;
    const text = `Picky · ${MODE_LABELS[game.mode]} craving ${game.puzzle + 1}\n${game.trail.join(' ')}\n${game.status === 'solved' ? `${game.score} points${game.airtight ? ' · Airtight' : ''}` : 'This one had me stumped.'}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setError('Copy unavailable. You can select your trail below.'); }
  }
  return <main className="app-shell">
    <header className="masthead"><a className="wordmark" href="/">picky<span>✳</span></a><span className="tagline">GOOD TASTE.<br/>QUESTIONABLE THEORIES.</span><button className="icon-button" onClick={() => open('menu')} aria-label="Choose a craving">☰</button></header>
    {!game ? <section className="loading"><div className="loading-dot">✳</div><h1>Setting the table…</h1><p role="alert">{error}</p>{error && <button className="primary" onClick={() => { setError(''); void request(puzzle, mode).then(g => { setGame(g); setSnack(g.suggestedSnack); setFamily(g.families[0]); }).catch(e => setError(e.message)); }}>Try again</button>}</section> : <>
      <section className="game-table" aria-label="Picky’s table">
        <div className="chapter"><span>{homesick ? 'HOMESICK' : game.daily ? 'DAILY CRAVING' : game.mode === 'mixed' ? 'THE MIXED MENU' : 'THE SIMPLE MENU'} <i> / </i> {game.daily ?? String(game.puzzle + 1).padStart(2, '0')}</span><button className="help-button" onClick={() => open('help')}>How to play <span>?</span></button></div>
        <div className="title-line"><h1>{done ? game.status === 'solved' ? 'You get me.' : 'A peculiar appetite.' : game.title}</h1><span className="score-counter" title="Feeds + 3 per wrong claim"><b>{game.score}</b> pts</span></div>
        {homesick && !done && <p className="homesick-hint">It misses one exact snack. <b>2 or more matching parts</b> earn a chomp. Find all four.</p>}
        <div className={`scene ${animating ? 'feeding' : ''}`}>
          <div className="speech" aria-live="polite">{busy ? 'Just a little sniff…' : game.status === 'solved' ? 'You really do get me.' : game.status === 'lost' ? 'A very particular craving.' : event?.kind === 'wrong' ? 'Wait. What about this one?' : event?.kind === 'contradiction' ? 'We’ve tasted that theory…' : event?.kind === 'feed' ? event.ate ? homesick ? 'Tastes like home…' : 'Oh. That’s the stuff.' : homesick ? 'Not close enough…' : 'Ptooey. With respect.' : homesick ? 'I miss my favourite…' : 'I’m not difficult. I’m particular.'}</div>
          <Creature mood={mood}/><div className="scene-scribble" aria-hidden="true">little creature,<br/>big opinions <span>↙</span></div>
          <div className="offering"><SnackArt snack={snack}/></div>
          {animating && <div className={`taste-label ${event?.ate ? 'yes' : 'no'}`}>{event?.ate ? 'CHOMP!' : 'PTOOEY!'}</div>}
        </div>
        {done ? <section className="result-card" aria-label="Your result"><div className="stamp">{game.status === 'solved' ? game.airtight ? '✓ AIRTIGHT' : '✓ CRAVING CRACKED' : 'CRAVING REVEALED'}</div><p className="answer">{game.reveal}</p>{game.favourite && <div className="favourite-reveal"><SnackArt snack={game.favourite}/><span>THE EXACT FAVOURITE</span></div>}<p>{game.airtight ? game.wrong ? 'All other possibilities ruled out, with a little help from Picky.' : 'Your experiments ruled out every other possibility.' : game.status === 'solved' ? 'Exactly right. Other theories still fit your clues—this solve isn’t Airtight.' : 'Some cravings take a second helping.'}</p><div className="result-numbers"><span><b>{game.feeds}</b> {game.feeds === 1 ? 'feed' : 'feeds'}</span><span><b>{game.wrong}</b> wrong {game.wrong === 1 ? 'claim' : 'claims'}</span></div><div className="trail" aria-label="Your spoiler-free trail">{game.trail.join(' ')}</div><button className="primary" onClick={share}>{copied ? 'Copied. Keep the secret ✓' : 'Share the journey, keep the secret ↗'}</button><button className="secondary" onClick={() => navigate((game.puzzle + 1) % PUZZLE_COUNTS[game.mode],game.mode)}>Another little mystery →</button><ClueRail observations={game.observations} onSelect={setSnack} selected={snack}/></section> : <>
          <ClueRail observations={game.observations} onSelect={setSnack} selected={snack}/>
          <fieldset className="builder" disabled={busy || animating}><legend className="sr-only">Build a snack for Picky</legend>{PARTS.map((part, p) => <div className="ingredient-row" key={part}><span>{part}</span><div role="group" aria-label={part}>{VALUES[p].map((v, i) => <button key={v} className={snack[p] === i ? 'ingredient active' : 'ingredient'} aria-pressed={snack[p] === i} onClick={() => setSnack(s => s.map((n, j) => j === p ? i : n) as Snack)}>{p === 0 && <span className="shape-icon" aria-hidden="true">{['●', '■', '▲'][i]}</span>}{p === 1 && <span className={`flavour-dot f${i}`} aria-hidden="true"/>}{v}</button>)}</div></div>)}</fieldset>
          <p className={`table-notice ${error ? 'error' : ''}`} role="status">{error || (known ? `Already tasted. Picky ${known.ate ? 'ate' : 'spat out'} this one. Change a part.` : game.feeds === 0 ? 'A new snack, ready to try. What will you learn?' : game.notice)}</p>
          <button className="primary feed-button" disabled={busy || animating || !!known} onClick={() => perform({ type: 'feed', snack })}><span>{busy ? 'A little sniff…' : known ? 'Change a part to feed again' : 'Feed Picky'}</span><small>{known ? '↑' : '+1 POINT ↗'}</small></button>
          <button className="theory-button" disabled={busy || animating} onClick={() => open(homesick?'favourite':'theory')}><span>{homesick?'This is the favourite':'I have a theory'} <b>↗</b></span><small>{homesick?'CLAIM THIS PLATE':game.families.map(f => LABELS[f]).join(' · ')}</small></button>
        </>}
      </section>
      <footer><span>A little curiosity goes a long way.</span><span>{game.reddit?'REDDIT PLAYTEST':'LOCAL PLAYTEST'}</span></footer>
      {sheet === 'favourite' && <Sheet title="Is this the favourite?" onClose={close} className="favourite-sheet" evidence={<ClueRail observations={game.observations} onSelect={setSnack} selected={snack}/>} footer={<><button className="primary" disabled={busy} onClick={()=>perform({type:'claim',snack})}>{busy?'A familiar smell…':'Yes. This exact snack ✓'}</button><p className="fineprint">A chomp alone is not a solve. This claims all four parts.<br/>A wrong claim costs 3. {3-game.wrong} wrong {3-game.wrong===1?'claim':'claims'} left.</p>{error&&<p className="error" role="alert">{error}</p>}</>}><div className="favourite-plate"><SnackArt snack={snack}/><p>{snackName(snack)}</p></div><p className="sheet-intro">This is the plate you built. To change it, go back to the table—or tap a clue above to load that snack.</p></Sheet>}
      {sheet === 'theory' && <Sheet title="What’s the craving?" onClose={close} className="theory-sheet" evidence={<ClueRail observations={game.observations} onSelect={setSnack} selected={snack}/>} footer={<><button className="primary" disabled={busy || !selectedRule} onClick={() => perform({ type: 'claim', ruleId: selectedRule!.id })}>{busy ? 'Let me think…' : 'That’s my theory ✓'}</button><p className="fineprint">Correct is free. A wrong theory costs 3 and Picky shows you why.<br/>{3 - game.wrong} wrong {3 - game.wrong === 1 ? 'claim' : 'claims'} left.</p>{error && <p className="error" role="alert">{error}</p>}</>}><p className="sheet-intro">Keep the clues in view. Choose the rule and its ingredients.</p><div className="frame-tabs" role="group" aria-label="Possible rule frames">{game.families.map(f => <button key={f} aria-pressed={family === f} className={family === f ? 'selected' : ''} onClick={() => setFrame(f)}><b>{LABELS[f]}</b><span>{DESCRIPTIONS[f]}</span></button>)}</div><div className="sentence-builder">{FRAMES[family][0]}<button className={slot === 0 ? 'blank focused' : 'blank'} onClick={() => setSlot(0)}>{a === null ? 'first trait' : TRAITS[a].label}</button>{two && <>{FRAMES[family][1]}<button className={slot === 1 ? 'blank focused' : 'blank'} onClick={() => setSlot(1)}>{b === null ? 'second trait' : TRAITS[b].label}</button></>}{FRAMES[family][2]}</div><p className="eyebrow">CHOOSE {slot === 0 ? 'THE FIRST' : 'THE SECOND'} TRAIT</p><div className="trait-picker">{PARTS.map((part, p) => <div key={part}><span>{part}</span>{TRAITS.map((t, i) => t.part === p && <button key={i} disabled={busy || (slot === 1 && a !== null && t.part === TRAITS[a].part)} aria-pressed={(slot === 0 ? a : b) === i} onClick={() => selectTrait(i)}>{t.label}</button>)}</div>)}</div></Sheet>}
      {sheet === 'counter' && event?.snack && <Sheet title={event.kind === 'contradiction' ? 'Your notebook knows.' : homesick ? 'Not the favourite…' : 'One tiny problem…'} onClose={close} className="counter-sheet"><span className="eyebrow">{homesick?"YOUR PROPOSED FAVOURITE":"YOUR THEORY"}</span><blockquote>“{event.claim}”</blockquote>{event.claimSnack&&<div className="proposed-favourite"><SnackArt snack={event.claimSnack}/></div>}<div className="counter-scene"><Creature mood={event.ate ? 'eat' : 'spit'}/><SnackArt snack={event.snack}/></div><p className="snack-description">{snackName(event.snack)}</p><div className="prediction"><div><small>{homesick?"THAT FAVOURITE PREDICTS":"YOUR THEORY SAYS"}</small><strong>{event.predicted ? 'Eat it' : 'Spit it out'}</strong></div><span>≠</span><div className={event.ate ? 'yes' : 'no'}><small>PICKY ACTUALLY</small><strong>{event.ate ? 'Ate it. Chomp.' : 'Spat it out.'}</strong></div></div><p className="counter-explanation">{event.kind === 'contradiction' ? `This clue was already in your notebook. No penalty—just a little nudge.` : homesick?`If your favourite were correct, this clue would have the opposite verdict. Liking a snack is not the same as it being the favourite. +3 points.`:`This snack breaks your rule. It’s in your notebook now. A wrong claim adds 3 points.`}</p><button className="primary" onClick={close}>{done ? 'Show me the craving →' : 'Back to the drawing board →'}</button></Sheet>}
      {sheet === 'help' && <Sheet title="A little scientific snacking." onClose={close}>{homesick?<div className="howto"><p><b>01 / Remember a favourite.</b> Picky is homesick for one exact snack: shape, flavour, topping and number of pieces.</p><p><b>02 / Run experiments.</b> Picky eats a snack if <strong>at least two of its four parts</strong> match the favourite. A chomp could mean two, three or all four. Change one part and compare the clues.</p><p><b>03 / Claim the exact snack.</b> Build your best guess on the table, then tap “This is the favourite”. A normal feed never solves the game—even if you happened to feed the favourite.</p><p>A correct claim is free. A wrong claim costs 3 and Picky shows a clue that disproves your proposed favourite. Contradictions already in your evidence are free. Three wrong claims reveal the answer.</p><p><b>Airtight</b> means only one favourite fits the observations. Otherwise a correct claim is a lucky-but-valid solve.</p></div>:<div className="howto"><p><b>01 / Make a snack.</b> Two clues are on the house. Change one part, feed Picky, and notice what happens.</p><p><b>02 / Find the craving.</b> Picky follows one of the {game.families.length === 1 ? 'sentences' : 'three sentences'} below. The secret ingredients are yours to discover.</p>{game.families.map(f => <div className="howto-rule" key={f}><b>{LABELS[f]}</b><span>{DESCRIPTIONS[f]}</span></div>)}<p><b>03 / Tell Picky your theory.</b> Fill the sentence. If you’re wrong, Picky produces a snack that breaks it. Three wrong claims reveal the answer.</p><p>A feed costs 1. A wrong claim costs 3. Lower is better. <b>Airtight</b> means your observations ruled out every other rule.</p></div>}<button className="primary" onClick={close}>Let’s feed this little creature →</button></Sheet>}
      {sheet === 'menu' && <Sheet title="The tasting room" onClose={close}><p className="sheet-intro">Same little creature. Two ways to solve its cravings.</p><div className="comparison-picker" role="group" aria-label="Compare game modes">{(['mixed','homesick'] as Mode[]).map(m=><button key={m} className={game.mode===m?'selected':''} aria-pressed={game.mode===m} onClick={()=>game.mode===m?close():navigate(0,m)}><b>{MODE_LABELS[m]}</b><span>{m==='mixed'?'Discover the sentence rule.':'Find one exact favourite snack.'}</span></button>)}</div><p className="eyebrow">{MODE_LABELS[game.mode].toUpperCase()} · PRACTICE CRAVINGS</p><div className="craving-list">{Array.from({ length: PUZZLE_COUNTS[game.mode] }, (_, i) => <button key={i} className={game.puzzle === i ? 'current' : ''} onClick={() => { if (i === game.puzzle) close(); else navigate(i,game.mode); }}><span>{String(i + 1).padStart(2, '0')}</span><b>{homesick?['Homesick today','A taste of home','Comfort food'][i]:['A very particular picnic', 'A matter of taste', 'The midnight munchies', 'Second helpings', 'Something to chew on', 'A tiny dinner party'][i]}</b><span>↗</span></button>)}</div><div className="mode-switch"><span>PLAYER-TEST COMPARISON · KEEP BOTH EXPERIENCES</span><button onClick={() => navigate(0, game.mode==='classic'?'mixed':'classic')}>{game.mode==='classic'?'Back to mixed rules':'Older single-frame reference'} →</button></div></Sheet>}
    </>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
