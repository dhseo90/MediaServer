#!/usr/bin/env node
// 파일 용도: exact selector의 visible text snapshot만으로 UI assertion 결과를 계산한다.

export const visibleDomAssertionModel = "visible-dom-user-action-v1";

export function evaluateVisibleAssertions(expectations, snapshots) {
  const snapshotBySelector = new Map((Array.isArray(snapshots) ? snapshots : [])
    .map(snapshot => [snapshot.selector, snapshot]));
  const assertions = (Array.isArray(expectations) ? expectations : []).map(expectation => {
    const snapshot = snapshotBySelector.get(expectation.selector) || {
      selector: expectation.selector,
      exists: false,
      visible: false,
      text: "",
    };
    const text = normalizeVisibleText(snapshot.text);
    const expectedTextIncludes = (expectation.textIncludes || []).map(normalizeVisibleText);
    const missingText = expectedTextIncludes.filter(value => !text.includes(value));
    const textNotEmpty = expectation.textNotEmpty !== false;
    const pass = snapshot.exists === true
      && snapshot.visible === true
      && (!textNotEmpty || text.length > 0)
      && missingText.length === 0;
    return {
      selector: expectation.selector,
      exists: snapshot.exists === true,
      visible: snapshot.visible === true,
      text,
      textNotEmpty,
      expectedTextIncludes,
      missingText,
      pass,
      sourceBoundary: "exact-selector-visible-innerText-only",
    };
  });
  return {
    model: visibleDomAssertionModel,
    pass: assertions.length > 0 && assertions.every(assertion => assertion.pass),
    assertions,
  };
}

export function validateVisibleAssertionSchema(expectations, stateSelectors) {
  if (!Array.isArray(expectations) || expectations.length === 0) {
    throw new Error("visibleAssertions must be a non-empty array");
  }
  const expectedSelectors = expectations.map(item => item.selector);
  if (new Set(expectedSelectors).size !== expectedSelectors.length) {
    throw new Error("visibleAssertions selectors must be unique");
  }
  if (JSON.stringify(expectedSelectors) !== JSON.stringify(stateSelectors)) {
    throw new Error("visibleAssertions selectors must exactly match stateSelectors");
  }
  for (const expectation of expectations) {
    if (!expectation || typeof expectation.selector !== "string" || !expectation.selector.trim()) {
      throw new Error("visible assertion selector is required");
    }
    if (expectation.textIncludes !== undefined
      && (!Array.isArray(expectation.textIncludes)
        || expectation.textIncludes.length === 0
        || expectation.textIncludes.some(value => typeof value !== "string" || !value.trim()))) {
      throw new Error(`visible assertion textIncludes invalid: ${expectation.selector}`);
    }
  }
}

function normalizeVisibleText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
