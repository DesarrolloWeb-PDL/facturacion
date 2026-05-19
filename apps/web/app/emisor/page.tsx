'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useDemoSession } from '../lib/use-demo-session';
import {
  ensureDemoEmitterSettings,
  persistDemoEmitterSettings,
  validateDemoWsaa,
  type DemoEmitterSettings,
} from '../lib/demo-data';

export default function EmisorPage() {
  const { account, ready, user, session } = useDemoSession();
  const [settings, setSettings] = useState<DemoEmitterSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSettings(ensureDemoEmitterSettings());
  }, []);

  if (!ready) {
    return null;
  }

  if (!user || !session || !account) {
    return (
      <main className="auth-shell">
        <section className="auth-card auth-copy">
          <p className="eyebrow">Emisor</p>
          <h1>No hay sesion activa.</h1>
          <p>Para ver la configuracion fiscal demo primero entra con la cuenta de prueba.</p>
          <Link className="secondary-button" href="/ingresar">
            Ir a ingresar
          </Link>
        </section>
      </main>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <main className="module-shell">
      <section className="module-hero">
        <p className="eyebrow">Emisor y certificados</p>
        <h1>Configuracion fiscal central del contribuyente.</h1>
        <p>
          Esta pantalla deja visible el siguiente modulo clave del producto: identidad fiscal, punto de venta, certificados digitales y conectividad con WSAA/WSFEv1.
        </p>
      </section>

      <section className="module-grid module-grid-strong">
        <article className="module-card">
          <p className="result-label">Emisor</p>
          <strong>{account.organization.legalName}</strong>
          {account.organization.fantasyName ? <span>Fantasia {account.organization.fantasyName}</span> : null}
          <span>CUIT {account.organization.cuit}</span>
          <span>IVA {account.organization.ivaConditionCode}</span>
          {account.organization.fiscalAddress ? (
            <span>
              {account.organization.fiscalAddress}, {account.organization.locality ?? 'Localidad pendiente'}
            </span>
          ) : null}
          <span>{account.organization.activityStartDate ? `Inicio ${formatDate(account.organization.activityStartDate)}` : 'Inicio de actividad pendiente de confirmar'}</span>
        </article>

        <article className="module-card">
          <p className="result-label">Punto de venta</p>
          <strong>PDV {account.organization.pointsOfSale[0]?.posNumber ?? 1}</strong>
          <span>{account.organization.pointsOfSale[0]?.description ?? 'Sucursal Demo'}</span>
          <span>Entorno {settings.environment}</span>
        </article>

        <article className="module-card">
          <p className="result-label">Operador</p>
          <strong>{user.fullName}</strong>
          <span>{user.email}</span>
          <span>Sesion vigente hasta {formatDateTime(session.expiresAt)}</span>
        </article>
      </section>

      <section className="module-grid">
        <article className="module-card module-card-tall">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Certificados</p>
              <h2>Estado actual para homologacion</h2>
            </div>
            <span className="result-badge">{settings.certificate.status}</span>
          </div>

          <div className="status-stack">
            <div>
              <strong>Certificado X.509</strong>
              <span>{settings.certificate.certificateFileName || 'Aun no cargado en la demo'}</span>
            </div>
            <div>
              <strong>Clave privada .key</strong>
              <span>{settings.certificate.privateKeyFileName || 'Debe guardarse de forma segura y nunca en texto plano'}</span>
            </div>
            <div>
              <strong>WSAA</strong>
              <span>{settings.certificate.wsaaMessage}</span>
            </div>
          </div>
        </article>

        <article className="module-card module-card-tall">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Roadmap tecnico</p>
              <h2>Checklist para salir a homologacion</h2>
            </div>
          </div>
          <ul className="checklist">
            <li className="checklist-done">Emisor base creado</li>
            <li className="checklist-done">PDV inicial definido</li>
            <li className={settings.certificate.certificateFileName ? 'checklist-done' : 'checklist-pending'}>Alta de certificado en la app</li>
            <li className={settings.certificate.status === 'Validado' ? 'checklist-done' : 'checklist-pending'}>Prueba de login WSAA homologacion</li>
            <li className="checklist-pending">Primera autorizacion WSFEv1</li>
          </ul>
        </article>
      </section>

      <section className="module-grid">
        <article className="module-card module-card-tall">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Configuracion</p>
              <h2>Certificado demo</h2>
            </div>
          </div>
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              persistDemoEmitterSettings(settings);
              setMessage('Configuracion del emisor guardada en localStorage.');
            }}
          >
            <div className="grid-two">
              <label>
                Entorno fiscal
                <select
                  value={settings.environment}
                  onChange={(event) => setSettings((current) => (current ? { ...current, environment: event.target.value as DemoEmitterSettings['environment'] } : current))}
                >
                  <option value="testing">Homologacion</option>
                  <option value="production">Produccion</option>
                </select>
              </label>
              <label>
                Alias interno
                <input
                  value={settings.certificate.alias}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            certificate: { ...current.certificate, alias: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>
            <div className="grid-two">
              <label>
                Nombre archivo .crt
                <input
                  placeholder="mi-certificado.crt"
                  value={settings.certificate.certificateFileName}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            certificate: { ...current.certificate, certificateFileName: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                Nombre archivo .key
                <input
                  placeholder="mi-clave.key"
                  value={settings.certificate.privateKeyFileName}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            certificate: { ...current.certificate, privateKeyFileName: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>
            <label>
              Recordatorio de passphrase
              <input
                value={settings.certificate.passphraseHint}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          certificate: { ...current.certificate, passphraseHint: event.target.value },
                        }
                      : current,
                  )
                }
              />
            </label>
            {message ? <p className="status-message success">{message}</p> : null}
            <div className="inline-actions">
              <button className="submit-button" type="submit">
                Guardar emisor
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  const validated = validateDemoWsaa(settings);
                  setSettings(validated);
                  setMessage(validated.certificate.wsaaMessage);
                }}
              >
                Validar WSAA demo
              </button>
            </div>
          </form>
        </article>

        <article className="module-card module-card-tall">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Ultimo control</p>
              <h2>Resultado tecnico local</h2>
            </div>
          </div>
          <div className="status-stack">
            <div>
              <strong>Alias</strong>
              <span>{settings.certificate.alias}</span>
            </div>
            <div>
              <strong>WSAA demo</strong>
              <span>{settings.wsaaLastCheckAt ? `Ultimo chequeo ${formatDateTime(settings.wsaaLastCheckAt)}` : 'Sin chequeos todavia'}</span>
            </div>
            <div>
              <strong>Passphrase</strong>
              <span>{settings.certificate.passphraseHint}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="list-card">
        <div className="panel-section-header">
          <div>
            <p className="result-label">Seguridad</p>
            <h2>Criterios de almacenamiento recomendados</h2>
          </div>
          <Link className="secondary-link" href="/panel">
            Volver al panel
          </Link>
        </div>

        <div className="table-like">
          <article className="table-row-card">
            <div>
              <p className="result-label">MVP</p>
              <strong>Cifrado centralizado</strong>
              <span>Clave privada protegida en backend con KMS o secreto equivalente.</span>
            </div>
            <div>
              <p className="result-label">Desktop premium</p>
              <strong>Keystore local</strong>
              <span>Windows Certificate Store o mecanismo seguro del sistema operativo.</span>
            </div>
            <div>
              <p className="result-label">Regla</p>
              <strong>No usar clave fiscal</strong>
              <span>La app opera con certificados, no con credenciales de ARCA dentro del sistema.</span>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
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
