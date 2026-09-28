// 파일 용도: B14 경로 정제와 비밀 거부·판정 불변 경계를 검사한다.
import assert from "node:assert/strict";
import test from "node:test";

import {
  findDeniedContent,
  publicTranscriptPath,
  sanitizeTranscript,
} from "./b14-evidence-sanitizer.mjs";

test("실제 기록의 slash 없는 temp root는 뒤 문구를 보존한다", () => {
  const root = ["", "private", "var", "folders", "xx", "generated", "T"].join("/");
  assert.equal(sanitizeTranscript(`\`${root}\`이다. PASS 42`).text, "`<owned-temp>`이다. PASS 42");
  assert.equal(sanitizeTranscript(`${root} -maxdepth 1`).text, "<owned-temp> -maxdepth 1");
});

test("중첩 JSON의 slash 없는 home 값은 뒤 필드까지 삼키지 않는다", () => {
  const home = ["", "Users", "generated-user"].join("/");
  const text = JSON.stringify({payload:JSON.stringify({home,other:"/",count:42,status:"FAIL"})});
  const result = JSON.parse(JSON.parse(sanitizeTranscript(text).text).payload);
  assert.deepEqual(result,{home:"<home>",other:"/",count:42,status:"FAIL"});
});

const 개인홈 = (사용자 = "release-user") => ["", "Users", 사용자, ""].join("/");
const 리눅스홈 = (사용자 = "runner") => ["", "home", 사용자, ""].join("/");
const 임시루트 = ["", "private", "var", "folders", "ab", "hashvalue", "T", ""].join("/");

test("home 경로만 정제하고 판정·수치·한글을 유지한다", () => {
  const 원문 = `PASS 42 2026-09-28T01:02:03Z ${개인홈()}작업 공간/결과.log\n` +
    `FAIL locator=17 ${리눅스홈()}증거/실패.txt`;
  const 결과 = sanitizeTranscript(원문, {});

  assert.equal(
    결과.text,
    "PASS 42 2026-09-28T01:02:03Z <home>/작업 공간/결과.log\n" +
      "FAIL locator=17 <home>/증거/실패.txt",
  );
  assert.deepEqual(결과.counts, {home: 2, temp: 0});
  assert.deepEqual(findDeniedContent(결과.text, {}), []);
});

test("JSON 값의 space·한글·escaped slash 경계를 깨지 않는다", () => {
  const 일반경로 = `${임시루트}작업 공간/결과 파일.log`;
  const escaped경로 = 일반경로.replaceAll("/", "\\/");
  const escaped홈 = `${개인홈()}한글 폴더/home file.txt`.replaceAll("/", "\\/");
  const 원문 = `{"plain":"${일반경로}","escaped":"${escaped경로}","home":"${escaped홈}","ok":true,"n":17}`;
  const 결과 = sanitizeTranscript(원문, {});

  assert.deepEqual(JSON.parse(결과.text), {
    plain: "<owned-temp>/작업 공간/결과 파일.log",
    escaped: "<owned-temp>/작업 공간/결과 파일.log",
    home: "<home>/한글 폴더/home file.txt",
    ok: true,
    n: 17,
  });
  assert.ok(결과.text.includes('"escaped":"<owned-temp>/작업 공간\\/결과 파일.log"'));
  assert.ok(결과.text.includes('"home":"<home>/한글 폴더\\/home file.txt"'));
  assert.deepEqual(결과.counts, {home: 1, temp: 2});
});

test("plain assertion 행에서 temp root 뒤 PASS·숫자를 유지한다", () => {
  const 원문 = `artifact=${임시루트}trace.log PASS count=31`;
  const 결과 = sanitizeTranscript(원문, {});

  assert.equal(결과.text, "artifact=<owned-temp>/trace.log PASS count=31");
  assert.deepEqual(결과.counts, {home: 0, temp: 1});
});

test("temp root 뒤 공백 path·route·판정 suffix를 문자 그대로 유지한다", () => {
  const tail = "공백 폴더/route/a PASS duration=15";
  const 원문 = `artifact=${임시루트.replace("/T/", "/C/")}${tail}`;
  const 결과 = sanitizeTranscript(원문, {});

  assert.equal(결과.text, `artifact=<owned-temp>/${tail}`);
  assert.deepEqual(결과.counts, {home: 0, temp: 1});
});

test("고정 mac temp root가 아닌 애매한 경로는 치환하지 않고 거부한다", () => {
  const 애매한경로 = ["", "private", "var", "folders", "ab", "hashvalue", "X", "file.log"].join("/");
  assert.throws(
    () => sanitizeTranscript(`artifact=${애매한경로}`, {}),
    (오류) => 오류?.code === "B14_SANITIZATION_INCOMPLETE" &&
      오류.message === "B14_SANITIZATION_INCOMPLETE",
  );
});

