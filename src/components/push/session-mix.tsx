import { Block, Steps } from "@/components/page"
import { PadGrid, type Pad } from "@/components/pad-grid"

const TRACKS: [string, string][] = [["Drums", "--s1"], ["Bass", "--s2"], ["Chords", "--s3"], ["Pad", "--s4"], ["Lead", "--s5"], ["Perc", "--s6"], ["FX", "--s1"], ["Vox", "--s3"]]
const HAS = ["11111100", "11111110", "11111111", "01111110", "00111110", "11011100", "00110010", "00011100"]

export function SessionGrid() {
  const rows: Pad[][] = Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c): Pad => (HAS[c][r] === "1" ? { tone: r === 2 ? "play" : "clip", style: { ["--tc" as string]: `var(${TRACKS[c][1]})` } } : { tone: "empty" })),
  )
  return (
    <Block title="Session mode">
      <div className="grid items-start gap-8 md:grid-cols-2">
        <figure className="space-y-2">
          <PadGrid rows={rows} label="Session grid: eight track columns of clips, scene 3 playing, scene buttons on the right" side={Array.from({ length: 8 }, (_, i) => ({ label: String(i + 1), on: i === 2 }))} />
          <div className="grid max-w-[410px] grid-cols-[minmax(0,1fr)_44px] gap-2" aria-hidden="true">
            <div className="text-muted-foreground grid grid-cols-8 gap-1 text-center text-[10px]">{TRACKS.map(([t]) => <span key={t} className="truncate">{t}</span>)}</div>
          </div>
          <figcaption className="text-muted-foreground text-sm">Each column is a track and each row is a scene. Lit pads hold clips. Here scene 3 is playing.</figcaption>
        </figure>
        <Steps items={[
          "Press Session to switch the pads to clips. Press Note to go back to playing the selected track.",
          "Tap a pad to launch that clip. Tap an empty pad on an armed track to start recording into it.",
          "Press a Scene button on the right to launch the whole row at once. Build a song by stacking scenes: intro, build, drop.",
          "Press Stop Clip to stop the selected track. Shift and Stop Clip stops everything.",
          "Hold Layout for Session Overview, where each pad is a block of 8 scenes by 8 tracks. Shift and Layout keeps it open.",
        ]} />
      </div>
    </Block>
  )
}

export function MixMode() {
  const vols = [0.8, 0.7, 0.55, 0.45, 0.6, 0.5, 0.3, 0.65]
  return (
    <Block title="Mix mode">
      <div className="grid items-start gap-8 md:grid-cols-2">
        <figure className="space-y-2">
          <svg viewBox="0 0 400 160" className="block h-auto w-full max-w-[400px]" role="img" aria-label="Global Mix: the eight encoders each control one track's volume, shown as eight level bars on the display">
            {vols.map((_, i) => <circle key={"k" + i} className="hw-k" cx={30 + i * 50} cy={22} r={14} />)}
            <rect className="hw-disp" x={2} y={48} width={396} height={112} rx={4} />
            {vols.map((v, i) => (
              <g key={i}>
                <rect x={22 + i * 50} y={60} width={16} height={70} rx={3} fill="#3a3b40" />
                <rect x={22 + i * 50} y={60 + 70 * (1 - v)} width={16} height={70 * v} rx={3} fill="#ececea" />
                <text x={30 + i * 50} y={150} textAnchor="middle" fill="#c9cacf" fontSize={11}>{TRACKS[i][0]}</text>
              </g>
            ))}
          </svg>
          <figcaption className="text-muted-foreground text-sm">Global Mix: one encoder per track, eight tracks at a time.</figcaption>
        </figure>
        <Steps items={[
          "Press Mix once for Global Mix. The upper display buttons switch the encoders between Volume, Pan and each Send.",
          "Press Mix again for Track Mix: everything for the selected track, including its sends and input and output routing.",
          "Use the lower display buttons to select tracks. Hold Mute or Solo and press one to mute or solo it.",
          "The Volume encoder on the left is the main output and headphones, not a track.",
        ]} />
      </div>
    </Block>
  )
}
