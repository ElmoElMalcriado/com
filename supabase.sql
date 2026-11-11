-- =====================================================================
--  El Nero · Base de datos (Supabase)
--  Pega TODO esto en Supabase > SQL Editor > New query > Run
--  ANTES de ejecutar: cambia TU_CORREO_ADMIN por el correo del admin
--  (el mismo que pondrás en adminEmail dentro de index.html).
--  Si cambias el precio o la cantidad de números, cámbialos también
--  en v_price / v_total de la función _make_order (y en CFG del index.html).
-- =====================================================================

create table if not exists public.orders(
  code       text primary key,
  name       text not null,
  phone      text not null default '',
  dni        text not null default '',
  numbers    int[] not null,
  total      int not null,
  method     text not null default '',
  proof      text not null default '',
  status     text not null default 'pendiente' check (status in ('pendiente','aprobado','rechazado')),
  created_at timestamptz not null default now()
);

create table if not exists public.winners(
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  number     text not null,
  photo      text not null,
  created_at timestamptz not null default now()
);

alter table public.orders  enable row level security;
alter table public.winners enable row level security;
revoke all on public.orders from anon;

-- ¿Quien consulta es el administrador?
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select lower(coalesce(auth.jwt()->>'email','')) = lower('TU_CORREO_ADMIN')
$$;

-- Políticas: el admin hace todo; el público solo ve ganadores
drop policy if exists "admin orders"        on public.orders;
drop policy if exists "winners public read" on public.winners;
drop policy if exists "winners admin write" on public.winners;
create policy "admin orders"        on public.orders  for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "winners public read" on public.winners for select to anon, authenticated using (true);
create policy "winners admin write" on public.winners for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Crea un pedido validando todo en el servidor (uso interno)
create or replace function public._make_order(
  p_name text, p_phone text, p_dni text, p_numbers int[], p_method text, p_proof text,
  p_status text, p_need_proof boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_price constant int := 5;      -- precio por número (igual que CFG.price)
  v_total constant int := 6000;   -- cantidad de números (igual que CFG.total)
  v_nums  int[];
  v_code  text;
  v_dni   text := regexp_replace(coalesce(p_dni,''), '\D', '', 'g');
  v_phone text := btrim(coalesce(p_phone,''));
  v_proof text := coalesce(p_proof,'');
begin
  select coalesce(array_agg(distinct t.n order by t.n), '{}') into v_nums
  from unnest(coalesce(p_numbers,'{}')) as t(n);

  if length(btrim(coalesce(p_name,''))) < 3
     or cardinality(v_nums) = 0 or cardinality(v_nums) > 500
     or v_nums[1] < 1 or v_nums[cardinality(v_nums)] > v_total
     or (v_dni <> '' and length(v_dni) <> 8) then
    raise exception 'invalid';
  end if;

  if p_need_proof and (length(regexp_replace(v_phone,'\D','','g')) < 9
     or v_proof !~ '^data:image/(jpeg|png|webp);base64,') then
    raise exception 'invalid';
  end if;
  if v_proof <> '' and (v_proof !~ '^data:image/(jpeg|png|webp);base64,' or length(v_proof) > 3000000) then
    raise exception 'invalid';
  end if;

  perform pg_advisory_xact_lock(777);   -- evita que dos personas compren el mismo número a la vez
  if exists(select 1 from public.orders where status <> 'rechazado' and numbers && v_nums) then
    raise exception 'taken';
  end if;

  loop
    v_code := 'T' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists(select 1 from public.orders where code = v_code);
  end loop;

  insert into public.orders(code,name,phone,dni,numbers,total,method,proof,status)
  values (v_code, btrim(p_name), v_phone, v_dni, v_nums, cardinality(v_nums)*v_price,
          left(coalesce(p_method,''),20), v_proof, p_status);
  return v_code;
end $$;

-- Compra desde la web (cualquier visitante)
create or replace function public.create_order(
  p_name text, p_phone text, p_dni text, p_numbers int[], p_method text, p_proof text)
returns text language sql security definer set search_path = public as $$
  select public._make_order(p_name,p_phone,p_dni,p_numbers,p_method,p_proof,'pendiente',true)
$$;

-- Venta manual (solo admin)
create or replace function public.admin_manual_order(
  p_name text, p_phone text, p_dni text, p_numbers int[], p_method text, p_proof text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'auth'; end if;
  return public._make_order(p_name,p_phone,p_dni,p_numbers,p_method,p_proof,'aprobado',false);
end $$;

-- Números ocupados (público, sin datos personales)
create or replace function public.get_taken()
returns int[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct t.n), '{}')
  from public.orders o, unnest(o.numbers) as t(n)
  where o.status <> 'rechazado'
$$;

-- Consultar un ticket por código o celular (público)
create or replace function public.lookup_order(q text)
returns table(code text, status text, numbers int[], total int)
language sql stable security definer set search_path = public as $$
  select o.code, o.status, o.numbers, o.total
  from public.orders o
  where o.code = upper(btrim(q))
     or (length(regexp_replace(q,'\D','','g')) >= 9
         and right(regexp_replace(o.phone,'\D','','g'),9) = right(regexp_replace(q,'\D','','g'),9))
$$;

-- Permisos de las funciones
revoke all on function public._make_order(text,text,text,int[],text,text,text,boolean) from public, anon, authenticated;
revoke all on function public.admin_manual_order(text,text,text,int[],text,text) from public, anon;
grant execute on function public.admin_manual_order(text,text,text,int[],text,text) to authenticated;
grant execute on function public.create_order(text,text,text,int[],text,text) to anon, authenticated;
grant execute on function public.get_taken()        to anon, authenticated;
grant execute on function public.lookup_order(text) to anon, authenticated;
