import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
// 파일 용도: 현행 구조 소비자가 공유하는 exact 소유·파일 연결 판정. 정책을 생성하거나 확장하지 않는다.
export function fileDependencyAllowed(policyValue, source, target, from, to) {
  return (policyValue.allowedDependencyDirections || []).includes(`${from} -> ${to}`) ||
    (policyValue.allowedFileDependencies || []).some(item => item.source === source && item.target === target &&
      item.from === from && item.to === to);
}

export function validateFileDependencyPolicy(policyValue, ownership) {
  const errors = [], seen = new Set();
  const owners = new Set(policyValue.ownerIds || []);
  const byFile = new Map(ownership.map(item => [item.file, item.owner]));
  const exactPath = value => typeof value === "string" && /^(include|src)\/[a-zA-Z0-9_./-]+\.(h|cpp)$/.test(value) &&
    !value.split('/').some(part => part === '.' || part === '..' || part === '');
  for (const item of policyValue.allowedFileDependencies || []) {
    const key = `${item.source} -> ${item.target}`;
    if (!exactPath(item.source) || !exactPath(item.target) || !owners.has(item.from) || !owners.has(item.to) ||
        item.from === item.to || typeof item.reason !== "string" || !item.reason.trim()) errors.push(`policy:invalid-file-dependency:${key}`);
    if (seen.has(key)) errors.push(`policy:duplicate-file-dependency:${key}`);
    seen.add(key);
    if (byFile.get(item.source) !== item.from || byFile.get(item.target) !== item.to) errors.push(`policy:file-owner-mismatch:${key}`);
  }
  return errors;
}

export function classifyModule(file, classifiers) {
  const exact = classifiers.flatMap(item => (item.exactFiles || []).filter(value => value === file).map(() => item));
  if (exact.length > 1) throw new Error(`ambiguous exact production owner: ${file}`);
  const matches = classifiers.filter(item => (item.exactFiles || []).includes(file) ||
    (item.prefixes || []).some(prefix => file.startsWith(prefix)));
  if (!matches.length) throw new Error(`unclassified production file: ${file}`);
  // 기존 exact-before-fallback 순서를 보존하고 이를 가리는 prefix/중복 소유는 거부한다.
  if (exact.length ? matches[0] !== exact[0] : matches.length > 1)
    throw new Error(`ambiguous production owner: ${file}`);
  return matches[0].id;
}

