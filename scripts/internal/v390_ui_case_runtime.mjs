// 파일 용도: exact 424 각 case의 fresh role session, runtime secret, persisted fixture snapshot/복구를 소유한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const descriptorSchema = "media-server.v390-ui-runtime-descriptor.v1";
const roleMapSchema = "media-server.v390-ui-role-state-map.v1";

export function createV390UiCaseRuntime({
  rootDir,
  httpBase,
  runtimeDescriptorPath = "",
  roleStateMapPath = "",
  roleSecretsJson = process.env.MEDIA_SERVER_V390_UI_ROLE_SECRETS || "",
} = {}) {
  const descriptor = runtimeDescriptorPath ? readJson(runtimeDescriptorPath) : null;
  if (descriptor) validateDescriptor(descriptor, { rootDir, httpBase, runtimeDescriptorPath, roleStateMapPath });
  const roleStateMap = roleStateMapPath ? readJson(roleStateMapPath) : { schema: roleMapSchema, roles: {} };
  assert(roleStateMap.schema === roleMapSchema, "unexpected role state map schema");
  if (descriptor) {
    assert(path.resolve(roleStateMapPath) === path.resolve(descriptor.roleStateMapPath),
      "CLI role state map does not match the runtime descriptor");
    for (const [role, statePath] of Object.entries(descriptor.auth?.storageStatePaths || {})) {
      assert(path.resolve(roleStateMap.roles?.[role] || "") === path.resolve(statePath),
        `runtime role state map mismatch for ${role}`);
    }
  }
  const roleSecrets = parseSecretEnvelope(roleSecretsJson);
  const runtimeSecrets = new Map();
  const activeCases = new Map();

  async function prepareCase(item) {
    assert(!activeCases.has(item.caseId), `${item.caseId} case runtime already active`);
    const context = {
      caseId: item.caseId,
      fixtureId: reviewedFixtureId(item),
      descriptorRequired: caseNeedsRuntimeOwner(item),
      snapshots: snapshotStateFiles(descriptor?.stateFiles || []),
      beforeRecord: null,
      cleanupExpectedRecord: null,
      beforeRecordEndpoint: "",
      primaryRoleStatePath: "",
      actionRoleStatePaths: {},
      cleanupResults: [],
      secretRefs: new Set(),
      prepared: false,
    };
    try {
      if (context.descriptorRequired) {
        assert(descriptor, `${item.caseId} requires a self-contained runtime descriptor`);
        await prepareAuthFixture(item, context);
        await preparePersistedFixture(item, context);
      }
      for (const input of item.workflow.inputs || []) {
        for (const value of Object.values(input.actualValue || {})) {
          if (value && typeof value === "object" && value.secretRef) {
            context.secretRefs.add(value.secretRef);
          }
        }
      }
      context.primaryRoleStatePath = await freshRoleStorageState(item.accountRole, item.caseId);
      for (const setup of item.workflow.setup || []) {
        if (setup.kind !== "bind-action-role-session") continue;
        context.actionRoleStatePaths[setup.accountRole] = await freshRoleStorageState(
          setup.accountRole,
          `${item.caseId}-action`,
        );
      }
      context.prepared = true;
      activeCases.set(item.caseId, context);
      return context;
    } catch (error) {
      restoreStateFiles(context.snapshots);
      const failure = error instanceof Error ? error : new Error(String(error));
      failure.runtimeCleanup = {
        status: stateFilesEqual(context.snapshots) ? "PASS" : "FAIL",
        source: "prepare-failure-file-snapshot-restore",
      };
      throw failure;
    }
  }

  async function freshRoleStorageState(role, label = "case") {
    if (role === "anonymous") return "";
    if (!descriptor) {
      const existing = roleStateMap.roles?.[role];
      assert(existing, `role state missing for ${role}`);
      return resolvePath(rootDir, existing);
    }
    const username = descriptor.auth?.usernames?.[role];
    const password = roleSecrets.roles?.[role];
    assert(username && password, `fresh role credential missing for ${role}`);
    const response = await postForm(`${httpBase}/login`, { username, password });
    assert(response.status === 302, `fresh ${role} login failed with HTTP ${response.status}`);
    const cookie = cookieFromResponse(response);
    const whoami = await requestJson(`${httpBase}/auth/whoami`, { cookie });
    assert(whoami.status === 200 && whoami.json?.role === role,
      `fresh role whoami mismatch for ${role}: ${whoami.status}/${whoami.json?.role || ""}`);
    const storagePath = path.join(descriptor.temporaryRoot, "role-states", `${safeName(label)}-${role}.json`);
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    writePrivateJson(storagePath, storageStateForCookie(cookie, httpBase));
    return storagePath;
  }

  function resolveSecretRef(secretRef, { item, field, caseContext } = {}) {
    assert(typeof secretRef === "string" && secretRef, "runtime secretRef missing");
    if (runtimeSecrets.has(secretRef)) return runtimeSecrets.get(secretRef);
    let value = roleSecrets.refs?.[secretRef] || "";
    if (!value && secretRef.endsWith(":fixture-current-password")) {
      value = roleSecrets.roles?.[item?.accountRole] || "";
    }
    if (!value && secretRef.endsWith(":fixture-password")) {
      value = generatedPassword();
    }
    assert(value, `${item?.caseId || "case"} runtime secret was not produced for ${field || secretRef}`);
    runtimeSecrets.set(secretRef, value);
    if (caseContext) caseContext.secretRefs.add(secretRef);
    return value;
  }

  async function switchActionRoleSession(browser, item, action, caseContext) {
    const binding = (item.workflow.setup || []).find(setup =>
      setup.kind === "bind-action-role-session" && setup.route === action.route);
    if (!binding) return { switched: false, role: item.accountRole };
    const statePath = caseContext.actionRoleStatePaths[binding.accountRole] ??
      await freshRoleStorageState(binding.accountRole, `${item.caseId}-action-late`);
    await browser.replaceStorageState(statePath);
    return { switched: true, role: binding.accountRole, storageStatePath: statePath };
  }

  async function restoreCase(item, caseContext, browser = null) {
    assert(caseContext?.prepared === true, `${item.caseId} case runtime was not prepared`);
    for (const cleanup of item.workflow.cleanup || []) {
      if (cleanup.kind === "no-op-cleanup" || cleanup.kind === "restore-local-control") continue;
      assert(["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind),
        `${item.caseId} unsupported mutation cleanup kind: ${cleanup.kind}`);
      let result;
      if (cleanup.inverseAction?.endpoint) {
        result = await executeEndpointCleanup(item, cleanup, caseContext);
      } else {
        const restoreType = cleanup.inverseAction?.localAction?.type || "";
        try {
          if (restoreType === "restore-product-fixture-snapshot") {
            await restoreProductMutationState(item, caseContext);
          } else if (restoreType === "restore-source-view-snapshot") {
            await restoreSourceViewState(item, caseContext);
          } else {
            assert(["restore-auth-fixture-snapshot", "restore-file-backed-fixture-snapshot"].includes(restoreType),
              `${item.caseId} unsupported runtime snapshot restore type: ${restoreType}`);
          }
        } finally {
          restoreStateFiles(caseContext.snapshots);
        }
        result = {
          status: "PASS",
          source: restoreType === "restore-product-fixture-snapshot"
            ? "product-memory-and-file-snapshot-restore"
            : (restoreType === "restore-source-view-snapshot"
                ? "source-view-isolation-and-file-snapshot-restore"
                : "exact-file-snapshot-restore"),
        };
      }
      const readback = await verifyCleanupReadback(item, cleanup, caseContext, result);
      caseContext.cleanupResults.push({ cleanupId: cleanup.cleanupId, ...result, readback });
    }
    activeCases.delete(item.caseId);
    if (browser) await browser.setCorrelationId(`${item.caseId}:cleanup-complete`);
    return caseContext.cleanupResults;
  }

  async function verifyCleanupReadback(item, cleanup, caseContext, cleanupResult = {}) {
    assert(cleanup.afterReadback?.identity &&
      ["absent", "equal-before", "inactive-or-equal-before"].includes(cleanup.afterReadback.expectation),
      `${item.caseId} cleanup readback contract incomplete`);
    if (cleanup.inverseAction?.endpoint) {
      const endpoint = expandFixturePath(cleanup.inverseAction.endpoint.path, caseContext.fixtureId);
      const observed = await freshAuthoritativeReadback(endpoint, item, caseContext);
      if (cleanup.afterReadback.expectation === "absent") {
        assert(observed === null, `${item.caseId} cleanup fixture remains after delete`);
      } else {
        assert(stableJson(observed) === stableJson(caseContext.beforeRecord),
          `${item.caseId} cleanup readback differs from before snapshot`);
      }
    } else {
      assert(stateFilesEqual(caseContext.snapshots), `${item.caseId} file snapshot cleanup readback mismatch`);
      if (caseContext.beforeRecordEndpoint) {
        const observed = await freshAuthoritativeReadback(
          caseContext.beforeRecordEndpoint,
          item,
          caseContext,
        );
        if (cleanup.afterReadback.expectation === "inactive-or-equal-before" &&
            caseContext.cleanupExpectedRecord === null) {
          assert(observed?.source?.enabled === false && observed?.publishedView?.enabled === false,
            `${item.caseId} suite-created source/view pair was not disabled before isolated teardown`);
        } else {
          assert(stableJson(observed) === stableJson(caseContext.cleanupExpectedRecord),
            `${item.caseId} fresh authoritative cleanup readback differs from the original state`);
        }
      }
    }
    return {
      status: "PASS",
      identity: cleanup.afterReadback.identity,
      expectation: cleanup.afterReadback.expectation,
      cleanupSource: cleanupResult.source || "runtime-owner",
    };
  }

  return {
    enabled: Boolean(descriptor),
    descriptor,
    prepareCase,
    freshRoleStorageState,
    resolveSecretRef,
    switchActionRoleSession,
    restoreCase,
    verifyMutationReadback,
    verifyCleanupReadback,
  };

  async function prepareAuthFixture(item, context) {
    const formInput = (item.workflow.inputs || []).find(input => input.kind === "form-values");
    if (!formInput) return;
    const values = formInput.actualValue || {};
    if (["UI-002", "AUTH-005", "AUTH-006", "AUTH-007"].includes(item.caseId)) {
      restoreStateFiles(context.snapshots);
      const usersFile = descriptor.auth?.usersFile;
      assert(usersFile, `${item.caseId} auth users file missing from runtime descriptor`);
      if (item.caseId === "AUTH-007") {
        writePrivateJson(usersFile, {
          users: [{ username: values.username, displayName: "Hashless Fixture", role: "admin", scopes: ["*"], passwordHash: "", enabled: true }],
          invites: [], accessRequests: [],
        });
      } else {
        fs.rmSync(usersFile, { force: true });
        fs.rmSync(`${usersFile}.tmp`, { force: true });
      }
      return;
    }
    if (["UI-003", "AUTH-004"].includes(item.caseId)) {
      const passwordRef = Object.values(values).find(value => value?.secretRef)?.secretRef;
      const password = resolveSecretRef(passwordRef, { item, field: "password", caseContext: context });
      await createAuthUser(values.username, "viewer", password, descriptor.auth?.defaultViewId || "9001");
      return;
    }
    if (["UI-007", "AUTH-034"].includes(item.caseId)) {
      const tokenRef = values.token?.secretRef;
      const username = `${item.caseId.toLowerCase()}-invite`;
      const viewId = descriptor.auth?.defaultViewId || "9001";
      const invite = normalizeInviteSeedResponse(await createInvite(username, viewId), { username, viewId });
      assert(invite.token, `${item.caseId} invite API did not return a runtime token`);
      runtimeSecrets.set(tokenRef, invite.token);
      return;
    }
    if (item.caseId === "AUTH-035") {
      runtimeSecrets.set(values.token.secretRef, `expired-${crypto.randomBytes(18).toString("hex")}`);
    }
  }

  async function preparePersistedFixture(item, context) {
    const setup = (item.workflow.setup || []).find(value =>
      value.kind === "seed-reviewed-state" && value.persistedMutation === true);
    if (!setup || item.workflow.workflowClass === "form-submit") return;
    const endpoint = item.workflow.productAction?.endpoint;
    if (!endpoint) return;
    const fixtureInput = (item.workflow.inputs || []).find(input => input.kind === "reversible-fixture-record");
    const operation = fixtureInput?.actualValue?.operation || "write";
    const expanded = expandFixturePath(endpoint.path, context.fixtureId);
    context.beforeRecordEndpoint = expanded;
    context.beforeRecord = await readEndpointRecord(expanded, item, context);
    context.cleanupExpectedRecord = context.beforeRecord;
    if (operation === "create") {
      assert(context.beforeRecord === null,
        `${item.caseId} reviewed create fixture collides with existing product state`);
      context.beforeRecord = null;
      return;
    }
    if (item.caseId === "AUTH-037" || item.caseId === "AUTH-038") {
      seedExactAccessRequestFixture(descriptor.auth?.usersFile, {
        requestId: context.fixtureId,
        username: context.fixtureId,
        displayName: `REVIEW4 ${item.caseId} fixture`,
        contact: `${context.fixtureId}@invalid.example`,
        reason: "v390 exact runtime fixture",
        viewId: descriptor.auth?.defaultViewId || "9001",
      });
      context.beforeRecord = await readEndpointRecord(expanded, item, context);
      return;
    }
    if (item.caseId === "AUTH-019" && context.beforeRecord === null) {
      const password = resolveSecretRef(`${item.caseId}:fixture-password`, {
        item,
        field: "password",
        caseContext: context,
      });
      await createAuthUser(
        context.fixtureId,
        "viewer",
        password,
        descriptor.auth?.defaultViewId || "9001",
      );
      context.beforeRecord = await readEndpointRecord(expanded, item, context);
      assert(context.beforeRecord !== null, `${item.caseId} auth user fixture seed readback missing`);
      return;
    }
    if (item.caseId === "EVT-021") {
      seedEventRecordFixture(descriptor.eventStoragePath, {
        eventId: context.fixtureId,
        sourceId: descriptor.auth?.defaultViewId || "9001",
      });
      const payload = fixturePayload(item, context.fixtureId, fixtureInput?.actualValue || {});
      await requestEndpoint("PUT", expanded, payload, item, context, [200, 201]);
      context.beforeRecord = await readEndpointRecord(expanded, item, context);
      assert(context.beforeRecord !== null, `${item.caseId} event review fixture row did not join to EventRecord`);
      return;
    }
    if (context.beforeRecord === null && ["PUT", "DELETE"].includes(endpoint.method)) {
      if (resolveAuthoritativeReadback(expanded, context.fixtureId).mode === "source-view-pair") {
        await seedSourceViewPair(item, context, fixtureInput?.actualValue || {});
      } else {
        const payload = fixturePayload(item, context.fixtureId, fixtureInput?.actualValue || {});
        await requestEndpoint("PUT", expanded, payload, item, context, [200, 201]);
      }
      context.beforeRecord = await readEndpointRecord(expanded, item, context);
      assert(context.beforeRecord !== null, `${item.caseId} authoritative fixture seed readback missing`);
    }
  }

  async function seedSourceViewPair(item, context, value) {
    const pair = buildOnvifPairPayload(item, context.fixtureId, value);
    const onvif = ["UI-109", "SRC-066"].includes(item.caseId);
    if (onvif) {
      await requestEndpoint(
        "PUT",
        `/ops/api/onvif/channels/${encodeURIComponent(context.fixtureId)}`,
        pair,
        item,
        context,
        [200, 201],
      );
      return;
    }
    await requestEndpoint(
      "PUT",
      `/ops/api/sources/${encodeURIComponent(context.fixtureId)}`,
      pair.source,
      item,
      context,
      [200, 201],
    );
    await requestEndpoint(
      "PUT",
      `/ops/api/views/${encodeURIComponent(context.fixtureId)}`,
      pair.publishedView,
      item,
      context,
      [200, 201],
    );
  }

  async function executeEndpointCleanup(item, cleanup, context) {
    const spec = cleanup.inverseAction.endpoint;
    const endpoint = expandFixturePath(spec.path, context.fixtureId);
    const payload = cleanup.kind === "restore-fixture-state"
      ? (context.beforeRecord || fixturePayload(item, context.fixtureId, {}))
      : null;
    const response = await requestEndpoint(spec.method, endpoint, payload, item, context, spec.allowedStatuses);
    return { status: "PASS", source: "product-inverse-endpoint", method: spec.method, endpoint, httpStatus: response.status };
  }

  async function restoreProductMutationState(item, context) {
    const endpointSpec = item.workflow.productAction?.endpoint;
    assert(endpointSpec?.path?.includes("{fixtureId}"),
      `${item.caseId} product-memory restore requires a fixture-bound endpoint`);
    const endpoint = expandFixturePath(endpointSpec.path, context.fixtureId);
    if (context.cleanupExpectedRecord === null) {
      await requestEndpoint("DELETE", endpoint, null, item, context, [200, 204, 404], { freshRole: true });
      return;
    }
    await requestEndpoint("PUT", endpoint, context.cleanupExpectedRecord, item, context, [200, 201], { freshRole: true });
  }

  async function restoreSourceViewState(item, context) {
    const sourceEndpoint = `/ops/api/sources/${encodeURIComponent(context.fixtureId)}`;
    const viewEndpoint = `/ops/api/views/${encodeURIComponent(context.fixtureId)}`;
    if (context.cleanupExpectedRecord === null) {
      await requestEndpoint("DELETE", viewEndpoint, null, item, context, [200, 404], { freshRole: true, roleOverride: "operator" });
      await requestEndpoint("DELETE", sourceEndpoint, null, item, context, [200, 404], { freshRole: true, roleOverride: "operator" });
      return;
    }
    const pair = context.cleanupExpectedRecord;
    assert(pair?.source && pair?.publishedView,
      `${item.caseId} original source/view pair is incomplete`);
    if (["UI-109", "SRC-066"].includes(item.caseId)) {
      await requestEndpoint(
        "PUT",
        `/ops/api/onvif/channels/${encodeURIComponent(context.fixtureId)}`,
        pair,
        item,
        context,
        [200, 201],
        { freshRole: true, roleOverride: "operator" },
      );
      return;
    }
    await requestEndpoint("PUT", sourceEndpoint, pair.source, item, context, [200, 201], { freshRole: true, roleOverride: "operator" });
    await requestEndpoint("PUT", viewEndpoint, pair.publishedView, item, context, [200, 201], { freshRole: true, roleOverride: "operator" });
  }

  async function readEndpointRecord(endpoint, item, context, { freshRole = false } = {}) {
    const readback = resolveAuthoritativeReadback(endpoint, context.fixtureId);
    if (readback.mode === "source-view-pair") {
      const sourceResponse = await requestEndpoint(
        "GET", readback.endpoint, null, item, context, [200], { freshRole, roleOverride: readback.role },
      );
      const viewResponse = await requestEndpoint(
        "GET", readback.secondaryEndpoint, null, item, context, [200], { freshRole, roleOverride: readback.role },
      );
      const source = unwrapRecord(sourceResponse.json, readback.fixtureId, readback.matchFields);
      const publishedView = unwrapRecord(viewResponse.json, readback.fixtureId, readback.matchFields);
      return source === null && publishedView === null ? null : { source, publishedView };
    }
    const direct = await requestEndpoint(
      "GET",
      readback.endpoint,
      null,
      item,
      context,
      [200, 404],
      { freshRole, roleOverride: readback.role },
    );
    if (direct.status === 404) return null;
    const payload = direct.json;
    return readback.mode === "whole-response"
      ? payload
      : unwrapRecord(payload, readback.fixtureId, readback.matchFields);
  }

  async function freshAuthoritativeReadback(endpoint, item, context) {
    return readEndpointRecord(endpoint, item, context, { freshRole: true });
  }

  async function verifyMutationReadback(item, context) {
    assert(item.workflow?.workflowClass === "persisted-mutation",
      `${item.caseId} mutation readback is only valid for persisted workflows`);
    const endpointSpec = item.workflow.productAction?.endpoint;
    assert(endpointSpec?.method && endpointSpec.path,
      `${item.caseId} mutation readback endpoint is unavailable`);
    const endpoint = expandFixturePath(endpointSpec.path, context.fixtureId);
    const observed = await freshAuthoritativeReadback(endpoint, item, context);
    const before = context.beforeRecord;
    const changed = stableJson(observed) !== stableJson(before);
    if (endpointSpec.method === "DELETE") {
      assert(observed === null,
        `${item.caseId} deleted mutation remains in authoritative product readback`);
    } else {
      assert(observed !== null,
        `${item.caseId} persisted mutation is missing from authoritative product readback`);
      assert(changed,
        `${item.caseId} persisted mutation did not change authoritative product state`);
    }
    const readback = resolveAuthoritativeReadback(endpoint, context.fixtureId);
    if (readback.mode === "source-view-pair" && endpointSpec.method !== "DELETE") {
      assert(observed?.source && observed?.publishedView,
        `${item.caseId} source/view mutation did not persist both transaction members`);
    }
    assertReviewedMutationOutcome(item.caseId, observed);
    return {
      schema: "media-server.v390-ui-runtime-mutation-readback.v1",
      fixtureId: context.fixtureId,
      endpoint,
      method: endpointSpec.method,
      mode: readback.mode,
      changed,
      beforeSha256: crypto.createHash("sha256").update(stableJson(before)).digest("hex"),
      observedSha256: crypto.createHash("sha256").update(stableJson(observed)).digest("hex"),
      observedPresent: observed !== null,
    };
  }

  async function requestEndpoint(
    method,
    endpoint,
    payload,
    item,
    context,
    allowedStatuses,
    { freshRole = false, roleOverride = "" } = {},
  ) {
    const role = roleOverride || actionRoleFor(item) || item.accountRole;
    const statePath = freshRole
      ? await freshRoleStorageState(role, `${item.caseId}-fresh-authoritative-readback`)
      : context.actionRoleStatePaths[role] || context.primaryRoleStatePath ||
        await freshRoleStorageState(role, `${item.caseId}-api`);
    const cookie = statePath ? cookieHeaderFromStorageState(statePath) : "";
    const response = await fetch(`${httpBase}${endpoint}`, {
      method,
      redirect: "manual",
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(payload !== null ? { "Content-Type": "application/json" } : {}),
      },
      ...(payload !== null ? { body: JSON.stringify(payload) } : {}),
    });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!allowedStatuses.includes(response.status)) {
      throw new Error(`${item.caseId} runtime ${method} ${endpoint} failed HTTP ${response.status}: ${text.slice(0, 160)}`);
    }
    return { status: response.status, json, text };
  }

  async function createAuthUser(username, role, password, viewId) {
    const admin = await adminCookie();
    const response = await fetch(`${httpBase}/ops/api/users`, {
      method: "POST", redirect: "manual",
      headers: { Cookie: admin, "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName: username, role, viewId, password, enabled: true, mustChangePassword: false }),
    });
    assert([200, 201, 409].includes(response.status), `runtime user seed failed HTTP ${response.status}`);
  }

  async function createInvite(username, viewId) {
    const admin = await adminCookie();
    const response = await fetch(`${httpBase}/ops/api/invites`, {
      method: "POST", redirect: "manual",
      headers: { Cookie: admin, "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName: username, role: "viewer", viewId, ttlSeconds: 3600 }),
    });
    const json = await response.json();
    assert([200, 201].includes(response.status), `runtime invite seed failed HTTP ${response.status}`);
    return json;
  }

  async function adminCookie() {
    const username = descriptor.auth?.usernames?.admin;
    const password = roleSecrets.roles?.admin;
    const response = await postForm(`${httpBase}/login`, { username, password });
    assert(response.status === 302, `runtime admin login failed HTTP ${response.status}`);
    return cookieFromResponse(response);
  }
}

function caseNeedsRuntimeOwner(item) {
  return (item.workflow.setup || []).some(setup => setup.kind === "bind-action-role-session" ||
    (setup.kind === "seed-reviewed-state" && setup.persistedMutation === true)) ||
    JSON.stringify(item.workflow.inputs || []).includes("secretRef") ||
    (item.workflow.cleanup || []).some(cleanup => ["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind));
}

function reviewedFixtureId(item) {
  return (item.workflow.setup || []).find(setup => setup.kind === "seed-reviewed-state")?.fixtureId || `${item.caseId.toLowerCase()}-fixture`;
}

function actionRoleFor(item) {
  return (item.workflow.setup || []).find(setup => setup.kind === "bind-action-role-session")?.accountRole || "";
}

function snapshotStateFiles(files) {
  return files.map(filePath => {
    const resolved = path.resolve(filePath);
    const exists = fs.existsSync(resolved);
    return {
      path: resolved,
      exists,
      mode: exists ? fs.statSync(resolved).mode & 0o777 : 0o600,
      bytes: exists ? fs.readFileSync(resolved).toString("base64") : "",
    };
  });
}

function restoreStateFiles(snapshots) {
  for (const snapshot of snapshots) {
    fs.mkdirSync(path.dirname(snapshot.path), { recursive: true });
    if (!snapshot.exists) {
      fs.rmSync(snapshot.path, { force: true });
      continue;
    }
    const temporary = `${snapshot.path}.v390-runtime-${process.pid}.tmp`;
    fs.writeFileSync(temporary, Buffer.from(snapshot.bytes, "base64"), { mode: snapshot.mode });
    fs.renameSync(temporary, snapshot.path);
    fs.chmodSync(snapshot.path, snapshot.mode);
  }
}

function stateFilesEqual(snapshots) {
  return snapshots.every(snapshot => {
    if (fs.existsSync(snapshot.path) !== snapshot.exists) return false;
    if (!snapshot.exists) return true;
    return fs.readFileSync(snapshot.path).toString("base64") === snapshot.bytes;
  });
}

function fixturePayload(item, fixtureId, value) {
  const endpoint = item.workflow.productAction?.endpoint?.path || "";
  const base = { id: fixtureId, displayName: value.displayName || `REVIEW4 ${item.caseId} fixture`, enabled: true };
  if (endpoint.includes("/sources/")) return { ...base, sourceId: fixtureId, kind: "file", file: "sample_h264.mp4", tags: ["review4", "throwaway"] };
  if (endpoint.includes("/views/")) return { ...base, viewId: fixtureId, sourceId: "9001", allowedRuleIds: [], allowedOverlayModes: ["raw", "va-overlay"], showDashboard: true, showEvents: true, maxTiles: 1 };
  if (endpoint.includes("/profiles/")) return { ...base, name: base.displayName, detector: "yolo", fps: 6, confidence: 0.25, nms: 0.45, inputWidth: 640, inputHeight: 640, trackingClasses: ["person"], analysis: { classes: ["person"] } };
  if (endpoint.includes("/va-rules/")) return { ...base, name: base.displayName, source: { kind: "file", file: "sample_h264.mp4" }, analysis: { profileId: "9101", classes: ["person"], trackingPolicy: { tracker: "lite", reid: "off" } }, event: { type: "presence", region: { type: "polygon", points: [[0,0],[1,0],[1,1],[0,1]] } }, priority: 1 };
  if (endpoint.includes("/rules/")) return { ...base, name: base.displayName, ruleKind: "basic", analysis: { profileId: "9101", classes: ["person"], trackingPolicy: { tracker: "lite", reid: "off" } }, event: { type: "presence", region: { type: "polygon", points: [[0,0],[1,0],[1,1],[0,1]] } } };
  if (endpoint.includes("/users")) return { username: fixtureId, displayName: base.displayName, role: "viewer", viewId: "9001", enabled: true };
  if (endpoint.includes("/vlm/profiles/")) return { ...base, name: base.displayName, provider: "disabled", model: "not-configured", runtimeContract: { defaultEnabled: false, runtimeCallAllowed: false, providerCallAllowed: false } };
  if (endpoint.includes("/events/reviews/")) return { eventId: fixtureId, reviewStatus: "pending", reviewNote: "review4 runtime baseline" };
  if (endpoint.includes("/onvif/channels/")) return { channelId: fixtureId, displayName: base.displayName, host: "127.0.0.1", port: 80, enabled: false };
  return base;
}

function buildOnvifPairPayload(item, fixtureId, value = {}) {
  const onvif = ["UI-109", "SRC-066"].includes(item.caseId);
  const displayName = value.displayName || `REVIEW4 ${item.caseId} fixture`;
  const source = {
    sourceId: fixtureId,
    displayName,
    kind: onvif ? "rtsp" : "file",
    enabled: true,
    tags: onvif ? ["onvif", "review4"] : ["review4", "throwaway"],
    ownerGroup: "review4",
    site: "contract",
    group: "review4",
    floor: "",
    zone: "",
    ...(onvif ? { rtspUrl: `rtsp://127.0.0.1:${8554}/${fixtureId}` } : { file: "sample_h264.mp4" }),
  };
  const publishedView = {
    viewId: fixtureId,
    displayName,
    sourceId: fixtureId,
    defaultRuleId: "",
    allowedRuleIds: [],
    allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
    showDashboard: true,
    showEvents: true,
    showMetadataSummary: true,
    clientGroups: [],
    maxTiles: 1,
    enabled: true,
  };
  return { source, publishedView };
}

function unwrapRecord(payload, fixtureId, matchFields = []) {
  if (payload === null || payload === undefined) return null;
  const matches = item => recordId(item) === fixtureId || matchFields.some(field => String(item?.[field] || "") === fixtureId);
  if (Array.isArray(payload)) return payload.find(matches) || null;
  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      const found = value.find(matches);
      if (found) return found;
    }
  }
  const direct = payload.source || payload.view || payload.profile || payload.rule || payload.vaRule || payload.user || payload.review || payload.channel;
  if (direct && typeof direct === "object") return direct;
  return recordId(payload) === fixtureId ? payload : null;
}

function recordId(value) {
  return String(value?.id || value?.sourceId || value?.viewId || value?.username || value?.eventId ||
    value?.channelId || value?.inviteId || value?.requestId || "");
}

export function normalizeInviteSeedResponse(value, { username = "", viewId = "" } = {}) {
  assert(value && typeof value === "object", "runtime invite seed response must be an object");
  const invite = value.invite && typeof value.invite === "object" ? value.invite : value;
  assert(typeof invite.token === "string" && invite.token.length > 0,
    "runtime invite seed response did not contain invite.token");
  assert(typeof invite.setupUrl === "string" && invite.setupUrl.includes(encodeURIComponent(invite.token)),
    "runtime invite seed response did not bind setupUrl to the token");
  if (username) assert(invite.username === username, "runtime invite seed username mismatch");
  if (viewId) assert(invite.viewId === viewId, "runtime invite seed viewId mismatch");
  return invite;
}

export function seedExactAccessRequestFixture(usersFile, {
  requestId,
  username,
  displayName,
  contact,
  reason,
  viewId,
} = {}) {
  assert(usersFile && fs.existsSync(usersFile), "runtime auth users file is unavailable");
  assert(requestId && username, "runtime exact access-request identity is required");
  const store = readJson(usersFile);
  store.users = Array.isArray(store.users) ? store.users : [];
  store.invites = Array.isArray(store.invites) ? store.invites : [];
  store.accessRequests = Array.isArray(store.accessRequests) ? store.accessRequests : [];
  store.accessRequests = store.accessRequests.filter(item =>
    item?.requestId !== requestId && item?.username !== username);
  const record = {
    requestId,
    username,
    displayName: displayName || username,
    contact: contact || "",
    reason: reason || "v390 exact runtime fixture",
    viewId: viewId || "",
    status: "pending",
    createdAt: new Date().toISOString(),
    decidedAt: "",
    decidedBy: "",
    inviteId: "",
  };
  store.accessRequests.push(record);
  writePrivateJson(usersFile, store);
  return record;
}

export function seedEventRecordFixture(eventStoragePath, { eventId, sourceId = "9001" } = {}) {
  assert(eventStoragePath, "runtime event storage path is unavailable");
  assert(eventId, "runtime EventRecord fixture ID is required");
  const record = {
    eventId,
    streamId: sourceId,
    sourceId,
    channelId: sourceId,
    eventType: "presence",
    className: "person",
    status: "recorded",
    timestampMs: Date.now(),
    receivedAtMs: Date.now(),
    confidence: 0.9,
    fixtureOwner: "v390-self-contained-acceptance",
  };
  fs.appendFileSync(eventStoragePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  fs.chmodSync(eventStoragePath, 0o600);
  return record;
}

export function resolveAuthoritativeReadback(endpoint, fixtureId) {
  const value = String(endpoint || "");
  if (value === "/client/api/preferences/live-layout") {
    return { endpoint: value, fixtureId: "", mode: "whole-response", matchFields: [] };
  }
  if (value === "/client/api/access-requests") {
    return {
      endpoint: "/ops/api/access-requests",
      fixtureId,
      mode: "fixture-record",
      matchFields: ["requestId", "username"],
      role: "admin",
    };
  }
  if (["/ops/api/sources/", "/ops/api/views/", "/ops/api/onvif/channels/"].some(prefix => value.startsWith(prefix))) {
    return {
      endpoint: "/ops/api/sources",
      secondaryEndpoint: "/ops/api/views",
      fixtureId,
      mode: "source-view-pair",
      matchFields: ["sourceId", "viewId"],
      role: "operator",
    };
  }
  const authCollections = [
    ["/ops/api/users/", "/ops/api/users"],
    ["/ops/api/invites/", "/ops/api/invites"],
    ["/ops/api/access-requests/", "/ops/api/access-requests"],
  ];
  for (const [prefix, collection] of authCollections) {
    if (value.startsWith(prefix)) {
      return { endpoint: collection, fixtureId, mode: "fixture-record", matchFields: ["username", "inviteId", "requestId"], role: "admin" };
    }
  }
  const collectionMappings = [
    ["/ops/api/vlm/profiles/", "/ops/api/vlm/profiles"],
    ["/lab/analysis/va-rules/", "/lab/analysis/va-rules"],
    ["/lab/analysis/rules/", "/lab/analysis/rules"],
    ["/lab/analysis/profiles/", "/lab/analysis/profiles"],
    ["/ops/api/events/reviews/", "/ops/api/events/reviews"],
  ];
  for (const [prefix, collection] of collectionMappings) {
    if (value.startsWith(prefix)) {
      return { endpoint: collection, fixtureId, mode: "fixture-record", matchFields: ["id", "ruleId", "profileId", "eventId"] };
    }
  }
  return { endpoint: value, fixtureId, mode: "fixture-record", matchFields: [] };
}

function expandFixturePath(value, fixtureId) {
  return String(value || "").replaceAll("{fixtureId}", encodeURIComponent(fixtureId));
}

function parseSecretEnvelope(raw) {
  if (!raw) return { roles: {}, refs: {} };
  const value = JSON.parse(raw);
  assert(value && typeof value === "object", "role secret envelope must be an object");
  return { roles: value.roles || {}, refs: value.refs || {} };
}

function generatedPassword() {
  return `V390!${crypto.randomBytes(24).toString("base64url")}aA9`;
}

async function postForm(url, values) {
  return fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
  });
}

