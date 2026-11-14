package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"card-vault/backend/mw"
	"card-vault/backend/store"
	"github.com/jackc/pgx/v5/pgconn"
)

type API struct {
	db             *store.Store
	secret         []byte
	frontendOrigin string
	pokewalletKey  string
	imageCacheMu   sync.Mutex
	imageCache     map[string]cachedImage
}

type cachedImage struct {
	body        []byte
	contentType string
	expiresAt   time.Time
}

func New(db *store.Store, secret []byte, frontendOrigin, pokewalletKey string) *API {
	if frontendOrigin == "" {
		frontendOrigin = "http://localhost:3000"
	}
	return &API{db: db, secret: secret, frontendOrigin: frontendOrigin, pokewalletKey: pokewalletKey, imageCache: make(map[string]cachedImage)}
}

func (a *API) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		WriteError(w, http.StatusNotFound, "not_found", "ไม่พบ API นี้")
	})
	mux.HandleFunc("GET /api/cards", a.listCards)
	mux.HandleFunc("GET /api/cards/filters", a.cardFilters)
	mux.HandleFunc("GET /api/cards/{cardId}/image", a.cardImage)
	mux.HandleFunc("GET /api/cards/{cardId}", a.getCard)
	mux.HandleFunc("GET /api/decks", a.listPublicDecks)
	mux.HandleFunc("GET /api/decks/{deckId}", a.getDeck)
	mux.HandleFunc("GET /api/decks/{deckId}/reviews", a.listReviews)
	mux.Handle("POST /api/decks/{deckId}/reviews", mw.RequireLogin(a.secret, http.HandlerFunc(a.saveReview)))
	mux.HandleFunc("POST /api/auth/register", a.register)
	mux.HandleFunc("POST /api/auth/login", a.login)

	login := func(pattern string, fn http.HandlerFunc) { mux.Handle(pattern, mw.RequireLogin(a.secret, fn)) }
	admin := func(pattern string, fn http.HandlerFunc) {
		mux.Handle(pattern, mw.RequireLogin(a.secret, mw.RequireRole("admin", fn)))
	}
	login("GET /api/me", a.getMe)
	login("PATCH /api/me", a.updateMe)
	login("PUT /api/me/password", a.changePassword)
	login("GET /api/me/decks", a.listMyDecks)
	login("POST /api/decks", a.createDeck)
	login("PUT /api/decks/{deckId}", a.updateDeck)
	login("DELETE /api/decks/{deckId}", a.deleteDeck)
	login("PUT /api/decks/{deckId}/cards", a.replaceDeckCards)
	login("GET /api/me/collection", a.listCollection)
	login("PUT /api/me/collection/{cardId}", a.setCollectionQuantity)
	login("DELETE /api/me/collection/{cardId}", a.deleteCollectionCard)

	admin("POST /api/admin/cards", a.createCard)
	admin("PUT /api/admin/cards/{cardId}", a.updateCard)
	admin("DELETE /api/admin/cards/{cardId}", a.deleteCard)
	admin("GET /api/admin/members", a.listMembers)
	admin("PATCH /api/admin/members/{memberId}/role", a.updateMemberRole)
	admin("DELETE /api/admin/members/{memberId}", a.deleteMember)
	admin("GET /api/admin/decks", a.adminListDecks)
	admin("DELETE /api/admin/decks/{deckId}", a.adminDeleteDeck)
	admin("GET /api/admin/reviews", a.adminListReviews)
	admin("DELETE /api/admin/reviews/{reviewId}", a.adminDeleteReview)

	return a.cors(mux)
}

func (a *API) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == a.frontendOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func WriteJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, map[string]any{"error": map[string]string{"code": code, "message": message}})
}

func decodeJSON(r *http.Request, target any) error {
	data, err := io.ReadAll(io.LimitReader(r.Body, (1<<20)+1))
	if err != nil || len(data) > 1<<20 {
		return errors.New("request body too large or unreadable")
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		return errors.New("request must contain one JSON value")
	}
	return nil
}

func positiveID(raw string) (int64, bool) {
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

func trim(value string) string { return strings.TrimSpace(value) }

func parseBound(raw string, fallback, min, max int) (int, bool) {
	if raw == "" {
		return fallback, true
	}
	value, err := strconv.Atoi(raw)
	return value, err == nil && value >= min && value <= max
}

func postgresCode(err error) string {
	var dbErr *pgconn.PgError
	if errors.As(err, &dbErr) {
		return dbErr.Code
	}
	return ""
}
