import { useRef, useState } from "react"
import { Block, Caption, PageHeader } from "@/components/page"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { exportProgress, importProgress, resetProgress } from "@/lib/store"
import { useTheme, type ThemePref } from "@/lib/theme"
import { SignInPanel } from "@/components/account"
import { deleteCloudData, signOut, useAuth } from "@/lib/auth"

function AccountBlock() {
  const a = useAuth()
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState("")
  if (a.status === "disabled") return null
  return (
    <Block title="Account" description={a.status === "signed-in" ? "Your progress is saved to your account and syncs to every device you sign in on." : "Sign in to save your progress to your account and sync it across devices."}>
      {a.status === "signed-in" ? (
        <div className="space-y-4">
          <div className="text-sm">
            <p className="font-medium">{a.user?.email ?? a.user?.user_metadata?.user_name}</p>
            <p className="text-muted-foreground">{a.sync === "error" ? `Couldn't sync: ${a.error}` : a.sync === "saving" ? "Saving…" : "Progress synced"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
            {!confirm ? (
              <Button variant="ghost" onClick={() => setConfirm(true)}>Delete my cloud data</Button>
            ) : (
              <>
                <span className="text-sm">This deletes your progress from the cloud for good.</span>
                <Button variant="destructive" size="sm" onClick={async () => { const e = await deleteCloudData(); setMsg(e ?? "Cloud data deleted. Sign out to clear it from this browser too."); setConfirm(false) }}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
              </>
            )}
          </div>
          {msg && <p className="text-sm" role="status">{msg}</p>}
        </div>
      ) : a.status === "signed-out" ? <div className="max-w-sm"><SignInPanel idPrefix="set" /></div> : null}
    </Block>
  )
}

export function SettingsPage() {
  const [theme, setTheme] = useTheme()
  const [paste, setPaste] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const doImport = (text: string) => {
    const err = importProgress(text)
    setMsg(err ? { ok: false, text: err } : { ok: true, text: "Progress imported." })
    if (!err) setPaste("")
  }
  const download = () => {
    const blob = new Blob([exportProgress()], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `music-lab-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="max-w-3xl space-y-12">
      <PageHeader title="Settings and data">Theme, your account, and backups of your progress as a file.</PageHeader>
      <AccountBlock />
      <Block title="Appearance">
        <Seg label="Theme" value={theme} onChange={(v: ThemePref) => setTheme(v)} options={[["system", "Match system"], ["light", "Light"], ["dark", "Dark"]]} />
      </Block>
      <Block title="Back up your progress" description="Downloads skills, deliverables, practice logs, references, exports and ear training scores as a JSON file.">
        <Button variant="outline" onClick={download}>Download progress</Button>
      </Block>
      <Block title="Import progress" description="Pick a file you downloaded here, or paste the JSON copied from the old Push Sprint Tracker. This replaces what's in this browser.">
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" id="import-file" onChange={async (e) => { const f = e.target.files?.[0]; if (f) doImport(await f.text()); e.target.value = "" }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Choose a file</Button>
        </div>
        <Textarea aria-label="Paste progress JSON" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='{"start":"2026-11-30","done":{…}}' className="min-h-28 text-base sm:text-sm" />
        <Button variant="outline" disabled={!paste.trim()} onClick={() => doImport(paste)}>Import pasted JSON</Button>
        {msg && <p role="status" className={msg.ok ? "text-sm" : "text-destructive text-sm"}>{msg.text}</p>}
      </Block>
      <Block title="Start over">
        <Caption>Clears all progress in this browser. Download a backup first if you might want it back.</Caption>
        {confirming ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={() => { resetProgress(); setConfirming(false); setMsg({ ok: true, text: "Progress cleared." }) }}>Clear all progress</Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirming(true)}>Clear progress…</Button>
        )}
      </Block>
    </div>
  )
}
