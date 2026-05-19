import { readDemoAccount } from './demo-auth';

export const DEMO_CLIENTS_STORAGE_KEY = 'facturacion.demo.clients';
export const DEMO_EMITTER_STORAGE_KEY = 'facturacion.demo.emitter';
export const DEMO_VOUCHERS_STORAGE_KEY = 'facturacion.demo.vouchers';

export type DemoClient = {
  id: string;
  taxName: string;
  document: string;
  iva: string;
  email: string;
  city: string;
  status: 'Validado en padron' | 'Pendiente verificacion';
  updatedAt: string;
};

export type DemoEmitterCertificate = {
  alias: string;
  certificateFileName: string;
  privateKeyFileName: string;
  passphraseHint: string;
  status: 'Pendiente' | 'Validado';
  validatedAt: string | null;
  wsaaMessage: string;
};

export type DemoEmitterSettings = {
  environment: 'testing' | 'production';
  wsaaLastCheckAt: string | null;
  certificate: DemoEmitterCertificate;
};

export type DemoVoucherAuthorization = {
  cae: string;
  caeDueDate: string;
  qrPayloadUrl: string;
  qrLabel: string;
  source: 'demo' | 'wsfev1';
};

export type DemoVoucher = {
  id: string;
  voucherType: string;
  pointOfSale: number;
  number: number;
  customerName: string;
  customerDocument: string;
  total: number;
  status: 'Pendiente CAE' | 'Autorizacion simulada' | 'Autorizado ARCA';
  issuedAt: string;
  authorization: DemoVoucherAuthorization | null;
};

const seedClients: DemoClient[] = [
  {
    id: 'cl-001',
    taxName: 'Distribuidora La Aurora SA',
    document: '30-71543218-9',
    iva: 'Responsable Inscripto',
    status: 'Validado en padron',
    email: 'compras@aurora.test',
    city: 'Rosario',
    updatedAt: '2026-05-17T10:15:00.000Z',
  },
  {
    id: 'cl-002',
    taxName: 'Ferreteria Don Pedro',
    document: '20-28456789-3',
    iva: 'Monotributo',
    status: 'Pendiente verificacion',
    email: 'pedro@donpedro.test',
    city: 'Cordoba',
    updatedAt: '2026-05-16T16:42:00.000Z',
  },
  {
    id: 'cl-003',
    taxName: 'Estudio Norte SRL',
    document: '30-69874521-4',
    iva: 'Exento',
    status: 'Validado en padron',
    email: 'admin@estudionorte.test',
    city: 'Buenos Aires',
    updatedAt: '2026-05-15T12:05:00.000Z',
  },
];

const seedVouchers: DemoVoucher[] = [
  {
    id: 'cbte-001',
    voucherType: 'Factura C',
    pointOfSale: 1,
    number: 1,
    customerName: 'Distribuidora La Aurora SA',
    customerDocument: '30-71543218-9',
    total: 145230.5,
    status: 'Autorizacion simulada',
    issuedAt: '2026-05-17T09:10:00.000Z',
    authorization: createDemoAuthorization({
      voucherType: 'Factura C',
      pointOfSale: 1,
      number: 1,
      customerDocument: '30-71543218-9',
      total: 145230.5,
      issuedAt: '2026-05-17T09:10:00.000Z',
    }),
  },
  {
    id: 'cbte-002',
    voucherType: 'Factura C',
    pointOfSale: 1,
    number: 2,
    customerName: 'Ferreteria Don Pedro',
    customerDocument: '20-28456789-3',
    total: 48200,
    status: 'Pendiente CAE',
    issuedAt: '2026-05-17T11:25:00.000Z',
    authorization: null,
  },
];

export function ensureDemoClients(): DemoClient[] {
  const existing = readDemoClients();
  if (existing.length > 0) {
    return existing;
  }

  persistDemoClients(seedClients);
  return seedClients;
}

