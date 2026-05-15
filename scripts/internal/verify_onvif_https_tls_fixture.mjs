#!/usr/bin/env node
// 파일 용도: ONVIF HTTPS TLS fixture harness의 loopback 성공/실패/redaction 경계를 검증한다.
// 동작 요약: ephemeral CA와 HTTPS fixture 서버를 생성해 trusted success와 TLS 실패 요약을 실장비 없이 확인한다.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF HTTPS TLS fixture verification

Usage:
  ./server.sh verify-onvif-https-tls-fixture

Checks:
  - ephemeral CA와 loopback HTTPS fixture server로 trusted SOAP success를 검증
  - untrusted CA, hostname mismatch, expired certificate, handshake failure, connection refused를 sanitized failure로 검증
  - production ONVIF SOAP transport의 HTTPS fixture success는 verify-onvif-http-transport에서 검증함
  - 실장비 HTTPS endpoint 성공은 계속 미확인으로 보고함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const fixtureDoc = readText("docs/onvif-https-tls-fixture-harness-design.md");
const httpsDesignDoc = readText("docs/onvif-https-soap-transport-design.md");
const tlsPolicyDoc = readText("docs/onvif-tls-transport-policy.md");
const noDeviceDoc = readText("docs/onvif-no-device-verification.md");
const noDeviceSuite = readText("scripts/internal/verify_onvif_no_device_suite.mjs");
const onvifCode = readText("src/ingress/onvif_live_import.cpp");

for (const term of [
  "./server.sh verify-onvif-https-tls-fixture",
  "fixture-only",
  "trustedFixtureSuccess",
  "untrusted CA failure",
  "hostname mismatch failure",
  "certificate expired failure",
  "handshake failure",
  "connection refused",
  "realDeviceEndpointSuccess",
  "미확인",
]) {
  assertContains(fixtureDoc, term, `TLS fixture harness doc missing executable term: ${term}`);
}

for (const term of [
  "verify-onvif-https-tls-fixture",
  "fixture-only HTTPS 성공",
  "production `SendOnvifSoapHttp`의 HTTPS fixture",
]) {
  assertContains(httpsDesignDoc, term, `HTTPS SOAP design doc missing fixture term: ${term}`);
}

for (const term of [
  "verify-onvif-https-tls-fixture",
  "trusted fixture success",
  "production `SendOnvifSoapHttp`",
]) {
  assertContains(tlsPolicyDoc, term, `TLS policy doc missing fixture term: ${term}`);
}

for (const term of [
  "verify-onvif-https-tls-fixture",
  "trusted fixture success",
  "fixture TLS server/client 실행",
]) {
  assertContains(noDeviceDoc, term, `no-device doc missing TLS fixture term: ${term}`);
}

assertContains(noDeviceSuite, '["verify-onvif-https-tls-fixture"]', "no-device suite missing executable TLS fixture command");