// execution의 관측·CMake·결속 판정을 공유한다. 호출마다 해당 root를 다시 읽는다.
export function createCurrentGraphInspector(rootDir) {
const readText = file => fs.readFileSync(path.join(rootDir, file), 'utf8');
const sha256Text = value => crypto.createHash('sha256').update(value).digest('hex');
const sha256File = file => sha256Text(fs.readFileSync(path.join(rootDir, file)));
const lineCount = file => readText(file).split(/\r?\n/).length - 1;
const stripAllowedFlags = edges => edges.map(({allowedByTarget: _allowed, ...edge}) => edge);
function collectCurrentGraph(value, architecturePolicy) {
  const productionFiles = value.productionRoots
    .flatMap(root => walkFiles(path.join(rootDir, root)))
    .map(file => path.relative(rootDir, file).replaceAll(path.sep, "/"))
    .filter(file => value.sourceExtensions.some(extension => file.endsWith(extension)))
    .sort();
  const productionSet = new Set(productionFiles);
  const ownership = productionFiles.map(file => ({ file, owner: classifyModule(file, value.moduleClassifiers) }));
  const ownerByFile = new Map(ownership.map(item => [item.file, item.owner]));
  const grouped = new Map();
  const forbiddenFileDependencies = [];
  for (const source of productionFiles) {
    for (const match of readText(source).matchAll(/^\s*#\s*include\s*["<]([^">]+)[">]/gm)) {
      const include = match[1];
      const candidates = [
        path.posix.join(path.posix.dirname(source), include),
        `include/${include}`,
        `src/${include}`,
      ].map(candidate => path.posix.normalize(candidate));
      const resolved = candidates.find(candidate => productionSet.has(candidate));
      if (!resolved) continue;
      const from = ownerByFile.get(source);
      const to = ownerByFile.get(resolved);
      if (from === to) continue;
      if (!fileDependencyAllowed(architecturePolicy, source, resolved, from, to))
        forbiddenFileDependencies.push(`${source} -> ${resolved}`);
      const direction = `${from} -> ${to}`;
      if (!grouped.has(direction)) grouped.set(direction, []);
      grouped.get(direction).push(`${source} -> ${resolved}`);
    }
  }
  const observedModuleEdges = [...grouped.entries()].sort(([lhs], [rhs]) => lhs.localeCompare(rhs))
    .map(([direction, witnesses]) => {
      const sorted = [...witnesses].sort();
      return {
        direction,
        witnessCount: sorted.length,
        witnessSha256: sha256Text(sorted.join("\n")),
        // 방향이 같아도 미승인 파일 연결이 하나라도 섞이면 허용하지 않는다.
        allowedByTarget: sorted.every(witness => {
          const [source, target] = witness.split(" -> ");
          const [from, to] = direction.split(" -> ");
          return fileDependencyAllowed(architecturePolicy, source, target, from, to);
        }),
      };
    });
  const moduleEdges = observedModuleEdges.map(item => {
    const [from, to] = item.direction.split(" -> ");
    return { from, to };
  });
  const cmake = parseCmakeBuildGraph(
    readText(value.cmake.file), productionFiles, value.moduleClassifiers, architecturePolicy.cmakePolicy,
  );
  return {
    productionFiles,
    ownership,
    cppFiles: productionFiles.filter(file => file.endsWith(".cpp")),
    ownershipSha256: sha256Text(ownership.map(item => `${item.file}\t${item.owner}`).join("\n")),
    observedModuleEdges,
    forbiddenFileDependencies: forbiddenFileDependencies.sort(),
    stronglyConnectedComponents: findCycleComponents(value.moduleClassifiers.map(item => item.id), moduleEdges),
    cmake,
  };
}

function parseCmakeBuildGraph(textValue, productionFiles, classifiers, cmakePolicy) {
  const productionCpp = new Set(productionFiles.filter(file => file.endsWith(".cpp")));
  const definitions = new Map();
  const occurrences = new Map([...productionCpp].map(source => [source, []]));
  const unknownSources = [];
  for (const call of cmakeCalls(textValue, ["add_executable", "add_library", "target_sources"])) {
    const tokens = call.body.match(/"[^"]*"|[^\s]+/g)?.map(token => token.replace(/^"|"$/g, "")) || [];
    if (tokens.length === 0) continue;
    const targetId = tokens[0];
    if (call.name !== "target_sources" && !definitions.has(targetId)) {
      definitions.set(targetId, {
        id: targetId,
        type: call.name === "add_executable" ? "executable" : "library",
        productionSources: [],
      });
    }
    const target = definitions.get(targetId);
    if (!target) continue;
    for (const token of tokens.slice(1)) {
      if (!/^src\/[A-Za-z0-9_./-]+\.cpp$/.test(token)) continue;
      if (!productionCpp.has(token)) {
        unknownSources.push(`${targetId}:${token}`);
        continue;
      }
      target.productionSources.push(token);
      occurrences.get(token).push(targetId);
    }
  }
  const targets = [...definitions.values()].filter(target => target.productionSources.length > 0)
    .map(target => ({
      ...target,
      moduleOwners: [...new Set(target.productionSources.map(source => classifyModule(source, classifiers)))],
    }));
  const productionSources = targets.flatMap(target => target.productionSources);
  const duplicateSources = [...occurrences.entries()]
    .filter(([, targetIds]) => targetIds.length > 1)
    .map(([source, targetIds]) => `${source}:${targetIds.join(",")}`);
  const missingSources = [...occurrences.entries()]
    .filter(([, targetIds]) => targetIds.length === 0)
    .map(([source]) => source);
  const internalLibraryTargets = targets.filter(target => target.type === "library");
  return {
    targetIds: targets.map(target => target.id),
    targets,
    productionSources,
    duplicateSources,
    missingSources,
    unknownSources,
    internalLibraryTargetIds: internalLibraryTargets.map(target => target.id),
    internalTargetSeparation:
      targets.length >= cmakePolicy.finalSeparation.minimumProductionTargets &&
      internalLibraryTargets.length >= cmakePolicy.finalSeparation.minimumInternalLibraryTargets &&
      duplicateSources.length === 0 && missingSources.length === 0 && unknownSources.length === 0,
  };
}

function cmakeCalls(textValue, names) {
  const calls = [];
  const pattern = new RegExp(`\\b(${names.join("|")})\\s*\\(`, "g");
  for (const match of textValue.matchAll(pattern)) {
    let depth = 1;
    let cursor = match.index + match[0].length;
    let quote = false;
    for (; cursor < textValue.length && depth > 0; cursor += 1) {
      const character = textValue[cursor];
      if (character === '"' && textValue[cursor - 1] !== "\\") quote = !quote;
      if (quote) continue;
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
    }
    if (depth !== 0) throw new Error(`unterminated CMake command: ${match[1]}`);
    calls.push({
      name: match[1],
      body: textValue.slice(match.index + match[0].length, cursor - 1).replace(/#[^\n]*/g, " "),
    });
  }
  return calls;
}

function validateCurrentGraphBinding(ledgerValue, graphValue, policyValue) {
  const errors = [];
  const actual = collectCurrentGraph(graphValue, policyValue);
  const serializedSha256 = sha256Text(`${JSON.stringify(graphValue, null, 2)}\n`);
  if (ledgerValue.currentGraph?.sha256 !== serializedSha256) errors.push("current:hash");
  if (actual.productionFiles.length !== graphValue.expectedProductionFiles ||
      actual.cppFiles.length !== graphValue.expectedCppFiles ||
      actual.ownershipSha256 !== graphValue.expectedFileOwnershipSha256) errors.push("current:owner-inventory");
  for (const classifier of graphValue.moduleClassifiers || []) {
    const owned = actual.ownership.filter(item => item.owner === classifier.id);
    if (classifier.expectedFileCount !== owned.length ||
        classifier.expectedCppCount !== owned.filter(item => item.file.endsWith(".cpp")).length) {
      errors.push(`current:owner:${classifier.id}`);
    }
  }
  if (JSON.stringify(stripAllowedFlags(actual.observedModuleEdges)) !==
      JSON.stringify(stripAllowedFlags(graphValue.observedModuleEdges || []))) errors.push("current:include-edge");
  if (JSON.stringify(actual.stronglyConnectedComponents) !==
      JSON.stringify(graphValue.stronglyConnectedComponents || [])) errors.push("current:SCC");
  if (JSON.stringify(actual.cmake.targetIds) !==
      JSON.stringify((graphValue.cmake?.targets || []).map(item => item.id))) errors.push("current:target-set");
  for (const target of graphValue.cmake?.targets || []) {
    const actualTarget = actual.cmake.targets.find(item => item.id === target.id);
    if (!actualTarget || target.declaredSourceCount !== target.productionSources.length ||
        JSON.stringify(target.productionSources) !== JSON.stringify(actualTarget.productionSources) ||
        target.productionSourceSha256 !== sha256Text(target.productionSources.join("\n"))) {
      errors.push(`current:target:${target.id}`);
    }
  }
  errors.push(...validateGraphPolicy(graphValue, policyValue, actual));
  if (JSON.stringify(graphMetrics(graphValue, actual)) !== JSON.stringify(ledgerValue.currentGraph?.metrics)) {
    errors.push("current:metrics");
  }
  return [...new Set(errors)];
}

function validateGraphPolicy(graphValue, policyValue, actual) {
  const errors = [];
  errors.push(...validateFileDependencyPolicy(policyValue, actual.ownership));
  for (const binding of policyValue.immutableHistoricalBindings || []) {
    if (sha256File(binding.path) !== binding.sha256) errors.push(`policy:historical-binding-drift:${binding.path}`);
  }
  const ownerIds = new Set(policyValue.ownerIds || []);
  const directions = policyValue.allowedDependencyDirections || [];
  if (new Set(directions).size !== directions.length) errors.push("policy:duplicate-allowed-direction");
  for (const direction of directions) {
    const [from, to, ...rest] = direction.split(" -> ");
    if (rest.length > 0 || !ownerIds.has(from) || !ownerIds.has(to) || from === to) {
      errors.push(`policy:invalid-allowed-direction:${direction}`);
    }
  }
  const expectedAllowed = new Set(directions);
  for (const exception of policyValue.temporaryDebtExceptions || []) {
    if (expectedAllowed.has(exception.direction) || exception.countsAsTargetViolation !== true) {
      errors.push(`policy:temporary-debt-hidden:${exception.direction}`);
    }
  }
  for (const edge of graphValue.observedModuleEdges || []) {
    const observed = actual.observedModuleEdges.find(item => item.direction === edge.direction);
    // 저장 graph의 exact 허용은 실제 include 증거와 결속해 확인한다.
    if (!observed || observed.witnessCount !== edge.witnessCount || observed.witnessSha256 !== edge.witnessSha256) {
      errors.push(`policy:stored-witness-drift:${edge.direction}`);
    } else if (edge.allowedByTarget !== observed.allowedByTarget) {
      errors.push(`policy:stored-allowed-direction-drift:${edge.direction}`);
    }
  }
  const debtByFile = new Map((graphValue.mixedOwnershipDebt || []).map(item => [item.file, item]));
  if (debtByFile.size !== (graphValue.mixedOwnershipDebt || []).length) errors.push("debt:duplicate-entry");
  for (const required of policyValue.mixedOwnershipTracking?.requiredEntries || []) {
    const debt = debtByFile.get(required.file);
    if (!debt) {
      errors.push(`debt:required-entry-missing:${required.file}`);
      continue;
    }
    if (debt.primaryOwner !== required.primaryOwner ||
        JSON.stringify(debt.embeddedResponsibilities) !== JSON.stringify(required.requiredEmbeddedResponsibilities)) {
      errors.push(`debt:required-entry-boundary-drift:${required.file}`);
    }
  }
  for (const debt of graphValue.mixedOwnershipDebt || []) {
    if (!fs.existsSync(path.join(rootDir, debt.file))) errors.push(`debt:tracked-file-missing:${debt.file}`);
    else if (lineCount(debt.file) !== debt.lineCount) errors.push(`debt:line-count-drift:${debt.file}`);
  }
  if (actual.cmake.duplicateSources.length > 0) {
    errors.push(`cmake:duplicate-production-source:${actual.cmake.duplicateSources.join(",")}`);
  }
  if (actual.cmake.missingSources.length > 0) {
    errors.push(`cmake:missing-production-source:${actual.cmake.missingSources.join(",")}`);
  }
  if (actual.cmake.unknownSources.length > 0) {
    errors.push(`cmake:unknown-production-source:${actual.cmake.unknownSources.join(",")}`);
  }
  for (const target of actual.cmake.targets) {
    const stored = graphValue.cmake.targets.find(item => item.id === target.id);
    if (!stored || JSON.stringify(stored.productionSources) !== JSON.stringify(target.productionSources) ||
        stored.productionSourceSha256 !== sha256Text(target.productionSources.join("\n"))) {
      errors.push(`cmake:stored-target-source-drift:${target.id}`);
    }
  }
  if (graphValue.cmake.internalTargetSeparation !== actual.cmake.internalTargetSeparation) {
    errors.push("cmake:stored-target-separation-drift");
  }
  return errors;
}

// 기존 방향 정책에 exact 파일 연결만 추가한다. prefix/glob/역방향 추론은 없다.

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function findCycleComponents(nodes, edges) {
  const adjacency = new Map(nodes.map(node => [node, []]));
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge.to);
  }
  let index = 0;
  const stack = [];
  const indices = new Map();
  const low = new Map();
  const onStack = new Set();
  const components = [];
  function visit(node) {
    indices.set(node, index);
    low.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of adjacency.get(node) || []) {
      if (!indices.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node), indices.get(next)));
      }
    }
    if (low.get(node) !== indices.get(node)) return;
    const component = [];
    while (stack.length > 0) {
      const member = stack.pop();
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    if (component.length > 1) components.push(component.sort());
  }
  for (const node of nodes) if (!indices.has(node)) visit(node);
  return components.sort((lhs, rhs) => lhs.join("\0").localeCompare(rhs.join("\0")));
}