export function readDemoClients(): DemoClient[] {
  return readJsonArray<DemoClient>(DEMO_CLIENTS_STORAGE_KEY);
}

export function persistDemoClients(clients: DemoClient[]) {
  writeJson(DEMO_CLIENTS_STORAGE_KEY, clients);
}

export function upsertDemoClient(client: Omit<DemoClient, 'id' | 'updatedAt'> & { id?: string }) {
  const clients = ensureDemoClients();
  const nextClient: DemoClient = {
    ...client,
    id: client.id ?? `cl-${crypto.randomUUID()}`,
    updatedAt: new Date().toISOString(),
  };

  const next = client.id ? clients.map((item) => (item.id === client.id ? nextClient : item)) : [nextClient, ...clients];
  persistDemoClients(next);
  return nextClient;
}

export function ensureDemoEmitterSettings(): DemoEmitterSettings {
  const existing = readDemoEmitterSettings();
  if (existing) {
    return existing;
  }

  const account = readDemoAccount();
  const seed: DemoEmitterSettings = {
    environment: account?.organization.environment ?? 'testing',
    wsaaLastCheckAt: null,
    certificate: {
      alias: 'arca-homo-demo',
      certificateFileName: '',
      privateKeyFileName: '',
      passphraseHint: 'Guardada fuera del navegador',
      status: 'Pendiente',
      validatedAt: null,
      wsaaMessage: 'Todavia no se valido el certificado contra WSAA.',
    },
  };

  persistDemoEmitterSettings(seed);
  return seed;
}

export function readDemoEmitterSettings(): DemoEmitterSettings | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(DEMO_EMITTER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DemoEmitterSettings;
  } catch {
    return null;
  }
}

export function persistDemoEmitterSettings(settings: DemoEmitterSettings) {
  writeJson(DEMO_EMITTER_STORAGE_KEY, settings);
}

export function validateDemoWsaa(settings: DemoEmitterSettings) {
  const validatedAt = new Date().toISOString();
  const hasFiles = Boolean(settings.certificate.certificateFileName && settings.certificate.privateKeyFileName);
  const next: DemoEmitterSettings = {
    ...settings,
    wsaaLastCheckAt: validatedAt,
    certificate: {
      ...settings.certificate,
      status: hasFiles ? 'Validado' : 'Pendiente',
      validatedAt: hasFiles ? validatedAt : null,
      wsaaMessage: hasFiles
        ? 'Handshake WSAA demo correcto. Se obtuvo Token/Sign simulado para homologacion.'
        : 'Faltan nombres de archivo .crt y .key para simular la validacion WSAA.',
    },
  };

  persistDemoEmitterSettings(next);
  return next;
}

export function ensureDemoVouchers(): DemoVoucher[] {
  const existing = readDemoVouchers();
  if (existing.length > 0) {
    const normalized = normalizeDemoVouchers(existing);
    if (JSON.stringify(existing) !== JSON.stringify(normalized)) {
      persistDemoVouchers(normalized);
    }

    return normalized;
  }

  persistDemoVouchers(seedVouchers);
  return seedVouchers;
}

export function readDemoVouchers(): DemoVoucher[] {
  return readJsonArray<DemoVoucher>(DEMO_VOUCHERS_STORAGE_KEY);
}

export function persistDemoVouchers(vouchers: DemoVoucher[]) {
  writeJson(DEMO_VOUCHERS_STORAGE_KEY, vouchers);
}

