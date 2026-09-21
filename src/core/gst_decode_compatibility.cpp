#include "core/gst_decode_compatibility.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/gst.h>
#if defined(__APPLE__)
#include <TargetConditionals.h>
#endif
#endif

namespace core {
bool ShouldSkipAppleH264Decoder(bool macos,bool fixed_caps,std::string_view media_type,
    std::string_view factory,std::string_view plugin,std::string_view version) noexcept {
    return macos&&fixed_caps&&media_type=="video/x-h264"&&
        (factory=="vtdec_hw"||factory=="vtdec")&&plugin=="applemedia"&&version=="1.28.1";
}

#if MEDIA_SERVER_USE_GSTREAMER
namespace {
#if defined(__APPLE__) && TARGET_OS_OSX
constexpr bool kMacos=true;
#else
constexpr bool kMacos=false;
#endif
struct SelectionSignal { guint id=0;gint try_value=0,skip_value=0;bool valid=false; };
SelectionSignal Signal(GstElement* element) noexcept {
    SelectionSignal result;result.id=g_signal_lookup("autoplug-select",G_OBJECT_TYPE(element));
    if(!result.id)return result;
    GSignalQuery query{};g_signal_query(result.id,&query);
    const auto type=[](GType value){return value&~static_cast<GType>(G_SIGNAL_TYPE_STATIC_SCOPE);};
    if(query.n_params!=3||type(query.param_types[0])!=GST_TYPE_PAD||
        type(query.param_types[1])!=GST_TYPE_CAPS||type(query.param_types[2])!=GST_TYPE_ELEMENT_FACTORY||
        !G_TYPE_IS_ENUM(type(query.return_type)))return result;
    auto* values=G_ENUM_CLASS(g_type_class_ref(type(query.return_type)));
    if(!values)return result;
    const auto* attempt=g_enum_get_value_by_nick(values,"try");
    const auto* skip=g_enum_get_value_by_nick(values,"skip");
    if(attempt&&skip&&attempt->value!=skip->value) {
        result.try_value=attempt->value;result.skip_value=skip->value;result.valid=true;
    }
    g_type_class_unref(values);return result;
}
std::string_view Text(const gchar* value) noexcept {return value?std::string_view(value):std::string_view{};}
gint Select(GstElement* element,GstPad*,GstCaps* caps,GstElementFactory* factory,gpointer) noexcept {
    // decodebin 공식 계약: TRY는 다음 handler, SKIP은 다음 factory로 진행한다.
    // 반환 enum은 signal의 nick으로 읽으며 private enum 숫자를 복제하지 않는다.
    const auto signal=Signal(element);
    if(!signal.valid) {g_warning("decode-compatibility-signal-contract-changed");return signal.try_value;}
    if(!caps||!factory||!gst_caps_is_fixed(caps)||gst_caps_is_any(caps)||gst_caps_is_empty(caps)||gst_caps_get_size(caps)!=1)return signal.try_value;
    auto* plugin=gst_plugin_feature_get_plugin(GST_PLUGIN_FEATURE(factory));
    if(!plugin)return signal.try_value;
    const bool skip=ShouldSkipAppleH264Decoder(kMacos,true,
        Text(gst_structure_get_name(gst_caps_get_structure(caps,0))),
        Text(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(factory))),
        Text(gst_plugin_get_name(plugin)),Text(gst_plugin_get_version(plugin)));
    gst_object_unref(plugin);return skip?signal.skip_value:signal.try_value;
}
void Added(GstBin*,GstBin*,GstElement* element,gpointer) noexcept {
    if(!InstallDecodeCompatibility(element)) {
        auto* error=g_error_new_literal(GST_CORE_ERROR,GST_CORE_ERROR_FAILED,"Decoder compatibility setup failed");
        gst_element_post_message(element,gst_message_new_error(GST_OBJECT(element),error,nullptr));
        g_error_free(error);
    }
}
bool Install(GstElement* element) {
    if(!element||!GST_IS_ELEMENT(element))return false;
    static const GQuark marker=g_quark_from_static_string("media-server-decode-compatibility-installed-v1");
    auto* object=G_OBJECT(element);
    if(!g_object_replace_qdata(object,marker,nullptr,GINT_TO_POINTER(1),nullptr,nullptr))
        return g_object_get_qdata(object,marker)==GINT_TO_POINTER(2); // 1=설치 중, 3=실패는 완료가 아니다.
    bool ok=true;
    // 동적 child listener를 먼저 설치하고 현재 child를 순회한다. 객체가 신호를 소유한다.
    if(GST_IS_BIN(element))ok=g_signal_connect(element,"deep-element-added",G_CALLBACK(Added),nullptr)!=0;
    auto* factory=gst_element_get_factory(element);
    const auto name=factory?Text(gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(factory))):std::string_view{};
    if(name=="decodebin"||name=="uridecodebin") {
        const auto signal=Signal(element);
        ok=ok&&signal.valid;
        if(signal.valid)ok=(g_signal_connect(element,"autoplug-select",G_CALLBACK(Select),nullptr)!=0)&&ok;
    }
    if(GST_IS_BIN(element)) {
        auto* iterator=gst_bin_iterate_elements(GST_BIN(element));GValue value=G_VALUE_INIT;bool done=false;
        while(!done) {
            switch(gst_iterator_next(iterator,&value)) {
                case GST_ITERATOR_OK:
                    ok=InstallDecodeCompatibility(GST_ELEMENT(g_value_get_object(&value)))&&ok;
                    g_value_reset(&value);break;
                case GST_ITERATOR_RESYNC:gst_iterator_resync(iterator);break;
                case GST_ITERATOR_DONE:done=true;break;
                default:ok=false;done=true;break;
            }
        }
        if(G_VALUE_TYPE(&value))g_value_unset(&value);
        gst_iterator_free(iterator);
    }
    g_object_set_qdata(object,marker,GINT_TO_POINTER(ok?2:3));return ok;
}
} // namespace
#endif

bool InstallDecodeCompatibility(_GstElement* root) noexcept {
#if MEDIA_SERVER_USE_GSTREAMER
    if(!kMacos)return true; // Linux 등은 tree 순회/신호 연결/실패 경로도 추가하지 않는다.
    try {return Install(root);}catch(...) {return false;}
#else
    (void)root;return true;
#endif
}
} // namespace core
