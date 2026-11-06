"""Synthetic routing/guards only; actual artifact positive/negative is separate."""
import copy  # 파일 용도: 합성 입력으로 Search 결속의 분기·guard를 검사하며 실제 artifact 검증과 구분한다.
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
import recording_state_binding_search as s
from recording_state_requalification import validate_lineage

class Search(unittest.TestCase):
    def entry(self,env):
        p=Path(__file__).with_name('recording_state_input_profile.mjs').as_uri()
        return subprocess.run(['node','--input-type=module','-e',f'import {{EARLY_STATE_INPUT,requireStateInputExecutable}} from {json.dumps(p)};requireStateInputExecutable(EARLY_STATE_INPUT,{json.dumps(env)});'],capture_output=True,text=True)
    def test_explicit_selection(self):
        self.assertIn('search-explicit-selection-required',self.entry({'MEDIA_SERVER_STATE_SEARCH_BUNDLE':'/missing'}).stderr)
    def test_missing_evidence(self):
        self.assertIn('search-bundle-required',self.entry({'MEDIA_SERVER_STATE_CONTRACT':s.CONTRACT}).stderr)
    def test_unsupported_contract(self):
        self.assertIn('state-contract-version',self.entry({'MEDIA_SERVER_STATE_CONTRACT':'v2-recorder-search-99'}).stderr)
    def test_mixed_legacy_contracts(self):
        for key in ['MEDIA_SERVER_STATE_WRITER_REVIEW','MEDIA_SERVER_STATE_V2_BUNDLE','MEDIA_SERVER_STATE_RECORDER_BUNDLE']:
            with self.subTest(key=key):
                self.assertIn('search-contract-mixed',self.entry({'MEDIA_SERVER_STATE_CONTRACT':s.CONTRACT,key:'/missing'}).stderr)
    def test_search_cannot_enter_recorder(self):
        self.assertIn('search-explicit-selection-required',self.entry({'MEDIA_SERVER_STATE_CONTRACT':'v2-recorder-1','MEDIA_SERVER_STATE_SEARCH_BUNDLE':'/missing'}).stderr)
    def test_legacy_product_guard_retained(self):
        with patch('recording_state_requalification.git',return_value='changed'):
            with self.assertRaisesRegex(ValueError,'lineage-product-changed'):validate_lineage('/unused',{})
    def test_prior_recorder_anchor_cannot_be_replaced(self):
        with self.assertRaisesRegex(ValueError,'search-recorder-anchor'):
            s.validate_previous_recorder('/unused',{'sha256':'0'*64})
    def test_foreign_review_anchor(self):
        with self.assertRaisesRegex(ValueError,'recorder-trust-anchor'):
            s.anchored({'sha256':'0'*64},s.REVIEW_SHA)
    def test_new_contract_routes_shared_unchanged_gates(self):
        with patch.object(s,'_bind_current',return_value={}) as call,patch.object(s,'artifact',return_value={}):
            s.bind('/repo','/file','digest')
            self.assertEqual(call.call_args.args,('/repo','/file','digest',s.SCHEMA,s.CONTRACT,s.qualify))
    def data(self):
        rows={'src/synthetic%d.cpp'%i:'a'*64 for i in range(405)}
        rows[s.SOURCE]=s.SOURCE_SHA
        return rows,{'head':'b'*40,'sources':rows.copy()}
    def accepted_git(self,rows,changed=None):
        return ['\n'.join(rows), s.SOURCE if changed is None else changed]
    def test_exact_product_delta(self):
        rows,current=self.data()
        with patch.object(s,'git',side_effect=self.accepted_git(rows)):
            s.validate_product_delta('/repo',current,{'files':rows})
    def test_old_product_cannot_claim_search(self):
        rows,current=self.data();current['sources'][s.SOURCE]='da3a49ab04186c19f590b8b96ea362c7c2db6e865f5b35f623e0015061143627'
        with self.assertRaisesRegex(ValueError,'search-product-bytes'):
            s.validate_product_delta('/repo',current,{'files':rows})
    def test_publication_without_rebase_rejected(self):
        rows,current=self.data();current['sources'][s.SOURCE]='dc444a33886fde543cc6f06204724af54c75558e49a0d3e3068cfd2cbca08ecf'
        with self.assertRaisesRegex(ValueError,'search-product-bytes'):
            s.validate_product_delta('/repo',current,{'files':rows})
    def test_other_product_change_rejected(self):
        rows,current=self.data();current['sources']['src/synthetic0.cpp']='b'*64
        with self.assertRaisesRegex(ValueError,'search-product-bytes'):
            s.validate_product_delta('/repo',current,{'files':rows})
    def test_added_product_cannot_hide_outside_manifest(self):
        rows,current=self.data();current['sources']['include/new.h']='b'*64
        with self.assertRaisesRegex(ValueError,'search-product-bytes'):
            s.validate_product_delta('/repo',current,{'files':rows})
    def test_manifest_cannot_adopt_foreign_search_bytes(self):
        rows,current=self.data();rows[s.SOURCE]='b'*64;current['sources']=rows.copy()
        with self.assertRaisesRegex(ValueError,'search-reviewed-product-manifest'):
            s.validate_product_delta('/repo',current,{'files':rows})
    def test_product_set_cannot_shrink(self):
        rows,current=self.data()
        with patch.object(s,'git',return_value=s.SOURCE):
            with self.assertRaisesRegex(ValueError,'search-product-file-set'):
                s.validate_product_delta('/repo',current,{'files':rows})
    def test_no_search_delta_cannot_adopt_contract(self):
        rows,current=self.data()
        with patch.object(s,'git',side_effect=self.accepted_git(rows,'')):
            with self.assertRaisesRegex(ValueError,'search-delta-scope'):
                s.validate_product_delta('/repo',current,{'files':rows})
    def test_extra_diagnostic_delta_cannot_adopt_contract(self):
        rows,current=self.data()
        with patch.object(s,'git',side_effect=self.accepted_git(rows,s.SOURCE+'\ninclude/recording/recording_catalog.h')):
            with self.assertRaisesRegex(ValueError,'search-delta-scope'):
                s.validate_product_delta('/repo',current,{'files':rows})

