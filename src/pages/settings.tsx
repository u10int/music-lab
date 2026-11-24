import { useRef, useState } from "react"
import { Block, Caption, PageHeader } from "@/components/page"
import { Seg } from "@/components/seg"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { exportProgress, importProgress, resetProgress } from "@/lib/store"
import { useTheme, type ThemePref } from "@/lib/theme"

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
      <PageHeader title="Settings and data">Your progress lives in this browser. Export it to back it up or move it to another device.</PageHeader>
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
