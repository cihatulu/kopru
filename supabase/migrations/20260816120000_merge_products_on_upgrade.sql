-- KÖPRÜ — Misafir üretici üye olunca ürünler birleşir
--
-- Misafir üreticinin kataloğu perakendeci başına ayrılmıştı
-- (20260816110000). Üye olduğunda bu sınır kalkar: üretici artık kendi
-- kataloğunun tamamını görür. İki perakendeci aynı modeli girmişse tek
-- satıra iner.
--
-- EŞLEŞME: ürün adı BİREBİR aynı (yalnız baş/son boşluk temizlenir).
-- Harf duyarlıdır ve "Alanya Köşe" ile "Alanya Köşe Takımı" AYRI kalır.
-- Birleştirme geri alınamaz; yanlış birleştirmektense ayrı bırakıp
-- üreticinin Ürün Yönetimi'nde elle birleştirmesi güvenlidir. Türkçede
-- İ/i ve I/ı katlaması da ayrıca tuzaklıdır.
--
-- HAYATTA KALAN: en eski ürün (`created_at`, eşitlikte `id`). Fiyatı da
-- onunki kalır; grupta farklı fiyat varsa üreticiye uyarı bırakılır.
--
-- EN KRİTİK NOKTA
-- `order_items` ve `ssh_requests` ürüne `ON DELETE SET NULL` ile bağlı.
-- Kopya doğrudan silinseydi sipariş geçmişi ürün bağını SESSİZCE
-- kaybederdi. Bu yüzden bütün bağımlı kayıtlar silmeden ÖNCE hayatta
-- kalan satıra taşınır ve işin tamamı tek transaction'da döner.

-- ============================================================ 1. uyarı bayrağı
alter table public.products
  add column if not exists price_review_needed boolean not null default false;

comment on column public.products.price_review_needed is
  'Birleştirmede farklı satış fiyatları vardı; üretici kontrol etmeli.';

