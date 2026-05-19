'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  clearDemoSession,
  readDemoAccount,
  DEMO_SESSION_STORAGE_KEY,
  DEMO_USER_STORAGE_KEY,
  type DemoOrganization,
} from '../lib/demo-auth';
import { ensureDemoClients, ensureDemoEmitterSettings, ensureDemoVouchers } from '../lib/demo-data';

type StoredUser = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
};

type StoredSession = {
  token: string;
  expiresAt: string;
};

export default function PanelPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [organization, setOrganization] = useState<DemoOrganization | null>(null);
  const [totals, setTotals] = useState({ clients: 0, pendingVouchers: 0, authorizedVouchers: 0, wsaaReady: false });

  useEffect(() => {
    const storedUser = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    const storedSession = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    const account = readDemoAccount();

    if (storedUser) {
      setUser(JSON.parse(storedUser) as StoredUser);
    }

    if (storedSession) {
      setSession(JSON.parse(storedSession) as StoredSession);
    }

    if (account) {
      setOrganization(account.organization);
    }

    const clients = ensureDemoClients();
    const vouchers = ensureDemoVouchers();
    const emitter = ensureDemoEmitterSettings();

    setTotals({
      clients: clients.length,
      pendingVouchers: vouchers.filter((item) => item.status === 'Pendiente CAE').length,
      authorizedVouchers: vouchers.filter((item) => item.status === 'Autorizacion simulada').length,
      wsaaReady: emitter.certificate.status === 'Validado',
    });
  }, []);

  if (!user || !session) {
    return (
      <main className="auth-shell">
        <section className="auth-card auth-copy">
          <p className="eyebrow">Panel</p>
          <h1>No hay sesion activa en este navegador.</h1>
          <p>Primero entra desde la pantalla de ingreso para cargar una sesion demo local.</p>
          <Link className="secondary-button" href="/ingresar">
            Ir a ingresar
          </Link>
        </section>
      </main>
    );
  }

  function handleLogout() {
    clearDemoSession();
    setUser(null);
    setSession(null);
    router.push('/ingresar');
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-copy">
        <p className="eyebrow">Panel demo</p>
        <h1>Ya entraste al sistema.</h1>
        <p>Esta home inicial ya funciona como punto de entrada del producto. Desde aca despues vamos a colgar configuracion fiscal, certificados, clientes y comprobantes.</p>
        <div className="auth-note">
          <strong>Sesion activa</strong>
          <span>{user.fullName}</span>
          <span>{user.email}</span>
        </div>

        <section className="dashboard-kpis">
          <article>
            <p className="result-label">Entorno</p>
            <strong>{organization?.environment ?? 'testing'}</strong>
            <span>Modo demo para homologacion</span>
          </article>
          <article>
            <p className="result-label">PDV inicial</p>
            <strong>{organization?.pointsOfSale[0]?.posNumber ?? 1}</strong>
            <span>{organization?.pointsOfSale[0]?.description ?? 'Sucursal Demo'}</span>
          </article>
          <article>
            <p className="result-label">Sesion</p>
            <strong>Activa</strong>
            <span>Vence {formatDateTime(session.expiresAt)}</span>
          </article>
          <article>
            <p className="result-label">Clientes</p>
            <strong>{totals.clients}</strong>
            <span>Base local disponible</span>
          </article>
        </section>
      </section>

      <section className="auth-card panel-grid">
        <section className="panel-section">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Resumen operativo</p>
              <h2>Estado actual del emisor demo</h2>
            </div>
            <span className="result-badge">Demo lista</span>
          </div>

          <div className="panel-overview-grid">
            <article>
              <p className="result-label">Usuario</p>
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
            </article>
            <article>
              <p className="result-label">Sesion</p>
              <strong>{maskToken(session.token)}</strong>
              <span>Vence {formatDateTime(session.expiresAt)}</span>
            </article>
            <article>
              <p className="result-label">Emisor</p>
              <strong>{organization?.legalName ?? 'Facturacion Demo Monotributo'}</strong>
              <span>CUIT {organization?.cuit ?? '20-00000000-1'}</span>
            </article>
            <article>
              <p className="result-label">IVA</p>
              <strong>{organization?.ivaConditionCode ?? 'Monotributista'}</strong>
              <span>{organization?.activityStartDate ? `Inicio ${formatDate(organization.activityStartDate)}` : 'Inicio pendiente de confirmar'}</span>
            </article>
            <article>
              <p className="result-label">WSAA demo</p>
              <strong>{totals.wsaaReady ? 'Validado' : 'Pendiente'}</strong>
              <span>Certificado {totals.wsaaReady ? 'listo' : 'sin validar'}</span>
            </article>
            <article>
              <p className="result-label">Comprobantes</p>
              <strong>{totals.pendingVouchers}</strong>
              <span>{totals.authorizedVouchers} autorizados en simulacion</span>
            </article>
          </div>
        </section>

        <section className="panel-columns">
          <article className="panel-card-lg">
            <div className="panel-section-header">
              <div>
                <p className="result-label">Checklist</p>
                <h2>Lo que sigue para facturar de verdad</h2>
              </div>
            </div>

            <ul className="checklist">
              <li className="checklist-done">Emisor base creado</li>
              <li className="checklist-done">Usuario administrador operativo</li>
              <li className="checklist-pending">Cargar certificado digital .crt y .key</li>
              <li className="checklist-pending">Vincular WSAA y WSFEv1 en homologacion</li>
              <li className="checklist-pending">Configurar PDF fiscal y QR reglamentario</li>
            </ul>
          </article>

          <article className="panel-card-lg">
            <div className="panel-section-header">
              <div>
                <p className="result-label">Estado tecnico</p>
                <h2>Entorno de esta demo</h2>
              </div>
            </div>

            <div className="status-stack">
              <div>
                <strong>Persistencia local</strong>
                <span>Sesion y cuenta demo guardadas en localStorage del navegador</span>
              </div>
              <div>
                <strong>Backend</strong>
                <span>API en memoria, util para demo sin PostgreSQL</span>
              </div>
              <div>
                <strong>Objetivo inmediato</strong>
                <span>Conectar base real y reemplazar estas simulaciones por WSAA y WSFEv1 reales</span>
              </div>
            </div>
          </article>
        </section>

        <section className="panel-section">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Timeline</p>
              <h2>Actividad reciente de la demo</h2>
            </div>
          </div>

          <div className="timeline-list">
            <article className="timeline-item">
              <span className="timeline-dot timeline-dot-done" />
              <div>
                <strong>Sesion iniciada</strong>
                <p>El operador demo ingreso al panel y la sesion se guardo en localStorage.</p>
              </div>
            </article>
            <article className="timeline-item">
              <span className="timeline-dot timeline-dot-done" />
              <div>
                <strong>Emisor bootstrap creado</strong>
                <p>Facturacion Demo SRL quedo lista con CUIT, IVA y PDV inicial.</p>
              </div>
            </article>
            <article className="timeline-item">
              <span className="timeline-dot timeline-dot-pending" />
              <div>
                <strong>Certificados pendientes</strong>
                <p>{totals.wsaaReady ? 'El certificado demo ya quedo validado localmente contra WSAA simulado.' : 'Falta cargar .crt y .key para conectar WSAA y empezar homologacion.'}</p>
              </div>
            </article>
            <article className="timeline-item">
              <span className={`timeline-dot ${totals.pendingVouchers > 0 ? 'timeline-dot-pending' : 'timeline-dot-done'}`} />
              <div>
                <strong>Primer comprobante</strong>
                <p>{totals.pendingVouchers > 0 ? 'Ya hay comprobantes demo cargados y pendientes de CAE.' : 'El siguiente hito es emitir una factura demo y generar su PDF fiscal.'}</p>
              </div>
            </article>
          </div>
        </section>

        <section className="home-links">
          <Link className="home-link-card" href="/emisor">
            <p className="result-label">Onboarding</p>
            <strong>Emisor y certificados</strong>
            <span>Revisar identidad fiscal, PDV y estrategia segura de certificados ARCA.</span>
          </Link>

          <Link className="home-link-card" href="/ingresar">
            <p className="result-label">Acceso</p>
            <strong>Sesion</strong>
            <span>Reingresar con la cuenta demo o probar el flujo de acceso nuevamente.</span>
          </Link>

          <Link className="home-link-card" href="/clientes">
            <p className="result-label">Modulo</p>
            <strong>Clientes</strong>
            <span>Alta y edicion local de clientes, lista base para padron ARCA.</span>
          </Link>

          <Link className="home-link-card" href="/comprobantes">
            <p className="result-label">Modulo</p>
            <strong>Comprobantes</strong>
            <span>Emision local inicial, estado pendiente CAE y numeracion demo.</span>
          </Link>
        </section>

        <div className="panel-actions">
          <Link className="secondary-button" href="/">
            Volver al onboarding
          </Link>
          <button className="secondary-button secondary-button-danger" type="button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </section>
    </main>
  );
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
