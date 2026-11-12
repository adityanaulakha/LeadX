import { AppBar, Button, Card, PageMain, PageShell, prose } from '../ui/ui.jsx'

export default function DocsPage() {
  return (
    <PageShell>
      <AppBar>
        <Button to="/login?mode=signup" size="sm">Get started</Button>
      </AppBar>
      <PageMain className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-600">Docs</p>
        <h1 className="mt-2 font-hero text-[clamp(2.4rem,5vw,3.6rem)] font-medium leading-[0.95] tracking-[-0.035em]">
          How an event is run
        </h1>
        <Card className="mt-8 p-5 sm:p-8">
          <h2 className="font-hero text-2xl tracking-[-0.03em]">A board, two desks</h2>
          <p className={`mt-3 ${prose}`}>
            LeadX is a live leaderboard for a judged event. Create an event from the dashboard, define tracks, rounds, and rubrics in the admin panel, add judges, and open the public board.
          </p>
          <ol className={`mt-6 list-decimal space-y-2 pl-5 ${prose}`}>
            <li>Create an event from the dashboard. The code is the public address.</li>
            <li>Add tracks and rounds, then a rubric for each round.</li>
            <li>Add judges and teams. A CSV can create many teams at once.</li>
            <li>Judges score from their login. The public page ranks each track as scores are saved.</li>
            <li>Freeze the board for the hold, then reveal. Confetti runs for 15 seconds. The podium page steps through places.</li>
          </ol>
        </Card>
      </PageMain>
    </PageShell>
  )
}
