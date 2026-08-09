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
        '운영': 'Ops',
        '대시보드': 'Dashboard',
        '채널': 'Channels',
        '룰': 'Rules',
        '사용자': 'Users',
        '클라이언트': 'Client',
        '관리자 클라이언트 미리보기': 'Client Preview as admin',
        '미리보기': 'Client Preview',
        '라이브': 'Live',
        '운영 메뉴': 'Ops menu',
        '클라이언트 메뉴': 'Client menu',
        '로그인': 'Login',
        '로그아웃': 'Log out',
        '새로고침': 'Refresh',
        '로딩 중': 'Loading',
        '불러오는 중': 'Loading',
        '상태 없음': 'No status',
        '시각 미제공': 'Time not provided',
        '미제공': 'Not provided',
        '미수신': 'Not received',
        '정상': 'Normal',
        '확인': 'Check',
        '지연': 'Stale',
        '연결됨': 'Connected',
        '연결 끊김': 'Disconnected',
        '온라인': 'Online',
        '대기': 'Waiting',
        '경고': 'Warning',
        '오류': 'Error',
        '실패': 'Failed',
        '수신': 'Receiving',
        '수신 중': 'Receiving',
        '구독 세션 없음': 'No subscriber session',
        '닫힘': 'Closed',
        '상세': 'Detail',
        '보기': 'View',
        '수정': 'Edit',
        '저장': 'Save',
        '닫기': 'Close',
        '삭제': 'Delete',
        '작업': 'Actions',
        '추가 작업': 'More actions',
        '상태': 'Status',
        '상태 복사': 'Copy status',
        '상태 요약 복사 완료': 'Status summary copied',
        '복사할 상태가 없습니다.': 'No status is available to copy.',
        '클립보드 복사 실패. 아래 내용을 선택해 직접 복사하세요.': 'Clipboard copy failed. Select the text below and copy it manually.',
        '아래 텍스트를 선택해 직접 복사하세요.': 'Select the text below and copy it manually.',
        '수동 복사용 텍스트': 'Manual copy text',
        '이름': 'Name',
        '종류': 'Type',
        '입력': 'Input',
        '선택': 'Sel.',
        '생성': 'Create',
        '대량 복제': 'Bulk clone',
        '대량 비활성화': 'Bulk disable',
        '승인': 'Approve',
        '거절': 'Reject',
        '증거 export': 'Evidence export',
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
        '필요': 'Required',
        '준비 필요': 'Needs setup',
        '준비 완료': 'Ready',
        '사용 안 함': 'Disabled',
        '아니요': 'No',
        '아니오': 'No',
        '예': 'Yes',
        '모든 범위': 'All scopes',
        '라이브, 대시보드, 이벤트, 메타데이터 / 미배정 채널': 'Live, Dashboard, Events, Metadata / Unassigned channel',
        '대기 중인 접근 요청이 없습니다.': 'No pending access requests.',
        '검색': 'Search',
        '작업자': 'Actor',
        '대상, 요약, 변경값 검색': 'Search target, summary, or diff',
        '작업자 계정': 'Actor account',
        '사용자 계정': 'User account',
        '채널/사용자 대상': 'Channel/user target',
        '연도. 월. 일. --:--': 'yyyy-mm-dd --:--',
        '동작': 'Action',
        '시작': 'Start',
        '재연결': 'Reconnect',
        '정지': 'Stop',
        '연결 해제': 'Disconnect',
        '보기 방식': 'View mode',
        '종료': 'End',
        '페이지 크기': 'Page size',
        '이전': 'Previous',
        '다음': 'Next',
        '아직 기록된 변경 이력이 없습니다.': 'No change history has been recorded yet.',
        '활성화': 'Enable',
        '비활성화': 'Disable',
        '복구': 'Restore',
        '계정 라이프사이클 정책': 'Account Lifecycle Policy',
        '초대 만료, 비밀번호 초기화, 비활성화/복구, 사용자 감사 export를 같은 운영 절차로 확인합니다.': 'Review invite expiry, password reset, disable/restore, and user audit export in one operator workflow.',
        'auth/session 계약 변경 없음': 'No auth/session contract changes',
        '초대': 'Invite',
        '기본 만료 24시간': 'Default expiry 24 hours',
        '초기화 후 다음 로그인 변경': 'Change required after reset',
        '비활성화 시 로그인/세션 차단': 'Disable blocks login/session',
        '로그인/세션 차단': 'Login/session blocked',
        '감사': 'Audit',
        'JSON/CSV/Diff JSON export': 'JSON/CSV/Diff JSON export',
        'export masking 적용': 'export masking applied',
        '초대 링크는 기본 24시간 동안만 유효하며, 만료 후에는 새 초대를 발급합니다. 비밀번호 초기화는 임시 비밀번호를 설정하고 기존 세션을 회수합니다. 복구 시 로그인 잠금과 실패 횟수는 초기화됩니다.': 'Invite links are valid for 24 hours by default; issue a new invite after expiry. Password reset sets a temporary password and revokes existing sessions. Restore clears login lockout and failed attempts.',
        '사용자 관리': 'User Management',
        '사용자 목록': 'Users',
        '사용자 추가': 'Add User',
        '사용자 상세': 'User Detail',
        '계정명': 'Username',
        '비밀번호': 'Password',
        '표시 이름': 'Display name',
        '연락처': 'Contact',
        '사유': 'Reason',
        '권한': 'Role',
        '권한 범위': 'Scopes',
        '마지막 로그인': 'Last login',
        '잠금 만료': 'Lock expires',
        '비밀번호 변경': 'Must change',
        '비밀번호 초기화': 'Reset password',
        '초기 비밀번호': 'Initial password',
        '비밀번호 확인': 'Confirm password',
        '새 임시 비밀번호': 'New temporary password',
        '새 임시 비밀번호 확인': 'Confirm temporary password',
        '임시 비밀번호를 설정하면 기존 세션을 회수하고 다음 로그인에서 비밀번호 변경을 요구합니다. 비밀번호 원문은 감사 로그에 남기지 않습니다.': 'Setting a temporary password revokes existing sessions and requires a change on next login. Plaintext passwords are not written to audit logs.',
        '다음 로그인 시 비밀번호 변경': 'Require password change at next login',
        '시청자': 'Viewer',
        '운영자': 'Operator',
        '연동': 'Integrator',
        '관리자': 'Admin',
        '접근 요청': 'Access Requests',
        '시청 권한 요청': 'Client Access Request',
        '승인 대기 요청': 'Pending Requests',
        '요청 페이지': 'Request Page',
        '요청이 승인 대기 상태로 저장되었습니다.': 'The request has been saved as pending.',
        '요청은 승인 대기 상태로 저장되며 관리자 승인 전에는 로그인이나 채널 접근이 허용되지 않습니다.': 'Requests are stored as pending and cannot sign in or access channels until an admin approves them.',
        '요청/결정': 'Request / decision',
        '공개 회원가입이 아니라, 별도 요청 페이지로 들어온 계정을 관리자가 검토한 뒤 초대 링크를 발급합니다.': 'This is not open self-signup; admins review requests from the request page and issue invite links.',
        '초대 발급': 'Issue Invite',
        '관리자가 직접 초대 링크를 발급하고, 사용 전/사용 완료 초대 상태를 확인합니다.': 'Admins can issue invite links directly and review pending or used invite status.',
        '유효 시간(초)': 'TTL seconds',
        'viewer/integrator 범위': 'viewer/integrator scope',
        '발급 직후에만 토큰과 설정 링크를 표시합니다. 목록에는 토큰/토큰 해시를 노출하지 않습니다.': 'Token and setup link are shown only immediately after issue. The list does not expose token material.',
        '발급된 초대가 없습니다.': 'No invites have been issued.',
        '사용 완료': 'Used',
        '만료': 'Expired',
        '대기': 'Pending',
        '발급/사용': 'Issued / used',
        '초대할 계정명을 입력하세요.': 'Enter the username to invite.',
        '이 목록에는 토큰/토큰 해시를 저장하거나 다시 표시하지 않습니다.': 'This list does not store or show token material again.',
        '초대 발급 완료': 'Invite issued',
        '초대 목록을 불러오지 못했습니다.': 'Failed to load invites.',
        '발급자': 'Issued by',
        '사용자와 권한 범위를 관리합니다.': 'Manage users and scopes.',
        '사용자 저장소가 아직 없습니다. 사용자 추가로 계정을 생성하세요.': 'No user store exists yet. Create an account with Add User.',
        '사용자 비공개': 'Users hidden',
        '사용자 수는 현재 권한으로 숨김입니다.': 'User count is hidden for the current permission.',
        '권한 없음': 'No permission',
        '서버 감사 로그에서 사용자 변경의 작업자, 전/후 값, 시각을 확인하고 사용자 감사 JSON/CSV/Diff JSON export를 내려받습니다.': 'Review actor, before/after values, and time for user changes from the server audit log, and download user audit JSON/CSV/Diff JSON exports.',
        '서버 감사 로그에서 채널 변경의 작업자, 전/후 값, 시각을 확인하고 채널 감사 JSON/CSV/Diff JSON export를 내려받습니다.': 'Review actor, before/after values, and time for channel changes from the server audit log, and download channel audit JSON/CSV/Diff JSON exports.',
        '서버 감사 로그에서 룰 변경의 작업자, 전/후 값, 시각을 확인하고 룰 감사 JSON/CSV/Diff JSON export를 내려받습니다.': 'Review actor, before/after values, and time for rule changes from the server audit log, and download rule audit JSON/CSV/Diff JSON exports.',
        '변경 이력': 'Change History',
        '채널 관리': 'Channel Management',
        '채널 목록': 'Channels',
        '채널 추가': 'Add Channel',
        '채널 상세': 'Channel Detail',
        '채널 ID': 'Channel ID',
        '채널과 PublishedView를 관리합니다.': 'Manage channels and PublishedViews.',
        '목록을 보고 상세/삭제를 진행합니다.': 'Review the list and open details or delete entries.',
        '검증': 'Validate',
        '라이브 URL': 'Live URL',
        'VA URL': 'VA URL',
        '외부 WHEP': 'External WHEP',
        '파일': 'File',
        'ONVIF 카메라': 'ONVIF camera',
        'Published WebRTC 소스': 'Published WebRTC source',
        'ONVIF 스트림 URI': 'ONVIF Stream URI',
        'ONVIF probe fixture': 'ONVIF probe fixture',
        'ONVIF profile': 'ONVIF profile',
        'profile 후보 없음': 'No profile candidates',
        'Probe draft 적용': 'Apply probe draft',
        '초기화': 'Clear',
        'test/fixtures/onvif_probe_result_stub.json 내용을 붙여넣기': 'Paste test/fixtures/onvif_probe_result_stub.json content',
        '발행 sourceId': 'Published sourceId',
        'RTSP/WHEP는 운영 확인용입니다. 브라우저 재생은': 'RTSP/WHEP is for operations checks. Browser playback is available at',
        '에서 확인합니다.': '.',
        '소스 상태 변경': 'Source status changes',
        '전체 이력': 'Full history',
        '서버 감사 로그': 'Server audit log',
        '채널 생성': 'Channel created',
        '룰 수정': 'Rule updated',
        '대상': 'Target',
        '작업자': 'Actor',
        '변경': 'Changed',
        '전/후 보기': 'Before/after',
        '외부 WHEP pull': 'External WHEP pull',
        'ONVIF 카메라는 ONVIF 프로파일에서 선택한 라이브 스트림 URI를 연결합니다. 외부 WHEP는 URL 입력, Published WebRTC 소스는 저장된 sourceId 연결입니다.': 'ONVIF camera connects the live stream URI selected from an ONVIF profile. External WHEP takes a URL. Published WebRTC source connects a saved sourceId.',
        '지원 제외: WS-Discovery 자동 검색, PTZ 제어, ONVIF Events/PullPoint, Profile G/Recording/Replay는 제공하지 않습니다. 운영자가 확인한 live URI 또는 probe fixture를 사용합니다.': 'Not included: WS-Discovery auto discovery, PTZ control, ONVIF Events/PullPoint, and Profile G/Recording/Replay are not provided. Use an operator-verified live URI or probe fixture.',
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
        '소스 수명주기, 지연, 재연결, 권한/설정 상태와 다음 조치를 함께 봅니다.': 'Review source lifecycle, stale, reconnect, auth/config status, and next actions together.',
        '런타임 상태를 불러오는 중입니다.': 'Loading runtime status.',
        '최근 인시던트 흐름': 'Recent Incident Timeline',
        '문제 원인, EventRecord, source health, 로그 단서를 시간순으로 묶어 봅니다.': 'Review root-cause, EventRecord, source health, and log clues as a timeline.',
        '인시던트 검색': 'Search incidents',
        '제목, 출처, incident/cid 검색': 'Search title, source, incident, or cid',
        '전체 출처': 'All sources',
        '최근 인시던트 단서를 불러오는 중입니다.': 'Loading recent incident clues.',
        '최근 인시던트 없음': 'No recent incidents',
        '즉시 인시던트 없음': 'No immediate incidents',
        '필터 결과': 'Filtered results',
        '필터에 맞는 인시던트 단서가 없습니다.': 'No incident clues match this filter.',
        '다른 검색어 또는 출처 필터를 선택하세요.': 'Choose another search term or source filter.',
        '최근 단서를 시간순으로 묶었습니다. 확인 항목부터 관련 화면으로 이동합니다.': 'Recent clues are grouped by time. Start with items needing attention and open the related screen.',
        '최근 EventRecord와 source health 단서를 기준으로 즉시 대응할 인시던트가 없습니다.': 'No incidents need immediate action based on recent EventRecord and source health clues.',
        '문제 원인, EventRecord, source health, 로그 tail에서 즉시 확인할 단서가 없습니다.': 'No immediate clues were found in root-cause, EventRecord, source health, or log tail data.',
        '관련 화면': 'Related screen',
        '출처': 'Source',
        'Log tail': 'Log tail',
        'log tail': 'log tail',
        'log tail 없음': 'No log tail',
        'source health 정상': 'source health normal',
        '소스 상태 변경 이력': 'Source status change history',
        '상태 변화 audit은 /ops/sources 변경 이력의 소스 상태 변경 preset에서 확인합니다.': 'Review state-change audits from the source status change preset in /ops/sources change history.',
        '상태 변경 이력과 retryable-only 재검증을 확인합니다.': 'Review status-change history and retryable-only rechecks.',
        '소스 상태 변경 이력에서 같은 source incident 흐름을 확인합니다.': 'Review the same source incident flow in source status change history.',
        'EventRecord 저장/POST 상태와 source health 단서를 함께 확인합니다.': 'Review EventRecord storage/POST status together with source health clues.',
        '관련 root-cause 또는 source health incident와 같은 cid를 비교합니다.': 'Compare the cid with related root-cause or source health incidents.',
        '스트림 대기': 'Streams waiting',
        '스트림 활성': 'Streams active',
        '분석 대기': 'Analysis waiting',
        '분석 활성': 'Analysis active',
        '송출 대기': 'Egress waiting',
        '송출 활성': 'Egress active',
        '라이브 소스 상태 확인 필요': 'Live source status needs attention',
        '라이브 소스 상태': 'Live source status',
        '소스 상태가 정상 범위입니다.': 'Source status is normal.',
        '오프라인/지연 채널을 /ops/sources에서 재확인하고 입력, PublishedView, 구독 세션을 점검합니다.': 'Recheck offline or stale channels in /ops/sources and review inputs, PublishedViews, and subscriber sessions.',
        '라이브 소스 상태가 정상 범위입니다.': 'Live source status is normal.',
        '소스 상태': 'Source status',
        '소스 수명주기 정리 확인 필요': 'Source lifecycle cleanup needs attention',
        '소스 수명주기': 'Source lifecycle',
        '모든 소스 수명주기 리소스가 대기 상태입니다.': 'All source lifecycle resources are idle.',
        '종료된 세션 뒤에 리소스 스트림/분석 탭이 남았는지 정리 로그와 채널 상태를 확인합니다.': 'Check cleanup logs and channel status for resource streams or analysis taps left after closed sessions.',
        '대기 또는 활성 수치가 일치합니다.': 'Idle and active counts are consistent.',
        '채널 상태': 'Channel status',
        '지연 분석 탭 감지': 'Stale analysis taps detected',
        '지연 감지': 'Stale detection',
        '뷰어 종료, route 이동, 탭 재사용 해제 흐름을 점검합니다.': 'Check viewer close, route navigation, and tap reuse release flows.',
        '분석 탭 age가 정상 범위입니다.': 'Analysis tap age is within range.',
        '툴 연결': 'Connect tap',
        '룰 연결': 'Rule binding',
        '재연결/정리 확인 필요': 'Reconnect/cleanup needs attention',
        '재연결/정리': 'Reconnect / cleanup',
        '정리 완료 수가 요청 수를 따라가지 못하는지 로그를 확인합니다.': 'Check logs to see whether completed cleanups are lagging behind requests.',
        '재연결/정리 지표가 정상 범위입니다.': 'Reconnect/cleanup metrics are within range.',
        '이벤트 기록': 'Event records',
        '권한/설정 확인 필요': 'Auth/config needs attention',
        '권한/설정': 'Auth / config',
        '운영 대시보드 접근 권한과 ICE 설정이 정상 범위입니다.': 'Ops dashboard access and ICE settings are within range.',
        '세션, role/scope, auth mode, TURN/ICE 설정을 확인합니다.': 'Check session, role/scope, auth mode, and TURN/ICE settings.',
        '권한 확인': 'Check permissions',
        '현장 요약': 'Site Summary',
        '현장 상태': 'Site Status',
        '영상 신호': 'Video Signal',
        '데이터 지연': 'Data Delay',
        '연결 상태': 'Connection Status',
        '영상 프레임': 'Video Frame',
        '마지막 프레임': 'Last Frame',
        '활성 이벤트': 'Active Event',
        '최근 이벤트': 'Recent Event',
        '클라이언트 범위': 'Client Scope',
        '소스 종류': 'Source Type',
        '대시보드 권한': 'Dashboard Access',
        '이벤트 권한': 'Event Access',
        '꺼짐': 'Off',
        '사용': 'Enabled',
        '채널 비교': 'Channel Compare',
        '필터': 'Filter',
        '정렬': 'Sort',
        '프리셋 설정': 'Preset Settings',
        '기본 현장 모니터링': 'Default site monitoring',
        '이벤트 요약': 'Event Summary',
        '비교할 채널이 없습니다': 'No channels to compare',
        '대시보드 권한이 있는 채널이 추가되면 한 화면에서 상태를 비교할 수 있습니다.': 'Channels with dashboard access appear together for comparison.',
        '필터에 맞는 채널이 없습니다': 'No channels match this filter',
        '다른 필터를 선택하면 접근 가능한 채널 상태를 다시 볼 수 있습니다.': 'Select another filter to review accessible channel status again.',
        '조회 실패': 'Lookup failed',
        '상태를 불러오지 못했습니다.': 'Could not load status.',
        '최근 이벤트 없음': 'No recent events',
        '현재 현장 상태에서 표시할 이벤트가 없거나 이벤트 표시 권한이 꺼져 있습니다.': 'No events are available for the current site state, or event display permission is off.',
        '이벤트 없음': 'No events',
        '라이브 소스 상태 재검증': 'Recheck live source status',
        '채널 상태 재검증': 'Recheck channel status',
        '권한/설정 상태 확인': 'Check auth/config status',
        '아래 항목을 기준으로 원인을 좁혀 확인합니다.': 'Use these items to narrow the cause.',
        '운영자가 바로 확인할 소스 수명주기, 지연, 재연결, 권한/설정 문제가 없습니다.': 'No source lifecycle, stale, reconnect, or auth/config issues need immediate operator action.',
        '로그 미제공': 'Logs unavailable',
        '최근 로그 없음': 'No recent logs',
        '최근 EventRecord 없음': 'No recent EventRecords',
        '지연 또는 오프라인 채널 없음': 'No stale or offline channels',
        '상세 상태는 /ops/dashboard의 운영 요약에서 확인합니다.': 'Review details in the /ops/dashboard operations summary.',
        'DataChannel/SSE/WS 상태입니다.': 'DataChannel/SSE/WS status.',
        '정리 상태입니다.': 'Cleanup status.',
        '정리 카운터 없음': 'No cleanup counters.',
        '이동': 'Go',
        '런타임 운영 판독': 'Runtime Operations Readout',
        '선택 tap의 scenario timeline, TrackHealth, recent EventRecord를 원인, 영향, 다음 조치 순서로 봅니다.': 'Review the selected tap scenario timeline, TrackHealth, and recent EventRecords in cause, impact, next-action order.',
        '활성 분석 탭이 있으면 운영 판독을 표시합니다.': 'When an analysis tap is active, the operations readout is shown.',
        '런타임 운영 판독 대기 중입니다.': 'Waiting for runtime operations readout.',
        '활성 분석 탭이 있으면 runtime/state/event buffer를 운영 순서로 묶어 표시합니다.': 'When an analysis tap is active, runtime/state/event buffers are grouped in operations order.',
        '운영 판독 실패': 'Operations readout failed',
        '런타임 운영 판독을 불러오지 못했습니다.': 'Could not load the runtime operations readout.',
        'state-dump 또는 metrics 조회 실패로 운영 판독을 표시하지 못했습니다.': 'The readout could not be shown because state-dump or metrics lookup failed.',
        '원인': 'Cause',
        '영향': 'Impact',
        '다음 조치': 'Next action',
        'TrackHealth 이슈 우선 확인': 'Review TrackHealth issues first',
        '즉시 원인 없음': 'No immediate cause',
        'TrackHealth 이슈가 원인 후보입니다.': 'TrackHealth issues are the candidate cause.',
        '트래킹 이슈 그룹에서 type/class/track을 확인하고 /ops/rules에서 선택 룰의 Tracker/Re-ID opt-in 조합, geometry, 입력 FPS를 함께 조정합니다. 이 warning은 default-on 근거가 아닙니다.': 'Review type/class/track in the tracking issue groups, then tune the selected rule Tracker/Re-ID opt-in combination, geometry, and input FPS in /ops/rules. This warning is not default-on evidence.',
        '시나리오 phase와 cooldown 상태를 먼저 봅니다.': 'Review scenario phase and cooldown first.',
        'runtime/state/event buffer에서 즉시 확인할 원인은 없습니다.': 'No immediate cause was found in runtime/state/event buffers.',
        '영향 범위는 선택 tap의 state-dump와 metrics 범위로 제한됩니다.': 'Impact is limited to the selected tap state-dump and metrics scope.',
        'EventRecord 실패가 downstream 영향 후보입니다.': 'EventRecord failure is a downstream impact candidate.',
        '운영자 확인 필요': 'Operator check needed',
        '관찰 유지': 'Keep observing',
        'runtime/status, state-dump, metrics, EventRecord를 새 schema 없이 운영 판독 순서로 묶었습니다.': 'runtime/status, state-dump, metrics, and EventRecords were grouped in operations readout order without a new schema.',
        'TrackHealth 정상': 'TrackHealth normal',
        'high-water 확인': 'Check high-water',
        'high-water 관찰': 'Observe high-water',
        '운영 상세': 'Ops Detail',
        '핵심 수치를 바로 봅니다.': 'Review key metrics.',
        '송출': 'Egress',
        '발행': 'Publish',
        '재사용 그룹': 'Reuse groups',
        '메타데이터 채널': 'Metadata channels',
        '라이브 VA 이벤트 품질': 'Live VA Event Quality',
        '시나리오 타임라인, 트랙 상태 이슈, 룰 런타임 상태를 읽기 전용으로 봅니다.': 'Review scenario timeline, track health issues, and rule runtime status as read-only data.',
        '시나리오, 룰, 트랙, 단계, 이슈': 'scenario, rule, track, phase, issue',
        '활성 분석 탭이 있으면 타임라인과 트래킹 이슈를 표시합니다.': 'When an analysis tap is active, timeline and tracking issues are shown.',
        '분석 탭 대기': 'Analysis tap waiting',
        '시나리오 타임라인': 'Scenario Timeline',
        '활성 시나리오 인스턴스가 없습니다.': 'No active scenario instances.',
        '트래킹 이슈': 'Tracking Issues',
        '트래킹 이슈 없음': 'No tracking issues',
        '트래킹 이슈 리포트가 없습니다.': 'No tracking issue reports.',
        '관찰 warning · default-on 근거 아님': 'Observation warning · not default-on evidence',
        '사용자 opt-in 튜닝 참고 · default-on 근거 아님': 'User opt-in tuning reference · not default-on evidence',
        '정보성 추적 상태': 'Informational tracking state',
        'Tracker/Re-ID 정책 미제공': 'Tracker/Re-ID policy unavailable',
        '다음 조치: /ops/rules에서 선택 룰의 region/line geometry와 class 범위를 좁혀 재검증합니다.': 'Next action: narrow the selected rule region/line geometry and class scope in /ops/rules, then verify again.',
        '다음 조치: source frame continuity, FPS, lost-buffer 조건을 먼저 확인한 뒤 룰 단위 Tracker/Re-ID 조합을 비교합니다.': 'Next action: check source frame continuity, FPS, and lost-buffer conditions first, then compare rule-level Tracker/Re-ID combinations.',
        '다음 조치: Tracker/Re-ID 조합은 룰 단위 opt-in으로만 비교하고 geometry/FPS 튜닝 결과와 함께 기록합니다.': 'Next action: compare Tracker/Re-ID combinations only as rule-level opt-in choices and record them with geometry/FPS tuning results.',
        '다음 조치: type/class/track을 기준으로 /ops/rules의 선택 룰 튜닝 후보를 좁힙니다.': 'Next action: use type/class/track to narrow tuning candidates for the selected rule in /ops/rules.',
        '샘플 메시지 없음': 'No sample message',
        '룰 설정': 'Rule Settings',
        '종류를 고르고 목록을 관리합니다.': 'Choose a type and manage the list.',
        '채널 분석 설정': 'Channel Analysis Rules',
        '이벤트 템플릿': 'Event Templates',
        '프로파일': 'Profiles',
        '채널 연결': 'Channel bindings',
        '저장 전 검증': 'Pre-save Validation',
        '룰 충돌과 누락을 확인합니다.': 'Check rule conflicts and missing references.',
        '저장 전 차단 항목이 없습니다.': 'No save blockers.',
        '소스 불일치, 중복 ID, 누락된 프로파일/템플릿, 비활성 채널/뷰, 뷰 권한 충돌이 없습니다.': 'No source mismatch, duplicate IDs, missing profiles/templates, inactive channels/views, or view permission conflicts.',
        '먼저 준비할 항목': 'Prerequisites',
        '채널 분석 설정은 채널, 프로파일, 이벤트 템플릿을 준비한 뒤 만듭니다.': 'Create channel analysis rules after preparing channels, profiles, and event templates.',
        '확인 중': 'Checking',
        '준비됨': 'Ready',
        '시작 가능': 'Ready to start',
        '채널, 프로파일, 템플릿이 준비되었습니다. 이제 채널 분석 설정을 만들 수 있습니다.': 'Channels, profiles, and templates are ready. You can now create channel analysis rules.',
        '채널 탭에서 입력 소스와 PublishedView를 먼저 준비합니다.': 'Prepare input sources and PublishedViews in the Channels tab first.',
        '채널 열기': 'Open Channels',
        '분석 프로파일': 'Analysis Profiles',
        '검출기, FPS, 신뢰도, 적응형 설정 같은 분석 엔진 설정을 먼저 만듭니다.': 'Create analysis engine settings such as detector, FPS, confidence, and adaptive behavior first.',
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
        '클립보드 복사 실패. 주소창의 필터 링크를 직접 복사하세요.': 'Clipboard copy failed. Copy the filter link from the address bar.',
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
        '연결 해제': 'Disconnect',
        '영역 편집 상태': 'Geometry edit status',
        '편집 모드': 'Edit mode',
        '영역': 'Zone',
        '라인': 'Line',
        '점 개수': 'Points',
        '저장 조건': 'Save condition',
        '저장 가능': 'Ready to save',
        '방향': 'Direction',
        '영역 내부': 'Inside zone',
        '영역 미리보기': 'Zone preview',
        '영상 위를 눌러 점을 추가합니다. 기존 점은 드래그해서 옮깁니다.': 'Click the video to add points. Drag existing points to move them.',
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
        '매장 통로': 'Retail aisle',
        '공원': 'Park',
        '실내': 'Indoor',
        '로비': 'Lobby',
        '승강장': 'Platform',
        '출입구': 'Entrance',
        '문 앞 정체': 'Doorway congestion',
        '주차장 가장자리': 'Parking edge',
        '승강기 홀': 'Elevator hall',
        '최소 신뢰도': 'Minimum confidence',
        '최소 지속 시간(ms)': 'Minimum duration (ms)',
        '현장 preset은 시작값입니다. 저장 전 replay/현장 영상 기준으로 geometry와 숫자 조건을 확인하세요.': 'Site presets are starting values. Before saving, verify geometry and numeric conditions against replay or field video.',
        '직접 설정은 preset 숫자를 덮어쓰지 않습니다. 저장 전 replay/현장 영상 기준으로 값만 남깁니다.': 'Custom settings do not overwrite preset numbers. Before saving, keep only values verified against replay or field video.',
        'line 2점': '2 line points',
        '방향 직접 선택': 'Choose direction manually',
        '라인 통과 preset은 최소 신뢰도 시작값만 채웁니다. 방향과 2점 line geometry를 현장 영상에서 확인하세요.': 'Line-crossing presets fill only the starting minimum confidence. Verify direction and two-point line geometry against field video.',
        '배회 preset은 field sample replay 기준 시작값입니다. TrackHealth가 불안정하면 dwell부터 늘리세요.': 'Loitering presets are starting values from field sample replay. If TrackHealth is unstable, increase dwell first.',
        '점유 preset은 polygon이 병목 구간만 포함한다는 전제입니다. 정상 피크에서 confirmed가 반복되면 threshold를 올리세요.': 'Occupancy presets assume the polygon contains only the bottleneck. If normal peaks repeatedly confirm, raise the threshold.',
        'Preset은 시작값입니다. 저장 전 현장 영상, geometry, 대상 객체를 확인하세요.': 'Presets are starting values. Before saving, verify field video, geometry, and target objects.',
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
        '검출기, FPS, 신뢰도, 입력 크기 같은 분석 엔진 설정만 정의합니다.': 'Defines only analysis engine settings such as detector, FPS, confidence, and input size.',
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
        '채널 미선택': 'No channel selected',
        '소스 없음': 'No source',
        '카메라': 'Cameras',
        '카메라 검색': 'Search cameras',
        '타일에 드롭해 바로 배치합니다.': 'Drop onto a tile to assign immediately.',
        '선택한 소스의 viewer-safe 이벤트만 표시됩니다.': 'Only viewer-safe events for the selected source are shown.',
        '선택한 소스에서 표시할 이벤트가 없습니다.': 'No events to show for the selected source.',
        '왼쪽': 'Left',
        '오른쪽': 'Right',
        '소스 dock 위치': 'Source dock position',
        '라이브 워크스페이스': 'Live Workspace',
        '표준': 'Standard',
        '고밀도': 'Compact',
        '그리드': 'Grid',
        '밀도': 'Density',
        '도크': 'Dock',
        '소스 도크 위치': 'Source dock position',
        '비트레이트': 'Bitrate',
        '드롭': 'Dropped',
        '프리즈': 'Freeze',
        'VA/이벤트': 'VA/Event',
        '정보 오버레이 숨김': 'Hide info overlay',
        '정보 오버레이 표시': 'Show info overlay',
        '워크스페이스 작업': 'Workspace actions',
        '배치 소스': 'Assigned source',
        '소스를 타일에 드롭': 'Drop a source onto a tile',
        '확인 중': 'Checking',
        '레이아웃 저장': 'Save layout',
        '저장 복원': 'Restore saved',
        '권한 기본': 'Role default',
        '전체 재연결': 'Reconnect all',
        '전체 정지': 'Stop all',
        '전체 연결 해제': 'Disconnect all',
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
        '메타데이터 오류': 'Metadata error',
        '이벤트': 'Events',
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
        '신호 없음': 'No signal',
        '신호 확인 중': 'Checking signal',
        '영상 수신 중': 'Receiving video',
        '영상 지연 확인': 'Checking video delay',
        '메타데이터 지연 확인': 'Checking metadata delay',
        '영상/메타데이터 지연 확인': 'Checking video/metadata delay',
        '상태 조회 실패': 'Status lookup failed',
        '기본 현장': 'Default site',
        '라인 통과': 'Line crossing',
        '이벤트 복사': 'Copy events',
        '이벤트 요약 복사 완료': 'Event summary copied',
        '클립보드 복사 실패': 'Clipboard copy failed',
        '침입': 'Intrusion',
        '침입 체류': 'Intrusion dwell',
        '재진입': 'Re-entry',
        '역방향 이동': 'Wrong direction',
        '라인 통과 후 침입': 'Intrusion after line crossing',
        '구역 점유': 'Zone occupancy',
        '배회': 'Loitering',
        '혼잡/점유': 'Crowding / occupancy',
        '출입': 'Entry / exit',
        '존재 감지': 'Presence detection',
        '사람': 'Person',
        '차량': 'Vehicle',
        '시나리오 빌더': 'Scenario Builder',
        '현장 preset과 대상 객체를 골라 이벤트 템플릿 초안을 만듭니다. 판단 엔진과 저장 payload 계약은 변경하지 않습니다.': 'Choose a site preset and target objects to draft an event template. The decision engine and saved payload contract are unchanged.',
        'Site preset과 대상 객체를 골라 이벤트 템플릿 초안을 만듭니다. 판단 엔진과 저장 payload 계약은 변경하지 않습니다.': 'Choose a site preset and target objects to draft an event template. The decision engine and saved payload contract are unchanged.',
        '템플릿 폼에 적용': 'Apply to template form',
        '초안 요약': 'Draft Summary',
        '초안 payload 보기': 'View draft payload',
        '저장된 채널 분석 설정이 없습니다.': 'No saved channel analysis rules.',
        '기본 preset': 'Default preset',
        '대상 사람, 차량': 'Targets person, vehicle',
        'Preset은 시작값입니다. 저장 전 현장 영상, geometry, 대상 객체를 확인하세요.': 'Presets are starting values. Before saving, verify field video, geometry, and target objects.',
        '링크 복사': 'Copy link',
        '현재': 'Current',
        '런타임 상태 정상 범위': 'Runtime status is within the normal range',
        'runtime/status에서 즉시 확인할 warning이 없습니다.': 'No warnings need immediate review in runtime/status.',
        '영향 없음': 'No impact',
        '현재 상태를 유지하며 다음 refresh에서 추세를 봅니다.': 'Keep the current state and review the trend on the next refresh.'
      }));
      const translatePattern = text => {
        const translateLabel = value => String(value || '')
          .split(' · ')
          .map(part => koToEn.get(part.trim()) || part)
          .join(' · ');
        if (text.includes(' · ') && (/^#\d+\s/u.test(text) || /^(?:프레임|Frame)\s/u.test(text))) {
          return text.split(' · ').map(part => koToEn.get(part.trim()) || translatePattern(part.trim())).join(' · ');
        }
        if (text.includes('Preset은 시작값입니다. 저장 전 현장 영상,')) {
          return text.replace(
            /Preset은 시작값입니다\.\s+저장 전 현장 영상,\s*geometry,\s*(?:대상|Target)\s+객체를 확인하세요\./u,
            'Presets are starting values. Before saving, verify field video, geometry, and target objects.'
          );
        }
        if (text.includes(', ') && /[가-힣]/u.test(text)) {
          return text.split(', ').map(part => koToEn.get(part.trim()) || translatePattern(part.trim())).join(', ');
        }
        const rules = [
          [/^권한:\s*(.+)$/u, (_match, role) => `Role: ${role}`],
          [/^(.+)\s+권한 꺼짐$/u, (_match, feature) => `${koToEn.get(String(feature).trim()) || translatePattern(String(feature).trim())} access off`],
          [/^ONVIF 스트림 URI:\s*(.+)$/u, (_match, uri) => `ONVIF Stream URI: ${uri}`],
          [/^발행 sourceId:\s*(.+)$/u, (_match, sourceId) => `Published sourceId: ${sourceId}`],
          [/^전체\s+(\d+)$/u, (_match, count) => `All ${count}`],
          [/^선택\s+(\d+)$/u, (_match, count) => `Selected ${count}`],
          [/^비활성\s+(\d+)$/u, (_match, count) => `Disabled ${count}`],
          [/^view 누락\s+(\d+)$/u, (_match, count) => `Missing views ${count}`],
          [/^입력 미완성\s+(\d+)$/u, (_match, count) => `Incomplete inputs ${count}`],
          [/^타일\s+(\d+):\s+(.+)$/u, (_match, count, detail) => `Tile ${count}: ${koToEn.get(detail.trim()) || translatePattern(detail.trim())}`],
          [/^타일\s+(\d+)\s+(시작|재생|재연결|새로고침|정지|연결 해제|채널 선택|채널|보기 방식|VA 오버레이|VA 룰)$/u, (_match, count, action) => `Tile ${count} ${koToEn.get(action) || action}`],
          [/^타일\s+(\d+)\s+·\s+(.+)$/u, (_match, count, mode) => `Tile ${count} · ${koToEn.get(mode) || mode}`],
          [/^(\d+)개 범위\s+([\s\S]+)$/u, (_match, count, detail) => `${count} scopes\n${koToEn.get(detail.trim()) || detail}`],
          [/^(\d+)개 범위$/u, (_match, count) => `${count} scopes`],
          [/^(정상|연결 중|지연|오프라인|대기|경고|오류)\s+(\d+)$/u, (_match, label, count) => `${koToEn.get(label) || label} ${count}`],
          [/^총\s+(\d+)\/(\d+)개\s+·\s+연결\s+(\d+)개$/u, (_match, shown, total, bound) => `${shown}/${total} total · ${bound} bound`],
          [/^(\d+)점$/u, (_match, count) => `${count} points`],
          [/^최대\s+(\d+)개$/u, (_match, count) => `Up to ${count}`],
          [/^최소\s+(\d+)점$/u, (_match, count) => `At least ${count} points`],
          [/^최소\s+(\d+)점 필요$/u, (_match, count) => `Needs at least ${count} points`],
          [/^(영역|라인)\s+(\d+)\/(\d+)$/u, (_match, kind, count, max) => `${koToEn.get(kind) || kind} ${count}/${max}`],
          [/^(영역|라인)\s+점\s+(\d+)\/(\d+)\s+·\s+저장 가능$/u, (_match, kind, count, max) => `${koToEn.get(kind) || kind} points ${count}/${max} · ready to save`],
          [/^(영역|라인)\s+점\s+(\d+)\/(\d+)\s+·\s+최소\s+(\d+)점 필요$/u, (_match, kind, count, max, minimum) => `${koToEn.get(kind) || kind} points ${count}/${max} · needs at least ${minimum} points`],
          [/^(라인)\s+점\s+(\d+)\/(\d+)\s+·\s+저장 가능\s+·\s+(.+)$/u, (_match, kind, count, max, direction) => `${koToEn.get(kind) || kind} points ${count}/${max} · ready to save · ${koToEn.get(direction) || direction}`],
          [/^방향\s+(.+)$/u, (_match, direction) => `Direction ${koToEn.get(direction) || direction}`],
          [/^(.+)\s+미리보기를 보고 있습니다\. 필요할 때 정지하거나 다시 연결할 수 있습니다\.$/u, (_match, name) => `${translateLabel(name)} preview is open. Stop or reconnect when needed.`],
          [/^(.+)\s+영상을 재생해 영역\/라인 기준을 확인할 수 있습니다\.$/u, (_match, name) => `Playing ${translateLabel(name)} video to check zone/line criteria.`],
          [/^(\d+)개$/u, (_match, count) => `${count}`],
          [/^(\d+)\s*채널$/u, (_match, count) => `${count} channels`],
          [/^(\d+)\s*사용자$/u, (_match, count) => `${count} users`],
          [/^(\d+)\s*VA 룰$/u, (_match, count) => `${count} VA rules`],
          [/^(\d+)\s*이벤트 룰$/u, (_match, count) => `${count} event rules`],
          [/^서버 감사 로그\s+·\s+(.+)$/u, (_match, range) => `Server audit log · ${range}`],
          [/^(?:\d{4}\.\s*\d+\.\s*\d+\.)\s+(오전|오후)\s+(.+)$/u, (match, meridiem, time) => match.replace(meridiem, meridiem === '오전' ? 'AM' : 'PM')],
          [/^총\s+(\d+)\/(\d+)개$/u, (_match, shown, total) => `${shown}/${total} total`],
          [/^대상\s+(.+)$/u, (_match, target) => `Target ${String(target).split(',').map(part => koToEn.get(part.trim()) || translatePattern(part.trim())).join(', ')}`],
          [/^작업자\s+(.+)$/u, (_match, actor) => `Actor ${actor}`],
          [/^변경\s+(.+)$/u, (_match, fields) => `Changed ${fields}`],
          [/^출처\s+(.+)$/u, (_match, value) => `Source ${koToEn.get(String(value).trim()) || translatePattern(String(value).trim())}`],
          [/^다음 조치\s+(.+)$/u, (_match, value) => `Next action ${koToEn.get(String(value).trim()) || translatePattern(String(value).trim())}`],
          [/^소스\s+#(\d+)\s+(.+)$/u, (_match, id, status) => `Source #${id} ${koToEn.get(String(status).trim()) || translatePattern(String(status).trim())}`],
          [/^(.+)\s+정상$/u, (_match, name) => `${koToEn.get(String(name).trim()) || String(name).trim()} normal`],
          [/^신뢰도\s+(.+)$/u, (_match, value) => `confidence ${value}`],
          [/^후보\s+(.+)$/u, (_match, value) => `candidate ${value}`],
          [/^확정\s+(.+)$/u, (_match, value) => `confirm ${value}`],
          [/^재알림\s+(.+)$/u, (_match, value) => `cooldown ${value}`],
          [/^라이브,\s*대시보드,\s*이벤트,\s*메타데이터\s*\/\s*채널\s+(.+)$/u, (_match, target) => `Live, Dashboard, Events, Metadata / Channel ${target}`],
          [/^라이브,\s*대시보드,\s*이벤트,\s*메타데이터\s*\/\s*전체$/u, () => 'Live, Dashboard, Events, Metadata / All channels'],
          [/^(라이브|대시보드|이벤트|메타데이터)\s*\/\s*채널\s+(.+)$/u, (_match, feature, target) => `${koToEn.get(feature) || feature} / Channel ${target}`],
          [/^(라이브|대시보드|이벤트|메타데이터)\s*\/\s*전체$/u, (_match, feature) => `${koToEn.get(feature) || feature} / All channels`],
          [/^메타데이터 채널\s+(\d+)$/u, (_match, count) => `Metadata channels ${count}`],
          [/^세션\s+(\d+)$/u, (_match, count) => `Sessions ${count}`],
          [/^스트림\s+(\d+)$/u, (_match, count) => `Streams ${count}`],
          [/^분석\s+(\d+)$/u, (_match, count) => `Analysis ${count}`],
          [/^수신\s+(\d+)\/(\d+)$/u, (_match, live, total) => `Receiving ${live}/${total}`],
          [/^송출\s+(\d+)$/u, (_match, count) => `Egress ${count}`],
          [/^발행\s+(\d+)$/u, (_match, count) => `Publish ${count}`],
          [/^재사용 그룹\s+(\d+)$/u, (_match, count) => `Reuse groups ${count}`],
          [/^진단 항목\s+(.+)$/u, (_match, count) => `Diagnostics ${koToEn.get(count) || count}`],
          [/^정리 요청\s+(.+)$/u, (_match, count) => `Cleanup requests ${koToEn.get(count) || count}`],
          [/^정리 완료\s+(.+)$/u, (_match, count) => `Cleanup completed ${koToEn.get(count) || count}`],
          [/^라이브 소스\s+(\d+)\/(\d+)$/u, (_match, live, total) => `Live sources ${live}/${total}`],
          [/^프로파일\s+(\d+)\s+·\s+룰\s+(\d+)$/u, (_match, profiles, rulesCount) => `Profiles ${profiles} · Rules ${rulesCount}`],
          [/^프로파일\s+(\d+)\s+·\s+룰\s+(\d+)\s+·\s+발행\s+(\d+)\s+·\s+송출\s+(\d+)$/u, (_match, profiles, rulesCount, publish, egress) => `Profiles ${profiles} · Rules ${rulesCount} · Publish ${publish} · Egress ${egress}`],
          [/^#(\d+)\s+(오프라인|지연|연결 중|수신|미확인):(.+)$/u, (_match, sourceId, status, reason) => `#${sourceId} ${koToEn.get(status) || status}: ${koToEn.get(String(reason).trim()) || String(reason).trim()}`],
          [/^(?:프레임|Frame)\s+(.+)\s+\/\s+(?:메타데이터|metadata)\s+(.+)$/u, (_match, frame, metadata) => `Frame ${koToEn.get(String(frame).trim()) || String(frame).trim()} / metadata ${koToEn.get(String(metadata).trim()) || String(metadata).trim()}`],
          [/^수신\s+(\d+)\/(\d+)\s+·\s+연결 중\s+(\d+)\s+·\s+지연\s+(\d+)\s+·\s+오프라인\s+(\d+)$/u, (_match, live, total, connecting, stale, offline) => `Receiving ${live}/${total} · Connecting ${connecting} · Stale ${stale} · Offline ${offline}`],
          [/^확인 필요\s+(\d+)개$/u, (_match, count) => `${count} need attention`],
          [/^(\d+)개 확인 필요$/u, (_match, count) => `${count} need attention`],
          [/^요약 전체=(\d+) 수신=(\d+) 지연=(\d+) 오프라인=(\d+)$/u, (_match, total, receiving, stale, offline) => `Summary total=${total} receiving=${receiving} stale=${stale} offline=${offline}`],
          [/^정리\s+(\d+)\/(\d+)\s+·\s+(.+)$/u, (_match, done, requested, summary) => `Cleanup ${done}/${requested} · ${koToEn.get(summary) || translatePattern(summary)}`],
          [/^발행\s+(\d+)\s+·\s+송출\s+(\d+)\s+·\s+정리\s+(\d+)\/(\d+)$/u, (_match, publish, egress, done, requested) => `Publish ${publish} · Egress ${egress} · Cleanup ${done}/${requested}`],
          [/^EventRecord 저장\s+(\d+)\s+·\s+POST 전송\s+(\d+)$/u, (_match, stored, posted) => `EventRecords stored ${stored} · POST sent ${posted}`],
          [/^역할\s+(.+)\s+·\s+인증\s+(.+)\s+·\s+ops:read\s+사용$/u, (_match, role, auth) => `Role ${role} · Auth ${auth} · ops:read enabled`],
          [/^활성 분석 탭\s+(\d+)$/u, (_match, count) => `Active analysis taps ${count}`],
          [/^(\d+)초 초과 미사용 분석 탭이 없습니다\.$/u, (_match, seconds) => `No unused analysis taps older than ${seconds}s.`],
          [/^트래킹 이슈 없음\s+·\s+유지\s+(\d+)\/(\d+)\s+·\s+제한\s+(\d+)$/u, (_match, retained, total, limited) => `No tracking issues · retained ${retained}/${total} · limited ${limited}`],
          [/^VA 룰\s+(\d+)개\s+·\s+이벤트 템플릿\s+(\d+)개\s+·\s+프로파일\s+(\d+)개$/u, (_match, vaRules, templates, profiles) => `VA rules ${vaRules} · Event templates ${templates} · Profiles ${profiles}`],
          [/^채널 분석 설정을 만들 수 없습니다\.\s+먼저\s+(.+)을\(를\)\s+준비하세요\.$/u, (_match, missing) => `Cannot create a channel analysis rule yet. Prepare ${String(missing).split(',').map(part => koToEn.get(part.trim()) || translatePattern(part.trim())).join(', ')} first.`],
          [/^우선순위\s+(.+)$/u, (_match, value) => `Priority ${koToEn.get(String(value).trim()) || String(value).trim()}`],
          [/^현장\s+(.+)$/u, (_match, value) => `Site ${koToEn.get(String(value).trim()) || translatePattern(String(value).trim())}`],
          [/^요약\s+(.+)$/u, (_match, value) => `Summary ${koToEn.get(String(value).trim()) || translatePattern(String(value).trim())}`],
          [/^연결\s+(.+)$/u, (_match, value) => `Connection ${koToEn.get(String(value).trim()) || translatePattern(String(value).trim())}`],
          [/^지연\s+(.+)$/u, (_match, value) => `Delay ${koToEn.get(String(value).trim()) || translatePattern(String(value).trim())}`],
          [/^트랙\s+(.+)$/u, (_match, value) => `Tracks ${koToEn.get(String(value).trim()) || String(value).trim()}`],
          [/^이벤트\s+(.+)$/u, (_match, value) => `Events ${koToEn.get(String(value).trim()) || String(value).trim()}`],
          [/^상태\s+(.+)$/u, (_match, value) => `Status ${koToEn.get(String(value).trim()) || translatePattern(String(value).trim())}`],
          [/^정책\s+(.+)$/u, (_match, value) => `Policy ${String(value).trim()}`],
          [/^Tracker\/Re-ID\s+(.+)\s+->\s+(.+)$/u, (_match, before, after) => `Tracker/Re-ID ${before} -> ${after}`],
          [/^model\/fallback\s+(.+)\s+->\s+(.+)$/u, (_match, before, after) => `model/fallback ${before} -> ${after}`],
          [/^메타데이터\s+(.+)$/u, (_match, value) => `Metadata ${koToEn.get(String(value).trim()) || translatePattern(String(value).trim())}`],
          [/^재시도\s+(\d+)$/u, (_match, count) => `Retry ${count}`],
          [/^(.+)\s+·\s+최대\s+(\d+)개$/u, (_match, name, count) => `${koToEn.get(String(name).trim()) || translatePattern(String(name).trim())} · up to ${count}`],
          [/^(.+)\s+모니터링$/u, (_match, name) => `${koToEn.get(String(name).trim()) || translatePattern(String(name).trim())} monitoring`],
          [/^(.+)\s+monitoring$/u, (_match, name) => `${koToEn.get(String(name).trim()) || translatePattern(String(name).trim())} monitoring`],
          [/^(.+)\s+·\s+활성 이벤트 우선 확인$/u, (_match, name) => `${koToEn.get(String(name).trim()) || translatePattern(String(name).trim())} · active events first`],
          [/^(.+)\s+·\s+시나리오 관제 중$/u, (_match, name) => `${koToEn.get(String(name).trim()) || translatePattern(String(name).trim())} · scenario monitoring`],
          [/^(.+)\s+·\s+(.+)\s+우선 확인$/u, (_match, place, event) => `${koToEn.get(String(place).trim()) || translatePattern(String(place).trim())} · ${koToEn.get(String(event).trim()) || translatePattern(String(event).trim())} priority`]
        ];
        for (const [pattern, mapper] of rules) {
          const match = text.match(pattern);
          if (match) return mapper(...match);
        }
        if (text.includes(' · ')) {
          return text.split(' · ').map(part => koToEn.get(part.trim()) || translatePattern(part.trim())).join(' · ');
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
      const uiText = value => translateText(display(value));
      const qs = (selector, root = document) => root.querySelector(selector);
      const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
      const on = (target, event, handler, options) => {
        if (target) target.addEventListener(event, handler, options);
        return target;
      };
      const setText = (id, value) => {
        const el = byId(id);
        if (el) el.textContent = uiText(value);
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
        el.textContent = uiText(message);
        el.classList.toggle('error', failed);
        if (options.collapseEmpty) el.hidden = !message;
      };
      const showToast = (message, failed = false) => {
        const text = uiText(message);
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
        td.textContent = uiText(message);
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
      const opsContextActionsHtml = (primaryHtml, contextHtml = '', className = '', summary = '더보기') => {
        const primary = String(primaryHtml || '').trim();
        const context = String(contextHtml || '').trim();
        const menu = context
          ? `<details class="ops-context-actions" data-testid="ops-context-actions" data-action-density="primary-context">
              <summary aria-label="${escapeHtml(summary)}">${escapeHtml(summary)}</summary>
              <div class="ops-context-actions-menu">${context}</div>
            </details>`
          : '';
        return opsRowActionsHtml(`${primary}${menu}`, opsClassNames('ops-context-row-actions', className));
      };
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
            behavior: options.behavior || 'auto',
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
          option.textContent = uiText(label);
          select.appendChild(option);
        }
        if (selected !== '') select.value = selected;
      };
      const chip = (text, tone = '') => `<span class="chip${tone ? ' ' + tone : ''}">${escapeHtml(uiText(text))}</span>`;
      const renderBadges = (id, items = []) => {
        const el = byId(id);
        if (!el) return;
        el.textContent = '';
        const badges = items.length > 0 ? items : [{ text: '상태 없음', tone: 'info' }];
        for (const item of badges) {
          const span = document.createElement('span');
          span.className = `chip${item.tone ? ' ' + item.tone : ''}`;
          span.textContent = uiText(item.text);
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
      const auditMaterialKeys = new Set([
        'checksum', 'crop', 'debugurl', 'developerurl', 'deviceendpoint', 'embedding', 'endpoint',
        'file', 'labels', 'labelspath', 'mediafile', 'model', 'modelchecksum', 'modellabels',
        'modelpath', 'modelprovenance', 'modelsha256', 'modeluri', 'modelurl', 'provenance',
        'rawframe', 'rawmedia', 'rtspurl', 'rtspsurl', 'samplemedia', 'sha256', 'sourcefile',
        'sourceuri', 'sourceurl', 'streamuri', 'streamurl', 'uri', 'url', 'whepurl', 'xaddr'
      ]);
      const auditMaterialKeyNeedles = [
        'appearancecrop', 'appearanceembedding', 'debugurl', 'developerurl', 'deviceendpoint',
        'labelspath', 'mediafile', 'modelchecksum', 'modelpath', 'modelprovenance',
        'modelsha256', 'modeluri', 'modelurl', 'rawframe', 'rawmedia', 'rtspurl', 'rtspsurl',
        'samplemedia', 'sourcefile', 'sourceuri', 'sourceurl', 'streamuri', 'streamurl', 'whepurl'
      ];
      const auditKeyRedacted = key => {
        const lowered = String(key || '').toLowerCase();
        return /(password|token|hash|secret|credential|capability)/i.test(lowered) ||
          auditMaterialKeys.has(lowered) ||
          auditMaterialKeyNeedles.some(needle => lowered.includes(needle));
      };
      const auditMaterialValueRedacted = value => {
        if (typeof value !== 'string') return false;
        const lowered = value.trim().toLowerCase();
        if (!lowered) return false;
        if (/^(?:file|https?|rtsps?|wheps?):\/\//i.test(lowered)) return true;
        if (/\.(onnx|engine|pt)(?:$|[?#])/i.test(lowered)) return true;
        if (/(^|[/\\])(models|media-assets|samples)[/\\]/i.test(lowered)) return true;
        return /^[a-f0-9]{64}$/i.test(lowered);
      };
      const compactAuditValue = (value, depth = 0) => {
        if (value === null || value === undefined) return value;
        if (typeof value === 'string' && (auditMaterialValueRedacted(value) || (auditKeyRedacted('' + value) && value.length > 24))) return '[redacted]';
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
      const sanitizeOpsAuditEntry = entry => {
        if (!entry || typeof entry !== 'object') return entry;
        return { ...entry, before: compactAuditValue(entry.before), after: compactAuditValue(entry.after) };
      };
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
      const auditTrackingPolicyFromValue = value => {
        const policy = value?.analysis?.trackingPolicy || value?.trackingPolicy || {};
        const hasPolicy = Object.prototype.hasOwnProperty.call(policy, 'tracker') ||
          Object.prototype.hasOwnProperty.call(policy, 'trackerPolicy') ||
          Object.prototype.hasOwnProperty.call(policy, 'reid') ||
          Object.prototype.hasOwnProperty.call(policy, 'reidPolicy') ||
          Object.prototype.hasOwnProperty.call(policy, 'reId') ||
          Object.prototype.hasOwnProperty.call(policy, 'reID');
        if (!hasPolicy) return null;
        return {
          tracker: String(policy.tracker || policy.trackerPolicy || 'lite'),
          reid: String(policy.reid || policy.reidPolicy || policy.reId || policy.reID || 'off')
        };
      };
      const auditModelFallbackStatusFromValue = value => {
        const candidates = [
          value?.analysis?.appearanceModelStatus,
          value?.analysis?.reidModelStatus,
          value?.analysis?.reidFallbackStatus,
          value?.runtime?.appearanceModelStatus,
          value?.runtime?.reidModelStatus,
          value?.runtime?.reidFallbackStatus,
          value?.appearanceModelStatus,
          value?.reidModelStatus,
          value?.reidFallbackStatus,
          value?.fallbackStatus
        ];
        const picked = candidates.find(item => item !== null && item !== undefined && item !== '');
        if (!picked) return '';
        if (typeof picked === 'string') return picked;
        if (typeof picked === 'object') {
          const status = picked.status || picked.mode || picked.reason || picked.fallback || '';
          return status ? String(status) : 'status';
        }
        return String(picked);
      };
      const auditReviewFlags = entry => {
        const flags = [];
        const beforePolicy = auditTrackingPolicyFromValue(entry?.before);
        const afterPolicy = auditTrackingPolicyFromValue(entry?.after);
        if (beforePolicy || afterPolicy) {
          const beforeText = beforePolicy ? `${beforePolicy.tracker}/${beforePolicy.reid}` : 'new';
          const afterText = afterPolicy ? `${afterPolicy.tracker}/${afterPolicy.reid}` : 'deleted';
          flags.push({ text: `Tracker/Re-ID ${beforeText} -> ${afterText}`, tone: beforeText === afterText ? 'info' : 'warn' });
        }
        const beforeFallback = auditModelFallbackStatusFromValue(entry?.before);
        const afterFallback = auditModelFallbackStatusFromValue(entry?.after);
        if (beforeFallback || afterFallback) {
          flags.push({ text: `model/fallback ${beforeFallback || 'none'} -> ${afterFallback || 'none'}`, tone: 'info' });
        }
        const serialized = JSON.stringify({ before: entry?.before ?? null, after: entry?.after ?? null });
        if (serialized.includes('[redacted]')) {
          flags.push({ text: 'export masking 적용', tone: 'info' });
        }
        return flags;
      };
      const auditReviewFlagsHtml = entry => {
        const flags = auditReviewFlags(entry);
        if (flags.length === 0) return '';
        return `<div class="audit-review-flags">${flags.map(item => chip(item.text, item.tone)).join('')}</div>`;
      };
      const loadOpsAuditTrail = () => {
        try {
          const parsed = JSON.parse(localStorage.getItem(auditStoreKey) || '[]');
          return Array.isArray(parsed) ? parsed.map(sanitizeOpsAuditEntry) : [];
        } catch {
          return [];
        }
      };
      const saveOpsAuditTrail = entries => {
        localStorage.setItem(auditStoreKey, JSON.stringify(entries.map(sanitizeOpsAuditEntry).slice(0, 80)));
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
      const auditEntryTimeMs = entry => {
        const receivedAt = Number(entry?.receivedAtMs || 0);
        if (Number.isFinite(receivedAt) && receivedAt > 0) return receivedAt;
        const numericAt = Number(entry?.at || 0);
        if (Number.isFinite(numericAt) && numericAt > 0) return numericAt;
        const parsedAt = Date.parse(entry?.at || '');
        return Number.isFinite(parsedAt) ? parsedAt : 0;
      };
      const auditEntryTimeLabel = entry => {
        const timeMs = auditEntryTimeMs(entry);
        return timeMs > 0 ? new Date(timeMs).toLocaleString() : '시각 미제공';
      };
      const auditFilterEntry = (entry, state = {}) => {
        if (state.actor && !String(entry.actor || '').includes(state.actor)) return false;
        if (state.user) {
          const userNeedle = String(state.user).toLowerCase();
          const userHaystack = `${entry.actor || ''} ${entry.target || ''}`.toLowerCase();
          if (!userHaystack.includes(userNeedle)) return false;
        }
        if (state.target && !String(entry.target || '').toLowerCase().includes(String(state.target).toLowerCase())) return false;
        if (state.action && String(entry.action || '') !== state.action) return false;
        const entryTime = auditEntryTimeMs(entry);
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
          { id: 'source-health-state-change', label: '소스 상태 변경', state: { q: '', actor: '', user: '', target: '', action: 'source-health-state-change', fromMs: '', toMs: '' } },
          { id: 'all', label: '전체 이력', state: { q: '', actor: '', user: '', target: '', action: '', fromMs: '', toMs: '' } }
        ];
      };
      const auditHashStateFor = area => {
        const rawHash = String(window.location.hash || '').replace(/^#/, '');
        if (!rawHash) return null;
        const params = new URLSearchParams(rawHash);
        const hashArea = String(params.get('auditArea') || area || '').trim();
        if (hashArea && area && hashArea !== area) return null;
        const preset = String(params.get('auditPreset') || '').trim();
        const presetState = auditFilterPresetsFor(area).find(item => item.id === preset)?.state || {};
        const state = { ...presetState };
        const action = String(params.get('auditAction') || params.get('audit') || '').trim();
        const target = String(params.get('auditTarget') || '').trim();
        const query = String(params.get('auditQ') || '').trim();
        if (action) state.action = action;
        if (target) state.target = target;
        if (query) state.q = query;
        if (params.get('auditFromMs')) state.fromMs = params.get('auditFromMs');
        if (params.get('auditToMs')) state.toMs = params.get('auditToMs');
        return Object.keys(state).length > 0 ? state : null;
      };
      const auditLocalDateTime = value => {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric) || numeric <= 0) return '';
        const date = new Date(numeric);
        const pad = number => String(number).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
      };
      const auditDateTimeMs = value => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const normalized = raw.replace('T', ' ');
        const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
        if (match) {
          const [, year, month, day, hour = '00', minute = '00'] = match;
          const local = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
          const parsedLocal = local.getTime();
          return Number.isFinite(parsedLocal) ? String(parsedLocal) : '';
        }
        const parsed = Date.parse(raw);
        return Number.isFinite(parsed) ? String(parsed) : '';
      };
      async function fetchOpsAuditTrailPage(area = '', filters = {}) {
        const params = auditQueryParams(area, filters);
        const payload = await requestJson(`/ops/api/audit?${params.toString()}`);
        return {
          ...payload,
          entries: Array.isArray(payload.entries) ? payload.entries.map(sanitizeOpsAuditEntry) : [],
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
      let opsAuditDetailRequestSequence = 0;
      function ensureOpsAuditDetailModal() {
        let dialog = byId('opsAuditDetailDialog');
        if (dialog) return dialog;
        dialog = document.createElement('dialog');
        dialog.id = 'opsAuditDetailDialog';
        dialog.className = 'audit-detail-modal';
        dialog.setAttribute('data-audit-detail-state', 'idle');
        dialog.setAttribute('data-audit-detail-owner-target', '');
        dialog.setAttribute('data-audit-detail-owner-action', '');
        dialog.setAttribute('data-audit-detail-response-path', '');
        dialog.setAttribute('data-audit-detail-request-id', '');
        dialog.setAttribute('data-audit-detail-render-cycle', '');
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
      const auditDetailValueKind = value => {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
      };
      function normalizeOpsAuditDetail(payload, owner) {
        if (!payload || !Array.isArray(payload.entries)) throw new Error('audit detail response entries missing');
        const matches = payload.entries.filter(candidate => candidate && typeof candidate === 'object' &&
          String(candidate.target || '') === owner.target &&
          String(candidate.action || '') === owner.action);
        if (matches.length !== 1) throw new Error(`audit detail owner cardinality mismatch: ${matches.length}`);
        const selected = matches[0];
        if (!Object.prototype.hasOwnProperty.call(selected, 'before') ||
            !Object.prototype.hasOwnProperty.call(selected, 'after')) {
          throw new Error('audit detail before/after missing');
        }
        const normalized = sanitizeOpsAuditEntry(selected);
        if (auditDetailValueKind(normalized.before) !== auditDetailValueKind(selected.before) ||
            auditDetailValueKind(normalized.after) !== auditDetailValueKind(selected.after)) {
          throw new Error('audit detail before/after type drift');
        }
        return normalized;
      }
      async function fetchOpsAuditDetail(entry) {
        const owner = {
          target: String(entry?.target || ''),
          action: String(entry?.action || '')
        };
        if (!owner.target || !owner.action) throw new Error('audit detail owner missing');
        const params = new URLSearchParams();
        params.set('format', 'diff-json');
        if (owner.target.startsWith('event:') && owner.target.length > 'event:'.length) {
          params.set('eventId', owner.target.slice('event:'.length));
        } else {
          params.set('target', owner.target);
        }
        const responsePath = `/ops/api/audit?${params.toString()}`;
        const payload = await requestJson(responsePath);
        return { owner, responsePath, entry: normalizeOpsAuditDetail(payload, owner) };
      }
      async function openOpsAuditDetail(entry) {
        const dialog = ensureOpsAuditDetailModal();
        const requestId = `audit-detail-${++opsAuditDetailRequestSequence}`;
        if (dialog.open && typeof dialog.close === 'function') dialog.close();
        dialog.setAttribute('data-audit-detail-state', 'loading');
        dialog.setAttribute('data-audit-detail-owner-target', '');
        dialog.setAttribute('data-audit-detail-owner-action', '');
        dialog.setAttribute('data-audit-detail-response-path', '');
        dialog.setAttribute('data-audit-detail-request-id', requestId);
        dialog.setAttribute('data-audit-detail-render-cycle', '');
        byId('opsAuditDetailBefore').textContent = '';
        byId('opsAuditDetailAfter').textContent = '';
        try {
          const detail = await fetchOpsAuditDetail(entry);
          if (dialog.getAttribute('data-audit-detail-request-id') !== requestId) return;
          const selected = detail.entry;
          byId('opsAuditDetailTitle').textContent = `${display(selected.area)} ${display(selected.action)} · ${display(selected.target)}`;
          byId('opsAuditDetailMeta').textContent = `${display(selected.actor)} · ${auditEntryTimeLabel(selected)} · ${display(selected.summary)}`;
          byId('opsAuditDetailBefore').textContent = JSON.stringify(selected.before, null, 2);
          byId('opsAuditDetailAfter').textContent = JSON.stringify(selected.after, null, 2);
          dialog.setAttribute('data-audit-detail-owner-target', detail.owner.target);
          dialog.setAttribute('data-audit-detail-owner-action', detail.owner.action);
          dialog.setAttribute('data-audit-detail-response-path', detail.responsePath);
          dialog.setAttribute('data-audit-detail-render-cycle', requestId);
          dialog.setAttribute('data-audit-detail-state', 'rendered');
          if (typeof dialog.showModal === 'function') dialog.showModal();
          else dialog.setAttribute('open', 'open');
        } catch (error) {
          if (dialog.getAttribute('data-audit-detail-request-id') !== requestId) return;
          dialog.setAttribute('data-audit-detail-state', 'error');
          dialog.setAttribute('data-audit-detail-owner-target', '');
          dialog.setAttribute('data-audit-detail-owner-action', '');
          dialog.setAttribute('data-audit-detail-response-path', '');
          dialog.setAttribute('data-audit-detail-render-cycle', '');
          if (dialog.open && typeof dialog.close === 'function') dialog.close();
          showToast(error?.message || '감사 상세를 불러오지 못했습니다.', 'error');
        }
      }
      function auditStateFor(containerId, area = '') {
        if (!opsAuditViewStates.has(containerId)) {
          const hashState = auditHashStateFor(area);
          opsAuditViewStates.set(containerId, { area, q: '', actor: '', user: '', target: '', action: '', fromMs: '', toMs: '', limit: 10, offset: 0, ...(hashState || {}) });
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
          'reset-password': '비밀번호 초기화',
          'bulk-clone': '대량 복제',
          'bulk-disable': '대량 비활성화',
          'source-health-state-change': '소스 상태 변경',
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
          <article class="audit-entry" data-event-semantic-event-id="${escapeHtml(entry.target || '')}">
            <span data-event-semantic-field="target" data-event-semantic-value="${escapeHtml(entry.target || '')}" hidden></span>
            <span data-event-semantic-field="action" data-event-semantic-value="${escapeHtml(entry.action || '')}" hidden></span>
            <div class="audit-entry-head">
              <strong>${escapeHtml(areaLabel(entry.area))} ${escapeHtml(actionLabel(entry.action))}</strong>
              <span>${escapeHtml(auditEntryTimeLabel(entry))}</span>
            </div>
            <div class="audit-entry-meta">
              <span>대상 ${escapeHtml(display(entry.target))}</span>
              <span>작업자 ${escapeHtml(display(entry.actor))}${entry.role ? ` · ${escapeHtml(entry.role)}` : ''}</span>
              <span>변경 ${escapeHtml(display(entry.summary))}</span>
            </div>
            ${auditReviewFlagsHtml(entry)}
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
            if (entry) void openOpsAuditDetail(entry);
          });
        });
        };
        const auditPresets = auditFilterPresetsFor(area);
        el.innerHTML = `
          <div class="audit-controls">
            <div class="audit-filter-grid">
              <label>검색
                <input id="${containerId}-audit-q" value="${escapeHtml(state.q)}" placeholder="대상, 요약, 변경값 검색">
              </label>
              <label>작업자
                <input id="${containerId}-audit-actor" value="${escapeHtml(state.actor)}" placeholder="작업자 계정">
              </label>
              <label>사용자
                <input id="${containerId}-audit-user" value="${escapeHtml(state.user)}" placeholder="사용자 계정">
              </label>
              <label>대상
                <input id="${containerId}-audit-target" value="${escapeHtml(state.target)}" placeholder="채널/사용자 대상">
              </label>
              <label>동작
                <select id="${containerId}-audit-action">
                  <option value="">전체</option>
                  <option value="create">생성</option>
                  <option value="update">수정</option>
                  <option value="delete">삭제</option>
                  <option value="enable">활성화</option>
                  <option value="disable">비활성화</option>
                  <option value="reset-password">비밀번호 초기화</option>
                  <option value="bulk-clone">대량 복제</option>
                  <option value="bulk-disable">대량 비활성화</option>
                  <option value="source-health-state-change">소스 상태 변경</option>
                  <option value="approve">승인</option>
                  <option value="reject">거절</option>
                  <option value="export-bundle">증거 export</option>
                </select>
              </label>
              <label>시작
                <input id="${containerId}-audit-from" class="audit-date-input" type="text" inputmode="numeric" autocomplete="off" placeholder="YYYY-MM-DD HH:mm" value="${escapeHtml(auditLocalDateTime(state.fromMs))}">
              </label>
              <label>종료
                <input id="${containerId}-audit-to" class="audit-date-input" type="text" inputmode="numeric" autocomplete="off" placeholder="YYYY-MM-DD HH:mm" value="${escapeHtml(auditLocalDateTime(state.toMs))}">
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
        opsContextActionsHtml,
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
	        const sync = () => {
	          const theme = currentTheme();
	          const label = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
	          if (button) {
	            button.setAttribute('aria-label', label);
	            button.setAttribute('title', label);
	          }
	          window.MediaServerUi?.translatePage?.();
	        };
	        sync();
	        window.MediaServerUi?.bindLanguageControls?.();
	        if (button) {
	          button.addEventListener('click', () => {
	            const next = currentTheme() === 'dark' ? 'light' : 'dark';
	            document.documentElement.dataset.theme = next;
	            localStorage.setItem('mediaServerTheme', next);
	            sync();
	          });
	        }
	      })();
	    </script>
)SCRIPT";
}

}  // namespace ingress