function graphMetrics(value, actual) {
  const violations = actual.observedModuleEdges.filter(item => item.allowedByTarget === false).length;
  const largestScc = Math.max(0, ...actual.stronglyConnectedComponents.map(item => item.length));
  const largestMixed = Math.max(0, ...value.mixedOwnershipDebt.map(item => item.lineCount));
  return {
    productionFiles: value.expectedProductionFiles,
    cppSources: value.expectedCppFiles,
    moduleOwners: value.moduleClassifiers.length,
    cmakeTargets: actual.cmake.targets.length,
    targetViolationDirections: violations,
    largestSccOwners: largestScc,
    largestMixedOwnerFileLines: largestMixed,
    internalTargetSeparation: actual.cmake.internalTargetSeparation,
  };
}

function finalTargetsSatisfied(targets, metrics) {
  return metrics.targetViolationDirections <= targets.maxTargetViolationDirections &&
    metrics.largestSccOwners <= targets.maxSccOwners &&
    metrics.largestMixedOwnerFileLines <= targets.maxMixedOwnerFileLines &&
    (!targets.requireSeparatedInternalTargets || metrics.internalTargetSeparation === true);
}
return {collectCurrentGraph, parseCmakeBuildGraph, validateCurrentGraphBinding, validateGraphPolicy,
  findCycleComponents, graphMetrics, finalTargetsSatisfied};
}

