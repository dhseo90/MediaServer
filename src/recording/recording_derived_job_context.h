#pragma once
// 파일 용도: 구현 전용. 입력 Intent는 생성부터 마지막 소비까지 변경되지 않아야 한다.
// 공개 API/보관 cache가 아니며 호출의 지역 입력보다 오래 살아서는 안 된다.
#include "recording/recording_derived_job.h"
#include "recording/recording_derived_selection.h"
#include <utility>
namespace recording { class RecordingCatalog; }
namespace recording::detail {
// catalog의 strict 입력/검증된 prior 게시 경계 전용. 새 입력이나 외부 cache로 재사용하지 않는다.
class CatalogIntentCanonical {
    friend class recording::RecordingCatalog;
    std::string canonical_;
    explicit CatalogIntentCanonical(const DerivedJobIntentV1&);
public:
    CatalogIntentCanonical(const CatalogIntentCanonical&)=delete;
    CatalogIntentCanonical& operator=(const CatalogIntentCanonical&)=delete;
    bool Equals(const CatalogIntentCanonical& other) const {
        return !canonical_.empty()&&!other.canonical_.empty()&&canonical_==other.canonical_;
    }
};
class DerivedJobIntentContext {
    const DerivedJobIntentV1& intent_;
    DerivedRecordingSelection selection_;
    std::string canonical_;
    DerivedJobIntentContext(const DerivedJobIntentV1& intent,DerivedRecordingSelection selection,std::string canonical)
        :intent_(intent),selection_(std::move(selection)),canonical_(std::move(canonical)){}
    DerivedJobIntentContext(DerivedJobIntentContext&&)=default;
public:
    DerivedJobIntentContext(const DerivedJobIntentContext&)=delete;
    DerivedJobIntentContext& operator=(const DerivedJobIntentContext&)=delete;
    static DerivedJobIntentContext Analyze(const DerivedJobIntentV1&);
    static DerivedJobIntentContext Analyze(DerivedJobIntentV1&&)=delete;
    // destination은 호출자 지역 변수다. 성공 후 Intent를 변경/이동하면 더 소비하지 않는다.
    static DerivedJobIntentContext Parse(const std::string&,DerivedJobIntentV1& destination);
    const DerivedRecordingSelection& Selection() const {return selection_;}
    const std::string& Canonical() const {return canonical_;}
    void CheckSelection(const DerivedRecordingSelection&) const;
};
}