class ProductBlobBatch(unittest.TestCase):
    def blob(self,data):
        oid=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest().encode()
        return oid+b' blob '+str(len(data)).encode()+b'\n'+data+b'\n'
    def test_binary_and_empty_blobs_keep_sha256(self):
        blobs=[b'\0\xff\nabc',b'']
        result=s.parse_product_blob_digests(b''.join(self.blob(x) for x in blobs),['a','b'])
        self.assertEqual(result,dict(zip(['a','b'],[hashlib.sha256(x).hexdigest() for x in blobs])))
    def test_missing_blob(self):
        with self.assertRaisesRegex(ValueError,'recorder-batch-header'):
            s.parse_product_blob_digests(self.blob(b'a'),['a','b'])
    def test_missing_git_object(self):
        with self.assertRaisesRegex(ValueError,'recorder-batch-header'):
            s.parse_product_blob_digests(b'BASE:missing missing\n',['a'])
    def test_non_blob_object(self):
        with self.assertRaisesRegex(ValueError,'recorder-batch-header'):
            s.parse_product_blob_digests(self.blob(b'a').replace(b' blob ',b' tree '),['a'])
    def test_wrong_size(self):
        with self.assertRaisesRegex(ValueError,'recorder-batch-size'):
            s.parse_product_blob_digests(self.blob(b'a').replace(b' blob 1',b' blob 10'),['a'])
    def test_wrong_object_id(self):
        raw=self.blob(b'a');raw=b'0'*40+raw[40:]
        with self.assertRaisesRegex(ValueError,'recorder-batch-object'):
            s.parse_product_blob_digests(raw,['a'])
    def test_missing_final_separator(self):
        with self.assertRaisesRegex(ValueError,'recorder-batch-size'):
            s.parse_product_blob_digests(self.blob(b'a')[:-1],['a'])
    def test_trailing_blob(self):
        with self.assertRaisesRegex(ValueError,'recorder-batch-trailing'):
            s.parse_product_blob_digests(self.blob(b'a')+self.blob(b'b'),['a'])
    def test_duplicate_name(self):
        with self.assertRaisesRegex(ValueError,'recorder-batch-duplicate'):
            s.parse_product_blob_digests(self.blob(b'a')+self.blob(b'a'),['a','a'])
    def test_request_is_exact_base_path_order(self):
        with patch.object(s.subprocess,'check_output',return_value=self.blob(b'a')+self.blob(b'b')) as call:
            s.product_blob_digests('/repo',{'src/b','src/a'})
            self.assertEqual(call.call_args.args,(['git','cat-file','--batch'],))
            self.assertEqual(call.call_args.kwargs,dict(cwd='/repo',input=(s.BASE+':src/a\n'+s.BASE+':src/b\n').encode()))
    def test_request_cannot_escape_or_inject(self):
        for name in ['/absolute','../outside','src/a\nsrc/b','src/a\0b']:
            with self.subTest(name=name),self.assertRaisesRegex(ValueError,'recorder-batch-path'):
                s.product_blob_digests('/repo',[name])

if __name__=='__main__':unittest.main(verbosity=2)