-- ============================================================ 2. birleştirme
create or replace function public.merge_duplicate_products(p_org_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kopya_sayisi integer := 0;
begin
  -- Kopya → hayatta kalan haritası. Ad birebir eşleşenler tek gruptur.
  create temp table _birlestirme on commit drop as
  with sirali as (
    select p.id,
           first_value(p.id) over (
             partition by btrim(p.name)
             order by p.created_at, p.id
           ) as kalan
      from public.products p
     where p.owner_org_id = p_org_id
  )
  select id as kopya, kalan from sirali where id <> kalan;

  select count(*) into v_kopya_sayisi from _birlestirme;

  if v_kopya_sayisi > 0 then
    -- Fiyat uyarısı: silmeden ÖNCE işaretlenir, sonra kopya kalmayacak.
    update public.products s
       set price_review_needed = true
     where s.owner_org_id = p_org_id
       and exists (
         select 1
           from _birlestirme m
           join public.products d on d.id = m.kopya
          where m.kalan = s.id
            and d.supplier_price is distinct from s.supplier_price
       );

    -- Set içeriği: silinecek kopyaya işaret eden satırlar çevrilir, yoksa
    -- set takımı olmayan bir ürüne işaret eder halde kalırdı.
    update public.products s
       set set_contents = y.yeni
      from (
        select p.id,
               jsonb_agg(
                 case when m.kalan is not null
                      then jsonb_set(satir.value, '{product_id}', to_jsonb(m.kalan::text))
                      else satir.value end
                 order by satir.sira
               ) as yeni
          from public.products p
          cross join lateral jsonb_array_elements(p.set_contents)
               with ordinality as satir(value, sira)
          left join _birlestirme m on m.kopya = (satir.value->>'product_id')::uuid
         where p.owner_org_id = p_org_id
           and p.type = 'set'
         group by p.id
        having bool_or(m.kalan is not null)
      ) y
     where s.id = y.id;

    -- SİPARİŞ GEÇMİŞİ ÖNCE TAŞINIR. `ON DELETE SET NULL` taşıdıkları için
    -- bu adım atlanırsa geçmiş ürün bağını kaybeder.
    update public.order_items oi
       set product_id = m.kalan
      from _birlestirme m
     where oi.product_id = m.kopya;

    update public.ssh_requests sr
       set product_id = m.kalan
      from _birlestirme m
     where sr.product_id = m.kopya;

    -- Perakendeci stoğu: aynı perakendecinin hem kopyada hem hayatta
    -- kalanda kaydı varsa adetler TOPLANIR (ikisi de onun malı).
    update public.retailer_stock k
       set quantity = k.quantity + t.toplam, updated_at = now()
      from (
        select m.kalan, rs.retailer_org_id, sum(rs.quantity) as toplam
          from public.retailer_stock rs
          join _birlestirme m on m.kopya = rs.product_id
         group by m.kalan, rs.retailer_org_id
      ) t
     where k.product_id = t.kalan and k.retailer_org_id = t.retailer_org_id;

    -- Hayatta kalanda kaydı OLMAYAN perakendecinin satırı taşınır.
    update public.retailer_stock rs
       set product_id = m.kalan
      from _birlestirme m
     where rs.product_id = m.kopya
       and not exists (
         select 1 from public.retailer_stock k
          where k.product_id = m.kalan and k.retailer_org_id = rs.retailer_org_id
       );

    -- Perakende satış fiyatı: her perakendecinin KENDİ fiyatıdır, toplanmaz.
    -- Hayatta kalanda fiyatı olmayan perakendecinin satırı taşınır.
    update public.retail_prices rp
       set product_id = m.kalan
      from _birlestirme m
     where rp.product_id = m.kopya
       and not exists (
         select 1 from public.retail_prices k
          where k.product_id = m.kalan and k.retailer_org_id = rp.retailer_org_id
       );

    -- Üretici stoğu: hepsi aynı org'a ait, birincil anahtar çakışır → toplanır.
    update public.manufacturer_stock k
       set quantity = k.quantity + t.toplam, updated_at = now()
      from (
        select m.kalan, sum(ms.quantity) as toplam
          from public.manufacturer_stock ms
          join _birlestirme m on m.kopya = ms.product_id
         group by m.kalan
      ) t
     where k.product_id = t.kalan and k.owner_org_id = p_org_id;

    update public.manufacturer_stock ms
       set product_id = m.kalan
      from _birlestirme m
     where ms.product_id = m.kopya
       and not exists (
         select 1 from public.manufacturer_stock k
          where k.product_id = m.kalan and k.owner_org_id = p_org_id
       );

    -- Maliyet: hayatta kalanın maliyeti yoksa kopyadan devralınır.
    update public.product_costs pc
       set product_id = m.kalan
      from _birlestirme m
     where pc.product_id = m.kopya
       and not exists (select 1 from public.product_costs k where k.product_id = m.kalan);

    -- Kopyalar silinir; geriye kalan bağımlı satırlar CASCADE ile gider.
    delete from public.products p using _birlestirme m where p.id = m.kopya;
  end if;

  -- Kapsam açılır: üretici artık kendi kataloğunun tamamını görür.
  update public.products
     set managed_by_retailer_org_id = null
   where owner_org_id = p_org_id
     and managed_by_retailer_org_id is not null;

  return v_kopya_sayisi;
end;
$$;

-- Yalnız `upgrade_org_to_subscriber` içinden çağrılır; doğrudan çağrılamaz.
revoke execute on function public.merge_duplicate_products(uuid) from public;
revoke execute on function public.merge_duplicate_products(uuid) from authenticated;


-- ============================================================ 3. üyelik onayı
-- Gövde 20260806120000 sürümünden ALINDI; tek ekleme birleştirme çağrısı.

create or replace function public.upgrade_org_to_subscriber(
  p_org_id uuid,
  p_plan public.plan_tier,
  p_subdomain text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_sub text := lower(btrim(coalesce(p_subdomain, '')));
  v_birlesen integer;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_org from public.organizations where id = p_org_id for update;
  if not found then
    raise exception 'ORG_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_org.is_subscriber then
    raise exception 'ALREADY_SUBSCRIBER' using errcode = '22023';
  end if;
  if v_sub = '' then
    raise exception 'SUBDOMAIN_REQUIRED' using errcode = '22023';
  end if;

  update public.organizations
     set is_subscriber = true,
         plan = p_plan,
         subdomain = v_sub,
         enabled_modules = public.default_modules_for_plan(p_plan)
   where id = p_org_id
  returning * into v_org;

  -- BURADA `relationships` TABLOSUNA HİÇBİR YAZMA YOKTUR VE OLMAMALIDIR.
  -- Yükselen org hem kendi panelinde çalışır hem eski sponsorunun müşterisi
  -- olarak kalır; sipariş geçmişi ve cari bakiyesi olduğu yerde durur.

  -- Misafirken perakendecilerin bu üretici adına girdiği ürünler artık
  -- üreticinin kendisine açılır ve mükerrerler teke iner. Yükseltme ile
  -- AYNI transaction'da olmak zorunda: yarım kalırsa üretici hem kendi
  -- kataloğunu göremez hem kopyalar durur.
  v_birlesen := public.merge_duplicate_products(p_org_id);

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), p_org_id, 'org.upgraded', 'organizations', p_org_id,
          jsonb_build_object('plan', p_plan, 'subdomain', v_sub,
                             'merged_products', v_birlesen));

  return v_org;
end;
$$;

notify pgrst, 'reload schema';
