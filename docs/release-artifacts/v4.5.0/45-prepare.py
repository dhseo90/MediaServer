# 파일 용도: 승인된 별도 runtime과 후보 한 종의 확보·metadata·소유 서버 정리 기록.
import hashlib, json, os, pathlib, signal, socket, subprocess, time, urllib.request
repo = pathlib.Path(__file__).resolve().parents[3]
out = repo / 'docs/release-artifacts/v4.5.0'
owned = repo / 'models/v450-question-eval'
binary = owned / 'ollama-v0.35.1/ollama'
models = owned / 'models'
models.mkdir(exist_ok=False)
expected = hashlib.sha256((out / '44-registry-9b.json').read_bytes()).hexdigest()
sock = socket.socket(); sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]; sock.close()
endpoint = f'http://127.0.0.1:{port}'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
def save(name, value):
    with (out / name).open('x') as f:
        json.dump(value, f, ensure_ascii=False, indent=2); f.write('\n')
def call(route, data=None, timeout=2):
    request = urllib.request.Request(endpoint + route, None if data is None else json.dumps(data).encode(), headers={'Content-Type':'application/json'})
    with opener.open(request, timeout=timeout) as response: return response.read()
server = None; cleanup = {}; started = time.monotonic()
log = (out / '45-prepare-server.log').open('xb')
try:
    env = dict(os.environ, OLLAMA_HOST=f'127.0.0.1:{port}', OLLAMA_MODELS=str(models), OLLAMA_NO_CLOUD='1', OLLAMA_NOPRUNE='true')
    server = subprocess.Popen([str(binary), 'serve'], env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    save('45-prepare-owner.json', {'pid':server.pid, 'endpoint':endpoint, 'binary':str(binary), 'binarySha256':hashlib.sha256(binary.read_bytes()).hexdigest(), 'models':str(models)})
    deadline = time.monotonic() + 15
    while True:
        if server.poll() is not None: raise RuntimeError('owned server exited')
        try: version = json.loads(call('/api/version')); break
        except OSError:
            if time.monotonic() >= deadline: raise
            time.sleep(.1)
    assert version == {'version':'0.35.1'}, version
    assert json.loads(call('/api/ps'))['models'] == []
    for name, args, timeout in [('version', [str(binary), '--version'], 10), ('pull', [str(binary), 'pull', 'qwen3.5:9b'], 1200)]:
        command_start = time.monotonic()
        with (out / f'45-{name}.log').open('xb') as f:
            result = subprocess.run(args, env=env, stdout=f, stderr=subprocess.STDOUT, timeout=timeout)
        save(f'45-{name}-command.json', {'command':args, 'exit':result.returncode, 'elapsedSeconds':time.monotonic()-command_start})
        if result.returncode: raise RuntimeError(name + ' failed; no retry')
    tags_raw = call('/api/tags'); (out / '45-model-tags.json').write_bytes(tags_raw)
    model = next(m for m in json.loads(tags_raw)['models'] if m['name'] == 'qwen3.5:9b')
    show_raw = call('/api/show', {'model':'qwen3.5:9b'}, 20); (out / '45-model-show.json').write_bytes(show_raw)
    manifest = models / 'manifests/registry.ollama.ai/library/qwen3.5/9b'
    (out / '45-pulled-manifest.json').write_bytes(manifest.read_bytes())
    assert model['digest'] == expected and hashlib.sha256(manifest.read_bytes()).hexdigest() == expected, 'candidate manifest changed'
    assert model['details']['quantization_level'] == 'Q4_K_M'
    save('45-model.json', {'model':model, 'runtime':version, 'modelPath':str(models), 'showSha256':hashlib.sha256(show_raw).hexdigest(), 'generationCalls':0})
    print('[prepared]', model['digest'], flush=True)
finally:
    if server:
        try: cleanup['postRunModels'] = json.loads(call('/api/ps'))['models']
        except Exception as e: cleanup['psError'] = type(e).__name__
        server.terminate()
        try: server.wait(timeout=5); cleanup['forced'] = False
        except subprocess.TimeoutExpired: os.killpg(server.pid, signal.SIGKILL); server.wait(timeout=5); cleanup['forced'] = True
        cleanup['exit'] = server.returncode
        try: os.killpg(server.pid, 0); cleanup['groupAbsent'] = False
        except ProcessLookupError: cleanup['groupAbsent'] = True
    log.close()
    with socket.socket() as probe: cleanup['portClosed'] = probe.connect_ex(('127.0.0.1', port)) != 0
    cleanup['elapsedSeconds'] = time.monotonic() - started
    save('45-prepare-cleanup.json', cleanup); print('[cleanup]', cleanup, flush=True)
assert cleanup.get('postRunModels') == [] and cleanup['groupAbsent'] and cleanup['portClosed'] and not cleanup['forced']
