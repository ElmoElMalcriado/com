# El Nero · Sorteo de moto

Página estática (`index.html`) conectada a una base de datos **Supabase** (gratis).

## Puesta en marcha

1. Crea un proyecto en https://supabase.com
2. **SQL Editor** → pega `supabase.sql` (cambia `TU_CORREO_ADMIN` por tu correo) → **Run**.
3. **Authentication → Users → Add user**: tu correo + una contraseña (marca *Auto confirm*).
   Luego en **Authentication → Sign In / Providers** desactiva *Allow new users to sign up*.
4. **Project Settings → API**: copia *Project URL* y la clave *anon public*.
5. En `index.html`, bloque `CONFIGURA AQUÍ`, rellena `supabaseUrl`, `supabaseKey` y `adminEmail`
   (más `whatsapp`, `social`, `methods`, `drawDate`…).
6. Sube todo a GitHub (`index.html`, `img/bajaj-ns200r2.png`, etc.) y activa **Settings → Pages**.

## Panel de administrador
Pie de página → **Administrador** → escribe la contraseña del paso 3.
Aprobar / rechazar pendientes, y **Eliminar** tickets aprobados o rechazados (libera los números).

> La clave `anon` es pública por diseño; los datos están protegidos por las políticas RLS de `supabase.sql`.
