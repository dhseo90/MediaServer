"""R156 fixed numeric schema. Inclusive parents are never added to children."""
import json
STAGES=['ResponseAdmission','JsonInitialization','AvailabilityKey','AvailabilityCache','MediaResolve','FallbackResolve','DeletedState','ItemSerialization','ResponseTail','AuthorizationRecheck','JsonTake','DeletedIdCheck','SegmentLookup','EventLinkLookup','MediaHoldAcquire','ContainedMediaOpen','PhysicalInspection','MediaCurrentValidation','MediaObjectRelease']
COUNTERS=['Positions','Items','AvailabilityCalls','InvalidKeys','CacheHits','CacheMisses','UniqueKeys','ResolveCalls','ResolveOK','ResolveFail','PreferredChecks','FallbackChecks','FallbackOK','FallbackFail','DeletedQueries','ResponseBytes','V1Rows','V2Rows']
PREFIX='[R156-currentness] '

def validate(r):
    def num(n):
        if type(n)!=int or not 0<=n<2**64:raise ValueError('currentness numeric bound')
    if not isinstance(r,dict) or r.get('schema')!=1 or type(r.get('id'))!=int or r['id'] not in (10,11,60):raise ValueError('currentness identity/schema')
    if r.get('method')!='GET' or r.get('routeClass')!='structured-search':raise ValueError('currentness route')
    if r.get('complete') is not True or r.get('loss') is not False:raise ValueError('currentness incomplete/loss')
    for n in [r['begin'],r['end']]:num(n)
    if not 0<r['begin']<=r['end']:raise ValueError('currentness order')
    if len(r['metrics'])!=len(STAGES) or len(r['counts'])!=len(COUNTERS):raise ValueError('currentness shape')
    for row in r['metrics']:
        if len(row)!=3:raise ValueError('currentness metric shape')
        for n in row:num(n)
        if row[2]>row[1] or row[1]>r['end']-r['begin'] or (not row[0] and any(row)):raise ValueError('currentness metric bounds')
    if sum(x[2] for x in r['metrics'])>r['end']-r['begin']:raise ValueError('currentness negative residual')
    for n in r['counts']:num(n)
    c=dict(zip(COUNTERS,r['counts']));m=dict(zip(STAGES,r['metrics']))
    for stage,count in [('AvailabilityKey',c['AvailabilityCalls']),('AvailabilityCache',c['CacheHits']+2*c['CacheMisses']),('ItemSerialization',c['Items'])]:
        if m[stage][0]!=count:raise ValueError('currentness mandatory stage count')
    if c['Positions']!=c['Items'] or c['PreferredChecks']!=c['Items']:raise ValueError('currentness item count')
    if c['AvailabilityCalls']!=c['CacheHits']+c['CacheMisses']+c['InvalidKeys']:raise ValueError('currentness availability count')
    if c['AvailabilityCalls']!=c['PreferredChecks']+c['FallbackChecks']:raise ValueError('currentness branch count')
    if not c['CacheMisses']==c['UniqueKeys']==c['ResolveCalls']==c['ResolveOK']+c['ResolveFail']==m['MediaResolve'][0]:raise ValueError('currentness resolve count')
    if c['FallbackChecks']!=c['FallbackOK']+c['FallbackFail'] or c['FallbackChecks']!=m['FallbackResolve'][0]:raise ValueError('currentness fallback count')
    if c['DeletedQueries']!=m['DeletedState'][0]:raise ValueError('currentness deletion count')
    if any(m[k][0]!=1 for k in ('ResponseAdmission','JsonInitialization','ResponseTail','AuthorizationRecheck','JsonTake')) or not 0<c['ResponseBytes']<=4*1024*1024:raise ValueError('currentness response terminal')
    samples=r['inspections']
    if len(samples)>128 or len(samples)!=m['PhysicalInspection'][0]:raise ValueError('currentness inspection count')
    last=r['begin']
    for b,e,budget,state,timeout in samples:
        for n in (b,e,budget,state,timeout):num(n)
        if not last<=b<=e<=r['end'] or budget!=5000 or state>2 or timeout>1:raise ValueError('currentness inspection bounds')
        last=e
    # ReadService boundaries are nested inside MediaResolve. Release excludes member destruction.
    inner=['DeletedIdCheck','SegmentLookup','EventLinkLookup','MediaHoldAcquire','ContainedMediaOpen','PhysicalInspection','MediaCurrentValidation','MediaObjectRelease']
    if sum(m[k][1] for k in inner)>m['MediaResolve'][1]:raise ValueError('currentness media nesting')
    if m['DeletedState'][1]>m['ItemSerialization'][1]:raise ValueError('currentness item nesting')
    return r

def qualify(lines,traces):
    records={}
    for line in lines:
        if not line.startswith(PREFIX):continue
        r=validate(json.loads(line[len(PREFIX):]));i=r['id']
        if i in records:raise ValueError('duplicate currentness')
        records[i]=r
    if set(records)!={10,11,60}:raise ValueError('missing currentness')
    for i,r in records.items():
        phases=[p for p in traces['search'][i]['phases'] if p[0]=='CurrentnessJson']
        if len(phases)!=1 or not phases[0][1]<=r['begin']<=r['end']<=phases[0][2]:raise ValueError('unbound currentness phase')
    return records
