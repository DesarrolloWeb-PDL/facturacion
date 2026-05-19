# Blueprint Inicial - Sistema de Facturacion Electronica ARCA

## Objetivo del producto

Construir una aplicacion de facturacion electronica profesional, multiplataforma y offline-first que pueda ser utilizada por cualquier contribuyente argentino con una configuracion propia de emisor, sin datos fiscales hardcodeados y sin dependencia de una implementacion exclusiva para un solo cliente.

El producto debe permitir:

- operar localmente en desktop y luego sincronizar
- emitir comprobantes fiscales integrados con ARCA
- soportar multiples emisores bajo una misma plataforma comercial
- mantener seguridad fuerte sobre certificados y datos fiscales
- crecer desde un MVP homologado hasta un producto comercial reusable

## Tesis de arquitectura

La aplicacion debe ser multi-emisor, no mono-cliente.

Cada empresa usuaria configura su propia identidad fiscal:

- CUIT
- razon social
- condicion frente al IVA
- ingresos brutos
- inicio de actividades
- puntos de venta
- certificados para WSAA/WSFEv1

La plataforma es comun para todos los clientes, pero la identidad fiscal, la numeracion, los comprobantes y los certificados pertenecen a cada emisor.

## Decision de producto

No almacenar Clave Fiscal dentro de la aplicacion.

La Clave Fiscal se utiliza unicamente en el portal oficial de ARCA para:

- gestionar relaciones
- emitir certificados
- asociar web services

La aplicacion opera luego con certificados digitales y configuracion propia del emisor.

## Arquitectura objetivo

### Modelo de despliegue recomendado

- apps/web como portal SaaS para onboarding, administracion, consulta y soporte
- apps/desktop como cliente operativo local con SQLite, impresion y modo offline
- apps/api como backend central para identidad, sincronizacion, auditoria y consolidacion

La web y desktop deben convivir sobre el mismo dominio de negocio. No son variantes excluyentes del producto.

### Modelo de verdad

- verdad local para operacion transitoria del dispositivo
- verdad central para consolidacion y coordinacion multiusuario
- verdad fiscal inmutable cuando ARCA ya autorizo el comprobante

En la practica, eso significa que un comprobante puede nacer localmente como borrador o pendiente, pero una vez autorizado con CAE no puede editarse ni reinterpretarse durante la sincronizacion.

### Frontend y clientes

- Web: Next.js para administracion, onboarding, soporte y portal de gestion
- Desktop: Tauri + React para operacion diaria, punto de venta y trabajo offline
- Mobile: React Native en una etapa posterior para consulta, cobranza o emision acotada

### Backend

- API central en Node.js + TypeScript
- servicio fiscal desacoplado para WSAA y WSFEv1
- motor de sincronizacion con cola y reintentos
- servicio de documentos para PDF y almacenamiento
- servicio de auditoria y observabilidad

### Persistencia

- SQLite local por dispositivo para operacion offline-first
- PostgreSQL central para consolidacion, auditoria y sincronizacion
- almacenamiento de archivos para PDFs, logos y adjuntos

## Decision operativa recomendada para este repositorio

El camino sugerido para este monorepo es hibrido por etapas:

1. apps/web como portal de administracion y onboarding
2. apps/api como autoridad de identidad, sync y auditoria
3. apps/desktop como cliente de operacion diaria
4. WSFEv1 inicialmente centralizado para homologacion
5. evaluacion posterior de agente fiscal local solo si el negocio exige offline fuerte o custodia local de certificados

Esto baja el riesgo del MVP sin cerrar la puerta a una evolucion mas fuerte en desktop.

## Principios no negociables

1. Un comprobante con CAE asignado es inmutable.
2. Las correcciones se hacen mediante Nota de Credito o Debito.
3. La numeracion fiscal no se asigna libremente en offline salvo regimen CAEA.
4. La app puede seguir operando offline, pero no debe simular validez fiscal cuando no la tiene.
5. Toda integracion con ARCA debe dejar trazabilidad completa.

## Modulos del sistema

### 1. Onboarding fiscal

Asistente guiado para que cualquier contribuyente configure su empresa:

- datos del emisor
- condicion tributaria
- configuracion de puntos de venta
- carga de logo
- importacion de certificado y clave privada
- validacion de conectividad contra homologacion o produccion

### 2. Catalogo operativo

