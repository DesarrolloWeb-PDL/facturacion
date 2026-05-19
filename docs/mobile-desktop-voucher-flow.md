# Flujo Actual Movil -> Desktop Para Autorizacion De Comprobante

## Objetivo

Describir el flujo tecnico minimo que ya soporta el repo para que un dispositivo cree un comprobante pendiente y otro dispositivo lo tome para autorizacion sin colisionar.

## Flujo actual

1. Un dispositivo movil crea un comprobante local pendiente.
2. El movil sube ese cambio a la API por POST /sync/batch.
3. Otro dispositivo hace polling por POST /sync/batch aunque no tenga eventos locales.
4. La API devuelve remoteChanges con el comprobante pendiente.
5. El desktop intenta tomar el lock por POST /vouchers/claim-authorization.
6. Si otro dispositivo intenta tomar el mismo lock mientras esta vigente, recibe 409.
7. Cuando el desktop libera el lock por POST /vouchers/release-authorization, otro dispositivo puede retomarlo.

## Endpoints involucrados

- /sync/batch
- /vouchers/claim-authorization
- /vouchers/release-authorization

## Regla funcional

- pending_authorization significa que el comprobante existe como pendiente operativo
- authorizing significa que un dispositivo ya esta procesando su autorizacion
- mientras el lock este vigente, otro dispositivo no debe intentar autorizarlo
- el lock no reemplaza la inmutabilidad fiscal posterior; cuando exista CAE, el comprobante sigue siendo inmutable

## Estado actual de implementacion

- sync persiste en PostgreSQL si DATABASE_URL esta configurada
- sin base configurada, el flujo sigue disponible con repositorios en memoria
- el polling de cambios remotos ya permite events vacio, por lo que no hace falta enviar eventos dummy

## Proxima evolucion natural

- persistir el comprobante pendiente en tabla vouchers en vez de depender solo del evento de sync
- enlazar claim-authorization con la autorizacion WSFEv1 real
- registrar en auditoria quien tomo y libero el lock