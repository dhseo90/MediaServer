"""Synthetic routing/guard tests; actual positive/negative use final product artifacts."""
import json,subprocess,unittest  # 파일 용도: 합성 입력으로 Recorder 결속의 분기와 거부 조건을 검사하며 실제 제품 적격성은 대체하지 않는다.
from pathlib import Path
from unittest.mock import patch
import recording_state_binding_recorder as r
from recording_state_requalification import validate_lineage
class Recorder(unittest.TestCase):
    def entry(self,env):
        p=Path(__file__).with_name('recording_state_input_profile.mjs').as_uri()
        return subprocess.run(['node','--input-type=module','-e',f'import {{EARLY_STATE_INPUT,requireStateInputExecutable}} from {json.dumps(p)};requireStateInputExecutable(EARLY_STATE_INPUT,{json.dumps(env)});'],capture_output=True,text=True)
    def test_explicit_selection(self):
        self.assertIn('recorder-explicit-selection-required',self.entry({'MEDIA_SERVER_STATE_RECORDER_BUNDLE':'/missing'}).stderr)
    def test_recorder_missing_evidence(self):
        self.assertIn('recorder-bundle-required',self.entry({'MEDIA_SERVER_STATE_CONTRACT':r.CONTRACT}).stderr)
    def test_v2_mixed(self):
        self.assertIn('recorder-contract-mixed',self.entry({'MEDIA_SERVER_STATE_CONTRACT':r.CONTRACT,'MEDIA_SERVER_STATE_V2_BUNDLE':'/missing'}).stderr)
    def test_v1_mixed(self):
        self.assertIn('recorder-contract-mixed',self.entry({'MEDIA_SERVER_STATE_CONTRACT':r.CONTRACT,'MEDIA_SERVER_STATE_WRITER_REVIEW':'/missing'}).stderr)
    def test_legacy_product_guard_retained(self):
        with patch('recording_state_requalification.git',return_value='changed'):
            with self.assertRaisesRegex(ValueError,'lineage-product-changed'):validate_lineage('/unused',{})
    def test_foreign_anchor(self):
        with self.assertRaisesRegex(ValueError,'recorder-trust-anchor'):r.anchored({'sha256':'0'*64},r.INTEGRATION_SHA)
    def test_missing_anchor_member(self):
        with self.assertRaisesRegex(ValueError,'recorder-anchor-member'):r.member(Path('/unused'),{},'missing')
    def test_no_anchor_path_escape(self):
        with self.assertRaisesRegex(ValueError,'recorder-anchor-path'):r.member(Path('/unused'),{'../escape':{}},'../escape')
    def test_new_contract_routes_new_validator(self):
        with patch.object(r,'_bind_current',return_value={}) as f:
            r.bind('/repo','/file','digest')
            self.assertEqual(f.call_args.args,('/repo','/file','digest',r.SCHEMA,r.CONTRACT,r.qualify))
if __name__=='__main__':unittest.main(verbosity=2)