- clientes
- productos y servicios
- listas de precio
- impuestos por defecto
- condiciones de venta

### 3. Emision comercial y fiscal

- borradores
- comprobantes pendientes de autorizacion
- facturas A, B, C
- notas de credito y debito
- consulta y reimpresion

### 4. Integracion ARCA

- WSAA para Token y Sign
- WSFEv1 para CAE
- consultas de ultimos autorizados
- manejo de errores ambiguos
- soporte posterior para CAEA

### 5. Sincronizacion

- outbox local
- inbox local
- reintentos exponenciales
- reconciliacion de estados
- resolucion segura de duplicados

La sincronizacion debe mover eventos y acks, no reemplazos masivos de tablas. El dispositivo confirma avance de cursor solo cuando el lote fue persistido y reconocido por el backend central.

### 6. PDF y evidencia fiscal

- generacion de PDF fiscal
- QR reglamentario
- marca de agua de borrador cuando no tenga validez fiscal
- hash del PDF emitido

### 7. Auditoria

- log de cambios funcionales
- log de requests y responses a ARCA
- historial de estados del comprobante
- identificacion de usuario, dispositivo y timestamp

## Modelo operativo offline-first

### Escenario base del MVP

Si no hay conectividad:

- el usuario puede generar un comprobante local
- el comprobante queda en estado pendiente de autorizacion
- puede imprimirse solo como borrador o comprobante no fiscal
- al volver la conexion se intenta autorizar en ARCA
- al obtener CAE se genera el comprobante fiscal final

### Escenario avanzado

Implementar CAEA en una fase posterior para permitir contingencia fiscal offline legal, con bloques de numeracion y rendicion posterior.

## Seguridad de certificados

### Opcion A - centralizado en nube

- clave privada cifrada con una clave de datos por emisor
- clave de datos protegida por KMS
- acceso restringido al servicio fiscal
- mayor trazabilidad y rotacion centralizada

### Opcion B - protegido localmente

- Windows: DPAPI o Windows Certificate Store
- macOS: Keychain
- Linux: secret store equivalente
- Tauri como contenedor de acceso seguro

### Regla recomendada

- MVP comercial: backend centralizado con cifrado fuerte
- instalacion premium offline pesada: soporte futuro para almacenamiento local seguro

## Modelo multi-emisor

La entidad central del sistema no es el usuario sino el emisor fiscal.

Un usuario puede pertenecer a uno o mas emisores.
Cada emisor posee:

- configuracion fiscal propia
- puntos de venta propios
- certificados propios
- clientes propios
- numeracion propia
- comprobantes propios

## Roadmap de producto

### Fase 0 - Fundacion

- monorepo
- paquetes compartidos de dominio
- esquema inicial de base de datos
- autenticacion de usuarios y organizaciones
- layout inicial de app desktop y web

### Fase 1 - MVP homologacion

- onboarding de emisor
- carga de certificados
- integracion WSAA homologacion
- integracion WSFEv1 homologacion
- emision de Factura C y Nota de Credito C o el subconjunto inicial elegido
- PDF con CAE y QR
- auditoria minima

### Fase 2 - Offline-first serio

- cola local
- sincronizacion durable
- estados pendientes, authorizing, authorized, rejected
- reconciliacion post-timeout
- bloqueo de mutacion de comprobantes fiscales

### Fase 3 - Producto comercial

- multi-sucursal
- licenciamiento
- backups y restore
- panel web administrativo
- soporte a A y B completos
- padron y validaciones fiscales online

### Fase 4 - Contingencia avanzada

- regimen CAEA
- asignacion de rangos por dispositivo
- rendicion posterior
- monitoreo de vencimientos y bloques

## Riesgos principales

- subestimar la complejidad normativa de ARCA
- mezclar comprobante comercial con comprobante fiscal
- permitir numeracion offline sin control
- no registrar respuestas ambiguas de ARCA
- guardar certificados de forma insegura

## Criterio de arranque recomendado

Empezar por web + desktop + backend central, pero con foco operativo en desktop y homologacion ARCA centralizada en la primera etapa.

No intentar mobile completo ni CAEA en el primer corte.

## Siguiente entregable sugerido

El proximo paso tecnico debe ser definir:

- estructura del monorepo
- modulos de dominio
- modelo de datos inicial
- contratos API para onboarding, sync y fiscalizacion