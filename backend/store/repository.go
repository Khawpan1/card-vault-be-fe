package store

import "context"

// Repository keeps handlers independent from the PostgreSQL connection details.
type Repository interface {
	SearchCards(context.Context, CardSearch, int, int) ([]Card, int, error)
	CardFilterOptions(context.Context) (CardFilterOptions, error)
	CardByID(context.Context, int64) (Card, error)
	CreateCard(context.Context, Card) (Card, error)
	UpdateCard(context.Context, int64, Card) (Card, error)
	DeleteCard(context.Context, int64) (int64, error)

	CreateMember(context.Context, string, string, string) (Member, error)
	MemberByEmail(context.Context, string) (Member, string, error)
	MemberByID(context.Context, int64) (Member, error)
	UpdateDisplayName(context.Context, int64, string) (Member, error)
	PasswordHash(context.Context, int64) (string, error)
	UpdatePasswordHash(context.Context, int64, string) error
	ListMembers(context.Context) ([]Member, error)
	UpdateMemberRole(context.Context, int64, string) (Member, error)
	DeleteMember(context.Context, int64) (int64, error)

	ListPublicDecks(context.Context, string) ([]Deck, error)
	ListMemberDecks(context.Context, int64) ([]Deck, error)
	DeckByID(context.Context, int64) (Deck, error)
	CreateDeck(context.Context, int64, string, string, string, bool) (Deck, error)
	UpdateMemberDeck(context.Context, int64, int64, string, string, bool) (int64, error)
	DeleteMemberDeck(context.Context, int64, int64) (int64, error)
	ReplaceDeckCards(context.Context, int64, int64, []DeckCard) error
	ListAdminDecks(context.Context) ([]Deck, error)
	DeleteDeck(context.Context, int64) (int64, error)

	ListCollection(context.Context, int64) ([]CollectionCard, error)
	SetCollectionQuantity(context.Context, int64, int64, int) error
	DeleteCollectionCard(context.Context, int64, int64) (int64, error)
	ReviewInfo(context.Context, int64) (DeckReviewInfo, error)
	ListReviews(context.Context, int64) ([]Review, error)
	SaveReview(context.Context, int64, int64, string) error
	ListAdminReviews(context.Context) ([]Review, error)
	DeleteReview(context.Context, int64) (int64, error)
}
