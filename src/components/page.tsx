import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageHeader({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-2">
      <div className="max-w-2xl space-y-1.5">
        <h1 className="text-3xl font-extrabold leading-tight">{title}</h1>
        {children && <div className="text-muted-foreground text-pretty">{children}</div>}
      </div>
      {actions}
    </header>
  )
}

/** A titled block inside a page. One heading style everywhere. */
export function Block({ title, description, actions, children, className }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            {title && <h2 className="font-sans text-base font-semibold tracking-normal">{title}</h2>}
            {description && <div className="text-muted-foreground text-sm text-pretty">{description}</div>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-muted-foreground text-sm text-pretty", className)}>{children}</p>
}

/** Numbered steps, used for how-tos across guides. */
export function Steps({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ol className={cn("space-y-2.5 text-sm", className)}>
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
          <span className="text-muted-foreground font-semibold tabular-nums">{i + 1}</span>
          <span className="text-pretty">{it}</span>
        </li>
      ))}
    </ol>
  )
}
