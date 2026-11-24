import { useState } from "react"
import { Check, CloudAlert, LogOut, Mail, RefreshCw, UserRound } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { signInWithEmail, signInWithGitHub, signOut, useAuth, type SyncState } from "@/lib/auth"

const GitHubMark = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
)

/** GitHub button plus an email magic-link form. */
export function SignInPanel({ idPrefix = "si" }: { idPrefix?: string }) {
  const { error } = useAuth()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState("")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr("")
    const res = await signInWithEmail(email.trim())
    setBusy(false)
    if (res) setErr(res)
    else setSent(email.trim())
  }
  if (sent) {
    return (
      <div className="space-y-2 text-sm" role="status">
        <p className="font-medium">Check your email</p>
        <p className="text-muted-foreground text-pretty">We sent a sign-in link to {sent}. Open it on this device to finish signing in. It comes from Supabase Auth and can take a few minutes; check your spam folder if it doesn’t show up.</p>
        <Button variant="ghost" size="sm" onClick={() => setSent("")}>Use a different email</Button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => void signInWithGitHub()}><GitHubMark />Continue with GitHub</Button>
      <div className="text-muted-foreground flex items-center gap-3 text-xs" aria-hidden="true"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={send} className="grid gap-2">
        <Label htmlFor={idPrefix + "-email"}>Email</Label>
        <Input id={idPrefix + "-email"} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="text-base sm:text-sm" />
        <Button type="submit" variant="outline" disabled={busy || !email.includes("@")}><Mail />{busy ? "Sending…" : "Email me a sign-in link"}</Button>
      </form>
      {(err || error) && <p role="alert" className="text-destructive text-sm">{err || error}</p>}
    </div>
  )
}

export function SignInDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in to Music Lab</DialogTitle>
          <DialogDescription>Your sprints, practice log and scores are saved to your account and sync across devices.</DialogDescription>
        </DialogHeader>
        <SignInPanel idPrefix="dlg" />
      </DialogContent>
    </Dialog>
  )
}

const SYNC: Record<SyncState, string> = { idle: "", loading: "Loading your progress…", saving: "Saving…", saved: "Progress saved", error: "Couldn't save. Retrying when you make a change." }

/** Sidebar footer item: sign in, or your account with sync status and sign out. */
export function AccountMenu() {
  const a = useAuth()
  if (a.status === "disabled" || a.status === "loading") return null
  // Signed out, the sidebar offers sign-in at the top instead.
  if (a.status === "signed-out") return null
  const name = (a.user?.user_metadata?.user_name as string) || (a.user?.user_metadata?.full_name as string) || a.user?.email || "Account"
  const SyncIcon = a.sync === "error" ? CloudAlert : a.sync === "saving" || a.sync === "loading" ? RefreshCw : Check
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={name}>
            <UserRound />
            <span className="min-w-0 flex-1 truncate">{name}</span>
            {a.sync !== "idle" && <SyncIcon className="text-muted-foreground ml-auto !size-3.5" aria-label={SYNC[a.sync]} />}
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-60">
          <DropdownMenuLabel className="space-y-0.5 font-normal">
            <p className="truncate text-sm font-medium">{name}</p>
            {a.user?.email && a.user.email !== name && <p className="text-muted-foreground truncate text-xs">{a.user.email}</p>}
            <p className="text-muted-foreground text-xs">{SYNC[a.sync] || "Signed in"}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/settings">Settings and data</Link></DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void signOut()}><LogOut />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

/** Pages that track your progress need an account once accounts are set up. */
export function RequireAccount({ children, what }: { children: React.ReactNode; what: string }) {
  const a = useAuth()
  if (a.status === "disabled" || a.status === "signed-in") return <>{children}</>
  if (a.status === "loading") return <p className="text-muted-foreground text-sm" role="status">Loading…</p>
  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Sign in to see {what}</h1>
        <p className="text-muted-foreground text-pretty">Sprints, practice logs, flashcards and reviews are saved to your account, so they’re private to you and follow you between devices.</p>
      </div>
      <div className="rounded-xl border bg-card p-5"><SignInPanel idPrefix="gate" /></div>
      <p className="text-muted-foreground text-sm">Just exploring? The <Link className="underline" to="/labs/loop-builder">labs</Link>, <Link className="underline" to="/genres">genres</Link> and <Link className="underline" to="/instruments">guides</Link> work without an account.</p>
    </div>
  )
}

/** The front page: your dashboard when signed in, an overview of the app when not. */
export function HomeRoute({ dashboard, home }: { dashboard: React.ReactNode; home: React.ReactNode }) {
  const a = useAuth()
  if (a.status === "loading") return <p className="text-muted-foreground text-sm" role="status">Loading…</p>
  return <>{a.status === "signed-out" ? home : dashboard}</>
}
