import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

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
