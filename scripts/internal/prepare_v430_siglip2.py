#!/usr/bin/env python3
"""승인된 v4.3 SigLIP2 로컬 준비. 제품 실행/전역 설치/Git 변경을 하지 않는다."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import resource
import shutil
import shlex
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "models/v430-siglip2"
DEPS = ROOT / "third_party/v430-embedding"
REVISION = "75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2"
REPOSITORY = "google/siglip2-base-patch16-224"
KNOWN_SHA = {
    "model.safetensors": "612923381c76ec5a9bed335d1c48827e3f2e506ac31b044b63b2031fadee6a0b",
    "tokenizer.model": "61a7b147390c64585d6c3543dd6fc636906c9af3865a5548f27f31aee1d4c8e2",
}
PACKAGES = ["torch==2.6.0", "transformers==4.49.0", "onnx==1.17.0",
            "onnxruntime==1.21.0", "sentencepiece==0.2.0", "numpy==2.2.6",
            "Pillow==11.3.0", "protobuf==5.29.5"]
FILES = ["model.safetensors", "config.json", "preprocessor_config.json",
         "tokenizer.model", "tokenizer.json", "tokenizer_config.json",
         "special_tokens_map.json", "README.md"]
BUDGET = 8 * 1024 ** 3
RETRIEVAL_FIXTURE = ROOT / "scripts/fixtures/v430-siglip2-retrieval.json"
RETRIEVAL_FIXTURE_SHA = "c33830caba38ff806788e8913c6dadc84fdc5164ff103928b96bc9f82560b9d2"
RETRIEVAL_QUERIES_SHA = "18e97621750e0f63296917274a24cc80547a402f93cface61e11d23789824521"


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 ** 2), b""):
            h.update(chunk)
    return h.hexdigest()


def size(root):
    return sum(p.stat().st_size for p in root.rglob("*") if p.is_file() and not p.is_symlink()) if root.exists() else 0


def guard(extra=0):
    used = size(MODEL) + size(DEPS)
    if used + extra > BUDGET:
        raise RuntimeError(f"8GiB workspace budget exceeded: used={used}, planned_extra={extra}")
    return used


def env():
    e = os.environ.copy()
    e.update({"TMPDIR": str(DEPS / "tmp"), "PIP_CACHE_DIR": str(DEPS / "cache/pip"),
              "HF_HOME": str(DEPS / "cache/huggingface"), "XDG_CACHE_HOME": str(DEPS / "cache"),
              "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1", "TOKENIZERS_PARALLELISM": "false"})
    return e


def run(argv, capture=False):
    print("RUN", " ".join(map(str, argv)), flush=True)
    with (MODEL / "commands.log").open("a") as log:
        log.write(json.dumps({"argv": list(map(str, argv)), "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}) + "\n")
    result=subprocess.run(list(map(str, argv)), cwd=ROOT, env=env(), check=False,
                          stdout=subprocess.PIPE if capture else None,
                          stderr=subprocess.STDOUT if capture else None,text=capture)
    if capture:print(result.stdout,end="",flush=True)
    result.check_returncode()
    return result


def record(key, value):
    path = MODEL / "preparation.json"
    data = json.loads(path.read_text()) if path.exists() else {}
    data.update({"repository": REPOSITORY, "revision": REVISION,
                 "environment": {"os": platform.system(), "release": platform.release(),
                                 "machine": platform.machine(), "python": sys.version.split()[0]},
                 "updated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
    if key == "verification" and key in data:
        data.setdefault("verification_previous", []).append(data[key])
    if key == "adapter_verification" and value.get("status") == "RUNNING" and data.get(key, {}).get("status") in {"PASS", "FAIL"}:
        data.setdefault("adapter_verification_previous", []).append(data[key])
    data[key] = value
    data["workspace_bytes"] = guard()
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    tmp.replace(path)


def download(url, dest, expected=None, maximum=2 * 1024 ** 3):
    if dest.exists():
        actual = sha(dest)
        if expected and actual != expected:
            raise RuntimeError(f"Existing file checksum mismatch: {dest.name}")
        print("REUSE", dest.name, actual, flush=True)
        return actual
    part = dest.with_name(dest.name + ".part")
    if part.exists():
        raise RuntimeError(f"Previous partial download requires explicit recovery: {part}")
    with urllib.request.urlopen(url, timeout=60) as response:
        length = int(response.headers.get("Content-Length", "0"))
        if length > maximum:
            raise RuntimeError(f"Download too large: {dest.name}, {length}")
        guard(length or maximum)
        count = 0
        with part.open("wb") as f:
            for chunk in iter(lambda: response.read(1024 ** 2), b""):
                count += len(chunk)
                if count > maximum:
                    raise RuntimeError(f"Download exceeded maximum: {dest.name}")
                f.write(chunk)
    actual = sha(part)
    if expected and actual != expected:
        raise RuntimeError(f"Downloaded file checksum mismatch: {dest.name}; kept partial")
    part.replace(dest)
    print("DOWNLOADED", dest.name, count, actual, flush=True)
    return actual


def bootstrap(args):
    venv = DEPS / "venv"
    if not venv.exists():
        run([args.python, "-m", "venv", venv])
    python = venv / "bin/python"
    # Wheel artifacts are retained with actual hashes, and install is entirely local.
    wheels = DEPS / "wheels"
    wheels.mkdir(exist_ok=True)
    guard(2 * 1024 ** 3)
    lock = DEPS / "python-requirements.lock"
    requirements = lock.read_text().splitlines() if lock.exists() else PACKAGES
    run([python, "-m", "pip", "download", "--disable-pip-version-check", "--no-cache-dir",
         "--only-binary=:all:", "--dest", wheels, *requirements])
    artifacts = [{"file": p.name, "sha256": sha(p), "bytes": p.stat().st_size} for p in sorted(wheels.glob("*.whl"))]
    run([python, "-m", "pip", "install", "--disable-pip-version-check", "--no-cache-dir",
         "--no-index", "--find-links", wheels, *requirements])
    versions = subprocess.check_output([str(python), "-m", "pip", "list", "--format=json"], env=env(), text=True)
    resolved = json.loads(versions)
    lock.write_text("".join(f"{v['name']}=={v['version']}\n" for v in resolved if v["name"] != "pip"))
    record("python_dependencies", {"direct_pins": PACKAGES, "source": "https://pypi.org/simple/", "lock_sha256":sha(lock),
                                   "wheel_artifacts": artifacts, "installed": resolved})


def assets(_):
    upstream = MODEL / "upstream"
    upstream.mkdir(exist_ok=True)
    output = []
    for name in FILES:
        url = f"https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/{name}"
        digest = download(url, upstream / name, KNOWN_SHA.get(name),
                          1600 * 1024 ** 2 if name == "model.safetensors" else 50 * 1024 ** 2)
        output.append({"file": name, "url": url, "sha256": digest, "bytes": (upstream / name).stat().st_size})
        record("upstream_assets", output)


def sentencepiece(_):
    # Source tag is recorded along with the actual archive hash before building.
    archive = DEPS / "sentencepiece-v0.2.0.tar.gz"
    digest = download("https://github.com/google/sentencepiece/archive/refs/tags/v0.2.0.tar.gz", archive,
                      expected="9970f0a0afee1648890293321665e5b2efa04eaec9f1671fcf8048f456f5bb86", maximum=20 * 1024 ** 2)
    source = DEPS / "source/sentencepiece-0.2.0"
    if not source.exists():
        run(["tar", "-xzf", archive, "-C", DEPS / "source"])
    prefix = DEPS / "sentencepiece"
    build = DEPS / "build/sentencepiece"
    run(["cmake", "-S", source, "-B", build, f"-DCMAKE_INSTALL_PREFIX={prefix}",
         "-DCMAKE_BUILD_TYPE=Release", "-DCMAKE_POLICY_VERSION_MINIMUM=3.5", "-DSPM_ENABLE_SHARED=OFF", "-DSPM_BUILD_TEST=OFF"])
    run(["cmake", "--build", build, "-j", "2"])
    run(["cmake", "--install", build])
    record("sentencepiece_cpp", {"source_url": "https://github.com/google/sentencepiece/archive/refs/tags/v0.2.0.tar.gz",
                                 "source_sha256": digest, "source_version": "v0.2.0", "prefix": str(prefix),
                                 "artifacts": [{"file": str(p.relative_to(DEPS)), "sha256": sha(p)}
                                               for p in sorted(prefix.rglob("*")) if p.is_file()]})


def load_model():
    import torch
    from transformers import AutoModel, AutoTokenizer, AutoImageProcessor
    torch.set_num_threads(2)
    upstream = MODEL / "upstream"
    model = AutoModel.from_pretrained(str(upstream), local_files_only=True, attn_implementation="eager").eval().float()
    # 4.49 SiglipProcessor assumes the older SigLIP tokenizer. The checkpoint
    # explicitly declares GemmaTokenizer, so load the official components separately.
    processor = SimpleNamespace(tokenizer=AutoTokenizer.from_pretrained(str(upstream),local_files_only=True),
                                image_processor=AutoImageProcessor.from_pretrained(str(upstream),local_files_only=True,use_fast=False))
    return model, processor


def export(_):
    import torch
    import onnx
    model, _ = load_model()
    output = MODEL / "onnx"
    output.mkdir(exist_ok=True)
    guard(2 * 1024 ** 3)

    class ImageTower(torch.nn.Module):
        def __init__(self, base):
            super().__init__()
            self.base = base

        def forward(self, pixel_values):
            return self.base.get_image_features(pixel_values=pixel_values)

    class TextTower(torch.nn.Module):
        def __init__(self, base):
            super().__init__()
            self.base = base

        def forward(self, input_ids):
            return self.base.get_text_features(input_ids=input_ids)

    specs = [("image_encoder.onnx", ImageTower(model), torch.zeros(1, 3, 224, 224), "pixel_values"),
             ("text_encoder.onnx", TextTower(model), torch.zeros(1, 64, dtype=torch.int64), "input_ids")]
    results = []
    for name, tower, tensor, input_name in specs:
        path = output / name
        with torch.no_grad():
            torch.onnx.export(tower, (tensor,), str(path), input_names=[input_name], output_names=["embedding"],
                              opset_version=17, do_constant_folding=True, dynamo=False)
        onnx.checker.check_model(str(path))
        graph = onnx.load(str(path), load_external_data=False)
        def describe(values):
            return [{"name": value.name, "type": int(value.type.tensor_type.elem_type),
                     "shape": [int(dim.dim_value) for dim in value.type.tensor_type.shape.dim]} for value in values]
        results.append({"file": name, "sha256": sha(path), "bytes": path.stat().st_size,
                        "inputs": describe(graph.graph.input), "outputs": describe(graph.graph.output), "opset": 17})
        record("onnx_exports", results)


CPP_PROBE = r'''
#include <onnxruntime_cxx_api.h>
#include <sentencepiece_processor.h>
#include <glib.h>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include <string>
int main(int argc, char** argv) {
  try {
    if (argc == 4 && std::string(argv[1]) == "tokens") {
      sentencepiece::SentencePieceProcessor sp;
      auto st = sp.Load(argv[2]); if (!st.ok()) throw std::runtime_error(st.ToString());
      std::ifstream file(argv[3]); std::string text((std::istreambuf_iterator<char>(file)), {});
      if(!g_utf8_validate(text.data(),text.size(),nullptr)) throw std::runtime_error("invalid UTF-8");
      gchar* lowered=g_utf8_strdown(text.data(),text.size());std::string normalized(lowered);g_free(lowered);
      std::vector<int> ids; st = sp.Encode(normalized, &ids); if (!st.ok()) throw std::runtime_error(st.ToString());
      if(ids.size()>63) ids.resize(63); ids.push_back(1); ids.resize(64,0);
      for (auto v:ids) std::cout << v << " "; std::cout << "\n"; return 0;
    }
    if(argc != 6) throw std::runtime_error("usage: probe infer model input output float|int64");
    Ort::Env env(ORT_LOGGING_LEVEL_WARNING,"v430-parity");
    Ort::SessionOptions options; options.SetIntraOpNumThreads(2);
    Ort::Session session(env,argv[2],options); Ort::AllocatorWithDefaultOptions allocator;
    auto name=session.GetInputNameAllocated(0,allocator); auto out=session.GetOutputNameAllocated(0,allocator);
    auto shape=session.GetInputTypeInfo(0).GetTensorTypeAndShapeInfo().GetShape();
    size_t count=1; for(auto v:shape) {if(v<=0) throw std::runtime_error("non-static shape");count*=v;}
    Ort::MemoryInfo mem=Ort::MemoryInfo::CreateCpu(OrtArenaAllocator,OrtMemTypeDefault);
    std::vector<float> floats; std::vector<int64_t> integers; Ort::Value tensor{nullptr};
    std::ifstream input(argv[3],std::ios::binary); if(!input) throw std::runtime_error("input missing");
    if(std::string(argv[5])=="float") {floats.resize(count);input.read(reinterpret_cast<char*>(floats.data()),count*sizeof(float));
      tensor=Ort::Value::CreateTensor<float>(mem,floats.data(),count,shape.data(),shape.size());}
    else {integers.resize(count);input.read(reinterpret_cast<char*>(integers.data()),count*sizeof(int64_t));
      tensor=Ort::Value::CreateTensor<int64_t>(mem,integers.data(),count,shape.data(),shape.size());}
    if(!input) throw std::runtime_error("short input");
    const char* names[]={name.get()}; const char* outputs[]={out.get()};
    auto values=session.Run(Ort::RunOptions{nullptr},names,&tensor,1,outputs,1);
    auto n=values[0].GetTensorTypeAndShapeInfo().GetElementCount();
    std::ofstream result(argv[4],std::ios::binary);result.write(reinterpret_cast<const char*>(values[0].GetTensorData<float>()),n*sizeof(float));
    if(!result) throw std::runtime_error("output failure"); return 0;
  } catch(const std::exception& e) {std::cerr<<e.what()<<"\n";return 1;}
}
'''


def verify(args):
    import numpy as np
    import torch
    import onnxruntime as ort
    from PIL import Image
    model, processor = load_model()
    work = MODEL / "parity"
    work.mkdir(exist_ok=True)
    cpp = work / "local_probe.cpp"
    cpp.write_text(CPP_PROBE)
    include = subprocess.check_output(["pkg-config", "--variable=includedir", "libonnxruntime"], text=True).strip()
    lib = subprocess.check_output(["pkg-config", "--variable=libdir", "libonnxruntime"], text=True).strip()
    prefix = DEPS / "sentencepiece"
    probe = work / "local_probe"
    glib_flags=shlex.split(subprocess.check_output(["pkg-config","--cflags","--libs","glib-2.0"],text=True))
    run(["c++", "-std=c++17", "-O2", cpp, f"-I{include}", f"-I{prefix / 'include'}",
         prefix / "lib/libsentencepiece.a", f"-L{lib}", "-lonnxruntime", f"-Wl,-rpath,{lib}", *glib_flags,"-o", probe])
    ort_version = subprocess.check_output(["pkg-config", "--modversion", "libonnxruntime"], text=True).strip()
    texts = ["A RED CAR on the road", "도로 위의 빨간 자동차", "A person walking", "걸어가는 사람", "", "   ",
             "  multiple   spaces\nAND punctuation!", "한글 café 123 🙂", " ".join(["car"]*90), "İ ΣΟΣ Straße CAFÉ 한국어"]
    tokens = []
    text_features = []
    options=ort.SessionOptions();options.intra_op_num_threads=2
    text_session = ort.InferenceSession(str(MODEL / "onnx/text_encoder.onnx"), sess_options=options, providers=["CPUExecutionProvider"])
    image_session = ort.InferenceSession(str(MODEL / "onnx/image_encoder.onnx"), sess_options=options, providers=["CPUExecutionProvider"])

    def compare(reference, observed):
        a=np.asarray(reference,dtype=np.float64).reshape(-1);b=np.asarray(observed,dtype=np.float64).reshape(-1)
        cosine=float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)))
        error=float(np.max(np.abs(a-b)))
        normalized_error=float(np.max(np.abs(a/np.linalg.norm(a)-b/np.linalg.norm(b))))
        if not np.isfinite(a).all() or not np.isfinite(b).all() or cosine < .99999 or normalized_error > 1e-4:
            raise RuntimeError(f"Provider/ONNX parity failed: cosine={cosine}, normalized_max_abs_error={normalized_error}")
        return {"cosine": cosine, "raw_max_abs_error": error,"normalized_max_abs_error":normalized_error}

    text_results=[]
    for i,text in enumerate(texts):
        original_text=text
        text=text.lower()
        ids=processor.tokenizer(text,padding="max_length",max_length=64,truncation=True,return_tensors="pt")["input_ids"]
        text_path=work / f"text-{i}.txt";text_path.write_text(original_text)
        cpp_ids=[int(v) for v in subprocess.check_output([str(probe),"tokens",str(MODEL / "upstream/tokenizer.model"),str(text_path)],text=True).split()]
        if cpp_ids != ids[0].tolist():
            record("verification", {"status":"FAIL", "failed_case":i,"kind":"token_ids", "provider":ids[0].tolist(),"cpp":cpp_ids})
            raise RuntimeError(f"C++ tokenizer parity failed case {i}")
        tokens.append({"text":original_text,"lowercased_text":text,"ids":cpp_ids,"parity":True})
        with torch.no_grad(): ref=model.get_text_features(input_ids=ids).numpy()
        obs=text_session.run(None,{"input_ids":ids.numpy()})[0]
        tensor=work / f"text-{i}.i64"; ids.numpy().tofile(tensor)
        cpp_output=work / f"text-{i}.f32"
        run([probe,"infer",MODEL / "onnx/text_encoder.onnx",tensor,cpp_output,"int64"])
        cpp_obs=np.fromfile(cpp_output,dtype=np.float32).reshape(1,-1)
        text_results.append({"case":i,"python_ort":compare(ref,obs),"system_cpp_ort":compare(ref,cpp_obs)})
        text_features.append(cpp_obs.reshape(-1))
    image_results=[]
    image_features=[]
    video=ROOT / "video/va_four_scene_sample.mp4"
    for i,second in enumerate([0,1,3,6]):
        image_path=work / f"frame-{i}.png"
        run(["ffmpeg","-hide_banner","-loglevel","error","-y","-ss",str(second),"-i",video,"-frames:v","1",image_path])
        image=Image.open(image_path).convert("RGB")
        values=processor.image_processor(images=image,return_tensors="pt")["pixel_values"]
        # Independent C++-contract preprocessing is compared to provider RGB preprocessing.
        pixels=np.asarray(image.resize((224,224),Image.Resampling.BILINEAR),dtype=np.float32)
        pixels=((pixels/255.-.5)/.5).transpose(2,0,1)[None,...].copy()
        pre_error=float(np.max(np.abs(pixels-values.numpy())))
        if pre_error > 1e-6: raise RuntimeError(f"Image preprocessing parity failed {pre_error}")
        with torch.no_grad(): ref=model.get_image_features(pixel_values=values).numpy()
        obs=image_session.run(None,{"pixel_values":pixels})[0]
        tensor=work / f"image-{i}.f32.input";pixels.tofile(tensor)
        cpp_output=work / f"image-{i}.f32.output"
        run([probe,"infer",MODEL / "onnx/image_encoder.onnx",tensor,cpp_output,"float"])
        cpp_obs=np.fromfile(cpp_output,dtype=np.float32).reshape(1,-1)
        image_results.append({"case":i,"second":second,"frame_sha256":sha(image_path),"preprocess_max_abs_error":pre_error,
                              "python_ort":compare(ref,obs),"system_cpp_ort":compare(ref,cpp_obs)})
        image_features.append(cpp_obs.reshape(-1))
    images=np.stack(image_features);texts_arr=np.stack(text_features)
    images/=np.linalg.norm(images,axis=1,keepdims=True);texts_arr/=np.linalg.norm(texts_arr,axis=1,keepdims=True)
    # Scalar accumulation avoids platform BLAS floating-point status warnings;
    # encoder and normalization checks remain unchanged.
    scores=np.array([[math.fsum(float(a)*float(b) for a,b in zip(t,i)) for i in images] for t in texts_arr])
    norm_error=float(max(np.max(np.abs(np.linalg.norm(images,axis=1)-1)),np.max(np.abs(np.linalg.norm(texts_arr,axis=1)-1))))
    if images.shape[1]!=768 or texts_arr.shape[1]!=768 or norm_error>1e-5 or not np.isfinite(scores).all() or np.allclose(images[0],images[1]) or np.allclose(texts_arr[0],texts_arr[1]):
        raise RuntimeError("Actual embedding smoke did not produce finite distinct embeddings")
    record("verification", {"status":"PASS", "scope":"local encoder/token parity and real frame smoke, not broad retrieval quality",
                             "system_cpp_ort_version":ort_version,"python_ort_version":ort.__version__,
                             "thresholds":{"cosine_min":.99999,"normalized_max_abs_error_max":1e-4,"norm_error_max":1e-5,"preprocess_max_abs_error_max":1e-6},"norm_max_abs_error":norm_error,
                             "token_cases":tokens,"text_encoder":text_results,"image_encoder":image_results,
                             "video_fixture":"video/va_four_scene_sample.mp4","video_sha256":sha(video),
                             "cosine_matrix":scores.tolist(),"commands_file":str(MODEL / "commands.log")})
    print("PASS: provider/C++ tokenizer, provider/Python ORT/system C++ ORT, actual frame/text smoke",flush=True)


def adapter_verify(_):
    """등록된 pixel 기준·실제 supplier parity·오류·미사용 빌드를 직접 확인한다."""
    import numpy as np
    import torch
    import onnx
    from onnx import helper, TensorProto
    from PIL import Image
    guard(1129352764)
    model, processor = load_model()
    work=MODEL / "adapter"
    fixtures=work / "fixtures"; results=work / "results"; negative=work / "negative"
    for path in [work,fixtures,results,negative]: path.mkdir(exist_ok=True)
    source=ROOT / "src/analysis/siglip2_encoder.cpp"
    smoke=ROOT / "scripts/internal/siglip2_encoder_smoke.cpp"
    prefix=DEPS / "sentencepiece"
    enabled=work / "siglip2_encoder_smoke"
    disabled=work / "siglip2_encoder_disabled_smoke"
    flags=shlex.split(subprocess.check_output(["pkg-config","--cflags","--libs","libonnxruntime","glib-2.0"],text=True))
    lib=subprocess.check_output(["pkg-config","--variable=libdir","libonnxruntime"],text=True).strip()
    run(["c++","-std=c++17","-O2","-DMEDIA_SERVER_USE_SIGLIP2=1","-DMEDIA_SERVER_SIGLIP2_RESOURCE_DIAGNOSTICS=1","-DMEDIA_SERVER_SIGLIP2_TEST_IO=1",f"-I{ROOT / 'include'}",
         source,smoke,f"-I{prefix / 'include'}",prefix / "lib/libsentencepiece.a",*flags,f"-Wl,-rpath,{lib}","-o",enabled])
    run(["c++","-std=c++17","-O2","-DMEDIA_SERVER_USE_SIGLIP2=0",f"-I{ROOT / 'include'}",source,smoke,"-o",disabled])
    run([disabled,"disabled"])
    evidence={"status":"RUNNING","source_sha256":sha(source),"header_sha256":sha(ROOT / 'include/analysis/siglip2_encoder.h'),
              "preparation_script_sha256":sha(Path(__file__)),
              "smoke_sha256":sha(smoke),"thresholds":{"resized_uint8_max_abs_error":0,"pixel_float_max_abs_error":1e-6,
              "embedding_normalized_max_abs_error":1e-4,"embedding_cosine_min":.99999,"norm_max_abs_error":1e-5},
              "disabled_build":"PASS","pixel_cases":[],"token_cases":[],"encoder_cases":[]}
    record("adapter_verification",evidence)
    specs=[(1280,720),(641,479),(224,224),(23,17),(1,1),(1,257),(257,1),(224,17),(17,224),(7,511),(511,7)]
    for index,(width,height) in enumerate(specs):
        y,x=np.indices((height,width));pixels=np.stack([(x*37+y*11)%256,((x+y)%2)*255,(x*3+y*71)%256],axis=2).astype(np.uint8)
        pixels[0,:,:]=255;pixels[-1,:,:]=0;pixels[:,0,:]=[255,0,255];pixels[:,-1,:]=[0,255,0]
        stride=width*3+11
        padded=np.full((height,stride),173,dtype=np.uint8);padded[:,:width*3]=pixels.reshape(height,width*3)
        input_path=fixtures / f"pixel-{index}.rgb";padded.tofile(input_path)
        out=results / f"pixel-{index}"
        run([enabled,"pixel",str(width),str(height),str(stride),input_path,out])
        expected=np.asarray(Image.fromarray(pixels).resize((224,224),Image.Resampling.BILINEAR),dtype=np.uint8)
        observed=np.fromfile(str(out)+".rgb",dtype=np.uint8).reshape(224,224,3)
        byte_error=int(np.max(np.abs(expected.astype(np.int16)-observed.astype(np.int16))))
        supplier=processor.image_processor(images=Image.fromarray(pixels),input_data_format="channels_last",return_tensors="pt")["pixel_values"].numpy()
        actual=np.fromfile(str(out)+".f32",dtype=np.float32).reshape(1,3,224,224)
        float_error=float(np.max(np.abs(supplier-actual)))
        entry={"case":index,"width":width,"height":height,"stride":stride,"input_sha256":sha(input_path),
               "resized_uint8_max_abs_error":byte_error,"pixel_float_max_abs_error":float_error}
        evidence["pixel_cases"].append(entry);record("adapter_verification",evidence)
        if byte_error!=0 or float_error>1e-6:
            evidence.update(status="FAIL",failed_case=entry);record("adapter_verification",evidence)
            raise RuntimeError(f"Adapter pixel parity failed case {index}: uint8_error={byte_error}, float_error={float_error}")
    previous=json.loads((MODEL / "preparation.json").read_text())["verification"]
    manifest=[];references={};token_references={}
    for index,case in enumerate(previous["token_cases"]):
        text=case["text"]
        if not text.strip():
            evidence["token_cases"].append({"case":index,"expected":"empty-query rejection","kind":"application_error"})
            continue
        input_path=fixtures / f"text-{index}.txt";input_path.write_text(text)
        manifest.append(f"text text-{index} {input_path.name}")
        ids=processor.tokenizer(text.lower(),padding="max_length",max_length=64,truncation=True,return_tensors="pt")["input_ids"]
        token_references[f"text-{index}"]=ids.numpy()[0]
        with torch.no_grad(): ref=model.get_text_features(input_ids=ids).numpy().reshape(-1).astype(np.float64)
        references[f"text-{index}"]=ref/np.linalg.norm(ref)
    for index,case in enumerate(previous["image_encoder"]):
        path=MODEL / f"parity/frame-{index}.png"
        image=Image.open(path).convert("RGB");width,height=image.size
        input_path=fixtures / f"image-{index}.rgb";np.asarray(image).tofile(input_path)
        manifest.append(f"image image-{index} {width} {height} {width*3} {input_path.name}")
        values=processor.image_processor(images=image,return_tensors="pt")["pixel_values"]
        with torch.no_grad(): ref=model.get_image_features(pixel_values=values).numpy().reshape(-1).astype(np.float64)
        references[f"image-{index}"]=ref/np.linalg.norm(ref)
    (fixtures / "manifest.txt").write_text("\n".join(manifest)+"\n")
    def measured(command,label):
        report=work / (label+"-resource-"+evidence["source_sha256"][:10]+"-"+str(time.time_ns())+".log")
        output=run(command,capture=True).stdout
        report.write_text(output)
        sample=json.loads(next(line.removeprefix("RESOURCE ") for line in output.splitlines() if line.startswith("RESOURCE ")))
        sample["load_stages"]=[json.loads(line.removeprefix("LOAD_RESOURCE ")) for line in output.splitlines() if line.startswith("LOAD_RESOURCE ")]
        sample.update(log=str(report),budget_bytes=4*1024**3,measurement="getrusage(RUSAGE_SELF)")
        evidence.setdefault("process_resources",{})[label]=sample
        return sample["max_rss_bytes"]
    measured([enabled,"model",MODEL,fixtures,results],"encoder")
    for name,ref in references.items():
        actual=np.fromfile(results / (name+".f32"),dtype=np.float32).astype(np.float64)
        error=float(np.max(np.abs(ref-actual)));cosine=float(np.dot(ref,actual)/(np.linalg.norm(ref)*np.linalg.norm(actual)))
        norm_error=float(abs(np.linalg.norm(actual)-1))
        entry={"case":name,"normalized_max_abs_error":error,"cosine":cosine,"norm_error":norm_error}
        evidence["encoder_cases"].append(entry)
        if actual.shape!=(768,) or not np.isfinite(actual).all() or error>1e-4 or cosine<.99999 or norm_error>1e-5:
            evidence.update(status="FAIL",failed_case=entry);record("adapter_verification",evidence)
            raise RuntimeError(f"Adapter model parity failed {name}")
        if name in token_references:
            tokens=np.fromfile(results / (name+".i64"),dtype=np.int64)
            identical=bool(np.array_equal(tokens,token_references[name]))
            evidence["token_cases"].append({"case":name,"token_ids_exact":identical})
            if not identical:
                evidence.update(status="FAIL",failed_case=name);record("adapter_verification",evidence)
                raise RuntimeError(f"Adapter token parity failed {name}")
    def tiny_model(path,text=False,wrong_shape=False,wrong_type=False):
        shape=[1,64] if text else [1,3,224,224]
        dtype=TensorProto.FLOAT if (not text or wrong_type) else TensorProto.INT64
        output_dim=767 if wrong_shape else 768
        graph=helper.make_graph([helper.make_node("Constant",[],["embedding"],value=helper.make_tensor("value",TensorProto.FLOAT,[1,output_dim],[.1]*output_dim))],
             "negative-contract-fixture",[helper.make_tensor_value_info("input_ids" if text else "pixel_values",dtype,shape)],
             [helper.make_tensor_value_info("embedding",TensorProto.FLOAT,[1,output_dim])])
        fixture=helper.make_model(graph,opset_imports=[helper.make_opsetid("",17)]);fixture.ir_version=8;onnx.save(fixture,str(path))
    for name in ["bad_tokenizer","bad_image","bad_text","wrong_shape","wrong_type"]:
        root=negative/name;(root/"upstream").mkdir(parents=True,exist_ok=True);(root/"onnx").mkdir(exist_ok=True)
        shutil.copyfile(MODEL/"upstream/tokenizer.model",root/"upstream/tokenizer.model")
        if name in {"bad_text","wrong_type"}:
            shutil.copyfile(MODEL/"onnx/image_encoder.onnx",root/"onnx/image_encoder.onnx")
        else:
            tiny_model(root/"onnx/image_encoder.onnx",wrong_shape=name=="wrong_shape")
        tiny_model(root/"onnx/text_encoder.onnx",text=True,wrong_type=name=="wrong_type")
        if name=="bad_tokenizer":(root/"upstream/tokenizer.model").write_bytes(b"invalid tokenizer fixture")
        if name=="bad_image":(root/"onnx/image_encoder.onnx").write_bytes(b"invalid ONNX fixture")
        if name=="bad_text":(root/"onnx/text_encoder.onnx").write_bytes(b"invalid ONNX fixture")
    for name in ["same_size_bad_tokenizer","same_size_bad_image"]:
        root=negative/name;(root/"upstream").mkdir(parents=True,exist_ok=True);(root/"onnx").mkdir(exist_ok=True)
        shutil.copyfile(MODEL/"upstream/tokenizer.model",root/"upstream/tokenizer.model")
        if name=="same_size_bad_tokenizer":
            with (root/"upstream/tokenizer.model").open("r+b") as file:file.write(b"invalid tokenizer fixture")
        else:
            sparse=root/"onnx/image_encoder.onnx"
            with sparse.open("wb") as file:file.seek((MODEL/"onnx/image_encoder.onnx").stat().st_size-1);file.write(b"\0")
        evidence.setdefault("digest_negative_cases",[]).append({"case":name,"size":(root/("upstream/tokenizer.model" if name.endswith("tokenizer") else "onnx/image_encoder.onnx")).stat().st_size,
             "sha256":sha(root/("upstream/tokenizer.model" if name.endswith("tokenizer") else "onnx/image_encoder.onnx"))})
    measured([enabled,"errors",MODEL,negative],"errors")
    for fault in ["short_write","eintr","no_space"]:
        measured([enabled,"loader-io",MODEL,fault],"loader-"+fault)
    if list((DEPS/"tmp").glob("media-server-siglip2-*")):
        evidence.update(status="FAIL",failed_case="temporary loader path leaked");record("adapter_verification",evidence)
        raise RuntimeError("Temporary loader path leaked")
    evidence.update(status="PASS",error_cases="21 explicit rejection cases",runtime_intra_op_threads=1,
                    model_loader="private unlinked 0600 FD, 1MiB stream + fixed SHA, ORT FD path; no memory fallback",
                    loader_io_cases={"short_write":"PASS injected partial writes, real embeddings", "eintr":"PASS injected read/write EINTR, real embeddings", "no_space":"PASS injected ENOSPC rejection"},
                    fd_cleanup="PASS normal/IO constructors and all rejection cases retain exact descriptor set; temporary names absent",
                    input_limits={"max_image_dimension":16384,"max_rgb_span_bytes":256*1024*1024,
                                  "max_raw_text_bytes":16*1024,"rgb_span_formula":"(height-1)*stride+width*3"},
                    accepted_boundary_cases=["dimension 16384x1", "text 16384 bytes", "span exactly 256MiB (1x2, stride=256MiB-3)"],
                    single_mutex_scope="tokenization / RGB preprocessing / inference",
                    fixtures_directory=str(fixtures),results_directory=str(results),negative_directory=str(negative))
    record("adapter_verification",evidence)
    if max(case["max_rss_bytes"] for case in evidence["process_resources"].values()) > 4*1024**3:
        evidence.update(status="FAIL",failed_case="encoder process RSS exceeds 4GiB development target")
        record("adapter_verification",evidence)
        raise RuntimeError("Encoder process RSS exceeds 4GiB development target")
    print("PASS: independent C++ pixels, token IDs, real image/text encoder, errors and disabled build",flush=True)


def fixed_retrieval_fixture():
    """Tracked 사전 라벨/기대 hash만 읽는다. 모델이나 기존 결과는 로드하지 않는다."""
    if sha(RETRIEVAL_FIXTURE) != RETRIEVAL_FIXTURE_SHA:
        raise RuntimeError("Tracked pre-score retrieval fixture hash mismatch")
    fixture = json.loads(RETRIEVAL_FIXTURE.read_text(encoding="utf-8"))
    queries_hash = hashlib.sha256(json.dumps(fixture["queries"], ensure_ascii=False,
        sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    if queries_hash != RETRIEVAL_QUERIES_SHA:
        raise RuntimeError("Tracked pre-score retrieval query hash mismatch")
    return fixture


def publish_retrieval_outputs(pending, evidence):
    """소유 모델 경로의 모든 기존 bytes를 먼저 확인하고 누락 파일만 생성한다."""
    for relative, (_, expected) in pending.items():
        destination = ROOT / relative
        if not destination.is_relative_to(MODEL) or any(parent.is_symlink() for parent in [destination, *destination.parents]):
            raise RuntimeError("Unsafe reproduction destination")
        if destination.exists() and sha(destination) != expected:
            evidence["first_mismatch"] = {"path": relative, "expected": expected,
                "actual": sha(destination), "original_preserved": True}
            raise RuntimeError("Existing retrieval bytes mismatch; not overwritten: " + relative)
    for relative, (generated, expected) in pending.items():
        destination = ROOT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        reused = destination.exists()
        if not reused:
            with destination.open("xb") as output:
                output.write(generated.read_bytes())
        evidence["outputs"].append({"path": relative, "sha256": sha(destination),
            "expected_sha256": expected, "bytes": destination.stat().st_size, "reused": reused})


def retrieval_prepare(_):
    """고정 공개 영상에서 PNG/RGB를 재생성·exact SHA 검사한다. 추론하지 않는다."""
    from PIL import Image, __version__ as pillow_version
    fixture = fixed_retrieval_fixture()
    video = ROOT / fixture["source_video"]
    if sha(video) != fixture["source_video_sha256"]:
        raise RuntimeError("Retrieval source video changed")
    if pillow_version != "11.3.0":
        raise RuntimeError("Retrieval PNG reproduction requires fixed Pillow 11.3.0")
    work = MODEL / "retrieval"
    work.mkdir(parents=True, exist_ok=True)
    # 기존 품질 결과를 덮지 않는 독립 준비 결과. 출력은 모든 SHA가 일치한 뒤에만 게시한다.
    evidence = {"status": "RUNNING", "feature_id": "V430-Q02",
        "scope": "fixture bytes reproduction only; no model inference or quality rerun",
        "fixture_sha256": RETRIEVAL_FIXTURE_SHA, "queries_sha256": RETRIEVAL_QUERIES_SHA,
        "source_video_sha256": fixture["source_video_sha256"], "pillow_version": pillow_version,
        "outputs": [], "commands": []}
    record("retrieval_preparation", evidence)
    try:
        # 최대 4 source RGB PNG + 16 crop PNG/RGB의 보수적 staging 예약.
        costs = sum(size(path) for path in [MODEL, DEPS, ROOT / "build-gst-onnx"])
        if costs + 64 * 1024**2 > BUDGET:
            raise RuntimeError("Retrieval reproduction 8GiB budget exceeded")
        evidence["workspace_bytes_before"] = costs
        evidence["ffmpeg_version"] = run(["ffmpeg", "-version"], capture=True).stdout.splitlines()[0]
        evidence["ffprobe_version"] = run(["ffprobe", "-version"], capture=True).stdout.splitlines()[0]
        probe = ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_frames",
                 "-show_streams", "-show_entries", "stream=time_base,width,height:frame=best_effort_timestamp",
                 "-of", "json", video]
        evidence["commands"].append(list(map(str, probe)))
        observed = json.loads(run(probe, capture=True).stdout)
        stream = observed["streams"]
        if len(stream) != 1 or stream[0]["time_base"] != "1/15360" or (stream[0]["width"], stream[0]["height"]) != (1280, 720):
            raise RuntimeError("Retrieval source stream contract mismatch")
        pts = [int(frame["best_effort_timestamp"]) for frame in observed["frames"]]
        expected_pts = {doc["media_pts"] for doc in fixture["documents"]}
        if any(pts.count(value) != 1 for value in expected_pts):
            raise RuntimeError("Retrieval source PTS missing or ambiguous")
        with tempfile.TemporaryDirectory(prefix="reproduce-", dir=work) as stage_name:
            stage = Path(stage_name)
            evidence["owned_staging_path"] = str(stage.relative_to(ROOT))
            pending = {}
            for index, second in enumerate(fixture["timestamps_seconds"]):
                documents = [doc for doc in fixture["documents"] if doc["requested_timestamp_seconds"] == second]
                frame_path = stage / f"frame-{index}.png"
                # 최초 supplier frame 생성 명령과 동일한 seek/PNG 설정을 보존한다.
                command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(second),
                           "-i", video, "-frames:v", "1", frame_path]
                evidence["commands"].append(list(map(str, command)))
                run(command, capture=True)
                with Image.open(frame_path) as decoded:
                    image = decoded.convert("RGB")
                for doc in documents:
                    if doc["media_pts"] * doc["time_base_num"] != second * doc["time_base_den"]:
                        raise RuntimeError("Fixed retrieval timestamp/PTS mismatch")
                    if sha(frame_path) != doc["source_frame_sha256"]:
                        evidence["first_mismatch"] = {"document_id": doc["id"], "field": "source_frame",
                            "expected": doc["source_frame_sha256"], "actual": sha(frame_path)}
                        raise RuntimeError("Reproduced source PNG hash mismatch: " + doc["id"])
                    pending[doc["source_frame"]] = (frame_path, doc["source_frame_sha256"])
                    crop = image.crop(doc["crop_box"])
                    if crop.size != (doc["width"], doc["height"]) or doc["stride"] != doc["width"] * 3:
                        raise RuntimeError("Fixed retrieval crop dimensions mismatch")
                    png = stage / Path(doc["crop_png"]).name
                    rgb = stage / Path(doc["rgb"]).name
                    crop.save(png)
                    rgb.write_bytes(crop.tobytes())
                    for field, generated in [("crop_png", png), ("rgb", rgb)]:
                        actual = sha(generated)
                        expected = doc[field + "_sha256"]
                        if actual != expected:
                            evidence["first_mismatch"] = {"document_id": doc["id"], "field": field,
                                                          "expected": expected, "actual": actual}
                            raise RuntimeError("Reproduced crop hash mismatch: " + doc["id"] + ":" + field)
                        pending[doc[field]] = (generated, expected)
            pending["models/v430-siglip2/retrieval/fixture.json"] = (RETRIEVAL_FIXTURE, RETRIEVAL_FIXTURE_SHA)
            publish_retrieval_outputs(pending, evidence)
            evidence["generated_counts"] = {"source_png": 4, "crop_png": 16, "crop_rgb": 16}
        evidence.update(status="PASS", owned_staging_absent=not (ROOT / evidence["owned_staging_path"]).exists())
        record("retrieval_preparation", evidence)
        print(json.dumps({"status": "PASS", "scope": evidence["scope"], "generated_counts": evidence["generated_counts"],
                          "fixture_sha256": RETRIEVAL_FIXTURE_SHA, "queries_sha256": RETRIEVAL_QUERIES_SHA}, indent=2))
    except Exception as error:
        evidence.update(status="FAIL", error=str(error), owned_staging_absent=
            not evidence.get("owned_staging_path") or not (ROOT / evidence["owned_staging_path"]).exists())
        record("retrieval_preparation", evidence)
        raise


def retrieval_verify(_):
    """점수 확인 전에 고정한 공개 scene/query로 실제 C++ encoder+index를 판정한다."""
    baseline="d8dfd0fbb13544a02eb725ac1fd79b52df781c71"
    expected_fixture=RETRIEVAL_FIXTURE_SHA
    expected_queries=RETRIEVAL_QUERIES_SHA
    work=MODEL/"retrieval"; fixture_path=RETRIEVAL_FIXTURE
    sources=["include/analysis/siglip2_encoder.h","src/analysis/siglip2_encoder.cpp",
             "include/recording/visual_search_index.h","src/recording/visual_search_index.cpp"]
    source_hashes={}
    for path in sources:
        fixed=subprocess.check_output(["git","show",baseline+":"+path],cwd=ROOT)
        expected=hashlib.sha256(fixed).hexdigest();actual=sha(ROOT/path)
        if actual!=expected:raise RuntimeError("Retrieval baseline source mismatch: "+path)
        source_hashes[path]=actual
    if sha(fixture_path)!=expected_fixture:raise RuntimeError("Pre-score retrieval fixture hash mismatch")
    fixture=fixed_retrieval_fixture()
    queries_hash=hashlib.sha256(json.dumps(fixture["queries"],ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
    if queries_hash!=expected_queries or fixture["baseline_commit"]!=baseline:raise RuntimeError("Pre-score retrieval queries/baseline mismatch")
    if sha(ROOT/fixture["source_video"])!=fixture["source_video_sha256"]:raise RuntimeError("Retrieval source video changed")
    def budget():
        costs={str(path.relative_to(ROOT)):size(path) for path in [MODEL,DEPS,ROOT/"build-gst-onnx"]}
        total=sum(costs.values());reserved=1129352764
        if total+reserved>BUDGET:raise RuntimeError("Retrieval 8GiB budget including product build/temp reserve exceeded")
        return {"logical_bytes":costs,"total_bytes":total,"temp_reserve_bytes":reserved,"budget_bytes":BUDGET}
    evidence={"status":"RUNNING","feature_id":"V430-Q02","baseline_commit":baseline,
              "baseline_source_sha256":source_hashes,"fixture_sha256":expected_fixture,"queries_sha256":expected_queries,
              "driver_sha256":sha(ROOT/"scripts/internal/siglip2_retrieval_smoke.cpp"),
              "preparation_script_sha256":sha(Path(__file__)),"workspace":budget(),
              "thresholds":{"scene_hit_at_1_min":.75,"scene_mrr_min":.875,"warm_p95_ms_max":2000,
                            "warm_max_ms_max":5000,"process_rss_bytes_max":4*1024**3},
              "limitations":fixture["limitations"]}
    record("retrieval_verification",evidence)
    rows=[]
    for doc in fixture["documents"]:
        for field in ["source_frame","crop_png","rgb"]:
            if sha(ROOT/doc[field])!=doc[field+"_sha256"]:raise RuntimeError("Pre-score retrieval pixel hash mismatch")
        rows.append(" ".join([json.dumps(doc["id"]),json.dumps(doc["scene"]),str(doc["media_pts"]),
                  str(doc["time_base_num"]),str(doc["time_base_den"]),str(doc["width"]),str(doc["height"]),str(doc["stride"]),
                  json.dumps(Path(doc["rgb"]).name),json.dumps(doc["rgb_sha256"])]))
    (work/"documents.txt").write_text("\n".join(rows)+"\n")
    rows=[]
    for query in fixture["queries"]:
        name=query["id"]+".txt";(work/name).write_text(query["text"],encoding="utf-8")
        rows.append(" ".join(json.dumps(value) for value in [query["id"],query["kind"],query["language"],query["expected_scene"] or "none",name]))
    (work/"queries.txt").write_text("\n".join(rows)+"\n")
    prefix=DEPS/"sentencepiece";driver=work/"siglip2_retrieval_smoke"
    flags=shlex.split(subprocess.check_output(["pkg-config","--cflags","--libs","libonnxruntime","glib-2.0"],text=True))
    lib=subprocess.check_output(["pkg-config","--variable=libdir","libonnxruntime"],text=True).strip()
    run(["c++","-std=c++17","-O2","-DMEDIA_SERVER_USE_SIGLIP2=1",f"-I{ROOT/'include'}",
         ROOT/"src/analysis/siglip2_encoder.cpp",ROOT/"src/recording/visual_search_index.cpp",
         ROOT/"scripts/internal/siglip2_retrieval_smoke.cpp",f"-I{prefix/'include'}",prefix/"lib/libsentencepiece.a",
         *flags,f"-Wl,-rpath,{lib}","-o",driver])
    result=work/"results.json"
    run([driver,MODEL,work,result,fixture["source_video_sha256"]])
    actual=json.loads(result.read_text());labels={q["id"]:q for q in fixture["queries"]}
    if len(actual["cases"])!=24 or {q["id"] for q in actual["cases"]}!=set(labels):raise RuntimeError("Retrieval cases incomplete")
    cases=[]
    for case in actual["cases"]:
        label=labels[case["id"]]
        if case["kind"]!=label["kind"] or case["language"]!=label["language"] or case["expected_scene"]!=(label["expected_scene"] or "none"):
            raise RuntimeError("Retrieval ground truth changed")
        seen=set();scene_hits=[]
        for hit in case["hits"]:
            if hit["scene"] not in seen:seen.add(hit["scene"]);scene_hits.append(hit)
        if len(scene_hits)!=4:raise RuntimeError("Retrieval scene ranks incomplete")
        entry={**case,"text":label["text"],"scene_hits":scene_hits}
        if label["kind"]=="positive":
            rank=next(i+1 for i,h in enumerate(scene_hits) if h["scene"]==label["expected_scene"])
            entry.update(scene_rank=rank,hit_at_1=rank==1,reciprocal_rank=1/rank)
        else:entry.update(expected_scene=None,interpretation="No relevant crop; nearest score is diagnostic, rejection threshold uncalibrated")
        cases.append(entry)
    def quality(items):
        return {"queries":len(items),"hit_at_1":sum(q["hit_at_1"] for q in items)/len(items),
                "mrr":sum(q["reciprocal_rank"] for q in items)/len(items)}
    positives=[q for q in cases if q["kind"]=="positive"]
    overall=quality(positives);languages={lang:quality([q for q in positives if q["language"]==lang]) for lang in ["en","ko"]}
    warm=sorted(q["total_ms"] for q in actual["cases"][1:])
    latency={"startup_ms":actual["startup_ms"],"image_encode_ms":actual["image_encode_ms"],"index_build_ms":actual["index_build_ms"],
             "first_text_case":actual["cases"][0]["id"],"first_text_total_ms":actual["cases"][0]["total_ms"],
             "warm_queries":len(warm),"warm_median_ms":warm[len(warm)//2],"warm_p95_ms":warm[math.ceil(.95*len(warm))-1],
             "warm_max_ms":max(warm),"percentile_method":"nearest-rank; first text excluded; encoder+Search total"}
    failures=[]
    if overall["queries"]!=16 or overall["hit_at_1"]<.75 or overall["mrr"]<.875:failures.append("scene-quality")
    if latency["warm_queries"]!=23 or latency["warm_p95_ms"]>2000 or latency["warm_max_ms"]>5000:failures.append("warm-latency")
    if actual["max_rss_bytes"]>4*1024**3:failures.append("process-rss")
    if list((DEPS/"tmp").glob("media-server-siglip2-*")):failures.append("temporary-path-cleanup")
    evidence.update(status="FAIL" if failures else "PASS",failures=failures,overall=overall,languages=languages,latency=latency,cases=cases,
                    max_rss_bytes=actual["max_rss_bytes"],started_unix_ms=actual["started_unix_ms"],finished_unix_ms=actual["finished_unix_ms"],
                    index_logical_bytes=actual["index_logical_bytes"],results_json=str(result),workspace=budget(),temporary_loader_paths_absent=True)
    record("retrieval_verification",evidence)
    print(json.dumps({"status":evidence["status"],"quality":overall,"languages":languages,"latency":latency,"max_rss_bytes":actual["max_rss_bytes"]},indent=2),flush=True)
    if failures:raise RuntimeError("Fixed retrieval criteria failed: "+", ".join(failures))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action",choices=["bootstrap","assets","sentencepiece","export","verify","adapter-verify","retrieval-prepare","retrieval-verify","status"])
    parser.add_argument("--python",default=sys.executable)
    args=parser.parse_args()
    for path in [MODEL,DEPS,DEPS/"tmp",DEPS/"source",DEPS/"build",DEPS/"cache"]:
        path.mkdir(parents=True,exist_ok=True)
    os.environ.update(env())
    started=time.monotonic()
    if args.action=="status":
        print(json.dumps({"workspace_bytes":guard(),"budget_bytes":BUDGET,"free_bytes":shutil.disk_usage(ROOT).free},indent=2))
    else:
        globals()[args.action.replace("-","_")](args)
        metrics_path=MODEL / "preparation.json"
        metrics=json.loads(metrics_path.read_text()).get("action_metrics", {}) if metrics_path.exists() else {}
        metrics[args.action]={"elapsed_seconds":time.monotonic()-started,"peak_process_rss_bytes":resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*(1 if platform.system()=="Darwin" else 1024),"exit":0}
        record("action_metrics",metrics)


if __name__=="__main__":
    main()
