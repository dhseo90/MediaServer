"""R160 fail-closed arithmetic; UNKNOWN is not zero or a measured overflow."""
import json
FIELDS='k o s l m t r b a e n w h x y'.split()
RECORDS=16384
BYTES=2097152
RESERVE=512
COLLECTOR=4194304
def integer(n):
 if type(n)!=int or not 0<=n<2**64:raise ValueError('invalid numeric bound')
def serialized(row):
 if set(row)!=set(FIELDS):raise ValueError('Row shape')
 for n in row.values():integer(n)
 return ('[recording-latency] '+json.dumps({k:row[k] for k in FIELDS},separators=(',',':'))+'\n').encode()
ROW_MAX=len(serialized(dict.fromkeys(FIELDS,2**64-1)))
def qualify(producers,other_bytes):
 """Each producer is a process; normal Rows exclude the one possible k3 marker."""
 if not producers:raise ValueError('missing producers')
 total=0;unknown=[];exceeds=[];seen=set();result=[]
 for p in producers:
  name=p['process']
  if not name or name in seen:raise ValueError('duplicate process')
  seen.add(name);n=p['records'];b=p['bytes']
  if n is None or b is None:unknown.append(name);result.append(dict(p,recordHeadroom=None,byteHeadroom=None));continue
  integer(n);integer(b)
  if n>RECORDS or b>BYTES-RESERVE:exceeds.append(name)
  result.append(dict(p,recordHeadroom=RECORDS-n,byteHeadroom=BYTES-RESERVE-b));total+=b
 if other_bytes is None:unknown.append('other collector output')
 else:integer(other_bytes);total+=other_bytes
 if not unknown and total>COLLECTOR:exceeds.append('collector')
 return {'decision':'UNVERIFIED' if unknown else 'EXCEEDS_CAP' if exceeds else 'PASS_ARITHMETIC_ONLY','producers':result,'unknown':unknown,'exceeds':exceeds,'collectorBytes':None if unknown else total,'collectorHeadroom':None if unknown else COLLECTOR-total,'completeness':'requires independent flush/identity/write/terminal proof; arithmetic alone cannot qualify a cycle'}
def records(raw):
 if len(raw)>COLLECTOR:raise ValueError('collector cap')
 if raw and not raw.endswith(b'\n'):raise ValueError('partial record')
 result=[];terminal=[]
 for line in raw.decode('utf-8').splitlines():
  if line.startswith('[recording-latency] '):
   row=json.loads(line[20:]);serialized(row)
   if row['k']==3:raise ValueError('producer loss')
   result.append(row)
  elif line.startswith('[R160-end] '):terminal.append(json.loads(line[11:]))
 if len(terminal)!=1 or terminal[0]['cleanup'] is not True:raise ValueError('missing/duplicate terminal')
 if terminal[0]['streamError'] or terminal[0]['localLoss'] or terminal[0]['lossMarker']:raise ValueError('output/loss')
 return result,terminal[0]
