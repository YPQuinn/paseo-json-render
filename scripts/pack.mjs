import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);
const destination = path.join(projectDirectory, "dist");
const stagingDirectory = await mkdtemp(path.join(tmpdir(), "paseo-npm-"));
const repository = "https://github.com/YPQuinn/paseo-json-render/blob/main/";
const rawFiles =
  "https://raw.githubusercontent.com/YPQuinn/paseo-json-render/main/";

function npm(args, cwd) {
  return JSON.parse(execFileSync("npm", args, { cwd, encoding: "utf8" }))[0];
}

function publicReadmeLink(value, image = false) {
  if (value.startsWith("#") || /^https?:\/\//.test(value)) return value;
  return (image ? rawFiles : repository) + value;
}

try {
  // Use npm's file selection so the release matches package.json's allowlist.
  const contents = npm(
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    projectDirectory,
  );
  for (const { path: filename } of contents.files) {
    const target = path.join(stagingDirectory, filename);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(projectDirectory, filename), target);
  }

  const manifestPath = path.join(stagingDirectory, "paseo-plugin.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  // npm installs runtime dependencies itself; the Git-only npm ci step needs a lockfile.
  delete manifest.build;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  const packagePath = path.join(stagingDirectory, "package.json");
  const packageMetadata = JSON.parse(await readFile(packagePath, "utf8"));
  // Keep the checkout private to prevent publishing its Git manifest by accident.
  delete packageMetadata.private;
  await writeFile(packagePath, JSON.stringify(packageMetadata, null, 2) + "\n");

  const readmePath = path.join(stagingDirectory, "README.md");
  const readme = (await readFile(readmePath, "utf8"))
    .replace(
      /(src|href)="([^"]+)"/g,
      (_, attribute, value) =>
        `${attribute}="${publicReadmeLink(value, attribute === "src")}"`,
    )
    .replace(/\]\(([^)]+)\)/g, (_, value) => `](${publicReadmeLink(value)})`);
  await writeFile(readmePath, readme);

  await mkdir(destination, { recursive: true });
  const release = npm(
    ["pack", "--json", "--ignore-scripts", "--pack-destination", destination],
    stagingDirectory,
  );
  console.log(path.join(destination, release.filename));
} finally {
  await rm(stagingDirectory, { recursive: true, force: true });
}
