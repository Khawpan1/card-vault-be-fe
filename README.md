# Card Vault

เว็บคลังการ์ดและจัดเด็คสำหรับ Yu-Gi-Oh!, Magic: The Gathering, Pokémon TCG และ One Piece Card Game

## โครงสร้างโปรเจกต์

- `frontend/` React, Tailwind CSS, React Router, Fetch API และ React Unit Test
- `backend/` Go API แบ่ง `cmd/server/`, `handler/`, `store/`, `mw/` และ `auth/`
- `database/` PostgreSQL schema, API contract และสคริปต์ seed แบบรันครั้งเดียว

เส้นทางข้อมูลหลักคือหน้า React → Fetch API → Go middleware/handler → `store.Repository`
→ PostgreSQL (`pgxpool`). API ปกติไม่เรียกผู้ให้บริการข้อมูลการ์ดภายนอก

## รันในเครื่อง (PowerShell)

1. สร้างฐานข้อมูล PostgreSQL แล้วรัน `database/schema.sql` ผ่าน PostgreSQL client หรือ SQL Editor ของ Supabase
2. ดึงข้อมูลการ์ดและสร้าง SQL สำหรับ seed:

   ```powershell
   node database/make-seed.mjs
   ```

   สคริปต์เรียก API ต้นทางครั้งเดียวและสร้าง `database/seed.sql`; หลัง schema ให้รันไฟล์นี้กับฐานข้อมูลเดียวกัน (ใช้ซ้ำได้เพราะ upsert ตามรหัสต้นทาง)
   Seed ปัจจุบันมี Yu-Gi-Oh! 500 ใบ, MTG 500 ใบ, Pokémon ภาษาไทย 500 ใบ และ One Piece ที่มีข้อมูลหลักครบ 3,557 ใบ
   Pokémon ใช้ TCGdex ภาษาไทย; เกมอื่นใช้ภาษาที่ API มีให้ สคริปต์ seed เรียก API ภายนอกเฉพาะตอนสร้างข้อมูลครั้งเดียว
3. ตั้งค่า Backend ใน Terminal:

   ```powershell
   $env:DATABASE_URL = "postgres://postgres:password@localhost:5432/cardvault?sslmode=disable"
   $env:JWT_SECRET = "ใส่-secret-สุ่มที่ยาวอย่างน้อย-32-ตัวอักษร"
   $env:FRONTEND_ORIGIN = "http://localhost:3000"
   cd backend
   go run ./cmd/server
   ```
4. ตั้งค่า Frontend ในอีก Terminal:

   ```powershell
   cd frontend
   Copy-Item .env.example .env.local
   npm install
   npm start
   ```
5. ลงทะเบียนผู้ใช้ตามปกติ หากต้องการผู้ดูแลระบบ ให้ปรับ role ของบัญชีในฐานข้อมูลโดยผู้ดูแล PostgreSQL:

   ```sql
   UPDATE members SET role = 'admin' WHERE lower(email) = lower('อีเมลผู้ดูแล');
   ```

   จากนั้นออกจากระบบและเข้าสู่ระบบใหม่ เพื่อรับ JWT ที่มี role ล่าสุด (ตั๋วหมดอายุใน 30 นาที)

## ทดสอบ

```powershell
cd frontend
npm test -- --watchAll=false --runInBand
cd ..\backend
go test ./...
```

## Environment variables

ใช้ `backend/.env.example` และ `frontend/.env.example` เป็นรายการค่าที่ต้องกำหนด
Go อ่าน environment variables จากระบบหรือแพลตฟอร์ม deploy โดยตรง
อย่า commit `.env`, database URL หรือ JWT secret

## Deploy ตามข้อกำหนดวิชา

