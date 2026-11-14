# Vanguard Vault

เว็บค้นหาการ์ดและจัดเด็ค Cardfight!! Vanguard

[เปิดเว็บบน Vercel](https://frontend-wheat-kappa-70.vercel.app/) · [Go API บน Render](https://card-vault-be-fe.onrender.com/api/health)

## รันในเครื่อง

1. ใช้ PostgreSQL บน Supabase ตั้งฐานข้อมูลใหม่ด้วย `database/schema.sql`, `database/seed.sql` และ `database/card-attributes.sql` ตามลำดับ ถ้ามีฐานข้อมูลอยู่แล้วให้ใช้ไฟล์ใน `database/migrations/` เฉพาะรายการที่ยังไม่ได้รัน
2. เปิด Terminal ใน `backend` ตั้ง `DATABASE_URL`, `JWT_SECRET` และ `FRONTEND_ORIGIN` ตาม `backend/.env.example` แล้วรัน `go run ./cmd/server` ใช้ Session pooler ของ Supabase และ JWT secret แบบสุ่มอย่างน้อย 32 ตัวอักษร
3. เปิดอีก Terminal ใน `frontend` แล้วรัน `npm ci` และ `npm start` จากนั้นเปิด `http://localhost:3000` ถ้า Go ใช้พอร์ตอื่นให้ตั้ง `REACT_APP_API_URL` ตาม `frontend/.env.example`
4. รันเทสต์ React จาก `frontend` ด้วย `npm test -- --watchAll=false`

## Deploy

- Render เชื่อม repo สาขา `main` ใช้ Root Directory `backend`, Build Command `go build -o app ./cmd/server` และ Start Command `./app` ตั้ง Environment ตามไฟล์ตัวอย่าง โดยใช้โดเมน Vercel เป็น `FRONTEND_ORIGIN`
- Vercel ใช้ Root Directory `frontend` และตั้ง `REACT_APP_API_URL` เป็น URL ของ Render ที่ลงท้ายด้วย `/api`

ข้อมูลการ์ดมาจาก [Open TCG API](https://openapi.tcgtracking.com/tcgapi/) ดึงด้วย `node database/make-seed.mjs` จากโฟลเดอร์หลัก ส่วนการ์ดเก่าจาก PokéWallet ใช้ `POKEWALLET_API_KEY` บน Backend เพื่อโหลดรูป
