package handler

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"

	"card-vault/backend/auth"
	"card-vault/backend/mw"
	"card-vault/backend/store"
	"github.com/jackc/pgx/v5/pgconn"
)

type safeMember = store.Member

func validEmail(email string) bool {
	if len(email) > 255 {
		return false
	}
	parsed, err := mail.ParseAddress(email)
	return err == nil && parsed.Address == email
}

func validPassword(password string) bool { return len(password) >= 8 && len(password) <= 72 }

func (a *API) register(w http.ResponseWriter, r *http.Request) {
	var input struct {
		DisplayName string `json:"displayName"`
		Email       string `json:"email"`
		Password    string `json:"password"`
	}
	if decodeJSON(r, &input) != nil {
		WriteError(w, http.StatusBadRequest, "invalid_json", "รูปแบบข้อมูลไม่ถูกต้อง")
		return
	}
	input.DisplayName, input.Email = trim(input.DisplayName), strings.ToLower(trim(input.Email))
	if len(input.DisplayName) < 1 || len(input.DisplayName) > 50 || !validEmail(input.Email) || !validPassword(input.Password) {
		WriteError(w, http.StatusBadRequest, "invalid_input", "กรุณาตรวจชื่อ อีเมล และรหัสผ่านอย่างน้อย 8 ตัวอักษร")
		return
	}
	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "สร้างบัญชีไม่สำเร็จ")
		return
	}
	member, err := a.db.CreateMember(r.Context(), input.Email, hash, input.DisplayName)
	if err != nil {
		var dbErr *pgconn.PgError
		if errors.As(err, &dbErr) && dbErr.Code == "23505" {
			WriteError(w, http.StatusConflict, "email_taken", "อีเมลนี้ถูกใช้แล้ว")
		} else {
			WriteError(w, http.StatusInternalServerError, "server_error", "สร้างบัญชีไม่สำเร็จ")
		}
		return
	}
	a.writeLogin(w, member, http.StatusCreated)
}

func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if decodeJSON(r, &input) != nil {
		WriteError(w, http.StatusBadRequest, "invalid_json", "รูปแบบข้อมูลไม่ถูกต้อง")
		return
	}
	input.Email = strings.ToLower(trim(input.Email))
	if !validEmail(input.Email) || len(input.Password) == 0 || len(input.Password) > 72 {
		WriteError(w, http.StatusBadRequest, "invalid_input", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	member, hash, err := a.db.MemberByEmail(r.Context(), input.Email)
	if store.IsMissing(err) || (err == nil && auth.CheckPassword(hash, input.Password) != nil) {
		WriteError(w, http.StatusUnauthorized, "invalid_credentials", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "เข้าสู่ระบบไม่สำเร็จ")
		return
	}
	a.writeLogin(w, member, http.StatusOK)
}

func (a *API) writeLogin(w http.ResponseWriter, member safeMember, status int) {
	token, err := auth.Issue(a.secret, member.ID, member.Role)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "เข้าสู่ระบบไม่สำเร็จ")
		return
	}
	WriteJSON(w, status, map[string]any{"token": token, "member": member})
}

func (a *API) getMe(w http.ResponseWriter, r *http.Request) {
	identity := mw.Current(r)
	member, err := a.db.MemberByID(r.Context(), identity.MemberID)
	if store.IsMissing(err) {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "ไม่พบบัญชีสมาชิก")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านข้อมูลสมาชิกไม่สำเร็จ")
		return
	}
	member.Role = identity.Role
	WriteJSON(w, http.StatusOK, map[string]any{"member": member})
}

func (a *API) updateMe(w http.ResponseWriter, r *http.Request) {
	var input struct {
		DisplayName string `json:"displayName"`
	}
	if decodeJSON(r, &input) != nil {
		WriteError(w, http.StatusBadRequest, "invalid_json", "รูปแบบข้อมูลไม่ถูกต้อง")
		return
	}
	input.DisplayName = trim(input.DisplayName)
	if len(input.DisplayName) < 1 || len(input.DisplayName) > 50 {
		WriteError(w, http.StatusBadRequest, "invalid_input", "ชื่อต้องมีความยาว 1 ถึง 50 ตัวอักษร")
		return
	}
	identity := mw.Current(r)
	member, err := a.db.UpdateDisplayName(r.Context(), identity.MemberID, input.DisplayName)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "บันทึกโปรไฟล์ไม่สำเร็จ")
		return
	}
	member.Role = identity.Role
	WriteJSON(w, http.StatusOK, map[string]any{"member": member})
}

func (a *API) changePassword(w http.ResponseWriter, r *http.Request) {
	var input struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if decodeJSON(r, &input) != nil || !validPassword(input.NewPassword) || len(input.CurrentPassword) == 0 || len(input.CurrentPassword) > 72 {
		WriteError(w, http.StatusBadRequest, "invalid_input", "รหัสผ่านใหม่ต้องมี 8 ถึง 72 ตัวอักษร")
		return
	}
	identity := mw.Current(r)
	hash, err := a.db.PasswordHash(r.Context(), identity.MemberID)
	if store.IsMissing(err) || (err == nil && auth.CheckPassword(hash, input.CurrentPassword) != nil) {
		WriteError(w, http.StatusUnauthorized, "invalid_credentials", "รหัสผ่านปัจจุบันไม่ถูกต้อง")
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "อ่านข้อมูลรหัสผ่านไม่สำเร็จ")
		return
	}
	newHash, err := auth.HashPassword(input.NewPassword)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "เปลี่ยนรหัสผ่านไม่สำเร็จ")
		return
	}
	err = a.db.UpdatePasswordHash(r.Context(), identity.MemberID, newHash)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "server_error", "เปลี่ยนรหัสผ่านไม่สำเร็จ")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
