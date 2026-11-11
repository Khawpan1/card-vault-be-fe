# Vanguard Vault

เว็บคลังการ์ดและจัดเด็คสำหรับ **Cardfight!! Vanguard** เกมเดียว สมาชิกค้นหาการ์ดจากรูป สร้างและแก้ไขเด็ค เก็บคอลเลกชัน และเผยแพร่เด็คสาธารณะได้

## โครงสร้าง

- `frontend/` React, Tailwind CSS, React Router และ Fetch API
- `backend/` Go API แบ่ง `cmd/server/`, `handler/`, `store/`, `mw/` และ `auth/`
- `database/` PostgreSQL schema, migrations, API contract และ seed script

ข้อมูลการ์ดทำงานตามเส้นทาง React → Fetch → Go → PostgreSQL; API ค้นหาและกรองข้อมูลจากฐานข้อมูลของเรา ไม่เรียก PokéWallet เพื่อค้นหาการ์ดทุกครั้งที่เปิดหน้า

## แหล่งข้อมูลและรูป

ใช้ [PokéWallet Cardfight!! Vanguard API](https://pokewallet.io/api-docs/cardfight-vanguard) ตามฟิลด์ในเอกสารจริง: `/cfv/sets` คืน `name`, `set_code`, `set_id`, `card_count`, `language`, `release_date`; รายการการ์ดในชุดคืน `id`, `card_info`, `images.languages` และ `product_type`.

PokéWallet กำหนด API key สำหรับชุด การ์ด และรูป และห้ามเผย key ในโค้ดฝั่งหน้าเว็บหรือ repository. รูปโหลดผ่าน Go backend เพื่อแนบ key แบบ server-side; backend และ browser cache รูป 24 ชั่วโมงตามข้อมูล API. การค้นหาและกรองการ์ดยังคงอ่าน PostgreSQL.

สคริปต์ seed อ่านทุกชุดที่ API ระบุ (เอกสารปัจจุบันแสดง 421 ชุด) และไล่หน้ารายการสูงสุด 200 ใบต่อคำขอ. นำเข้าการ์ดทุกใบที่ API ระบุเป็น `product_type: "card"` และมี ID/ชื่อ; ไม่รวมสินค้ากล่องหรือรายการที่จำแนกชนิดไม่ได้. หากไม่มีชนิดหรือความหายากให้บันทึกเป็น `ไม่ระบุ`. API แผนฟรีจำกัด 100 คำขอต่อชั่วโมงและ 1,000 คำขอต่อวัน สคริปต์เว้นช่วงคำขอและบันทึก checkpoint ที่ `database/.make-seed-progress/`; หากชน rate limit ให้รันซ้ำหลังเวลาที่แจ้งเพื่อทำต่อ. อย่าลบโฟลเดอร์ checkpoint ระหว่าง seed.

## รันในเครื่อง (PowerShell)

1. สร้างฐานข้อมูล PostgreSQL และรัน `database/schema.sql` สำหรับฐานข้อมูลใหม่
2. ตั้ง API key ใน session PowerShell โดยไม่ใส่ key ลงไฟล์ที่ commit:

   ```powershell
   $secureKey = Read-Host "PokéWallet API key" -AsSecureString
   $env:POKEWALLET_API_KEY = [System.Net.NetworkCredential]::new("", $secureKey).Password
   node database/make-seed.mjs
   Remove-Item Env:POKEWALLET_API_KEY
   ```

   รอจนสคริปต์แจ้งว่าสร้าง `database/seed.sql` สำเร็จครบทุกชุด แล้วจึงรัน SQL นั้นกับ PostgreSQL/Supabase
3. ตั้งค่าและรัน Backend:

   ```powershell
   $env:DATABASE_URL = "postgres://postgres:password@localhost:5432/cardvault?sslmode=disable"
   $env:JWT_SECRET = "ใส่-secret-สุ่มที่ยาวอย่างน้อย-32-ตัวอักษร"
   $env:FRONTEND_ORIGIN = "http://localhost:3000"
   $secureKey = Read-Host "PokéWallet API key" -AsSecureString
   $env:POKEWALLET_API_KEY = [System.Net.NetworkCredential]::new("", $secureKey).Password
   cd backend
   go run ./cmd/server
   ```

4. เปิดอีก Terminal เพื่อรัน Frontend:

   ```powershell
   cd frontend
   Copy-Item .env.example .env.local
   npm install
   npm start
   ```

5. สมัครสมาชิกตามปกติ หากต้องการบัญชี Admin ให้ผู้ดูแล PostgreSQL ปรับ role:

   ```sql
   UPDATE members SET role = 'admin' WHERE lower(email) = lower('อีเมลผู้ดูแล');
   ```

   จากนั้นออกจากระบบและเข้าสู่ระบบใหม่เพื่อรับ token ที่มี role ล่าสุด

## ฐานข้อมูลเดิมที่มีหลายเกม

อย่ารัน `schema.sql` ทับฐานข้อมูลเดิม. ใช้ Supabase SQL Editor รัน `database/migrations/003_vanguard_only.sql` หนึ่งครั้งหลังสำรองข้อมูลแล้ว. Migration เพิ่มข้อกำหนดให้ข้อมูลใหม่เป็น Vanguard, ขยาย `source_id` รองรับ ID ยาวของ PokéWallet และยังเก็บแถวการ์ด/เด็คเก่าไว้; หน้าเว็บ/API ปัจจุบันจะแสดงเฉพาะ Vanguard. หลัง seed สร้างครบแล้ว รัน `database/seed.sql` เพื่อเพิ่มการ์ด Vanguard ทั้งชุดข้อมูลที่ API ส่งให้.

## Environment variables

ดูชื่อค่าที่ต้องตั้งใน `backend/.env.example` และ `frontend/.env.example`. ค่าลับที่ต้องมีคือ `DATABASE_URL`, `JWT_SECRET` (อย่างน้อย 32 ตัวอักษร) และ `POKEWALLET_API_KEY`; อย่า commit หรือส่งค่าจริงลงแชต.

## Deploy

- Frontend: Vercel, Root Directory `frontend`; ตั้ง `REACT_APP_API_URL` เป็น URL backend ต่อท้าย `/api`.
- Backend: Render, Root Directory `backend`; Build Command `go build -o app ./cmd/server`; Start Command `./app`; ตั้ง `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` และ `POKEWALLET_API_KEY` ใน Environment.
- Database: Supabase PostgreSQL; รัน migration สำหรับฐานเดิมและนำ seed SQL ที่สร้างแล้วเข้า database.

## ขอบเขตและเครดิต

ขอบเขตเว็บมีคลังการ์ด ค้นหา/กรอง รายละเอียดการ์ด เด็คสาธารณะ ระบบสมาชิก เด็ค คอลเลกชัน และหน้า Admin. ไม่รวมฟีเจอร์คอมโบ ร้านค้า ราคา ทัวร์นาเมนต์ แชต หรือการชำระเงิน. เครดิตข้อมูลและรูป: [PokéWallet Cardfight!! Vanguard API](https://pokewallet.io/api-docs/cardfight-vanguard).

## Checklist เกณฑ์ประเมิน

- [x] โครงสร้าง Frontend React/Tailwind/Router และ Backend Go แยกชัด
- [x] Guest / Member / Admin และตรวจสิทธิ์ฝั่ง Backend ผ่าน JWT
- [x] Register, Login/Logout, Profile และเปลี่ยนรหัสผ่านด้วย bcrypt
- [x] Fetch → Go → PostgreSQL สำหรับรายการการ์ดและเด็ค พร้อม Loading / Empty / Error
- [x] สร้าง/แก้ไข/ลบเด็ค, เลือกการ์ดด้วยรูป, คอลเลกชัน และเด็คสาธารณะ
- [x] Seed script อ่าน API fields ตามเอกสาร PokéWallet; รูปผ่าน backend ที่เก็บ API key ไว้ฝั่ง server
- [ ] ต้องตั้ง PokéWallet API key, สร้าง seed SQL ครบทุกชุด และรัน migration/seed ใน Supabase ก่อนให้ข้อมูล Vanguard แสดงบนระบบจริง
- [ ] Build/deploy หลังเปลี่ยนเป็น Vanguard และทบทวนหน้าเว็บกับบัญชีจริง
