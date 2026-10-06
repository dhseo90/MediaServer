# 파일 용도: 50 최소 관측의 질문 후치 L/단일 user B 비교. 원 PNG·지시·schema·기준은 재사용한다.
import ast
import copy
import importlib.util
import json
import pathlib
import re
import sys

sys.dont_write_bytecode = True
HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('diagnostic50', HERE / '50-diagnostic.py')
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
ORDER = [('L2', 'D2', 'L'), ('B2', 'D2', 'B'), ('L4', 'D4', 'L'), ('B4', 'D4', 'B')]


def validate(original, candidate, layout):
    """허용한 재배치 외 데이터나 대응표 변경은 호출 전에 거부한다."""
    assert {k: v for k, v in original.items() if k != 'messages'} == {
        k: v for k, v in candidate.items() if k != 'messages'}
    source = original['messages']
    messages = candidate['messages']
    assert messages[0] == source[0]
    if layout == 'L':
        assert messages == [source[0], *source[2:], source[1]]
        return
    assert layout == 'B' and len(messages) == 2
    assert set(messages[1]) == {'role', 'content', 'images'} and messages[1]['role'] == 'user'
    assert messages[1]['images'] == [m['images'][0] for m in source[2:]]
    table, question = messages[1]['content'].split('\n\n')
    assert question == source[1]['content']
    lines = table.splitlines()
    assert len(lines) == len(source) - 2
    for i, (line, frame) in enumerate(zip(lines, source[2:])):
        match = re.fullmatch(r'imageArrayIndex=(\d+) -> (frameKey=f\d+ ptsNs=\d+ width=\d+ height=\d+)', line)
        assert match and int(match[1]) == i and match[2] == frame['content']


def requests():
    originals = {row['id']: row for row in old.requests()}
    frozen = old.load('50-request-freeze.json')
    # 과거 D1~D4 생성의 바이트 불변을 확인하지만 모델은 호출하지 않는다.
    for entry in frozen['requests']:
        assert old.sha(old.encoded(originals[entry['id']]['request'])) == entry['requestSha256']
    result = []
    for ident, source_id, layout in ORDER:
        source = originals[source_id]
        request = copy.deepcopy(source['request'])
        messages = request['messages']
        if layout == 'L':
            request['messages'] = [messages[0], *messages[2:], messages[1]]
        else:
            table = '\n'.join(f"imageArrayIndex={i} -> {m['content']}" for i, m in enumerate(messages[2:]))
            request['messages'] = [messages[0], {
                'role': 'user', 'images': [m['images'][0] for m in messages[2:]],
                'content': table + '\n\n' + messages[1]['content']}]
        validate(source['request'], request, layout)
        result.append({'id': ident, 'request': request, 'refs': source['refs'], 'source': source_id, 'layout': layout})
    return result


def checks(batch):
    originals = {row['id']: row['request'] for row in old.requests()}
    rejected = []
    for row in batch:
        mutations = {}
        for name, key, value in [('system', 'messages', None), ('schema', 'format', {}), ('options', 'options', {})]:
            bad = copy.deepcopy(row['request'])
            if name == 'system':
                bad['messages'][0]['content'] += ' changed'
            else:
                bad[key] = value
            mutations[name] = bad
        if row['layout'] == 'L':
            bad = copy.deepcopy(row['request']); bad['messages'].pop(1); mutations['missing'] = bad
            bad = copy.deepcopy(row['request']); bad['messages'].insert(1, bad['messages'][1]); mutations['duplicate'] = bad
            bad = copy.deepcopy(row['request']); bad['messages'][1:3] = reversed(bad['messages'][1:3]); mutations['order'] = bad
            bad = copy.deepcopy(row['request']); bad['messages'][-1]['content'] += ' answer'; mutations['question'] = bad
        else:
            bad = copy.deepcopy(row['request']); bad['messages'][1]['images'].pop(); mutations['missing'] = bad
            bad = copy.deepcopy(row['request']); bad['messages'][1]['images'].append(bad['messages'][1]['images'][0]); mutations['duplicate'] = bad
            bad = copy.deepcopy(row['request']); bad['messages'][1]['images'][0:2] = reversed(bad['messages'][1]['images'][0:2]); mutations['order'] = bad
            bad = copy.deepcopy(row['request']); bad['messages'][1]['content'] = bad['messages'][1]['content'].replace('imageArrayIndex=0', 'imageArrayIndex=1', 1); mutations['mapping'] = bad
            bad = copy.deepcopy(row['request']); bad['messages'][1]['content'] += ' previous answer'; mutations['question'] = bad
        for name, bad in mutations.items():
            try:
                validate(originals[row['source']], bad, row['layout'])
            except (AssertionError, ValueError):
                rejected.append(row['id'] + ':' + name)
            else:
                raise AssertionError('mutation accepted: ' + row['id'] + ':' + name)
    return rejected


def prepare():
    batch = requests()
    rejected = checks(batch)
    prior = old.load('50-request-freeze.json')
    records = []
    for row in batch:
        request = row['request']
        records.append({'id': row['id'], 'source': row['source'], 'layout': row['layout'],
            'requestSha256': old.sha(old.encoded(request)), 'requestBytes': len(old.encoded(request)),
            'requestWithoutImageBytes': {**request, 'messages': [{k: v for k, v in m.items() if k != 'images'} for m in request['messages']]},
            'imageReferences': row['refs'], 'reconstruction': 'requests() uses exact base64 from49 via unchanged50.requests(); image bytes are not duplicated here'})
    old.save('51-request-freeze.json', {'base': '8d107ef3a91af14b26b033b4befed9ba0bc867da',
        'source49Sha256': prior['source49Sha256'], 'source50FreezeSha256': old.sha((HERE / '50-request-freeze.json').read_bytes()),
        'harnessSha256': old.sha((HERE / '50-diagnostic.py').read_bytes()),
        'additionalCodeSha256': {'51-layout.py': old.sha(pathlib.Path(__file__).read_bytes())},
        'modelDigest': prior['modelDigest'], 'requests': records, 'criteria': prior['criteria'],
        'criteriaMeaning': prior['criteriaMeaning'], 'limits': prior['limits'],
        'pairDiff': {'L': 'move the existing question once from second to last; image messages unchanged',
                     'B': 'one native user content/images message with exact array-to-frame table followed by original question; grouping and question position both change'},
        'priorControl': '50 preserved responses; no original D1/D2/D3/D4 rerun; not simultaneous A/B or stability trial',
        'checks': {'positiveRequests': 4, 'negativeRejected': rejected, 'original50RequestHashesUnchanged': True, 'modelCalls': 0},
        'runtimeEvidenceReuse': '50-input-check and50-evaluation decode counts/truncated=0; not proof of internal feature/frame correspondence'})
    print('PASS: original50 request hashes; L/B byte/order validation; rejected', len(rejected), 'mutations; model calls0')


if __name__ == '__main__':
    ast.parse(pathlib.Path(__file__).read_text())
    ast.parse((HERE / '50-diagnostic.py').read_text())
    if sys.argv[1:] == ['--prepare']:
        prepare()
    elif sys.argv[1:] == ['--run']:
        old.run(requests)
    else:
        raise SystemExit('use --prepare or --run')
