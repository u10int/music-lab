import { useEffect } from "react"
import { usePref } from "./store"

export type ThemePref = "system" | "light" | "dark"

/** Applies the theme class to <html>, following the OS unless the person picks one. */
export function useTheme() {
  const [pref, setPref] = usePref<ThemePref>("theme", "system")
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark = pref === "dark" || (pref === "system" && mq.matches)
      const root = document.documentElement
      const css = document.createElement("style")
      css.textContent = "*,*::before,*::after{transition:none!important}"
      document.head.appendChild(css)
      root.classList.toggle("dark", dark)
      root.style.colorScheme = dark ? "dark" : "light"
      void root.offsetWidth
      requestAnimationFrame(() => css.remove())
    }
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [pref])
  return [pref, setPref] as const
}
