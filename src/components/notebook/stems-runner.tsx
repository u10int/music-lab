import { useEffect, useState } from "react"
import { AudioLines, Loader2, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { hasWebGpu, splitAndTranscribe, type StemsProgress } from "@/lib/stems"
import type { RefNote } from "@/lib/store"
import type { Parts } from "@/lib/transcribe-core"

const PHASE: Record<StemsProgress["phase"], string> = {
  download: "Downloading the stem model (first time only)",
  load: "Starting the stem model",
  separate: "Splitting the stems",
  notes: "Finding the notes",
}

/**
 * Phones (iPhones above all) give a web page far less memory than the stem model
 * needs, and kill the page when it runs out.
 */
function tooSmall() {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory
  return ios || /Android/.test(ua) || (mem !== undefined && mem < 4)
}

/** The stems status line: what the parts come from, and the action to split (again). */
export function StemsRunner({ n, parts, edit, getAudio }: { n: RefNote; parts: Parts; edit: (fn: (d: RefNote) => void) => void; getAudio: () => Promise<Blob> }) {
  const [prog, setProg] = useState<StemsProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gpu, setGpu] = useState<boolean | null>(null)
  const [ctrl, setCtrl] = useState<AbortController | null>(null)
  const [small] = useState(tooSmall)
  useEffect(() => { void hasWebGpu().then(setGpu) }, [])
  const split = !!parts.melody

  const run = async () => {
    setError(null); setBusy(true); setProg(null)
    const c = new AbortController()
    setCtrl(c)
    try {
      const a = n.audio!.analysis
      const res = await splitAndTranscribe(await getAudio(), { tempo: a.tempo, keyRoot: a.keyRoot, minor: a.minor, sections: a.sections, end: a.end }, setProg, c.signal)
      edit((d) => {
        if (!d.audio?.parts) return
        d.audio.parts = res.parts ? { ...res.parts, melody: res.melody, fromStems: true } : { ...d.audio.parts, melody: res.melody }
      })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false); setProg(null); setCtrl(null)
    }
  }

  if (busy) {
    return (
      <div className="space-y-2 border p-4" role="status" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 font-medium"><Loader2 className="size-4 animate-spin" />{prog ? PHASE[prog.phase] : "Reading the audio"}</span>
          <span className="text-muted-foreground tabular-nums">{prog?.detail}</span>
        </div>
        <Progress value={prog ? Math.round(prog.p * 100) : 0} aria-label="Progress" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">Keep this tab open. {gpu === false ? "It’s running on the CPU, so this can take 10 minutes or more." : "It usually takes a minute or two."}</p>
          <Button variant="ghost" size="sm" onClick={() => ctrl?.abort()}><X />Stop</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y py-3">
        <p className="min-w-0 text-sm">
          {split
            ? parts.fromStems ? <><span className="font-medium">From separated stems.</span> <span className="text-muted-foreground">Drums, bass and chords each come from their own stem; vocals and melody from the vocal and instrument stems.</span></>
              : <><span className="font-medium">Vocals and melody from stems;</span> <span className="text-muted-foreground">drums, bass and chords from the full mix. Split again to redo them from their stems.</span></>
            : <><span className="font-medium">From the full mix.</span> <span className="text-muted-foreground">Split the stems for cleaner drums, bass and chords, and to get the vocals and melody as notes. The first time downloads a 170 MB model, which your browser keeps.</span></>}
        </p>
        {small
          ? <p className="text-muted-foreground text-sm">Splitting stems needs a computer: phones run out of memory. Split it on your computer and the results show up here.</p>
          : <Button variant={split ? "ghost" : "default"} size="sm" onClick={run}>{split ? <RefreshCw /> : <AudioLines />}{split ? "Split again" : "Split stems"}</Button>}
      </div>
      {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
    </div>
  )
}
