package mw

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"card-vault/backend/auth"
)

type identityKey struct{}

type Identity struct {
	MemberID int64
	Role     string
}

func Current(r *http.Request) Identity {
	value, _ := r.Context().Value(identityKey{}).(Identity)
	return value
}

// RequireLogin ตรวจลายเซ็นและวันหมดอายุก่อนใส่ memberId/role ลง context
func RequireLogin(secret []byte, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Fields(r.Header.Get("Authorization"))
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			writeError(w, http.StatusUnauthorized, "unauthorized", "กรุณาเข้าสู่ระบบ")
			return
		}
		claims, err := auth.Parse(secret, parts[1])
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "ตั๋วเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ")
			return
		}
		identity := Identity{MemberID: claims.MemberID, Role: claims.Role}
		ctx := context.WithValue(r.Context(), identityKey{}, identity)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequireRole(role string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if Current(r).Role != role {
			writeError(w, http.StatusForbidden, "forbidden", "ไม่มีสิทธิ์ดำเนินการนี้")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"code": code, "message": message}})
}
