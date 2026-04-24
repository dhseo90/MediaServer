# 파일 용도: CMake 빌드 옵션과 GStreamer 연동 타깃을 정의한다.
cmake_minimum_required(VERSION 3.16)
project(media_server LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(MEDIA_SERVER_USE_GSTREAMER "Enable GStreamer RTSP server integration" OFF)

add_executable(media_server
    src/analysis/analysis_manager.cpp
    src/analysis/dummy_detector.cpp
    src/analysis/raw_video_decoder.cpp
    src/app_config.cpp
    src/main.cpp
    src/core/command_runner.cpp
    src/core/shared_stream.cpp
    src/core/source_factory.cpp
    src/core/stream_registry.cpp
    src/core/stream_key.cpp
    src/core/youtube_resolver.cpp
    src/core/resource_guard.cpp
    src/core/session_manager.cpp
    src/ingress/gst_pipeline_builder.cpp
    src/ingress/rtsp_request_context.cpp
    src/ingress/request_parser.cpp
    src/ingress/rtsp_egress_session.cpp
    src/ingress/webrtc_egress_session.cpp
    src/ingress/webrtc_gst_utils.cpp
    src/ingress/webrtc_source_registry.cpp
    src/ingress/webrtc_source_session.cpp
    src/ingress/lab_import_manager.cpp
    src/ingress/webrtc_http_server.cpp
    src/ingress/rtsp_adapter.cpp
    src/ingress/gstreamer_rtsp_server.cpp
)

target_include_directories(media_server PRIVATE include)

if(MEDIA_SERVER_USE_GSTREAMER)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(GSTREAMER REQUIRED IMPORTED_TARGET
        gstreamer-1.0
        gstreamer-rtsp-server-1.0
        gstreamer-pbutils-1.0
        gstreamer-app-1.0
        gstreamer-webrtc-1.0
        gstreamer-sdp-1.0)
    target_link_libraries(media_server PRIVATE PkgConfig::GSTREAMER)
    target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_GSTREAMER=1 GST_USE_UNSTABLE_API=1)
else()
    target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_GSTREAMER=0)
endif()
