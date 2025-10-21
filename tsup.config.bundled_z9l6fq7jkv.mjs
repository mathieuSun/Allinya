// tsup.config.ts
import { defineConfig } from "tsup";
import { glob } from "glob";
import path from "path";
var entryPoints = glob.sync("api/**/*.ts", {
  ignore: [
    "api/**/*.test.ts",
    "api/**/*.spec.ts",
    "api/tsconfig.json"
  ]
});
var tsup_config_default = defineConfig({
  entry: entryPoints,
  format: ["esm"],
  target: "node18",
  platform: "node",
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: false,
  outDir: "api-dist",
  minify: false,
  bundle: false,
  skipNodeModulesBundle: true,
  // Keep the directory structure
  outExtension() {
    return {
      js: ".js"
    };
  },
  // Handle path aliases
  esbuildOptions(options) {
    options.alias = {
      "@shared": path.resolve(process.cwd(), "shared")
    };
    options.external = [
      "@neondatabase/serverless",
      "@supabase/supabase-js",
      "@vercel/node",
      "express",
      "express-session",
      "passport",
      "passport-local",
      "connect-pg-simple",
      "postgres",
      "drizzle-orm",
      "drizzle-zod",
      "zod",
      "agora-token",
      "memorystore",
      "ws",
      "dotenv",
      "bcrypt",
      "crypto",
      "path",
      "url",
      "fs",
      "util",
      "child_process"
    ];
  },
  onSuccess: 'echo "\u2705 API build completed successfully!"'
});
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS90c3VwLmNvbmZpZy50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9ob21lL3J1bm5lci93b3Jrc3BhY2UvdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcbmltcG9ydCB7IGdsb2IgfSBmcm9tICdnbG9iJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG4vLyBHZXQgYWxsIFR5cGVTY3JpcHQgZmlsZXMgaW4gdGhlIGFwaSBkaXJlY3RvcnlcbmNvbnN0IGVudHJ5UG9pbnRzID0gZ2xvYi5zeW5jKCdhcGkvKiovKi50cycsIHtcbiAgaWdub3JlOiBbXG4gICAgJ2FwaS8qKi8qLnRlc3QudHMnLFxuICAgICdhcGkvKiovKi5zcGVjLnRzJyxcbiAgICAnYXBpL3RzY29uZmlnLmpzb24nLFxuICBdLFxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGVudHJ5OiBlbnRyeVBvaW50cyxcbiAgZm9ybWF0OiBbJ2VzbSddLFxuICB0YXJnZXQ6ICdub2RlMTgnLFxuICBwbGF0Zm9ybTogJ25vZGUnLFxuICBzcGxpdHRpbmc6IGZhbHNlLFxuICBzb3VyY2VtYXA6IGZhbHNlLFxuICBjbGVhbjogdHJ1ZSxcbiAgZHRzOiBmYWxzZSxcbiAgb3V0RGlyOiAnYXBpLWRpc3QnLFxuICBtaW5pZnk6IGZhbHNlLFxuICBidW5kbGU6IGZhbHNlLFxuICBza2lwTm9kZU1vZHVsZXNCdW5kbGU6IHRydWUsXG4gIC8vIEtlZXAgdGhlIGRpcmVjdG9yeSBzdHJ1Y3R1cmVcbiAgb3V0RXh0ZW5zaW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBqczogJy5qcycsXG4gICAgfTtcbiAgfSxcbiAgLy8gSGFuZGxlIHBhdGggYWxpYXNlc1xuICBlc2J1aWxkT3B0aW9ucyhvcHRpb25zKSB7XG4gICAgb3B0aW9ucy5hbGlhcyA9IHtcbiAgICAgICdAc2hhcmVkJzogcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdzaGFyZWQnKSxcbiAgICB9O1xuICAgIC8vIEtlZXAgaW1wb3J0cyBleHRlcm5hbCB0byBhdm9pZCBidW5kbGluZyBkZXBlbmRlbmNpZXNcbiAgICBvcHRpb25zLmV4dGVybmFsID0gW1xuICAgICAgJ0BuZW9uZGF0YWJhc2Uvc2VydmVybGVzcycsXG4gICAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcbiAgICAgICdAdmVyY2VsL25vZGUnLFxuICAgICAgJ2V4cHJlc3MnLFxuICAgICAgJ2V4cHJlc3Mtc2Vzc2lvbicsXG4gICAgICAncGFzc3BvcnQnLFxuICAgICAgJ3Bhc3Nwb3J0LWxvY2FsJyxcbiAgICAgICdjb25uZWN0LXBnLXNpbXBsZScsXG4gICAgICAncG9zdGdyZXMnLFxuICAgICAgJ2RyaXp6bGUtb3JtJyxcbiAgICAgICdkcml6emxlLXpvZCcsXG4gICAgICAnem9kJyxcbiAgICAgICdhZ29yYS10b2tlbicsXG4gICAgICAnbWVtb3J5c3RvcmUnLFxuICAgICAgJ3dzJyxcbiAgICAgICdkb3RlbnYnLFxuICAgICAgJ2JjcnlwdCcsXG4gICAgICAnY3J5cHRvJyxcbiAgICAgICdwYXRoJyxcbiAgICAgICd1cmwnLFxuICAgICAgJ2ZzJyxcbiAgICAgICd1dGlsJyxcbiAgICAgICdjaGlsZF9wcm9jZXNzJyxcbiAgICBdO1xuICB9LFxuICBvblN1Y2Nlc3M6ICdlY2hvIFwiXHUyNzA1IEFQSSBidWlsZCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5IVwiJyxcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ04sU0FBUyxvQkFBb0I7QUFDN08sU0FBUyxZQUFZO0FBQ3JCLE9BQU8sVUFBVTtBQUdqQixJQUFNLGNBQWMsS0FBSyxLQUFLLGVBQWU7QUFBQSxFQUMzQyxRQUFRO0FBQUEsSUFDTjtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNGLENBQUM7QUFFRCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixPQUFPO0FBQUEsRUFDUCxRQUFRLENBQUMsS0FBSztBQUFBLEVBQ2QsUUFBUTtBQUFBLEVBQ1IsVUFBVTtBQUFBLEVBQ1YsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsT0FBTztBQUFBLEVBQ1AsS0FBSztBQUFBLEVBQ0wsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsdUJBQXVCO0FBQUE7QUFBQSxFQUV2QixlQUFlO0FBQ2IsV0FBTztBQUFBLE1BQ0wsSUFBSTtBQUFBLElBQ047QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUVBLGVBQWUsU0FBUztBQUN0QixZQUFRLFFBQVE7QUFBQSxNQUNkLFdBQVcsS0FBSyxRQUFRLFFBQVEsSUFBSSxHQUFHLFFBQVE7QUFBQSxJQUNqRDtBQUVBLFlBQVEsV0FBVztBQUFBLE1BQ2pCO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxXQUFXO0FBQ2IsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
