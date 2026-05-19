# Estructura inicial del monorepo

## Objetivo

Definir una base de proyecto que permita evolucionar a una plataforma multi-emisor sin mezclar UI, integracion fiscal y dominio compartido.

## Carpetas raiz

### apps

- web: onboarding, administracion, reportes y soporte
- api: backend central, sync, autenticacion, auditoria e integracion ARCA
- desktop: cliente principal offline-first para operacion diaria

### Distribucion recomendada de responsabilidades

- apps/web concentra UX de portal, onboarding, configuracion y consulta remota
- apps/desktop concentra operacion local, SQLite, impresion y agente de sincronizacion
- apps/api concentra identidad, consolidacion, contratos de sync, trazabilidad e integracion central con ARCA en la primera etapa

### packages

- domain: entidades, enums, casos de uso puros y reglas fiscales compartidas
- contracts: DTOs, contratos de API, eventos de sincronizacion y validaciones compartidas
- db: SQL del modelo canonico y guias de persistencia

### Capas faltantes a incorporar de forma explicita

- contracts/sync para lotes de subida, acks y cambios remotos
- domain/vouchers para estados fiscales e inmutabilidad de CAE
- desktop infraestructura SQLite y outbox/inbox
- api rutas y servicios de sincronizacion

## Reglas de dependencia

- apps pueden depender de packages
- domain no depende de frameworks
- contracts no depende de UI ni de transporte especifico
- db define el modelo canonico y no debe mezclar detalles de presentacion

## Orden de implementacion

1. packages/domain
2. packages/contracts
3. packages/db
4. apps/api
5. apps/web
6. apps/desktop

## Decisiones

- Monorepo con pnpm workspaces
- TypeScript como lenguaje comun
- SQL canonico primero, ORM despues
- Desktop como cliente operativo principal
- Web como portal complementario de administracion y onboarding
- Backend central como coordinador de sync y auditoria
- Fiscalizacion centralizada primero; agente fiscal local despues si el producto lo justifica
