'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useDemoSession } from '../lib/use-demo-session';
import { ensureDemoClients, readDemoClients, upsertDemoClient, type DemoClient } from '../lib/demo-data';

const emptyForm = {
  taxName: '',
  document: '',
  iva: 'Responsable Inscripto',
  email: '',
  city: '',
  status: 'Pendiente verificacion' as DemoClient['status'],
};

export default function ClientesPage() {
  const { account, ready, user, session } = useDemoSession();
  const [clients, setClients] = useState<DemoClient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setClients(ensureDemoClients());
  }, []);

  if (!ready) {
    return null;
  }

  if (!user || !session) {
    return (
      <main className="auth-shell">
        <section className="auth-card auth-copy">
          <p className="eyebrow">Clientes</p>
          <h1>No hay sesion activa.</h1>
          <p>Para ver el modulo de clientes primero entra con la cuenta demo.</p>
          <Link className="secondary-button" href="/ingresar">
            Ir a ingresar
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="module-shell">
      <section className="module-hero">
        <p className="eyebrow">Clientes</p>
        <h1>Base de clientes lista para validacion fiscal.</h1>
        <p>
          Este modulo visualiza como quedaria el alta, consulta y estado fiscal de clientes antes de integrar padron ARCA y persistencia real.
        </p>
        <div className="dashboard-kpis">
          <article>
            <p className="result-label">Emisor activo</p>
            <strong>{account?.organization.legalName ?? 'Facturacion Demo SRL'}</strong>
            <span>CUIT {account?.organization.cuit ?? '30712345670'}</span>
          </article>
          <article>
            <p className="result-label">Clientes activos</p>
            <strong>{clients.length}</strong>
            <span>{clients.filter((item) => item.status === 'Validado en padron').length} validados y {clients.filter((item) => item.status === 'Pendiente verificacion').length} pendientes</span>
          </article>
          <article>
            <p className="result-label">Operador</p>
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </article>
        </div>
      </section>

      <section className="module-grid">
        <article className="module-card">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Acciones</p>
              <h2>Proximo alcance funcional</h2>
            </div>
          </div>
          <ul className="checklist">
            <li className="checklist-done">Vista de listado disponible</li>
            <li className="checklist-done">Alta y edicion local en navegador</li>
            <li className="checklist-pending">Consulta online de padron</li>
            <li className="checklist-pending">Cache offline local</li>
          </ul>
        </article>

        <article className="module-card">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Estado demo</p>
              <h2>Reglas que vamos a cubrir</h2>
            </div>
          </div>
          <div className="status-stack">
            <div>
              <strong>CUIT/CUIL</strong>
              <span>Validacion de formato local y consulta de condicion fiscal online cuando haya conectividad.</span>
            </div>
            <div>
              <strong>Offline-first</strong>
              <span>La ficha local sigue operativa aunque el padron no responda.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="module-grid">
        <article className="module-card module-card-tall">
          <div className="panel-section-header">
            <div>
              <p className="result-label">ABM local</p>
              <h2>{editingId ? 'Editar cliente' : 'Alta rapida de cliente'}</h2>
            </div>
          </div>
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              const saved = upsertDemoClient({ ...form, id: editingId ?? undefined });
              setClients(readDemoClients());
              setEditingId(null);
              setForm(emptyForm);
              setMessage(`Cliente ${saved.taxName} guardado en localStorage.`);
            }}
          >
            <label>
              Razon social
              <input
                required
                value={form.taxName}
                onChange={(event) => setForm((current) => ({ ...current, taxName: event.target.value }))}
              />
            </label>
            <div className="grid-two">
              <label>
                CUIT / Documento
                <input
                  required
                  value={form.document}
                  onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))}
                />
              </label>
              <label>
                Condicion IVA
                <select value={form.iva} onChange={(event) => setForm((current) => ({ ...current, iva: event.target.value }))}>
                  <option>Responsable Inscripto</option>
                  <option>Monotributo</option>
                  <option>Exento</option>
                  <option>Consumidor Final</option>
                </select>
              </label>
            </div>
            <div className="grid-two">
              <label>
                Email
                <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                Ciudad
                <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
              </label>
            </div>
            <label>
              Estado fiscal
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as DemoClient['status'] }))}
              >
                <option value="Pendiente verificacion">Pendiente verificacion</option>
                <option value="Validado en padron">Validado en padron</option>
              </select>
            </label>
            {message ? <p className="status-message success">{message}</p> : null}
            <div className="inline-actions">
              <button className="submit-button" type="submit">
                {editingId ? 'Guardar cambios' : 'Agregar cliente'}
              </button>
              {editingId ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setMessage(null);
                  }}
                >
                  Cancelar edicion
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="module-card module-card-tall">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Estado demo</p>
              <h2>Reglas que ya quedan cubiertas</h2>
            </div>
          </div>
          <div className="status-stack">
            <div>
              <strong>Persistencia local</strong>
              <span>Las fichas se guardan en localStorage para que puedas cerrar y reabrir el navegador sin perderlas.</span>
            </div>
            <div>
              <strong>Edicion operativa</strong>
              <span>Podes volver a abrir un cliente, corregir IVA o documento y dejarlo listo para el modulo de comprobantes.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="list-card">
        <div className="panel-section-header">
          <div>
            <p className="result-label">Listado operativo</p>
            <h2>Clientes cargados en este navegador</h2>
          </div>
          <Link className="secondary-link" href="/panel">
            Volver al panel
          </Link>
        </div>

        <div className="table-like">
          {clients.map((client) => (
            <article key={client.id} className="table-row-card">
              <div>
                <p className="result-label">Razon social</p>
                <strong>{client.taxName}</strong>
                <span>{client.document}</span>
              </div>
              <div>
                <p className="result-label">IVA</p>
                <strong>{client.iva}</strong>
                <span>{client.email || 'Sin email cargado'}</span>
              </div>
              <div>
                <p className="result-label">Padron</p>
                <strong>{client.status}</strong>
                <span>{client.status === 'Validado en padron' ? 'Listo para facturar' : 'Requiere chequeo online'}</span>
              </div>
              <div className="table-actions-cell">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingId(client.id);
                    setForm({
                      taxName: client.taxName,
                      document: client.document,
                      iva: client.iva,
                      email: client.email,
                      city: client.city,
                      status: client.status,
                    });
                    setMessage(null);
                  }}
                >
                  Editar
                </button>
                <span>Actualizado {formatDateTime(client.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
