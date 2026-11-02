import { defineConfig } from 'tsdown'
export default defineConfig({
  entry: { index: 'src/index.ts', 'exports/client': 'src/exports/client.ts', 'exports/preview': 'src/exports/preview.ts', 'exports/bindings': 'src/exports/bindings.ts', 'exports/server': 'src/exports/server.ts', 'exports/types': 'src/exports/types.ts' },
  unbundle: true, format: 'esm', target: 'es2022', platform: 'neutral', clean: true,
  deps: { skipNodeModulesBundle: true, neverBundle: [/^node:/] }, dts: true, css: { inject: true },
})
