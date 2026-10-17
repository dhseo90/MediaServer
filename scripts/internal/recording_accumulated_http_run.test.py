"""출력 계약에 대한 결정적 반례. 제품 실행/실제 HTTP 성공의 대체가 아니다."""
import copy
import unittest
from recording_accumulated_http_run import qualify, PHASES

def fixture():
    rows=[]
    requests={'server':[1,2,3,4], 'four-accepted':[10,11,12,13],
              'four-complete':[20,21,22,40,41,42], 'a-prepare-start':[60,61,62,63,75,76,77]}
    for phase in PHASES:
        row={'phase':phase}
        if phase=='manifest':
            row['rows']=[dict(channel=c,segment=f'{c}-{i}',generation=f'{c}-{i//2}',samples=n,firstOrdinal=(i%2)*60+1,lastOrdinal=(i%2)*60+n,bytes=2654,sha256='a'*64) for c,count,n in [('1',1,30),('9101',8,60),('9201',8,60)] for i in range(count)]
        if phase=='complete':row.update(logicalRam=0,scratch=0,fd=0)
        rows.append(row)
        for i in requests.get(phase,[]):
            rows.append(dict(phase='http',id=i,status={1:401,2:403,20:201,40:201,61:201,76:201}.get(i,200),ms=100,bytes=50))
        if phase=='four-complete':rows.extend([dict(phase='package-readback',id='s'),dict(phase='package-readback',id='v')])
        if phase=='a-prepare-start':rows.append(dict(phase='package-readback',id='a'))
    return rows

class Contract(unittest.TestCase):
    def reject(self, change):
        rows=fixture();change(rows)
        with self.assertRaises((ValueError,KeyError,TypeError)):qualify(rows)
    def test_complete(self):self.assertEqual(qualify(fixture())['inputSamples'],990)
    def test_missing_phase(self):self.reject(lambda r:r.pop(0))
    def test_duplicate_phase(self):self.reject(lambda r:r.insert(0,copy.deepcopy(r[0])))
    def test_reordered_phase(self):self.reject(lambda r:r.reverse())
    def test_duplicate_request(self):self.reject(lambda r:r.insert(-1,copy.deepcopy(next(x for x in r if x.get('id')==60))))
    def test_missing_a(self):self.reject(lambda r:r.remove(next(x for x in r if x.get('id')==60)))
    def test_a_before_evidence(self):
        def change(r):x=next(x for x in r if x.get('id')==60);r.remove(x);r.insert(0,x)
        self.reject(change)
    def test_timeout(self):self.reject(lambda r:next(x for x in r if x.get('id')==10).update(ms=5001))
    def test_latency_bound(self):self.reject(lambda r:next(x for x in r if x.get('id')==10).update(ms=2001))
    def test_partial(self):self.reject(lambda r:next(x for x in r if x.get('id')==10).update(bytes=0))
    def test_auth_bypass(self):self.reject(lambda r:next(x for x in r if x.get('id')==1).update(status=200))
    def test_403(self):self.reject(lambda r:next(x for x in r if x.get('id')==60).update(status=403))
    def test_no_readback(self):self.reject(lambda r:r.remove(next(x for x in r if x['phase']=='package-readback')))
    def test_seed_count(self):self.reject(lambda r:next(x for x in r if x['phase']=='manifest')['rows'].pop(0))
    def test_duplicate_media(self):self.reject(lambda r:next(x for x in r if x['phase']=='manifest')['rows'].append(copy.deepcopy(next(x for x in r if x['phase']=='manifest')['rows'][0])))
    def test_hash(self):self.reject(lambda r:next(x for x in r if x['phase']=='manifest')['rows'][0].update(sha256='INVALID'))
    def test_ordinal(self):self.reject(lambda r:next(x for x in r if x['phase']=='manifest')['rows'][0].update(lastOrdinal=31))
    def test_cleanup_is_not_success(self):self.reject(lambda r:r.insert(-1,dict(phase='failure-cleanup-finish',ok=True)))
    def test_first_error_retained(self):self.reject(lambda r:r.insert(-1,dict(phase='first-failure',error='original')))
    def test_owner(self):self.reject(lambda r:r[-1].update(fd=1))

if __name__=='__main__':unittest.main()
