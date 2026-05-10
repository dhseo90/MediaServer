// 파일 용도: 제품 UI 전역에서 쓰는 테마 초기화와 공통 DOM/API helper JavaScript를 C++ 문자열로 조립한다.
#include "ingress/product_ui_js.h"

#include <sstream>

namespace ingress {

// 주요 동작: 화면 렌더링 전에 저장된 테마 또는 시스템 테마를 document에 적용한다.
std::string ProductThemeBootScript() {
    return R"THEME(  <script>
    (() => {
      const saved = localStorage.getItem('mediaServerTheme');
      const preferred = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = saved === 'dark' || saved === 'light' ? saved : preferred;
      const queryLang = new URLSearchParams(window.location.search).get('lang');
      const savedLang = localStorage.getItem('mediaServerLanguage');
      const normalizedLang = value => String(value || '').toLowerCase().startsWith('en') ? 'en' : 'ko';
      const language = queryLang ? normalizedLang(queryLang) : normalizedLang(savedLang || 'ko');
      if (queryLang) localStorage.setItem('mediaServerLanguage', language);
      document.documentElement.lang = language;
      document.documentElement.dataset.lang = language;
    })();
  </script>
)THEME";
}

// 주요 동작: 폼 직렬화, toast, API 호출, 테이블/감사 이력 helper를 전역 객체로 노출한다.
std::string ProductSharedUiScript() {
    return R"SCRIPT(  <script>
    window.MediaServerUi = window.MediaServerUi || (() => {
      const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[ch]);
      const display = value => value === null || value === undefined || value === '' ? '미제공' : String(value);
      const languageStoreKey = 'mediaServerLanguage';
      const normalizeLanguage = value => String(value || '').toLowerCase().startsWith('en') ? 'en' : 'ko';
      const currentLanguage = () => normalizeLanguage(document.documentElement.dataset.lang || localStorage.getItem(languageStoreKey) || 'ko');
      const koToEn = new Map(Object.entries({
        '언어': 'Language',
        '언어 선택': 'Select language',
        '한국어': 'Korean',
        '다크 모드로 전환': 'Switch to dark mode',
        '라이트 모드로 전환': 'Switch to light mode',
        '현재 계정': 'Current account',
        '홈': 'Home',
        '대시보드': 'Dashboard',
        '채널': 'Channels',
        '룰': 'Rules',
        '사용자': 'Users',
        '클라이언트': 'Client',
        '라이브': 'Live',
        '운영 메뉴': 'Ops menu',
        '클라이언트 메뉴': 'Client menu',
        '로그아웃': 'Log out',
        '새로고침': 'Refresh',
        '로딩 중': 'Loading',
        '불러오는 중': 'Loading',
        '상태 없음': 'No status',
        '미제공': 'Not provided',
        '정상': 'Normal',
        '지연': 'Stale',
        '연결됨': 'Connected',
        '대기': 'Waiting',
        '경고': 'Warning',
        '오류': 'Error',
        '실패': 'Failed',
        '닫힘': 'Closed',
        '상세': 'Detail',
        '보기': 'View',
        '수정': 'Edit',
        '저장': 'Save',
        '닫기': 'Close',
        '삭제': 'Delete',
        '작업': 'Actions',
        '상태': 'Status',
        '이름': 'Name',
        '종류': 'Type',
        '입력': 'Input',
        '선택': 'Sel.',
        '전체': 'All',
        '전체 선택': 'Select all',
        '전체 해제': 'Clear all',
        '기본': 'Default',
        '직접 설정': 'Custom',
        '활성': 'Enabled',
        '비활성': 'Disabled',
        '복제': 'Clone',
        '라이브 보기': 'Live view',
        '없음': 'None',
        '아니요': 'No',
        '아니오': 'No',
        '예': 'Yes',
        '모든 범위': 'All scopes',
        '라이브, 대시보드, 이벤트, 메타데이터 / 미배정 채널': 'Live, Dashboard, Events, Metadata / Unassigned channel',
        '대기 중인 접근 요청이 없습니다.': 'No pending access requests.',
        '검색': 'Search',
        '작업자': 'Actor',
        '대상, 요약, diff 검색': 'Search target, summary, or diff',
        'actor 또는 user target': 'actor or user target',
        'channel:1, username': 'channel:1, username',
        '연도. 월. 일. --:--': 'yyyy-mm-dd --:--',
        '동작': 'Action',
        '시작': 'Start',
        '종료': 'End',
        '페이지 크기': 'Page size',
        '이전': 'Previous',
        '다음': 'Next',
        '아직 기록된 변경 이력이 없습니다.': 'No change history has been recorded yet.',
        '활성화': 'Enable',
        '비활성화': 'Disable',
        '사용자 관리': 'User Management',
        '사용자 목록': 'Users',
        '사용자 추가': 'Add User',
        '사용자 상세': 'User Detail',
        '계정명': 'Username',
        '표시 이름': 'Display name',
        '연락처': 'Contact',
        '사유': 'Reason',
        '권한': 'Role',
        '권한 범위': 'Scopes',
        '마지막 로그인': 'Last login',
        '잠금 만료': 'Lock expires',
        '비밀번호 변경': 'Password change',
        '초기 비밀번호': 'Initial password',
        '비밀번호 확인': 'Confirm password',
        '다음 로그인 시 비밀번호 변경': 'Require password change at next login',
        '시청자': 'Viewer',
        '운영자': 'Operator',
        '연동': 'Integrator',
        '관리자': 'Admin',
        '접근 요청': 'Access Requests',
        '요청/결정': 'Request / decision',
        '요청을 검토하고 초대 링크를 발급합니다.': 'Review requests and issue invite links.',
        '사용자와 권한 범위를 관리합니다.': 'Manage users and scopes.',
        '이 브라우저에서 수행한 사용자 변경의 작업자, 전/후 값, 시각을 확인합니다.': 'Review actor, before/after values, and time for user changes from this browser.',
        '이 브라우저에서 수행한 채널 변경의 작업자, 전/후 값, 시각을 확인합니다.': 'Review actor, before/after values, and time for channel changes from this browser.',
        '이 브라우저에서 수행한 룰 변경의 작업자, 전/후 값, 시각을 확인합니다.': 'Review actor, before/after values, and time for rule changes from this browser.',
        '변경 이력': 'Change History',
        '채널 관리': 'Channel Management',
        '채널 목록': 'Channels',
        '채널 추가': 'Add Channel',
        '채널 상세': 'Channel Detail',
        '채널 ID': 'Channel ID',
        '채널과 PublishedView를 관리합니다.': 'Manage channels and PublishedViews.',
        '목록을 보고 상세/삭제를 진행합니다.': 'Review the list and open details or delete entries.',
        '대량 작업 / 상태 진단': 'Bulk Actions / Diagnostics',
        '선택한 채널을 복제하거나 비활성화하고, source/view 연결 문제를 확인합니다.': 'Clone or disable selected channels and check source/view binding issues.',
        'source/view 연결, 중복 입력, 비활성 상태가 정상 범위입니다.': 'source/view bindings, duplicate inputs, and disabled states are within normal range.',
        '검증': 'Validate',
        '선택 복제': 'Clone selected',
        '선택 비활성화': 'Disable selected',
        '실패 재시도': 'Retry failed',
        '성공 롤백': 'Rollback successful',
        '채널 상태를 불러오는 중입니다.': 'Loading channel status.',
        '라이브 URL': 'Live URL',
        'VA URL': 'VA URL',
        '외부 WHEP': 'External WHEP',
        '파일': 'File',
        '외부 WHEP pull': 'External WHEP pull',
        'RTSP/WHEP는 운영 확인용입니다. 브라우저 재생은 /client/live에서 확인합니다.': 'RTSP/WHEP is for operations checks. Use /client/live for browser playback.',
        '외부 WebRTC playback endpoint를 서버가 WHEP pull source로 연결합니다. URL 자체가 입력값입니다.': 'The server connects an external WebRTC playback endpoint as a WHEP pull source. The URL itself is the input.',
        '외부 URL을 넣는 항목이 아닙니다. 이 서버의 WHIP publish endpoint로 이미 등록된 sourceId를 연결합니다.': 'This is not an external URL field. Connect a sourceId already registered through this server WHIP publish endpoint.',
        '운영 홈': 'Ops Home',
        '운영 구성': 'Ops Configuration',
        '등록된 구성입니다.': 'Registered configuration.',
        '등록 채널': 'Registered channels',
        'VA 룰': 'VA rules',
        '이벤트 룰': 'Event rules',
        '등록된 구성을 보여줍니다.': 'Shows registered configuration.',
        '운영 구성과 현재 상태를 함께 봅니다.': 'Review operations configuration and current status together.',
        '실시간 상태': 'Live Status',
        '현재 상태입니다.': 'Current status.',
        '세션': 'Sessions',
        '스트림': 'Streams',
        '분석 탭': 'Analysis taps',
        '지연 탭': 'Stale taps',
        '지연 탭 없음': 'No stale taps',
        '운영 대시보드': 'Ops Dashboard',
        '현재 상태를 한눈에 봅니다.': 'Review current status at a glance.',
        '활성 세션': 'Active sessions',
        '활성 스트림': 'Active streams',
        'WHIP 소스': 'WHIP sources',
        '상태 요약': 'Health Summary',
        '분석 재사용': 'Analysis Reuse',
        '메타데이터 전송': 'Metadata Delivery',
        '정리 상태': 'Cleanup Status',
        '문제 원인': 'Root Cause',
        'source lifecycle, stale, reconnect, auth/config 상태와 다음 조치를 함께 봅니다.': 'Review source lifecycle, stale, reconnect, auth/config status, and next actions together.',
        '런타임 상태를 불러오는 중입니다.': 'Loading runtime status.',
        '운영 상세': 'Ops Detail',
        '핵심 수치를 바로 봅니다.': 'Review key metrics.',
        '송출': 'Egress',
        '발행': 'Publish',
        '재사용 그룹': 'Reuse groups',
        '메타데이터 채널': 'Metadata channels',
        '룰 설정': 'Rule Settings',
        '종류를 고르고 목록을 관리합니다.': 'Choose a type and manage the list.',
        '채널 분석 설정': 'Channel Analysis Rules',
        '이벤트 템플릿': 'Event Templates',
        '프로파일': 'Profiles',
        '채널 연결': 'Channel bindings',
        '저장 전 검증': 'Pre-save Validation',
        '룰 충돌과 누락을 확인합니다.': 'Check rule conflicts and missing references.',
        '저장 전 차단 항목이 없습니다.': 'No save blockers.',
        'source mismatch, 중복 ID, 누락된 프로파일/템플릿, 비활성 채널/뷰, view 권한 충돌이 없습니다.': 'No source mismatch, duplicate IDs, missing profiles/templates, inactive channels/views, or view permission conflicts.',
        '먼저 준비할 항목': 'Prerequisites',
        '채널 분석 설정은 채널, 프로파일, 이벤트 템플릿을 준비한 뒤 만듭니다.': 'Create channel analysis rules after preparing channels, profiles, and event templates.',
        '확인 중': 'Checking',
        '준비됨': 'Ready',
        '시작 가능': 'Ready to start',
        '채널, 프로파일, 템플릿이 준비되었습니다. 이제 채널 분석 설정을 만들 수 있습니다.': 'Channels, profiles, and templates are ready. You can now create channel analysis rules.',
        '채널 탭에서 입력 소스와 PublishedView를 먼저 준비합니다.': 'Prepare input sources and PublishedViews in the Channels tab first.',
        '채널 열기': 'Open Channels',
        '분석 프로파일': 'Analysis Profiles',
        '검출기, FPS, confidence, adaptive 같은 분석 엔진 설정을 먼저 만듭니다.': 'Create analysis engine settings such as detector, FPS, confidence, and adaptive behavior first.',
        '프로파일 추가': 'Add Profile',
        '이벤트 방식, 시나리오, 대상 객체, 조건값을 템플릿으로 먼저 정리합니다.': 'Define event mode, scenario, target objects, and thresholds as a template first.',
        '템플릿 추가': 'Add Template',
        '채널에 이벤트 템플릿과 프로파일을 연결하고 영역/라인만 정하는 최종 조립 단계입니다.': 'Final assembly step: bind event templates and profiles to channels, then set only zones/lines.',
        '채널에 이벤트 템플릿과 분석 프로파일을 연결하는 최종 조립 단계입니다.': 'Final assembly step: bind event templates and analysis profiles to channels.',
        '채널 분석 설정 추가': 'Add Channel Analysis Rule',
        '설정 종류': 'Configuration Type',
        '무엇을 관리할지 고르고 같은 패턴으로 목록과 상세를 관리합니다.': 'Choose what to manage, then use the same list/detail pattern.',
        '이름, ID 검색': 'Search name or ID',
        '룰 카탈로그 검색': 'Search rule catalog',
        '저장된 항목입니다.': 'Saved items.',
        '침입 후 체류': 'Intrusion dwell',
        'RTSP 복사': 'Copy RTSP',
        'WHEP 복사': 'Copy WHEP',
        'WebRTC 복사': 'Copy WebRTC',
        '이벤트 템플릿 추가': 'Add Event Template',
        '영역/라인': 'Zone / Line',
        'URL 복사': 'Copy URL',
        '구분': 'Mode',
        '대상': 'Target',
        '조건': 'Condition',
        '검출기': 'Detector',
        '사용처': 'Used by',
        '저장된 내용입니다.': 'Saved content.',
        '현재 작성 단계': 'Current step',
        '상태': 'Status',
        '이벤트 템플릿과 프로파일을 고른 뒤 선택한 채널의 source와 PublishedView에 연결합니다.': 'Choose an event template and profile, then bind them to the selected channel source and PublishedView.',
        '선택한 템플릿 요약': 'Selected Template Summary',
        '이벤트 템플릿을 고르면 시나리오와 대상 객체를 그대로 따릅니다.': 'Choosing an event template applies its scenario and target objects.',
        '채널 미리보기와 영역/라인 설정': 'Channel Preview and Zone/Line Setup',
        '선택한 채널 영상을 보면서 같은 영역에서 영역/라인을 정합니다. 개발자용 좌표는 필요할 때만 아래에서 펼쳐 봅니다.': 'Set zones/lines while viewing the selected channel. Expand developer coordinates only when needed.',
        '영상 위 영역/라인 편집': 'Edit zones/lines on video',
        '채널을 고른 뒤 재생하고 같은 화면 위에 영역/라인을 그립니다.': 'Choose a channel, play it, then draw zones/lines on the same screen.',
        '재생': 'Play',
        '재연결': 'Reconnect',
        '정지': 'Stop',
        '영역 편집 상태': 'Geometry edit status',
        '편집 모드': 'Edit mode',
        '영역': 'Zone',
        '라인': 'Line',
        '점 개수': 'Points',
        '저장 조건': 'Save condition',
        '방향': 'Direction',
        '영역 내부': 'Inside zone',
        '영역 미리보기': 'Zone preview',
        '채널을 고른 뒤 재생하세요.': 'Choose a channel, then play.',
        '미리보기 영역을 눌러 점을 추가합니다. 라인은 2점, 영역은 3점 이상이 필요합니다.': 'Click the preview to add points. Lines need 2 points; zones need at least 3 points.',
        '기본 좌표': 'Default coordinates',
        '되돌리기': 'Undo',
        '마지막 점 삭제': 'Delete last point',
        '비우기': 'Clear',
        '개발자용 좌표 보기': 'Show developer coordinates',
        '형태': 'Shape',
        '좌표': 'Coordinates',
        '구성': 'Configuration',
        '이벤트': 'Event',
        '시나리오': 'Scenario',
        '현장 preset': 'Site preset',
        '도로': 'Road',
        '공원': 'Park',
        '실내': 'Indoor',
        '로비': 'Lobby',
        '승강장': 'Platform',
        '출입구': 'Entrance',
        '최소 신뢰도': 'Minimum confidence',
        '최소 지속 시간(ms)': 'Minimum duration (ms)',
        '대상 객체': 'Target Objects',
        '템플릿에서 기본으로 제안할 객체를 고릅니다.': 'Choose objects suggested by this template.',
        '사람, 차량': 'Person, vehicle',
        '이벤트 조건': 'Event Conditions',
        '템플릿이 담당하는 판단 조건과 재알림 규칙입니다.': 'Decision conditions and re-notification rules for this template.',
        '라인 방향': 'Line direction',
        '양방향': 'Both directions',
        '정방향': 'Forward',
        '역방향': 'Reverse',
        '후보 판단 시간(ms)': 'Candidate time (ms)',
        '확정/체류 시간(ms)': 'Confirm/dwell time (ms)',
        '재진입 허용 시간(ms)': 'Re-entry window (ms)',
        '재진입 기준': 'Re-entry basis',
        '같은 영역': 'Same zone',
        '지정 영역': 'Configured zones',
        '라인 후 최대 지연(ms)': 'Max delay after line (ms)',
        '트리거 라인 방향': 'Trigger line direction',
        '최대 이동 반경': 'Max movement radius',
        '최소 이동 경로 점수': 'Minimum path points',
        '점유 임계값': 'Occupancy threshold',
        '최소 점유 체류(ms)': 'Minimum occupancy dwell (ms)',
        '재알림 대기(ms)': 'Cooldown (ms)',
        '여러 채널 분석 설정에서 다시 고를 수 있는 공통 이벤트 템플릿입니다.': 'A reusable event template for multiple channel analysis rules.',
        '입력 폭': 'Input width',
        '입력 높이': 'Input height',
        '검출기, FPS, confidence, 입력 크기 같은 분석 엔진 설정만 정의합니다.': 'Defines only analysis engine settings such as detector, FPS, confidence, and input size.',
        '할당 채널': 'Assigned Channels',
        '채널을 선택하세요': 'Select a channel',
        '허용된 채널을 선택하면 이 영역에 상태가 표시됩니다.': 'Select an allowed channel to show status here.',
        '할당된 PublishedView가 없습니다': 'No assigned PublishedViews',
        '미리보기에 표시할 채널이 없습니다. Ops에서 채널과 계정 권한을 확인하세요.': 'No channels are available for preview. Check channels and account permissions in Ops.',
        '이 계정에 허용된 채널이 없습니다. 관리자에게 채널 접근 권한을 요청하세요.': 'No channels are allowed for this account. Ask an administrator for channel access.',
        '원본': 'Raw',
        'VA 오버레이': 'VA Overlay',
        'VA 룰': 'VA Rule',
        '소스': 'Source',
        '대시보드': 'Dashboard',
        '채널 선택': 'Select channel',
        '표준': 'Standard',
        '고밀도': 'Compact',
        '그리드': 'Grid',
        '밀도': 'Density',
        '전체 재연결': 'Reconnect all',
        '전체 정지': 'Stop all',
        '타일': 'Tiles',
        '타일 1': 'Tile 1',
        '연결': 'Connection',
        '연결 중': 'Connecting',
        '트랙': 'Tracks',
        '마지막 프레임': 'Last frame',
        '재시도': 'Retry',
        '보기 방식': 'View mode',
        '오프라인': 'Offline',
        '메타데이터': 'Metadata',
        '재시도': 'Retry',
        '확인 필요': 'Needs attention',
        '이벤트 있음': 'Has events',
        '경고 우선': 'Warnings first',
        '이벤트 많은 순': 'Most events',
        '이름순': 'Name',
        '적용': 'Apply',
        '초기화': 'Reset',
        '정상 관제 중': 'Monitoring normally',
        '영상 상태 확인': 'Check video status',
        '메타데이터 지연': 'Metadata delayed',
        '신호 미제공': 'Signal unavailable',
        '상태 조회 실패': 'Status lookup failed',
        '기본 현장': 'Default site',
        '라인 통과': 'Line crossing',
        '침입': 'Intrusion',
        '배회': 'Loitering',
        '혼잡/점유': 'Crowding / occupancy',
        '출입': 'Entry / exit',
        '존재 감지': 'Presence detection'
      }));
      const translatePattern = text => {
        const rules = [
          [/^권한:\s*(.+)$/u, (_match, role) => `Role: ${role}`],
          [/^전체\s+(\d+)$/u, (_match, count) => `All ${count}`],
          [/^선택\s+(\d+)$/u, (_match, count) => `Selected ${count}`],
          [/^비활성\s+(\d+)$/u, (_match, count) => `Disabled ${count}`],
          [/^view 누락\s+(\d+)$/u, (_match, count) => `Missing views ${count}`],
          [/^입력 미완성\s+(\d+)$/u, (_match, count) => `Incomplete inputs ${count}`],
          [/^타일\s+(\d+)\s+·\s+(.+)$/u, (_match, count, mode) => `Tile ${count} · ${koToEn.get(mode) || mode}`],
          [/^(\d+)개 범위\s+([\s\S]+)$/u, (_match, count, detail) => `${count} scopes\n${koToEn.get(detail.trim()) || detail}`],
          [/^(\d+)개 범위$/u, (_match, count) => `${count} scopes`],
          [/^총\s+(\d+)\/(\d+)개\s+·\s+연결\s+(\d+)개$/u, (_match, shown, total, bound) => `${shown}/${total} total · ${bound} bound`],
          [/^(\d+)점$/u, (_match, count) => `${count} points`],
          [/^최대\s+(\d+)개$/u, (_match, count) => `Up to ${count}`],
          [/^최소\s+(\d+)점$/u, (_match, count) => `At least ${count} points`],
          [/^(\d+)개$/u, (_match, count) => `${count}`],
          [/^(\d+)\s*채널$/u, (_match, count) => `${count} channels`],
          [/^(\d+)\s*사용자$/u, (_match, count) => `${count} users`],
          [/^(\d+)\s*VA 룰$/u, (_match, count) => `${count} VA rules`],
          [/^(\d+)\s*이벤트 룰$/u, (_match, count) => `${count} event rules`],
          [/^(.+)\s+·\s+최대\s+(\d+)개$/u, (_match, name, count) => `${name} · up to ${count}`],
          [/^(.+)\s+모니터링$/u, (_match, name) => `${name} monitoring`],
          [/^(.+)\s+·\s+활성 이벤트 우선 확인$/u, (_match, name) => `${name} · active events first`],
          [/^(.+)\s+·\s+시나리오 관제 중$/u, (_match, name) => `${name} · scenario monitoring`],
          [/^(.+)\s+·\s+(.+)\s+우선 확인$/u, (_match, place, event) => `${place} · ${event} priority`]
        ];
        for (const [pattern, mapper] of rules) {
          const match = text.match(pattern);
          if (match) return mapper(...match);
        }
        return text;
      };
      const translateText = (value, language = currentLanguage()) => {
        const raw = String(value ?? '');
        if (language !== 'en' || raw.trim() === '') return raw;
        const leading = raw.match(/^\s*/)?.[0] || '';
        const trailing = raw.match(/\s*$/)?.[0] || '';
        const core = raw.trim();
        const translated = koToEn.get(core) || translatePattern(core);
        return leading + translated + trailing;
      };
      const textNodeSources = new WeakMap();
      const attrSources = new WeakMap();
      const translationSkippedTags = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD', 'SAMP', 'TEXTAREA']);
      const shouldTranslateNode = node => {
        const parent = node?.parentElement;
        return Boolean(parent && !translationSkippedTags.has(parent.tagName) && !parent.closest('[data-i18n-skip]'));
      };
      const translateTextNode = (node, language) => {
        if (!shouldTranslateNode(node)) return;
        let source = textNodeSources.get(node);
        const translatedSource = source ? translateText(source, 'en') : '';
        if (!source || (node.data !== source && node.data !== translatedSource)) {
          source = node.data;
          textNodeSources.set(node, source);
        }
        const next = translateText(source, language);
        if (node.data !== next) node.data = next;
      };
      const translateElementAttrs = (el, language) => {
        if (!el || translationSkippedTags.has(el.tagName) || el.closest('[data-i18n-skip]')) return;
        for (const attr of ['placeholder', 'title', 'aria-label']) {
          if (!el.hasAttribute(attr)) continue;
          const key = `${attr}:source`;
          const current = el.getAttribute(attr) || '';
          let state = attrSources.get(el) || {};
          let source = state[key];
          const translatedSource = source ? translateText(source, 'en') : '';
          if (!source || (current !== source && current !== translatedSource)) {
            source = current;
            state = { ...state, [key]: source };
            attrSources.set(el, state);
          }
          const next = translateText(source, language);
          if (current !== next) el.setAttribute(attr, next);
        }
      };
      let translating = false;
      let i18nObserver = null;
      const translatePage = (root = document.body, language = currentLanguage()) => {
        if (!root || translating) return;
        translating = true;
        try {
          document.documentElement.lang = language;
          document.documentElement.dataset.lang = language;
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          while (walker.nextNode()) textNodes.push(walker.currentNode);
          for (const node of textNodes) translateTextNode(node, language);
          const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : root.querySelectorAll ? Array.from(root.querySelectorAll('*')) : [];
          for (const el of elements) translateElementAttrs(el, language);
          document.querySelectorAll('.language-select').forEach(select => {
            if (select.value !== language) select.value = language;
          });
        } finally {
          translating = false;
        }
      };
      const setLanguage = (language, options = {}) => {
        const next = normalizeLanguage(language);
        if (options.persist !== false) localStorage.setItem(languageStoreKey, next);
        document.documentElement.lang = next;
        document.documentElement.dataset.lang = next;
        translatePage(document.body, next);
        window.dispatchEvent(new CustomEvent('mediaServer.languagechange', { detail: { language: next } }));
        return next;
      };
      const bindLanguageControls = () => {
        const language = normalizeLanguage(localStorage.getItem(languageStoreKey) || document.documentElement.dataset.lang || 'ko');
        setLanguage(language, { persist: false });
        document.querySelectorAll('.language-select').forEach(select => {
          if (select.dataset.languageBound === '1') return;
          select.dataset.languageBound = '1';
          select.value = language;
          select.addEventListener('change', () => setLanguage(select.value));
        });
        if (!i18nObserver && document.body) {
          i18nObserver = new MutationObserver(mutations => {
            if (translating) return;
            const languageNow = currentLanguage();
            window.requestAnimationFrame(() => {
              for (const mutation of mutations) {
                if (mutation.type === 'characterData') {
                  translateTextNode(mutation.target, languageNow);
                } else {
                  mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, languageNow);
                    if (node.nodeType === Node.ELEMENT_NODE) translatePage(node, languageNow);
                  });
                }
              }
            });
          });
          i18nObserver.observe(document.body, { childList: true, characterData: true, subtree: true });
        }
      };
      const numberValue = value => Number.isFinite(Number(value)) ? Number(value) : 0;
      const byId = id => document.getElementById(id);
      const qs = (selector, root = document) => root.querySelector(selector);
      const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
      const on = (target, event, handler, options) => {
        if (target) target.addEventListener(event, handler, options);
        return target;
      };
      const setText = (id, value) => {
        const el = byId(id);
        if (el) el.textContent = display(value);
      };
      const setHidden = (el, hidden) => {
        if (el) el.hidden = Boolean(hidden);
        return el;
      };
      const setRequired = (el, required) => {
        if (el) el.required = Boolean(required);
        return el;
      };
      const setFeedback = (el, message, failed = false, options = {}) => {
        if (!el) return;
        el.textContent = message;
        el.classList.toggle('error', failed);
        if (options.collapseEmpty) el.hidden = !message;
      };
      const showToast = (message, failed = false) => {
        const text = display(message);
        if (!text || text === '미제공') return;
        let stack = document.querySelector('.toast-stack');
        if (!stack) {
          stack = document.createElement('div');
          stack.className = 'toast-stack';
          stack.setAttribute('aria-live', 'polite');
          stack.setAttribute('aria-atomic', 'false');
          document.body.appendChild(stack);
        }
        const toast = document.createElement('div');
        toast.className = `toast${failed ? ' error' : ''}`;
        toast.setAttribute('role', failed ? 'alert' : 'status');
        toast.textContent = text;
        stack.appendChild(toast);
        window.setTimeout(() => {
          toast.classList.add('leaving');
          window.setTimeout(() => {
            toast.remove();
            if (!stack.children.length) stack.remove();
          }, 220);
        }, failed ? 3200 : 1600);
      };
      const formDataObject = form => Object.fromEntries(new FormData(form).entries());
      const splitList = value => String(value ?? '').split(/[\n,]/).map(item => item.trim()).filter(Boolean);
      const setTableEmpty = (tbody, colspan, message) => {
        if (!tbody) return;
        tbody.textContent = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = Number(colspan) || 1;
        td.textContent = message;
        tr.appendChild(td);
        tbody.appendChild(tr);
      };
      const tableCellHtml = (label, html, className = '') => {
        const classText = String(className || '').trim();
        const classAttr = classText ? ` class="${escapeHtml(classText)}"` : '';
        return `<td data-label="${escapeHtml(label)}"${classAttr}>${html}</td>`;
      };
      const opsClassNames = (...items) => items
        .flatMap(item => Array.isArray(item) ? item : String(item || '').split(/\s+/))
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .join(' ');
      const opsRowActionsHtml = (html, className = '') =>
        `<div class="${escapeHtml(opsClassNames('table-actions', 'ops-row-actions', className))}">${html}</div>`;
      const opsTableRowHtml = (cells = [], className = '') => {
        const classText = opsClassNames(className);
        const classAttr = classText ? ` class="${escapeHtml(classText)}"` : '';
        return `<tr${classAttr}>${cells.join('')}</tr>`;
      };
      const appendTableCell = (tr, label, html, className = '') => {
        const td = document.createElement('td');
        td.setAttribute('data-label', label);
        if (className) td.className = String(className);
        td.innerHTML = html;
        tr.appendChild(td);
        return td;
      };
      const setOpsDetailPanelOpen = (panel, open = true, options = {}) => {
        if (!panel) return null;
        panel.classList.add('ops-detail-panel');
        panel.hidden = !open;
        if (open && options.scroll) {
          panel.scrollIntoView({
            behavior: options.behavior || 'smooth',
            block: options.block || 'start'
          });
        }
        return panel;
      };
      const setSelectOptions = (select, items = [], selected = '') => {
        if (!select) return;
        select.textContent = '';
        for (const item of items) {
          const option = document.createElement('option');
          const value = typeof item === 'object' && item !== null ? item.value : item;
          const label = typeof item === 'object' && item !== null ? item.label : item;
          option.value = String(value ?? '');
          option.textContent = display(label);
          select.appendChild(option);
        }
        if (selected !== '') select.value = selected;
      };
      const chip = (text, tone = '') => `<span class="chip${tone ? ' ' + tone : ''}">${escapeHtml(display(text))}</span>`;
      const renderBadges = (id, items = []) => {
        const el = byId(id);
        if (!el) return;
        el.textContent = '';
        const badges = items.length > 0 ? items : [{ text: '상태 없음', tone: 'info' }];
        for (const item of badges) {
          const span = document.createElement('span');
          span.className = `chip${item.tone ? ' ' + item.tone : ''}`;
          span.textContent = display(item.text);
          el.appendChild(span);
        }
      };
      const renderRaw = (preId, checkboxId, payload) => {
        const pre = byId(preId);
        const checkbox = byId(checkboxId);
        if (!pre) return;
        const pretty = !checkbox || checkbox.checked;
        pre.textContent = JSON.stringify(payload, null, pretty ? 2 : 0);
      };
      async function requestJson(url, options = {}) {
        const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
        const text = await response.text();
        let json = {};
        try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
        if (!response.ok) throw new Error(json.error || `${response.status} ${response.statusText}`);
        return json;
      }
      async function applyPrincipalVisibility() {
        const response = await fetch('/auth/whoami', { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) return null;
        const who = await response.json();
        const scopes = Array.isArray(who.scopes) ? who.scopes : [];
        const isAdmin = who.role === 'admin';
        const isOperator = who.role === 'operator';
        const hasOps = isAdmin || scopes.includes('*') || scopes.includes('ops:read');
        const hasLab = isAdmin || isOperator || scopes.includes('*') || scopes.includes('lab:read');
        document.querySelectorAll('[data-admin-only]').forEach(el => { el.hidden = !isAdmin; });
        document.querySelectorAll('[data-ops-scope]').forEach(el => { el.hidden = !hasOps; });
        document.querySelectorAll('[data-lab-scope]').forEach(el => { el.hidden = !hasLab; });
        return who;
      }
      let principalPromise = null;
      async function currentPrincipal() {
        if (!principalPromise) principalPromise = applyPrincipalVisibility().catch(() => null);
        return principalPromise;
      }
      const auditStoreKey = 'mediaServerOpsAuditTrail.v1';
      const auditKeyRedacted = key => /(password|token|hash|secret|capability)/i.test(String(key || ''));
      const compactAuditValue = (value, depth = 0) => {
        if (value === null || value === undefined) return value;
        if (auditKeyRedacted('' + value) && typeof value === 'string' && value.length > 24) return '[redacted]';
        if (typeof value === 'string') return value.length > 180 ? `${value.slice(0, 177)}...` : value;
        if (typeof value === 'number' || typeof value === 'boolean') return value;
        if (depth >= 3) return '[nested]';
        if (Array.isArray(value)) return value.slice(0, 12).map(item => compactAuditValue(item, depth + 1));
        if (typeof value === 'object') {
          const out = {};
          for (const [key, entry] of Object.entries(value)) {
            out[key] = auditKeyRedacted(key) ? '[redacted]' : compactAuditValue(entry, depth + 1);
          }
          return out;
        }
        return display(value);
      };
      const stableAuditJson = value => JSON.stringify(compactAuditValue(value));
      const summarizeAuditChange = (beforeValue, afterValue) => {
        const before = beforeValue && typeof beforeValue === 'object' && !Array.isArray(beforeValue) ? beforeValue : {};
        const after = afterValue && typeof afterValue === 'object' && !Array.isArray(afterValue) ? afterValue : {};
        const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
        const changed = [];
        for (const key of keys) {
          if (auditKeyRedacted(key)) continue;
          if (stableAuditJson(before[key]) !== stableAuditJson(after[key])) changed.push(key);
        }
        return changed.slice(0, 6).join(', ') || '상태';
      };
      const loadOpsAuditTrail = () => {
        try {
          const parsed = JSON.parse(localStorage.getItem(auditStoreKey) || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };
      const saveOpsAuditTrail = entries => {
        localStorage.setItem(auditStoreKey, JSON.stringify(entries.slice(0, 80)));
      };
      async function persistOpsAuditTrail(entry) {
        const payload = await requestJson('/ops/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
        return payload.entry || entry;
      }
      const opsAuditViewStates = new Map();
      const auditFilterEntry = (entry, state = {}) => {
        if (state.actor && !String(entry.actor || '').includes(state.actor)) return false;
        if (state.user) {
          const userNeedle = String(state.user).toLowerCase();
          const userHaystack = `${entry.actor || ''} ${entry.target || ''}`.toLowerCase();
          if (!userHaystack.includes(userNeedle)) return false;
        }
        if (state.target && !String(entry.target || '').toLowerCase().includes(String(state.target).toLowerCase())) return false;
        if (state.action && String(entry.action || '') !== state.action) return false;
        const entryTime = Number(entry.receivedAtMs || (entry.at ? Date.parse(entry.at) : 0));
        if (state.fromMs && (!Number.isFinite(entryTime) || entryTime < Number(state.fromMs))) return false;
        if (state.toMs && (!Number.isFinite(entryTime) || entryTime > Number(state.toMs))) return false;
        if (state.q) {
          const haystack = JSON.stringify(entry).toLowerCase();
          if (!haystack.includes(String(state.q).toLowerCase())) return false;
        }
        return true;
      };
      const auditQueryParams = (area = '', filters = {}) => {
        const params = new URLSearchParams({ limit: String(filters.limit || 20) });
        if (area) params.set('area', area);
        if (filters.actor) params.set('actor', filters.actor);
        if (filters.user) params.set('user', filters.user);
        if (filters.target) params.set('target', filters.target);
        if (filters.action) params.set('action', filters.action);
        if (filters.q) params.set('q', filters.q);
        if (filters.fromMs) params.set('fromMs', String(filters.fromMs));
        if (filters.toMs) params.set('toMs', String(filters.toMs));
        if (filters.offset) params.set('offset', String(filters.offset));
        return params;
      };
      const auditFilterPresetsFor = area => {
        if (area !== 'channels') return [];
        return [
          { id: 'source-health-state-change', label: 'Source Health 변경', state: { q: '', actor: '', user: '', target: '', action: 'source-health-state-change', fromMs: '', toMs: '' } },
          { id: 'all', label: '전체 이력', state: { q: '', actor: '', user: '', target: '', action: '', fromMs: '', toMs: '' } }
        ];
      };
      const auditLocalDateTime = value => {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric) || numeric <= 0) return '';
        const date = new Date(numeric);
        const pad = number => String(number).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      };
      const auditDateTimeMs = value => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const parsed = Date.parse(raw);
        return Number.isFinite(parsed) ? String(parsed) : '';
      };
      async function fetchOpsAuditTrailPage(area = '', filters = {}) {
        const params = auditQueryParams(area, filters);
        const payload = await requestJson(`/ops/api/audit?${params.toString()}`);
        return {
          ...payload,
          entries: Array.isArray(payload.entries) ? payload.entries : [],
          offset: Number(payload.offset || 0),
          limit: Number(payload.limit || filters.limit || 20),
          total: Number(payload.total || 0),
          hasMore: Boolean(payload.hasMore)
        };
      }
      async function fetchOpsAuditTrail(area = '', filters = {}) {
        const payload = await fetchOpsAuditTrailPage(area, filters);
        return payload.entries;
      }
      async function recordOpsAudit({ area = 'ops', action = 'update', target = '', before = null, after = null } = {}) {
        const who = await currentPrincipal();
        const actor = who?.username || who?.displayName || who?.role || 'dev-admin';
        const entry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
          actor,
          role: who?.role || '',
          area,
          action,
          target: String(target || ''),
          summary: summarizeAuditChange(before, after),
          before: compactAuditValue(before),
          after: compactAuditValue(after)
        };
        const entries = loadOpsAuditTrail();
        entries.unshift(entry);
        saveOpsAuditTrail(entries);
        let persisted = entry;
        try {
          persisted = await persistOpsAuditTrail(entry);
          const current = loadOpsAuditTrail().filter(item => item.id !== entry.id && item.id !== persisted.id);
          current.unshift(persisted);
          saveOpsAuditTrail(current);
        } catch (error) {
          persisted = { ...entry, persistenceError: error.message || 'server audit unavailable' };
        }
        window.dispatchEvent(new CustomEvent('mediaServer.audit', { detail: persisted }));
        return persisted;
      }
      function ensureOpsAuditDetailModal() {
        let dialog = byId('opsAuditDetailDialog');
        if (dialog) return dialog;
        dialog = document.createElement('dialog');
        dialog.id = 'opsAuditDetailDialog';
        dialog.className = 'audit-detail-modal';
        dialog.innerHTML = `
          <form method="dialog">
            <div class="audit-detail-head">
              <div>
                <strong id="opsAuditDetailTitle">변경 상세</strong>
                <p id="opsAuditDetailMeta"></p>
              </div>
              <button type="submit" class="btn small">닫기</button>
            </div>
            <div class="audit-diff-grid">
              <pre id="opsAuditDetailBefore"></pre>
              <pre id="opsAuditDetailAfter"></pre>
            </div>
          </form>`;
        document.body.appendChild(dialog);
        return dialog;
      }
      function openOpsAuditDetail(entry) {
        const dialog = ensureOpsAuditDetailModal();
        byId('opsAuditDetailTitle').textContent = `${display(entry.area)} ${display(entry.action)} · ${display(entry.target)}`;
        byId('opsAuditDetailMeta').textContent = `${display(entry.actor)} · ${entry.at ? new Date(entry.at).toLocaleString() : '시각 미제공'} · ${display(entry.summary)}`;
        byId('opsAuditDetailBefore').textContent = JSON.stringify(entry.before ?? null, null, 2);
        byId('opsAuditDetailAfter').textContent = JSON.stringify(entry.after ?? null, null, 2);
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', 'open');
      }
      function auditStateFor(containerId, area = '') {
        if (!opsAuditViewStates.has(containerId)) {
          opsAuditViewStates.set(containerId, { area, q: '', actor: '', user: '', target: '', action: '', fromMs: '', toMs: '', limit: 10, offset: 0 });
        }
        const state = opsAuditViewStates.get(containerId);
        state.area = area;
        return state;
      }
      function renderOpsAuditTrail(containerId, area = '') {
        const el = byId(containerId);
        if (!el) return;
        const state = auditStateFor(containerId, area);
        const renderEntries = (entries, sourceLabel = '', page = {}) => {
        const list = el.querySelector('[data-audit-list-body]');
        if (!list) return;
        if (entries.length === 0) {
          list.innerHTML = '<div class="empty">아직 기록된 변경 이력이 없습니다.</div>';
          return;
        }
        const actionLabel = value => ({
          create: '생성',
          update: '수정',
          delete: '삭제',
          enable: '활성화',
          disable: '비활성화',
          'bulk-clone': '대량 복제',
          'bulk-disable': '대량 비활성화',
          'source-health-state-change': 'Source Health 변경',
          approve: '승인',
          reject: '거절'
        })[String(value || '')] || display(value);
        const areaLabel = value => ({
          channels: '채널',
          rules: '룰',
          users: '사용자',
          events: '이벤트'
        })[String(value || '')] || display(value);
        list.innerHTML = `${sourceLabel ? `<div class="audit-source-label">${escapeHtml(sourceLabel)}${Number.isFinite(page.total) ? ` · ${escapeHtml(display(page.offset + 1))}-${escapeHtml(display(page.offset + entries.length))} / ${escapeHtml(display(page.total))}` : ''}</div>` : ''}` + entries.map((entry, index) => `
          <article class="audit-entry">
            <div class="audit-entry-head">
              <strong>${escapeHtml(areaLabel(entry.area))} ${escapeHtml(actionLabel(entry.action))}</strong>
              <span>${escapeHtml(new Date(entry.at).toLocaleString())}</span>
            </div>
            <div class="audit-entry-meta">
              <span>대상 ${escapeHtml(display(entry.target))}</span>
              <span>작업자 ${escapeHtml(display(entry.actor))}${entry.role ? ` · ${escapeHtml(entry.role)}` : ''}</span>
              <span>변경 ${escapeHtml(display(entry.summary))}</span>
            </div>
            <div class="audit-entry-actions">
              <button type="button" class="btn small" data-audit-detail="${index}">상세</button>
            </div>
            <details>
              <summary>전/후 보기</summary>
              <div class="audit-diff-grid">
                <pre>${escapeHtml(JSON.stringify(entry.before ?? null, null, 2))}</pre>
                <pre>${escapeHtml(JSON.stringify(entry.after ?? null, null, 2))}</pre>
              </div>
            </details>
          </article>
        `).join('');
        list.querySelectorAll('[data-audit-detail]').forEach(button => {
          button.addEventListener('click', () => {
            const entry = entries[Number(button.dataset.auditDetail || 0)];
            if (entry) openOpsAuditDetail(entry);
          });
        });
        };
        const auditPresets = auditFilterPresetsFor(area);
        el.innerHTML = `
          <div class="audit-controls">
            <div class="audit-filter-grid">
              <label>검색
                <input id="${containerId}-audit-q" value="${escapeHtml(state.q)}" placeholder="대상, 요약, diff 검색">
              </label>
              <label>작업자
                <input id="${containerId}-audit-actor" value="${escapeHtml(state.actor)}" placeholder="username">
              </label>
              <label>사용자
                <input id="${containerId}-audit-user" value="${escapeHtml(state.user)}" placeholder="actor 또는 user target">
              </label>
              <label>대상
                <input id="${containerId}-audit-target" value="${escapeHtml(state.target)}" placeholder="channel:1, user:name">
              </label>
              <label>동작
                <select id="${containerId}-audit-action">
                  <option value="">전체</option>
                  <option value="create">생성</option>
                  <option value="update">수정</option>
                  <option value="delete">삭제</option>
                  <option value="enable">활성화</option>
                  <option value="disable">비활성화</option>
                  <option value="bulk-clone">대량 복제</option>
                  <option value="bulk-disable">대량 비활성화</option>
                  <option value="source-health-state-change">Source Health 변경</option>
                  <option value="approve">승인</option>
                  <option value="reject">거절</option>
                  <option value="export-bundle">증거 export</option>
                </select>
              </label>
              <label>시작
                <input id="${containerId}-audit-from" type="datetime-local" lang="${escapeHtml(currentLanguage())}" value="${escapeHtml(auditLocalDateTime(state.fromMs))}">
              </label>
              <label>종료
                <input id="${containerId}-audit-to" type="datetime-local" lang="${escapeHtml(currentLanguage())}" value="${escapeHtml(auditLocalDateTime(state.toMs))}">
              </label>
              <label>페이지 크기
                <select id="${containerId}-audit-limit">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </label>
            </div>
            ${auditPresets.length ? `<div class="audit-presets" aria-label="Audit filter presets">${auditPresets.map(preset => `<button type="button" class="btn small" data-audit-preset="${escapeHtml(preset.id)}">${escapeHtml(preset.label)}</button>`).join('')}</div>` : ''}
            <div class="audit-toolbar">
              <button type="button" class="btn small" data-audit-apply>검색</button>
              <button type="button" class="btn small" data-audit-prev>이전</button>
              <button type="button" class="btn small" data-audit-next>다음</button>
              <button type="button" class="btn small" data-audit-export="json">JSON</button>
              <button type="button" class="btn small" data-audit-export="csv">CSV</button>
              <button type="button" class="btn small" data-audit-export="diff-json">Diff JSON</button>
            </div>
          </div>
          <div data-audit-list-body></div>`;
        byId(`${containerId}-audit-action`).value = state.action;
        byId(`${containerId}-audit-limit`).value = String(state.limit);
        const syncState = resetOffset => {
          state.q = byId(`${containerId}-audit-q`)?.value.trim() || '';
          state.actor = byId(`${containerId}-audit-actor`)?.value.trim() || '';
          state.user = byId(`${containerId}-audit-user`)?.value.trim() || '';
          state.target = byId(`${containerId}-audit-target`)?.value.trim() || '';
          state.action = byId(`${containerId}-audit-action`)?.value || '';
          state.fromMs = auditDateTimeMs(byId(`${containerId}-audit-from`)?.value || '');
          state.toMs = auditDateTimeMs(byId(`${containerId}-audit-to`)?.value || '');
          state.limit = Number(byId(`${containerId}-audit-limit`)?.value || 10);
          if (resetOffset) state.offset = 0;
        };
        el.querySelector('[data-audit-apply]')?.addEventListener('click', () => {
          syncState(true);
          renderOpsAuditTrail(containerId, area);
        });
        el.querySelectorAll('[data-audit-preset]').forEach(button => {
          button.addEventListener('click', () => {
            const preset = auditPresets.find(item => item.id === button.dataset.auditPreset);
            if (!preset) return;
            Object.assign(state, preset.state, { offset: 0 });
            renderOpsAuditTrail(containerId, area);
          });
        });
        el.querySelector('[data-audit-prev]')?.addEventListener('click', () => {
          syncState(false);
          state.offset = Math.max(0, state.offset - state.limit);
          renderOpsAuditTrail(containerId, area);
        });
        el.querySelector('[data-audit-next]')?.addEventListener('click', () => {
          syncState(false);
          state.offset += state.limit;
          renderOpsAuditTrail(containerId, area);
        });
        el.querySelectorAll('[data-audit-export]').forEach(button => {
          button.addEventListener('click', () => {
            syncState(false);
            const format = button.dataset.auditExport || 'json';
            const params = auditQueryParams(area, { ...state, limit: 1000, offset: 0 });
            params.set('format', format);
            params.set('download', '1');
            window.location.href = `/ops/api/audit?${params.toString()}`;
          });
        });
        const localEntries = loadOpsAuditTrail()
          .filter(entry => !area || entry.area === area)
          .filter(entry => auditFilterEntry(entry, state))
          .slice(state.offset, state.offset + state.limit);
        renderEntries(localEntries, '브라우저 캐시');
        fetchOpsAuditTrailPage(area, state)
          .then(payload => renderEntries(payload.entries, '서버 감사 로그', payload))
          .catch(() => {
            if (localEntries.length === 0) {
              const list = el.querySelector('[data-audit-list-body]');
              if (list) list.innerHTML = '<div class="empty">서버 감사 로그를 불러오지 못했습니다.</div>';
            }
          });
      }
      return {
        escapeHtml,
        display,
        translateText,
        translatePage,
        setLanguage,
        currentLanguage,
        bindLanguageControls,
        numberValue,
        byId,
        qs,
        qsa,
        on,
        setText,
        setHidden,
        setRequired,
        setFeedback,
        showToast,
        formDataObject,
        splitList,
        setTableEmpty,
        tableCellHtml,
        opsRowActionsHtml,
        opsTableRowHtml,
        appendTableCell,
        setOpsDetailPanelOpen,
        setSelectOptions,
        chip,
        renderBadges,
        renderRaw,
        requestJson,
        applyPrincipalVisibility,
        fetchOpsAuditTrailPage,
        fetchOpsAuditTrail,
        recordOpsAudit,
        renderOpsAuditTrail
      };
    })();
  </script>
)SCRIPT";
}