// 현행 graph를 실제 소스와 대조한다. 과거 snapshot/실행 PASS 승계가 아니다.
export function validateCurrentSourceGraph(rootDir, graphOverride) {
  const readJson = file => JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf8'));
  const ledger = readJson('test/fixtures/v390_structure_stabilization_execution.json');
  const graph = graphOverride ?? readJson(ledger.currentGraph.path);
  const policy = readJson(ledger.currentArchitecturePolicy.path);
  const inspector = createCurrentGraphInspector(rootDir);
  const errors = inspector.validateCurrentGraphBinding(ledger, graph, policy);
  const policyHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(rootDir, ledger.currentArchitecturePolicy.path))).digest('hex');
  if (policyHash !== ledger.currentArchitecturePolicy.sha256) errors.push('current:policy-hash');
  if (JSON.stringify(policy.ownerIds) !== JSON.stringify(graph.moduleClassifiers.map(item => item.id))) errors.push('current:policy-owners');
  const actual = inspector.collectCurrentGraph(graph, policy);
  const thresholds = policy.finalThresholds;
  if (!inspector.finalTargetsSatisfied({...thresholds, requireSeparatedInternalTargets: thresholds.requireActualCmakeInternalTargetSeparation}, inspector.graphMetrics(graph, actual)))
    errors.push('current:final-targets:' + actual.forbiddenFileDependencies.join('; '));
  return {graph, actual, errors: [...new Set(errors)]};
}

