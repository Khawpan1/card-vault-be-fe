package store

import (
	"context"
	"time"
)

type CollectionCard struct {
	Card
	Quantity int `json:"quantity"`
}
type Review struct {
	ID         int64     `json:"id"`
	DeckID     int64     `json:"deckId,omitempty"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"createdAt"`
	MemberName string    `json:"memberName"`
	DeckName   string    `json:"deckName,omitempty"`
}
type DeckReviewInfo struct {
	OwnerID  int64
	IsPublic bool
}

func (s *Store) ListCollection(ctx context.Context, memberID int64) ([]CollectionCard, error) {
	rows, err := s.Pool.Query(ctx, `SELECT c.id,c.game,c.source_id,c.name,c.type,c.rarity,c.rules_text,c.image_url,c.set_name,c.set_code,c.source_url,cc.quantity FROM collection_cards cc JOIN cards c ON c.id=cc.card_id WHERE cc.member_id=$1 AND c.game='vanguard' ORDER BY lower(c.name)`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]CollectionCard, 0)
	for rows.Next() {
		var item CollectionCard
		if err := rows.Scan(&item.ID, &item.Game, &item.SourceID, &item.Name, &item.Type, &item.Rarity, &item.RulesText, &item.ImageURL, &item.SetName, &item.SetCode, &item.SourceURL, &item.Quantity); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) SetCollectionQuantity(ctx context.Context, memberID, cardID int64, quantity int) error {
	var exists int
	err := s.Pool.QueryRow(ctx, `SELECT 1 FROM cards WHERE id=$1 AND game='vanguard'`, cardID).Scan(&exists)
	if err != nil {
		return err
	}
	_, err = s.Pool.Exec(ctx, `INSERT INTO collection_cards(member_id,card_id,quantity) VALUES($1,$2,$3) ON CONFLICT(member_id,card_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now()`, memberID, cardID, quantity)
	return err
}

func (s *Store) DeleteCollectionCard(ctx context.Context, memberID, cardID int64) (int64, error) {
	result, err := s.Pool.Exec(ctx, `DELETE FROM collection_cards cc USING cards c WHERE cc.member_id=$1 AND cc.card_id=$2 AND c.id=cc.card_id AND c.game='vanguard'`, memberID, cardID)
	return result.RowsAffected(), err
}

func (s *Store) ReviewInfo(ctx context.Context, deckID int64) (DeckReviewInfo, error) {
	var info DeckReviewInfo
	err := s.Pool.QueryRow(ctx, `SELECT member_id,is_public FROM decks WHERE id=$1 AND game='vanguard'`, deckID).Scan(&info.OwnerID, &info.IsPublic)
	return info, err
}

func (s *Store) ListReviews(ctx context.Context, deckID int64) ([]Review, error) {
	rows, err := s.Pool.Query(ctx, `SELECT r.id,r.content,r.created_at,m.display_name FROM reviews r JOIN members m ON m.id=r.member_id WHERE r.deck_id=$1 ORDER BY r.created_at DESC`, deckID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Review, 0)
	for rows.Next() {
		var item Review
		if err := rows.Scan(&item.ID, &item.Content, &item.CreatedAt, &item.MemberName); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) SaveReview(ctx context.Context, deckID, memberID int64, content string) error {
	_, err := s.Pool.Exec(ctx, `INSERT INTO reviews(deck_id,member_id,content) VALUES($1,$2,$3) ON CONFLICT(deck_id,member_id) DO UPDATE SET content=EXCLUDED.content,updated_at=now()`, deckID, memberID, content)
	return err
}

func (s *Store) ListAdminReviews(ctx context.Context, limit, offset int) ([]Review, int, error) {
	const where = ` FROM reviews r JOIN members m ON m.id=r.member_id JOIN decks d ON d.id=r.deck_id WHERE d.game='vanguard'`
	var total int
	if err := s.Pool.QueryRow(ctx, `SELECT count(*)`+where).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.Pool.Query(ctx, `SELECT r.id,r.deck_id,r.content,r.created_at,m.display_name,d.name`+where+
		` ORDER BY r.created_at DESC,r.id DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Review, 0)
	for rows.Next() {
		var item Review
		if err := rows.Scan(&item.ID, &item.DeckID, &item.Content, &item.CreatedAt, &item.MemberName, &item.DeckName); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (s *Store) DeleteReview(ctx context.Context, id int64) (int64, error) {
	result, err := s.Pool.Exec(ctx, `DELETE FROM reviews r USING decks d WHERE r.id=$1 AND r.deck_id=d.id AND d.game='vanguard'`, id)
	return result.RowsAffected(), err
}
