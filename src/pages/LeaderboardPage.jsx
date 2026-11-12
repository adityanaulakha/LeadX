import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import useTeamsRealtime from '../hooks/useTeamsRealtime.js'
import { useAuthState, useRoles } from './AdminPage.jsx'
import { Badge, Button, EmptyState, PageMain, PageShell, prose } from '../ui/ui.jsx'

function LiveIndicator() {
  return (
    <Badge tone="yellow">
      <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neo-red motion-reduce:animate-none" />
      Live
    </Badge>
  )
}

function CategoryTabs({ current, onChange, tracks = [] }) {
  if (!tracks || tracks.length <= 1) return null;
  return (
    <div className="flex flex-wrap border-2 border-neo-black bg-white p-0.5">
      {tracks.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`min-h-10 px-3 py-1.5 font-hero text-base uppercase transition-colors ${
            current === t.id
              ? 'bg-neo-black text-neo-yellow'
              : 'text-neo-black hover:bg-neo-yellow'
          }`}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  const { hackathonId } = useParams()
  const user = useAuthState()
  const { isAdmin, isJudge } = useRoles(user, hackathonId)
  const { width, height } = useWindowSize()

  const { 
    teams, 
    tracks,
    roundsByTrack,
    bonusesByTrack,
    isFrozen,
    celebrationAt,
    updatedIds,
  } = useTeamsRealtime(hackathonId)

  const [track, setTrack] = useState('')
  const [displayTeams, setDisplayTeams] = useState(teams)
  const [showConfetti, setShowConfetti] = useState(false)

  // Initialize track
  useEffect(() => {
    if (tracks && tracks.length > 0 && !track) {
      setTrack(tracks[0].id)
    }
  }, [tracks, track])

  // Freeze functionality
  useEffect(() => {
    if (!isFrozen) {
      setDisplayTeams(teams)
    } else if (displayTeams.length === 0 && teams.length > 0) {
      setDisplayTeams(teams)
    }
  }, [teams, isFrozen, displayTeams.length])

  // Celebration functionality
  useEffect(() => {
    if (celebrationAt) {
      const timeDiff = Date.now() - celebrationAt
      if (timeDiff < 15000) {
        setShowConfetti(true)
        const timer = setTimeout(() => setShowConfetti(false), 15000 - timeDiff)
        return () => clearTimeout(timer)
      }
    }
  }, [celebrationAt])



  const filteredTeams = useMemo(() => {
    return displayTeams.filter(t => t.track === track)
  }, [displayTeams, track])

  const roundNames = roundsByTrack?.[track] || []
  const bonusNames = bonusesByTrack?.[track] || []

  let backUrl = "/"
  if (user) {
    if (isAdmin) backUrl = `/${hackathonId}/admin`
    else if (isJudge) backUrl = `/${hackathonId}/judge`
    else backUrl = "/dashboard"
  }

  return (
    <PageShell>
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-[100]">
          <Confetti width={width} height={height} numberOfPieces={180} gravity={0.15} colors={['#FFD600', '#111111', '#FF3B30', '#F4F4F0']} />
        </div>
      )}
      <PageMain>
        <header className="mb-8 flex flex-col gap-5 border-b-2 border-neo-black pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button to={backUrl} variant="white" size="sm">Back</Button>
              {!isFrozen && <LiveIndicator />}
              {isFrozen && <Badge tone="cyan">Leaderboard frozen</Badge>}
            </div>
            <h1 className="font-hero text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.04em]">
              Global ranks
            </h1>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <CategoryTabs current={track} onChange={setTrack} tracks={tracks} />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-600">
              Teams <span className="ml-1 font-hero text-lg normal-case tracking-normal text-neo-black">{filteredTeams.length}</span>
            </p>
          </div>
        </header>
        {filteredTeams.length === 0 ? (
          <EmptyState title="No teams yet">
            <p className={prose}>Waiting for teams on this track.</p>
          </EmptyState>
        ) : (
          <LeaderboardTable
            teams={filteredTeams}
            roundNames={roundNames}
            bonusNames={bonusNames}
            updatedIds={updatedIds}
          />
        )}
      </PageMain>
    </PageShell>
  )
}
