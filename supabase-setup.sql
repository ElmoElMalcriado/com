-- =====================================================
--  EL NERO · Configuración de base de datos (Supabase)
--  Pega TODO este archivo en: Supabase > SQL Editor > Run
--  Antes de ejecutar, cambia la contraseña y el precio (líneas marcadas).
-- =====================================================

create extension if not exists pgcrypto;

-- Configuración privada (nadie puede leerla desde la web)
create table if not exists config (key text primary key, value text not null);
insert into config (key, value) values
  ('admin_password', 'CAMBIA_ESTA_CLAVE'),   -- <<< CAMBIA: contraseña del panel de administrador
  ('price',          '5')                    -- <<< CAMBIA: precio de cada ticket en soles
on conflict (key) do nothing;

-- Pedidos
create table if not exists orders (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  name       text not null,
  phone      text not null,
  dni        text,
  numbers    int[] not null,
  total      numeric not null default 0,
  method     text,
  proof_url  text,
  status     text not null default 'pendiente' check (status in ('pendiente','aprobado','rechazado')),
  created_at timestamptz not null default now()
);

-- Números vendidos (la clave primaria impide vender un número dos veces)
create table if not exists tickets (
  number   int primary key check (number between 1 and 6000),
  order_id uuid not null references orders(id) on delete cascade
);

-- Ganadores
create table if not exists winners (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  number     int,
  photo_url  text,
  created_at timestamptz not null default now()
);

-- Seguridad: nadie accede a las tablas directamente, solo por las funciones de abajo
alter table config  enable row level security;
alter table orders  enable row level security;
alter table tickets enable row level security;
alter table winners enable row level security;
drop policy if exists "ver ganadores" on winners;
create policy "ver ganadores" on winners for select to anon using (true);

-- ---------- Funciones públicas ----------

-- Números ya vendidos + precio
create or replace function get_info() returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'taken', coalesce((select array_agg(number order by number) from tickets), '{}'::int[]),
    'price', (select value::numeric from config where key = 'price')
  );
$$;

-- Crear pedido (máx. 5 números). Si un número ya se vendió, falla con error 23505.
create or replace function create_order(
  p_name text, p_phone text, p_dni text, p_numbers int[], p_method text, p_proof text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := gen_random_uuid();
  v_code text := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  v_price numeric;
begin
  if p_numbers is null or array_length(p_numbers, 1) is null or array_length(p_numbers, 1) > 5 then
    raise exception 'CANTIDAD_INVALIDA';
  end if;
  if exists (select 1 from unnest(p_numbers) n where n < 1 or n > 6000) then
    raise exception 'NUMERO_INVALIDO';
  end if;
  if length(coalesce(p_name, '')) < 3 or p_phone !~ '^[0-9]{9}$' or p_dni !~ '^[0-9]{8}$' then
    raise exception 'DATOS_INVALIDOS';
  end if;
  select value::numeric into v_price from config where key = 'price';
  insert into orders (id, code, name, phone, dni, numbers, total, method, proof_url)
    values (v_id, v_code, trim(p_name), p_phone, p_dni, p_numbers,
            v_price * array_length(p_numbers, 1), p_method, p_proof);
  insert into tickets (number, order_id) select unnest(p_numbers), v_id;
  return v_code;
end $$;

-- Consultar por celular o DNI
create or replace function consult(p_q text) returns json
language plpgsql security definer set search_path = public as $$
declare q text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g');
begin
  if length(q) < 8 then return '[]'::json; end if;
  return coalesce((
    select json_agg(json_build_object(
      'code', code, 'name', name, 'numbers', numbers,
      'status', status, 'total', total, 'created_at', created_at) order by created_at desc)
    from orders where phone = q or dni = q
  ), '[]'::json);
end $$;

-- ---------- Funciones del administrador (piden la contraseña) ----------

create or replace function _chk(p_pw text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_pw is distinct from (select value from config where key = 'admin_password') then
    raise exception 'PASSWORD_INCORRECTA';
  end if;
end $$;

create or replace function admin_list(p_pw text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform _chk(p_pw);
  return coalesce((select json_agg(to_json(o) order by o.created_at desc) from orders o), '[]'::json);
end $$;

create or replace function admin_set_status(p_pw text, p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _chk(p_pw);
  if p_status not in ('aprobado', 'rechazado') then raise exception 'ESTADO_INVALIDO'; end if;
  update orders set status = p_status where id = p_id and status <> 'rechazado';
  if p_status = 'rechazado' then delete from tickets where order_id = p_id; end if;  -- libera los números
end $$;

create or replace function admin_delete(p_pw text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _chk(p_pw);
  delete from orders where id = p_id;  -- borra también sus tickets
end $$;

create or replace function admin_manual_sale(
  p_pw text, p_name text, p_phone text, p_dni text, p_numbers int[], p_proof text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := gen_random_uuid();
  v_code text := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  v_price numeric;
begin
  perform _chk(p_pw);
  select value::numeric into v_price from config where key = 'price';
  insert into orders (id, code, name, phone, dni, numbers, total, method, proof_url, status)
    values (v_id, v_code, trim(p_name), p_phone, nullif(p_dni, ''), p_numbers,
            v_price * array_length(p_numbers, 1), 'manual', p_proof, 'aprobado');
  insert into tickets (number, order_id) select unnest(p_numbers), v_id;
  return v_code;
end $$;

create or replace function admin_add_winner(p_pw text, p_name text, p_number int, p_photo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _chk(p_pw);
  insert into winners (name, number, photo_url) values (trim(p_name), p_number, p_photo);
end $$;

-- ---------- Almacenamiento de fotos (comprobantes y ganadores) ----------
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', true)
on conflict (id) do nothing;
drop policy if exists "subir fotos" on storage.objects;
create policy "subir fotos" on storage.objects for insert to anon with check (bucket_id = 'proofs');
