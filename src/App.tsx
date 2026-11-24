import { lazy, Suspense, useEffect } from "react"
import { HomeRoute, RequireAccount } from "@/components/account"
import { createBrowserRouter, Outlet, RouterProvider, useLocation } from "react-router"
import { keepsPlaying, stop } from "@/audio/playback"
import { NowPlayingBar } from "@/components/now-playing"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router"
import { setPref } from "@/lib/store"
import { SCALES } from "@/data/labs"
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
const LoopLab = lazy(() => labs().then((m) => ({ default: m.LoopLab })))
const MelodyLab = lazy(() => labs().then((m) => ({ default: m.MelodyLab })))
const SamplerLab = lazy(() => labs().then((m) => ({ default: m.SamplerLab })))

const SprintPage = lazy(() => import("@/pages/sprint").then((m) => ({ default: m.SprintPage })))
const ExportsPage = lazy(() => import("@/pages/exports").then((m) => ({ default: m.ExportsPage })))
const PlanPage = lazy(() => import("@/pages/plan").then((m) => ({ default: m.PlanPage })))
const SettingsPage = lazy(() => import("@/pages/settings").then((m) => ({ default: m.SettingsPage })))
const PlayAlongPage = lazy(() => import("@/pages/play-along").then((m) => ({ default: m.PlayAlongPage })))
const PracticePage = lazy(() => import("@/pages/practice").then((m) => ({ default: m.PracticePage })))
const TodayPage = lazy(() => import("@/pages/today").then((m) => ({ default: m.TodayPage })))
const PracticeModePage = lazy(() => import("@/pages/practice-mode").then((m) => ({ default: m.PracticeModePage })))
const FlashcardsPage = lazy(() => import("@/pages/flashcards").then((m) => ({ default: m.FlashcardsPage })))
const GenresPage = lazy(() => import("@/pages/genres").then((m) => ({ default: m.GenresPage })))
const GenrePage = lazy(() => import("@/pages/genres").then((m) => ({ default: m.GenrePage })))
const NotebookPage = lazy(() => import("@/pages/notebook").then((m) => ({ default: m.NotebookPage })))
const ReviewPage = lazy(() => import("@/pages/review").then((m) => ({ default: m.ReviewPage })))
const HomePage = lazy(() => import("@/pages/home").then((m) => ({ default: m.HomePage })))
const PlannerPage = lazy(() => import("@/pages/planner").then((m) => ({ default: m.PlannerPage })))
function Layout() {
  useTheme()
  const { pathname, hash, search } = useLocation()
  const q = new URLSearchParams(search)
  // Links from a day's plan can set the key: ?key=9&scale=minor.
  const keyParam = q.get("key"), scaleParam = q.get("scale")
  useEffect(() => {
    if (keyParam !== null && /^\d+$/.test(keyParam) && +keyParam < 12) setPref("root", +keyParam)
    if (scaleParam && SCALES.some((s) => s.id === scaleParam)) setPref("scale", scaleParam)
  }, [keyParam, scaleParam])
  const fromDay = q.get("from") === "today" ? q.get("day") : null
  const fromToday = q.get("from") === "today"
  useEffect(() => {
    if (!keepsPlaying()) stop()
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
  // ?embed=1: just the page, for showing a tool inside practice mode.
  if (q.get("embed") === "1") return (
    <TooltipProvider delayDuration={300}>
      <main className="w-full px-4 py-6 sm:px-6">
        <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}><Outlet /></Suspense>
      </main>
    </TooltipProvider>
  )
  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur md:hidden">
            <SidebarTrigger aria-label="Open navigation" />
            <span className="font-display font-medium">Music Lab</span>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            {fromToday && pathname !== "/today" && (
              <Link to={fromDay ? `/today?day=${fromDay}` : "/today"} className="text-muted-foreground mb-6 inline-flex items-center gap-1 text-sm hover:underline"><ArrowLeft className="size-4" />Back to {fromDay ? "that day’s" : "today’s"} plan</Link>
            )}
            <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
              <Outlet />
            </Suspense>
          </main>
          <NowPlayingBar />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function NotFound() {
  return <p>That page doesn't exist. <a className="underline" href="/">Go home</a>.</p>
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomeRoute dashboard={<Dashboard />} home={<HomePage />} /> },
      { path: "/today", element: <RequireAccount what="today’s session"><TodayPage /></RequireAccount> },
      { path: "/today/practice", element: <RequireAccount what="practice mode"><PracticeModePage /></RequireAccount> },
      { path: "/sprints/:n", element: <RequireAccount what="your sprints"><SprintPage /></RequireAccount> },
      { path: "/exports", element: <RequireAccount what="your exports"><ExportsPage /></RequireAccount> },
      { path: "/practice", element: <RequireAccount what="your practice log"><PracticePage /></RequireAccount> },
      { path: "/flashcards", element: <RequireAccount what="your flashcards"><FlashcardsPage /></RequireAccount> },
      { path: "/plan", element: <PlanPage /> },
      { path: "/planner", element: <RequireAccount what="your track plan"><PlannerPage /></RequireAccount> },
      { path: "/review", element: <RequireAccount what="your weekly review"><ReviewPage /></RequireAccount> },
      { path: "/notebook", element: <RequireAccount what="your reference notebook"><NotebookPage /></RequireAccount> },
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
      { path: "/labs/loop-builder", element: <LoopLab /> },
      { path: "/labs/melody", element: <MelodyLab /> },
      { path: "/labs/sampler", element: <SamplerLab /> },
      { path: "/genres", element: <GenresPage /> },
      { path: "/genres/:id", element: <GenrePage /> },
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
