import { Cable } from "lucide-react"
import { Link } from "react-router"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { connectMidi, useMidi } from "@/midi/midi"

/** Sidebar entry: connect a controller, then show what's connected. */
export function MidiStatus() {
  const m = useMidi()
  const label =
    m.status === "ready" ? (m.inputs.length ? m.inputs[0] + (m.inputs.length > 1 ? ` +${m.inputs.length - 1}` : "") : "No MIDI devices found")
      : m.status === "unsupported" ? "MIDI needs Chrome or Edge"
      : m.status === "denied" ? "MIDI access blocked"
      : "Connect Push or keyboard"
  return (
    <SidebarMenuItem>
      {m.status === "ready" ? (
        <SidebarMenuButton asChild tooltip={label}>
          <Link to="/labs/play-along">
            <Cable />
            <span className="truncate">{label}</span>
            <span aria-hidden="true" className={"ml-auto size-2 shrink-0 rounded-full " + (m.inputs.length ? "bg-[var(--s3)]" : "bg-muted-foreground")} />
          </Link>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton tooltip={label} onClick={() => void connectMidi()}>
          <Cable />
          <span className="truncate">{label}</span>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}
