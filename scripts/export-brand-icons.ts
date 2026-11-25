#!/usr/bin/env node

import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { Command, Flag } from "effect/cli";
import sharp from "sharp";

import { BRAND_ASSET_PATHS, WEB_PNG_ICONS } from "./lib/brand-assets.ts";
import { encodePngIco, WINDOWS_ICON_SIZES } from "./lib/icon-export.ts";

class IconRenderError extends Schema.TaggedError<IconRenderError>()("IconRenderError", {
  size: Schema.Int,
  cause: Schema.Defect(),
}) {
  override get message() {
    return `Failed to render the ${this.size}px application icon.`;
  }
}

class IconExportAssetsStaleError extends Schema.TaggedError<IconExportAssetsStaleError>()(
  "IconExportAssetsStaleError",
  { paths: Schema.Array(Schema.String) },
) {
  override get message() {
    return `Generated icon assets are stale:\n${this.paths.join("\n")}`;
  }
}

const renderPng = Effect.fn("iconExport.renderPng")((svg: Buffer, size: number) =>
  Effect.tryPromise({
    try: () => sharp(svg).resize(size, size).png().toBuffer(),
    catch: (cause) => new IconRenderError({ size, cause }),
  }),
);

function macIconSvg(logo: Buffer) {
  // The macOS Dock expects an 824px icon body on a transparent 1024px canvas.
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024">
    <defs>
      <clipPath id="body"><rect x="100" y="100" width="824" height="824" rx="184"/></clipPath>
      <filter id="shadow" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <rect x="100" y="111" width="824" height="824" rx="184" opacity=".28" filter="url(#shadow)"/>
    <image x="100" y="100" width="824" height="824" clip-path="url(#body)" xlink:href="data:image/svg+xml;base64,${logo.toString("base64")}"/>
  </svg>`);
}

export const exportBrandIcons = Effect.fn("exportBrandIcons")(function* (checkOnly: boolean) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = path.resolve(import.meta.dirname, "..");
  const logo = Buffer.from(yield* fs.readFile(path.join(root, BRAND_ASSET_PATHS.logoSvg)));
  const outputs = new Map<string, Uint8Array>();
  outputs.set(BRAND_ASSET_PATHS.appIconPng, yield* renderPng(logo, 1024));
  outputs.set(BRAND_ASSET_PATHS.macIconPng, yield* renderPng(macIconSvg(logo), 1024));
  outputs.set(
    `${BRAND_ASSET_PATHS.iconComposerProject}/Assets/logo.svg`,
    yield* fs.readFile(path.join(root, BRAND_ASSET_PATHS.transparentLogoSvg)),
  );
  for (const [filename, size] of WEB_PNG_ICONS) {
    outputs.set(`apps/web/public/${filename}`, yield* renderPng(logo, size));
  }
  const renditions = yield* Effect.forEach(WINDOWS_ICON_SIZES, (size) =>
    renderPng(logo, size).pipe(Effect.map((contents) => ({ size, contents }))),
  );
  const ico = encodePngIco(renditions);
  outputs.set(BRAND_ASSET_PATHS.windowsIconIco, ico);
  outputs.set("apps/web/public/favicon.ico", ico);

  const stale: string[] = [];
  for (const [filename, contents] of outputs) {
    const target = path.join(root, filename);
    if (yield* fs.exists(target)) {
      const current = yield* fs.readFile(target);
      if (Buffer.from(current).equals(contents)) continue;
    }
    if (checkOnly) {
      stale.push(filename);
    } else {
      const directory = path.dirname(target);
      yield* fs.makeDirectory(directory, { recursive: true });
      const temp = yield* fs.makeTempFileScoped({ directory });
      yield* fs.writeFile(temp, contents);
      yield* fs.chmod(temp, 0o644);
      yield* fs.rename(temp, target);
    }
  }
  if (stale.length > 0) return yield* new IconExportAssetsStaleError({ paths: stale });
  yield* Console.log(`All ${outputs.size} Sunbringer icon assets are current.`);
});

const command = Command.make(
  "export-brand-icons",
  {
    check: Flag.Boolean("check").pipe(
      Flag.withDescription("Verify generated icon assets without modifying files."),
      Flag.withDefault(false),
    ),
  },
  ({ check }) => exportBrandIcons(check).pipe(Effect.scoped),
).pipe(Command.withDescription("Render Sunbringer application icons from the SVG originals."));

if (import.meta.main) {
  Command.run(command, { version: "0.0.0" }).pipe(
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain,
  );
}