test("정제는 멱등이고 두 번째 실행의 치환 수는 0이다", () => {
  const 첫째 = sanitizeTranscript(`${개인홈()}a.log ${임시루트}b.log`, {});
  const 둘째 = sanitizeTranscript(첫째.text, {});

  assert.equal(둘째.text, 첫째.text);
  assert.deepEqual(둘째.counts, {home: 0, temp: 0});
});

test("policy secret pattern은 원문 없는 고정 코드로 거부한다", () => {
  const canary = ["s3", "cr3t", "-canary"].join("");
  const 패턴 = new RegExp(["s3", "cr3t", "-canary"].join(""), "u");

  assert.throws(
    () => sanitizeTranscript(`value=${canary}`, {secretPatterns: [패턴]}),
    (오류) => 오류?.code === "B14_SECRET_DETECTED" && 오류.message === "B14_SECRET_DETECTED",
  );
});

test("실제 policy의 id·pattern 형식을 지원하고 malformed policy는 고정 코드로 거부한다", () => {
  const canary = ["fixed", "-secret", "-12345678"].join("");
  const pattern = ["fixed", "-secret", "-[0-9]{8}"].join("");
  const policy = {secretPatterns: [{id: "fixture-secret", pattern}]};

  assert.deepEqual(findDeniedContent(`value=${canary}`, policy), ["B14_DENIED_SECRET_PATTERN"]);
  assert.throws(
    () => sanitizeTranscript(`value=${canary}`, policy),
    (오류) => 오류?.code === "B14_SECRET_DETECTED" && 오류.message === "B14_SECRET_DETECTED",
  );
  for (const secretPatterns of [
    [{pattern}],
    [{id: " ", pattern}],
    [{id: "fixture-secret", pattern: "["}],
    [""],
    [17],
  ]) {
    assert.throws(
      () => findDeniedContent("PASS", {secretPatterns}),
      (오류) => 오류?.code === "B14_INVALID_POLICY" && 오류.message === "B14_INVALID_POLICY",
    );
  }
});

test("고정 policy 밖 password·token·cookie 문자열은 임의 비밀로 단정하지 않는다", () => {
  const 키 = ["to", "ken"].join("");
  const 값 = ["can", "ary", "-", "value", "-123456"].join("");
  const 원문 =
    `PASS ${키}=${값} token start token end token consumed=미집계 ` +
    "cookie policy token=<redacted> password=none cookie=session_assertion";
  assert.equal(
    sanitizeTranscript(원문, {}).text,
    원문,
  );
  assert.deepEqual(findDeniedContent(원문, {}), []);
});

test("findDeniedContent는 원문 없이 고정 분류만 반환한다", () => {
  const canary = ["pw", "-", "value", "-123456"].join("");
  const 키 = ["pass", "word"].join("");
  assert.deepEqual(findDeniedContent(`${개인홈()}x ${임시루트}y ${키}: ${canary}`, {}), [
    "B14_DENIED_HOME_PATH",
    "B14_DENIED_TEMP_PATH",
  ]);
});

test("공개 transcript 경로는 원본 경로 hash로 결정되고 같은 디렉터리를 쓴다", () => {
  const source = "docs/release-artifacts/v4.1.0/s11-final-20260926/원본 기록.log";
  const 결과1 = publicTranscriptPath(source);
  const 결과2 = publicTranscriptPath(source);

  assert.equal(결과1, 결과2);
  assert.match(
    결과1,
    /^docs\/release-artifacts\/v4\.1\.0\/s11-final-20260926\/public-evidence-[0-9a-f]{16}\.txt$/u,
  );
});

test("공개 transcript source의 범위·확장자·모호한 경로를 거부한다", () => {
  const 잘못된경로 = [
    "/docs/release-artifacts/v4.1.0/a.log",
    "docs/release-artifacts/v4.1.0/../a.log",
    "docs/release-artifacts/v4.1.0//a.log",
    "docs\\release-artifacts\\v4.1.0\\a.log",
    "docs/release-artifacts/v4.1.0/a.json",
    "docs/release-artifacts/v4.0.0/a.log",
    "docs/release-artifacts/v4.1.0/a\0.log",
  ];

  for (const 경로 of 잘못된경로) {
    assert.throws(
      () => publicTranscriptPath(경로),
      (오류) => 오류?.code === "B14_INVALID_SOURCE_PATH" && 오류.message === "B14_INVALID_SOURCE_PATH",
    );
  }
});
