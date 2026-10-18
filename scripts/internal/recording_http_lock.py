"""R159 exact selected-call/Row qualifier; all timestamps are latency::Now ns."""
import json
from recording_lock_timing import FIELDS,number
from recording_http_lock_overlay import NAMES
BASE=1000000
CAP=128
def call(r,sites):
 if set(r)!=set('schema id ordinal api line thread mutex identity delta cb ce rb re owned'.split()):raise ValueError('call shape')
 for k in r.keys()-{'owned','delta'}:number(r[k])
 if r['schema']!=1 or r['id'] not in (10,11,60) or not 1<=r['ordinal']<=CAP or r['api']>=7:raise ValueError('call bounds')
 if r['identity']!=BASE+r['id']*CAP+r['ordinal'] or r['line']!=sites[r['api']]:raise ValueError('call identity/line')
 if r['owned'] is not True or not r['thread'] or not 1<=r['mutex']<=128:raise ValueError('call ownership')
 if type(r['delta'])!=int or r['delta'] not in ((1,) if r['api']==4 else (-1,0,1) if r['api']==6 else (0,)):raise ValueError('hold direction')
 if not 0<r['cb']<=r['ce']<=r['rb']<=r['re']:raise ValueError('call order')
 return r
def terminal(r):
 if set(r)!=set('schema id count begin end complete enabled slow holder loss'.split()):raise ValueError('lock terminal shape')
 for k in ('schema','id','count','begin','end'):number(r[k])
 if r['schema']!=1 or r['id'] not in (10,11,60) or not 0<r['count']<=CAP or not 0<r['begin']<=r['end']:raise ValueError('lock terminal bound')
 if any(r[k] is not v for k,v in [('complete',True),('enabled',True),('slow',False),('holder',False),('loss',False)]):raise ValueError('lock terminal flags/loss')
 return r
def row(r):
 if set(r)!=set(FIELDS):raise ValueError('latency shape')
 for n in r.values():number(n)
 if r['k']==3:raise ValueError('global latency loss')
 if r['k'] not in (0,1,2) or not r['n'] or not r['t'] or not 0<r['b']<=r['a']<=r['e']:raise ValueError('latency bounds')
 if r['k']==0 and (not r['m'] or r['n']!=1 or r['w']!=r['a']-r['b'] or r['h']!=r['e']-r['a'] or r['x']!=r['w'] or r['y']!=r['h']):raise ValueError('latency window')
 return r
class Collector:
 def __init__(self,sites):self.sites=sites;self.calls={};self.ends={};self.rows=[];self.rowbytes=0
 def feed(self,line):
  if line.startswith('[R159-call] '):
   r=call(json.loads(line[12:]),self.sites);key=r['identity']
   if key in self.calls:raise ValueError('duplicate call')
   self.calls[key]=r
  elif line.startswith('[R159-end] '):
   r=terminal(json.loads(line[11:]));i=r['id']
   if i in self.ends:raise ValueError('duplicate terminal')
   self.ends[i]=r
  elif line.startswith('[recording-latency] '):
   r=row(json.loads(line[20:]));self.rows.append(r);self.rowbytes+=len(line.encode())+1
   if len(self.rows)>16384 or self.rowbytes>2*1024*1024:raise ValueError('global latency cap')
  elif line.startswith(('[catalog-holder-loss]','[visual-phase-loss]','[visual-request-loss]','[R159-loss]')):raise ValueError('global trace loss')
 def finish(self,ids=(10,11,60),hold=None):
  if set(self.ends)!=set(ids) or {r['id'] for r in self.calls.values()}!=set(ids):raise ValueError('missing selected terminal/calls')
  output={};matched=set()
  for i in ids:
   end=self.ends[i];cs=sorted((r for r in self.calls.values() if r['id']==i),key=lambda r:r['ordinal'])
   if [c['ordinal'] for c in cs]!=list(range(1,end['count']+1)):raise ValueError('missing call ordinal')
   sums=dict.fromkeys(('constructorNs','acquisitionNs','heldNs','constructorBoundaryResidualNs','releaseBoundaryResidualNs'),0);details=[];counts=[0]*7
   for c in cs:
    if not end['begin']<=c['cb']<=c['re']<=end['end']:raise ValueError('call outside parent clock')
    selected=[(n,r) for n,r in enumerate(self.rows) if r['r']==c['identity'] and (r['l'] in self.sites or r['k']==2 and r['m']==c['mutex'])]
    if len(selected)!=1:raise ValueError('missing/duplicate/aggregate selected Row')
    n,r=selected[0]
    if n in matched or r['k']!=0 or r['o']!=1 or r['s']!=1 or r['n']!=1 or r['l']!=c['line'] or r['m']!=c['mutex'] or r['t']!=c['thread']:raise ValueError('Row binding')
    if not c['cb']<=r['b']<=r['a']<=c['ce']<=c['rb']<=r['e']<=c['re']:raise ValueError('Row clock/bounds')
    matched.add(n);counts[c['api']]+=1
    v={'constructorNs':c['ce']-c['cb'],'acquisitionNs':r['a']-r['b'],'heldNs':r['e']-r['a'],'constructorBoundaryResidualNs':c['ce']-c['cb']-(r['a']-r['b']),'releaseBoundaryResidualNs':c['re']-r['e']}
    for k,x in v.items():sums[k]+=x
    details.append(dict(c,**v,row=r))
   if hold is not None:
    h=hold[i]
    if counts!=[m[0] for m in h['metrics'][:7]] or len(cs)!=h['metrics'][7][0]:raise ValueError('API/Lock count mismatch')
    # Duration comparison only: hold uses Tick epoch; no cross-epoch timestamp subtraction.
    if sum(c['re']-c['cb'] for c in cs)>sum(m[1] for m in h['metrics'][:7]):raise ValueError('API duration bound')
   output[i]={'calls':len(cs),'apiCounts':dict(zip(NAMES,counts)),'sumsNs':sums,'details':details,'terminal':end}
  for n,r in enumerate(self.rows):
   if r['s']==1 and r['l'] in self.sites and r['r']>=BASE and n not in matched:raise ValueError('unmatched selected Row')
  return {'requests':output,'selectedRows':len(matched),'unselectedRows':len(self.rows)-len(matched),'latencyRows':len(self.rows),'latencyBytes':self.rowbytes,'loss':False}
