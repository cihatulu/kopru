-- system_logs partition bakımı: eksik ayları aç, gece görevi kur, 90 gün retention.
--
-- BULGU (15 Kasım 2026): `ensure_log_partition()` yalnız ilk migration'da iki kez
-- (Ağustos + Eylül) çağrılmış, düzenli çağıran bir görev HİÇ kurulmamıştı
-- (pg_cron eklentisi kapalıydı). 1 Ekim'den beri system_logs'a yazan her RPC
-- "no partition of relation system_logs found for row" ile düşüyor ve tüm
-- işlemi geri alıyordu — örn. `add_counterparty` (misafir karşı taraf açma,
-- iki yönde de) ve `downgrade_org_to_guest`.
--
-- PLAN §17 / kilitli kural 17: aylık partition + 90 gün retention; eski
-- partition DELETE ile değil DROP ile atılır.

-- 1) Eksik ayları hemen aç (Ekim 2026 → Mart 2027). Fonksiyon idempotent.
do $$
declare
  v_month date;
begin
  for v_month in
    select generate_series(date '2026-10-01', date '2027-03-01', interval '1 month')::date
  loop
    perform public.ensure_log_partition(v_month);
  end loop;
end;
$$;

-- 2) 90 günden eski ay partition'larını at.
create or replace function public.drop_old_log_partitions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_end  date;
begin
  for v_name in
    select c.relname
      from pg_inherits i
      join pg_class c on c.oid = i.inhrelid
     where i.inhparent = 'public.system_logs'::regclass
       and c.relname ~ '^system_logs_[0-9]{6}$'
  loop
    -- Partition'ın üst sınırı = adındaki ayın bir sonraki ayı.
    v_end := (to_date(right(v_name, 6), 'YYYYMM') + interval '1 month')::date;
    if v_end <= current_date - 90 then
      execute format('drop table public.%I', v_name);
    end if;
  end loop;
end;
$$;

-- 3) Gece bakım: bu ay + 3 ay ileri partition, sonra retention.
--    3 aylık tampon, görev birkaç gün aksasa da yazımları korur.
create or replace function public.maintain_log_partitions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i int;
begin
  for v_i in 0..3 loop
    perform public.ensure_log_partition((current_date + make_interval(months => v_i))::date);
  end loop;
  perform public.drop_old_log_partitions();
end;
$$;

-- Bakım fonksiyonları tablo açıp siler: istemci rollerine ASLA açık olmamalı.
-- (SECURITY DEFINER + varsayılan PUBLIC execute = anon tablo DROP edebilirdi.)
revoke all on function public.ensure_log_partition(date)  from public, anon, authenticated;
revoke all on function public.drop_old_log_partitions()   from public, anon, authenticated;
revoke all on function public.maintain_log_partitions()   from public, anon, authenticated;

-- 4) Zamanlama. Aynı adla cron.schedule mevcut görevi günceller (idempotent).
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'maintain-log-partitions',
  '15 3 * * *',
  $$select public.maintain_log_partitions()$$
);

notify pgrst, 'reload schema';
