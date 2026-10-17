#!/usr/bin/env python3
"""읽기 전용 CMake Unix Makefiles freshness guard. 알 수 없는 형식은 UNVERIFIED.

mtime 기반 정상 빌드 그래프 검증이며 변조된 timestamp에 대한 서명 증명이 아니다.
컴파일러 depfile을 임의 실행하지 않고 해석한다. 제품/빌드 파일은 수정하지 않는다.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import sys


class Unverified(ValueError):
    pass


def require(ok, message):
    if not ok:
        raise Unverified(message)


def file(path):
    path = Path(path)
    require(path.is_file(), 'missing-file: ' + str(path))
    return path.resolve(strict=True)


def resolve(base, name):
    require(bool(name) and '\x00' not in name, 'invalid-path')
    return file(base / name)


def text(path):
    return file(path).read_text(encoding='utf-8', errors='strict')


def older(dependency, output):
    require(file(dependency).stat().st_mtime_ns <= file(output).stat().st_mtime_ns,
            'stale-product-build: ' + str(dependency) + ' newer than ' + str(output))


def make_words(value):
    """GCC/Clang Make dependencies: escapes, $$, continuation; no Make expansion."""
    value = value.replace('\\\r\n', '').replace('\\\n', '')
    result, token = [], ''
    i = 0
    while i < len(value):
        c = value[i]
        if c == '\\':
            i += 1
            require(i < len(value) and value[i] in ' \t#:\\', 'unsupported-make-escape')
            token += value[i]
        elif c == '$':
            require(value[i:i+2] == '$$', 'unsupported-make-expansion')
            token += '$'
            i += 1
        elif c == ':':
            if token:
                result.append(token)
                token = ''
            result.append(':')
        elif c == '#':
            raise Unverified('unescaped-make-comment')
        elif c.isspace():
            if token:
                result.append(token)
                token = ''
        else:
            require(c not in ';|', 'unsupported-make-syntax')
            token += c
        i += 1
    if token:
        result.append(token)
    return result


def depfile(value):
    words = make_words(value)
    require(len(words) >= 3 and words[1] == ':' and words.count(':') == 1,
            'malformed-depfile: expected one target and nonempty prerequisites')
    return words[0], words[2:]


def cmake_list(value, key):
    matches = re.findall(r'(?m)^set\(' + re.escape(key) + r'\s+(.*?)\)', value, re.S)
    require(len(matches) == 1, 'missing/duplicate-cmake-field: ' + key)
    body = matches[0].strip()
    # CMake generated quoted list subset. Reject expansion/list separators or escapes
    # we cannot prove, rather than silently dropping dependencies.
    tokens = re.findall(r'"([^"\\;$]*)"', body)
    require(re.sub(r'"[^"\\;$]*"', '', body).strip() == '',
            'unsupported-cmake-list: ' + key)
    return tokens


def make_assignment(value, key):
    value = value.replace('\\\n', '')
    matches = re.findall(r'^' + re.escape(key) + r'[ \t]*=[ \t]*(.*)$', value, re.M)
    require(len(matches) == 1, 'missing/duplicate-make-field: ' + key)
    return matches[0].strip()


def sha(path):
    return hashlib.sha256(file(path).read_bytes()).hexdigest()


def check(repo, build, expected_product=None, expected_runtime=None):
    repo, build = Path(repo).resolve(strict=True), Path(build).resolve(strict=True)
    cache_path = build / 'CMakeCache.txt'
    cache = {}
    for line in text(cache_path).splitlines():
        match = re.fullmatch(r'([^/#][^:]*):[^=]+=(.*)', line)
        if match:
            require(match[1] not in cache, 'duplicate-cache-key')
            cache[match[1]] = match[2]
    require(cache.get('CMAKE_GENERATOR') == 'Unix Makefiles', 'unsupported-generator')
    require(Path(cache.get('CMAKE_HOME_DIRECTORY', '')).resolve() == repo and
            Path(cache.get('CMAKE_CACHEFILE_DIR', '')).resolve() == build,
            'configuration-root-mismatch')
    config_path = build / 'CMakeFiles/Makefile.cmake'
    config = text(config_path)
    generated = [resolve(build, p) for p in cmake_list(config, 'CMAKE_MAKEFILE_OUTPUTS')]
    require({resolve(build, 'Makefile'), resolve(build, 'CMakeFiles/cmake.check_cache')} <= set(generated),
            'missing-generation-output')
    # cmake.check_cache is the completion witness; all outputs must exist.
    stamp = resolve(build, 'CMakeFiles/cmake.check_cache')
    older(config_path, stamp)
    configuration_inputs = {resolve(build, p) for p in cmake_list(config, 'CMAKE_MAKEFILE_DEPENDS')}
    require({file(cache_path), file(repo / 'CMakeLists.txt')} <= configuration_inputs,
            'missing-configuration-input')
    for p in configuration_inputs:
        older(p, stamp)
    targets = ('media_server_runtime', 'media_server')
    infos = {resolve(build, p) for p in cmake_list(config, 'CMAKE_DEPEND_INFO_FILES')}
    summaries, graph = {}, []
    artifacts = {}
    compiler = file(cache.get('CMAKE_CXX_COMPILER', ''))
    for target in targets:
        directory = build / 'CMakeFiles' / (target + '.dir')
        info_path, flags_path = directory / 'DependInfo.cmake', directory / 'flags.make'
        make_path, link_path = directory / 'build.make', directory / 'link.txt'
        require(file(info_path) in infos, 'target-not-configured: ' + target)
        flags, make, link = text(flags_path), text(make_path), text(link_path)
        require(make_assignment(make, 'CMAKE_SOURCE_DIR') == str(repo) and
                make_assignment(make, 'CMAKE_BINARY_DIR') == str(build), 'target-root-mismatch')
        require('# compile CXX with ' + cache['CMAKE_CXX_COMPILER'] in flags,
                'compiler-flags-mismatch')
        for key in ('CXX_DEFINES', 'CXX_INCLUDES', 'CXX_FLAGS'):
            make_assignment(flags, key)
        # Configuration switch must agree with generated feature definitions.
        definitions = shlex.split(make_assignment(flags, 'CXX_DEFINES'))
        for key in ('MEDIA_SERVER_USE_GSTREAMER', 'MEDIA_SERVER_USE_ONNXRUNTIME',
                    'MEDIA_SERVER_USE_SIGLIP2', 'MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE'):
            require(key in cache, 'missing-configuration: ' + key)
            require(cache[key].upper() in ('ON', 'OFF', '0', '1', 'TRUE', 'FALSE'),
                    'unsupported-configuration: ' + key)
            bit = '1' if cache[key].upper() in ('ON', '1', 'TRUE') else '0'
            require('-D' + key + '=' + bit in definitions, 'configuration-definition-mismatch: ' + key)
        rows = cmake_list(text(info_path), 'CMAKE_DEPENDS_DEPENDENCY_FILES')
        require(rows and len(rows) % 4 == 0, 'malformed-dependency-tuples')
        objects = set()
        deps = set()
        for i in range(0, len(rows), 4):
            source_name, object_name, kind, dep_name = rows[i:i+4]
            require(kind == 'gcc', 'unsupported-dependency-kind')
            source, obj, dep = (resolve(build, n) for n in (source_name, object_name, dep_name))
            require(obj.is_relative_to(directory.resolve()) and obj not in objects,
                    'duplicate-or-foreign-object')
            require(str(dep) == str(obj) + '.d', 'depfile-object-mismatch')
            lhs, names = depfile(text(dep))
            require(resolve(build, lhs) == obj, 'depfile-target-mismatch')
            inputs = {resolve(build, n) for n in names}
            require(source in inputs, 'depfile-source-missing')
            # Depfiles can be emitted just after the object. Do not compare their
            # own timestamps to object mtime; compare every real input instead.
            for p in inputs | {file(flags_path), file(info_path), file(make_path), compiler}:
                older(p, obj)
            require('$(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS)' in make and
                    '-MF ' + dep_name in make and '-o ' + object_name in make and
                    '-c ' + source_name in make, 'compile-rule-mismatch')
            objects.add(obj)
            deps.update(inputs)
            graph.append({'target': target, 'source': str(source), 'object': str(obj),
                          'dependencies': sorted(map(str, inputs))})
        listed = {resolve(build, n) for n in shlex.split(make_assignment(make, target + '_OBJECTS'))}
        require(listed == objects, 'make-object-list-mismatch')
        require(not make_assignment(make, target + '_EXTERNAL_OBJECTS'), 'unverified-external-objects')
        lines = [shlex.split(line) for line in link.splitlines() if line.strip()]
        if target == 'media_server_runtime':
            require(len(lines) == 2 and len(lines[0]) >= 4 and lines[0][1] == 'qc' and
                    Path(lines[0][0]).name in ('ar', 'llvm-ar') and
                    Path(lines[1][0]).name in ('ranlib', 'llvm-ranlib') and len(lines[1]) == 2,
                    'unsupported-archive-command')
            output = resolve(build, lines[0][2])
            require(resolve(build, lines[1][1]) == output, 'ranlib-output-mismatch')
            linked = {resolve(build, n) for n in lines[0][3:]}
            require(linked == objects and len(lines[0][3:]) == len(objects), 'archive-object-mismatch')
            link_inputs = objects | {file(lines[0][0]), file(lines[1][0])}
        else:
            require(len(lines) == 1 and file(lines[0][0]) == compiler, 'unsupported-link-command')
            words = lines[0][1:]
            link_inputs, output = set(), None
            i = 0
            while i < len(words):
                word = words[i]
                if word == '-o':
                    require(output is None and i+1 < len(words), 'invalid-link-output')
                    i += 1
                    output = resolve(build, words[i])
                elif word == '-arch':
                    i += 1
                    require(i < len(words) and words[i] in ('arm64', 'x86_64'), 'unknown-link-arch')
                elif word in ('-pthread', '-rdynamic', '-g', '-O0', '-O1', '-O2', '-O3', '-DNDEBUG'):
                    pass
                elif word in ('-Wl,-search_paths_first', '-Wl,-headerpad_max_install_names'):
                    pass
                elif word.startswith('-Wl,-rpath,'):
                    require(len(word.split(',')) == 3 and Path(word.split(',')[2]).is_dir(),
                            'invalid-rpath')
                elif word.startswith('-') or word.startswith('@'):
                    raise Unverified('unresolved-link-input-or-option: ' + word)
                else:
                    link_inputs.add(resolve(build, word))
                i += 1
            require(output is not None, 'missing-link-output')
            require({p for p in link_inputs if p.suffix == '.o'} == objects,
                    'executable-object-mismatch')
            require(artifacts['media_server_runtime'] in link_inputs, 'runtime-link-missing')
        require(output == file(build / ('libmedia_server_runtime.a' if target == 'media_server_runtime'
                                        else 'media_server')), 'unexpected-artifact')
        # Cross-check generated target prerequisites against parsed link inputs.
        prerequisites = set()
        for line in make.splitlines():
            if line.startswith(output.name + ':'):
                _, names = depfile(line)
                prerequisites.update(resolve(build, n) for n in names)
        require(prerequisites == link_inputs - {compiler, file(lines[0][0])} -
                ({file(lines[1][0])} if target == 'media_server_runtime' else set()) |
                {file(make_path), file(link_path)}, 'link-prerequisite-mismatch')
        for p in link_inputs | {file(make_path), file(link_path)}:
            older(p, output)
        artifacts[target] = output
        summaries[target] = {'objects': len(objects), 'uniqueDependencies': len(deps),
                             'repoDependencies': sum(p.is_relative_to(repo) and not p.is_relative_to(build) for p in deps),
                             'buildDependencies': sum(p.is_relative_to(build) for p in deps),
                             'externalDependencies': sum(not p.is_relative_to(repo) and not p.is_relative_to(build) for p in deps),
                             'linkInputs': len(link_inputs), 'artifactSha256': sha(output)}
    for target, expected in [('media_server', expected_product), ('media_server_runtime', expected_runtime)]:
        if expected is not None:
            require(re.fullmatch('[0-9a-f]{64}', expected) is not None and
                    summaries[target]['artifactSha256'] == expected, 'binary-hash-mismatch: ' + target)
    return {'schema': 'media-server.build-freshness.v1', 'status': 'PASS_TARGET_AWARE_PREFLIGHT',
            'targets': summaries, 'graphSha256': hashlib.sha256(json.dumps(graph,sort_keys=True).encode()).hexdigest(),
            'scope': 'CMake Unix Makefiles timestamp dependency contract; no build or product execution',
            'observer': 'not prebuilt product dependency unless present in compiler depfiles; wrapper compiles current observer sources after this guard'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--build', required=True)
    parser.add_argument('--expected-product-sha256')
    parser.add_argument('--expected-runtime-sha256')
    args = parser.parse_args()
    try:
        result = check(args.repo, args.build, args.expected_product_sha256, args.expected_runtime_sha256)
        code = 0
    except (OSError, ValueError, KeyError, IndexError) as error:
        result = {'schema': 'media-server.build-freshness.v1', 'status': 'HOLD_BUILD_DEPENDENCY_UNVERIFIED',
                  'error': str(error)}
        code = 1
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return code


if __name__ == '__main__':
    sys.exit(main())
