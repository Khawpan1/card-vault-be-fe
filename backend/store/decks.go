package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var (
	ErrCardGameMismatch = errors.New("deck and card games do not match")
	ErrDeckNotOwned     = errors.New("deck not found for this member")
	ErrCardNotFound     = errors.New("card not found")
)

type Deck struct {
	ID          int64      `json:"id"`
	OwnerID     int64      `json:"-"`
	Game        string     `json:"game"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	IsPublic    bool       `json:"isPublic"`
	MemberName  string     `json:"memberName,omitempty"`
	Cards       []DeckCard `json:"cards,omitempty"`
}

type DeckCard struct {
	Card
	Quantity int `json:"quantity"`
}

func (s *Store) ListPublicDecks(ctx context.Context, query string) ([]Deck, error) {
	rows, err := s.Pool.Query(ctx, `SELECT d.id,d.game,d.name,d.description,d.is_public,m.display_name FROM decks d JOIN members m ON m.id=d.member_id WHERE d.is_public AND d.game='vanguard' AND ($1='' OR d.name ILIKE '%'||$1||'%') ORDER BY d.updated_at DESC LIMIT 100`, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Deck, 0)
	for rows.Next() {
		var item Deck
		if err := rows.Scan(&item.ID, &item.Game, &item.Name, &item.Description, &item.IsPublic, &item.MemberName); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) ListMemberDecks(ctx context.Context, memberID int64) ([]Deck, error) {
	rows, err := s.Pool.Query(ctx, `SELECT id,game,name,description,is_public FROM decks WHERE member_id=$1 AND game='vanguard' ORDER BY updated_at DESC`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Deck, 0)
	for rows.Next() {
		var item Deck
		if err := rows.Scan(&item.ID, &item.Game, &item.Name, &item.Description, &item.IsPublic); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) DeckByID(ctx context.Context, id int64) (Deck, error) {
	var item Deck
	err := s.Pool.QueryRow(ctx, `SELECT d.id,d.game,d.name,d.description,d.is_public,d.member_id,m.display_name FROM decks d JOIN members m ON m.id=d.member_id WHERE d.id=$1 AND d.game='vanguard'`, id).Scan(&item.ID, &item.Game, &item.Name, &item.Description, &item.IsPublic, &item.OwnerID, &item.MemberName)
	if err != nil {
		return item, err
	}
	rows, err := s.Pool.Query(ctx, `SELECT c.id,c.game,c.source_id,c.name,c.type,c.rarity,c.rules_text,c.image_url,c.set_name,c.set_code,c.source_url,dc.quantity FROM deck_cards dc JOIN cards c ON c.id=dc.card_id WHERE dc.deck_id=$1 ORDER BY lower(c.name)`, id)
	if err != nil {
		return item, err
	}
	defer rows.Close()
	item.Cards = make([]DeckCard, 0)
	for rows.Next() {
		var card DeckCard
		if err := rows.Scan(&card.ID, &card.Game, &card.SourceID, &card.Name, &card.Type, &card.Rarity, &card.RulesText, &card.ImageURL, &card.SetName, &card.SetCode, &card.SourceURL, &card.Quantity); err != nil {
			return item, err
		}
		item.Cards = append(item.Cards, card)
	}
	return item, rows.Err()
}

func (s *Store) CreateDeck(ctx context.Context, memberID int64, name, description string, isPublic bool) (Deck, error) {
	var item Deck
	err := s.Pool.QueryRow(ctx, `INSERT INTO decks(member_id,game,name,description,is_public) VALUES($1,'vanguard',$2,$3,$4) RETURNING id,game,name,description,is_public`, memberID, name, description, isPublic).Scan(&item.ID, &item.Game, &item.Name, &item.Description, &item.IsPublic)
	return item, err
}

func (s *Store) UpdateMemberDeck(ctx context.Context, id, memberID int64, name, description string, isPublic bool) (int64, error) {
	result, err := s.Pool.Exec(ctx, `UPDATE decks SET name=$3,description=$4,is_public=$5,updated_at=now() WHERE id=$1 AND member_id=$2 AND game='vanguard'`, id, memberID, name, description, isPublic)
	return result.RowsAffected(), err
}

func (s *Store) DeleteMemberDeck(ctx context.Context, id, memberID int64) (int64, error) {
	result, err := s.Pool.Exec(ctx, `DELETE FROM decks WHERE id=$1 AND member_id=$2 AND game='vanguard'`, id, memberID)
	return result.RowsAffected(), err
}

func (s *Store) ReplaceDeckCards(ctx context.Context, deckID, memberID int64, cards []DeckCard) error {
	// เปลี่ยนรายการทั้งชุดใน transaction และล็อกเด็คของสมาชิกก่อนเขียน
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var game string
	err = tx.QueryRow(ctx, `SELECT game FROM decks WHERE id=$1 AND member_id=$2 AND game='vanguard' FOR UPDATE`, deckID, memberID).Scan(&game)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrDeckNotOwned
	}
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM deck_cards WHERE deck_id=$1`, deckID); err != nil {
		return err
	}
	for _, item := range cards {
		var cardGame string
		if err = tx.QueryRow(ctx, `SELECT game FROM cards WHERE id=$1`, item.ID).Scan(&cardGame); errors.Is(err, pgx.ErrNoRows) {
			return ErrCardNotFound
		} else if err != nil {
			return err
		}
		if cardGame != game {
			return ErrCardGameMismatch
		}
		if _, err = tx.Exec(ctx, `INSERT INTO deck_cards(deck_id,card_id,game,quantity) VALUES($1,$2,$3,$4)`, deckID, item.ID, game, item.Quantity); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *Store) ListAdminDecks(ctx context.Context, limit, offset int) ([]Deck, int, error) {
	const where = ` FROM decks d JOIN members m ON m.id=d.member_id WHERE d.game='vanguard' AND d.is_public`
	var total int
	if err := s.Pool.QueryRow(ctx, `SELECT count(*)`+where).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.Pool.Query(ctx, `SELECT d.id,d.game,d.name,d.description,d.is_public,m.display_name`+where+
		` ORDER BY d.updated_at DESC,d.id DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Deck, 0)
	for rows.Next() {
		var item Deck
		if err := rows.Scan(&item.ID, &item.Game, &item.Name, &item.Description, &item.IsPublic, &item.MemberName); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (s *Store) DeleteDeck(ctx context.Context, id int64) (int64, error) {
	result, err := s.Pool.Exec(ctx, `DELETE FROM decks WHERE id=$1 AND game='vanguard' AND is_public`, id)
	return result.RowsAffected(), err
}
