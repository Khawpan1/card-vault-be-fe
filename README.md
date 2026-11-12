# Vanguard Vault

เว็บคลังการ์ดและจัดเด็คสำหรับ **Cardfight!! Vanguard** เกมเดียว สมาชิกค้นหาการ์ดจากรูป สร้างและแก้ไขเด็ค เก็บคอลเลกชัน และเผยแพร่เด็คสาธารณะได้

- [เว็บจริงบน Vercel](https://frontend-wheat-kappa-70.vercel.app/cards)
- [สถานะ Go API บน Render](https://card-vault-be-fe.onrender.com/api/health)

## โครงสร้าง

- `frontend/` React, Tailwind CSS, React Router และ Fetch API
- `backend/` Go API แบ่ง `cmd/server/`, `handler/`, `store/`, `mw/` และ `auth/`
- `database/` PostgreSQL schema, migrations, API contract และ seed script

หน้า React ใช้ Fetch เรียก Go API เพื่อค้นหาการ์ดตามชื่อ ชุด ความหายาก เกรด เนชั่น แคลน และยูนิท

หน้าจัดเด็คเก็บร่างล่าสุดแยกตามบัญชีในเบราว์เซอร์ เมื่อเซสชันหมดอายุ ให้เข้าสู่ระบบด้วยบัญชีเดิมบนเบราว์เซอร์เดิมเพื่อจัดต่อ

## แหล่งข้อมูลและรูป

ใช้ [Open TCG API (TCGTracking)](https://openapi.tcgtracking.com/tcgapi/) ดึงรายการเซ็ต Vanguard จาก `/v1/16/sets` และการ์ดในแต่ละเซ็ตจาก `/v1/16/sets/{id}/cards` โดยไม่ต้องใช้ API key

สคริปต์ใช้รหัสรายการของ TCGTracking เพื่อรวมรายการซ้ำและอัปเดตแถวเดิมเมื่อรัน seed ซ้ำ การ์ดที่ไม่มีประเภทหรือความหายากแสดงว่า “ไม่ระบุ” ส่วนข้อความเอฟเฟกต์เว้นว่างตามข้อมูลต้นทาง รูปการ์ดเก็บเป็น URL ในฐานข้อมูล

สคริปต์เก็บผลของเซ็ตที่อ่านแล้วใน `database/.make-seed-progress/open-tcg/` เพื่อรันต่อได้ ใช้ `node database/make-seed.mjs --refresh` เพื่อดึงข้อมูลล่าสุดทุกเซ็ต

## รันในเครื่องด้วยฐานข้อมูล Supabase (PowerShell)

1. เปิด Supabase → Connect → Session pooler แล้วตั้ง `DATABASE_URL` ด้วย URI ของโปรเจกต์ ใส่รหัสผ่านฐานข้อมูลแทน placeholder และกำหนด `sslmode=require`
2. สำหรับฐานข้อมูลใหม่ ให้รัน schema และ seed จากโฟลเดอร์โปรเจกต์ หากฐานข้อมูลมีข้อมูลอยู่แล้ว ให้ดูขั้นตอนย้ายฐานข้อมูลด้านล่าง

   ```powershell
   psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/schema.sql
   psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/seed.sql
   psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/card-attributes.sql
   ```

3. ตั้งค่าและรัน Backend:

   ```powershell
   $env:JWT_SECRET = "ใส่-secret-สุ่มที่ยาวอย่างน้อย-32-ตัวอักษร"
   $env:FRONTEND_ORIGIN = "http://localhost:3000"
   cd backend
   go run ./cmd/server
   ```

4. เปิดอีก Terminal เพื่อรัน Frontend:

   ```powershell
   cd frontend
   Copy-Item .env.example .env.local
   npm ci
   npm start
   ```

5. สมัครสมาชิกตามปกติ หากต้องการบัญชี Admin ให้ผู้ดูแล PostgreSQL ปรับ role:

   ```sql
   UPDATE members SET role = 'admin' WHERE lower(email) = lower('อีเมลผู้ดูแล');
   ```

   จากนั้นออกจากระบบและเข้าสู่ระบบใหม่เพื่อรับ token ที่มี role ล่าสุด

## อัปเดตฐานข้อมูลเดิม

สำหรับฐานข้อมูลรุ่นหลายเกม ให้สำรองข้อมูลแล้วรัน `database/migrations/003_vanguard_only.sql` หนึ่งครั้ง จากนั้นใช้ `psql` เชื่อมต่อ Supabase ผ่าน Session pooler และรันไฟล์ `database/seed.sql` ด้วย `-v ON_ERROR_STOP=1` ใช้ `schema.sql` สำหรับฐานข้อมูลใหม่

Seed เก็บการ์ดที่เด็คและคอลเลกชันเดิมอ้างถึงไว้ การ์ดเดิมอาจมีชื่อเดียวกับรายการจาก Open TCG เพราะแต่ละแหล่งใช้รหัสต่างกัน

สำหรับฐานข้อมูล Vanguard ที่มีข้อมูลแล้ว ให้รัน `database/migrations/004_card_attributes.sql` แล้วรัน `database/card-attributes.sql` เพื่อเติมฟิลด์ตัวกรองตามรหัสต้นทาง โดยคงรหัสการ์ดและรายการเด็คเดิม

## Environment variables

ดูชื่อค่าที่ต้องตั้งใน `backend/.env.example` และ `frontend/.env.example`. ค่าลับที่ต้องมีคือ `DATABASE_URL`, `JWT_SECRET` (อย่างน้อย 32 ตัวอักษร). ใช้ `POKEWALLET_API_KEY` เฉพาะรูปของการ์ดเดิมจาก PokéWallet

## Deploy

- Frontend: Vercel, Root Directory `frontend`; ตั้ง `REACT_APP_API_URL` เป็น URL backend ต่อท้าย `/api`.
- Backend บน Render ใช้ Web Service เชื่อม GitHub สาขา `main` โดยตั้ง Root Directory เป็น `backend`, Build Command เป็น `go build -o app ./cmd/server` และ Start Command เป็น `./app` ตั้ง `DATABASE_URL`, `JWT_SECRET` และ `FRONTEND_ORIGIN=https://frontend-wheat-kappa-70.vercel.app` ใน Environment
- Database ใช้ Supabase PostgreSQL ตามขั้นตอนสำหรับฐานข้อมูลใหม่หรือฐานข้อมูลเดิมด้านบน

## ขอบเขตและเครดิต

ขอบเขตเว็บมีคลังการ์ด ค้นหา/กรอง รายละเอียดการ์ด เด็คสาธารณะ ระบบสมาชิก เด็ค คอลเลกชัน และหน้า Admin. ไม่รวมฟีเจอร์คอมโบ ร้านค้า ราคา ทัวร์นาเมนต์ แชต หรือการชำระเงิน. เครดิตข้อมูลและรูป [Open TCG API (TCGTracking)](https://openapi.tcgtracking.com/tcgapi/) และ [PokéWallet Cardfight!! Vanguard API](https://pokewallet.io/api-docs/cardfight-vanguard).

## Checklist เกณฑ์ประเมิน

- [x] โครงสร้าง Frontend React/Tailwind/Router และ Backend Go แยกชัด
- [x] Guest / Member / Admin และตรวจสิทธิ์ฝั่ง Backend ผ่าน JWT
- [x] Register, Login/Logout, Profile และเปลี่ยนรหัสผ่านด้วย bcrypt
- [x] Fetch → Go → PostgreSQL สำหรับรายการการ์ดและเด็ค พร้อม Loading / Empty / Error
- [x] สร้าง/แก้ไข/ลบเด็ค, เลือกการ์ดด้วยรูป กรองตามชุดและความหายาก เปลี่ยนหน้า จำกัด 4 ใบต่อรหัสการ์ด คอลเลกชัน และเด็คสาธารณะ
- [x] สร้าง seed จากข้อมูล Vanguard ทุกเซ็ตใน Open TCG API
- [x] ตรวจการนำเข้าบน Supabase ครบ 26,492 รายการจาก Open TCG และทดสอบค้นหา รายละเอียด และรูปผ่าน Render
- [x] Deploy เว็บธีมสว่างบน Vercel และ Go API บน Render แล้ว
- [x] React Unit Test ผ่าน 9 รายการ รวมตัวกรอง การเปลี่ยนหน้า การจำกัดการ์ด และการกู้ร่างเด็คหลังเซสชันหมดอายุ
- [ ] ทบทวนการสาธิตด้วยบัญชีจริงของทีม
