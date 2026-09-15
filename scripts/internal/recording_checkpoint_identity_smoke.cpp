#include "../../src/recording/recording_checkpoint_validation.h"
#include <iostream>
int main(){
    using namespace recording;
    RecordingMutationV1 a;a.mutation_id="mutation-a";a.entity_id="entity-a";a.mutation_type=RecordingMutationType::EventLinkCreated;a.payload_json="{\"x\":1}";
    auto b=a;b.mutation_id="mutation-b";
    int pass=0,fail=0;auto check=[&](bool ok,const char* name){(ok?pass:fail)++;std::cout<<(ok?"[pass] ":"[fail] ")<<name<<'\n';};
    check(detail::SameCheckpointSequence({a,b},{a,b}),"CP06 exact canonical sequence equality");
    auto changed=a;changed.payload_json="{\"x\":2}";
    check(SerializeRecordingMutationV1(a).size()==SerializeRecordingMutationV1(changed).size()&&!detail::SameCheckpointSequence({a},{changed}),"CP06 same length different payload rejected");
    check(!detail::SameCheckpointSequence({a,b},{b,a}),"CP06 reordered sequence rejected");
    check(!detail::SameCheckpointSequence({a},{a,b}),"CP06 different count rejected");
    changed=a;changed.schema="different-schema";
    check(SerializeRecordingMutationV1(a)==SerializeRecordingMutationV1(changed)&&!detail::SameCheckpointSequence({a},{changed}),"CP06 different schema despite canonical equality rejected");
    auto unknown=a;unknown.mutation_type=RecordingMutationType::Unknown;
    changed=unknown;changed.mutation_type=static_cast<RecordingMutationType>(999);
    check(SerializeRecordingMutationV1(unknown)==SerializeRecordingMutationV1(changed)&&!detail::SameCheckpointSequence({unknown},{changed}),"CP06 different enum despite canonical equality rejected");
    std::cout<<"[summary] pass="<<pass<<" fail="<<fail<<'\n';return fail?1:0;
}
