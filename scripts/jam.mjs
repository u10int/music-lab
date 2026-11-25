// Runs scripts/jam-cli.ts through Vite, so it can use the app’s data and the @/ alias.
import { createServer } from "vite"

const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true, include: [] } })
try {
  await server.ssrLoadModule("/scripts/jam-cli.ts")
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
} finally {
  await server.close()
}
