import { lazy, Suspense, useEffect } from "react"
import { createBrowserRouter, Outlet, RouterProvider, useLocation } from "react-router"
import { stop } from "@/audio/playback"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useTheme } from "@/lib/theme"
import { Dashboard } from "@/pages/dashboard"

// Guides and labs load on demand to keep the first load small.
const guides = () => import("@/pages/guides")
const labs = () => import("@/pages/labs")
const InstrumentsPage = lazy(() => guides().then((m) => ({ default: m.InstrumentsPage })))
const PushPage = lazy(() => guides().then((m) => ({ default: m.PushPage })))
const TheoryLab = lazy(() => labs().then((m) => ({ default: m.TheoryLab })))
const EarLab = lazy(() => labs().then((m) => ({ default: m.EarLab })))
const SoundDesignLab = lazy(() => labs().then((m) => ({ default: m.SoundDesignLab })))
const DrumsLab = lazy(() => labs().then((m) => ({ default: m.DrumsLab })))
const ArrangementLab = lazy(() => labs().then((m) => ({ default: m.ArrangementLab })))
const MixingLab = lazy(() => labs().then((m) => ({ default: m.MixingLab })))
const SequencerLab = lazy(() => labs().then((m) => ({ default: m.SequencerLab })))
const TimingLab = lazy(() => labs().then((m) => ({ default: m.TimingLab })))
const ProgressionLab = lazy(() => labs().then((m) => ({ default: m.ProgressionLab })))

const SprintPage = lazy(() => import("@/pages/sprint").then((m) => ({ default: m.SprintPage })))
const ExportsPage = lazy(() => import("@/pages/exports").then((m) => ({ default: m.ExportsPage })))
const PlanPage = lazy(() => import("@/pages/plan").then((m) => ({ default: m.PlanPage })))
const SettingsPage = lazy(() => import("@/pages/settings").then((m) => ({ default: m.SettingsPage })))
const PlayAlongPage = lazy(() => import("@/pages/play-along").then((m) => ({ default: m.PlayAlongPage })))
const PracticePage = lazy(() => import("@/pages/practice").then((m) => ({ default: m.PracticePage })))
const TodayPage = lazy(() => import("@/pages/today").then((m) => ({ default: m.TodayPage })))
const FlashcardsPage = lazy(() => import("@/pages/flashcards").then((m) => ({ default: m.FlashcardsPage })))
const PlannerPage = lazy(() => import("@/pages/planner").then((m) => ({ default: m.PlannerPage })))
function Layout() {
  useTheme()
  const { pathname, hash, search } = useLocation()
  useEffect(() => {
    stop()
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  // Anchors like #pat-techno: wait for lazy pages to render, then scroll to and highlight the target.
  useEffect(() => {
    if (!hash || search.includes("tab=")) return
    const id = decodeURIComponent(hash.slice(1))
    let tries = 0, raf = 0
    const find = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })
        el.focus({ preventScroll: true })
        el.dataset.flash = "true"
        setTimeout(() => { el.dataset.flash = "false" }, 1400)
      } else if (tries++ < 120) raf = requestAnimationFrame(find)
    }
    raf = requestAnimationFrame(find)
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash, search])
  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur md:hidden">
            <SidebarTrigger aria-label="Open navigation" />
            <span className="font-display font-extrabold">Music Lab</span>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
              <Outlet />
            </Suspense>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function NotFound() {
  return <p>That page doesn't exist. <a className="underline" href="/">Go to the dashboard</a>.</p>
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/today", element: <TodayPage /> },
      { path: "/sprints/:n", element: <SprintPage /> },
      { path: "/exports", element: <ExportsPage /> },
      { path: "/practice", element: <PracticePage /> },
      { path: "/flashcards", element: <FlashcardsPage /> },
      { path: "/plan", element: <PlanPage /> },
      { path: "/planner", element: <PlannerPage /> },
      { path: "/labs/theory", element: <TheoryLab /> },
      { path: "/labs/ear", element: <EarLab /> },
      { path: "/labs/play-along", element: <PlayAlongPage /> },
      { path: "/labs/sound-design", element: <SoundDesignLab /> },
      { path: "/labs/drums", element: <DrumsLab /> },
      { path: "/labs/arrangement", element: <ArrangementLab /> },
      { path: "/labs/mixing", element: <MixingLab /> },
      { path: "/labs/sequencer", element: <SequencerLab /> },
      { path: "/labs/timing", element: <TimingLab /> },
      { path: "/labs/progressions", element: <ProgressionLab /> },
      { path: "/instruments", element: <InstrumentsPage /> },
      { path: "/push", element: <PushPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
