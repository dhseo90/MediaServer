// 파일 용도: /ops/users 사용자/초대/요청 JavaScript controller를 조립한다.
#include "ingress/product_ui_page_scripts.h"

#include <sstream>
#include <string>

namespace ingress {

void AppendOpsUsersPageScript(std::ostringstream& out) {
    out << R"OPSUSERS(  <script>
    const statusEl = document.querySelector('#status');
    const requestStatusEl = document.querySelector('#request-status');
    const usersBody = document.querySelector('#users-body');
    const requestsBody = document.querySelector('#access-requests-body');
    const inviteOutput = document.querySelector('#request-invite-output');
    const invitesBody = document.querySelector('#invite-list-body');
    const inviteCreateForm = document.querySelector('#invite-create-form');
    const inviteCreateOutput = document.querySelector('#invite-create-output');
    const inviteStatusEl = document.querySelector('#invite-status');
    const form = document.querySelector('#user-form');
    const userDetailPanel = document.querySelector('#user-detail-panel');
    const userEditorTitle = document.querySelector('#user-editor-title');
    const userEditorMode = document.querySelector('#user-editor-mode');
    const userEditorId = document.querySelector('#user-editor-id');
    const userEditorHelp = document.querySelector('#user-editor-help');
    const editSelectedButton = document.querySelector('#user-edit-selected');
    const saveSelectedButton = document.querySelector('#user-save-selected');
    const closeUserButton = document.querySelector('#user-close');
    const assignment = document.querySelector('#view-assignment');
    const assignmentOptions = document.querySelector('#view-assignment-options');
    const passwordFields = document.querySelector('#password-fields');
    const scopePreview = document.querySelector('#scope-template-preview');
    const lifecycleSummary = document.querySelector('#user-lifecycle-summary');
    const resetPasswordPanel = document.querySelector('#user-reset-password-panel');
    const resetPasswordInput = document.querySelector('#user-reset-password');
    const resetPasswordConfirmInput = document.querySelector('#user-reset-password-confirm');
    const resetPasswordButton = document.querySelector('#user-reset-password-button');
    const resetPasswordStatus = document.querySelector('#user-reset-password-status');
    const scopeTemplateButtons = [
      document.querySelector('#apply-view-scope-template'),
      document.querySelector('#apply-role-default-scope-template'),
      document.querySelector('#clear-custom-scopes')
    ];
    let loadedUsers = [];
    let loadedRequests = [];
    let loadedInvites = [];
    let loadedClientViews = [];
    let editorMode = 'view';
    let pendingUserDangerAction = '';
    const {
      escapeHtml,
      requestJson,
      formDataObject,
      setFeedback,
      splitList,
      setHidden,
      setRequired,
      setTableEmpty,
      opsRowActionsHtml,
      opsContextActionsHtml,
      setOpsDetailPanelOpen,
      appendTableCell,
      recordOpsAudit,
      renderOpsAuditTrail
    } = window.MediaServerUi;
    const setStatus = (message, failed = false) => setFeedback(statusEl, message, failed, { collapseEmpty: true });
    const setRequestStatus = (message, failed = false) => setFeedback(requestStatusEl, message, failed, { collapseEmpty: true });
    const setInviteStatus = (message, failed = false) => setFeedback(inviteStatusEl, message, failed, { collapseEmpty: true });
    const setResetPasswordStatus = (message, failed = false) => setFeedback(resetPasswordStatus, message, failed, { collapseEmpty: true });
    function confirmUserDangerAction(key, message, feedback = setStatus) {
      if (pendingUserDangerAction !== key) {
        pendingUserDangerAction = key;
        feedback(`${message} 다시 누르면 실행합니다.`);
        return false;
      }
      pendingUserDangerAction = '';
      return true;
    }
    function compactUserStoreError(error) {
      const message = String(error?.message || error || '').trim();
      if (message.includes('auth users file not found') || message.includes('auth users file is missing')) {
        return '사용자 저장소 없음. 사용자 추가로 초기화하세요.';
      }
      return message.replace(/\/Users\/[^\s"']+/g, '사용자 저장소 경로');
    }
    function hideUserEditor() {
      setOpsDetailPanelOpen(userDetailPanel, false);
      editorMode = 'view';
      setResetPasswordStatus('');
    }
    function setInviteOutput(text = '') {
      inviteOutput.textContent = text;
      inviteOutput.hidden = !text;
    }
    function setInviteCreateOutput(text = '') {
      if (!inviteCreateOutput) return;
      inviteCreateOutput.textContent = text;
      inviteCreateOutput.hidden = !text;
    }
    function setPasswordFieldsVisible(visible) {
      setHidden(passwordFields, !visible);
      setRequired(form.elements.password, visible);
      setRequired(form.elements.confirmPassword, visible);
    }
    function setFormDisabled(disabled) {
      for (const element of Array.from(form.elements)) {
        element.disabled = disabled;
      }
      for (const button of scopeTemplateButtons) {
        if (button) button.disabled = disabled;
      }
      saveSelectedButton.hidden = disabled;
      editSelectedButton.hidden = !disabled;
    }
    function setUsernameLocked(locked) {
      form.elements.username.readOnly = locked;
      form.elements.username.disabled = locked;
    }
    function setEditorMode(mode, title, username = '') {
      editorMode = mode;
      setOpsDetailPanelOpen(userDetailPanel, true);
      userEditorTitle.textContent = title;
      userEditorMode.textContent = mode === 'new' ? '새 사용자' : (mode === 'view' ? '상세' : '수정 중');
      userEditorId.textContent = username ? `@${username}` : '@-';
      userEditorHelp.textContent = mode === 'view' ? '저장된 내용입니다.' : '값을 바꾼 뒤 저장합니다.';
      setPasswordFieldsVisible(mode === 'new');
      editSelectedButton.textContent = '수정';
      saveSelectedButton.textContent = '저장';
      closeUserButton.textContent = '닫기';
      setFormDisabled(mode === 'view');
      setUsernameLocked(mode !== 'new');
      if (resetPasswordPanel) resetPasswordPanel.hidden = mode === 'new';
      setResetPasswordStatus('');
      if (resetPasswordInput) resetPasswordInput.value = '';
      if (resetPasswordConfirmInput) resetPasswordConfirmInput.value = '';
      updateAssignmentVisibility();
    }
    function updateAssignmentVisibility() {
      const role = form.elements.role.value;
      assignment.style.display = (role === 'viewer' || role === 'integrator') ? 'grid' : 'none';
      updateScopeTemplatePreview();
    }
    function normalizeAssignmentViewIds(value) {
      const raw = Array.isArray(value)
        ? value
        : String(value || '').split(/[\s,]+/);
      return Array.from(new Set(raw
        .map(item => String(item || '').trim())
        .filter(Boolean)));
    }
    function selectedAssignmentViewIds() {
      return Array.from(assignmentOptions?.querySelectorAll('[data-assignment-view]:checked') || [])
        .map(input => String(input.value || '').trim())
        .filter(Boolean);
    }
    function syncAssignmentHiddenField() {
      if (form.elements.viewId) {
        form.elements.viewId.value = selectedAssignmentViewIds().join(',');
      }
    }
    function setAssignmentSelection(viewIds = []) {
      const wanted = new Set(normalizeAssignmentViewIds(viewIds));
      for (const input of Array.from(assignmentOptions?.querySelectorAll('[data-assignment-view]') || [])) {
        input.checked = wanted.has(String(input.value || '').trim());
      }
      syncAssignmentHiddenField();
    }
    const scopedRoleTargets = viewIds => {
      const normalized = normalizeAssignmentViewIds(viewIds);
      return normalized.length ? normalized : ['__unassigned__'];
    };
    const clientViewLocationParts = view => [
      view?.site,
      view?.group,
      view?.floor,
      view?.zone
    ].map(item => String(item || '').trim()).filter(Boolean);
    const clientViewLocationLabel = view => clientViewLocationParts(view).join(' / ');
    function findClientView(viewId) {
      return (loadedClientViews || []).find(view => String(view.viewId || '') === String(viewId || '')) || null;
    }
    function renderAssignmentOptions() {
      if (!assignmentOptions) return;
      const selected = selectedAssignmentViewIds();
      if (!Array.isArray(loadedClientViews) || loadedClientViews.length === 0) {
        assignmentOptions.innerHTML = '<span class="channel-assignment-empty">선택 가능한 채널이 없습니다.</span>';
        syncAssignmentHiddenField();
        return;
      }
      assignmentOptions.innerHTML = loadedClientViews.map(view => {
        const location = clientViewLocationLabel(view);
        const label = [
          view.displayName || view.viewId,
          location
        ].filter(Boolean).join(' - ');
        const value = String(view.viewId || '').trim();
        return `<label class="channel-assignment-option">
          <input type="checkbox" data-assignment-view value="${escapeHtml(value)}" />
          <span title="${escapeHtml(label)}">${escapeHtml(label || value)}</span>
        </label>`;
      }).join('');
      setAssignmentSelection(selected);
    }
    function scopeTemplateForRole(role, viewIds = []) {
      const normalizedRole = String(role || '').trim().toLowerCase();
      if (normalizedRole === 'admin') return ['*'];
      if (normalizedRole === 'operator') {
        return ['ops:read', 'rule:write', 'source:write', 'dashboard:read:*', 'event:read:*'];
      }
      if (normalizedRole === 'viewer') {
        return scopedRoleTargets(viewIds).flatMap(target => [
          `view:read:${target}`,
          `dashboard:read:${target}`,
          `event:read:${target}`,
          `metadata:read:${target}`
        ]);
      }
      if (normalizedRole === 'integrator') {
        return scopedRoleTargets(viewIds).flatMap(target => [
          `metadata:read:${target}`,
          `event:read:${target}`
        ]);
      }
      return [];
    }
    function viewIdsFromScopes(scopes) {
      const targets = new Set();
      for (const scope of Array.isArray(scopes) ? scopes : []) {
        const match = String(scope || '').trim().match(/^(view|dashboard|event|metadata):read:(.+)$/);
        if (match && match[2] && match[2] !== '*' && match[2] !== '__unassigned__') {
          targets.add(match[2]);
        }
      }
      return Array.from(targets);
    }
    function updateScopeTemplatePreview() {
      if (!scopePreview) return;
      const role = form.elements.role.value;
      const viewIds = selectedAssignmentViewIds();
      syncAssignmentHiddenField();
      const scopes = scopeTemplateForRole(role, viewIds);
      const scopedRole = role === 'viewer' || role === 'integrator';
      const suffix = scopedRole && viewIds.length === 0
        ? '채널 ID가 비어 있어 미배정 범위로 계산됩니다.'
        : `적용 예정 ${scopes.length}개`;
      const selectedLabels = scopedRole
        ? viewIds.map(id => {
            const view = findClientView(id);
            const location = view ? clientViewLocationLabel(view) : '';
            return [view?.displayName || id, location].filter(Boolean).join(' / ');
          })
        : [];
      const locationText = selectedLabels.length ? ` · 채널: ${selectedLabels.join(', ')}` : '';
      scopePreview.textContent = scopes.length
        ? `${suffix}${locationText}: ${scopes.join(', ')}`
        : '이 역할에는 적용할 권한 템플릿이 없습니다.';
    }
    function applyScopeTemplate(useRoleDefault = false) {
      const role = form.elements.role.value;
      const viewIds = useRoleDefault ? [] : selectedAssignmentViewIds();
      const scopes = scopeTemplateForRole(role, viewIds);
      form.elements.scopes.value = scopes.join('\n');
      updateScopeTemplatePreview();
    }
    function formValue(data, name) {
      if (Object.prototype.hasOwnProperty.call(data, name)) {
        return data[name] || '';
      }
      return form.elements[name]?.value || '';
    }
    function formPayload() {
      const data = formDataObject(form);
      const selectedViewIds = selectedAssignmentViewIds();
      const explicitScopes = splitList(formValue(data, 'scopes'));
      const role = formValue(data, 'role');
      return {
        username: formValue(data, 'username').trim(),
        displayName: formValue(data, 'displayName').trim(),
        role,
        viewId: selectedViewIds[0] || '',
        scopes: explicitScopes.length ? explicitScopes : scopeTemplateForRole(role, selectedViewIds),
        password: data.password || '',
        confirmPassword: data.confirmPassword || '',
        enabled: form.elements.enabled.checked,
        mustChangePassword: form.elements.mustChangePassword.checked
      };
    }
    function findLoadedUser(username) {
      return loadedUsers.find(user => String(user.username || '') === String(username || '')) || null;
    }
    function roleLabel(role) {
      return ({
        admin: '관리자',
        operator: '운영자',
        integrator: '연동',
        viewer: '시청자'
      })[role] || role || '미제공';
    }
    function requestStatusLabel(status) {
      return ({
        pending: '대기',
        approved: '승인됨',
        rejected: '거절됨'
      })[status] || status || '미제공';
    }
    function requestStatusTone(status) {
      return status === 'pending' ? 'warn' : status === 'rejected' ? 'bad' : '';
    }
    function accessRequestLifecycleText(request = {}) {
      if (request.status === 'approved') return '승인됨: 초대 링크 만료 전 비밀번호 설정 후 로그인 가능';
      if (request.status === 'rejected') return '거절됨: 새 요청 또는 관리자 재초대 필요';
      return '승인 전: 로그인/세션/채널 권한 없음';
    }
    function yesNo(value) {
      return value ? '예' : '아니오';
    }
    function displayValue(value, fallback = '미제공') {
      return value === null || value === undefined || value === '' ? fallback : String(value);
    }
    function userLifecycleText(user = {}) {
      const notes = [];
      if (user.enabled === false) {
        notes.push(user.disabledAt ? `비활성 상태: ${user.disabledAt} 이후 로그인/세션 차단` : '비활성 상태: 로그인/세션 차단');
      } else {
        notes.push('활성 상태: 권한 범위 안에서 로그인 가능');
      }
      if (user.lockedUntil) notes.push(`로그인 잠금 해제 예정: ${user.lockedUntil}`);
      notes.push(user.mustChangePassword ? '다음 로그인 시 비밀번호 변경 필요' : '다음 로그인 비밀번호 변경 요구 없음');
      return notes.join(' · ');
    }
    function userLifecycleTableText(user = {}) {
      const notes = [];
      notes.push(user.enabled === false ? '로그인 차단' : '로그인 가능');
      if (user.lockedUntil) notes.push('잠금 중');
      notes.push(user.mustChangePassword ? '변경 필요' : '변경 없음');
      return notes.join(' · ');
    }
    function updateLifecycleSummary(user = null) {
      if (!lifecycleSummary) return;
      const candidate = user || {
        enabled: form.elements.enabled.checked,
        mustChangePassword: form.elements.mustChangePassword.checked,
        lockedUntil: '',
        disabledAt: ''
      };
      lifecycleSummary.textContent = userLifecycleText(candidate);
    }
    function fillForm(user) {
      form.elements.username.value = user.username;
      form.elements.displayName.value = user.displayName || '';
      form.elements.role.value = user.role || 'viewer';
      setAssignmentSelection(viewIdsFromScopes(user.scopes || []));
      form.elements.scopes.value = (user.scopes || []).join('\n');
      form.elements.password.value = '';
      form.elements.confirmPassword.value = '';
      form.elements.enabled.checked = Boolean(user.enabled);
      form.elements.mustChangePassword.checked = Boolean(user.mustChangePassword);
      setEditorMode('view', `사용자 @${user.username}`, user.username);
      updateLifecycleSummary(user);
      userDetailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function resetUserForm() {
      form.reset();
      form.elements.role.value = 'viewer';
      setAssignmentSelection([]);
      form.elements.enabled.checked = true;
      form.elements.mustChangePassword.checked = true;
      setEditorMode('new', '사용자 추가');
      updateLifecycleSummary();
      form.elements.username.focus();
    }
    function userRowCells(user) {
      return [
        user.username,
        user.displayName || '',
        roleLabel(user.role),
        user.enabled ? '활성' : '비활성',
        String(user.scopesCount ?? (user.scopes || []).length),
        user.lastLoginAt || '미제공',
        user.lockedUntil || '없음',
        yesNo(user.mustChangePassword)
      ];
    }
    function userActionButton(label, className, onClick) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.onclick = onClick;
      return button;
    }
    function chipElement(text, tone = '') {
      const span = document.createElement('span');
      span.className = `chip${tone ? ` ${tone}` : ''}`;
      span.textContent = text;
      return span;
    }
      function chip(text, tone = '') {
        return `<span class="chip${tone ? ` ${tone}` : ''}">${escapeHtml(displayValue(text, ''))}</span>`;
      }
      function appendTextCell(tr, value, className = '') {
        const td = document.createElement('td');
        td.textContent = displayValue(value);
        if (className) td.className = className;
        tr.appendChild(td);
        return td;
      }
      function appendLabeledCell(tr, label, html, className = '') {
        return appendTableCell(tr, label, html, className);
      }
      function userValueHtml(primary, note = '') {
        return `<div class="user-value-stack"><strong>${escapeHtml(displayValue(primary))}</strong>${note ? `<span class="user-note">${escapeHtml(displayValue(note, ''))}</span>` : ''}</div>`;
      }
      function parseUserScope(scope) {
        const value = displayValue(scope, '').trim();
        if (!value) return null;
        if (value === '*') return { label: '모든 범위' };
        if (value === 'ops:read') return { label: '운영 콘솔' };
        if (value === 'rule:write') return { label: '룰 관리' };
        if (value === 'source:write') return { label: '채널 관리' };
        if (value === 'lab:read') return { label: '개발/검증 API' };
        const scopedMatch = value.match(/^(view|dashboard|event|metadata):read:(.+)$/);
        if (!scopedMatch) return { label: value };
        const featureLabel = ({
          view: '라이브',
          dashboard: '대시보드',
          event: '이벤트',
          metadata: '메타데이터'
        })[scopedMatch[1]] || scopedMatch[1];
        const target = scopedMatch[2] || '';
        const targetLabel = target === '*'
          ? '전체'
          : target === '__unassigned__'
            ? '미배정 채널'
            : `채널 ${target}`;
        return { label: featureLabel, target: targetLabel };
      }
      function userScopeHtml(scopes) {
        const items = Array.isArray(scopes)
          ? scopes.map(item => displayValue(item, '')).filter(Boolean)
          : [];
        if (items.includes('*')) {
          return userValueHtml('모든 범위');
        }
        if (items.length === 0) {
          return userValueHtml('범위 없음');
        }
        const parsed = items.map(parseUserScope).filter(Boolean);
        if (parsed.length === 0) {
          return userValueHtml('범위 없음');
        }
        const targets = Array.from(new Set(parsed.map(item => item.target).filter(Boolean)));
        const labels = Array.from(new Set(parsed.map(item => item.label).filter(Boolean)));
        if (targets.length > 1) {
          const previewTargets = targets.slice(0, 4).join(', ');
          const suffix = targets.length > 4 ? ` 외 ${targets.length - 4}개` : '';
          const featureText = labels.length > 0 ? labels.join(', ') : '조회';
          return userValueHtml(`${targets.length}개 채널`, `${previewTargets}${suffix} / ${featureText}`);
        }
        if (targets.length === 1 && labels.length > 0) {
          const primary = labels.length <= 2 ? labels.join(', ') : `${labels.length}개 범위`;
          const note = labels.length <= 2
            ? targets[0]
            : `${labels.join(', ')} / ${targets[0]}`;
          return userValueHtml(primary, note);
        }
        if (labels.length <= 2) {
          return userValueHtml(labels.join(', '));
        }
        const preview = labels.slice(0, 3).join(', ');
        return userValueHtml(`${labels.length}개 범위`, labels.length > 3 ? `${preview} 외 ${labels.length - 3}개` : preview);
      }
      function appendUserRow(user) {
        const tr = document.createElement('tr');
        appendLabeledCell(tr, '계정명', `<div class="user-id-cell"><span class="table-identity-pill table-identity-user">${escapeHtml(displayValue(user.username))}</span></div>`);
        appendLabeledCell(tr, '이름', userValueHtml(user.displayName || '미제공'));
        appendLabeledCell(tr, '권한', userValueHtml(roleLabel(user.role)));
        appendLabeledCell(
          tr,
          '상태',
          opsRowActionsHtml(
            `${chip(user.enabled ? '활성' : '비활성', user.enabled ? '' : 'warn')}<span class="user-note">${escapeHtml(userLifecycleTableText(user))}</span>`,
            'ops-status-actions user-status-actions'
          ),
          'table-cell-status'
        );
        appendLabeledCell(tr, '권한 범위', userScopeHtml(user.scopes), 'user-scope-cell');
        appendLabeledCell(tr, '마지막 로그인', userValueHtml(user.lastLoginAt || '미제공'));
        appendLabeledCell(tr, '잠금 만료', userValueHtml(user.lockedUntil || '없음'));
        appendLabeledCell(tr, '비밀번호 변경', userValueHtml(yesNo(user.mustChangePassword)));
        const nextEnabled = user.enabled ? 'false' : 'true';
        const lifecycleAction = user.enabled ? '비활성화' : '복구';
        const lifecycleClass = user.enabled ? 'danger' : 'secondary';
        const actionsHtml = opsContextActionsHtml(
          `<button type="button" class="secondary" data-user-view="${escapeHtml(displayValue(user.username))}">상세</button>`,
          `<button type="button" class="secondary" data-user-reset-password="${escapeHtml(displayValue(user.username))}">초기화</button>
          <button type="button" class="${lifecycleClass}" data-user-set-enabled="${nextEnabled}" data-user-action-username="${escapeHtml(displayValue(user.username))}">${lifecycleAction}</button>`,
          'user-row-actions',
          '추가 작업'
        );
        appendLabeledCell(tr, '작업', actionsHtml, 'table-cell-actions');
        usersBody.appendChild(tr);
      }
    function renderUsers(users) {
      usersBody.textContent = '';
      if (!Array.isArray(users) || users.length === 0) {
        setTableEmpty(usersBody, 9, '등록된 사용자가 없습니다. 사용자 추가로 계정을 생성하세요.');
        return;
      }
      for (const user of users) {
        appendUserRow(user);
      }
    }
      function appendRequestRow(request) {
        const tr = document.createElement('tr');
        appendLabeledCell(tr, '계정명', `<div class="user-id-cell"><span class="table-identity-pill table-identity-user">${escapeHtml(displayValue(request.username))}</span></div>`);
        appendLabeledCell(tr, '이름', userValueHtml(request.displayName || '미제공'));
        appendLabeledCell(tr, '연락처', userValueHtml(request.contact || '미제공'));
        appendLabeledCell(tr, '채널', userValueHtml(request.viewId || '미지정'));
        appendLabeledCell(tr, '사유', userValueHtml(request.reason || '미제공'));
        appendLabeledCell(
          tr,
          '상태',
          opsRowActionsHtml(
            `${chip(requestStatusLabel(request.status), requestStatusTone(request.status))}<span class="user-note">${escapeHtml(accessRequestLifecycleText(request))}</span>`,
            'ops-status-actions user-status-actions'
          ),
          'table-cell-status'
        );
        appendLabeledCell(tr, '요청/결정', userValueHtml(request.createdAt || '미제공', request.decidedAt || accessRequestLifecycleText(request)));
        const actionsHtml = request.status === 'pending'
          ? opsRowActionsHtml(`
              <label class="request-approve-view">
                <span>승인 채널 ID</span>
                <input data-request-approve-view="${escapeHtml(displayValue(request.requestId))}" value="${escapeHtml(displayValue(request.viewId || ''))}" placeholder="채널 ID" />
              </label>
              <button type="button" class="primary" data-request-approve="${escapeHtml(displayValue(request.requestId))}">승인</button>
              <button type="button" class="danger" data-request-reject="${escapeHtml(displayValue(request.requestId))}">거절</button>
            `, 'user-row-actions')
          : chip('처리 완료');
        appendLabeledCell(tr, '작업', actionsHtml, 'table-cell-actions');
        requestsBody.appendChild(tr);
      }
    function renderAccessRequests(requests) {
      requestsBody.textContent = '';
      if (!Array.isArray(requests) || requests.length === 0) {
        setTableEmpty(requestsBody, 8, '대기 중인 접근 요청이 없습니다.');
        return;
      }
      const order = { pending: 0, approved: 1, rejected: 2 };
      const sorted = requests.slice().sort((a, b) => {
        const left = order[a.status] ?? 9;
        const right = order[b.status] ?? 9;
        if (left !== right) return left - right;
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      for (const request of sorted) {
        appendRequestRow(request);
      }
    }
      function inviteStatusText(invite = {}) {
        if (invite.used) return '사용 완료';
        if (invite.expiresAt && Date.parse(invite.expiresAt) <= Date.now()) return '만료';
        return '대기';
      }
      function inviteStatusTone(status) {
        if (status === '대기') return 'warn';
        if (status === '만료') return 'bad';
        return '';
      }
      function appendInviteRow(invite) {
        if (!invitesBody) return;
        const tr = document.createElement('tr');
        const status = inviteStatusText(invite);
        appendLabeledCell(tr, '계정명', `<div class="user-id-cell"><span class="table-identity-pill table-identity-user">${escapeHtml(displayValue(invite.username))}</span></div>`);
        appendLabeledCell(tr, '이름', userValueHtml(invite.displayName || '미제공', invite.inviteId || ''));
        appendLabeledCell(tr, '권한', userValueHtml(roleLabel(invite.role)));
        appendLabeledCell(tr, '채널', userValueHtml(invite.viewId || '미지정'));
        appendLabeledCell(tr, '상태', chip(status, inviteStatusTone(status)), 'table-cell-status');
        appendLabeledCell(tr, '만료', userValueHtml(invite.expiresAt || '미제공'));
        appendLabeledCell(tr, '발급/사용', userValueHtml(invite.createdAt || '미제공', invite.usedAt ? `사용: ${invite.usedAt}` : `발급자: ${invite.createdBy || '미제공'}`));
        invitesBody.appendChild(tr);
      }
      function renderInvites(invites) {
        if (!invitesBody) return;
        invitesBody.textContent = '';
        if (!Array.isArray(invites) || invites.length === 0) {
          setTableEmpty(invitesBody, 7, '발급된 초대가 없습니다.');
          return;
        }
        const sorted = invites.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        for (const invite of sorted) {
          appendInviteRow(invite);
        }
      }
    async function loadUsers() {
      try {
        const json = await requestJson('/ops/api/users');
        loadedUsers = Array.isArray(json.users) ? json.users : [];
        renderUsers(loadedUsers);
        renderOpsAuditTrail('user-audit-list', 'users');
      } catch (error) {
        loadedUsers = [];
        setTableEmpty(usersBody, 9, '사용자 저장소가 아직 없습니다. 사용자 추가로 계정을 생성하세요.');
        renderOpsAuditTrail('user-audit-list', 'users');
        setStatus(compactUserStoreError(error), true);
      }
    }
    async function loadAccessRequests() {
      try {
        const json = await requestJson('/ops/api/access-requests');
        loadedRequests = Array.isArray(json.accessRequests) ? json.accessRequests : [];
        renderAccessRequests(loadedRequests);
      } catch (error) {
        loadedRequests = [];
        setTableEmpty(requestsBody, 8, '승인 대기 요청이 없습니다.');
        setRequestStatus(compactUserStoreError(error), true);
      }
    }
    async function loadInvites() {
      if (!invitesBody) return;
      try {
        const json = await requestJson('/ops/api/invites');
        loadedInvites = Array.isArray(json.invites) ? json.invites : [];
        renderInvites(loadedInvites);
      } catch (error) {
        loadedInvites = [];
        setTableEmpty(invitesBody, 7, '초대 목록을 불러오지 못했습니다.');
        setInviteStatus(compactUserStoreError(error), true);
      }
    }
      async function loadAll({ clearMessages = true } = {}) {
      const [clientViewsPayload] = await Promise.all([
        requestJson('/client/api/views').catch(() => ({ views: [] })),
        loadUsers(),
        loadAccessRequests(),
        loadInvites()
      ]);
      loadedClientViews = Array.isArray(clientViewsPayload.views) ? clientViewsPayload.views : [];
      renderAssignmentOptions();
      if (clearMessages) {
        setStatus('');
        setRequestStatus('');
        setInviteStatus('');
      }
    }
    async function setEnabled(username, enabled) {
      try {
        const before = findLoadedUser(username);
        if (!enabled && username === 'admin') {
          setStatus('마지막 활성 admin이면 서버가 비활성화를 거부합니다.', true);
        }
        await requestJson(`/ops/api/users/${encodeURIComponent(username)}/${enabled ? 'enable' : 'disable'}`, { method: 'POST' });
        await loadAll();
        const afterUser = findLoadedUser(username) || { ...(before || { username }), enabled };
        await recordOpsAudit({
          area: 'users',
          action: enabled ? 'enable' : 'disable',
          target: `user:${username}`,
          before,
          after: afterUser
        });
        renderOpsAuditTrail('user-audit-list', 'users');
        setStatus(enabled
          ? `사용자 @${username} 복구 완료. 로그인 잠금과 실패 횟수가 초기화되었습니다.`
          : `사용자 @${username} 비활성화 완료. 기존 세션은 회수됩니다.`);
      } catch (error) {
        setStatus(error.message, true);
      }
    }
    async function resetUserPassword(username) {
      const password = String(resetPasswordInput?.value || '');
      const confirm = String(resetPasswordConfirmInput?.value || '');
      if (!username) return;
      if (!password) {
        setResetPasswordStatus('새 임시 비밀번호를 입력하세요.', true);
        return;
      }
      if (password !== confirm) {
        setResetPasswordStatus('새 임시 비밀번호 확인이 일치하지 않습니다.', true);
        return;
      }
      try {
        const before = findLoadedUser(username);
        await requestJson(`/ops/api/users/${encodeURIComponent(username)}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        if (resetPasswordInput) resetPasswordInput.value = '';
        if (resetPasswordConfirmInput) resetPasswordConfirmInput.value = '';
        await loadAll();
        const afterUser = findLoadedUser(username) || { ...(before || { username }), mustChangePassword: true };
        await recordOpsAudit({
          area: 'users',
          action: 'reset-password',
          target: `user:${username}`,
          before,
          after: { ...afterUser, passwordReset: true }
        });
        renderOpsAuditTrail('user-audit-list', 'users');
        setResetPasswordStatus('비밀번호 초기화 완료. 다음 로그인에서 변경이 필요합니다.');
        setStatus(`사용자 @${username} 비밀번호 초기화 완료. 기존 세션은 회수됩니다.`);
      } catch (error) {
        setResetPasswordStatus(error.message, true);
      }
    }
    function approveViewIdFor(request) {
      const requestId = String(request?.requestId || '');
      const input = [...(requestsBody?.querySelectorAll('[data-request-approve-view]') || [])]
        .find(element => String(element.dataset.requestApproveView || '') === requestId);
      return String(input?.value ?? request?.viewId ?? '').trim();
    }
    async function approveAccessRequest(request) {
      try {
        const payload = {};
        const normalizedViewId = approveViewIdFor(request);
        if (!normalizedViewId) {
          setRequestStatus('승인할 채널 ID를 입력하세요.', true);
          return;
        }
        if (normalizedViewId) payload.viewId = normalizedViewId;
        const result = await requestJson(`/ops/api/access-requests/${encodeURIComponent(request.requestId)}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const invite = result.invite || {};
        const setupUrl = invite.setupUrl || (invite.token ? `/invite/setup?token=${encodeURIComponent(invite.token)}` : '');
        setInviteOutput([
          `계정: ${request.username || ''}`,
          setupUrl ? `초대 링크: ${setupUrl}` : '',
          invite.expiresAt ? `초대 링크 만료: ${invite.expiresAt}` : '',
          invite.token ? `토큰: ${invite.token}` : '',
          '초대 설정 완료 전까지는 로그인/세션/채널 권한이 열리지 않습니다.'
        ].filter(Boolean).join('\n'));
        setRequestStatus('접근 요청 승인 완료');
        await loadAll({ clearMessages: false });
        await recordOpsAudit({
          area: 'users',
          action: 'approve',
          target: `request:${request.requestId}`,
          before: request,
          after: { ...request, status: 'approved', viewId: normalizedViewId || request.viewId || '' }
        });
        renderOpsAuditTrail('user-audit-list', 'users');
      } catch (error) {
        setRequestStatus(error.message, true);
      }
    }
    async function rejectAccessRequest(request) {
      const label = request.username || request.requestId;
      if (!confirmUserDangerAction(`reject-request:${request.requestId}`, `${label} 요청 거절 확인:`, setRequestStatus)) return;
      try {
        await requestJson(`/ops/api/access-requests/${encodeURIComponent(request.requestId)}/reject`, { method: 'POST' });
        setInviteOutput('');
        setRequestStatus('접근 요청 거절 완료');
        await loadAll({ clearMessages: false });
        await recordOpsAudit({
          area: 'users',
          action: 'reject',
          target: `request:${request.requestId}`,
          before: request,
          after: { ...request, status: 'rejected' }
        });
        renderOpsAuditTrail('user-audit-list', 'users');
      } catch (error) {
        setRequestStatus(error.message, true);
      }
    }
    async function createInviteFromForm(event) {
      event.preventDefault();
      if (!inviteCreateForm) return;
      try {
        const data = formDataObject(inviteCreateForm);
        const payload = {
          username: String(data.username || '').trim(),
          displayName: String(data.displayName || '').trim(),
          role: String(data.role || 'viewer').trim(),
          viewId: String(data.viewId || '').trim(),
          ttlSeconds: Number.parseInt(String(data.ttlSeconds || '86400'), 10)
        };
        if (!payload.username) throw new Error('초대할 계정명을 입력하세요.');
        const result = await requestJson('/ops/api/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const invite = result.invite || {};
        setInviteCreateOutput([
          `계정: ${payload.username}`,
          invite.setupUrl ? `초대 링크: ${invite.setupUrl}` : '',
          invite.expiresAt ? `초대 링크 만료: ${invite.expiresAt}` : '',
          invite.token ? `토큰: ${invite.token}` : '',
          '이 목록에는 토큰/토큰 해시를 저장하거나 다시 표시하지 않습니다.'
        ].filter(Boolean).join('\n'));
        await loadInvites();
        await recordOpsAudit({
          area: 'users',
          action: 'invite-create',
          target: `invite:${payload.username}`,
          before: null,
          after: { ...invite, token: undefined, setupUrl: invite.setupUrl ? 'issued-once' : '' }
        });
        renderOpsAuditTrail('user-audit-list', 'users');
        setInviteStatus('초대 발급 완료');
        inviteCreateForm.reset();
        inviteCreateForm.elements.role.value = 'viewer';
        inviteCreateForm.elements.ttlSeconds.value = '86400';
      } catch (error) {
        setInviteStatus(error.message, true);
      }
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        const payload = formPayload();
        if (editorMode === 'new') {
          if (!payload.password) throw new Error('초기 비밀번호를 입력하세요.');
          if (payload.password !== payload.confirmPassword) throw new Error('비밀번호 확인이 일치하지 않습니다.');
          delete payload.confirmPassword;
          await requestJson('/ops/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          form.reset();
          form.elements.enabled.checked = true;
          form.elements.mustChangePassword.checked = true;
          hideUserEditor();
          updateAssignmentVisibility();
          await loadAll();
          await recordOpsAudit({
            area: 'users',
            action: 'create',
            target: `user:${payload.username}`,
            before: null,
            after: payload
          });
          renderOpsAuditTrail('user-audit-list', 'users');
          setStatus('사용자 추가 완료');
          return;
        }
        if (!payload.username) return;
        const before = findLoadedUser(payload.username);
        delete payload.password;
        delete payload.confirmPassword;
        await requestJson(`/ops/api/users/${encodeURIComponent(payload.username)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        await loadAll();
        await recordOpsAudit({
          area: 'users',
          action: 'update',
          target: `user:${payload.username}`,
          before,
          after: payload
        });
        renderOpsAuditTrail('user-audit-list', 'users');
        hideUserEditor();
        setStatus('사용자 저장 완료');
      } catch (error) {
        setStatus(error.message, true);
      }
    });
    inviteCreateForm?.addEventListener('submit', createInviteFromForm);
    editSelectedButton.onclick = () => {
      const username = String(form.elements.username.value || '').trim();
      if (!username) return;
      setEditorMode('edit', `사용자 @${username}`, username);
      updateLifecycleSummary();
    };
    closeUserButton.onclick = () => {
      hideUserEditor();
    };
    resetPasswordButton?.addEventListener('click', () => {
      const username = String(form.elements.username.value || '').trim();
      resetUserPassword(username);
    });
    document.querySelector('#user-audit-refresh')?.addEventListener('click', () => renderOpsAuditTrail('user-audit-list', 'users'));
    renderOpsAuditTrail('user-audit-list', 'users');
    document.addEventListener('click', event => {
      const viewButton = event.target.closest('[data-user-view]');
      if (viewButton) {
        const user = (loadedUsers || []).find(item => String(item.username || '') === String(viewButton.dataset.userView || ''));
        if (user) fillForm(user);
        return;
      }
      const resetButton = event.target.closest('[data-user-reset-password]');
      if (resetButton) {
        const user = (loadedUsers || []).find(item => String(item.username || '') === String(resetButton.dataset.userResetPassword || ''));
        if (user) {
          fillForm(user);
          resetPasswordInput?.focus();
          setResetPasswordStatus('임시 비밀번호를 입력해 초기화합니다.');
        }
        return;
      }
      const approveButton = event.target.closest('[data-request-approve]');
      if (approveButton) {
        const request = (loadedRequests || []).find(item => String(item.requestId || '') === String(approveButton.dataset.requestApprove || ''));
        if (request) approveAccessRequest(request);
        return;
      }
      const lifecycleButton = event.target.closest('[data-user-set-enabled]');
      if (lifecycleButton) {
        const username = String(lifecycleButton.dataset.userActionUsername || '').trim();
        const enabled = lifecycleButton.dataset.userSetEnabled === 'true';
        if (!username) return;
        if (!enabled && !confirmUserDangerAction(`disable-user:${username}`, `사용자 @${username} 로그인 비활성화와 기존 세션 회수 확인:`)) return;
        setEnabled(username, enabled);
        return;
      }
      const rejectButton = event.target.closest('[data-request-reject]');
      if (rejectButton) {
        const request = (loadedRequests || []).find(item => String(item.requestId || '') === String(rejectButton.dataset.requestReject || ''));
        if (request) rejectAccessRequest(request);
      }
    });
    document.querySelector('#add-user-btn').onclick = resetUserForm;
    form.elements.role.addEventListener('change', updateAssignmentVisibility);
    assignmentOptions?.addEventListener('change', () => {
      syncAssignmentHiddenField();
      updateScopeTemplatePreview();
    });
    form.elements.viewId.addEventListener('input', updateScopeTemplatePreview);
    form.elements.scopes.addEventListener('input', updateScopeTemplatePreview);
    form.elements.enabled.addEventListener('change', () => updateLifecycleSummary());
    form.elements.mustChangePassword.addEventListener('change', () => updateLifecycleSummary());
    document.querySelector('#apply-view-scope-template').onclick = () => applyScopeTemplate(false);
    document.querySelector('#apply-role-default-scope-template').onclick = () => applyScopeTemplate(true);
    document.querySelector('#clear-custom-scopes').onclick = () => {
      form.elements.scopes.value = '';
      updateScopeTemplatePreview();
    };
    document.querySelector('#refresh-btn').onclick = () => {
      setInviteOutput('');
      setInviteCreateOutput('');
      loadAll().catch(error => setStatus(error.message, true));
    };
    updateAssignmentVisibility();
    loadAll().catch(error => setStatus(error.message, true));
  </script>
)OPSUSERS";
}

}  // namespace ingress
