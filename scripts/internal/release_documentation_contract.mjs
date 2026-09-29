// 파일 용도: 릴리즈 문서의 기계 판정 계약. 문장·제목·과거 PASS 기록을 요구하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import {hasDocumentLink} from './documentation_contract_lib.mjs';
import {parseServerDispatches} from './script_dispatch_parser.mjs';

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const isVersion = value => typeof value === 'string' && versionPattern.test(value);
const isTag = value => typeof value === 'string' && value.startsWith('v') && isVersion(value.slice(1));
const compareTags = (a,b) => {
  const x=a.slice(1).split('.').map(BigInt),y=b.slice(1).split('.').map(BigInt);
  for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]<y[i]?-1:1;
  return 0;
};

export function readReleaseContext(markdown) {
  const markers=[...markdown.matchAll(/<!--\s*release-metadata\s*-->/g)];
  if(markers.length!==1)throw new Error('release-metadata 블록은 정확히 하나여야 함');
  const tail=markdown.slice(markers[0].index+markers[0][0].length);
  const match=/^\s*```json\s*\r?\n([\s\S]*?)\r?\n```(?:\r?\n|$)/.exec(tail);
  if(!match)throw new Error('release-metadata JSON 블록 없음');
  return JSON.parse(match[1]);
}

export function validateReleaseContext(context, version) {
  const errors=[];
  if(!context || typeof context!=='object' || Array.isArray(context))return ['릴리즈 context 객체 없음'];
  if(context.schema!=='media-server.release-context.v1')errors.push('릴리즈 context schema 불일치');
  if(!isVersion(version))errors.push('VERSION은 정규 semantic version이어야 함');
  if(!isTag(context.releaseTarget) || context.releaseTarget!==`v${version}`)errors.push('source와 releaseTarget 불일치');
  if(!isTag(context.priorPublishedTag) || (isTag(context.releaseTarget)&&compareTags(context.priorPublishedTag,context.releaseTarget)>=0))errors.push('priorPublishedTag는 target 이전이어야 함');
  if(typeof context.repository!=='string'||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(context.repository))errors.push('GitHub repository 식별자 오류');
  if(context.distribution!=='source-only')errors.push('source-only 배포 계약 불일치');
  if(context.tagType!=='signed-annotated')errors.push('signed-annotated tag 계약 불일치');
  for(const key of ['releaseNotes','roadmap'])if(typeof context[key]!=='string'||!context[key])errors.push(`${key} 문서 경로 없음`);
  const p=context.published;
  if(!p || !isTag(p.tag))errors.push('기록된 published tag 없음');
  else {
    if(isTag(context.releaseTarget)&&compareTags(p.tag,context.releaseTarget)>0)errors.push('기록된 published tag가 target보다 큼');
    if(p.url!==`https://github.com/${context.repository}/releases/tag/${p.tag}`)errors.push('기록된 published URL 불일치');
    if(typeof p.observedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(p.observedAt)||Number.isNaN(Date.parse(p.observedAt)))errors.push('공개 상태 관측 시각 없음');
  }
  return errors;
}

// 기계 검사는 metadata·정책 진입점·명령 계약만 담당한다.
// 승인·수명·미실행의 자연어 의미와 실제 실행 증거는 별도 검토 대상이다.
export function validateReleasePolicyDocumentation({policy, versioning, version}) {
  const errors=[];
  try {errors.push(...validateReleaseContext(readReleaseContext(policy),version));}
  catch(error){errors.push(error.message);}
  for(const target of ['../AGENTS.md','versioning-policy.md','stream-verification.md','manual-ui-fulltest.md']) {
    if(!hasDocumentLink(policy,target))errors.push('release policy: 기준 링크 없음: '+target);
  }
  if(!hasDocumentLink(versioning,'release-policy.md'))errors.push('versioning: release-policy.md 링크 없음');
  for(const identifier of ['verify-release-metadata','--published','verify-release-closeout-helper',
    '--dry-run','--one-shot-dry-run','media-server.release-closeout-one-shot-gate.v1','manual-not-run']) {
    if(!policy.includes(identifier))errors.push('release policy: 명령/출력 계약 없음: '+identifier);
  }
  return errors;
}

