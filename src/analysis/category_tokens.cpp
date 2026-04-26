// 파일 용도: VA tracker와 event rule engine이 공유하는 객체 카테고리 토큰 해석을 구현한다.
#include "analysis/category_tokens.h"

#include <algorithm>
#include <cctype>

namespace analysis {

namespace {

// 카테고리 token과 실제 COCO label 묶음을 한 곳에서 관리한다.
const std::vector<CategoryTokenInfo> kCategoryTokenCatalog{
    {"person", "사람", "person", "core person", {"people", "human", "humans"}, {"person"}, {"사람"}},
    {"vehicle",
     "차량",
     "car, bus, truck...",
     "core vehicle",
     {"vehicles"},
     {"bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat"},
     {"자전거", "자동차", "오토바이", "비행기", "버스", "기차", "트럭", "보트"}},
    {"road",
     "도로",
     "traffic light, sign",
     "road",
     {"traffic"},
     {"traffic light", "fire hydrant", "stop sign", "parking meter"},
     {"신호등", "소화전", "정지 표지판", "주차 미터기"}},
    {"animal",
     "동물",
     "bird, dog...",
     "animal",
     {"animals"},
     {"bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"},
     {"새", "고양이", "개", "말", "양", "소", "코끼리", "곰", "얼룩말", "기린"}},
    {"sports",
     "운동",
     "ball, racket...",
     "sports",
     {"sport"},
     {"frisbee",
      "skis",
      "snowboard",
      "sports ball",
      "kite",
      "baseball bat",
      "baseball glove",
      "skateboard",
      "surfboard",
      "tennis racket"},
     {"프리스비", "스키", "스노보드", "공", "연", "야구 배트", "야구 글러브", "스케이트보드", "서프보드", "테니스 라켓"}},
    {"tableware",
     "식기",
     "cup, bowl...",
     "tableware",
     {"dishware"},
     {"bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl"},
     {"병", "와인잔", "컵", "포크", "칼", "숟가락", "그릇"}},
    {"food",
     "음식",
     "fruit, pizza...",
     "food",
     {"foods"},
     {"banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake"},
     {"바나나", "사과", "샌드위치", "오렌지", "브로콜리", "당근", "핫도그", "피자", "도넛", "케이크"}},
    {"furniture",
     "가구",
     "chair, bed...",
     "furniture",
     {},
     {"bench", "chair", "couch", "potted plant", "bed", "dining table", "toilet", "sink"},
     {"벤치", "의자", "소파", "화분", "침대", "식탁", "변기", "싱크대"}},
    {"device",
     "기기",
     "tv, laptop, phone...",
     "device",
     {"devices"},
     {"tv", "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "refrigerator", "clock", "hair drier"},
     {"TV", "노트북", "마우스", "리모컨", "키보드", "휴대폰", "전자레인지", "오븐", "토스터", "냉장고", "시계", "헤어드라이어"}},
    {"object",
     "잡화",
     "bag, book...",
     "object",
     {"objects", "misc"},
     {"backpack", "umbrella", "handbag", "tie", "suitcase", "book", "vase", "scissors", "teddy bear", "toothbrush"},
     {"백팩", "우산", "핸드백", "넥타이", "여행가방", "책", "꽃병", "가위", "곰인형", "칫솔"}},
};

}  // namespace

// class label/id 비교가 대소문자와 공백 표기에 흔들리지 않도록 정규화한다.
std::string NormalizeClassToken(std::string value) {
    value.erase(std::remove_if(value.begin(),
                               value.end(),
                               [](unsigned char ch) { return std::isspace(ch) != 0; }),
                value.end());
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

// JSON/API에서 전체 class를 뜻하는 토큰인지 확인한다.
bool IsAllClassesToken(const std::string& value) {
    return value == "*" || value == "all" || value == "any";
}

// Rule UI, capabilities API, tracker/rule engine이 공유하는 카테고리 목록을 반환한다.
const std::vector<CategoryTokenInfo>& CategoryTokenCatalog() {
    return kCategoryTokenCatalog;
}

// Rule UI와 tracker가 공유하는 큰 카테고리 토큰을 실제 COCO label 묶음으로 확장한다.
bool MatchesCategoryToken(const std::string& wanted, const std::string& label) {
    for (const auto& category : kCategoryTokenCatalog) {
        bool category_matched = wanted == category.token;
        for (const auto& alias : category.aliases) {
            category_matched = category_matched || wanted == NormalizeClassToken(alias);
        }
        if (!category_matched) {
            continue;
        }
        for (const auto& class_label : category.labels) {
            if (label == NormalizeClassToken(class_label)) {
                return true;
            }
        }
        return false;
    }
    return false;
}

}  // namespace analysis
