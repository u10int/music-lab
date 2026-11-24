import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

/** Single-choice segmented control. Always has a value. */
export function Seg<T extends string>({ value, onChange, options, label, size = "sm" }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string; size?: "sm" | "default" }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size={size}
      spacing={1}
      value={value}
      aria-label={label}
      onValueChange={(v) => v && onChange(v as T)}
      className="flex-wrap"
    >
      {options.map(([v, l]) => (
        <ToggleGroupItem key={v} value={v} className="px-3 whitespace-nowrap">
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Switches between views or modes of one tool. Looks like tabs, not buttons. */
export function TabSwitch<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
        <TabsList aria-label={label} className="w-max min-w-full">
          {options.map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
      </Tabs>
    </div>
  )
}
