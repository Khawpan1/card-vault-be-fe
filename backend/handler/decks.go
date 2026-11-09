package handler

import (
	"errors"
	"net/http"
	"strings"

	"card-vault/backend/auth"
	"card-vault/backend/mw"
	"card-vault/backend/store"
)

type deck = store.Deck

func (a *API) listPublicDecks(w http.ResponseWriter, r *http.Request) {
	game, q := r.URL.Query().Get("game"), trim(r.URL.Query().Get("q"))
	if game != "" && game != "yugioh" && game != "mtg" && game != "pokemon" {
		WriteError(w, http.StatusBadRequest, "invalid_game", "เกมไม่ถูกต้อง")
		return
	}
	if len(q) > 100 {
		WriteError(w, http.StatusBadRequest, "invalid_filter", "คำค้นต้องไม่เกิน 100 ตัวอักษร")
		return
	}
	items, err := a.db.ListPublicDecks(r.Context(), game, q)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านเด็คสาธารณะไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items), "limit": 100, "offset": 0})
}

func (a *API) listMyDecks(w http.ResponseWriter, r *http.Request) {
	items, err := a.db.ListMemberDecks(r.Context(), mw.Current(r).MemberID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านเด็คไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items), "limit": len(items), "offset": 0})
}

func (a *API) getDeck(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("deckId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสเด็คไม่ถูกต้อง")
		return
	}
	item, err := a.db.DeckByID(r.Context(), id)
	if store.IsMissing(err) {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบเด็คนี้")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านเด็คไม่สำเร็จ")
		return
	}
	if !item.IsPublic {
		parts := strings.Fields(r.Header.Get("Authorization"))
		var claims *auth.Claims
		var tokenErr error
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			claims, tokenErr = auth.Parse(a.secret, parts[1])
		}
		if tokenErr != nil || claims == nil || claims.MemberID != item.OwnerID {
			WriteError(w, http.StatusNotFound, "not_found", "ไม่พบเด็คนี้")
			return
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{"deck": item})
}

func (a *API) createDeck(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Game        string `json:"game"`
		Name        string `json:"name"`
		Description string `json:"description"`
		IsPublic    bool   `json:"isPublic"`
	}
	if decodeJSON(r, &input) != nil || !validDeck(input.Game, input.Name, input.Description) {
		WriteError(w, http.StatusBadRequest, "invalid_input", "กรุณากรอกชื่อเด็คและเกมให้ถูกต้อง")
		return
	}
	item, err := a.db.CreateDeck(r.Context(), mw.Current(r).MemberID, trim(input.Game), trim(input.Name), trim(input.Description), input.IsPublic)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "สร้างเด็คไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]any{"deck": item})
}

func (a *API) updateDeck(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("deckId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสเด็คไม่ถูกต้อง")
		return
	}
	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		IsPublic    bool   `json:"isPublic"`
	}
	if decodeJSON(r, &input) != nil || len(trim(input.Name)) < 1 || len(trim(input.Name)) > 100 || len(input.Description) > 1000 {
		WriteError(w, http.StatusBadRequest, "invalid_input", "กรุณาตรวจชื่อและคำอธิบายเด็ค")
		return
	}
	count, err := a.db.UpdateMemberDeck(r.Context(), id, mw.Current(r).MemberID, trim(input.Name), trim(input.Description), input.IsPublic)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "แก้ไขเด็คไม่สำเร็จ")
		return
	}
	if count == 0 {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบเด็คที่เป็นของคุณ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"deck": map[string]any{"id": id, "name": trim(input.Name), "description": trim(input.Description), "isPublic": input.IsPublic}})
}

func (a *API) deleteDeck(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("deckId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสเด็คไม่ถูกต้อง")
		return
	}
	count, err := a.db.DeleteMemberDeck(r.Context(), id, mw.Current(r).MemberID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "ลบเด็คไม่สำเร็จ")
		return
	}
	if count == 0 {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบเด็คที่เป็นของคุณ")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) replaceDeckCards(w http.ResponseWriter, r *http.Request) {
	deckID, ok := positiveID(r.PathValue("deckId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสเด็คไม่ถูกต้อง")
		return
	}
	var input struct {
		Cards []struct {
			CardID   int64 `json:"cardId"`
			Quantity int   `json:"quantity"`
		} `json:"cards"`
	}
	if decodeJSON(r, &input) != nil || len(input.Cards) > 500 {
		WriteError(w, http.StatusBadRequest, "invalid_input", "รายการการ์ดในเด็คไม่ถูกต้อง")
		return
	}
	seen := map[int64]bool{}
	cards := make([]store.DeckCard, 0, len(input.Cards))
	for _, item := range input.Cards {
		if item.CardID <= 0 || item.Quantity < 1 || item.Quantity > 999 || seen[item.CardID] {
			WriteError(w, http.StatusBadRequest, "invalid_input", "รหัสการ์ดต้องไม่ซ้ำและจำนวนต้องอยู่ระหว่าง 1 ถึง 999")
			return
		}
		seen[item.CardID] = true
		cards = append(cards, store.DeckCard{Card: store.Card{ID: item.CardID}, Quantity: item.Quantity})
	}
	err := a.db.ReplaceDeckCards(r.Context(), deckID, mw.Current(r).MemberID, cards)
	switch {
	case errors.Is(err, store.ErrDeckNotOwned):
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบเด็คที่เป็นของคุณ")
		return
	case errors.Is(err, store.ErrCardNotFound):
		WriteError(w, http.StatusBadRequest, "invalid_card", "ไม่พบการ์ดบางใบในรายการ")
		return
	case errors.Is(err, store.ErrCardGameMismatch):
		WriteError(w, http.StatusBadRequest, "game_mismatch", "ทุกการ์ดในเด็คต้องเป็นเกมเดียวกัน")
		return
	case err != nil:
		WriteError(w, http.StatusInternalServerError, "server_error", "บันทึกรายการการ์ดไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

func validDeck(game, name, description string) bool {
	return (game == "yugioh" || game == "mtg" || game == "pokemon") && len(trim(name)) > 0 && len(trim(name)) <= 100 && len(description) <= 1000
}

func (a *API) adminDeleteDeck(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("deckId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสเด็คไม่ถูกต้อง")
		return
	}
	count, err := a.db.DeleteDeck(r.Context(), id)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "ลบเด็คไม่สำเร็จ")
		return
	}
	if count == 0 {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบเด็คนี้")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) adminListDecks(w http.ResponseWriter, r *http.Request) {
	items, err := a.db.ListAdminDecks(r.Context())
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านเด็คไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items), "limit": 500, "offset": 0})
}
