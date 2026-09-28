#!/usr/bin/env node
// 파일 용도: finalizer PNG 중복 정리의 소유 경계·참조·삭제 안전성을 실제 임시 파일로 검증한다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { deduplicateFinalizerScreenshots, scanArtifactTree } from "./evidence_integrity_lib.mjs";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9sAAAAASUVORK5CYII=", "base64");
let pass = 0, fail = 0;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function assert(value, reason) { if (!value) throw new Error(reason); }
function check(name, body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "finalizer-dedup-"));
  const write = (relative, bytes = png) => {
    const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); return file;
  };
  const probe = (id, bytes = png) => ({ id, screenshotPath: write(`suite-finalizer/visual-matrix/${id}.png`, bytes) });
  try { body({ root, write, probe }); pass++; console.log(`[pass] ${name}`); }
  catch (error) { fail++; console.log(`[fail] ${name}: ${error.message}`); }
  finally {
    let bytes = 0;
    const count = dir => { for (const name of fs.readdirSync(dir)) { const file = path.join(dir, name), stat = fs.lstatSync(file); if (stat.isDirectory()) count(file); else bytes += stat.size; } };
    count(root); fs.rmSync(root, { recursive: true });
    console.log(`[cleanup] ${root} bytes=${bytes} absent=${!fs.existsSync(root)}`);
  }
}
// FD01~07은 실행 전 중앙 사전등록과 대응한다. FD08은 실제 child subprocess 검사에 있다.
check("FD01 case canonical survives unchanged and finalizer duplicate is removed", ({ root, write, probe }) => {
  const canonical = write("cases/001-UI-001/screenshots/case.png");
  const summary = write("cases/001-UI-001/summary.json", "immutable-summary");
  const p = probe("one"), old = p.screenshotPath;
  deduplicateFinalizerScreenshots([p], root);
  assert(p.screenshotPath === canonical && !fs.existsSync(old) && hash(fs.readFileSync(canonical)) === hash(png) &&
    fs.readFileSync(summary, "utf8") === "immutable-summary", "case canonical mutation or missing remap");
});
check("FD02 three independent finalizer captures retain one nondangling canonical", ({ root, probe }) => {
  const probes = [probe("one"), probe("two"), probe("three")], first = probes[0].screenshotPath;
  deduplicateFinalizerScreenshots(probes, root);
  assert(probes.every(p => p.screenshotPath === first && fs.existsSync(p.screenshotPath)) && scanArtifactTree(root).duplicateScreenshotFiles === 0, "dangling finalizer reference");
});
check("FD03 distinct captures remain distinct", ({ root, probe }) => {
  const probes = [probe("one"), probe("two", Buffer.concat([png, Buffer.from("distinct")]))];
  deduplicateFinalizerScreenshots(probes, root);
  assert(probes.every(p => fs.existsSync(p.screenshotPath) && !p.screenshotEvidence.deduplicated), "distinct PNG deleted");
});
for (const kind of ["outside", "escape", "symlink", "ancestor", "missing", "directory", "non-png"]) {
  check(`FD04-06 ${kind} input fails before any earlier duplicate mutation`, ({ root, write, probe }) => {
    write("cases/001/screenshots/case.png");
    const first = probe("first"), original = first.screenshotPath;
    let invalid;
    if (kind === "outside") invalid = write("unowned.png");
    if (kind === "escape") invalid = path.join(root, "..", "outside-owned.png");
    if (kind === "non-png") invalid = write("suite-finalizer/visual-matrix/not-png.json");
    if (kind === "symlink") { invalid = path.join(root, "suite-finalizer/visual-matrix/link.png"); fs.symlinkSync(original, invalid); }
    if (kind === "ancestor") { const dir = path.join(root, "suite-finalizer/visual-matrix/link"); fs.symlinkSync(path.dirname(original), dir); invalid = path.join(dir, "first.png"); }
    if (kind === "missing") invalid = path.join(root, "suite-finalizer/visual-matrix/missing.png");
    if (kind === "directory") { invalid = path.join(root, "suite-finalizer/visual-matrix/directory.png"); fs.mkdirSync(invalid); }
    let rejected = false; try { deduplicateFinalizerScreenshots([first, { id: "bad", screenshotPath: invalid }], root); } catch { rejected = true; }
    assert(rejected && first.screenshotPath === original && !first.screenshotEvidence && fs.existsSync(original), "invalid batch partially mutated");
  });
}
check("FD07 remapped evidence digest matches retained files and whole tree duplicate zero", ({ root, write, probe }) => {
  write("cases/001/screenshots/case.png"); const probes = [probe("one"), probe("two")];
  deduplicateFinalizerScreenshots(probes, root);
  assert(scanArtifactTree(root).duplicateScreenshotFiles === 0 && probes.every(p => p.screenshotEvidence.canonicalPath === p.screenshotPath && p.screenshotEvidence.sha256 === hash(fs.readFileSync(p.screenshotPath))), "remapped evidence inconsistency");
});
check("FD05 owned root symlink is rejected without mutation", ({ root, probe }) => {
  const p = probe("one"), original = p.screenshotPath;
  const link = path.join(root, "owned-link"); fs.symlinkSync(root, link);
  p.screenshotPath = path.join(link, "suite-finalizer/visual-matrix/one.png");
  const linkedPath = p.screenshotPath;
  let rejected = false; try { deduplicateFinalizerScreenshots([p], link); } catch { rejected = true; }
  assert(rejected && p.screenshotPath === linkedPath && fs.readFileSync(original).equals(png), "symlink owned root accepted");
});
check("FD04 external-owned-root PNG is rejected and external bytes preserved", ({ root, probe }) => {
  const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "finalizer-external-"));
  const external = path.join(externalRoot, "outside.png");
  try {
    fs.writeFileSync(external, png);
    const first = probe("one"), original = first.screenshotPath;
    let rejected = false; try { deduplicateFinalizerScreenshots([first, { id: "outside", screenshotPath: external }], root); } catch { rejected = true; }
    assert(rejected && first.screenshotPath === original && !first.screenshotEvidence &&
      fs.readFileSync(original).equals(png) && fs.readFileSync(external).equals(png), "external file changed or accepted");
  } finally {
    const bytes = fs.lstatSync(external).size; fs.rmSync(externalRoot, { recursive: true });
    console.log(`[cleanup] ${externalRoot} bytes=${bytes} absent=${!fs.existsSync(externalRoot)}`);
  }
});
console.log(`[summary] pass=${pass} fail=${fail}`);
if (fail) process.exitCode = 1;
