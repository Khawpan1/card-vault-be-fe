package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	MemberID int64  `json:"memberId"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func Issue(secret []byte, memberID int64, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		MemberID: memberID,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * time.Minute)),
			Issuer:    "card-vault",
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

func Parse(secret []byte, raw string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithIssuer("card-vault"))
	if err != nil || !token.Valid || claims.MemberID <= 0 || (claims.Role != "member" && claims.Role != "admin") {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
