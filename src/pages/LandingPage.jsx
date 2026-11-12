import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { motion, useReducedMotion } from 'framer-motion'
import Confetti from 'react-confetti'
import { auth } from '../lib/firebase.js'

const MotionDiv = motion.div

const shell = 'mx-auto w-full max-w-[1280px] px-5 sm:px-8'
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-black'
const btn = `lx-press inline-flex min-h-11 items-center justify-center gap-2 border-2 border-neo-black px-5 py-2.5 font-hero text-xl leading-none ${focus}`
const btnYellow = `${btn} bg-neo-yellow hover:bg-[#ffe34a]`
const btnWhite = `${btn} bg-white hover:bg-neo-lightgray`
const btnInk = `${btn} bg-neo-black text-white hover:bg-neo-yellow hover:text-neo-black`
const navLink = `whitespace-nowrap text-[13px] font-semibold text-zinc-800 underline-offset-4 transition-colors hover:text-neo-black hover:underline sm:text-sm ${focus}`
const sectionTitle = 'max-w-[16ch] font-hero text-[clamp(2.15rem,4vw,3.15rem)] font-medium leading-[0.96] tracking-[-0.035em]'
const prose = 'text-[1.0625rem] leading-[1.65] text-zinc-800'
const caption = 'text-[0.8125rem] leading-relaxed text-zinc-600'

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
  const [climb, setClimb] = useState(false)
  const motionOk = reduceMotion === false

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

  useEffect(() => {
    if (!motionOk || frozen || trackId !== 'software') return undefined
    const timer = setInterval(() => setClimb((value) => !value), 3800)
    return () => clearInterval(timer)
  }, [motionOk, frozen, trackId])

  const track = TRACKS[trackId]
  const displayTrack = useMemo(() => {
    if (!climb || !motionOk || frozen || track.id !== 'software') return track
    return {
      ...track,
      teams: track.teams.map((team) => (
        team.id === 'paper'
          ? { ...team, scores: { ...team.scores, Build: team.scores.Build + 8 } }
          : team
      )),
    }
  }, [track, climb, motionOk, frozen])
  const rows = withTotals(displayTrack)
  const climbing = climb && motionOk && !frozen && track.id === 'software'
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
    <div className="min-h-dvh overflow-x-clip bg-neo-white font-base text-neo-black selection:bg-neo-yellow selection:text-neo-black">
      <header className="sticky top-0 z-30 border-b-2 border-neo-black bg-neo-white">
        <div className={`${shell} flex flex-wrap items-center gap-x-5 gap-y-2 py-2.5`}>
          <Link to="/" className={`mr-auto shrink-0 rounded-sm ${focus}`} aria-label="LeadX, home">
            <img src="/Lead-X.png" alt="" className="h-9 w-auto sm:h-11" />
          </Link>
          <nav aria-label="Page" className="order-last flex w-full gap-x-4 sm:order-none sm:w-auto">
            <a className={navLink} href="#board">Board</a>
            <a className={navLink} href="#desks">Desks</a>
            <a className={navLink} href="#order">Order</a>
            <Link className={navLink} to="/docs">Docs</Link>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <button type="button" onClick={() => signOut(auth)} className={navLink}>
                Sign out
              </button>
            ) : (
              <Link to="/login" className={navLink}>Log in</Link>
            )}
            <Link to={startHref} className={`lx-press lx-press-sm inline-flex min-h-9 items-center border-2 border-neo-black bg-neo-yellow px-3 py-1.5 text-sm font-semibold leading-none hover:bg-[#ffe34a] ${focus}`}>
              {user ? 'Your events' : 'Start an event'}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lx-hero">
          <div className={`${shell} relative z-10 grid gap-8 py-7 sm:py-12 xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] xl:grid-rows-[auto_auto] xl:items-center xl:gap-x-10 xl:gap-y-8 xl:py-14`}>
            <div className="xl:col-start-1 xl:row-start-1">
              <h1 className="font-hero font-medium leading-[0.8] tracking-[-0.05em]">
                <span className="block text-[clamp(4.1rem,8.2vw,7.25rem)]">Scores</span>
                <span className="mt-2 inline-block -rotate-1 border-[3px] border-neo-black bg-neo-yellow px-2.5 pb-1 text-[clamp(4.1rem,8.2vw,7.25rem)] leading-[0.82] shadow-[6px_6px_0_#111] sm:px-3.5">
                  move.
                </span>
              </h1>
              <p className={`mt-6 max-w-[28rem] sm:mt-8 ${prose}`}>
                The public board for a hackathon. You set the tracks, rounds, and rubric. Judges score. The ranks follow.
              </p>
              <div className="mt-6 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center">
                <Link to={startHref} className={btnYellow}>
                  {user ? 'Your events' : 'Start an event'}
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to={judgeHref} className={`${btnWhite} sm:px-5`}>
                  Judge sign-in
                </Link>
              </div>
            </div>

            <div className="scroll-mt-20 xl:col-start-2 xl:row-span-2 xl:row-start-1" id="board">
              <SampleBoard
                track={displayTrack}
                rows={rows}
                frozen={frozen}
                celebrating={celebrating && motionOk}
                trackId={trackId}
                onTrack={setTrackId}
                onMeasure={setBoardSize}
                boardSize={boardSize}
                climbing={climbing}
                animate={motionOk && !frozen}
              />
            </div>

            <form onSubmit={openBoard} className="xl:col-start-1 xl:row-start-2">
              <label htmlFor={codeId} className="block font-hero text-[1.65rem] leading-none tracking-[-0.03em]">
                Open a public board
              </label>
              <p className={`mt-2 max-w-md ${caption}`}>
                Type the event code from the link. Spaces and punctuation become hyphens.
              </p>
              <div className="mt-3 flex max-w-md border-2 border-neo-black bg-white shadow-[3px_3px_0_#FFD600]">
                <input
                  id={codeId}
                  value={eventCode}
                  onChange={(event) => setEventCode(event.target.value)}
                  placeholder="your-event-code"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`min-w-0 flex-1 bg-transparent px-3 py-2.5 font-hero text-base outline-none placeholder:text-zinc-500 sm:text-lg ${focus}`}
                />
                <button type="submit" className={`inline-flex min-h-11 items-center border-l-2 border-neo-black bg-neo-yellow px-4 font-hero text-lg leading-none transition-colors hover:bg-[#ffe34a] active:bg-[#f5cc00] ${focus}`}>
                  Open
                </button>
              </div>
            </form>
          </div>
        </section>

        <div className="border-y-2 border-neo-black bg-neo-black text-neo-white">
          <p className={`${shell} py-5 font-hero text-[1.35rem] leading-tight tracking-[-0.03em] sm:py-6 sm:text-[1.7rem]`}>
            Spectators do not sign in. The code is the address.
          </p>
        </div>

        <section aria-labelledby="rules-heading" className={`${shell} py-20 sm:py-28`}>
          <h2 id="rules-heading" className={sectionTitle}>
            What the public page shows
          </h2>
          <dl className="mt-10 border-b border-neo-black/80">
            {RULES.map((rule) => (
              <div key={rule.term} className="grid gap-2 border-t border-neo-black/80 py-5 md:grid-cols-[11rem_minmax(0,40rem)] md:items-baseline md:gap-10 md:py-6">
                <dt className="font-hero text-[1.45rem] leading-none tracking-[-0.03em]">{rule.term}</dt>
                <dd className={prose}>{rule.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="desks" aria-labelledby="desks-heading" className="scroll-mt-16 border-t-2 border-neo-black">
          <div className={`${shell} py-20 sm:py-28`}>
            <h2 id="desks-heading" className={sectionTitle}>
              Two people, one event
            </h2>
            <div className="mt-12 grid gap-14 lg:grid-cols-2 lg:gap-16">
              <div>
                <h3 className="font-hero text-[1.75rem] tracking-[-0.03em]">Organizer</h3>
                <div className={`mt-4 space-y-4 ${prose}`}>
                  <p>
                    After sign-in, the dashboard lists that account’s events. Each one opens an admin panel, the public board, and the judge page.
                  </p>
                  <p>
                    The panel is a set of tabs: tracks and rounds, rubrics, judges, teams, bonuses, and a score viewer. Rubrics are criteria with maximums. A round can be locked. Teams can be typed in or imported from a CSV, and removing a track downloads its teams before they go. Bonuses are named columns added into the total. The score viewer reads the same rounds, bonuses, and totals, and exports a CSV.
                  </p>
                </div>
                <figure className="mt-8 border-2 border-neo-black bg-white p-4 sm:p-5">
                  <figcaption className={caption}>
                    The admin tab strip. The two controls below it act on the sample board — the same actions as Freeze leaderboard and Reveal &amp; celebrate.
                  </figcaption>
                  <div aria-hidden="true" className="mt-4 flex flex-wrap gap-1.5">
                    {ADMIN_TABS.map((tab) => {
                      const active = tab === 'Tracks & rounds'
                      return (
                        <span
                          key={tab}
                          className={`border-2 border-neo-black px-2 py-1 font-hero text-[0.8rem] uppercase tracking-wide ${active ? 'bg-neo-black text-neo-yellow' : 'bg-neo-white'}`}
                        >
                          {tab}
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={toggleFreeze}
                      aria-pressed={frozen}
                      className={`${frozen ? btnInk : btnWhite} flex-1 px-3 text-left text-base sm:text-lg`}
                    >
                      {frozen ? 'Suspense mode: on' : 'Freeze leaderboard'}
                    </button>
                    <button
                      type="button"
                      onClick={celebrate}
                      className={`${btnYellow} flex-1 px-3 text-left text-base sm:text-lg`}
                    >
                      Reveal &amp; celebrate
                    </button>
                  </div>
                  <p aria-live="polite" className={`mt-3 ${caption}`}>
                    {frozen
                      ? 'The sample is frozen. On a real event the public rows hold still, and judges can still submit.'
                      : 'The sample is live. A saved score shows up on the open boards.'}
                    {celebrating ? ' Reveal clears the freeze. Open boards play confetti for 15 seconds.' : ''}
                  </p>
                </figure>
              </div>

              <div>
                <h3 className="font-hero text-[1.75rem] tracking-[-0.03em]">Judge</h3>
                <div className={`mt-4 space-y-4 ${prose}`}>
                  <p>
                    Judges sign in with their own account. If the organizer has not added them yet, the judge page shows the account id to send over. Once they are on the event, they get a scoring screen rather than the admin panel.
                  </p>
                  <p>
                    They can filter by track, by round, and by pending or completed. Each criterion is a number up to the maximum on the rubric, and the round total is the sum of those numbers. Saving writes that judge’s scores for the team. A locked round will not take a new value. A save can play a short tone, and the judge can turn sound off.
                  </p>
                </div>
                <figure className="mt-8">
                  <div aria-hidden="true" className="border-2 border-neo-black bg-white">
                    <div className="flex items-end justify-between gap-3 border-b-2 border-neo-black px-4 py-3">
                      <span className="font-hero text-[1.65rem] leading-none tracking-[-0.03em]">Paper Kite</span>
                      <span className="border-2 border-neo-black bg-neo-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]">Evaluated</span>
                    </div>
                    <JudgeRound title="Pitch" total="24" locked={false} rows={[['Technical complexity', '8', '10'], ['UI/UX', '7', '10'], ['Innovation', '9', '10']]} />
                    <JudgeRound title="Build" total="17" locked rows={[['Technical complexity', '6', '10'], ['UI/UX', '6', '10'], ['Innovation', '5', '10']]} />
                    <div className="border-t-2 border-neo-black px-4 py-3">
                      <div className="border-2 border-neo-black bg-neo-yellow py-2 text-center font-hero text-lg uppercase tracking-[0.12em]">Save team scores</div>
                    </div>
                  </div>
                  <figcaption className={`mt-3 ${caption}`}>
                    One team on a judge’s card. Pitch is open and totals 24. Build is locked. Technical complexity, UI/UX, and innovation are a sample rubric, not a fixed set.
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <section id="order" aria-labelledby="order-heading" className="scroll-mt-16 bg-neo-black text-neo-white">
          <div className={`${shell} py-20 sm:py-28`}>
            <h2 id="order-heading" className={sectionTitle}>
              From an empty event to the last name
            </h2>
            <ol className="mt-10 border-t border-white/20">
              {ORDER.map((step) => (
                <li key={step.n} className="grid gap-2 border-b border-white/20 py-6 md:grid-cols-[4.5rem_minmax(0,40rem)] md:gap-8 md:py-7">
                  <span className="font-hero text-[1.65rem] leading-none tracking-[-0.04em] text-neo-yellow">{step.n}</span>
                  <div>
                    <h3 className="font-hero text-[1.65rem] tracking-[-0.03em] sm:text-[1.85rem]">{step.title}</h3>
                    <p className="mt-2 max-w-3xl text-[1.0625rem] leading-[1.65] text-white/80">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="close-heading" className={`${shell} scroll-mt-16 py-20 sm:py-28`}>
          <h2 id="close-heading" className="max-w-[12ch] font-hero text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[0.94] tracking-[-0.04em]">
            The room only needs the code.
          </h2>
          <p className={`mt-6 max-w-xl ${prose}`}>
            You need an account to create the event. A judge needs an account and a place on that event’s list. Everyone else needs the link.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link to={startHref} className={btnYellow}>
              {user ? 'Your events' : 'Start an event'}
              <span aria-hidden="true">→</span>
            </Link>
            <Link to="/docs" className={btnWhite}>
              Read the docs
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-neo-black">
        <div className={`${shell} flex flex-col gap-6 py-8`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className={`w-fit rounded-sm ${focus}`} aria-label="LeadX, home">
              <img src="/Lead-X.png" alt="" className="h-9 w-auto" />
            </Link>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2">
              <a className={navLink} href="#board">Board</a>
              <a className={navLink} href="#desks">Desks</a>
              <a className={navLink} href="#order">Order</a>
              <Link className={navLink} to="/docs">Docs</Link>
              <Link className={navLink} to="/login">Log in</Link>
            </nav>
          </div>
          <div className="flex flex-col gap-2 border-t border-neo-black/15 pt-4 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 LeadX</p>
            <p>
              Built by{' '}
              <a className={`font-semibold text-neo-black underline-offset-4 hover:underline ${focus}`} href="https://github.com/adityanaulakha">
                Aditya Naulakha
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SampleBoard({ track, rows, frozen, celebrating, trackId, onTrack, onMeasure, boardSize, climbing, animate }) {
  return (
    <figure>
      <div className="relative pb-2 pr-2 sm:pb-3 sm:pr-3">
        <div aria-hidden="true" className="absolute bottom-0 right-0 left-2 top-2 border-2 border-neo-black bg-neo-yellow xl:left-3 xl:top-3 xl:rotate-[1.6deg]" />
        <div className="relative border-2 border-neo-black bg-neo-white">
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
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.045)_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="relative p-3 sm:p-4">
          <div className="flex flex-col gap-3 border-b-2 border-neo-black pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {frozen ? (
                <span className="inline-flex border-2 border-neo-black bg-cyan-300 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em]">
                  Leaderboard frozen
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 border-2 border-neo-black bg-neo-yellow px-2.5 py-1">
                  <span className="h-2 w-2 animate-pulse rounded-full border-2 border-neo-black bg-neo-red motion-reduce:animate-none" />
                  <span className="text-[11px] font-black uppercase tracking-[0.14em]">Live data</span>
                </span>
              )}
              <p className="mt-2 font-hero text-[1.7rem] uppercase leading-[0.84] tracking-[-0.03em] sm:text-[2.6rem]">
                <span className="block">Global</span>
                <span className="mt-1 inline-block -rotate-1 border-2 border-neo-black bg-neo-yellow px-2 py-0.5 shadow-[3px_3px_0_#111]">
                  Ranks
                </span>
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="flex border-2 border-neo-black bg-white p-0.5" role="group" aria-label="Sample track">
                {TRACK_ORDER.map((id) => {
                  const item = TRACKS[id]
                  const active = id === trackId
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onTrack(id)}
                      aria-pressed={active}
                      className={`min-h-10 px-3 py-1.5 font-hero text-base uppercase leading-none transition-colors ${focus} ${active ? 'bg-neo-black text-neo-yellow' : 'text-neo-black hover:bg-neo-yellow active:bg-neo-black active:text-neo-yellow'}`}
                    >
                      {item.name}
                    </button>
                  )
                })}
              </div>
              <p className="border-2 border-neo-black bg-white px-2.5 py-1 text-center text-[11px] font-black uppercase tracking-[0.14em] sm:text-left">
                Total teams <span className="ml-1.5 font-hero text-lg normal-case tracking-normal">{rows.length}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 hidden md:block">
            <div className="grid grid-cols-[3.6rem_minmax(0,1fr)_3.1rem_3.1rem_3.4rem_4rem] gap-2 bg-neo-black px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[3px_3px_0_#FFD600]">
              <span>Rank</span>
              <span>Team</span>
              {track.rounds.map((round) => (
                <span key={round} className="text-right">{round}</span>
              ))}
              <span className="text-right">{track.bonus}</span>
              <span className="text-right text-neo-yellow">Total</span>
            </div>
            <div key={trackId} className="mt-2 flex flex-col gap-2">
              {rows.map((team) => (
                <DesktopRow key={team.id} team={team} track={track} marked={!frozen && team.id === 'paper' && trackId === 'software'} animate={animate} hot={climbing && team.id === 'paper'} />
              ))}
            </div>
          </div>

          <div key={`${trackId}-m`} className="mt-4 flex flex-col gap-2 md:hidden">
            {rows.map((team) => (
              <MobileRow key={team.id} team={team} track={track} marked={!frozen && team.id === 'paper' && trackId === 'software'} animate={animate} hot={climbing && team.id === 'paper'} />
            ))}
          </div>

        </div>
      </div>
        </div>
      </div>
      <figcaption className={`mt-3 max-w-prose ${caption}`}>
        Sample scores, not a live event. {trackId !== 'software'
          ? 'No tie on this track, so the places run straight down.'
          : climbing
            ? 'Paper Kite’s Build just rose, so it takes 1st and the rows slide.'
            : 'Paper Kite and Harbor are tied on 81, so both are 2nd and Kiln is 3rd. The ring marks the row that just changed.'}{' '}
        Pitch, Build, and Bonus are sample column names.
      </figcaption>
    </figure>
  )
}

function DesktopRow({ team, track, marked, animate, hot }) {
  return (
    <MotionDiv
      layout={animate}
      transition={animate ? { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 } : { duration: 0 }}
      className={`relative grid grid-cols-[3.6rem_minmax(0,1fr)_3.1rem_3.1rem_3.4rem_4rem] items-center gap-2 border-2 border-neo-black px-3 py-2 ${rowSurface(team.rank)} ${marked ? 'z-10 ring-2 ring-neo-yellow ring-offset-1' : ''}`}
    >
      <span className="font-hero text-xl tabular-nums leading-none">{ordinal(team.rank)}</span>
      <span className="truncate font-hero text-xl leading-none">{team.name}</span>
      {track.rounds.map((round) => (
        <span key={round} className="text-right font-hero text-xl tabular-nums leading-none">
          <Pop value={team.scores[round]} hot={hot && round === 'Build'} />
        </span>
      ))}
      <span className="text-right font-hero text-xl tabular-nums leading-none">{team.bonus}</span>
      <span className="text-right">
        <span className={`inline-block font-hero text-2xl tabular-nums leading-none ${team.rank === 1 ? '-rotate-1 border-2 border-neo-black bg-white px-1 py-0.5 shadow-[2px_2px_0_#111]' : ''}`}>
          <Pop value={team.total} hot={hot} />
        </span>
      </span>
    </MotionDiv>
  )
}

function MobileRow({ team, track, marked, animate, hot }) {
  return (
    <MotionDiv
      layout={animate}
      transition={animate ? { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 } : { duration: 0 }}
      className={`relative border-2 border-neo-black px-3 py-3 ${rowSurface(team.rank)} ${marked ? 'z-10 ring-2 ring-neo-yellow ring-offset-1' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="font-hero text-2xl tabular-nums leading-none">{ordinal(team.rank)}</span>
        <span className="min-w-0 flex-1 truncate font-hero text-xl leading-none">{team.name}</span>
        <span className={`font-hero text-2xl tabular-nums leading-none ${team.rank === 1 ? '-rotate-1 border-2 border-neo-black bg-white px-1' : ''}`}>
          <Pop value={team.total} hot={hot} />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {track.rounds.map((round) => (
          <span key={round} className="border-2 border-neo-black bg-neo-white px-2 py-1 text-[11px] font-bold uppercase tracking-wider">
            {round}{' '}
            <span className="font-hero text-base normal-case tracking-normal">
              <Pop value={team.scores[round]} hot={hot && round === 'Build'} />
            </span>
          </span>
        ))}
        <span className="border-2 border-neo-black bg-neo-white px-2 py-1 text-[11px] font-bold uppercase tracking-wider">
          {track.bonus} <span className="font-hero text-base normal-case tracking-normal">{team.bonus}</span>
        </span>
      </div>
    </MotionDiv>
  )
}

function Pop({ value, hot }) {
  return <span key={value} className={hot ? 'lx-pop inline-block' : 'inline-block'}>{value}</span>
}

function JudgeRound({ title, total, locked, rows }) {
  return (
    <div className="border-b-2 border-neo-black">
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-2.5">
        <span className="font-hero text-lg uppercase tracking-[0.06em]">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">Total {total}</span>
          {locked && (
            <span className="border-2 border-neo-black bg-white px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-neo-red">Locked</span>
          )}
        </span>
      </div>
      <div className={locked ? 'opacity-45' : undefined}>
        {rows.map(([label, value, max]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-neo-black/10 px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-600">{label}</span>
            <span className="min-w-[4.25rem] border-b-2 border-neo-black pb-0.5 text-center font-hero text-xl tabular-nums leading-none">
              {value}
              <span className="ml-0.5 text-[10px] font-bold tracking-normal text-zinc-500">/{max}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
