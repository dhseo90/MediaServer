// 파일 용도: Node 기반 내부 스크립트의 CLI 옵션 검증 공통 유틸리티.

export function hasHelpFlag(argv) {
  return argv.includes("-h") || argv.includes("--help");
}

export function assertKnownOptions(argv, allowedOptions, { allowPositionals = false } = {}) {
  const allowed = new Set(allowedOptions);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") {
      if (!allowPositionals && index < argv.length - 1) {
        failOption(`unexpected positional argument: ${argv[index + 1]}`);
      }
      break;
    }
    if (!token.startsWith("-")) {
      continue;
    }
    if (token === "-h") {
      if (!allowed.has("h") && !allowed.has("help")) {
        failOption("unknown option: -h");
      }
      continue;
    }
    if (!token.startsWith("--")) {
      failOption(`unknown option: ${token}`);
    }
    const name = token.slice(2).split("=", 1)[0];
    if (!allowed.has(name)) {
      failOption(`unknown option: --${name}`);
    }
  }
}

export function printUsageAndExit(text) {
  console.log(String(text).trimEnd());
  process.exit(0);
}

function failOption(message) {
  console.error(`[fail] ${message}`);
  console.error("       사용 가능한 옵션은 --help로 확인하세요.");
  process.exit(2);
}
