import { useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useReducedMotion } from 'framer-motion'
import Confetti from 'react-confetti'
import { auth } from '../lib/firebase.js'

const TRACKS = {
  software: {
    id: 'software',
    name: 'Software',
    rounds: ['Pitch', 'Build'],
    bonus: 'Bonus',
    teams: [
      { id: 'northline', name: 'Northline', scores: { Pitch: 28, Build: 46 }, bonus: 12 },
      { id: 'paper', name: 'Paper Kite', scores: { Pitch: 30, Build: 41 }, bonus: 10 },
      { id: 'harbor', name: 'Harbor', scores: { Pitch: 26, Build: 45 }, bonus: 10 },
      { id: 'kiln', name: 'Kiln', scores: { Pitch: 22, Build: 40 }, bonus: 8 },
    ],
  },
  hardware: {
    id: 'hardware',
    name: 'Hardware',
    rounds: ['Pitch', 'Build'],
    bonus: 'Bonus',
    teams: [
      { id: 'lattice', name: 'Lattice', scores: { Pitch: 34, Build: 48 }, bonus: 8 },
      { id: 'copper', name: 'Copper', scores: { Pitch: 29, Build: 40 }, bonus: 8 },
      { id: 'field', name: 'Field Note', scores: { Pitch: 24, Build: 39 }, bonus: 8 },
    ],
  },
}

const TRACK_ORDER = ['software', 'hardware']

const RULES = [
  {
    term: 'Dense ranks',
    detail:
      'A tie shares a place. The next team takes the next number, so two second-place scores are followed by third, not fourth.',
  },
  {
    term: 'One track',
    detail:
      'Every team sits on a single track. The public page shows one track at a time and keeps the others off that view.',
  },
  {
    term: 'Rounds',
    detail:
      'Each round is a column. The number is that round’s stored total — the sum of the rubric when a rubric exists, or one number when it does not.',
  },
  {
    term: 'Bonuses',
    detail:
      'Bonuses are extra columns the organizer names. The value on a team is added into the total beside the rounds.',
  },
  {
    term: 'Live',
    detail:
      'The page subscribes to the event. When a score is saved, open boards follow it, and the row that changed is marked.',
  },
  {
    term: 'Frozen',
    detail:
      'Freeze holds the public rows where they are. It does not stop judges from scoring. The board says so, in place of the live mark.',
  },
  {
    term: 'Reveal',
    detail:
      'Celebrate turns the freeze off and plays confetti on every open public board for 15 seconds.',
  },
  {
    term: 'Podium',
    detail:
      'The podium page, opened from the admin panel, steps through places for a chosen track. Space, Enter, or the right arrow reveals the next place. The left arrow goes back. Escape leaves.',
  },
]

const ORDER = [
  {
    n: '01',
    title: 'Name the event',
    body: 'The dashboard lists the events on the account. A new event needs a name and a code. That code is the public address: the landing page turns it into the board’s link.',
  },
  {
    n: '02',
    title: 'Set the scoring',
    body: 'Add tracks, then the rounds on each track. Rounds can be renamed and reordered. A rubric is a list of criteria for one track and one round, each with a label and a maximum. Add judges and assign a track. Add teams by hand, or from a CSV — name is required, track is optional, and a column headed with a round name is imported as a score. Deleting a track downloads that track’s teams first.',
  },
  {
    n: '03',
    title: 'Let the judges work',
    body: 'A judge signs in and opens the events they were added to. They filter by track, round, and whether a team is still pending, then enter each criterion up to its maximum. Saving writes that judge’s scores. A locked round refuses the change.',
  },
  {
    n: '04',
    title: 'Put it on the wall',
    body: 'Anyone with the link sees the selected track, the round columns, the bonuses, and the total. Switching tracks stays on the same page. Tied totals share a rank.',
  },
  {
    n: '05',
    title: 'Hold, then reveal',
    body: 'Freeze when the last scores should stay off the projector. Judges can keep working. Reveal & celebrate clears the freeze and fires confetti on the open boards for 15 seconds. The podium page is there for the stage.',
  },
]

const ADMIN_TABS = [
  'Edit bonuses',
  'Manage rubrics',
  'Manage judges',
  'Manage teams',
  'Tracks & rounds',
  'Score viewer',
]

