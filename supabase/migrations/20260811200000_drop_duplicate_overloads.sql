-- KÖPRÜ — Drop old duplicate function overloads to prevent Postgres 42725 (function not unique) errors

drop function if exists public.save_product(uuid, text, text, numeric, numeric, uuid, text, text[], public.product_type, jsonb, jsonb, numeric, numeric, numeric, numeric, text);
drop function if exists public.save_product_group(uuid, text, integer);
drop function if exists public.delete_product_group(uuid);
drop function if exists public.delete_product_permanently(uuid);
drop function if exists public.assign_products_to_group(uuid[], uuid);
drop function if exists public.set_group_products(uuid, uuid[]);
drop function if exists public.set_product_active(uuid, boolean);

notify pgrst, 'reload schema';
