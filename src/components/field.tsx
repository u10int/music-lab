import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * A labeled control on a fixed two-row grid: a 20px label row (with an optional
 * value on the right) above a 32px control row. Fields placed side by side line
 * up their labels, and sliders and switches sit on the middle of the row.
 */
export function Field({ label, htmlFor, value, className, children }: { label?: React.ReactNode; htmlFor?: string; value?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid grid-rows-[1.25rem_2rem] gap-1.5", className)}>
      <div className="flex items-center justify-between gap-3 text-sm leading-none">
        {label ? <Label htmlFor={htmlFor}>{label}</Label> : <span aria-hidden="true" />}
        {value !== undefined && <output htmlFor={htmlFor} className="text-muted-foreground tabular-nums">{value}</output>}
      </div>
      <div className="flex min-w-0 items-center gap-2 [&>[data-slot=slider]]:w-full">{children}</div>
    </div>
  )
}
