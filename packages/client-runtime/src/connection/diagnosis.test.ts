import { EnvironmentAuthInvalidError } from "@t3tools/contracts";
import { describe, expect, it } from "@effect/vitest";

import { connectionDiagnosisText, presentConnectionDiagnosis } from "./diagnosis.ts";
import { mapRemoteDpopEnvironmentError, mapRemoteEnvironmentError } from "./errors.ts";
import {
  AVAILABLE_CONNECTION_STATE,
  ConnectionBlockedError,
  type ConnectionAttemptError,
  type SupervisorConnectionState,
} from "./model.ts";
import { RemoteEnvironmentAuthFetchError } from "../rpc/http.ts";

const backoff = (lastFailure: ConnectionAttemptError): SupervisorConnectionState => ({
  ...AVAILABLE_CONNECTION_STATE,
  desired: true,
  network: "online",
  phase: "backoff",
  attempt: 3,
  lastFailure,
  retryAt: Date.UTC(2026, 9, 19, 12, 0, 30),
});

const unreachable = mapRemoteEnvironmentError(
  new RemoteEnvironmentAuthFetchError({ message: "Failed to fetch", cause: new TypeError() }),
);

const diagnose = (state: SupervisorConnectionState) =>
  presentConnectionDiagnosis({ hostLabel: "Mac mini", state });

const results = (state: SupervisorConnectionState) =>
  diagnose(state)?.hops.map((hop) => `${hop.hop}:${hop.result}`);

describe("presentConnectionDiagnosis", () => {
  it("has nothing to report before a connect attempt fails", () => {
    expect(diagnose(AVAILABLE_CONNECTION_STATE)).toBeNull();
  });

  it("names the host when it does not answer", () => {
    const diagnosis = diagnose(backoff(unreachable));
    expect(diagnosis?.headline).toContain("Mac mini did not answer");
    expect(results(backoff(unreachable))).toEqual(["device:ok", "server:failed"]);
    expect(diagnosis?.steps.join(" ")).toContain("running on Mac mini");
  });

  it("reports this device as offline before any other hop", () => {
    const state = { ...backoff(unreachable), network: "offline" as const };
    expect(diagnose(state)?.headline).toBe("This device is offline");
    expect(results(state)).toEqual(["device:failed", "server:unchecked"]);
  });

  it("tells a host that refused this device's login to pair again, not to start the server", () => {
    const failure = mapRemoteEnvironmentError(
      new EnvironmentAuthInvalidError({
        code: "auth_invalid",
        reason: "invalid_credential",
        traceId: "trace-1",
      }),
    );
    const diagnosis = diagnose(backoff(failure));
    expect(diagnosis?.headline).toContain("Mac mini did not accept this device");
    expect(diagnosis?.steps.join(" ")).not.toContain("is running");
    expect(diagnosis?.steps.join(" ")).toMatch(/pair/i);
  });

  it("blames this device's clock when the host refuses its proof as out of time", () => {
    const failure = mapRemoteDpopEnvironmentError(
      new EnvironmentAuthInvalidError({
        code: "auth_invalid",
        reason: "invalid_credential",
        dpopFailureReason: "time_window",
        traceId: "trace-clock",
      }),
    );
    const diagnosis = diagnose(backoff(failure));
    expect(diagnosis?.headline).toBe("This device's clock is off");
    expect(diagnosis?.steps.join(" ")).toContain("automatic date and time");
  });

  it("asks for an update on a host that is too old to connect to", () => {
    const failure = new ConnectionBlockedError({
      reason: "unsupported",
      detail: "The host speaks an older protocol.",
      serverUpdateRequired: true,
    });
    const diagnosis = diagnose(backoff(failure));
    expect(diagnosis?.headline).toContain("Mac mini runs an older");
    expect(results(backoff(failure))).toEqual(["device:ok", "server:failed"]);
  });

  it("does not report hops as working when the failure names none", () => {
    const failure = new ConnectionBlockedError({
      reason: "configuration",
      detail: "Connection profile connection-1 is unavailable.",
    });
    expect(results(backoff(failure))).toEqual(["device:unchecked", "server:failed"]);
  });

  it("lists the facts a bug report needs", () => {
    const diagnosis = presentConnectionDiagnosis({
      hostLabel: "Mac mini",
      state: backoff(unreachable),
      clientVersion: "1.2.3",
      serverVersion: "1.2.0",
    })!;
    expect(diagnosis.facts).toEqual([
      ["Cause", "network"],
      ["Attempts", "3"],
      ["Next retry", "2026-10-19T12:00:30.000Z"],
      ["App version", "1.2.3"],
      ["Host version", "1.2.0"],
      ["Error", "Failed to fetch"],
    ]);
    const text = connectionDiagnosisText("Mac mini", diagnosis);
    expect(text).toContain("This device: ok");
    expect(text).toContain("Mac mini: FAILED");
  });
});