for (const term of [
  "bool IsHttpSoapTransportScheme",
  "if (!IsHttpSoapTransportScheme(url->scheme))",
  "SSL_connect",
  "SSL_set1_host",
  "https transport requires OpenSSL support",
]) {
  assertContains(onvifCode, term, `ONVIF SOAP transport missing TLS implementation term: ${term}`);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_onvif_tls_fixture-"));
try {
  const material = generateCertificates(workDir);
  await verifyTrustedFixture(material);
  await verifyUntrustedCa(material);
  await verifyHostnameMismatch(material);
  await verifyExpiredCertificate(material);
  await verifyHandshakeFailure(material.caCert);
  await verifyConnectionRefused(material.caCert);
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}

console.log("");
console.log("== ONVIF HTTPS TLS fixture summary ==");
console.log("- mode: fixture-only");
console.log("- trustedFixtureSuccess: true");
console.log("- redactionVerified: true");
console.log("- productionHttpsTransport: verified by verify-onvif-http-transport");
console.log("- realDeviceEndpointSuccess: 미확인");
console.log("- failures: 0");

function generateCertificates(dir) {
  const caKey = path.join(dir, "fixture-ca.key");
  const caCert = path.join(dir, "fixture-ca.crt");
  const serverKey = path.join(dir, "server.key");
  const serverCsr = path.join(dir, "server.csr");
  const serverCert = path.join(dir, "server.crt");
  const expiredKey = path.join(dir, "expired.key");
  const expiredCsr = path.join(dir, "expired.csr");
  const expiredCert = path.join(dir, "expired.crt");
  const extFile = path.join(dir, "server.ext");
  fs.writeFileSync(extFile, "subjectAltName=DNS:localhost\n");

  openssl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", caKey, "-out", caCert, "-days", "2", "-subj", "/CN=MediaServer ONVIF Fixture CA"], dir);
  openssl(["req", "-newkey", "rsa:2048", "-nodes", "-keyout", serverKey, "-out", serverCsr, "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost"], dir);
  openssl(["x509", "-req", "-in", serverCsr, "-CA", caCert, "-CAkey", caKey, "-CAcreateserial", "-out", serverCert, "-days", "2", "-sha256", "-extfile", extFile], dir);
  openssl(["req", "-newkey", "rsa:2048", "-nodes", "-keyout", expiredKey, "-out", expiredCsr, "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost"], dir);
  openssl(["x509", "-req", "-in", expiredCsr, "-CA", caCert, "-CAkey", caKey, "-CAcreateserial", "-out", expiredCert, "-sha256", "-not_before", "20200101000000Z", "-not_after", "20200102000000Z", "-extfile", extFile], dir);

  return {
    caCert: fs.readFileSync(caCert),
    serverKey: fs.readFileSync(serverKey),
    serverCert: fs.readFileSync(serverCert),
    expiredKey: fs.readFileSync(expiredKey),
    expiredCert: fs.readFileSync(expiredCert),
  };
}

async function verifyTrustedFixture(material) {
  const captured = [];
  const server = await startHttpsServer(material.serverKey, material.serverCert, captured);
  try {
    const response = await requestHttpsFixture(server.port, {
      ca: material.caCert,
      servername: "localhost",
    });
    assert(response.ok, `trusted fixture request failed: ${response.error}`);
    assert(response.status === 200, "trusted fixture status mismatch");
    assert(response.body.includes("GetServicesResponse"), "trusted fixture SOAP body missing");
    assert(captured.length === 1, "trusted fixture request was not captured");
    assert(captured[0].url === "/onvif/device_service", "trusted fixture path mismatch");
    assert(String(captured[0].headers.soapaction || "").includes("GetServices"), "trusted fixture SOAPAction missing");
    assert(captured[0].body.includes("<tds:GetServices"), "trusted fixture request body missing");
    assertNoForbidden(captured[0].body, "trusted fixture captured request");
    console.log("[pass] ONVIF HTTPS TLS fixture trusted success");
  } finally {
    await closeServer(server.server);
  }
}

async function verifyUntrustedCa(material) {
  const server = await startHttpsServer(material.serverKey, material.serverCert, []);
  try {
    const response = await requestHttpsFixture(server.port, {
      servername: "localhost",
    });
    assert(!response.ok, "untrusted CA fixture unexpectedly succeeded");
    assert(response.sanitizedError === "certificate verification failed", "untrusted CA sanitized error mismatch");
    assertNoForbidden(response.serialized, "untrusted CA failure summary");
    console.log("[pass] ONVIF HTTPS TLS fixture untrusted CA failure redaction");
  } finally {
    await closeServer(server.server);
  }
}

async function verifyHostnameMismatch(material) {
  const server = await startHttpsServer(material.serverKey, material.serverCert, []);
  try {
    const response = await requestHttpsFixture(server.port, {
      ca: material.caCert,
      servername: "fixture-mismatch.local",
    });
    assert(!response.ok, "hostname mismatch fixture unexpectedly succeeded");
    assert(response.sanitizedError === "hostname verification failed", "hostname mismatch sanitized error mismatch");
    assertNoForbidden(response.serialized, "hostname mismatch failure summary");
    console.log("[pass] ONVIF HTTPS TLS fixture hostname mismatch redaction");
  } finally {
    await closeServer(server.server);
  }
}

async function verifyExpiredCertificate(material) {
  const server = await startHttpsServer(material.expiredKey, material.expiredCert, []);
  try {
    const response = await requestHttpsFixture(server.port, {
      ca: material.caCert,
      servername: "localhost",
    });
    assert(!response.ok, "expired certificate fixture unexpectedly succeeded");
    assert(response.sanitizedError === "certificate expired", "expired certificate sanitized error mismatch");
    assertNoForbidden(response.serialized, "expired certificate failure summary");
    console.log("[pass] ONVIF HTTPS TLS fixture expired certificate redaction");
  } finally {
    await closeServer(server.server);
  }
}

async function verifyHandshakeFailure(caCert) {
  const server = await startPlainServer();
  try {
    const response = await requestHttpsFixture(server.port, {
      ca: caCert,
      servername: "localhost",
    });
    assert(!response.ok, "handshake failure fixture unexpectedly succeeded");
    assert(response.sanitizedError === "TLS handshake failed", "handshake sanitized error mismatch");
    assertNoForbidden(response.serialized, "handshake failure summary");
    console.log("[pass] ONVIF HTTPS TLS fixture handshake failure redaction");
  } finally {
    for (const socket of server.sockets) {
      socket.destroy();
    }
    await closeServer(server.server);
  }
}

async function verifyConnectionRefused(caCert) {
  const response = await requestHttpsFixture(9, {
    ca: caCert,
    servername: "localhost",
  });
  assert(!response.ok, "connection refused fixture unexpectedly succeeded");
  assert(response.sanitizedError === "network failure", "connection refused sanitized error mismatch");
  assertNoForbidden(response.serialized, "connection refused failure summary");
  console.log("[pass] ONVIF HTTPS TLS fixture connection refused redaction");
}

async function startHttpsServer(key, cert, captured) {
  const server = https.createServer({ key, cert }, (req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      body += chunk;
    });
    req.on("end", () => {
      captured.push({ url: req.url, headers: req.headers, body });
      const responseBody = servicesSoap();
      res.writeHead(200, {
        "Content-Type": "application/soap+xml",
        "Content-Length": Buffer.byteLength(responseBody),
      });
      res.end(responseBody);
    });
  });
  await listen(server);
  return { server, port: server.address().port };
}

