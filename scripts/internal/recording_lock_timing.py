"""R158 original latency Row/explicit callsite sidecar focused qualification."""
import json
CAP=65536
U64=2**64
FIELDS='k o s l m t r b a e n w h x y'.split()
def number(n):
 if type(n)!=int or not 0<=n<U64:raise ValueError('numeric bound')
def parse(raw):
 if len(raw.encode())>CAP:raise ValueError('output cap')
 if raw and not raw.endswith('\n'):raise ValueError('partial terminal')
 groups={'calls':[],'rows':[],'end':[],'slow':[],'complete':[]}
 prefixes={'[R158-call] ':'calls','[recording-latency] ':'rows','[R158-end] ':'end','[recording-slow-summary] ':'slow','[recording-complete-summary] ':'complete'}
 for line in raw.splitlines():
  if 'loss]' in line or line.startswith('[R158-failure]'):raise ValueError('loss marker')
  for prefix,key in prefixes.items():
   if line.startswith(prefix):groups[key].append(json.loads(line[len(prefix):]));break
  else:
   if line.startswith('[catalog-holder-end] '):
    end=json.loads(line.split(' ',1)[1])
    if end['loss'] or end['inflight']:raise ValueError('holder loss')
   elif line.startswith('[catalog-holder] '):raise ValueError('unexpected selected holder')
   elif line:raise ValueError('unknown output')
 if len(groups['end'])!=1:raise ValueError('missing/duplicate terminal')
 end=groups['end'][0]
 if end.get('cleanup') is not True or end.get('loss') is not False:raise ValueError('cleanup/loss')
 if end['calls']!=len(groups['calls']):raise ValueError('call count')
 for row in groups['rows']:
  if set(row)!=set(FIELDS):raise ValueError('row shape')
  for n in row.values():number(n)
  if row['k']==3:raise ValueError('native loss')
  if row['k'] not in (0,2) or not row['n'] or not row['m'] or not row['t']:raise ValueError('row identity')
  if not 0<row['b']<=row['a']<=row['e']:raise ValueError('row order/missing')
  if row['k']==0 and (row['o']!=1 or row['s']!=1 or row['n']!=1 or row['w']!=row['a']-row['b'] or row['h']!=row['e']-row['a'] or row['x']!=row['w'] or row['y']!=row['h']):raise ValueError('individual window')
 return groups

def qualify(raw,mode='normal',expected=(True,False,False)):
 g=parse(raw);end=g['end'][0]
 if any(type(end.get(k))!=bool or end[k] is not bool(v) for k,v in zip(('enabled','holder','slow'),expected)):raise ValueError('execution setting mismatch')
 if mode in ('aggregate','slow'):
  if g['calls']:raise ValueError('aggregate not individual')
  if mode=='aggregate':
   if len(g['rows'])!=1 or g['rows'][0]['k']!=2 or g['rows'][0]['n']!=3:raise ValueError('fast aggregate contract')
  else:
   if g['rows'] or len(g['slow'])!=1 or len(g['complete'])!=1 or g['complete'][0]['lockCount']!=3 or g['complete'][0]['countOverflow']:raise ValueError('slow omitted contract')
  return {'decision':'PASS','mode':mode,'individualAttribution':False,'rows':g['rows'],'end':end}
 if len(g['calls'])!=10:raise ValueError('missing call')
 seen=set();matched=set();result=[];mapping={1:10,2:10,3:11,4:11,5:60,6:60,7:60,8:60,9:10}
 for c in g['calls']:
  for k in 'request call part thread mutex cb ce rb re'.split():number(c[k])
  key=(c['request'],c['call'],c['part'])
  if key in seen:raise ValueError('duplicate call identity')
  seen.add(key)
  if mapping.get(c['call'])!=c['request'] or c['part'] not in ((1,2) if c['call']==6 else (1,)):raise ValueError('request/call mismatch')
  if not 0<c['cb']<=c['ce']<=c['rb']<=c['re']:raise ValueError('call order')
  if c['acquired'] is not (c['call']!=7):raise ValueError('ownership')
  candidates=[(i,r) for i,r in enumerate(g['rows']) if r['r']==c['call'] and r['t']==c['thread'] and c['cb']<=r['b']<=r['a']<=c['ce'] and c['rb']<=r['e']<=c['re']]
  row=None
  if end['enabled'] and c['acquired']:
   if len(candidates)!=1:raise ValueError('missing/ambiguous acquisition')
   i,row=candidates[0]
   if i in matched or row['k']!=0 or row['m']!=c['mutex'] or row['l']!=c['call']:raise ValueError('mutex/row identity')
   matched.add(i)
  elif candidates or c['mutex']!=0:raise ValueError('disabled/failed row')
  result.append(dict(c,constructorNs=c['ce']-c['cb'],releaseNs=c['re']-c['rb'],acquisitionWindowNs=row['w'] if row else None,heldWindowNs=row['h'] if row else None,constructorOutsideAcquireNs=(c['ce']-c['cb']-row['w']) if row else None))
 if len(matched)!=len(g['rows']):raise ValueError('unmatched/duplicate trace')
 if end['enabled']:
  ids={x['mutex'] for x in g['calls'] if x['acquired'] and x['call']!=4};other=next(x['mutex'] for x in g['calls'] if x['call']==4)
  if len(ids)!=1 or other in ids:raise ValueError('mutex identity mismatch')
  row=next(r for r in g['rows'] if r['r']==9)
  if not end['ownerBegin']<=row['b']<end['ownerRelease']<=row['a']:raise ValueError('contention not observed')
 if not end['contention']:raise ValueError('missing synchronized contention')
 return {'decision':'PASS','mode':mode,'individualAttribution':end['enabled'],'calls':result,'end':end,'limitations':['acquisition observation window not pure OS time','held observation ends before unlock','constructor outside acquisition is boundary residual, not exact diagnostic overhead','failed try-lock emits no row','no R157 HTTP attribution']}
