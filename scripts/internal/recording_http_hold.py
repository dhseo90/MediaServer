"""R157 fixed numeric schema. Catalog lock/Journal mutex times remain unknown."""
import json
PREFIX='[R157-hold] '
STAGES='DeletedAPI V1API V2API LinksAPI AcquireAPI ValidateAPI ReleaseAPI LockConstruction OwnedBody AcquireInit Eligibility EligibilityCanRead EligibilityLifecycle EventProtection LocationLookup SegmentCopy ValidateBody ContentCompare PlusHold PlusRead PlusLifecycle PlusLookup PlusRange PlusGeneration PlusPrecheck PlusBegin PlusPrepare PlusBindStep PlusCommitAuthority PlusCommit PlusRollback PlusLegacy PlusMap MinusHold MinusRead MinusLifecycle MinusLookup MinusRange MinusGeneration MinusPrecheck MinusBegin MinusPrepare MinusBindStep MinusCommitAuthority MinusCommit MinusRollback MinusLegacy MinusMap FDClose FDDiagnostic'.split()
COUNTERS='Continuous Event OtherRetention PlusCalls MinusCalls PlusPrior PlusNext MinusPrior MinusNext PlusOK PlusFail MinusOK MinusFail GenerationPlus GenerationMinus SQLitePlus SQLiteMinus LegacyPlus LegacyMinus CloseOK CloseFail'.split()
def num(n):
 if type(n)!=int or not 0<=n<2**64:raise ValueError('hold numeric bound')
def validate(r):
 if not isinstance(r,dict) or r.get('schema')!=1 or type(r.get('id'))!=int or r['id'] not in (10,11,60):raise ValueError('hold identity')
 if r.get('loss') is not False or r.get('complete') is not True:raise ValueError('hold loss/incomplete')
 if r.get('mutexTiming')!='UNKNOWN' or r.get('journalMutexTiming')!='UNKNOWN':raise ValueError('hold unmeasured mutex claim')
 for k in ('begin','end'):num(r[k])
 if not 0<r['begin']<=r['end']:raise ValueError('hold interval')
 span=r['end']-r['begin'];m=r['metrics'];c=r['counts'];o=r['outcomes']
 if len(m)!=len(STAGES) or len(c)!=len(COUNTERS) or len(o)!=7:raise ValueError('hold shape')
 for row in m:
  if len(row)!=3:raise ValueError('hold metric shape')
  for n in row:num(n)
  calls,inc,own=row
  if own>inc or inc>span or (calls==0 and inc!=0):raise ValueError('hold nested metric')
 for n in c:num(n)
 if sum(row[2] for row in m)>span:raise ValueError('hold negative residual')
 for i,row in enumerate(o):
  if len(row)!=2:raise ValueError('hold outcome shape')
  for n in row:num(n)
  if sum(row)!=m[i][0]:raise ValueError('hold API outcomes')
 m=dict(zip(STAGES,m));c=dict(zip(COUNTERS,c))
 for side in ('Plus','Minus'):
  if c[side+'Calls']!=m[side+'Hold'][0] or c[side+'Calls']!=c[side+'OK']+c[side+'Fail']:raise ValueError('hold outcome count')
  suffix=side
  for counter,stage in [('Generation'+suffix,side+'Generation'),('SQLite'+suffix,side+'Begin'),('Legacy'+suffix,side+'Legacy')]:
   if c[counter]!=m[stage][0]:raise ValueError('hold backend count')
  children=[side+x for x in ('Read','Lifecycle','Lookup','Range','Generation','Legacy','Map')]
  if sum(m[k][1] for k in children)>m[side+'Hold'][1]:raise ValueError('hold stage nesting')
  if sum(m[side+x][1] for x in ('Precheck','Begin','Prepare','BindStep','CommitAuthority','Rollback'))>m[side+'Generation'][1]:raise ValueError('hold generation nesting')
  if m[side+'Commit'][1]>m[side+'CommitAuthority'][1]:raise ValueError('hold commit nesting')
 if c['PlusFail'] or c['MinusFail'] or c['CloseFail']:raise ValueError('hold ownership operation failed')
 if c['CloseOK']+c['CloseFail']!=m['FDClose'][0]:raise ValueError('hold close count')
 if m['FDClose'][0]!=m['FDDiagnostic'][0]:raise ValueError('hold diagnostic count')
 if m['LockConstruction'][1]+m['OwnedBody'][1]>sum(m[k][1] for k in STAGES[:7]):raise ValueError('hold lock scope nesting')
 return r

def qualify(lines,currentness):
 records={}
 for line in lines:
  if not line.startswith(PREFIX):continue
  r=validate(json.loads(line[len(PREFIX):]));i=r['id']
  if i in records:raise ValueError('duplicate hold')
  records[i]=r
 if set(records)!={10,11,60}:raise ValueError('missing hold')
 import recording_http_currentness as parent
 for i,r in records.items():
  p=currentness[i]
  if not p['begin']<=r['begin']<=r['end']<=p['end']:raise ValueError('unbound hold scope')
  m=dict(zip(STAGES,r['metrics']));c=dict(zip(COUNTERS,r['counts']));pm=dict(zip(parent.STAGES,p['metrics']));pc=dict(zip(parent.COUNTERS,p['counts']))
  pairs=[('DeletedAPI','DeletedIdCheck'),('LinksAPI','EventLinkLookup'),('AcquireAPI','MediaHoldAcquire'),('ValidateAPI','MediaCurrentValidation')]
  if any(m[a][1]>pm[b][1] for a,b in pairs):raise ValueError('hold parent mismatch')
  if m['V1API'][1]+m['V2API'][1]>pm['SegmentLookup'][1]:raise ValueError('hold lookup nesting')
  if sum(m[k][1] for k in ('ReleaseAPI','FDClose','FDDiagnostic'))>pm['MediaObjectRelease'][1]:raise ValueError('hold release nesting')
  n=pc['ResolveOK']
  if n!=pc['ResolveCalls'] or n!=pc['V2Rows'] or c['PlusOK']!=n or c['MinusOK']!=n or c['PlusFail'] or c['MinusFail'] or c['CloseFail']:raise ValueError('hold normal ownership')
  if c['PlusNext']-c['PlusPrior']!=n or c['MinusPrior']-c['MinusNext']!=n:raise ValueError('hold count delta')
  if any(m[k][0]!=n for k in ('DeletedAPI','V1API','V2API','AcquireAPI','ValidateAPI','ReleaseAPI','FDClose')) or m['LinksAPI'][0]!=4*n:raise ValueError('hold native API count')
 return records