async function startPlainServer() {
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.end("not a TLS server");
  });
  await listen(server);
  return { server, port: server.address().port, sockets };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function closeServer(server) {
  return new Promise(resolve => server.close(() => resolve()));
}

function requestHttpsFixture(port, tlsOptions) {
  return new Promise(resolve => {
    const body = getServicesEnvelope();
    const req = https.request({
      host: "127.0.0.1",
      port,
      path: "/onvif/device_service",
      method: "POST",
      rejectUnauthorized: true,
      timeout: 2000,
      ...tlsOptions,
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8; action=\"GetServices\"",
        SOAPAction: "\"GetServices\"",
        "Content-Length": Buffer.byteLength(body),
      },
    }, res => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", chunk => {
        responseBody += chunk;
      });
      res.on("end", () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          body: responseBody,
          serialized: JSON.stringify({ status: res.statusCode, bodyIncluded: Boolean(responseBody) }),
        });
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error("request timeout"));
    });
    req.on("error", error => {
      const sanitizedError = sanitizeTlsError(error);
      resolve({
        ok: false,
        status: 0,
        error: error.code || error.message,
        sanitizedError,
        serialized: JSON.stringify({ ok: false, sanitizedError }),
      });
    });
    req.end(body);
  });
}

function sanitizeTlsError(error) {
  const code = String(error.code || "");
  const message = String(error.message || "");
  if (code === "ERR_TLS_CERT_ALTNAME_INVALID") return "hostname verification failed";
  if (code === "CERT_HAS_EXPIRED") return "certificate expired";
  if (code.includes("CERT") || code.includes("VERIFY") || code.includes("SELF_SIGNED") || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
    return "certificate verification failed";
  }
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") return "network failure";
  if (code === "EPROTO" || message.toLowerCase().includes("wrong version number") || message.toLowerCase().includes("ssl")) {
    return "TLS handshake failed";
  }
  return "TLS request failed";
}

function servicesSoap() {
  return `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><tds:GetServicesResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><tds:Service><tds:Namespace>http://www.onvif.org/ver10/device/wsdl</tds:Namespace></tds:Service><tds:Service><tds:Namespace>http://www.onvif.org/ver20/media/wsdl</tds:Namespace></tds:Service></tds:GetServicesResponse></s:Body></s:Envelope>`;
}

function getServicesEnvelope() {
  return `<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><s:Body><tds:GetServices><tds:IncludeCapability>false</tds:IncludeCapability></tds:GetServices></s:Body></s:Envelope>`;
}

function openssl(args, cwd) {
  const result = spawnSync("openssl", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert(result.status === 0, `openssl failed: openssl ${args.join(" ")}`);
}

function assertNoForbidden(serialized, label) {
  for (const forbidden of [
    "127.0.0.1",
    "localhost",
    "fixture-mismatch.local",
    "BEGIN CERTIFICATE",
    "PRIVATE KEY",
    "password",
    "Authorization",
    "raw SOAP",
    "onvif/device_service",
  ]) {
    assert(!serialized.includes(forbidden), `${label} leaked forbidden token: ${forbidden}`);
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertContains(text, needle, message) {
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  assert(normalizedText.includes(normalizedNeedle), message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
