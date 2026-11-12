/* eslint-disable react-refresh/only-export-components */
import { Link } from 'react-router-dom'

export const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-black'

export const shell = 'mx-auto w-full max-w-[1280px] px-5 sm:px-8'

export const prose = 'text-[1.0625rem] leading-[1.65] text-zinc-800'
export const caption = 'text-[0.8125rem] leading-relaxed text-zinc-600'

const sizes = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  md: 'min-h-11 px-4 py-2.5 text-base',
  lg: 'min-h-12 px-5 py-3 text-xl',
}

const tones = {
  yellow: 'bg-neo-yellow text-neo-black hover:bg-[#ffe34a]',
  white: 'bg-white text-neo-black hover:bg-neo-lightgray',
  ink: 'bg-neo-black text-white hover:bg-neo-yellow hover:text-neo-black',
  danger: 'bg-neo-red text-white hover:bg-white hover:text-neo-red',
}

export function buttonClass(variant = 'yellow', size = 'md', extra = '') {
  return `lx-press inline-flex items-center justify-center gap-2 border-2 border-neo-black font-hero leading-none disabled:cursor-not-allowed disabled:opacity-50 ${tones[variant] || tones.yellow} ${sizes[size] || sizes.md} ${focus} ${extra}`
}

export function Button({
  variant = 'yellow',
  size = 'md',
  className = '',
  to,
  type = 'button',
  ...props
}) {
  const cls = buttonClass(variant, size, className)
  if (to) return <Link to={to} className={cls} {...props} />
  return <button type={type} className={cls} {...props} />
}

export const inputClass =
  `w-full min-w-0 border-2 border-neo-black bg-neo-white px-3 py-2.5 text-base text-neo-black outline-none placeholder:text-zinc-400 focus:bg-white ${focus}`

export function Label({ children, htmlFor, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-600 ${className}`}>
      {children}
    </label>
  )
}

export function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && <p className={caption}>{hint}</p>}
    </div>
  )
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`border-2 border-neo-black bg-white ${className}`} {...props}>
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'yellow', className = '', ...props }) {
  const map = {
    yellow: 'bg-neo-yellow text-neo-black',
    white: 'bg-white text-neo-black',
    ink: 'bg-neo-black text-neo-yellow',
    red: 'bg-white text-neo-red',
    cyan: 'bg-cyan-300 text-neo-black',
  }
  return (
    <span {...props} className={`inline-flex items-center border-2 border-neo-black px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${map[tone] || map.yellow} ${className}`}>
      {children}
    </span>
  )
}

export function Notice({ tone = 'info', children, className = '' }) {
  const map = {
    info: 'bg-white text-neo-black',
    error: 'bg-neo-red text-white',
    success: 'bg-neo-yellow text-neo-black',
    warn: 'bg-neo-yellow text-neo-black',
  }
  return (
    <div className={`border-2 border-neo-black px-4 py-3 text-sm font-semibold leading-relaxed ${map[tone] || map.info} ${className}`}>
      {children}
    </div>
  )
}

export function Loading({ label = 'Loading' }) {
  return (
    <PageShell>
      <div className="flex min-h-[50vh] items-center justify-center px-5">
        <p className="font-hero text-3xl tracking-[-0.03em] motion-safe:animate-pulse">{label}</p>
      </div>
    </PageShell>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="border-2 border-dashed border-neo-black bg-white px-6 py-12 text-center">
      <h2 className="font-hero text-3xl tracking-[-0.03em]">{title}</h2>
      {children && <div className={`mx-auto mt-3 max-w-md ${prose}`}>{children}</div>}
    </div>
  )
}

export function PageShell({ children }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-neo-white font-base text-neo-black selection:bg-neo-yellow selection:text-neo-black">
      {children}
    </div>
  )
}

export function PageMain({ children, className = '' }) {
  return <main className={`${shell} py-8 sm:py-12 ${className}`}>{children}</main>
}

export function AppBar({ children }) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-neo-black bg-neo-white">
      <div className={`${shell} flex flex-wrap items-center gap-2 py-2.5`}>
        <Link to="/" className={`mr-auto shrink-0 rounded-sm ${focus}`} aria-label="LeadX, home">
          <img src="/Lead-X.png" alt="" className="h-9 w-auto" />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
      </div>
    </header>
  )
}

export function PageTitle({ kicker, title, children }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b-2 border-neo-black pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-600">{kicker}</p>}
        <h1 className="font-hero text-[clamp(2.15rem,4.5vw,3.35rem)] font-medium leading-[0.95] tracking-[-0.035em]">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-neo-black/70" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto border-2 border-neo-black bg-white p-5 shadow-[4px_4px_0_#FFD600] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-hero text-2xl tracking-[-0.03em]">{title}</h2>
          {onClose && (
            <Button variant="white" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toast({ tone = 'success', children }) {
  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 border-2 border-neo-black px-4 py-3 text-sm font-semibold sm:left-auto sm:right-6 sm:max-w-sm ${tone === 'error' ? 'bg-neo-red text-white' : 'bg-neo-yellow text-neo-black'}`}>
      {children}
    </div>
  )
}
