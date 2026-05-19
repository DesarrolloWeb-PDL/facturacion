export const DEMO_USER_STORAGE_KEY = 'facturacion.demo.user';
export const DEMO_SESSION_STORAGE_KEY = 'facturacion.demo.session';
export const DEMO_ACCOUNT_STORAGE_KEY = 'facturacion.demo.account';

export type DemoUser = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
};

export type DemoSession = {
  token: string;
  expiresAt: string;
};

export type DemoOrganization = {
  id: string;
  legalName: string;
  fantasyName?: string;
  cuit: string;
  environment: 'testing' | 'production';
  ivaConditionCode: string;
  fiscalAddress?: string;
  locality?: string;
  postalCode?: string;
  province?: string;
  activityStartDate: string | null;
  pointsOfSale: Array<{
    posNumber: number;
    description?: string;
  }>;
};

export type DemoAccount = {
  email: string;
  password: string;
  user: DemoUser;
  session: DemoSession;
  organization: DemoOrganization;
};

export function createDemoSeed(): DemoAccount {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);
  const organization = createDemoOrganizationSeed();

  return {
    email: 'usuario.prueba.demo@example.com',
    password: 'PruebaSegura123',
    user: {
      id: 'demo-user-local',
      fullName: 'Usuario de Prueba',
      email: 'usuario.prueba.demo@example.com',
      createdAt: now.toISOString(),
    },
    session: {
      token: createDemoToken(),
      expiresAt: expiresAt.toISOString(),
    },
    organization,
  };
}

export function ensureDemoAccount() {
  if (typeof window === 'undefined') {
    return null;
  }

  const existing = readDemoAccount();
  if (existing) {
    return existing;
  }

  const seed = createDemoSeed();
  persistDemoAccount(seed);
  return seed;
}

export function readDemoAccount(): DemoAccount | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(DEMO_ACCOUNT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as DemoAccount;
    const normalized = normalizeDemoAccount(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      persistDemoAccount(normalized);
    }

    return normalized;
  } catch {
    return null;
  }
}

export function persistDemoAccount(account: DemoAccount) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(DEMO_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(account.user));
  localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(account.session));
}

export function persistDemoSession(user: DemoUser, session: DemoSession) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearDemoSession() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(DEMO_USER_STORAGE_KEY);
  localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
}

export function createLocalSession(): DemoSession {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    token: createDemoToken(),
    expiresAt: expiresAt.toISOString(),
  };
}

function createDemoToken() {
  return `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
}

function createDemoOrganizationSeed(): DemoOrganization {
  return {
    id: 'demo-org-local',
    legalName: 'Facturacion Demo Monotributo',
    fantasyName: 'DEMO FACTURACION',
    cuit: '20-00000000-1',
    environment: 'testing',
    ivaConditionCode: 'Monotributista',
    fiscalAddress: 'Domicilio demo 123',
    locality: 'Ciudad Demo',
    postalCode: '1000',
    province: 'Buenos Aires',
    activityStartDate: null,
    pointsOfSale: [
      {
        posNumber: 1,
        description: 'Punto de venta demo',
      },
    ],
  };
}

function normalizeDemoAccount(account: DemoAccount): DemoAccount {
  const seed = createDemoSeed();
  const isLegacyDefaultAccount =
    account.email === seed.email &&
    (
      account.organization.legalName === 'Facturacion Demo SRL' ||
      account.organization.cuit === '30712345670' ||
      account.organization.legalName === 'Luciana Anabel Vich' ||
      account.organization.cuit === '24-33126208-7'
    );

  const normalizedOrganization: DemoOrganization = isLegacyDefaultAccount
    ? {
        ...seed.organization,
        environment: account.organization.environment ?? seed.organization.environment,
      }
    : {
        ...account.organization,
        fantasyName: account.organization.fantasyName ?? account.organization.legalName,
        fiscalAddress: account.organization.fiscalAddress,
        locality: account.organization.locality,
        postalCode: account.organization.postalCode,
        province: account.organization.province,
        activityStartDate: account.organization.activityStartDate ?? null,
      };

  return {
    ...account,
    organization: normalizedOrganization,
  };
}
