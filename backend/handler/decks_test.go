package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"card-vault/backend/auth"
	"card-vault/backend/store"
)

type deckCopyStore struct {
	store.Repository
	saved []store.DeckCard
}

func (s *deckCopyStore) ReplaceDeckCards(_ context.Context, _, _ int64, cards []store.DeckCard) error {
	s.saved = cards
	return nil
}

func TestReplaceDeckCardsCopyLimit(t *testing.T) {
	secret := []byte("test-secret-for-vanguard-deck-limit")
	token, err := auth.Issue(secret, 1, "member")
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name   string
		body   string
		status int
	}{
		{"four copies", `{"cards":[{"cardId":31,"quantity":4}]}`, http.StatusOK},
		{"five copies", `{"cards":[{"cardId":31,"quantity":5}]}`, http.StatusBadRequest},
		{"duplicated card ID", `{"cards":[{"cardId":31,"quantity":3},{"cardId":31,"quantity":2}]}`, http.StatusBadRequest},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			db := &deckCopyStore{}
			api := New(db, secret, "", "").Routes()
			req := httptest.NewRequest(http.MethodPut, "/api/decks/12/cards", strings.NewReader(test.body))
			req.Header.Set("Authorization", "Bearer "+token)
			response := httptest.NewRecorder()
			api.ServeHTTP(response, req)

			if response.Code != test.status {
				t.Fatalf("got status %d, want %d: %s", response.Code, test.status, response.Body)
			}
			if test.status == http.StatusOK {
				if len(db.saved) != 1 || db.saved[0].Quantity != 4 {
					t.Fatalf("expected four copies saved, got %+v", db.saved)
				}
			} else if db.saved != nil {
				t.Fatal("invalid deck reached the store")
			}
		})
	}
}
