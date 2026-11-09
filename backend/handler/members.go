package handler

import (
	"net/http"

	"card-vault/backend/mw"
	"card-vault/backend/store"
)

func (a *API) listCollection(w http.ResponseWriter, r *http.Request) {
	game := r.URL.Query().Get("game")
	if game != "" && game != "yugioh" && game != "mtg" && game != "pokemon" {
		WriteError(w, http.StatusBadRequest, "invalid_game", "เกมไม่ถูกต้อง")
		return
	}
	items, err := a.db.ListCollection(r.Context(), mw.Current(r).MemberID, game)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านคอลเลกชันไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items), "limit": len(items), "offset": 0})
}

func (a *API) setCollectionQuantity(w http.ResponseWriter, r *http.Request) {
	cardID, ok := positiveID(r.PathValue("cardId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสการ์ดไม่ถูกต้อง")
		return
	}
	var input struct {
		Quantity int `json:"quantity"`
	}
	if decodeJSON(r, &input) != nil || input.Quantity < 1 || input.Quantity > 999 {
		WriteError(w, http.StatusBadRequest, "invalid_input", "จำนวนต้องอยู่ระหว่าง 1 ถึง 999")
		return
	}
	err := a.db.SetCollectionQuantity(r.Context(), mw.Current(r).MemberID, cardID, input.Quantity)
	if store.IsCardMissing(err) {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบการ์ดนี้")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "บันทึกคอลเลกชันไม่สำเร็จ")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) deleteCollectionCard(w http.ResponseWriter, r *http.Request) {
	cardID, ok := positiveID(r.PathValue("cardId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสการ์ดไม่ถูกต้อง")
		return
	}
	count, err := a.db.DeleteCollectionCard(r.Context(), mw.Current(r).MemberID, cardID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "ลบการ์ดจากคอลเลกชันไม่สำเร็จ")
		return
	}
	if count == 0 {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบการ์ดนี้ในคอลเลกชัน")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) listReviews(w http.ResponseWriter, r *http.Request) {
	deckID, ok := positiveID(r.PathValue("deckId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสเด็คไม่ถูกต้อง")
		return
	}
	info, err := a.db.ReviewInfo(r.Context(), deckID)
	if store.IsMissing(err) || (err == nil && !info.IsPublic) {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบเด็คสาธารณะนี้")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านรีวิวไม่สำเร็จ")
		return
	}
	items, err := a.db.ListReviews(r.Context(), deckID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านรีวิวไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items), "limit": len(items), "offset": 0})
}

func (a *API) saveReview(w http.ResponseWriter, r *http.Request) {
	deckID, ok := positiveID(r.PathValue("deckId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสเด็คไม่ถูกต้อง")
		return
	}
	var input struct {
		Content string `json:"content"`
	}
	if decodeJSON(r, &input) != nil {
		WriteError(w, http.StatusBadRequest, "invalid_json", "รูปแบบข้อมูลไม่ถูกต้อง")
		return
	}
	input.Content = trim(input.Content)
	if len(input.Content) < 1 || len(input.Content) > 1000 {
		WriteError(w, http.StatusBadRequest, "invalid_input", "รีวิวต้องมี 1 ถึง 1000 ตัวอักษร")
		return
	}
	identity := mw.Current(r)
	info, err := a.db.ReviewInfo(r.Context(), deckID)
	if store.IsMissing(err) || (err == nil && (!info.IsPublic || info.OwnerID == identity.MemberID)) {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่สามารถรีวิวเด็คนี้ได้")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "บันทึกรีวิวไม่สำเร็จ")
		return
	}
	if err = a.db.SaveReview(r.Context(), deckID, identity.MemberID, input.Content); err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "บันทึกรีวิวไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

func (a *API) adminDeleteReview(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("reviewId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสรีวิวไม่ถูกต้อง")
		return
	}
	count, err := a.db.DeleteReview(r.Context(), id)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "ลบรีวิวไม่สำเร็จ")
		return
	}
	if count == 0 {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบรีวิวนี้")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) adminListReviews(w http.ResponseWriter, r *http.Request) {
	items, err := a.db.ListAdminReviews(r.Context())
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านรีวิวไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items), "limit": 500, "offset": 0})
}

func (a *API) listMembers(w http.ResponseWriter, r *http.Request) {
	items, err := a.db.ListMembers(r.Context())
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านรายชื่อสมาชิกไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items), "limit": 500, "offset": 0})
}

func (a *API) updateMemberRole(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("memberId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสสมาชิกไม่ถูกต้อง")
		return
	}
	var input struct {
		Role string `json:"role"`
	}
	if decodeJSON(r, &input) != nil || (input.Role != "member" && input.Role != "admin") {
		WriteError(w, http.StatusBadRequest, "invalid_input", "สิทธิ์ต้องเป็น member หรือ admin")
		return
	}
	member, err := a.db.UpdateMemberRole(r.Context(), id, input.Role)
	if store.IsMissing(err) {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบสมาชิกนี้")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "เปลี่ยนสิทธิ์ไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"member": member})
}

func (a *API) deleteMember(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("memberId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสสมาชิกไม่ถูกต้อง")
		return
	}
	if id == mw.Current(r).MemberID {
		WriteError(w, http.StatusBadRequest, "invalid_input", "ไม่สามารถลบบัญชีที่กำลังใช้งานได้")
		return
	}
	count, err := a.db.DeleteMember(r.Context(), id)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "ลบสมาชิกไม่สำเร็จ")
		return
	}
	if count == 0 {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบสมาชิกนี้")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
