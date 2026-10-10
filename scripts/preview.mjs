import { context } from "esbuild";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);
const build = await context({
  absWorkingDir: projectDirectory,
  entryPoints: ["client/web.ts"],
  bundle: true,
  platform: "browser",
  jsx: "automatic",
  alias: { "react-native": "react-native-web" },
  define: { "process.env.NODE_ENV": '"development"', __DEV__: "true" },
  outfile: "dist/preview.js",
  sourcemap: true,
});
await build.rebuild();
await build.watch();

const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>JSON Render 开发预览</title><style>html,body,#root{height:100%;margin:0}body{font-family:system-ui,sans-serif}#root{display:flex}*{box-sizing:border-box}</style><div id="root"></div><script src="/preview.js"></script></html>`;
const server = createServer(async (request, response) => {
  if (request.url === "/preview.js" || request.url === "/preview.js.map") {
    try {
      const filename = request.url.slice(1);
      response.setHeader(
        "Content-Type",
        filename.endsWith(".map") ? "application/json" : "text/javascript",
      );
      response.end(
        await readFile(path.join(projectDirectory, "dist", filename)),
      );
    } catch {
      response.writeHead(500).end("Preview build unavailable.");
    }
    return;
  }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(html);
});
server.listen(4317, "127.0.0.1", () =>
  console.log("Preview: http://127.0.0.1:4317"),
);

async function stop() {
  server.close();
  await build.dispose();
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
