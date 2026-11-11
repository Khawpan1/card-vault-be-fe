package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

type Card struct {
	ID        int64   `json:"id"`
	Game      string  `json:"game"`
	SourceID  string  `json:"sourceId"`
	Name      string  `json:"name"`
	Type      string  `json:"type"`
	Rarity    string  `json:"rarity"`
	RulesText string  `json:"rulesText"`
	ImageURL  string  `json:"imageUrl"`
	SetName   *string `json:"setName"`
	SetCode   *string `json:"setCode"`
	SourceURL string  `json:"sourceUrl"`
}

// SearchCards อ่านคลังใน PostgreSQL และคืนจำนวนทั้งหมดเพื่อทำ pagination
func (s *Store) SearchCards(ctx context.Context, game, query, cardType, rarity string, limit, offset int) ([]Card, int, error) {
	var total int
	err := s.Pool.QueryRow(ctx, `SELECT count(*) FROM cards WHERE game='vanguard' AND ($1='' OR name ILIKE '%'||$1||'%') AND ($2='' OR type ILIKE '%'||$2||'%') AND ($3='' OR rarity ILIKE '%'||$3||'%')`, query, cardType, rarity).Scan(&total)
	if err != nil {
		return nil, 0, err
	}
	rows, err := s.Pool.Query(ctx, `SELECT id,game,source_id,name,type,rarity,rules_text,image_url,set_name,set_code,source_url FROM cards WHERE game='vanguard' AND ($1='' OR name ILIKE '%'||$1||'%') AND ($2='' OR type ILIKE '%'||$2||'%') AND ($3='' OR rarity ILIKE '%'||$3||'%') ORDER BY lower(name),id LIMIT $4 OFFSET $5`, query, cardType, rarity, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Card, 0)
	for rows.Next() {
		var item Card
		if err := rows.Scan(&item.ID, &item.Game, &item.SourceID, &item.Name, &item.Type, &item.Rarity, &item.RulesText, &item.ImageURL, &item.SetName, &item.SetCode, &item.SourceURL); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (s *Store) CardByID(ctx context.Context, id int64) (Card, error) {
	var item Card
	err := s.Pool.QueryRow(ctx, `SELECT id,game,source_id,name,type,rarity,rules_text,image_url,set_name,set_code,source_url FROM cards WHERE id=$1 AND game='vanguard'`, id).Scan(&item.ID, &item.Game, &item.SourceID, &item.Name, &item.Type, &item.Rarity, &item.RulesText, &item.ImageURL, &item.SetName, &item.SetCode, &item.SourceURL)
	return item, err
}

func (s *Store) CreateCard(ctx context.Context, item Card) (Card, error) {
	err := s.Pool.QueryRow(ctx, `INSERT INTO cards(game,source_id,name,type,rarity,rules_text,image_url,set_name,set_code,source_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, item.Game, item.SourceID, item.Name, item.Type, item.Rarity, item.RulesText, item.ImageURL, item.SetName, item.SetCode, item.SourceURL).Scan(&item.ID)
	return item, err
}

func (s *Store) UpdateCard(ctx context.Context, id int64, item Card) (Card, error) {
	err := s.Pool.QueryRow(ctx, `UPDATE cards SET game=$2,source_id=$3,name=$4,type=$5,rarity=$6,rules_text=$7,image_url=$8,set_name=$9,set_code=$10,source_url=$11,updated_at=now() WHERE id=$1 AND game='vanguard' RETURNING id`, id, item.Game, item.SourceID, item.Name, item.Type, item.Rarity, item.RulesText, item.ImageURL, item.SetName, item.SetCode, item.SourceURL).Scan(&item.ID)
	return item, err
}

func (s *Store) DeleteCard(ctx context.Context, id int64) (int64, error) {
	result, err := s.Pool.Exec(ctx, `DELETE FROM cards WHERE id=$1 AND game='vanguard'`, id)
	return result.RowsAffected(), err
}

func IsMissing(err error) bool { return errors.Is(err, pgx.ErrNoRows) }
