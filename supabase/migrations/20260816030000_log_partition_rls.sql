-- system_logs partition'larında RLS ve yetki kapatılır.
--
-- BULGU: ana tabloda RLS açıktı ama `ensure_log_partition()` yeni partition'ı
-- çıplak oluşturuyordu. Postgres RLS'i partition'a MİRAS BIRAKMAZ; ayrıca
-- Supabase'in varsayılan yetkileri `anon` ve `authenticated` rollerine public
-- şemadaki her yeni tabloda SELECT veriyor. Sonuç: `system_logs_202608` gibi
-- her partition, TÜM kiracıların log satırlarını korumasız taşıyordu.
--
-- Şu an sömürülebilir değil (PostgREST partition'ları şema önbelleğine almıyor,
-- doğrudan istek PGRST205 dönüyor) ama yetki tablonun üzerinde duruyordu ve
-- fonksiyon her ay yeni bir tane üretiyordu.
--
-- Partition'a doğrudan erişim kapatılınca ana tablo üzerinden okuma bozulmaz:
-- partition'lı tabloda yetki ve politika YALNIZ ana tabloda değerlendirilir.

do $$
declare
  v_name text;
begin
  for v_name in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_inherits i on i.inhrelid = c.oid
     where n.nspname = 'public'
       and i.inhparent = 'public.system_logs'::regclass
  loop
    execute format('alter table public.%I enable row level security', v_name);
    execute format('revoke all on public.%I from anon, authenticated', v_name);
  end loop;
end;
$$;

-- Aynı işi bundan sonraki her partition için fonksiyon kendisi yapar.
drop function if exists public.ensure_log_partition(date);

create function public.ensure_log_partition(p_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name  text := format('system_logs_%s', to_char(v_start, 'YYYYMM'));
begin
  if to_regclass('public.' || v_name) is null then
    execute format(
      'create table public.%I partition of public.system_logs for values from (%L) to (%L)',
      v_name, v_start, v_end
    );
    -- Bu iki satır kalıcı: partition çıplak doğarsa aylık bir açık üretir.
    execute format('alter table public.%I enable row level security', v_name);
    execute format('revoke all on public.%I from anon, authenticated', v_name);
  end if;
end;
$$;

notify pgrst, 'reload schema';