async function requestJson(url, { cookie = "" } = {}) {
  const response = await fetch(url, { headers: cookie ? { Cookie: cookie } : {} });
  let json = null;
  try { json = await response.json(); } catch { json = null; }
  return { status: response.status, json };
}

function cookieFromResponse(response) {
  const raw = response.headers.get("set-cookie") || "";
  const pair = raw.split(";", 1)[0];
  assert(/^[^=]+=.+/.test(pair), "login response session cookie missing");
  return pair;
}

function storageStateForCookie(cookie, httpBase) {
  const [name, ...parts] = cookie.split("=");
  const url = new URL(httpBase);
  return {
    cookies: [{ name, value: parts.join("="), domain: url.hostname, path: "/", expires: -1, httpOnly: true, secure: url.protocol === "https:", sameSite: "Lax" }],
    origins: [],
  };
}

function cookieHeaderFromStorageState(filePath) {
  const state = readJson(filePath);
  return (state.cookies || []).map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
}

function validateDescriptor(descriptor, { rootDir, httpBase, runtimeDescriptorPath, roleStateMapPath }) {
  assert(descriptor.schema === descriptorSchema, "unexpected self-contained runtime descriptor schema");
  assert(descriptor.httpBase === httpBase, "runtime descriptor HTTP base mismatch");
  const root = fs.realpathSync(descriptor.temporaryRoot);
  assert(path.basename(root).startsWith("media_server_v390_ui-"), "runtime temporary root name mismatch");
  const parsedHttpBase = new URL(httpBase);
  const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
  assert(parsedHttpBase.protocol === "http:" && loopbackHosts.has(parsedHttpBase.hostname),
    "runtime HTTP base must use a loopback HTTP endpoint");
  assert(Number(parsedHttpBase.port) === Number(descriptor.httpPort),
    "runtime descriptor HTTP port does not match httpBase");

  const containedFiles = [
    [runtimeDescriptorPath, "runtime descriptor"],
    [roleStateMapPath, "CLI roleStateMapPath"],
    [descriptor.roleStateMapPath, "descriptor roleStateMapPath"],
    [descriptor.serverLogPath, "serverLogPath"],
    [descriptor.eventStoragePath, "eventStoragePath"],
    [descriptor.auth?.usersFile, "auth usersFile"],
    ...Object.entries(descriptor.auth?.storageStatePaths || {}).map(([role, value]) => [value, `auth storageStatePaths.${role}`]),
    ...Object.entries(descriptor.registrySeedPayloadPaths || {}).map(([name, value]) => [value, `registrySeedPayloadPaths.${name}`]),
    ...(descriptor.stateFiles || []).map(value => [value, "stateFiles"]),
  ];
  for (const [candidate, label] of containedFiles) {
    assertContainedPath(root, candidate, label);
  }
  for (const [name, directoryPath] of Object.entries(descriptor.artifactPaths || {})) {
    assertContainedPath(root, directoryPath, `artifactPaths.${name}`);
  }
  assert(rootDir && path.isAbsolute(rootDir), "runtime repository root missing");
}

