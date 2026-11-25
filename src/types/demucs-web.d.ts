declare module "demucs-web" {
  export const CONSTANTS: {
    SAMPLE_RATE: number
    FFT_SIZE: number
    HOP_SIZE: number
    TRAINING_SAMPLES: number
    MODEL_SPEC_BINS: number
    MODEL_SPEC_FRAMES: number
    SEGMENT_OVERLAP: number
    TRACKS: string[]
    DEFAULT_MODEL_URL: string
  }
  type Spec = { leftReal: Float32Array; leftImag: Float32Array; rightReal: Float32Array; rightImag: Float32Array }
  export function prepareModelInput(left: Float32Array, right: Float32Array): { waveform: Float32Array; magSpec: Float32Array; numBins: number; numFrames: number; originalLength: number }
  export function standaloneMask(freqOutput: Float32Array): Spec[]
  export function standaloneIspec(spec: Spec, targetLength: number): { left: Float32Array; right: Float32Array }
}
