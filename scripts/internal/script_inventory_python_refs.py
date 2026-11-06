#!/usr/bin/env python3
"""파일 실행 없이 제공된 추적 텍스트에서 동일 디렉터리 Python import를 결속한다."""
import ast
import json
import io
import tokenize
import posixpath
import sys

def resolve(data):
    texts = data['texts']
    tracked = set(data['tracked'])
    references, unresolved = [], []
    for consumer, text in texts.items():
        if not consumer.startswith('scripts/') or not consumer.endswith('.py'):
            continue
        if consumer not in tracked:
            continue
        try:
            tree = ast.parse(text, filename=consumer)
        except SyntaxError:
            unresolved.append({'consumer': consumer, 'reason': 'syntax'})
            continue
        directory = posixpath.dirname(consumer)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                modules = [item.name for item in node.names]
            elif isinstance(node, ast.ImportFrom) and node.level == 0:
                modules = [node.module]
            else:
                continue
            for module in modules:
                if not module or not module.isidentifier():
                    unresolved.append({'consumer': consumer, 'line': node.lineno, 'reason': 'unsupported-module'})
                    continue
                target = directory + '/' + module + '.py'
                package = directory + '/' + module + '/'
                collision = any(p.startswith(package) for p in tracked)
                # package consumer의 absolute import는 sibling임을 추정하지 않는다.
                packaged = any('/'.join(consumer.split('/')[:i]) + '/__init__.py' in tracked
                               for i in range(1, len(consumer.split('/'))))
                if collision or packaged:
                    unresolved.append({'consumer': consumer, 'line': node.lineno, 'module': module, 'reason': 'ambiguous-package'})
                    continue
                if target == consumer or target not in tracked or target not in texts:
                    continue
                references.append({'consumer': consumer, 'target': target, 'module': module,
                                   'line': node.lineno, 'column': node.col_offset,
                                   'syntax': ast.get_source_segment(text, node)})
    return {'references': references, 'unresolved': unresolved}


def non_output_keyword_text(text):
    """출력 문구가 아닌 Python 키워드 인자의 이름/등호만 구별한다. 입력은 실행하지 않는다."""
    try:
        tree = ast.parse(text)
        tokens = list(tokenize.generate_tokens(io.StringIO(text).readline))
    except (SyntaxError, tokenize.TokenError):
        return text
    lines = text.splitlines(keepends=True)
    offsets, offset = [], 0
    for line in lines:
        offsets.append(offset)
        offset += len(line)
    def ast_offset(line, column):
        # AST 열은 UTF-8 byte, tokenize 열은 Unicode code point다.
        return offsets[line - 1] + len(lines[line - 1].encode('utf8')[:column].decode('utf8'))
    joined = [(ast_offset(n.lineno, n.col_offset), ast_offset(n.end_lineno, n.end_col_offset))
              for n in ast.walk(tree) if isinstance(n, ast.JoinedStr)]
    starts = {ast_offset(n.lineno, n.col_offset) for n in ast.walk(tree)
              if isinstance(n, ast.keyword) and n.arg is not None}
    masked = list(text)
    for index, token in enumerate(tokens[:-1]):
        if token.type != tokenize.NAME:
            continue
        start = offsets[token.start[0] - 1] + token.start[1]
        if start not in starts or any(a <= start < b for a, b in joined):
            continue
        following = tokens[index + 1]
        if following.type != tokenize.OP or following.string != '=':
            continue
        end = offsets[following.end[0] - 1] + following.end[1]
        for pos in range(start, end):
            if masked[pos] not in '\r\n':
                masked[pos] = ' '
    return ''.join(masked)

if __name__ == '__main__':
    data = json.load(sys.stdin)
    result = {'searchText': non_output_keyword_text(data['a12Text'])} if 'a12Text' in data else resolve(data)
    json.dump(result, sys.stdout)
    sys.stdout.write('\n')