function assertReviewedMutationOutcome(caseId, observed) {
  if (caseId === "SRC-009") {
    assert(observed?.source?.zone === "review4-zone-updated",
      `${caseId} source zone update is missing from authoritative readback`);
  } else if (caseId === "SRC-018") {
    assert(observed?.publishedView?.allowedRuleIds?.includes("9301") &&
      observed?.publishedView?.clientGroups?.includes("review4-client"),
    `${caseId} published-view rule/scope update is missing from authoritative readback`);
  } else if (caseId === "RULE-008") {
    assert(observed?.enabled === false,
      `${caseId} enabled-state mutation is missing from authoritative readback`);
  } else if (caseId === "RULE-011") {
    assert(String(observed?.analysis?.profileId || observed?.profileId || "") === "9101",
      `${caseId} profile mapping is missing from authoritative readback`);
  } else if (caseId === "RULE-012") {
    const points = observed?.event?.region?.points || observed?.region?.points || [];
    assert(Array.isArray(points) && Number(points[0]?.[0]) === 0.1 && Number(points[0]?.[1]) === 0.1,
      `${caseId} polygon mutation is missing from authoritative readback`);
  } else if (caseId === "RULE-030") {
    assert(Number(observed?.confidence ?? observed?.minConfidence) === 0.75,
      `${caseId} profile confidence mutation is missing from authoritative readback`);
  } else if (caseId === "RULE-073") {
    assert(String(observed?.event?.type || observed?.scenario?.type || "") === "line-crossing" &&
      String(observed?.event?.region?.direction || observed?.scenario?.allowedDirection || "") === "forward",
    `${caseId} line direction mutation is missing from authoritative readback`);
  } else if (caseId === "RULE-075") {
    assert(Number(observed?.scenario?.cooldownMs) === 9000,
      `${caseId} cooldown mutation is missing from authoritative readback`);
  } else if (caseId === "CLIENT-009") {
    const layout = observed?.userPreference?.workspaceLayout;
    assert(layout && Number(layout.gridSize) > 0 &&
      ["compact", "comfortable"].includes(layout.density) &&
      ["left", "right"].includes(layout.dockSide),
    `${caseId} grid/density/dock preference is missing from authoritative readback`);
  }
}

function assertContainedPath(root, candidate, label) {
  assert(typeof candidate === "string" && candidate.length > 0, `${label} path missing`);
  const resolved = path.resolve(candidate);
  const existing = fs.existsSync(resolved) ? resolved : nearestExistingParent(resolved);
  const real = fs.realpathSync(existing);
  assert(isInside(root, real), `${label} escapes temporary root: ${candidate}`);
}

function nearestExistingParent(candidate) {
  let current = path.dirname(candidate);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    assert(parent !== current, `no existing parent for runtime path: ${candidate}`);
    current = parent;
  }
  return current;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolvePath(rootDir, value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(rootDir, value);
}

function writePrivateJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function safeName(value) {
  return String(value || "case").replace(/[^a-zA-Z0-9_.-]+/g, "-");
}

function stableJson(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
