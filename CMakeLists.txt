# 파일 용도: CMake 빌드 옵션과 GStreamer 연동 타깃을 정의한다.
cmake_minimum_required(VERSION 3.16)
project(media_server VERSION 1.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(MEDIA_SERVER_USE_GSTREAMER "Enable GStreamer RTSP server integration" OFF)
option(MEDIA_SERVER_USE_ONNXRUNTIME "Enable ONNX Runtime YOLO detector" OFF)
set(MEDIA_SERVER_ONNXRUNTIME_ROOT "" CACHE PATH "ONNX Runtime installation root")

find_package(PkgConfig QUIET)

add_executable(media_server
    src/analysis/analysis_manager.cpp
    src/analysis/appearance_extractor.cpp
    src/analysis/category_tokens.cpp
    src/analysis/detector_factory.cpp
    src/analysis/dummy_detector.cpp
    src/analysis/event_manager.cpp
    src/analysis/event_post_dispatcher.cpp
    src/analysis/event_rule_engine.cpp
    src/analysis/event_storage.cpp
    src/analysis/image_frame_loader.cpp
    src/analysis/intrusion_after_line_crossing_scenario.cpp
    src/analysis/intrusion_dwell_scenario.cpp
    src/analysis/loitering_scenario.cpp
    src/analysis/metadata_subscription_filter.cpp
    src/analysis/object_tracker.cpp
    src/analysis/overlay_renderer.cpp
    src/analysis/raw_video_decoder.cpp
    src/analysis/re_entry_scenario.cpp
    src/analysis/scene_context_builder.cpp
    src/analysis/scenario_engine.cpp
    src/analysis/snapshot_encoder.cpp
    src/analysis/track_state_manager.cpp
    src/analysis/tracked_object_metadata.cpp
    src/analysis/va_runtime_metadata.cpp
    src/analysis/wrong_direction_scenario.cpp
    src/analysis/zone_occupancy_scenario.cpp
    src/analysis/yolo_onnx_detector.cpp
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
    src/ingress/analysis_overlay_probe.cpp
    src/ingress/analysis_query.cpp
    src/ingress/http_auth.cpp
    src/ingress/onvif_credential_provider.cpp
    src/ingress/onvif_live_import.cpp
    src/ingress/rtsp_request_context.cpp
    src/ingress/request_parser.cpp
    src/ingress/product_ui_assets.cpp
    src/ingress/product_ui_css.cpp
    src/ingress/product_ui_js.cpp
    src/ingress/product_ui_page_scripts.cpp
    src/ingress/rtsp_egress_session.cpp
    src/ingress/source_view_registry.cpp
    src/ingress/webrtc_egress_session.cpp
    src/ingress/webrtc_gst_utils.cpp
    src/ingress/webrtc_source_registry.cpp
    src/ingress/webrtc_source_session.cpp
    src/ingress/webrtc_http_server.cpp
    src/ingress/rtsp_adapter.cpp
    src/ingress/gstreamer_rtsp_server.cpp
)

target_include_directories(media_server PRIVATE include)

if(MEDIA_SERVER_USE_GSTREAMER)
    if(NOT PkgConfig_FOUND)
        message(FATAL_ERROR "pkg-config is required when MEDIA_SERVER_USE_GSTREAMER=ON")
    endif()
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

if(PkgConfig_FOUND)
    pkg_check_modules(PANGOCAIRO QUIET IMPORTED_TARGET pangocairo)
endif()
if(PANGOCAIRO_FOUND)
    target_link_libraries(media_server PRIVATE PkgConfig::PANGOCAIRO)
    target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_PANGOCAIRO=1)
else()
    target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_PANGOCAIRO=0)
endif()

if(PkgConfig_FOUND)
    pkg_check_modules(LIBSODIUM QUIET IMPORTED_TARGET libsodium)
endif()
if(LIBSODIUM_FOUND)
    target_link_libraries(media_server PRIVATE PkgConfig::LIBSODIUM)
    target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_LIBSODIUM=1)
else()
    target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_LIBSODIUM=0)
endif()

if(PkgConfig_FOUND)
    pkg_check_modules(OPENSSL QUIET IMPORTED_TARGET openssl)
endif()
if(OPENSSL_FOUND)
    target_link_libraries(media_server PRIVATE PkgConfig::OPENSSL)
    target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_OPENSSL=1)
else()
    find_package(OpenSSL QUIET)
    if(OpenSSL_FOUND)
        target_link_libraries(media_server PRIVATE OpenSSL::SSL OpenSSL::Crypto)
        target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_OPENSSL=1)
    else()
        target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_OPENSSL=0)
    endif()
endif()

if(MEDIA_SERVER_USE_ONNXRUNTIME)
    find_path(ONNXRUNTIME_INCLUDE_DIR
        NAMES onnxruntime_cxx_api.h
        PATHS
            ${MEDIA_SERVER_ONNXRUNTIME_ROOT}/include
            ${MEDIA_SERVER_ONNXRUNTIME_ROOT}/include/onnxruntime/core/session
            /opt/homebrew/include
            /usr/local/include
        PATH_SUFFIXES
            onnxruntime
            onnxruntime/core/session)
    find_library(ONNXRUNTIME_LIBRARY
        NAMES onnxruntime
        PATHS
            ${MEDIA_SERVER_ONNXRUNTIME_ROOT}/lib
            /opt/homebrew/lib
            /usr/local/lib)
    if(NOT ONNXRUNTIME_INCLUDE_DIR OR NOT ONNXRUNTIME_LIBRARY)
        message(FATAL_ERROR "ONNX Runtime not found. Set MEDIA_SERVER_ONNXRUNTIME_ROOT or disable MEDIA_SERVER_USE_ONNXRUNTIME.")
    endif()
    target_include_directories(media_server PRIVATE ${ONNXRUNTIME_INCLUDE_DIR})
    target_link_libraries(media_server PRIVATE ${ONNXRUNTIME_LIBRARY})
    target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_ONNXRUNTIME=1)
else()
    target_compile_definitions(media_server PRIVATE MEDIA_SERVER_USE_ONNXRUNTIME=0)
endif()
