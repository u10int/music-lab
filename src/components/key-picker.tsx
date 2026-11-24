import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ROOTS, SCALES } from "@/data/labs"
import { usePref } from "@/lib/store"

/** The key and scale used across the labs. Shared, so picking A minor once applies everywhere. */
export function useKey() {
  const [root, setRoot] = usePref<number>("root", 9)
  const [scale, setScale] = usePref<string>("scale", "minor")
  return { root, scale, setRoot, setScale }
}

export function KeyPicker({ idPrefix = "k" }: { idPrefix?: string }) {
  const { root, scale, setRoot, setScale } = useKey()
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-root`}>Key</Label>
        <Select value={String(root)} onValueChange={(v) => setRoot(+v)}>
          <SelectTrigger id={`${idPrefix}-root`} size="sm" className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{ROOTS.map((n, i) => <SelectItem key={i} value={String(i)}>{n}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-scale`}>Scale</Label>
        <Select value={scale} onValueChange={setScale}>
          <SelectTrigger id={`${idPrefix}-scale`} size="sm" className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{SCALES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </>
  )
}
