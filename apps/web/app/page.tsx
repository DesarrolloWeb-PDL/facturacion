'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

import { ensureDemoAccount, persistDemoAccount, type DemoAccount } from './lib/demo-auth';

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

const demoDefaults = {
  fullName: 'Usuario de Prueba',
  email: 'usuario.prueba.demo@example.com',
  password: 'PruebaSegura123',
  legalName: 'Facturacion Demo SRL',
  cuit: '30712345670',
  ivaConditionCode: 'RI',
  environment: 'testing' as const,
  ingresosBrutos: '902-765432-1',
  activityStartDate: '2024-03-01',
  taxRegime: 'general',
  posNumber: 1,
  posDescription: 'Sucursal Demo',
};

type StepState = 'idle' | 'submitting' | 'success' | 'error';

type BootstrapResponse = DemoAccount & {
  membership: {
    roleCode: 'owner';
  };
};

export default function OnboardingPage() {
  const [status, setStatus] = useState<StepState>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<BootstrapResponse | null>(null);

  useState(() => {
    ensureDemoAccount();
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');
    setResult(null);

    const formData = new FormData(event.currentTarget);

    const payload = {
      user: {
        fullName: String(formData.get('fullName') ?? ''),
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
      },
      organization: {
        legalName: String(formData.get('legalName') ?? ''),
        cuit: String(formData.get('cuit') ?? ''),
        ivaConditionCode: String(formData.get('ivaConditionCode') ?? ''),
        ingresosBrutos: normalizeOptionalField(formData.get('ingresosBrutos')),
        activityStartDate: String(formData.get('activityStartDate') ?? ''),
        taxRegime: normalizeOptionalField(formData.get('taxRegime')),
        environment: String(formData.get('environment') ?? 'testing') as 'testing' | 'production',
        pointsOfSale: [
          {
            posNumber: Number(formData.get('posNumber') ?? 1),
            description: normalizeOptionalField(formData.get('posDescription')),
          },
        ],
      },
    };

    try {
      const response = await fetch(`${defaultApiBaseUrl}/onboarding/bootstrap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('El email ya esta registrado');
        }

        throw new Error('No se pudo completar el onboarding inicial');
      }

      const onboardingData = (await response.json()) as BootstrapResponse;

      persistDemoAccount({
        email: payload.user.email,
        password: payload.user.password,
        user: onboardingData.user,
        session: onboardingData.session,
        organization: onboardingData.organization,
      });

      setStatus('success');
      setResult(onboardingData);
      setMessage(
        `Usuario ${onboardingData.user.fullName} vinculado como ${onboardingData.membership.roleCode} del emisor ${onboardingData.organization.legalName} (${onboardingData.organization.cuit}).`,
      );
      event.currentTarget.reset();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Ocurrio un error inesperado');
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Onboarding inicial</p>
        <h1>Configura tu emisor ARCA en un solo flujo.</h1>
        <p className="hero-copy">
          Registra al usuario administrador y deja lista la empresa para homologacion, puntos de venta y futura emision fiscal.
        </p>
        <div className="hero-cards">
          <article>
            <span>01</span>
            <h2>Cuenta base</h2>
            <p>Se crea el usuario que va a administrar la empresa y el acceso inicial.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Identidad fiscal</h2>
            <p>Se registran CUIT, condicion IVA, fecha de inicio y regimen para el emisor.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Punto de venta</h2>
            <p>Se inicializa el PDV para preparar la configuracion posterior con certificados y WSAA.</p>
          </article>
        </div>
      </section>

      <section className="form-panel">
        <form className="onboarding-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <p className="section-label">Usuario administrador</p>
            <label>
              Nombre completo
              <input name="fullName" type="text" placeholder="Ana Arquitecta" defaultValue={demoDefaults.fullName} required />
            </label>
            <label>
              Email
              <input name="email" type="email" placeholder="admin@empresa.com" defaultValue={demoDefaults.email} required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                placeholder="Minimo 8 caracteres"
                defaultValue={demoDefaults.password}
                required
                minLength={8}
              />
            </label>
          </div>

          <div className="form-section">
            <p className="section-label">Emisor</p>
            <label>
              Razon social
              <input name="legalName" type="text" placeholder="Demo SA" defaultValue={demoDefaults.legalName} required />
            </label>
            <label>
              CUIT
              <input
                name="cuit"
                type="text"
                inputMode="numeric"
                placeholder="30712345678"
                defaultValue={demoDefaults.cuit}
                required
                pattern="[0-9]{11}"
              />
            </label>
            <div className="grid-two">
              <label>
                Condicion IVA
                <select name="ivaConditionCode" defaultValue={demoDefaults.ivaConditionCode}>
                  <option value="RI">Responsable Inscripto</option>
                  <option value="MT">Monotributo</option>
                  <option value="EX">Exento</option>
                </select>
              </label>
              <label>
                Entorno
                <select name="environment" defaultValue={demoDefaults.environment}>
                  <option value="testing">Testing</option>
                  <option value="production">Produccion</option>
                </select>
              </label>
            </div>
            <div className="grid-two">
              <label>
                Ingresos Brutos
                <input
                  name="ingresosBrutos"
                  type="text"
                  placeholder="902-123456-7"
                  defaultValue={demoDefaults.ingresosBrutos}
                />
              </label>
              <label>
                Inicio de actividades
                <input name="activityStartDate" type="date" defaultValue={demoDefaults.activityStartDate} required />
              </label>
            </div>
            <label>
              Regimen
              <input name="taxRegime" type="text" placeholder="general" defaultValue={demoDefaults.taxRegime} />
            </label>
          </div>

          <div className="form-section">
            <p className="section-label">Punto de venta inicial</p>
            <div className="grid-two">
              <label>
                Numero de PDV
                <input name="posNumber" type="number" min={1} defaultValue={demoDefaults.posNumber} required />
              </label>
              <label>
                Descripcion
                <input
                  name="posDescription"
                  type="text"
                  placeholder="Casa Central"
                  defaultValue={demoDefaults.posDescription}
                />
              </label>
            </div>
          </div>

          <button className="submit-button" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Creando emisor...' : 'Crear usuario y emisor'}
          </button>

          {message ? <p className={`status-message ${status}`}>{message}</p> : null}

          {result ? (
            <section className="result-panel" aria-live="polite">
              <div className="result-header">
                <div>
                  <p className="section-label">Provision completada</p>
                  <h2>Ya tenes el emisor listo para seguir con certificados y WSAA.</h2>
                </div>
                <span className="result-badge">{result.organization.environment}</span>
              </div>

              <div className="result-grid">
                <article>
                  <p className="result-label">Usuario administrador</p>
                  <strong>{result.user.fullName}</strong>
                  <span>{result.user.email}</span>
                  <span>Rol inicial: {result.membership.roleCode}</span>
                </article>

                <article>
                  <p className="result-label">Emisor</p>
                  <strong>{result.organization.legalName}</strong>
                  <span>CUIT {result.organization.cuit}</span>
                  <span>IVA {result.organization.ivaConditionCode}</span>
                </article>

                <article>
                  <p className="result-label">Sesion inicial</p>
                  <strong>{maskToken(result.session.token)}</strong>
                  <span>Vence {formatDateTime(result.session.expiresAt)}</span>
                  <span>Creado {formatDateTime(result.user.createdAt)}</span>
                </article>
              </div>

              <div className="result-meta">
                <div>
                  <span className="result-label">Punto de venta inicial</span>
                  <p>
                    PDV {result.organization.pointsOfSale[0]?.posNumber}
                    {result.organization.pointsOfSale[0]?.description ? ` · ${result.organization.pointsOfSale[0].description}` : ''}
                  </p>
                </div>

                <div>
                  <span className="result-label">Inicio de actividades</span>
                  <p>{result.organization.activityStartDate ? formatDate(result.organization.activityStartDate) : 'Pendiente de confirmar en ARCA'}</p>
                </div>

                <div>
                  <span className="result-label">Proximo paso</span>
                  <p>Cargar certificado, asociar WSAA y validar conectividad en homologacion.</p>
                </div>
              </div>

              <div className="result-actions">
                <Link className="secondary-button" href="/ingresar">
                  Ir a ingresar
                </Link>
                <p>Si queres probar el acceso ahora mismo, usa esta cuenta demo desde la pantalla de ingreso.</p>
              </div>
            </section>
          ) : null}
        </form>
      </section>
    </main>
  );
}

function normalizeOptionalField(value: FormDataEntryValue | null) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : undefined;
}

function maskToken(token: string) {
  return `${token.slice(0, 10)}...${token.slice(-8)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
