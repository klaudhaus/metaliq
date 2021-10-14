import { DevServerConfig, startDevServer } from "@web/dev-server"

let server: { stop: () => void } // Simple typing for non-exposed DevServer type

const config: DevServerConfig = {
  nodeResolve: true,
  open: true,
  watch: true,
  appIndex: "index.html",
  middleware: []
}

/**
 * Start a dev server for the project at the given path
 */
export async function startProjectServer (path: string, port: number) {
  if (server) server.stop()
  server = await startDevServer({
    config: { ...config, rootDir: path, port },
    readCliArgs: false,
    readFileConfig: false,
    autoExitProcess: false
  })
}
