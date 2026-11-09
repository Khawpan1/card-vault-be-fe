-- TCGdex ให้ base URL ของรูป ต้องเติมรูปแบบ asset เพื่อให้ browser เปิดภาพได้
UPDATE cards
SET image_url = image_url || '/low.webp'
WHERE game = 'pokemon'
  AND image_url LIKE 'https://assets.tcgdex.net/%'
  AND image_url NOT LIKE '%/low.webp'
  AND image_url NOT LIKE '%/high.webp';
