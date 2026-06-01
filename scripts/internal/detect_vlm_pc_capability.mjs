#!/usr/bin/env node
// 파일 용도: V200-S02 local PC capability detector. 모델 추천, 설치, VLM 호출은 수행하지 않는다.

import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM PC capability detector

Usage:
  ./server.sh detect-vlm-pc-capability [options]

Options:
  --fixture <path>       Synthetic fixture JSON을 입력으로 사용합니다.
  --fixture-case <id>    fixture bundle 안의 case ID를 선택합니다.
  --json-output <path>   JSON 결과를 저장합니다.
  --report <path>        Markdown 요약을 저장합니다.
  --timeout-ms <ms>      command/local endpoint probe timeout. 기본 800.
  --ollama-url <url>     local Ollama tags endpoint. 기본 http://127.0.0.1:11434/api/tags
  --vllm-url <url>       local vLLM models endpoint. 기본 http://127.0.0.1:8000/v1/models
  --no-endpoint-probe    loopback endpoint reachability probe를 생략합니다.
  -h, --help             도움말 출력

Scope:
  - OS, CPU, RAM, GPU/VRAM, Apple Silicon, Docker, Ollama, vLLM/API 연결 가능 여부를 수집합니다.
  - 추천 모델 산출, 설치 UI, profile 저장, VLM runtime 호출, sidecar 저장은 수행하지 않습니다.
  - endpoint probe는 loopback 주소로 제한하고 외부 cloud/API endpoint는 호출하지 않습니다.
