import { AudioWaveform, AudioLines, ClipboardCheck, Library, NotebookPen, Repeat, Scissors, BookOpen, CalendarCheck, Columns3, Disc3, Drum, Ear, Grid2x2, Grid3x3, Layers, LayoutDashboard, ListMusic, Metronome, Music2, PencilRuler, Piano, Settings, SlidersHorizontal, Sun, Timer, Upload } from "lucide-react"
import { NavLink, useLocation } from "react-router"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar"
import { SPRINTS } from "@/data/sprints"
import { useProgress } from "@/lib/store"
import { MidiStatus } from "@/components/midi-status"
import { QuickSearch } from "@/components/quick-search"

type Item = { to: string; label: string; icon?: React.ComponentType<{ className?: string }>; dot?: string; done?: boolean }

const PLAN: Item[] = [
  { to: "/today", label: "Today", icon: Sun },
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/practice", label: "Practice log", icon: Timer },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/exports", label: "Weekly exports", icon: Upload },
  { to: "/review", label: "Weekly review", icon: ClipboardCheck },
  { to: "/plan", label: "Rules and rhythm", icon: CalendarCheck },
]
const LABS: Item[] = [
  { to: "/labs/loop-builder", label: "Loop builder", icon: Repeat },
  { to: "/labs/theory", label: "Scales and chords", icon: Music2 },
  { to: "/labs/melody", label: "Melody", icon: AudioLines },
  { to: "/labs/progressions", label: "Chord progressions", icon: ListMusic },
  { to: "/labs/play-along", label: "Play along", icon: Piano },
  { to: "/labs/sound-design", label: "Sound design", icon: AudioWaveform },
  { to: "/labs/drums", label: "Drums and sampling", icon: Drum },
  { to: "/labs/sampler", label: "Sampler", icon: Scissors },
  { to: "/labs/sequencer", label: "Step sequencer", icon: Grid2x2 },
  { to: "/labs/arrangement", label: "Arrangement", icon: Columns3 },
  { to: "/planner", label: "Track planner", icon: PencilRuler },
  { to: "/notebook", label: "Reference notebook", icon: NotebookPen },
  { to: "/labs/mixing", label: "Mixing", icon: SlidersHorizontal },
  { to: "/labs/ear", label: "Ear training", icon: Ear },
  { to: "/labs/timing", label: "Timing trainer", icon: Metronome },
]
const GUIDES: Item[] = [
  { to: "/genres", label: "Genres", icon: Library },
  { to: "/instruments", label: "Live instruments and effects", icon: BookOpen },
  { to: "/push", label: "Push 3", icon: Grid3x3 },
]

function Group({ label, items }: { label: string; items: Item[] }) {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => {
            const active = it.to === "/" ? pathname === "/" : pathname === it.to || pathname.startsWith(it.to + "/")
            return (
              <SidebarMenuItem key={it.to}>
                <SidebarMenuButton asChild isActive={active} tooltip={it.label}>
                  <NavLink to={it.to} onClick={() => setOpenMobile(false)}>
                    {it.icon ? <it.icon /> : <span aria-hidden="true" className="ml-0.5 size-2.5 shrink-0 rounded-full" style={{ background: `var(${it.dot})` }} />}
                    <span>{it.label}</span>
                    {it.done && <span className="sr-only">, shipped</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const p = useProgress()
  const sprints: Item[] = SPRINTS.map((s) => ({ to: `/sprints/${s.n}`, label: `${s.n}. ${s.short}`, dot: s.c, done: !!p.shipped[s.id] }))
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <NavLink to="/">
                <Disc3 className="!size-5" />
                <span className="font-display text-base font-extrabold">Music Lab</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <QuickSearch />
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <Group label="Plan" items={PLAN} />
        <Group label="Sprints" items={sprints} />
        <Group label="Labs" items={LABS} />
        <Group label="Guides" items={GUIDES} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <MidiStatus />
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings and data">
              <NavLink to="/settings"><Settings /><span>Settings and data</span></NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
