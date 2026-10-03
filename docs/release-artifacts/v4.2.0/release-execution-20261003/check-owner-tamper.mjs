import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parseFeatureRows} from '/Users/dhseo/Workspace/mediaServer/scripts/internal/feature_implementation_manifest_lib.mjs';
import {parseVerifiedReview4Dispatch,validateReview4ApprovalEnvelope,validateReview4TrustBindings,sha256} from '/Users/dhseo/Workspace/mediaServer/scripts/internal/feature_semantic_review4_trust_lib.mjs';
const root='/Users/dhseo/Workspace/mediaServer';
const audit=JSON.parse(fs.readFileSync(root+'/test/fixtures/v390_review4_feature_semantic_source_audit.json'));
const approvals=JSON.parse(fs.readFileSync(root+'/test/fixtures/v390_review4_feature_semantic_source_approvals.json'));
const rows=parseFeatureRows(fs.readFileSync(root+'/docs/project-feature-test-inventory.md','utf8'));
const item=audit.items.find(x=>x.id==='OPS-174');
const dispatch=parseVerifiedReview4Dispatch(root);
const temp=fs.mkdtempSync('/tmp/v420-owner-negative-');
try {
 for(const file of new Set([...Object.values(item.roles).map(x=>x.file),item.verifier.file])) {
  fs.mkdirSync(path.dirname(path.join(temp,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(temp,file));
 }
 assert.deepEqual(validateReview4TrustBindings(temp,item,dispatch),[]);
 const file=item.trustBindings.roles.owner.file;
 const source=fs.readFileSync(path.join(temp,file),'utf8');
 const changed=source.replace('OpsV390StagingRestoreValidationHandoffJson(', 'ChangedRestoreValidationHandoffJson(');
 assert.notEqual(changed,source);fs.writeFileSync(path.join(temp,file),changed);
 item.trustBindings.roles.owner.trackedBlobSha256=sha256(changed);
 assert.deepEqual(validateReview4ApprovalEnvelope({audit,approvals,rows,orderedIds:rows.map(x=>x.id)}),[]);
 const errors=validateReview4TrustBindings(temp,item,dispatch);
 assert(errors.length>0);console.log(JSON.stringify({baseline:'PASS',blobOnlyEnvelope:'accepted-as-expected',currentBodyTamper:'REJECTED',errors}));
} finally {fs.rmSync(temp,{recursive:true});assert(!fs.existsSync(temp));console.log('owned negative fixture cleanup: PASS');}
