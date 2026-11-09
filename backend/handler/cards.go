package handler

import (
	"net/http"
	"net/url"

	"card-vault/backend/store"
)

type card = store.Card

func (a *API) listCards(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	game, q := query.Get("game"), trim(query.Get("q"))
	cardType, rarity := trim(query.Get("type")), trim(query.Get("rarity"))
	if len(q) > 100 || len(cardType) > 100 || len(rarity) > 100 {
		WriteError(w, http.StatusBadRequest, "invalid_filter", "ช่องค้นหาแต่ละช่องต้องไม่เกิน 100 ตัวอักษร")
		return
	}
	if game != "" && game != "yugioh" && game != "mtg" && game != "pokemon" {
		WriteError(w, http.StatusBadRequest, "invalid_game", "เกมไม่ถูกต้อง")
		return
	}
	limit, ok := parseBound(query.Get("limit"), 40, 1, 100)
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_limit", "limit ต้องอยู่ระหว่าง 1 ถึง 100")
		return
	}
	offset, ok := parseBound(query.Get("offset"), 0, 0, 100000)
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_offset", "offset ไม่ถูกต้อง")
		return
	}
	// Handler ตรวจ input ก่อนส่งเงื่อนไขค้นไปยัง Store
	items, total, err := a.db.SearchCards(r.Context(), game, q, cardType, rarity, limit, offset)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านคลังการ์ดไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total, "limit": limit, "offset": offset})
}

func (a *API) getCard(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("cardId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสการ์ดไม่ถูกต้อง")
		return
	}
	item, err := a.db.CardByID(r.Context(), id)
	if store.IsMissing(err) {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบการ์ดนี้")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านรายละเอียดการ์ดไม่สำเร็จ")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"card": item})
}

func (a *API) createCard(w http.ResponseWriter, r *http.Request) {
	var input card
	if decodeJSON(r, &input) != nil || !validCard(input) {
		WriteError(w, http.StatusBadRequest, "invalid_input", "กรุณากรอกข้อมูลการ์ดให้ครบและถูกต้อง")
		return
	}
	input = cleanCard(input)
	item, err := a.db.CreateCard(r.Context(), input)
	if err != nil {
		if postgresCode(err) == "23505" {
			WriteError(w, http.StatusConflict, "card_conflict", "รหัสต้นทางนี้มีในคลังแล้ว")
		} else {
			WriteError(w, http.StatusInternalServerError, "server_error", "เพิ่มการ์ดไม่สำเร็จ")
		}
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]any{"card": item})
}

func (a *API) updateCard(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("cardId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสการ์ดไม่ถูกต้อง")
		return
	}
	var input card
	if decodeJSON(r, &input) != nil || !validCard(input) {
		WriteError(w, http.StatusBadRequest, "invalid_input", "กรุณากรอกข้อมูลการ์ดให้ครบและถูกต้อง")
		return
	}
	item, err := a.db.UpdateCard(r.Context(), id, cleanCard(input))
	if store.IsMissing(err) {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบการ์ดนี้")
		return
	}
	if err != nil {
		if postgresCode(err) == "23505" || postgresCode(err) == "23503" {
			WriteError(w, http.StatusConflict, "card_conflict", "แก้ไขไม่ได้ ตรวจสอบรหัสต้นทางหรือการ์ดที่ใช้อยู่ในเด็ค")
		} else {
			WriteError(w, http.StatusInternalServerError, "server_error", "แก้ไขการ์ดไม่สำเร็จ")
		}
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"card": item})
}

func (a *API) deleteCard(w http.ResponseWriter, r *http.Request) {
	id, ok := positiveID(r.PathValue("cardId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสการ์ดไม่ถูกต้อง")
		return
	}
	count, err := a.db.DeleteCard(r.Context(), id)
	if err != nil {
		if postgresCode(err) == "23503" {
			WriteError(w, http.StatusConflict, "card_in_use", "ลบไม่ได้ การ์ดนี้ถูกใช้ในเด็คหรือคอลเลกชัน")
		} else {
			WriteError(w, http.StatusInternalServerError, "server_error", "ลบการ์ดไม่สำเร็จ")
		}
		return
	}
	if count == 0 {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบการ์ดนี้")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func validCard(c card) bool {
	if c.Game != "yugioh" && c.Game != "mtg" && c.Game != "pokemon" {
		return false
	}
	setNameOK := c.SetName == nil || len(*c.SetName) <= 255
	setCodeOK := c.SetCode == nil || len(*c.SetCode) <= 50
	return len(trim(c.SourceID)) > 0 && len(trim(c.SourceID)) <= 100 && len(trim(c.Name)) > 0 && len(trim(c.Name)) <= 255 && len(trim(c.Type)) > 0 && len(trim(c.Type)) <= 255 && len(trim(c.Rarity)) > 0 && len(trim(c.Rarity)) <= 100 && len(c.RulesText) <= 20000 && setNameOK && setCodeOK && secureURL(c.ImageURL) && secureURL(c.SourceURL)
}

func secureURL(raw string) bool {
	if len(raw) > 2048 {
		return false
	}
	parsed, err := url.ParseRequestURI(raw)
	return err == nil && parsed.Scheme == "https" && parsed.Host != ""
}

func cleanCard(c card) card {
	c.Game = trim(c.Game)
	c.SourceID = trim(c.SourceID)
	c.Name = trim(c.Name)
	c.Type = trim(c.Type)
	c.Rarity = trim(c.Rarity)
	c.RulesText = trim(c.RulesText)
	c.ImageURL = trim(c.ImageURL)
	c.SourceURL = trim(c.SourceURL)
	if c.SetName != nil {
		value := trim(*c.SetName)
		c.SetName = &value
	}
	if c.SetCode != nil {
		value := trim(*c.SetCode)
		c.SetCode = &value
	}
	return c
}
