import { useEffect, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { signOut, updatePassword } from 'firebase/auth'
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore'
import { auth, db, firebaseEnabled } from '../lib/firebase.js'
import { useAuthState } from './AdminPage.jsx' // reusing the auth hook
import { CONFIG_DOC } from '../lib/teams.js'
import { AppBar, Button, Card, Field, Loading, Modal, Notice, PageMain, PageShell, PageTitle, inputClass } from '../ui/ui.jsx'

export default function DashboardPage() {
  const user = useAuthState()
  const navigate = useNavigate()
  const [hackathons, setHackathons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newHackathonName, setNewHackathonName] = useState('')
  const [newHackathonSlug, setNewHackathonSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseEnabled || !db || !user?.uid) {
      setLoading(false)
      return undefined
    }

    const q = query(collection(db, 'hackathons'), where('ownerId', '==', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      const data = []
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() })
      })
      data.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      setHackathons(data)
      setLoading(false)
    })

    return () => unsub()
  }, [user?.uid])

  const handleCreateHackathon = async (e) => {
    e.preventDefault()
    if (!newHackathonName.trim()) return
    const slug = newHackathonSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    if (!slug) {
      setError('PLEASE SPECIFY A CUSTOM EVENT CODE / SLUG')
      return
    }
    setBusy(true)
    setError('')
    try {
      const existingDoc = await getDoc(doc(db, 'hackathons', slug))
      if (existingDoc.exists()) {
        setError('THIS EVENT CODE IS ALREADY TAKEN. PLEASE CHOOSE ANOTHER.')
        setBusy(false)
        return
      }

      await setDoc(doc(db, 'hackathons', slug), {
        name: newHackathonName.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp()
      })
      
      await setDoc(doc(db, 'hackathons', slug, 'settings', CONFIG_DOC), {
        tracks: [],
        rounds: {},
        bonuses: {},
        activeJudges: [],
        lockedRounds: [],
        rubrics: {},
        isFrozen: false,
        updatedAt: serverTimestamp()
      })

      setShowCreate(false)
      setNewHackathonName('')
      setNewHackathonSlug('')
      navigate(`/${slug}/admin`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteHackathon = (id, name) => {
    setModal({
      title: "PERMANENTLY DELETE EVENT?",
      message: `🚨 DANGER: PERMANENTLY DELETE EVENT "${name.toUpperCase()}"?\n\nThis will instantly delete the event document, judge registries, team details, and all scores from the database. This is completely irreversible.`,
      type: "prompt",
      defaultValue: "",
      onConfirm: async (val) => {
        if (val !== name) {
          setModal({
            title: "VERIFICATION FAILED",
            message: "The entered event name did not match. Deletion cancelled.",
            type: "alert",
            onConfirm: () => {}
          });
          return;
        }
        setBusy(true);
        try {
          await deleteDoc(doc(db, 'hackathons', id));
          setModal({
            title: "EVENT DELETED",
            message: `Successfully deleted "${name}" from your workspace.`,
            type: "alert",
            onConfirm: () => {}
          });
        } catch (err) {
          setModal({
            title: "ERROR",
            message: "Failed to delete event: " + err.message,
            type: "alert",
            onConfirm: () => {}
          });
        } finally {
          setBusy(false);
        }
      }
    });
  }

  const handleEditHackathon = (id, currentName) => {
    setModal({
      title: "RENAME EVENT",
      message: "Enter new event designation:",
      type: "prompt",
      defaultValue: currentName,
      onConfirm: async (newName) => {
        if (newName && newName.trim() && newName.trim() !== currentName) {
          try {
            await updateDoc(doc(db, 'hackathons', id), {
              name: newName.trim()
            });
          } catch (err) {
            setModal({
              title: "ERROR",
              message: "Failed to update name: " + err.message,
              type: "alert",
              onConfirm: () => {}
            });
          }
        }
      }
    });
  }

  const handleChangePassword = () => {
    setModal({
      title: "CHANGE PASSWORD",
      message: "Enter your new password (minimum 6 characters):",
      type: "prompt",
      defaultValue: "",
      onConfirm: async (newPassword) => {
        if (!newPassword) return;
        if (newPassword.length < 6) {
          setModal({
            title: "PASSWORD TOO SHORT",
            message: "Password must be at least 6 characters.",
            type: "alert",
            onConfirm: () => {}
          });
          return;
        }
        try {
          await updatePassword(auth.currentUser, newPassword);
          setModal({
            title: "PASSWORD UPDATED",
            message: "Password updated successfully!",
            type: "alert",
            onConfirm: () => {}
          });
        } catch (err) {
          if (err.code === 'auth/requires-recent-login') {
            setModal({
              title: "RE-AUTHENTICATION REQUIRED",
              message: "For security reasons, please log out and log back in to change your password.",
              type: "alert",
              onConfirm: () => {}
            });
          } else {
            setModal({
              title: "ERROR",
              message: "Failed to update password: " + err.message,
              type: "alert",
              onConfirm: () => {}
            });
          }
        }
      }
    });
  }

  if (!firebaseEnabled) {
    return <PageShell><PageMain><Notice>Firebase is not configured.</Notice></PageMain></PageShell>
  }

  if (user === undefined) {
    return <Loading label="Loading" />
  }

  if (user === null) {
    return <Navigate to="/login" replace />
  }

  return (
    <PageShell>
      <AppBar>
        <Button to="/assignments" variant="white" size="sm">Judge portal</Button>
        <span className="hidden max-w-[14rem] truncate text-xs font-semibold text-zinc-600 sm:inline">{user.email}</span>
        <Button variant="white" size="sm" onClick={handleChangePassword}>Password</Button>
        <Button variant="ink" size="sm" onClick={() => signOut(auth)}>Sign out</Button>
      </AppBar>
      <PageMain>
        <PageTitle kicker="Organizer" title="Your events" />

        {showCreate && (
          <Modal title="New event" onClose={() => setShowCreate(false)}>
            <form onSubmit={handleCreateHackathon} className="flex flex-col gap-4">
              <Field label="Event name" htmlFor="event-name">
                <input id="event-name" autoFocus value={newHackathonName} onChange={e => setNewHackathonName(e.target.value)} className={inputClass} placeholder="Spring hackathon" />
              </Field>
              <Field label="Event code" htmlFor="event-code" hint={`Public link: /${newHackathonSlug || 'your-code'}`}>
                <input id="event-code" value={newHackathonSlug} onChange={e => setNewHackathonSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))} className={inputClass} placeholder="spring-hack" />
              </Field>
              {error && <Notice tone="error">{error}</Notice>}
              <Button type="submit" variant="ink" className="w-full" disabled={busy}>{busy ? 'Creating…' : 'Create and open'}</Button>
            </form>
          </Modal>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button type="button" onClick={() => setShowCreate(true)} className="flex min-h-56 flex-col items-start justify-between border-2 border-dashed border-neo-black bg-neo-white p-5 text-left transition-colors hover:bg-neo-yellow">
            <span className="font-hero text-4xl leading-none">+</span>
            <span className="font-hero text-2xl tracking-[-0.03em]">Create event</span>
          </button>
          {loading ? (
            <Card className="flex min-h-56 items-center justify-center p-6 font-hero text-2xl motion-safe:animate-pulse">Loading</Card>
          ) : (
            hackathons.map(h => (
              <Card key={h.id} className="flex min-h-56 flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-hero text-2xl leading-none tracking-[-0.03em]">{h.name}</h2>
                    <Button variant="white" size="sm" onClick={() => handleEditHackathon(h.id, h.name)} title="Rename event">Rename</Button>
                  </div>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-zinc-600">Code {h.id}</p>
                  <p className="mt-1 text-xs text-zinc-500">Created {h.createdAt?.toDate?.()?.toLocaleDateString() || 'just now'}</p>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <Button to={`/${h.id}/admin`} variant="ink" className="w-full">Admin</Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button to={`/${h.id}`} variant="white">Public</Button>
                    <Button to={`/${h.id}/judge`} variant="yellow">Judge</Button>
                  </div>
                  <Button variant="danger" className="w-full" onClick={() => handleDeleteHackathon(h.id, h.name)}>Delete event</Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {modal && (
          <Modal title={modal.title} onClose={modal.type === 'alert' ? () => setModal(null) : () => setModal(null)}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{modal.message}</p>
            {modal.type === 'prompt' && (
              <input id="modalInput" type="text" defaultValue={modal.defaultValue || ''} className={`${inputClass} mt-4`} autoFocus />
            )}
            <div className="mt-5 flex gap-2">
              <Button variant="ink" className="flex-1" onClick={() => {
                const val = document.getElementById('modalInput')?.value
                modal.onConfirm(val)
                setModal(null)
              }}>Confirm</Button>
              {modal.type !== 'alert' && (
                <Button variant="white" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              )}
            </div>
          </Modal>
        )}
      </PageMain>
    </PageShell>
  )
}
