package store

import "context"

type Member struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

func (s *Store) CreateMember(ctx context.Context, email, passwordHash, displayName string) (Member, error) {
	var member Member
	err := s.Pool.QueryRow(ctx, `INSERT INTO members(email,password_hash,display_name) VALUES($1,$2,$3) RETURNING id,email,display_name,role`, email, passwordHash, displayName).Scan(&member.ID, &member.Email, &member.DisplayName, &member.Role)
	return member, err
}

func (s *Store) MemberByEmail(ctx context.Context, email string) (Member, string, error) {
	var member Member
	var hash string
	err := s.Pool.QueryRow(ctx, `SELECT id,email,display_name,role,password_hash FROM members WHERE lower(email)=lower($1)`, email).Scan(&member.ID, &member.Email, &member.DisplayName, &member.Role, &hash)
	return member, hash, err
}

func (s *Store) MemberByID(ctx context.Context, id int64) (Member, error) {
	var member Member
	err := s.Pool.QueryRow(ctx, `SELECT id,email,display_name FROM members WHERE id=$1`, id).Scan(&member.ID, &member.Email, &member.DisplayName)
	return member, err
}

func (s *Store) UpdateDisplayName(ctx context.Context, id int64, name string) (Member, error) {
	var member Member
	err := s.Pool.QueryRow(ctx, `UPDATE members SET display_name=$2,updated_at=now() WHERE id=$1 RETURNING id,email,display_name`, id, name).Scan(&member.ID, &member.Email, &member.DisplayName)
	return member, err
}

func (s *Store) PasswordHash(ctx context.Context, id int64) (string, error) {
	var hash string
	err := s.Pool.QueryRow(ctx, `SELECT password_hash FROM members WHERE id=$1`, id).Scan(&hash)
	return hash, err
}

func (s *Store) UpdatePasswordHash(ctx context.Context, id int64, hash string) error {
	_, err := s.Pool.Exec(ctx, `UPDATE members SET password_hash=$2,updated_at=now() WHERE id=$1`, id, hash)
	return err
}

func (s *Store) ListMembers(ctx context.Context) ([]Member, error) {
	rows, err := s.Pool.Query(ctx, `SELECT id,email,display_name,role FROM members ORDER BY created_at DESC LIMIT 500`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Member, 0)
	for rows.Next() {
		var item Member
		if err := rows.Scan(&item.ID, &item.Email, &item.DisplayName, &item.Role); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) UpdateMemberRole(ctx context.Context, id int64, role string) (Member, error) {
	var member Member
	err := s.Pool.QueryRow(ctx, `UPDATE members SET role=$2,updated_at=now() WHERE id=$1 RETURNING id,email,display_name,role`, id, role).Scan(&member.ID, &member.Email, &member.DisplayName, &member.Role)
	return member, err
}

func (s *Store) DeleteMember(ctx context.Context, id int64) (int64, error) {
	result, err := s.Pool.Exec(ctx, `DELETE FROM members WHERE id=$1`, id)
	return result.RowsAffected(), err
}
