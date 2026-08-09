// 파일 용도: Playwright evaluate 콜백을 self-contained registry와 직렬화 가능한 typed 인자/결과 경계로 제한한다.

const callbackArgumentSchema = "media-server.v390-ui-browser-callback-argument.v1";
const callbackResultSchema = "media-server.v390-ui-browser-callback-result.v1";

export const browserCallbackIds = Object.freeze([
  "adapter.navigation-owner",
  "adapter.request",
  "adapter.runtime-context",
  "adapter.control-observation",
  "runner.endpoint-request",
  "runner.scoped-viewer-dom",
  "runtime.alert-delivery-dom",
  "runtime.location-pathname",
  "runtime.whoami",
  "runtime.role-boundary",
  "runtime.ops-users-dom",
  "runtime.login",
  "runtime.logout",
  "oracle.viewport-owner",
]);

export function makeBrowserCallbackArgument(callbackId, value = {}) {
  if (!browserCallbackIds.includes(String(callbackId || ""))) {
    throw new Error(`browser callback ID is unknown: ${String(callbackId || "")}`);
  }
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
  if (!record) throw new Error(`browser callback argument must be an object: ${callbackId}`);
  const argument = {
    schema: callbackArgumentSchema,
    callbackId,
    ...structuredClone(record),
  };
  assertSerializable(argument, `browser callback argument ${callbackId}`);
  return argument;
}

export async function evaluateRegisteredBrowserCallback(target, callbackId, value = {}) {
  const definition = browserCallbackDefinitions[callbackId];
  if (!definition) throw new Error(`browser callback ID is unknown: ${String(callbackId || "")}`);
  if (!target || typeof target.evaluate !== "function") {
    throw new Error(`browser callback evaluator is missing: ${callbackId}`);
  }
  const argument = makeBrowserCallbackArgument(callbackId, value);
  definition.validateArgument(argument);
  const result = await target.evaluate(definition.callback, argument);
  assertSerializable(result, `browser callback result ${callbackId}`);
  definition.validateResult(result);
  return result;
}

