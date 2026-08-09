-- Ürün kodu (model) artık BENZERSİZ DEĞİL
--
-- YANLIŞ VARSAYIM: `unique (owner_org_id, code)` kısıtı, kodun bir ürünü tek
-- başına tanımladığını varsayıyordu. Mobilyada durum böyle değil — "Havana"
-- bir MODEL ADIDIR ve aynı model altında koltuk, sehpa, puf gibi birden çok
-- ürün olabilir. Kullanıcı ikinci ürünü eklerken 409 alıyordu.
--
-- Kaldırmak GÜVENLİ: kod hiçbir yerde arama/eşleştirme anahtarı olarak
-- kullanılmıyor. Ürünün kimliği `id`; sipariş satırları, set içerikleri, stok
-- ve maliyet kayıtlarının hepsi `product_id` üzerinden bağlı.
--
-- Kod yine ZORUNLU kalıyor (save_product boş kodu reddeder): listede
-- "Model: …" olarak gösteriliyor ve aramada kullanılıyor.
alter table public.products drop constraint if exists products_owner_code_key;

-- Arama ve listeleme için index KALIYOR, yalnız benzersizlik gitti.
create index if not exists products_owner_code_idx
  on public.products (owner_org_id, code);