function ordinal(rank) {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  return `${rank}th`
}

function withTotals(track) {
  const teams = track.teams
    .map((team) => ({
      ...team,
      total: track.rounds.reduce((sum, round) => sum + team.scores[round], 0) + team.bonus,
    }))
    .sort((a, b) => b.total - a.total)

  let current = 1
  const ranks = teams.map((team, index) => {
    if (index > 0 && team.total < teams[index - 1].total) current += 1
    return current
  })

  return teams.map((team, index) => ({ ...team, rank: ranks[index] }))
}

function rowSurface(rank) {
  if (rank === 1) return 'bg-neo-yellow text-neo-black'
  if (rank === 3) return 'bg-neo-lightgray text-neo-black'
  return 'bg-white text-neo-black'
}

export default function LandingPage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const codeId = useId()
  const [user, setUser] = useState(undefined)
  const [eventCode, setEventCode] = useState('')
  const [trackId, setTrackId] = useState('software')
  const [frozen, setFrozen] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const previous = document.title
    document.title = 'LeadX — live leaderboard for a judged event'
    return () => {
      document.title = previous
    }
  }, [])

  useEffect(() => {
    if (!auth) return undefined
    const unsub = auth.onAuthStateChanged((next) => setUser(next))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!celebrating) return undefined
    const timer = setTimeout(() => setCelebrating(false), reduceMotion ? 1600 : 4200)
    return () => clearTimeout(timer)
  }, [celebrating, reduceMotion])

  const track = TRACKS[trackId]
  const rows = withTotals(track)
  const startHref = user ? '/dashboard' : '/login?mode=signup'
  const judgeHref = user ? '/assignments' : '/login'

  function openBoard(event) {
    event.preventDefault()
    const formattedId = eventCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    if (!formattedId) return
    navigate(`/${formattedId}`)
  }

  function toggleFreeze() {
    setFrozen((value) => !value)
    setCelebrating(false)
  }

  function celebrate() {
    setFrozen(false)
    setCelebrating(true)
  }

  return (
    <div className="min-h-dvh bg-neo-white text-neo-black font-base selection:bg-neo-yellow selection:text-neo-black">
      <header className="border-b border-neo-black">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 sm:px-8 lg:px-10">
          <Link to="/" className="mr-auto shrink-0" aria-label="LeadX, home">
            <img src="/Lead-X.png" alt="" className="h-10 w-auto sm:h-14" />
          </Link>
          <nav aria-label="Page" className="order-3 flex w-full gap-5 text-sm font-semibold sm:order-none sm:w-auto">
            <a className="underline-offset-4 hover:underline" href="#board">Board</a>
            <a className="underline-offset-4 hover:underline" href="#desks">Desks</a>
            <a className="underline-offset-4 hover:underline" href="#order">Order</a>
            <Link className="underline-offset-4 hover:underline" to="/docs">Docs</Link>
          </nav>
          <div className="flex items-center gap-4">
            {user ? (
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="text-sm font-semibold underline-offset-4 hover:underline"
              >
                Sign out
              </button>
            ) : (
              <Link to="/login" className="text-sm font-semibold underline-offset-4 hover:underline">
                Log in
              </Link>
            )}
            <Link
              to={startHref}
              className="bg-neo-black px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-neo-yellow hover:text-neo-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-black"
            >
              {user ? 'Your events' : 'Start an event'}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1320px] gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:gap-x-14 lg:gap-y-8 lg:px-10 lg:py-12">
          <div className="lg:col-start-1 lg:row-start-1">
            <h1 className="font-hero text-[clamp(3.15rem,5.4vw,4.9rem)] font-medium leading-[0.86] tracking-[-0.045em]">
              <span className="block">Scores move</span>
              <span className="block lg:pl-[8%]">in the room.</span>
            </h1>
            <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-zinc-800 sm:text-xl sm:leading-relaxed">
              LeadX is the public leaderboard for a hackathon or any event scored in rounds, and the desks that feed it. You set the tracks, the rounds, and the rubric. Judges enter scores from their own login. The board ranks each track as those scores are saved.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                to={startHref}
                className="inline-flex w-full items-center justify-center bg-neo-black px-6 py-3.5 font-hero text-2xl text-white transition-colors hover:bg-neo-yellow hover:text-neo-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-black sm:w-auto"
              >
                {user ? 'Your events' : 'Start an event'}
              </Link>
              <Link
                to={judgeHref}
                className="font-semibold underline decoration-neo-black/40 underline-offset-4 hover:decoration-neo-black"
              >
                Judge sign-in
              </Link>
            </div>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1" id="board">
            <SampleBoard
              track={track}
              rows={rows}
              frozen={frozen}
              celebrating={celebrating && !reduceMotion}
              trackId={trackId}
              onTrack={setTrackId}
              onMeasure={setBoardSize}
              boardSize={boardSize}
            />
          </div>

          <form onSubmit={openBoard} className="lg:col-start-1 lg:row-start-2">
            <label htmlFor={codeId} className="block font-hero text-2xl leading-none">
              Open a public board
            </label>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-700">
              Type the event code from the link. Spaces and punctuation become hyphens.
            </p>
            <div className="mt-4 flex max-w-md border-b-2 border-neo-black">
              <input
                id={codeId}
                value={eventCode}
                onChange={(event) => setEventCode(event.target.value)}
                placeholder="your-event-code"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-3 font-hero text-xl outline-none placeholder:text-zinc-500"
              />
              <button
                type="submit"
                className="px-2 font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-black"
              >
                Open
              </button>
            </div>
          </form>
        </section>

        <p className="border-y border-neo-black bg-neo-black px-5 py-4 text-lg leading-snug text-neo-white sm:px-8 sm:text-2xl lg:px-10">
          <span className="mx-auto block max-w-[1320px] font-hero tracking-[-0.03em]">
            Spectators do not sign in. The code is the address.
          </span>
        </p>

        <section aria-labelledby="rules-heading" className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <h2 id="rules-heading" className="max-w-[16ch] font-hero text-[clamp(2.4rem,5vw,4rem)] font-medium leading-[0.92] tracking-[-0.04em]">
            What the public page shows
          </h2>
          <dl className="mt-10 border-b border-neo-black">
            {RULES.map((rule) => (
              <div key={rule.term} className="grid gap-2 border-t border-neo-black py-6 md:grid-cols-[14rem_minmax(0,1fr)] md:items-baseline md:gap-10">
                <dt className="font-hero text-[1.7rem] leading-none tracking-[-0.03em]">{rule.term}</dt>
                <dd className="max-w-3xl text-base leading-relaxed text-zinc-800 sm:text-lg">{rule.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="desks" aria-labelledby="desks-heading" className="scroll-mt-6 border-t border-neo-black">
          <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
            <h2 id="desks-heading" className="max-w-[14ch] font-hero text-[clamp(2.4rem,5vw,4rem)] font-medium leading-[0.92] tracking-[-0.04em]">
              Two people, one event
            </h2>
            <div className="mt-12 grid gap-16 lg:grid-cols-2 lg:gap-20">
              <div>
                <h3 className="font-hero text-3xl tracking-[-0.03em]">Organizer</h3>
                <div className="mt-4 space-y-4 text-base leading-relaxed text-zinc-800 sm:text-lg">
                  <p>
                    After sign-in, the dashboard lists that account’s events. Each one opens an admin panel, the public board, and the judge page.
                  </p>
                  <p>
                    The panel is a set of tabs: tracks and rounds, rubrics, judges, teams, bonuses, and a score viewer. Rubrics are criteria with maximums. A round can be locked. Teams can be typed in or imported from a CSV, and removing a track downloads its teams before they go. Bonuses are named columns added into the total. The score viewer reads the same rounds, bonuses, and totals, and exports a CSV.
                  </p>
                </div>
                <figure className="mt-8">
                  <figcaption className="text-sm leading-relaxed text-zinc-700">
                    The admin tab strip. The two controls below it act on the sample board at the top of this page — the same actions as Freeze Leaderboard and Reveal &amp; celebrate.
                  </figcaption>
                  <div aria-hidden="true" className="mt-4 flex flex-wrap gap-2">
                    {ADMIN_TABS.map((tab) => {
                      const active = tab === 'Tracks & rounds'
                      return (
                        <span
                          key={tab}
                          className={`border-2 border-neo-black px-2.5 py-1.5 font-hero text-sm uppercase tracking-wide ${active ? 'bg-neo-black text-neo-yellow' : 'bg-white'}`}
                        >
                          {tab}
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={toggleFreeze}
                      aria-pressed={frozen}
                      className={`border-2 border-neo-black px-4 py-3 text-left font-hero text-lg uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-black ${frozen ? 'bg-neo-black text-white' : 'bg-neo-lightgray hover:bg-white'}`}
                    >
                      {frozen ? 'Suspense mode: on' : 'Freeze leaderboard'}
                    </button>
                    <button
                      type="button"
                      onClick={celebrate}
                      className="border-2 border-neo-black bg-neo-yellow px-4 py-3 text-left font-hero text-lg uppercase tracking-wide transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-black"
                    >
                      Reveal &amp; celebrate
                    </button>
                  </div>
                  <p aria-live="polite" className="mt-3 text-sm leading-relaxed text-zinc-700">
                    {frozen
                      ? 'The sample is frozen. On a real event the public rows hold still, and judges can still submit.'
                      : 'The sample is live. A saved score shows up on the open boards.'}
                    {celebrating ? ' Reveal clears the freeze. Open boards play confetti for 15 seconds.' : ''}
                  </p>
                </figure>
              </div>

              <div>
                <h3 className="font-hero text-3xl tracking-[-0.03em]">Judge</h3>
                <div className="mt-4 space-y-4 text-base leading-relaxed text-zinc-800 sm:text-lg">
                  <p>
                    Judges sign in with their own account. If the organizer has not added them yet, the judge page shows the account id to send over. Once they are on the event, they get a scoring screen rather than the admin panel.
                  </p>
                  <p>
                    They can filter by track, by round, and by pending or completed. Each criterion is a number up to the maximum on the rubric, and the round total is the sum of those numbers. Saving writes that judge’s scores for the team. A locked round will not take a new value. A save can play a short tone, and the judge can turn sound off.
                  </p>
                </div>
                <figure className="mt-8">
                  <div aria-hidden="true" className="border-4 border-neo-black bg-white">
                    <div className="flex items-end justify-between gap-3 border-b-4 border-neo-black px-4 py-3">
                      <span className="font-hero text-3xl leading-none">Paper Kite</span>
                      <span className="border border-neo-black bg-neo-yellow/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest">Evaluated</span>
                    </div>
                    <JudgeRound title="Pitch" total="24" locked={false} rows={[['Technical complexity', '8', '10'], ['UI/UX', '7', '10'], ['Innovation', '9', '10']]} />
                    <JudgeRound title="Build" total="17" locked rows={[['Technical complexity', '6', '10'], ['UI/UX', '6', '10'], ['Innovation', '5', '10']]} />
                    <div className="border-t-4 border-neo-black px-4 py-3">
                      <div className="bg-neo-yellow py-2 text-center font-hero text-xl uppercase tracking-widest">Save team scores</div>
                    </div>
                  </div>
                  <figcaption className="mt-3 text-sm leading-relaxed text-zinc-700">
                    One team on a judge’s card. Pitch is open and totals 24. Build is locked. Technical complexity, UI/UX, and innovation are a sample rubric, not a fixed set.
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <section id="order" aria-labelledby="order-heading" className="scroll-mt-6 bg-neo-black text-neo-white">
          <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
            <h2 id="order-heading" className="max-w-[16ch] font-hero text-[clamp(2.4rem,5vw,4rem)] font-medium leading-[0.92] tracking-[-0.04em]">
              From an empty event to the last name
            </h2>
            <ol className="mt-12 border-t border-white/25">
              {ORDER.map((step) => (
                <li key={step.n} className="grid gap-3 border-b border-white/25 py-7 md:grid-cols-[5.5rem_minmax(0,1fr)] md:gap-8">
                  <span className="font-hero text-4xl leading-none tracking-[-0.04em] text-neo-yellow">{step.n}</span>
                  <div>
                    <h3 className="font-hero text-2xl tracking-[-0.03em] sm:text-3xl">{step.title}</h3>
                    <p className="mt-2 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="close-heading" className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <h2 id="close-heading" className="max-w-[14ch] font-hero text-[clamp(2.8rem,6vw,5rem)] font-medium leading-[0.9] tracking-[-0.045em]">
            The room only needs the code.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-800">
            You need an account to create the event. A judge needs an account and a place on that event’s list. Everyone else needs the link.
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              to={startHref}
              className="inline-flex w-full items-center justify-center bg-neo-black px-6 py-3.5 font-hero text-2xl text-white transition-colors hover:bg-neo-yellow hover:text-neo-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-black sm:w-auto"
            >
              {user ? 'Your events' : 'Start an event'}
            </Link>
            <Link to="/docs" className="font-semibold underline decoration-neo-black/40 underline-offset-4 hover:decoration-neo-black">
              Read the docs
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-neo-black">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-5 py-6 text-sm text-zinc-700 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>© 2026 LeadX</p>
          <p>
            Built by{' '}
            <a className="font-semibold text-neo-black underline-offset-4 hover:underline" href="https://github.com/adityanaulakha">
              Aditya Naulakha
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

function SampleBoard({ track, rows, frozen, celebrating, trackId, onTrack, onMeasure, boardSize }) {
  return (
    <figure className="relative border-4 border-neo-black bg-neo-white">
      <figcaption className="sr-only">
        Sample public leaderboard, not a live event. {track.name} track. Ties share a rank.
      </figcaption>
      <div
        ref={(node) => {
          if (!node) return
          const next = { width: node.clientWidth, height: node.clientHeight }
          if (next.width !== boardSize.width || next.height !== boardSize.height) onMeasure(next)
        }}
        className="relative overflow-hidden"
      >
        {celebrating && boardSize.width > 0 && (
          <Confetti
            width={boardSize.width}
            height={boardSize.height}
            recycle={false}
            numberOfPieces={90}
            gravity={0.28}
            colors={['#FFD600', '#111111', '#FF3B30', '#F4F4F0']}
            style={{ position: 'absolute', inset: 0, zIndex: 30 }}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative p-3 sm:p-5">
          <div className="flex flex-col gap-4 border-b-4 border-neo-black pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {frozen ? (
                <span className="inline-flex border-4 border-neo-black bg-cyan-300 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em]">
                  Leaderboard frozen
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 border-4 border-neo-black bg-neo-yellow px-3 py-1.5 shadow-[3px_3px_0_#111]">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full border-2 border-neo-black bg-neo-red motion-reduce:animate-none" />
                  <span className="text-[11px] font-black uppercase tracking-[0.14em]">Live data</span>
                </span>
              )}
              <p className="mt-3 font-hero text-[2.4rem] uppercase leading-[0.82] tracking-tight sm:text-5xl">
                <span className="block">Global</span>
                <span className="mt-1 inline-block -rotate-1 border-4 border-neo-black bg-neo-yellow px-2.5 py-0.5 shadow-[4px_4px_0_#111]">
                  Ranks
                </span>
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="flex border-4 border-neo-black bg-white p-1 shadow-[4px_4px_0_#111]" role="group" aria-label="Sample track">
                {TRACK_ORDER.map((id) => {
                  const item = TRACKS[id]
                  const active = id === trackId
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onTrack(id)}
                      aria-pressed={active}
                      className={`px-3 py-2 font-hero text-lg uppercase leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-black ${active ? 'bg-neo-black text-neo-yellow' : 'text-neo-black hover:bg-neo-lightgray'}`}
                    >
                      {item.name}
                    </button>
                  )
                })}
              </div>
              <p className="border-4 border-neo-black bg-white px-3 py-1.5 text-center text-[11px] font-black uppercase tracking-[0.14em] shadow-[3px_3px_0_#111] sm:text-left">
                Total teams <span className="ml-2 font-hero text-xl normal-case tracking-normal text-neo-black">{rows.length}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 hidden md:block">
            <div className="grid grid-cols-[4.2rem_minmax(0,1fr)_3.6rem_3.6rem_4rem_4.6rem] gap-2 bg-neo-black px-3 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_#FFD600]">
              <span>Rank</span>
              <span>Team</span>
              {track.rounds.map((round) => (
                <span key={round} className="text-right">{round}</span>
              ))}
              <span className="text-right">{track.bonus}</span>
              <span className="text-right text-neo-yellow">Total</span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {rows.map((team) => (
                <DesktopRow key={team.id} team={team} track={track} marked={!frozen && team.id === 'paper' && trackId === 'software'} />
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 md:hidden">
            {rows.map((team) => (
              <MobileRow key={team.id} team={team} track={track} marked={!frozen && team.id === 'paper' && trackId === 'software'} />
            ))}
          </div>

          <p className="mt-3 max-w-prose text-sm leading-relaxed text-zinc-700">
            Sample scores, not a live event. {trackId === 'software'
              ? 'Paper Kite and Harbor are tied on 81, so both are 2nd and Kiln is 3rd. The ring marks the row that just changed.'
              : 'No tie on this track, so the places run straight down.'}{' '}
            Pitch, Build, and Bonus are sample column names.
          </p>
        </div>
      </div>
    </figure>
  )
}

function DesktopRow({ team, track, marked }) {
  return (
    <div className={`grid grid-cols-[4.2rem_minmax(0,1fr)_3.6rem_3.6rem_4rem_4.6rem] items-center gap-2 border-4 border-neo-black px-3 py-2.5 ${rowSurface(team.rank)} ${marked ? 'ring-4 ring-neo-yellow' : ''}`}>
      <span className="font-hero text-2xl tabular-nums leading-none">{ordinal(team.rank)}</span>
      <span className="truncate font-hero text-2xl leading-none">{team.name}</span>
      {track.rounds.map((round) => (
        <span key={round} className="text-right font-hero text-2xl tabular-nums leading-none">{team.scores[round]}</span>
      ))}
      <span className="text-right font-hero text-2xl tabular-nums leading-none">{team.bonus}</span>
      <span className="text-right">
        <span className={`inline-block font-hero text-3xl tabular-nums leading-none ${team.rank === 1 ? '-rotate-2 border-4 border-neo-black bg-white px-1.5 py-0.5 shadow-[3px_3px_0_#111]' : ''}`}>
          {team.total}
        </span>
      </span>
    </div>
  )
}

function MobileRow({ team, track, marked }) {
  return (
    <div className={`border-4 border-neo-black px-3 py-3 ${rowSurface(team.rank)} ${marked ? 'ring-4 ring-neo-yellow' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="font-hero text-3xl tabular-nums leading-none">{ordinal(team.rank)}</span>
        <span className="min-w-0 flex-1 truncate font-hero text-2xl leading-none">{team.name}</span>
        <span className={`font-hero text-3xl tabular-nums leading-none ${team.rank === 1 ? '-rotate-2 border-2 border-neo-black bg-white px-1.5' : ''}`}>
          {team.total}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {track.rounds.map((round) => (
          <span key={round} className="border-2 border-neo-black bg-neo-white px-2 py-1 text-[11px] font-bold uppercase tracking-wider">
            {round} <span className="font-hero text-base normal-case tracking-normal">{team.scores[round]}</span>
          </span>
        ))}
        <span className="border-2 border-neo-black bg-neo-white px-2 py-1 text-[11px] font-bold uppercase tracking-wider">
          {track.bonus} <span className="font-hero text-base normal-case tracking-normal">{team.bonus}</span>
        </span>
      </div>
    </div>
  )
}

function JudgeRound({ title, total, locked, rows }) {
  return (
    <div className="border-b-4 border-neo-black">
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-2.5">
        <span className="font-hero text-xl uppercase tracking-wide">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Total {total}</span>
          {locked && (
            <span className="border border-neo-black bg-neo-red/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-neo-red">Locked</span>
          )}
        </span>
      </div>
      <div className={locked ? 'opacity-50' : undefined}>
        {rows.map(([label, value, max]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-neo-black/15 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-600">{label}</span>
            <span className="min-w-[4.5rem] border-b-4 border-neo-black text-center font-hero text-2xl tabular-nums leading-none">
              {value}
              <span className="ml-0.5 text-[10px] font-bold tracking-normal text-zinc-500">/{max}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