export const browserCallbackDefinitions = Object.freeze({
  "adapter.navigation-owner": definition(
    (element, argument) => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "adapter.navigation-owner") {
        throw new Error("adapter.navigation-owner browser argument schema mismatch");
      }
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const viewportDocumentOwner = argument.selectorValue === "body" &&
        document.visibilityState === "visible" &&
        document.documentElement.clientWidth > 0 &&
        document.documentElement.clientHeight > 0;
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "adapter.navigation-owner",
        selector: argument.selectorValue,
        candidateCount: 1,
        navigationEpoch: argument.documentEpoch,
        exists: true,
        visible: Boolean(style && style.display !== "none" &&
          style.visibility !== "hidden" && Number(style.opacity || 1) > 0 &&
          ((rect.width > 0 && rect.height > 0) || viewportDocumentOwner)),
      };
    },
    argument => requireFields(argument, "adapter.navigation-owner", {
      selectorValue: "string", documentEpoch: "integer",
    }),
    result => requireResult(result, "adapter.navigation-owner", {
      selector: "string", candidateCount: "integer", navigationEpoch: "integer",
      exists: "boolean", visible: "boolean",
    }),
  ),
  "adapter.request": definition(
    async argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "adapter.request") {
        throw new Error("adapter.request browser argument schema mismatch");
      }
      const result = await fetch(argument.requestPath, {
        method: argument.requestMethod,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "follow",
        headers: {
          ...(argument.requestCorrelationId
            ? { "x-media-server-correlation-id": argument.requestCorrelationId }
            : {}),
          ...(argument.requestBody === null ? {} : { "Content-Type": "application/json" }),
        },
        ...(argument.requestBody === null ? {} : { body: JSON.stringify(argument.requestBody) }),
      });
      const text = await result.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "adapter.request",
        status: result.status,
        url: result.url,
        text,
        json,
        contentType: result.headers.get("content-type") || "",
      };
    },
    argument => requireFields(argument, "adapter.request", {
      requestMethod: "string", requestPath: "string", requestCorrelationId: "string",
    }, ["requestBody"]),
    result => requireResult(result, "adapter.request", {
      status: "integer", url: "string", text: "string", contentType: "string",
    }, ["json"]),
  ),
  "adapter.runtime-context": definition(
    async argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "adapter.runtime-context") {
        throw new Error("adapter.runtime-context browser argument schema mismatch");
      }
      const response = await fetch("/auth/whoami", { credentials: "same-origin", cache: "no-store" });
      let accountRole = "";
      if (response.status === 401) {
        accountRole = "anonymous";
      } else {
        if (!response.ok) throw new Error(`whoami observation failed with status ${response.status}`);
        const principal = await response.json();
        if (principal?.authenticated === false) {
          accountRole = "anonymous";
        } else if (principal?.authenticated === true && typeof principal?.role === "string") {
          accountRole = principal.role;
        } else {
          throw new Error("whoami observation returned an invalid authenticated principal");
        }
      }
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "adapter.runtime-context",
        screenRoute: location.pathname,
        accountRole,
        viewport: { width: innerWidth, height: innerHeight },
        theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      };
    },
    argument => requireFields(argument, "adapter.runtime-context", {}),
    result => requireResult(result, "adapter.runtime-context", {
      screenRoute: "string", accountRole: "string", viewport: "object", theme: "string",
    }),
  ),
  "adapter.control-observation": definition(
    (element, argument) => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "adapter.control-observation") {
        throw new Error("adapter.control-observation browser argument schema mismatch");
      }
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "adapter.control-observation",
        exists: true,
        visible: Boolean(rect && rect.width > 0 && rect.height > 0 && style &&
          style.display !== "none" && style.visibility !== "hidden"),
        disabled: Boolean("disabled" in element && element.disabled),
      };
    },
    argument => requireFields(argument, "adapter.control-observation", {}),
    result => requireResult(result, "adapter.control-observation", {
      exists: "boolean", visible: "boolean", disabled: "boolean",
    }),
  ),
  "runner.endpoint-request": definition(
    async argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "runner.endpoint-request") {
        throw new Error("runner.endpoint-request browser argument schema mismatch");
      }
      const result = await fetch(argument.path, {
        method: argument.method,
        credentials: "same-origin",
        cache: "no-store",
        headers: argument.body === null ? {} : { "Content-Type": "application/json" },
        ...(argument.body === null ? {} : { body: JSON.stringify(argument.body) }),
      });
      const text = await result.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "runner.endpoint-request",
        status: result.status,
        contentType: result.headers.get("content-type") || "",
        text,
        json,
      };
    },
    argument => requireFields(argument, "runner.endpoint-request", {
      method: "string", path: "string",
    }, ["body"]),
    result => requireResult(result, "runner.endpoint-request", {
      status: "integer", contentType: "string", text: "string",
    }, ["json"]),
  ),
  "runner.scoped-viewer-dom": definition(
    argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "runner.scoped-viewer-dom") {
        throw new Error("runner.scoped-viewer-dom browser argument schema mismatch");
      }
      const assigned = document.querySelectorAll(`[data-source-view="${CSS.escape(argument.assignedViewId)}"]`);
      const blocked = document.querySelectorAll(`[data-source-view="${CSS.escape(argument.blockedViewId)}"]`);
      const text = String(document.body?.innerText || "");
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "runner.scoped-viewer-dom",
        assignedSourceNodeCount: assigned.length,
        blockedSourceNodeCount: blocked.length,
        blockedViewTextAbsent: !text.includes(argument.blockedViewId),
        disallowedRuleTextAbsent: !text.includes(argument.disallowedRuleId),
      };
    },
    argument => requireFields(argument, "runner.scoped-viewer-dom", {
      assignedViewId: "string", blockedViewId: "string", disallowedRuleId: "string",
    }),
    result => requireResult(result, "runner.scoped-viewer-dom", {
      assignedSourceNodeCount: "integer", blockedSourceNodeCount: "integer",
      blockedViewTextAbsent: "boolean", disallowedRuleTextAbsent: "boolean",
    }),
  ),
  "runtime.alert-delivery-dom": definition(
    argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "runtime.alert-delivery-dom") {
        throw new Error("runtime.alert-delivery-dom browser argument schema mismatch");
      }
      const previews = document.querySelectorAll("#alertDeliveryPayloadPreview");
      const results = document.querySelectorAll("#alertDeliveryDryRunResult");
      const preview = previews.length === 1 ? previews[0] : null;
      const result = results.length === 1 ? results[0] : null;
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "runtime.alert-delivery-dom",
        previewCount: previews.length,
        resultCount: results.length,
        preview: preview ? {
          schema: preview.dataset.eventSemanticSchema || "",
          deliveryId: preview.dataset.eventSemanticDeliveryId || "",
          eventId: preview.dataset.eventSemanticEventId || "",
          eventType: preview.dataset.eventSemanticEventType || "",
          sourceId: preview.dataset.eventSemanticSourceId || "",
          payloadRedacted: preview.dataset.eventSemanticPayloadRedacted || "",
        } : null,
        result: result ? {
          status: result.dataset.eventSemanticStatus || "",
          dryRun: result.dataset.eventSemanticDryRun || "",
          attemptCount: result.dataset.eventSemanticAttemptCount || "",
          externalDeliveryPerformed: result.dataset.eventSemanticExternalDeliveryPerformed || "",
          auditAction: result.dataset.eventSemanticAuditAction || "",
        } : null,
      };
    },
    argument => requireFields(argument, "runtime.alert-delivery-dom", {}),
    result => requireResult(result, "runtime.alert-delivery-dom", {
      previewCount: "integer", resultCount: "integer",
    }, ["preview", "result"]),
  ),
  "runtime.location-pathname": definition(
    argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "runtime.location-pathname") {
        throw new Error("runtime.location-pathname browser argument schema mismatch");
      }
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "runtime.location-pathname",
        pathname: location.pathname,
      };
    },
    argument => requireFields(argument, "runtime.location-pathname", {}),
    result => requireResult(result, "runtime.location-pathname", { pathname: "string" }),
  ),
  "runtime.whoami": definition(
    async argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "runtime.whoami") {
        throw new Error("runtime.whoami browser argument schema mismatch");
      }
      const response = await fetch("/auth/whoami", {
        credentials: "same-origin", cache: "no-store", redirect: "follow",
      });
      let body = {};
      try { body = await response.json(); } catch {}
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "runtime.whoami",
        status: response.status,
        authenticated: body?.authenticated === true,
        username: typeof body?.username === "string" ? body.username : "",
        role: typeof body?.role === "string" ? body.role : "",
        scopes: Array.isArray(body?.scopes) ? body.scopes.map(value => String(value)) : [],
        setupRequired: body?.setupRequired === true,
      };
    },
    argument => requireFields(argument, "runtime.whoami", {}),
    result => requireResult(result, "runtime.whoami", {
      status: "integer", authenticated: "boolean", username: "string", role: "string",
      scopes: "array", setupRequired: "boolean",
    }),
  ),
  "runtime.role-boundary": definition(
    async argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "runtime.role-boundary") {
        throw new Error("runtime.role-boundary browser argument schema mismatch");
      }
      const request = async path => (await fetch(path, {
        credentials: "same-origin", cache: "no-store", redirect: "follow",
      })).status;
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "runtime.role-boundary",
        clientStatus: await request("/client/api/views"),
        opsStatus: await request("/ops/api/users"),
      };
    },
    argument => requireFields(argument, "runtime.role-boundary", {}),
    result => requireResult(result, "runtime.role-boundary", {
      clientStatus: "integer", opsStatus: "integer",
    }),
  ),
  "runtime.ops-users-dom": definition(
    argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "runtime.ops-users-dom") {
        throw new Error("runtime.ops-users-dom browser argument schema mismatch");
      }
      const section = document.querySelector(argument.selector);
      const text = String(section?.innerText || "");
      const bodyText = String(document.body?.innerText || "");
      const matchingRows = Array.from(section?.querySelectorAll("tr") || [])
        .filter(row => String(row.innerText || "").includes(argument.expectedIdentity));
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "runtime.ops-users-dom",
        identityVisible: matchingRows.length === 1,
        matchingRowCount: matchingRows.length,
        pendingVisible: text.includes(argument.expectedIdentity) && /대기|pending/i.test(text),
        adminAllScopesVisible: text.includes(argument.expectedIdentity) && text.includes("모든 범위"),
        forbiddenMarkersAbsent: !/passwordHash|passwordHistory|tokenHash/i.test(bodyText),
        forbiddenSecretAbsent: !argument.secret || !text.includes(argument.secret),
      };
    },
    argument => requireFields(argument, "runtime.ops-users-dom", {
      selector: "string", expectedIdentity: "string", secret: "string",
    }),
    result => requireResult(result, "runtime.ops-users-dom", {
      identityVisible: "boolean", matchingRowCount: "integer", pendingVisible: "boolean",
      adminAllScopesVisible: "boolean", forbiddenMarkersAbsent: "boolean",
      forbiddenSecretAbsent: "boolean",
    }),
  ),
  "runtime.login": definition(
    async argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "runtime.login") {
        throw new Error("runtime.login browser argument schema mismatch");
      }
      const response = await fetch("/login", {
        method: "POST", credentials: "same-origin", redirect: "follow",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: argument.username, password: argument.password }),
      });
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "runtime.login",
        status: response.status,
        pathname: new URL(response.url).pathname,
      };
    },
    argument => requireFields(argument, "runtime.login", { username: "string", password: "string" }),
    result => requireResult(result, "runtime.login", { status: "integer", pathname: "string" }),
  ),
  "runtime.logout": definition(
    async argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "runtime.logout") {
        throw new Error("runtime.logout browser argument schema mismatch");
      }
      const response = await fetch("/logout", {
        method: "POST", credentials: "same-origin", redirect: "manual",
      });
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "runtime.logout",
        status: response.status,
      };
    },
    argument => requireFields(argument, "runtime.logout", {}),
    result => requireResult(result, "runtime.logout", { status: "integer" }),
  ),
  "oracle.viewport-owner": definition(
    async argument => {
      if (argument?.schema !== "media-server.v390-ui-browser-callback-argument.v1" ||
          argument?.callbackId !== "oracle.viewport-owner") {
        throw new Error("oracle.viewport-owner browser argument schema mismatch");
      }
      const nodes = Array.from(document.querySelectorAll(argument.exactSelector));
      const scroller = document.scrollingElement;
      if (nodes.length !== 1 || !scroller) {
        return {
          schema: "media-server.v390-ui-browser-callback-result.v1",
          callbackId: "oracle.viewport-owner",
          pass: false, nodeCount: nodes.length, scrollerPresent: Boolean(scroller),
        };
      }
      nodes[0].scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: "oracle.viewport-owner",
        pass: true, nodeCount: 1, scrollerPresent: true,
      };
    },
    argument => requireFields(argument, "oracle.viewport-owner", { exactSelector: "string" }),
    result => requireResult(result, "oracle.viewport-owner", {
      pass: "boolean", nodeCount: "integer", scrollerPresent: "boolean",
    }),
  ),
});

