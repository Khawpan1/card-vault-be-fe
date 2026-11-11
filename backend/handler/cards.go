package handler

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"card-vault/backend/store"
)

type card = store.Card

var vanguardSourceID = regexp.MustCompile(`^(cfv_[a-f0-9]+|[a-f0-9]{64})$`)

func (a *API) listCards(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	game, q := query.Get("game"), trim(query.Get("q"))
	cardType, rarity := trim(query.Get("type")), trim(query.Get("rarity"))
	if len(q) > 100 || len(cardType) > 100 || len(rarity) > 100 {
		WriteError(w, http.StatusBadRequest, "invalid_filter", "ช่องค้นหาแต่ละช่องต้องไม่เกิน 100 ตัวอักษร")
		return
	}
	if game != "" && game != "vanguard" {
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
	items, total, err := a.db.SearchCards(r.Context(), "vanguard", q, cardType, rarity, limit, offset)
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
	if item.Game != "vanguard" {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบการ์ดนี้")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"card": item})
}

// cardImage ซ่อน API key ไว้ใน Go และเก็บภาพไว้ในหน่วยความจำ 24 ชั่วโมง
func (a *API) cardImage(w http.ResponseWriter, r *http.Request) {
	if a.pokewalletKey == "" {
		WriteError(w, http.StatusServiceUnavailable, "image_unavailable", "ยังไม่ได้ตั้งค่า POKEWALLET_API_KEY")
		return
	}
	id, ok := positiveID(r.PathValue("cardId"))
	if !ok {
		WriteError(w, http.StatusBadRequest, "invalid_id", "รหัสการ์ดไม่ถูกต้อง")
		return
	}
	item, err := a.db.CardByID(r.Context(), id)
	if store.IsMissing(err) || (err == nil && item.Game != "vanguard") {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบการ์ดนี้")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านรูปการ์ดไม่สำเร็จ")
		return
	}
	key := item.SourceID
	now := time.Now()
	a.imageCacheMu.Lock()
	cached, found := a.imageCache[key]
	if found && now.Before(cached.expiresAt) {
		a.imageCacheMu.Unlock()
		serveCardImage(w, cached)
		return
	}
	a.imageCacheMu.Unlock()

	request, err := http.NewRequestWithContext(r.Context(), http.MethodGet, "https://api.pokewallet.io/cfv/images/"+url.PathEscape(key), nil)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "image_error", "เตรียมโหลดรูปไม่สำเร็จ")
		return
	}
	request.Header.Set("X-API-Key", a.pokewalletKey)
	client := http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(request *http.Request, via []*http.Request) error {
			if !strings.EqualFold(request.URL.Hostname(), "api.pokewallet.io") {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}
	response, err := client.Do(request)
	if err != nil {
		WriteError(w, http.StatusBadGateway, "image_source_error", "โหลดรูปจาก PokéWallet ไม่สำเร็จ")
		return
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		WriteError(w, http.StatusBadGateway, "image_source_error", fmt.Sprintf("PokéWallet ตอบกลับ HTTP %d", response.StatusCode))
		return
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, 10<<20))
	contentType := response.Header.Get("Content-Type")
	if err != nil || len(body) == 0 || len(body) >= 10<<20 || !strings.HasPrefix(contentType, "image/") {
		WriteError(w, http.StatusBadGateway, "image_source_error", "รูปจาก PokéWallet มีรูปแบบไม่ถูกต้อง")
		return
	}
	cached = cachedImage{body: body, contentType: contentType, expiresAt: now.Add(24 * time.Hour)}
	a.imageCacheMu.Lock()
	a.imageCache[key] = cached
	a.imageCacheMu.Unlock()
	serveCardImage(w, cached)
}

func serveCardImage(w http.ResponseWriter, item cachedImage) {
	w.Header().Set("Content-Type", item.contentType)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(item.body)
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
	if c.Game != "vanguard" || !vanguardSourceID.MatchString(trim(c.SourceID)) {
		return false
	}
	setNameOK := c.SetName == nil || len(*c.SetName) <= 255
	setCodeOK := c.SetCode == nil || len(*c.SetCode) <= 50
	return len(trim(c.SourceID)) > 0 && len(trim(c.SourceID)) <= 150 && len(trim(c.Name)) > 0 && len(trim(c.Name)) <= 255 && len(trim(c.Type)) > 0 && len(trim(c.Type)) <= 255 && len(trim(c.Rarity)) > 0 && len(trim(c.Rarity)) <= 100 && len(c.RulesText) <= 20000 && setNameOK && setCodeOK && secureURL(c.ImageURL) && secureURL(c.SourceURL)
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
