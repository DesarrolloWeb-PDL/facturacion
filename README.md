# Facturacion ARCA

Monorepo inicial para un sistema de facturacion electronica ARCA multi-emisor, multiplataforma y offline-first.

## Direccion de arquitectura

El modelo recomendado del producto es hibrido:

- apps/web para onboarding, administracion, consulta y soporte
- apps/desktop para operacion diaria local y modo offline
- apps/api para identidad, sincronizacion, auditoria e integracion central con ARCA en la primera etapa

La idea no es elegir entre web o local. La idea es que ambos clientes convivan sobre el mismo dominio compartido, con sincronizacion segura y sin duplicar la autoridad del sistema.

## Estructura

- apps/web: panel web y onboarding
- apps/api: API central y servicios fiscales
- apps/desktop: cliente desktop offline-first
- packages/domain: tipos y reglas de dominio compartidas
- packages/contracts: contratos de API y eventos de sync
- packages/db: esquema SQL y criterios de persistencia
- docs: decisiones de arquitectura y blueprint del producto

## Documentacion clave

- docs/blueprint-arca-facturacion.md: vision de producto y principios de arquitectura
- docs/monorepo-structure.md: reparto de responsabilidades del monorepo
- docs/hybrid-local-web-sync-architecture.md: arquitectura concreta para coexistencia local + web + sync
- docs/deployment-checklist.md: que falta para ejecutar y como desplegar web, API y base
- docs/vercel-railway-deploy.md: configuracion concreta de primer deploy en Vercel y Railway
- docs/arca-client-onboarding-manual.md: checklist para pedir datos y credenciales ARCA a cada cliente

## Criterio inicial

El repo arranca con estructura y esquema de datos antes de generar frameworks, para fijar limites de dominio y persistencia sin acoplarse a una implementacion accidental.

## Siguientes pasos recomendados

1. Definir contratos de sincronizacion en packages/contracts.
2. Implementar persistencia durable de comprobantes en apps/api.
3. Incorporar SQLite, outbox e inbox en apps/desktop.
4. Exponer estado de sincronizacion y consolidacion en web y desktop.
