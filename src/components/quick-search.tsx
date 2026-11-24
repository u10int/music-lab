import { lazy, Suspense, useEffect, useState } from "react"
import { Search } from "lucide-react"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

const SearchDialog = lazy(() => import("./search-dialog"))
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** Sidebar search button and the Cmd/Ctrl+K shortcut. The dialog and its index load on first use. */
export function QuickSearch() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setLoaded(true)
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])
  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip={isMac ? "Search (⌘K)" : "Search (Ctrl+K)"} onClick={() => { setLoaded(true); setOpen(true) }} onPointerEnter={() => setLoaded(true)} className="text-muted-foreground">
          <Search />
          <span>Search</span>
          <kbd className="ml-auto rounded border px-1.5 font-sans text-[11px] font-medium" aria-hidden="true">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {loaded && <Suspense fallback={null}><SearchDialog open={open} setOpen={setOpen} /></Suspense>}
    </>
  )
}
