-- Tek seferlik veri düzeltmesi: RAVİZZA YBB adayının VKN'si.
--
-- Aday 15.11.2026'da yanlışlıkla 40000000043 ile girildi (DARDASON MOBİLYA'nın
-- VKN'si). Firma daha sonra "Yeni üretici" ile doğru VKN 40000000044 ile açıldı,
-- aday ise eski numarada kaldı; 20261116030000'deki eşleştirme onu DARDASON'a bağladı.
--
-- matched_org_id NULL'lanır; `leads_match_existing_org` (BEFORE UPDATE OF vkn_tc)
-- adayı yeni VKN'deki firmaya — RAVİZZA YBB — kendisi bağlar.
-- Boş ortamda (db reset) eşleşen satır olmadığından hiçbir şey yapmaz.

update public.leads
   set vkn_tc = '40000000044',
       matched_org_id = null
 where company_name = 'RAVİZZA YBB'
   and vkn_tc = '40000000043';