- Frontend: เชื่อม GitHub repository กับ Vercel โดยตั้ง Root Directory เป็น `frontend`; กำหนด `REACT_APP_API_URL` เป็น URL ของ Backend ต่อท้าย `/api`.
- Backend: เชื่อม repository กับ Render โดยตั้ง Root Directory เป็น `backend`, Build Command `go build -o app ./cmd/server`, Start Command `./app`; กำหนด `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` ใน Environment.
- Database: ใช้ PostgreSQL บน Supabase, รัน `database/schema.sql` แล้วนำ `database/seed.sql` เข้า DB.

## ที่มาข้อมูลการ์ด

รายละเอียดและ URL รูปจาก [YGOPRODeck](https://ygoprodeck.com/), [Scryfall](https://scryfall.com/), [TCGdex ภาษาไทย](https://tcgdex.dev/) และ [OPTCG API](https://www.optcgapi.com/documentation). เว็บแสดงเครดิตแหล่งข้อมูลและเก็บเฉพาะ URL รูปตามข้อกำหนดโครงงาน

หมายเหตุ: TCGdex มีชุดข้อมูลภาษาไทย; YGOPRODeck, Scryfall และ OPTCG API ใช้ข้อมูลภาษาอังกฤษใน seed นี้ เพราะไม่มีชุดภาษาไทยที่ API เหล่านั้นเปิดให้ใช้ได้ตรงกัน เว็บไม่เรียก API ภายนอกระหว่างใช้งานปกติ

## Checklist เกณฑ์ประเมิน

- [x] React, Tailwind CSS, React Router, Fetch API, Go และ PostgreSQL
- [x] Guest / Member / Admin มีหน้าและ API ตามขอบเขต; API ตรวจ JWT และ role
- [x] Register, login, logout, profile และเปลี่ยนรหัสผ่าน (bcrypt)
- [x] ค้น/กรองการ์ด, ดูรายละเอียด, ดูเด็คสาธารณะ และสถานะ Loading / Empty / Error
- [x] สมาชิกสร้าง/แก้/ลบเด็ค, จัดการจำนวนการ์ด, เก็บคอลเลกชัน และแก้โปรไฟล์
- [x] ผู้ดูแลจัดการการ์ด/สมาชิก และกลั่นกรองเด็ค/รีวิว
- [x] Schema PostgreSQL และ seed: 500 ใบต่อเกมหลัก พร้อม One Piece 3,557 ใบ
- [x] Supabase มี schema, migration เพิ่ม One Piece และ seed ชุดขยายแล้ว
- [x] React Unit Test ผ่าน 4 กรณี: Loading/ข้อมูล, Empty, Error/retry และสร้างเด็ค/เพิ่มการ์ด
- [x] แยก `frontend/`, `backend/`, `database/` ชัดเจน
- [ ] ทดสอบ Backend เชื่อม PostgreSQL จริงและสาธิต flow หลังตั้ง `DATABASE_URL` สำหรับ Render
- [x] สร้าง private GitHub repository และ push branch `main`
- [x] Deploy database บน Supabase และ seed ข้อมูลจริง
- [ ] Deploy Frontend บน Vercel และ Backend บน Render

### สถานะ Supabase

- Project: `card-vault-be-fe` (region Southeast Asia / Singapore)
- PostgreSQL project ref: `dogwxvewpvnzdbkyjtuy`
- Source: [Khawpan1/card-vault-be-fe](https://github.com/Khawpan1/card-vault-be-fe) (private)
- `schema.sql`, migration `database/migrations/001_add_onepiece.sql` และ `seed.sql` รันสำเร็จแล้ว; seed ชุดขยายเพิ่ม 5,057 แถว
- ใช้ Go ต่อ PostgreSQL โดยตรง จึงปิด Data API ไว้; ไม่ต้องใช้ Supabase client หรือเปิด RLS สำหรับ browser
- รหัสผ่านฐานข้อมูลเป็นความลับและไม่ได้เก็บใน repository; หากต้องเชื่อม Render ให้ตั้งรหัสใหม่ใน Supabase แล้วเก็บใน Environment ของ Render เป็น `DATABASE_URL`