`);
}

assertKnownOptions(rawArgs, [
  "fixture",
  "fixture-case",
  "json-output",
  "report",
  "timeout-ms",
  "ollama-url",
  "vllm-url",
  "no-endpoint-probe",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const timeoutMs = positiveInteger(args.timeoutMs, 800);
const probe = args.fixture
  ? loadFixtureProbe(args.fixture, args.fixtureCase)
  : await collectLiveProbe({
      timeoutMs,
      ollamaUrl: args.ollamaUrl || "http://127.0.0.1:11434/api/tags",
      vllmUrl: args.vllmUrl || "http://127.0.0.1:8000/v1/models",
      endpointProbe: args.endpointProbe,
    });

const capability = buildCapabilityReport(probe, {
  timeoutMs,
  source: args.fixture ? "fixture" : "live",
});

const jsonText = `${JSON.stringify(capability, null, 2)}\n`;
if (args.jsonOutput) writeText(path.resolve(rootDir, args.jsonOutput), jsonText);
if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdown(capability));
process.stdout.write(jsonText);

function parseArgs(argv) {
  const parsed = {
    endpointProbe: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") {
      continue;
    } else if (arg === "--fixture") {
      parsed.fixture = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--fixture=")) {
      parsed.fixture = arg.slice("--fixture=".length);
    } else if (arg === "--fixture-case") {
      parsed.fixtureCase = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--fixture-case=")) {
      parsed.fixtureCase = arg.slice("--fixture-case=".length);
    } else if (arg === "--json-output") {
      parsed.jsonOutput = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--json-output=")) {
      parsed.jsonOutput = arg.slice("--json-output=".length);
    } else if (arg === "--report") {
      parsed.report = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--report=")) {
      parsed.report = arg.slice("--report=".length);
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--timeout-ms=")) {
      parsed.timeoutMs = arg.slice("--timeout-ms=".length);
    } else if (arg === "--ollama-url") {
      parsed.ollamaUrl = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--ollama-url=")) {
      parsed.ollamaUrl = arg.slice("--ollama-url=".length);
    } else if (arg === "--vllm-url") {
      parsed.vllmUrl = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--vllm-url=")) {
      parsed.vllmUrl = arg.slice("--vllm-url=".length);
    } else if (arg === "--no-endpoint-probe") {
      parsed.endpointProbe = false;
    }
  }
  return parsed;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("-")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function positiveInteger(raw, fallback) {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`timeout-ms must be a positive integer: ${raw}`);
  }
  return value;
}

function loadFixtureProbe(relativePath, fixtureCase) {
  const fixture = readJson(relativePath);
  if (Array.isArray(fixture.cases)) {
    const selected = fixtureCase
      ? fixture.cases.find(item => item.id === fixtureCase)
      : fixture.cases.length === 1
        ? fixture.cases[0]
        : null;
    if (!selected) {
      throw new Error(`fixture case required or not found: ${fixtureCase || "<missing>"}`);
    }
    return {
      ...selected.probe,
      fixture: {
        bundleSchema: fixture.schema,
        id: selected.id,
        expectedHardwareClass: selected.expectedHardwareClass,
        expectedRuntimeStatuses: selected.expectedRuntimeStatuses || {},
      },
    };
  }
  return {
    ...fixture.probe,
    fixture: {
      bundleSchema: fixture.schema,
      id: fixture.id || "single-fixture",
      expectedHardwareClass: fixture.expectedHardwareClass,
      expectedRuntimeStatuses: fixture.expectedRuntimeStatuses || {},
    },
  };
}

async function collectLiveProbe(options) {
  const platform = process.platform;
  const arch = process.arch;
  const cpus = os.cpus() || [];
  const probe = {
    platform,
    arch,
    osRelease: os.release(),
    cpu: {
      brand: cpus[0]?.model || "",
      cores: cpus.length || null,
    },
    memory: {
      totalBytes: os.totalmem(),
    },
    apple: {
      silicon: platform === "darwin" && arch === "arm64",
      unifiedMemoryBytes: platform === "darwin" && arch === "arm64" ? os.totalmem() : null,
    },
    gpus: [],
    commands: {},
    endpoints: {},
  };

  if (platform === "darwin") collectDarwinProbe(probe, options.timeoutMs);
  if (platform === "linux") collectLinuxProbe(probe, options.timeoutMs);

  probe.commands.docker = commandVersion("docker", ["--version"], options.timeoutMs);
  probe.commands.ollama = commandVersion("ollama", ["--version"], options.timeoutMs);
  probe.commands.vllmModule = commandPresence("python3", ["-c", "import importlib.util; print('present' if importlib.util.find_spec('vllm') else 'missing')"], options.timeoutMs, "present");

  if (options.endpointProbe) {
    probe.endpoints.ollama = await probeLoopbackEndpoint(options.ollamaUrl, options.timeoutMs);
    probe.endpoints.vllm = await probeLoopbackEndpoint(options.vllmUrl, options.timeoutMs);
  } else {
    probe.endpoints.ollama = { probed: false, status: "not-probed" };
    probe.endpoints.vllm = { probed: false, status: "not-probed" };
  }

  return probe;
}

function collectDarwinProbe(probe, timeoutMs) {
  const cpuBrand = runCommand("sysctl", ["-n", "machdep.cpu.brand_string"], timeoutMs);
  if (cpuBrand.available && cpuBrand.stdout.trim()) {
    probe.cpu.brand = cpuBrand.stdout.trim();
  }
  const arm64 = runCommand("sysctl", ["-n", "hw.optional.arm64"], timeoutMs);
  if (arm64.available && arm64.stdout.trim() === "1") {
    probe.apple.silicon = true;
    probe.apple.unifiedMemoryBytes = probe.memory.totalBytes;
  }
  const profiler = runCommand("system_profiler", ["-json", "SPHardwareDataType", "SPDisplaysDataType"], timeoutMs);
  if (!profiler.available || !profiler.stdout.trim()) return;
  try {
    const data = JSON.parse(profiler.stdout);
    const hardware = Array.isArray(data.SPHardwareDataType) ? data.SPHardwareDataType[0] : {};
    if (hardware?.chip_type) {
      probe.cpu.brand = String(hardware.chip_type);
      if (/Apple/i.test(probe.cpu.brand)) {
        probe.apple.silicon = true;
        probe.apple.unifiedMemoryBytes = probe.memory.totalBytes;
      }
    }
    const displays = Array.isArray(data.SPDisplaysDataType) ? data.SPDisplaysDataType : [];
    for (const display of displays) {
      const model = display.sppci_model || display._name || display.spdisplays_chipset || "";
      const vendor = display.spdisplays_vendor || (/Apple/i.test(String(model)) ? "Apple" : "");
      if (model || vendor) {
        probe.gpus.push({
          vendor,
          model,
          vramBytes: parseMemoryTextToBytes(display.spdisplays_vram || display.spdisplays_vram_shared || ""),
          integrated: /Apple/i.test(String(vendor)) || /Apple/i.test(String(model)),
          source: "system_profiler",
        });
      }
    }
  } catch {
    // system_profiler 출력은 선택 정보이며 느리거나 로컬라이즈될 수 있습니다.
  }
}

function collectLinuxProbe(probe, timeoutMs) {
  try {
    const cpuInfo = fs.readFileSync("/proc/cpuinfo", "utf8");
    const modelLine = cpuInfo.split(/\r?\n/).find(line => /^model name\s*:/i.test(line));
    if (modelLine) probe.cpu.brand = modelLine.split(":").slice(1).join(":").trim();
  } catch {
    // 선택 정보이므로 읽기 실패는 무시합니다.
  }
  try {
    const memInfo = fs.readFileSync("/proc/meminfo", "utf8");
    const memLine = memInfo.split(/\r?\n/).find(line => /^MemTotal:/i.test(line));
    if (memLine) {
      const kb = Number(memLine.match(/(\d+)/)?.[1] || "");
      if (Number.isFinite(kb) && kb > 0) probe.memory.totalBytes = kb * 1024;
    }
  } catch {
    // 선택 정보이므로 읽기 실패는 무시합니다.
  }
  const nvidia = runCommand("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"], timeoutMs);
  probe.commands.nvidiaSmi = commandFromRun(nvidia);
  if (nvidia.available && nvidia.stdout.trim()) {
    for (const line of nvidia.stdout.trim().split(/\r?\n/)) {
      const [name, memoryMb] = line.split(",").map(item => item.trim());
      const mb = Number(memoryMb);
      probe.gpus.push({
        vendor: "NVIDIA",
        model: name || "NVIDIA GPU",
        vramBytes: Number.isFinite(mb) ? mb * 1024 * 1024 : null,
        runtimeVerified: true,
        source: "nvidia-smi",
      });
    }
  }
  if (probe.gpus.length === 0) {
    const lspci = runCommand("lspci", [], timeoutMs);
    probe.commands.lspci = commandFromRun(lspci);
    if (lspci.available && lspci.stdout.trim()) {
      for (const line of lspci.stdout.split(/\r?\n/)) {
        if (/vga|3d controller|display/i.test(line)) {
          const vendor = /nvidia/i.test(line) ? "NVIDIA" : /amd|advanced micro devices/i.test(line) ? "AMD" : /intel/i.test(line) ? "Intel" : "";
          probe.gpus.push({
            vendor,
            model: line.replace(/^[^:]+:\s*/, "").trim(),
            vramBytes: null,
            runtimeVerified: false,
            source: "lspci",
          });
        }
      }
    }
  }
}

function buildCapabilityReport(probe, options) {
  const osFamily = osFamilyFromPlatform(probe.platform);
  const systemRamGb = bytesToGb(probe.memory?.totalBytes);
  const unifiedMemoryGb = bytesToGb(probe.apple?.unifiedMemoryBytes);
  const gpus = normalizeGpus(probe.gpus || []);
  const hardwareClassCandidate = classifyHardware({
    osFamily,
    platform: probe.platform,
    arch: probe.arch,
    systemRamGb,
    appleSilicon: Boolean(probe.apple?.silicon),
    unifiedMemoryGb,
    gpus,
  });

  const warnings = [];
  const unknowns = [];
  if (!["macOS", "Linux"].includes(osFamily)) warnings.push("unsupported-os-family");
  if (!systemRamGb) unknowns.push("system-ram");
  if (osFamily === "Linux" && gpus.length === 0) unknowns.push("linux-gpu");
  if (osFamily === "Linux" && gpus.some(gpu => gpu.vendor === "NVIDIA" && !gpu.vramGb)) unknowns.push("nvidia-vram");
  if (osFamily === "macOS" && probe.arch === "arm64" && !unifiedMemoryGb) unknowns.push("apple-unified-memory");

  const docker = commandStatus(probe.commands?.docker);
  const ollamaCli = commandStatus(probe.commands?.ollama);
  const vllmModule = commandStatus(probe.commands?.vllmModule);
  const ollamaEndpoint = endpointStatus(probe.endpoints?.ollama);
  const vllmEndpoint = endpointStatus(probe.endpoints?.vllm);

  for (const [name, status] of [
    ["docker", docker],
    ["ollama-cli", ollamaCli],
    ["vllm-module", vllmModule],
  ]) {
    if (!status.available) warnings.push(`${name}-missing`);
  }
  if (ollamaEndpoint.status !== "reachable" && ollamaEndpoint.status !== "not-probed") warnings.push("ollama-loopback-unreachable");
  if (vllmEndpoint.status !== "reachable" && vllmEndpoint.status !== "not-probed") warnings.push("vllm-loopback-unreachable");

  return {
    schema: "media-server.vlm-pc-capability.v1",
    targetStep: "V200-S02",
    generatedAt: new Date().toISOString(),
    source: options.source,
    fixtureCase: probe.fixture?.id || undefined,
    scope: "pc-capability-detector-only",
    nonScope: [
      "recommendation-engine",
      "install-or-connection-ui",
      "profile-storage",
      "runtime-vlm-call",
      "sidecar-storage",
      "event-post-webrtc-sse-ws-schema-change",
      "external-cloud-probe",
    ],
    privacy: {
      externalNetworkProbes: false,
      loopbackEndpointProbeOnly: true,
      rawCommandOutputStored: false,
      sensitiveValuesIncluded: false,
    },
    os: {
      family: osFamily,
      platform: probe.platform || "",
      arch: probe.arch || "",
      release: probe.osRelease || "",
    },
    cpu: {
      brand: sanitizeLabel(probe.cpu?.brand || ""),
      cores: positiveOrNull(probe.cpu?.cores),
    },
    memory: {
      systemRamGb,
    },
    apple: {
      appleSilicon: Boolean(probe.apple?.silicon),
      unifiedMemoryGb,
    },
    gpu: {
      maxVramGb: maxNumber(gpus.map(gpu => gpu.vramGb)),
      nvidiaRuntimeVerified: gpus.some(gpu => gpu.vendor === "NVIDIA" && gpu.runtimeVerified),
      gpus,
    },
    runtimes: {
      docker,
      ollama: {
        cli: ollamaCli,
        loopbackApi: ollamaEndpoint,
      },
      vllm: {
        pythonModule: vllmModule,
        loopbackApi: vllmEndpoint,
      },
    },
    hardwareClassCandidate,
    warnings: [...new Set(warnings)].sort(),
    unknowns: [...new Set(unknowns)].sort(),
  };
}

function classifyHardware(input) {
  const reasons = [];
  const blockers = [];
  if (!["macOS", "Linux"].includes(input.osFamily)) {
    blockers.push("target-os-not-macos-or-linux");
    return classResult("local-unsupported", reasons, blockers, "detected");
  }
  if (input.osFamily === "macOS") {
    if (!input.appleSilicon) {
      blockers.push("intel-mac-cpu-only");
      return classResult("local-unsupported", reasons, blockers, "detected");
    }
    if (!input.unifiedMemoryGb) {
      blockers.push("apple-unified-memory-unknown");
      return classResult("local-unsupported", reasons, blockers, "partial");
    }
    reasons.push(`apple-unified-memory-${input.unifiedMemoryGb}gb`);
    if (input.unifiedMemoryGb >= 48) return classResult("local-high", reasons, blockers, "detected");
    if (input.unifiedMemoryGb >= 24) return classResult("local-standard", reasons, blockers, "detected");
    if (input.unifiedMemoryGb >= 16) return classResult("local-low", reasons, blockers, "detected");
    blockers.push("apple-unified-memory-below-16gb");
    return classResult("local-unsupported", reasons, blockers, "detected");
  }

  const maxNvidiaVramGb = maxNumber(input.gpus
    .filter(gpu => gpu.vendor === "NVIDIA")
    .map(gpu => gpu.vramGb));
  if (!input.systemRamGb) blockers.push("system-ram-unknown");
  if (!maxNvidiaVramGb) blockers.push("nvidia-vram-unavailable");
  if (input.gpus.some(gpu => gpu.vendor && gpu.vendor !== "NVIDIA")) {
    blockers.push("amd-intel-gpu-runtime-unverified");
  }
  if (input.systemRamGb && maxNvidiaVramGb) {
    reasons.push(`system-ram-${input.systemRamGb}gb`);
    reasons.push(`nvidia-vram-${maxNvidiaVramGb}gb`);
    if (input.systemRamGb >= 64 && maxNvidiaVramGb >= 24) return classResult("local-high", reasons, [], "detected");
    if (input.systemRamGb >= 24 && maxNvidiaVramGb >= 12) return classResult("local-standard", reasons, [], "detected");
    if (input.systemRamGb >= 16 && maxNvidiaVramGb >= 8) return classResult("local-low", reasons, [], "detected");
    if (input.systemRamGb < 16) blockers.push("system-ram-below-16gb");
    if (maxNvidiaVramGb < 8) blockers.push("nvidia-vram-below-8gb");
  }
  return classResult("local-unsupported", reasons, blockers, blockers.length > 0 ? "partial" : "detected");
}

function classResult(value, reasons, blockers, confidence) {
  return {
    class: value,
    confidence,
    reasons: [...new Set(reasons)].sort(),
    blockers: [...new Set(blockers)].sort(),
  };
}

function normalizeGpus(rawGpus) {
  return rawGpus
    .map(gpu => ({
      vendor: normalizeVendor(gpu.vendor || gpu.model || ""),
      model: sanitizeLabel(gpu.model || gpu.name || ""),
      vramGb: gpu.vramGb ?? bytesToGb(gpu.vramBytes),
      integrated: Boolean(gpu.integrated),
      runtimeVerified: Boolean(gpu.runtimeVerified),
      source: sanitizeLabel(gpu.source || "fixture"),
    }))
    .filter(gpu => gpu.vendor || gpu.model);
}

function normalizeVendor(value) {
  const text = String(value || "");
  if (/nvidia/i.test(text)) return "NVIDIA";
  if (/apple/i.test(text)) return "Apple";
  if (/amd|advanced micro devices/i.test(text)) return "AMD";
  if (/intel/i.test(text)) return "Intel";
  return sanitizeLabel(text);
}

function commandVersion(command, commandArgs, timeoutMs) {
  return commandFromRun(runCommand(command, commandArgs, timeoutMs));
}

function commandPresence(command, commandArgs, timeoutMs, presentToken) {
  const result = runCommand(command, commandArgs, timeoutMs);
  if (!result.available) return commandFromRun(result);
  const present = result.stdout.trim() === presentToken;
  return {
    available: present,
    status: present ? "available" : "missing",
    version: "",
  };
}

function commandFromRun(result) {
  if (!result.available) {
    return {
      available: false,
      status: result.timedOut ? "timeout" : "missing",
      version: "",
    };
  }
  return {
    available: true,
    status: "available",
    version: firstLine(result.stdout),
  };
}

function commandStatus(value) {
  if (!value) return { available: false, status: "missing", version: "" };
  if (typeof value.available === "boolean") {
    return {
      available: value.available,
      status: value.status || (value.available ? "available" : "missing"),
      version: sanitizeLabel(value.version || ""),
    };
  }
  return { available: false, status: "missing", version: "" };
}

function endpointStatus(value) {
  if (!value) return { reachable: false, status: "not-probed" };
  if (value.probed === false || value.status === "not-probed") return { reachable: false, status: "not-probed" };
  if (value.status === "skipped-non-loopback") return { reachable: false, status: "skipped-non-loopback" };
  return {
    reachable: Boolean(value.reachable),
    status: value.reachable ? "reachable" : (value.status || "unreachable"),
    statusCode: positiveOrNull(value.statusCode),
  };
}

function runCommand(command, commandArgs, timeoutMs) {
  try {
    const stdout = execFileSync(command, commandArgs, {
      cwd: rootDir,
      encoding: "utf8",
      timeout: timeoutMs,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { available: true, stdout };
  } catch (error) {
    return {
      available: false,
      stdout: "",
      timedOut: error?.signal === "SIGTERM" || error?.code === "ETIMEDOUT",
    };
  }
}

function probeLoopbackEndpoint(rawUrl, timeoutMs) {
  if (!rawUrl) return { probed: false, status: "not-probed" };
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { reachable: false, status: "invalid-url" };
  }
  if (!isLoopbackHost(parsed.hostname)) {
    return { reachable: false, status: "skipped-non-loopback" };
  }
  const client = parsed.protocol === "https:" ? https : http;
  return new Promise(resolve => {
    const request = client.request(parsed, { method: "GET", timeout: timeoutMs }, response => {
      response.resume();
      response.on("end", () => {
        resolve({
          reachable: response.statusCode >= 200 && response.statusCode < 500,
          status: response.statusCode >= 200 && response.statusCode < 500 ? "reachable" : "unreachable",
          statusCode: response.statusCode,
        });
      });
    });
    request.on("timeout", () => {
      request.destroy();
      resolve({ reachable: false, status: "timeout" });
    });
    request.on("error", () => resolve({ reachable: false, status: "unreachable" }));
    request.end();
  });
}

function isLoopbackHost(hostname) {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(String(hostname || "").toLowerCase());
}

function osFamilyFromPlatform(platform) {
  if (platform === "darwin") return "macOS";
  if (platform === "linux") return "Linux";
  return "unsupported";
}

function parseMemoryTextToBytes(value) {
  const text = String(value || "").replace(",", ".").trim();
  const match = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB|GiB|MiB)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount)) return null;
  if (unit === "gb" || unit === "gib") return Math.round(amount * 1024 * 1024 * 1024);
  if (unit === "mb" || unit === "mib") return Math.round(amount * 1024 * 1024);
  return null;
}

function bytesToGb(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  return Math.round((bytes / 1024 / 1024 / 1024) * 10) / 10;
}

function maxNumber(values) {
  const finite = values.filter(value => Number.isFinite(Number(value)) && Number(value) > 0).map(Number);
  if (finite.length === 0) return null;
  return Math.max(...finite);
}

function positiveOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function firstLine(value) {
  return sanitizeLabel(String(value || "").split(/\r?\n/).find(Boolean) || "");
}

function sanitizeLabel(value) {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "[email]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function renderMarkdown(value) {
  const lines = [
    "# VLM PC Capability Report",
    "",
    `- schema: \`${value.schema}\``,
    `- targetStep: \`${value.targetStep}\``,
    `- source: \`${value.source}${value.fixtureCase ? `:${value.fixtureCase}` : ""}\``,
    `- os: \`${value.os.family} ${value.os.arch}\``,
    `- systemRamGb: \`${value.memory.systemRamGb ?? "unknown"}\``,
    `- appleSilicon: \`${value.apple.appleSilicon}\``,
    `- maxVramGb: \`${value.gpu.maxVramGb ?? "unknown"}\``,
    `- hardwareClassCandidate: \`${value.hardwareClassCandidate.class}\``,
    "",
    "## Runtime Probes",
    "",
    `- docker: \`${value.runtimes.docker.status}\``,
    `- ollama cli: \`${value.runtimes.ollama.cli.status}\``,
    `- ollama loopback: \`${value.runtimes.ollama.loopbackApi.status}\``,
    `- vLLM python module: \`${value.runtimes.vllm.pythonModule.status}\``,
    `- vLLM loopback: \`${value.runtimes.vllm.loopbackApi.status}\``,
    "",
    "## Non Scope",
    "",
    ...value.nonScope.map(item => `- ${item}`),
  ];
  return `${lines.join("\n")}\n`;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(rootDir, relativePath), "utf8"));
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
