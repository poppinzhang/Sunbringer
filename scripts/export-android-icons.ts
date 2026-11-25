#!/usr/bin/env node

import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import sharp from "sharp";

import { BRAND_ASSET_PATHS } from "./lib/brand-assets.ts";

class AndroidIconRenderError extends Schema.TaggedError<AndroidIconRenderError>()(
  "AndroidIconRenderError",
  { file: Schema.String, cause: Schema.Defect() },
) {}

export const exportAndroidIcons = Effect.fn("androidIcons.export")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = path.resolve(import.meta.dirname, "..");
  const source = path.join(root, BRAND_ASSET_PATHS.transparentLogoSvg);
  // Keep the launcher and splash marks inside the central 66dp safe zone of a 108dp adaptive icon.
  const outputs = [
    {
      file: "assets/android-icon-foreground.png",
      size: 432,
      markSize: 264,
      background: "transparent",
    },
    { file: "assets/android-splash-icon.png", size: 1152, markSize: 704, background: "#000000" },
    {
      file: "modules/t3-agent-notifications/android/src/main/res/drawable-xxxhdpi/agent_activity_mark.png",
      size: 96,
      markSize: 96,
      background: "transparent",
    },
  ] as const;
  for (const { file, size, markSize, background } of outputs) {
    const inset = (size - markSize) / 2;
    const destination = path.join(root, "apps/mobile", file);
    yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
    yield* Effect.tryPromise({
      try: () => {
        const image = sharp(source).resize(markSize, markSize);
        if (inset)
          image.extend({ top: inset, bottom: inset, left: inset, right: inset, background });
        if (background !== "transparent") image.flatten({ background });
        return image.png().toFile(destination);
      },
      catch: (cause) => new AndroidIconRenderError({ file, cause }),
    });
    yield* Console.log(`wrote apps/mobile/${file}`);
  }
});

if (import.meta.main) {
  exportAndroidIcons().pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
}