export function validateReleaseCommandDispatch(server, commands) {
  const dispatches=parseServerDispatches(server),errors=[];
  const targets={
    'verify-release-metadata':'verify_release_metadata_consistency.mjs',
    'verify-docs-links':'verify_docs_links.mjs',
    'verify-docs-ui-assets':'verify_docs_ui_assets.mjs',
    'verify-ci-local-gate-parity':'verify_ci_local_gate_parity.mjs',
    'verify-release-closeout-helper':'verify_release_closeout_helper.mjs',
    'verify-v240-release-readiness-gate':'verify_v240_release_readiness_gate.mjs',
    'verify-v250-owner-release-readiness':'verify_v250_owner_release_readiness.mjs',
    'verify-v250-ops-events-semantic-search-ui':'verify_v250_ops_events_semantic_search_ui.mjs',
    'verify-feature-inventory-coverage':'verify_feature_inventory_coverage.mjs',
    'verify-manual-ui-evidence':'verify_manual_ui_evidence.mjs',
    'verify-release-evidence-index':'verify_release_evidence_index.mjs',
  };
  for(const command of commands){
    if(command==='git diff --check')continue;
    const name=command.split(' ')[0],matches=dispatches.filter(item=>item.command===name);
    if(!targets[name]||matches.length!==1||matches[0].script!==targets[name])errors.push('명령 dispatch 누락/중복/대상 불일치: '+command);
  }
  return errors;
}

function prose(markdown) {
  // 코드 예제나 HTML 주석을 실제 공개 설명·링크로 판정하지 않는다.
  return markdown.replace(/(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\2[ \t]*(?=\n|$)/g,'\n').replace(/<!--[\s\S]*?-->/g,'');
}

export function validateReadmeMetadata(markdown,version,context) {
  const text=prose(markdown), errors=[];
  const sources=[...text.matchAll(/(?:현재\s*소스\s*버전|Current\s+source\s+version)\s*[:：]\s*`?(\d+\.\d+\.\d+)/gi)].map(x=>x[1]);
  sources.push(...[...text.matchAll(/https:\/\/img\.shields\.io\/badge\/source-(\d+\.\d+\.\d+)-/g)].map(x=>x[1]));
  if(!sources.length||sources.some(x=>x!==version))errors.push('README source 버전 누락 또는 불일치');
  const targets=[...text.matchAll(/https:\/\/img\.shields\.io\/badge\/release(?:%20|_|-)target-(v\d+\.\d+\.\d+)-/g)].map(x=>x[1]);
  targets.push(...[...text.matchAll(/(?:현재\s*release\s*target|Current\s+release\s+target)\s*:\s*[`\[]?(v\d+\.\d+\.\d+)/gi)].map(x=>x[1]));
  if(targets.some(x=>x!==context.releaseTarget))errors.push('README release target 불일치');
  const published=[...text.matchAll(/(?:최신\s*공개(?:\s*GitHub\s*Release)?|Latest\s+published\s+GitHub\s+Release)\s*:\s*[`\[]?(v\d+\.\d+\.\d+)/gi)].map(x=>x[1]);
  if(published.some(x=>x!==context.published?.tag))errors.push('README 공개 완료 주장이 기록된 관측과 불일치');
  const urls=[...text.matchAll(/\]\(([^\s)]+)(?:\s+"[^"\n]*")?\)/g)].map(x=>x[1]);
  urls.push(...[...text.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)].map(x=>x[1]));
  if(!urls.includes(`https://github.com/${context.repository}/releases/latest`))errors.push('README 실제 Latest 조회 링크 없음');
  if(!urls.some(x=>['docs/README.md','./docs/README.md','docs/en/README.md','./docs/en/README.md'].includes(x.split('#')[0])))errors.push('README 목적별 문서 색인 링크 없음');
  return errors;
}

function readContainedDocument(root,relative) {
  if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..'))throw new Error('문서 경로 이탈');
  const base=fs.realpathSync(root),file=path.resolve(base,relative),real=fs.realpathSync(file);
  if(!real.startsWith(base+path.sep)||!fs.statSync(real).isFile())throw new Error('문서 symlink 경로 이탈 또는 파일 아님');
  const text=fs.readFileSync(real,'utf8');if(!text.trim())throw new Error('빈 문서');return text;
}

export function validateLocalReleaseDocuments(root,context,version) {
  const errors=[];
  try {
    const cmake=readContainedDocument(root,'CMakeLists.txt');
    const match=/project\s*\(\s*media_server\s+VERSION\s+(\d+\.\d+\.\d+)\s+LANGUAGES\s+CXX\s*\)/.exec(cmake);
    if(!match||match[1]!==version)errors.push('CMake project VERSION 불일치');
  }catch(error){errors.push(`CMake: ${error.message}`);}
  for(const file of ['README.md','README.en.md']) {
    try { errors.push(...validateReadmeMetadata(readContainedDocument(root,file),version,context).map(e=>`${file}: ${e}`)); }
    catch(error){errors.push(`${file}: ${error.message}`);}
  }
  for(const [label,file] of [['문서 색인','docs/README.md'],['releaseNotes',context.releaseNotes],['roadmap',context.roadmap]]) {
    try {readContainedDocument(root,file);}catch(error){errors.push(`${label}: ${error.message}`);}
  }
  return errors;
}
