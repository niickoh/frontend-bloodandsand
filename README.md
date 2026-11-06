# Blood & Sand

PWA de reservas para el gimnasio (Angular 21) + API en Go (`backend/`).

- **Invitados**: reservan y pagan una clase suelta sin cuenta (la primera es gratis).
- **Alumnos**: compran planes (requiere cuenta), reservan con sus clases, cancelan y ven su historial.
- **Coaches**: ven las clases que el admin les asignó y gestionan sus reservas (agregar, mover, asistencia, cancelar, eliminar).
- **Admin**: resumen de ventas y ocupación, usuarios y perfiles, planes de cada alumno, horario semanal, clases,
  reservas, pagos y reembolsos, disciplinas y planes, avisos push masivos.

## Desarrollo

```bash
# 1. API (ver backend/README.md)
cd backend && go run ./cmd/api -seed-demo

# 2. Front (proxy /api → localhost:8088 en proxy.conf.json)
npm install
npm start                    # http://localhost:4200
```

`.npmrc` trae `legacy-peer-deps` (npm 10 falla resolviendo peers de vitest).

| Perfil | Usuario de prueba | Contraseña |
|---|---|---|
| Admin | `ADMIN_EMAIL` del `.env` del backend | `ADMIN_PASSWORD` |
| Coach | `diego@bloodandsand.cl` (también camila@, tomas@, javiera@) | `demo1234` |
| Alumno | `alumno@bloodandsand.cl` | `demo1234` |

Pago de prueba: `4242 4242 4242 4242` aprueba, `4000 0000 0000 0002` rechaza. Webpay usa el ambiente de integración
de Transbank (en su formulario: tarjeta `4051 8856 0044 6623`, CVV `123`, RUT `11.111.111-1`, clave `123`).

## Estructura

```
src/app/
  core/
    api/            Api (HttpClient → promesas, errores tipados), interceptor de sesión (refresh automático en 401)
    auth/           AuthService (signals), guards authGuard / roleGuard / guestGuard
    services/       CatalogStore, BookingStore, PaymentService, NotificationService (Web Push), PwaService, toasts
    models.ts       tipos de la API
  layout/           header y barra inferior según el perfil
  shared/           formulario de pago, lista de planes, FormState, ui/ (modal, status, plate-meter, icon…)
  features/
    home  schedule  booking  plans  payment-result  auth  account  my-bookings  alerts
    staff/          roster compartido por coach y admin
    coach/          rutas lazy del coach
    admin/          rutas lazy del panel (no se precargan para alumnos)
```

Standalone, zoneless, `OnPush` y signals en todo. Cada página es lazy; `@defer` para lo que está bajo el pliegue de la home.
La sesión vive en cookies httpOnly emitidas por la API; el front nunca ve los tokens.

## PWA y notificaciones

| Plataforma | Requisito |
|---|---|
| Android (Chrome) | Navegador o instalada |
| PC (Chrome / Edge / Firefox) | Navegador o instalada |
| iPhone / iPad | iOS 16.4+, **solo con la app añadida a la pantalla de inicio** desde Safari |

Al activar avisos, el dispositivo se registra en la API (`/api/push/subscriptions`) ligado a la cuenta o al correo del
invitado. El servidor envía: confirmación de reserva y de pago, recordatorio 2 h antes, cambios o cancelaciones hechos
por el gimnasio, y los avisos que mande el admin. El service worker solo corre en build de producción (`npm run build`).

## Producción

`npm run build` → `dist/blood-and-sand/browser`, servido por nginx en el mismo dominio que la API (ver `backend/deploy/nginx.conf`).

## Imágenes

`public/img` se generó a partir de las piezas de marca (recortes en blanco y negro, logo e isotipo). Reemplázalas por
las fotos originales en alta cuando las tengas, con los mismos nombres.

## Activar y desactivar funcionalidades (sin rebuild)

Todo se controla desde `public/config/config.json`, que queda tal cual en `dist/.../browser/config/config.json`.
Edita ese archivo en el servidor y recarga la página: la app lo lee al iniciar, sin caché (si no hay conexión usa la última copia leída).
Si falta una clave, queda activa con su valor por defecto (`src/app/core/config/app-config.ts`).

| Clave | Qué hace al desactivarla (`false`) |
| --- | --- |
| `mantenimiento.activo` (`true` lo enciende) | Muestra «Volvemos pronto» con `mensaje` a todos menos al admin, que puede ingresar desde «Acceso del equipo». |
| `tema.modoClaro` | Quita el botón sol/luna y la sección Apariencia; todos ven modo oscuro. |
| `tema.porDefecto` | `"sistema"`, `"oscuro"` o `"claro"`: tema de quien nunca eligió uno. |
| `barraOferta.activo` / `texto` | Oculta la barra roja superior o cambia su texto. |
| `cuentas.registro` | Oculta «Crear cuenta» (solo ingresan cuentas existentes). |
| `cuentas.reservaSinCuenta` | Para reservar hay que ingresar primero. |
| `reservas.activo` | Quita «Reservar» de menús e inicio; `/reservar` redirige al horario. |
| `reservas.cancelar` | Los alumnos ya no pueden cancelar desde Mis reservas. |
| `reservas.agregarCalendario` | Oculta «Añadir a mi calendario». |
| `horario` | Oculta y bloquea `/horario`. |
| `planes.activo` | Oculta y bloquea `/planes` y la sección de planes del inicio. |
| `planes.comprar` | Los planes se muestran pero no se pueden comprar. |
| `pagos.simulado` / `webpay` / `mercadopago` | Oculta ese medio de pago (además debe estar habilitado en el backend con `PAYMENT_PROVIDERS`). |
| `notificaciones` | Oculta los avisos push. |
| `instalarApp` | Oculta la ayuda para instalar la app. |
| `inicio.*` | Oculta cada sección del inicio: `garantias`, `proximasClases`, `disciplinas`, `comoFunciona`, `planes`, `ubicacion`, `preguntas`, `galeria`, `bannerFinal`. |
| `coach` | Oculta y bloquea el área de coach. |
| `admin.*` | Oculta y bloquea cada sección del panel: `resumen`, `clases`, `reservas`, `horario`, `usuarios`, `pagos`, `catalogo`, `avisos`. |

> Estos switches ocultan y bloquean pantallas en el front. Las reglas de negocio que deben ser estrictas (precios, primera clase gratis, medios de pago) siguen las decide el backend con su `.env`.
