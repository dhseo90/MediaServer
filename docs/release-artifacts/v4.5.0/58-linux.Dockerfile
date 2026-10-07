# 검증 전용: 원본 tag의 image ID를 58-validation.json과 대조한 뒤 --pull=false로 빌드한다.
# 호스트/원본 이미지를 변경하지 않으며 제품·모델·운영 자료를 포함하지 않는다.
FROM mediaserver-v420-verify:sid-arm64
LABEL org.mediaserver.verification="v450-58" \
      org.mediaserver.base-id="sha256:22723481607c73523ec4c4e583981a765eee0f39551cf32e5f0d94d122b711f7"
COPY sentencepiece-v0.2.0.tar.gz /opt/rc58-source/sentencepiece-v0.2.0.tar.gz
# 기존 Python/TLS 도구로 공식 SDK만 다운로드한다. 전체 준비 도구/모델 export는 실행하지 않는다.
RUN python3 -c 'import pathlib,urllib.request,hashlib; p=pathlib.Path("/opt/rc58-source/onnxruntime-linux-aarch64-1.23.2.tgz"); p.write_bytes(urllib.request.urlopen("https://github.com/microsoft/onnxruntime/releases/download/v1.23.2/onnxruntime-linux-aarch64-1.23.2.tgz",timeout=60).read()); assert hashlib.sha256(p.read_bytes()).hexdigest()=="7c63c73560ed76b1fac6cff8204ffe34fe180e70d6582b5332ec094810241e5c", "ONNX SDK digest mismatch"' \
 && echo '9970f0a0afee1648890293321665e5b2efa04eaec9f1671fcf8048f456f5bb86  /opt/rc58-source/sentencepiece-v0.2.0.tar.gz' | sha256sum -c - \
 && tar -xzf /opt/rc58-source/onnxruntime-linux-aarch64-1.23.2.tgz -C /opt \
 && tar -xzf /opt/rc58-source/sentencepiece-v0.2.0.tar.gz -C /opt/rc58-source
# GCC 16의 전이 include 차이: 소스/버전 변경 없이 표준 정수 선언만 명시한다.
RUN cmake -S /opt/rc58-source/sentencepiece-0.2.0 -B /opt/rc58-source/sp-build \
      -DCMAKE_INSTALL_PREFIX=/opt/rc58-sentencepiece -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_POLICY_VERSION_MINIMUM=3.5 '-DCMAKE_CXX_FLAGS=-include cstdint' -DSPM_ENABLE_SHARED=OFF -DSPM_BUILD_TEST=OFF \
 && cmake --build /opt/rc58-source/sp-build -j 2 \
 && cmake --install /opt/rc58-source/sp-build
