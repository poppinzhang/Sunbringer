# Sunbringer icons

The original artwork lives in [sunbringer/](./sunbringer/). Development, nightly, and production builds use [the white logo on black](./sunbringer/logo_white_on_black.svg) as the application icon. Use the transparent variants where a surface supplies its own background or tint.

Run `vp run icons:export` to regenerate the desktop icons, the iOS Icon Composer foreground, and the web favicons and manifest icons. Run `vp run icons:check` to verify those files against their sources. The macOS export includes the inset and transparent margins used by the Dock.

Run `vp run icons:export:android` to regenerate the adaptive launcher, splash, and notification artwork. These renditions use a transparent foreground sized for Android's system masks.