void AppendProductThemeScript(std::ostringstream& out) {
    out << R"SCRIPT(    <script>
	      (() => {
	        const button = document.getElementById('themeToggleBtn');
	        const currentTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
	        const syncFrames = (theme = currentTheme()) => {
	          document.querySelectorAll('iframe').forEach(frame => {
	            try {
	              frame.contentWindow?.postMessage({ type: 'mediaServer.theme', theme }, window.location.origin);
	            } catch {}
	          });
	        };
	        const bindFrameThemeSync = () => {
	          document.querySelectorAll('iframe').forEach(frame => {
	            if (frame.dataset.themeSyncBound === '1') return;
	            frame.dataset.themeSyncBound = '1';
	            frame.addEventListener('load', () => syncFrames());
	          });
	          syncFrames();
	        };
	        const sync = () => {
	          const theme = currentTheme();
	          const label = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
	          if (button) {
	            button.setAttribute('aria-label', label);
	            button.setAttribute('title', label);
	          }
	          bindFrameThemeSync();
	          window.MediaServerUi?.translatePage?.();
	        };
	        sync();
	        window.MediaServerUi?.bindLanguageControls?.();
	        if (button) {
	          button.addEventListener('click', () => {
	            const next = currentTheme() === 'dark' ? 'light' : 'dark';
	            document.documentElement.dataset.theme = next;
	            localStorage.setItem('mediaServerTheme', next);
	            syncFrames(next);
	            sync();
	          });
	        }
	        window.addEventListener('load', bindFrameThemeSync);
	        setTimeout(bindFrameThemeSync, 0);
	      })();
	    </script>
)SCRIPT";
}

}  // namespace ingress