export function assertBoundaryOwners(graph, expected) {
  for (const [file, owner] of expected) {
    if (classifyModule(file, graph.moduleClassifiers) !== owner)
      throw new Error(`boundary:owner:${file}:${owner}`);
  }
}

export function assertCurrentSourceGraph(rootDir, graphOverride) {
  const result = validateCurrentSourceGraph(rootDir, graphOverride);
  if (result.errors.length) throw new Error(result.errors.join('; '));
  return result.graph;
}

// 격리 mutation용 소스·정책 입력. 실행 기록이나 Git 이력을 복원하지 않는다.
export function copyCurrentGraphInputs(sourceRoot, targetRoot) {
  const ledgerPath = 'test/fixtures/v390_structure_stabilization_execution.json';
  const ledger = JSON.parse(fs.readFileSync(path.join(sourceRoot, ledgerPath), 'utf8'));
  const policy = JSON.parse(fs.readFileSync(path.join(sourceRoot, ledger.currentArchitecturePolicy.path), 'utf8'));
  for (const file of ['include', 'src', 'CMakeLists.txt', ledgerPath, ledger.currentGraph.path,
    ledger.currentArchitecturePolicy.path, ...policy.immutableHistoricalBindings.map(item => item.path)]) {
    fs.mkdirSync(path.dirname(path.join(targetRoot, file)), {recursive: true});
    fs.cpSync(path.join(sourceRoot, file), path.join(targetRoot, file), {recursive: true});
  }
}
