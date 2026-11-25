import {
  AudioLines, AudioWaveform, KeyboardMusic, BookOpen, CalendarCheck, ChevronRight, ClipboardCheck, Columns3, Disc3, Drum, Ear, Flag, Grid2x2, Grid3x3, Home,
  Layers, LayoutDashboard, Library, ListMusic, LogIn, Metronome, Music2, NotebookPen, PencilRuler, Piano, Repeat, Scissors, Settings,
  SlidersHorizontal, Sun, Timer, Upload,
} from "lucide-react"
import { NavLink, useLocation } from "react-router"
import { AccountMenu, SignInDialog } from "@/components/account"
import { MidiStatus } from "@/components/midi-status"
import { QuickSearch } from "@/components/quick-search"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
} from "@/components/ui/sidebar"
import { SPRINTS } from "@/data/sprints"
import { useAuth } from "@/lib/auth"
import { currentWeek, sprintForWeek, usePref, useProgress } from "@/lib/store"

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> }

const PRACTICE: Item[] = [
  { to: "/today", label: "Today", icon: Sun },
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
]
const PRACTICE_AFTER: Item[] = [
  { to: "/practice", label: "Practice log", icon: Timer },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/review", label: "Weekly review", icon: ClipboardCheck },
  { to: "/exports", label: "Exports", icon: Upload },
  { to: "/planner", label: "Track planner", icon: PencilRuler },
  { to: "/notebook", label: "Reference notebook", icon: NotebookPen },
]
const CREATE: Item[] = [
  { to: "/labs/loop-builder", label: "Loop builder", icon: Repeat },
  { to: "/labs/melody", label: "Melody", icon: AudioLines },
  { to: "/labs/progressions", label: "Chord progressions", icon: ListMusic },
  { to: "/labs/sequencer", label: "Step sequencer", icon: Grid2x2 },
  { to: "/labs/arrangement", label: "Arrangement", icon: Columns3 },
  { to: "/labs/sampler", label: "Sampler", icon: Scissors },
]
const THEORY: Item[] = [
  { to: "/labs/theory", label: "Scales and chords", icon: Music2 },
  { to: "/labs/play-along", label: "Play along", icon: Piano },
  { to: "/labs/ear", label: "Ear training", icon: Ear },
  { to: "/labs/timing", label: "Timing trainer", icon: Metronome },
]
const SOUND: Item[] = [
  { to: "/labs/sound-design", label: "Sound design", icon: AudioWaveform },
  { to: "/labs/synths", label: "Synths", icon: KeyboardMusic },
  { to: "/labs/drums", label: "Drums and sampling", icon: Drum },
  { to: "/labs/mixing", label: "Mixing", icon: SlidersHorizontal },
]
const GUIDES: Item[] = [
  { to: "/genres", label: "Genres", icon: Library },
  { to: "/instruments", label: "Live instruments and effects", icon: BookOpen },
  { to: "/push", label: "Push 3", icon: Grid3x3 },
  { to: "/plan", label: "How the plan works", icon: CalendarCheck },
]

const isActive = (pathname: string, to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/"))

function Link_({ it }: { it: Item }) {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive(pathname, it.to)} tooltip={it.label}>
        <NavLink to={it.to} onClick={() => setOpenMobile(false)}>
          <it.icon />
          <span>{it.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/** A sidebar section whose label folds it away. Remembers open or closed per browser. */
function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const [open, setOpen] = usePref<boolean>("nav-" + id, true)
  const { state, isMobile } = useSidebar()
  // In the icon-only rail every section stays open, so all icons are reachable.
  const shown = open || (state === "collapsed" && !isMobile)
  return (
    <Collapsible open={shown} onOpenChange={setOpen} asChild>
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="group/label w-full hover:text-sidebar-foreground">
            {label}
            <ChevronRight className="ml-auto transition-transform duration-150 group-data-[state=open]/label:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>{children}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function SprintsItem() {
  const p = useProgress()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  const inSprints = pathname.startsWith("/sprints/")
  const [open, setOpen] = usePref<boolean>("nav-sprints-open", true)
  const cur = SPRINTS[sprintForWeek(currentWeek(p).week)]
  return (
    <Collapsible open={open || inSprints} onOpenChange={setOpen} asChild>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={inSprints} tooltip="Sprints">
          <NavLink to={`/sprints/${cur.n}`} onClick={() => setOpenMobile(false)}>
            <Flag />
            <span>Sprints</span>
          </NavLink>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <button type="button" aria-label={open || inSprints ? "Hide sprints" : "Show sprints"}
            className="absolute top-1.5 right-1 grid size-5 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            <ChevronRight className="size-4 transition-transform duration-150 data-[open=true]:rotate-90" data-open={open || inSprints} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {SPRINTS.map((s) => (
              <SidebarMenuSubItem key={s.id}>
                <SidebarMenuSubButton asChild isActive={pathname === `/sprints/${s.n}`}>
                  <NavLink to={`/sprints/${s.n}`} onClick={() => setOpenMobile(false)}>
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: `var(${s.c})` }} />
                    <span>{s.n}. {s.short}</span>
                    {p.shipped[s.id] && <span className="sr-only">, shipped</span>}
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar() {
  const auth = useAuth()
  const mine = auth.status === "signed-in" || auth.status === "disabled"
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <NavLink to="/" onClick={() => setOpenMobile(false)}>
                <Disc3 className="!size-5" />
                <span className="font-display text-base font-medium">Music Lab</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <QuickSearch />
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {mine ? (
          <Section id="practice" label="My practice">
            {PRACTICE.map((it) => <Link_ key={it.to} it={it} />)}
            <SprintsItem />
            {PRACTICE_AFTER.map((it) => <Link_ key={it.to} it={it} />)}
          </Section>
        ) : auth.status === "signed-out" ? (
          <SidebarGroup>
            <SidebarMenu>
              <Link_ it={{ to: "/", label: "Home", icon: Home }} />
              <SidebarMenuItem>
                <SignInDialog>
                  <SidebarMenuButton tooltip="Sign in to track progress"><LogIn /><span>Sign in to track progress</span></SidebarMenuButton>
                </SignInDialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
        <Section id="create" label="Create">{CREATE.map((it) => <Link_ key={it.to} it={it} />)}</Section>
        <Section id="theory" label="Theory and ears">{THEORY.map((it) => <Link_ key={it.to} it={it} />)}</Section>
        <Section id="sound" label="Sound">{SOUND.map((it) => <Link_ key={it.to} it={it} />)}</Section>
        <Section id="guides" label="Guides">{GUIDES.map((it) => <Link_ key={it.to} it={it} />)}</Section>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <MidiStatus />
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings and data">
              <NavLink to="/settings" onClick={() => setOpenMobile(false)}><Settings /><span>Settings</span></NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <AccountMenu />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