function definition(callback, validateArgument, validateResult) {
  return Object.freeze({ callback, validateArgument, validateResult });
}

function requireFields(value, callbackId, required, nullable = []) {
  if (value?.schema !== callbackArgumentSchema || value?.callbackId !== callbackId) {
    throw new Error(`browser callback argument schema mismatch: ${callbackId}`);
  }
  for (const [field, type] of Object.entries(required)) {
    if (!typeMatches(value[field], type)) {
      throw new Error(`browser callback argument field invalid: ${callbackId}.${field}`);
    }
  }
  for (const field of nullable) {
    if (!Object.hasOwn(value, field)) {
      throw new Error(`browser callback argument field missing: ${callbackId}.${field}`);
    }
  }
}

function requireResult(value, callbackId, required, nullable = []) {
  if (value?.schema !== callbackResultSchema || value?.callbackId !== callbackId) {
    throw new Error(`browser callback result schema mismatch: ${callbackId}`);
  }
  for (const [field, type] of Object.entries(required)) {
    if (!typeMatches(value[field], type)) {
      throw new Error(`browser callback result field invalid: ${callbackId}.${field}`);
    }
  }
  for (const field of nullable) {
    if (!Object.hasOwn(value, field)) {
      throw new Error(`browser callback result field missing: ${callbackId}.${field}`);
    }
  }
}

function typeMatches(value, type) {
  if (type === "integer") return Number.isInteger(value);
  if (type === "array") return Array.isArray(value);
  if (type === "object") return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}

function assertSerializable(value, label) {
  try {
    structuredClone(value);
    JSON.stringify(value);
  } catch (error) {
    throw new Error(`${label} is not serializable: ${error instanceof Error ? error.message : String(error)}`);
  }
}
