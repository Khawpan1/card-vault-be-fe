const draftKey = (memberId) => `vanguard-deck-draft:${memberId}`;

export function readDeckDraft(memberId) {
  if (!memberId) return null;
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey(memberId)));
    return draft?.deck && draft.form && Array.isArray(draft.cards) ? draft : null;
  } catch {
    return null;
  }
}

export function saveDeckDraft(memberId, draft) {
  if (!memberId) return false;
  try {
    localStorage.setItem(draftKey(memberId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDeckDraft(memberId) {
  if (!memberId) return;
  try {
    localStorage.removeItem(draftKey(memberId));
  } catch {
    // เบราว์เซอร์อาจปิดการใช้พื้นที่เก็บข้อมูล
  }
}
