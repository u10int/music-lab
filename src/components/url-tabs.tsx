import { useEffect, type ReactNode } from "react"
import { useLocation, useSearchParams } from "react-router"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { stop } from "@/audio/playback"

/** Tabs whose selection lives in ?tab=, so links can open a specific tab and anchor. */
export function UrlTabs({ tabs, label }: { tabs: [string, string, ReactNode][]; label: string }) {
  const [params, setParams] = useSearchParams()
  const { hash } = useLocation()
  const tab = tabs.some((t) => t[0] === params.get("tab")) ? params.get("tab")! : tabs[0][0]

  // Scroll to and flash an anchor like #gl-lfo after the tab renders.
  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })
      el.focus({ preventScroll: true })
      el.dataset.flash = "true"
      setTimeout(() => { el.dataset.flash = "false" }, 1400)
    })
    return () => cancelAnimationFrame(raf)
  }, [hash, tab])

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        stop()
        setParams({ tab: v })
      }}
      className="gap-8"
    >
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList aria-label={label} className="w-max">
          {tabs.map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
      </div>
      {tabs.map(([v, , node]) => <TabsContent key={v} value={v}>{node}</TabsContent>)}
    </Tabs>
  )
}
