# Arquitectura Hibrida Local + Web + Sync

## Objetivo

Definir un modelo operativo donde la plataforma pueda funcionar como SaaS web y como cliente local offline-first al mismo tiempo, sin duplicar la autoridad del sistema ni mezclar responsabilidades fiscales, comerciales y de sincronizacion.

## Decision principal

La solucion se organiza en tres piezas:

- apps/web como portal web de administracion, onboarding, consulta y soporte
- apps/desktop como cliente operativo local con persistencia SQLite y capacidades offline
- apps/api como backend central para identidad, sincronizacion, auditoria y consolidacion

La aplicacion web y la aplicacion desktop conviven. No son productos distintos. Son dos clientes del mismo dominio compartido.

## Tesis de arquitectura

No conviene tener dos backends dueños de la verdad.

El modelo recomendado es:

- verdad local para operacion transitoria del dispositivo
- verdad central para consolidacion, auditoria y coordinacion multiusuario
- verdad fiscal inmutable cuando ARCA ya autorizo el comprobante

Eso implica que un comprobante puede nacer localmente como borrador o pendiente, pero una vez autorizado con CAE queda congelado y su estado debe sincronizarse sin reinterpretaciones.

## Responsabilidad por aplicacion

### apps/web

Responsabilidades principales:

- onboarding del emisor
- administracion de usuarios y membresias
- configuracion fiscal y comercial
- consulta de clientes, comprobantes y reportes
- seguimiento de estados de sincronizacion
- soporte operativo cuando no se necesita hardware local

No deberia depender de acceso directo a:

- impresoras fiscales o termicas locales
- almacenamiento seguro del sistema operativo
- archivos de certificados del equipo del cliente
- colas offline del dispositivo

### apps/desktop

Responsabilidades principales:

- operacion diaria de caja y emision
- persistencia local SQLite
- outbox de eventos para sincronizacion
- impresion local y acceso a hardware
- cache operativa para trabajar sin conectividad
- resguardo local de certificados si el producto va por esa variante

Desktop contiene el agente local. No hace falta un cuarto producto separado para eso en el MVP.

Ese agente local debe cubrir:

- scheduler de sync
- retries con backoff
- resolucion de estados pendientes
- subida de comprobantes, clientes y cambios locales
- recepcion de decisiones del backend central

### apps/api

Responsabilidades principales:

- autenticacion y autorizacion
- organizaciones y membresias
- contratos de sincronizacion
- auditoria y trazabilidad
- consolidacion en PostgreSQL
- integracion con ARCA cuando la estrategia fiscal sea centralizada
- coordinacion de conflictos y deduplicacion

## Dos estrategias fiscales posibles

### Opcion A - Fiscal centralizada

El desktop y la web solicitan autorizacion fiscal al backend central.

Ventajas:

- control operativo central
- auditoria mas simple
- una sola integracion ARCA
- menos dispersion de secretos y configuracion

Costos:

- peor autonomia offline real
- mas sensible a conectividad en el momento de emitir
- exige custodiar certificados en infraestructura central

### Opcion B - Agente fiscal local

El desktop autoriza localmente y luego sincroniza el resultado al backend central.

Ventajas:

- mejor resiliencia operativa
- mejor integracion con hardware y archivos locales
- certificados pueden quedar bajo control del cliente

Costos:

- mayor complejidad de sincronizacion
- mas cuidado con estados ambiguos y deduplicacion
- observabilidad distribuida

## Recomendacion para este repo

Adoptar una estrategia hibrida por etapas:

1. Web como portal SaaS y administracion
2. API central como autoridad de identidad, sync y auditoria
3. Desktop como cliente operativo local
4. Emision WSFEv1 inicialmente centralizada para homologacion
5. Evaluar agente fiscal local como segunda etapa si el negocio exige offline fuerte o custodia local de certificados

Este enfoque evita meter complejidad maxima en el arranque, pero no bloquea el camino hacia un modelo local mas fuerte.

## Modelo de datos operativo

### Estado local del dispositivo

Persistir en SQLite al menos:

- organizations_cache
- clients
- vouchers
- voucher_items
- outbox_events
- inbox_events
- sync_cursor
- device_settings

### Estado central

Persistir en PostgreSQL al menos:

- organizations
- organization_memberships
- users
- devices
- clients
- vouchers
- voucher_status_history
- sync_batches
- audit_logs

## Contrato de sincronizacion

Sincronizar por eventos y snapshots chicos, no por reemplazo bruto de tablas.

El flujo minimo recomendado es:

1. Desktop guarda el cambio local
2. El cambio genera un evento en outbox
3. El agente local envia lote a apps/api
4. apps/api persiste el cambio y responde con ack + cambios remotos
5. Desktop aplica cambios remotos en inbox
6. El cursor de sync avanza solo si el lote quedo confirmado

## Reglas de estado para comprobantes

Estados minimos:

- draft
- pending_authorization
- authorizing
- authorized
- rejected
- sync_pending
- synced

Reglas:

- draft es editable
- pending_authorization todavia no es comprobante fiscal valido
- authorized con CAE es inmutable
- rejected conserva evidencia del intento y el error fiscal
- synced no cambia semantica fiscal; solo indica que el backend central ya conoce el evento

## Numeracion fiscal

La numeracion no debe inventarse libremente offline.

Regla recomendada:

- mientras no haya CAE, usar localId y numeracion visual provisoria si hace falta UX
- el numero fiscal definitivo se confirma al autorizar
- si en el futuro se soporta CAEA, se habilita un modo especial con rangos controlados por dispositivo

## Ubicacion de capacidades en el monorepo

### apps/api

- src/routes/auth.ts
- src/routes/onboarding.ts
- src/routes/organizations.ts
- src/routes/vouchers.ts
- futuro: src/routes/sync.ts
- futuro: src/services/sync-service.ts

### apps/desktop

- shell Tauri o runtime local
- infraestructura SQLite
- modulo de sync agent
- modulo de impresion
- modulo de almacenamiento seguro local

### apps/web

- onboarding y panel administrativo
- vistas de consulta y reportes
- estado de salud del dispositivo y sync cuando aplique

### packages/contracts

- DTOs de auth, onboarding, organizations y vouchers
- futuro: contratos de sync batch, ack e inbox

### packages/domain

- reglas de estado de comprobantes
- reglas de inmutabilidad fiscal
- value objects de emisor, punto de venta y dispositivo

## Secuencia recomendada de implementacion

1. Mantener WSFEv1 centralizado para homologacion y aprendizaje del flujo fiscal
2. Diseñar contratos de sincronizacion en packages/contracts
3. Incorporar repositorio durable de vouchers en apps/api
4. Definir almacenamiento SQLite en apps/desktop
5. Implementar outbox e inbox con resolucion de cursores
6. Exponer estado de sync en web y desktop
7. Recién despues evaluar fiscal local con certificados protegidos por sistema operativo

## Criterios de exito

- la web puede administrar sin depender del puesto operativo
- el desktop puede seguir trabajando ante cortes de conectividad
- el backend central conserva trazabilidad completa
- un comprobante autorizado no puede divergir entre clientes
- la arquitectura permite crecer a multi-dispositivo por emisor