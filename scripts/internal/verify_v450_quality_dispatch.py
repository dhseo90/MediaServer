#!/usr/bin/env python3
# 파일 용도: 기존 Python wrapper의 실제 dispatch 문장을 subprocess 대역으로 검사한다. 모델 실행은 없다.
import ast, json, pathlib, subprocess, types, time, os, sys

repo=pathlib.Path(__file__).resolve().parents[2]
source=(repo/'scripts/internal/verify_va_review.sh').read_text().split("<<'PY'\n",1)[1].rsplit('\nPY',1)[0]
tree=ast.parse(source)
dispatch=next(n for n in ast.walk(tree) if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='focused_result' for t in n.targets))
guard=next(n for n in ast.walk(tree) if isinstance(n,ast.If) and ast.unparse(n.test)=='visual_local and focused_result.returncode')
modes=json.loads(sys.argv[1])
for mode in modes:
    calls=[]
    def run(args,**kwargs):
        calls.append(args)
        assert args[-2]==mode
        if kwargs['check']:raise subprocess.CalledProcessError(7,args)
        return subprocess.CompletedProcess(args,7)
    env=dict(subprocess=types.SimpleNamespace(run=run),os=os,time=time,root=pathlib.Path('/unused'),repo=repo,endpoint='unused',sys=types.SimpleNamespace(argv=['wrapper','repo',mode,'unused']),stage_deadline=time.monotonic()+800)
    for key in ('contract','cause_offline','core_only','questions_only','materials_only','rephrase_only','visual_only','visual_regression'):env[key]=False
    env.update(local=mode!='--local-lifecycle',lifecycle=mode=='--local-lifecycle',visual_local=mode=='--visual-local')
    try:
        exec(compile(ast.Module(body=[dispatch,guard],type_ignores=[]),'actual-wrapper-dispatch','exec'),env)
        raise AssertionError('quality failure swallowed')
    except subprocess.CalledProcessError as error:assert error.returncode==7
    except RuntimeError as error:assert mode=='--visual-local' and 'original exit=7' in str(error)
    assert len(calls)==1
print('[pass] explicit quality dispatch failure preserved for '+str(len(modes))+' modes; model cases not-run (subprocess double)')