export function createDemoVoucher(input: Omit<DemoVoucher, 'id' | 'number' | 'issuedAt' | 'authorization'> & { authorization?: DemoVoucherAuthorization | null }) {
  const vouchers = ensureDemoVouchers();
  const nextNumber = vouchers.reduce((max, voucher) => Math.max(max, voucher.number), 0) + 1;
  const issuedAt = new Date().toISOString();
  const nextVoucher: DemoVoucher = {
    ...input,
    id: `cbte-${crypto.randomUUID()}`,
    number: nextNumber,
    issuedAt,
    authorization:
      input.authorization ??
      (input.status === 'Autorizacion simulada'
        ? createDemoAuthorization({
            voucherType: input.voucherType,
            pointOfSale: input.pointOfSale,
            number: nextNumber,
            customerDocument: input.customerDocument,
            total: input.total,
            issuedAt,
          })
        : null),
  };

  persistDemoVouchers([nextVoucher, ...vouchers]);
  return nextVoucher;
}

export function updateDemoVoucher(voucherId: string, patch: Partial<DemoVoucher>) {
  const vouchers = ensureDemoVouchers();
  const next = vouchers.map((voucher) => (voucher.id === voucherId ? { ...voucher, ...patch } : voucher));
  persistDemoVouchers(next);
  return next.find((voucher) => voucher.id === voucherId) ?? null;
}

function readJsonArray<T>(key: string): T[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeDemoVouchers(vouchers: DemoVoucher[]) {
  return vouchers.map((voucher) => ({
    ...voucher,
    voucherType: normalizeVoucherType(voucher.voucherType),
    authorization: normalizeVoucherAuthorization(voucher),
  }));
}

function normalizeVoucherType(voucherType: string) {
  if (voucherType === 'Factura A' || voucherType === 'Factura B') {
    return 'Factura C';
  }

  if (voucherType === 'Nota de Credito A' || voucherType === 'Nota de Credito B') {
    return 'Nota de Credito C';
  }

  return voucherType;
}

function normalizeVoucherAuthorization(voucher: DemoVoucher) {
  if (voucher.authorization) {
    return {
      ...voucher.authorization,
      qrLabel: voucher.authorization.qrLabel || (voucher.authorization.source === 'wsfev1' ? 'QR AFIP' : 'QR AFIP demo'),
      source: voucher.authorization.source ?? 'demo',
    };
  }

  if (voucher.status !== 'Autorizacion simulada') {
    return null;
  }

  return createDemoAuthorization(voucher);
}

function createDemoAuthorization(input: Pick<DemoVoucher, 'voucherType' | 'pointOfSale' | 'number' | 'customerDocument' | 'total' | 'issuedAt'>): DemoVoucherAuthorization {
  const cae = `${input.pointOfSale.toString().padStart(4, '0')}${input.number.toString().padStart(10, '0')}`;
  const payload = {
    ver: 1,
    fecha: input.issuedAt.slice(0, 10),
    cuit: 20000000001,
    ptoVta: input.pointOfSale,
    tipoCmp: mapVoucherTypeToCode(input.voucherType),
    nroCmp: input.number,
    importe: Number(input.total.toFixed(2)),
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: mapRecipientDocumentType(input.customerDocument),
    nroDocRec: sanitizeDocument(input.customerDocument),
    tipoCodAut: 'E',
    codAut: Number(cae),
  };

  return {
    cae,
    caeDueDate: input.issuedAt,
    qrPayloadUrl: `https://www.afip.gob.ar/fe/qr/?p=${encodeAfipQrPayload(payload)}`,
    qrLabel: 'QR AFIP demo',
    source: 'demo',
  };
}

function mapVoucherTypeToCode(voucherType: string) {
  switch (voucherType) {
    case 'Factura C':
      return 11;
    case 'Nota de Credito C':
      return 13;
    case 'Recibo C':
      return 15;
    default:
      return 11;
  }
}

function mapRecipientDocumentType(documentValue: string) {
  const sanitized = documentValue.replace(/\D/g, '');

  if (sanitized.length === 11) {
    return 80;
  }

  if (sanitized.length === 8) {
    return 96;
  }

  return 99;
}

function sanitizeDocument(documentValue: string) {
  const digits = documentValue.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

function encodeAfipQrPayload(payload: Record<string, number | string>) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}