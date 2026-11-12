import { Badge } from '../ui/ui.jsx'

export default function LiveIndicator({ lastUpdateAt }) {
  return (
    <Badge tone="yellow" title={lastUpdateAt ? `Last update: ${new Date(lastUpdateAt).toLocaleTimeString()}` : 'Waiting for updates'}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neo-red motion-reduce:animate-none" />
      Live
    </Badge>
  )
}
