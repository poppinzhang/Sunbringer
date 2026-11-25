// @effect-diagnostics nodeBuiltinImport:off - Tests exercise root env file precedence directly.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { loadRepoEnv } from "./public-config.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadRepoEnv", () => {
  it("applies process, root local, and root precedence in that order", () => {
    const repoRoot = makeTemporaryDirectory();
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env"),
      "SUNBRINGER_HOSTED_APP_URL=https://root.example.test\nSUNBRINGER_MOBILE_VERSION=1.0.0\n",
    );
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env.local"),
      "SUNBRINGER_HOSTED_APP_URL=https://local.example.test\n",
    );

    expect(loadRepoEnv({ baseEnv: {}, repoRoot })).toEqual({
      SUNBRINGER_HOSTED_APP_URL: "https://local.example.test",
      SUNBRINGER_MOBILE_VERSION: "1.0.0",
    });
    expect(
      loadRepoEnv({ baseEnv: { SUNBRINGER_HOSTED_APP_URL: "https://ci.example.test" }, repoRoot })
        .SUNBRINGER_HOSTED_APP_URL,
    ).toBe("https://ci.example.test");
  });
});

function makeTemporaryDirectory() {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3code-public-config-"));
  temporaryDirectories.push(directory);
  return directory;
}
