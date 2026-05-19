'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

import {
  createDemoVoucher,
  ensureDemoClients,
  ensureDemoVouchers,
  readDemoClients,
  readDemoVouchers,
  updateDemoVoucher,
  type DemoClient,
  type DemoVoucher,
} from '../lib/demo-data';
import { useDemoSession } from '../lib/use-demo-session';

const voucherTypeOptions = ['Factura C', 'Nota de Credito C', 'Recibo C'] as const;
const defaultApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

type VoucherAuthorizationResponse = {
  voucher: {
    localId: string;
    voucherType: string;
    pointOfSale: number;
    number: number;
    issuedAt: string;
    status: 'Autorizado ARCA';
  };
  authorization: NonNullable<DemoVoucher['authorization']>;
  arca: {
    result: string;
    reproceso?: string;
  };
};

export default function ComprobantesPage() {
  const { account, ready, session, user } = useDemoSession();
  const [clients, setClients] = useState<DemoClient[]>([]);
  const [vouchers, setVouchers] = useState<DemoVoucher[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [authorizationState, setAuthorizationState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [authorizationMessage, setAuthorizationMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    voucherType: 'Factura C',
    customerDocument: '30-71543218-9',
    total: '150000',
    status: 'Pendiente CAE' as DemoVoucher['status'],
  });
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);

  useEffect(() => {
    setClients(ensureDemoClients());
    setVouchers(ensureDemoVouchers());
  }, []);

  useEffect(() => {
    if (!selectedVoucherId && vouchers.length > 0) {
      setSelectedVoucherId(vouchers[0]?.id ?? null);
    }
  }, [selectedVoucherId, vouchers]);

  const selectedVoucher = vouchers.find((voucher) => voucher.id === selectedVoucherId) ?? vouchers[0] ?? null;
  const selectedClient = selectedVoucher
    ? clients.find((client) => client.document === selectedVoucher.customerDocument) ?? null
    : null;
  const printDisabled = !selectedVoucher;
  const authorization = selectedVoucher && account ? resolveVoucherAuthorization({ voucher: selectedVoucher, client: selectedClient, account }) : null;
  const qrPayload = authorization?.qrPayloadUrl ?? null;

  useEffect(() => {
    let cancelled = false;

    async function generateQr() {
      if (!qrPayload) {
        setQrDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 180,
          color: {
            dark: '#1e1a17',
            light: '#fffdf9',
          },
        });

        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl(null);
        }
      }
    }

    void generateQr();

    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  if (!ready) {
    return null;
  }

  if (!user || !session || !account) {
    return (
      <main className="auth-shell">
        <section className="auth-card auth-copy">
          <p className="eyebrow">Comprobantes</p>
          <h1>No hay sesion activa.</h1>
          <p>Para probar emision demo primero entra con la cuenta de prueba.</p>
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
        <p className="eyebrow">Comprobantes</p>
        <h1>Emision demo local para el primer flujo fiscal.</h1>
        <p>
          Este modulo arranca el circuito operativo del monotributo: seleccion de cliente, comprobante tipo C, total y estado local pendiente de CAE o autorizado en simulacion.
        </p>
        <div className="dashboard-kpis">
          <article>
            <p className="result-label">Pendientes</p>
            <strong>{vouchers.filter((voucher) => voucher.status === 'Pendiente CAE').length}</strong>
            <span>Listos para salir por WSFEv1</span>
          </article>
          <article>
            <p className="result-label">Autorizados</p>
            <strong>{vouchers.filter((voucher) => voucher.authorization !== null).length}</strong>
            <span>Demo o ARCA persistidos</span>
          </article>
          <article>
            <p className="result-label">Punto de venta</p>
            <strong>{account.organization.pointsOfSale[0]?.posNumber ?? 1}</strong>
            <span>{account.organization.pointsOfSale[0]?.description ?? 'Sucursal Demo'}</span>
          </article>
        </div>
      </section>

      <section className="module-grid">
        <article className="module-card module-card-tall">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Nuevo comprobante</p>
              <h2>Carga rapida local</h2>
            </div>
          </div>
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              const client = clients.find((item) => item.document === form.customerDocument);
              const saved = createDemoVoucher({
                voucherType: form.voucherType,
                customerDocument: form.customerDocument,
                customerName: client?.taxName ?? 'Cliente eventual',
                pointOfSale: account.organization.pointsOfSale[0]?.posNumber ?? 1,
                total: Number(form.total),
                status: form.status,
              });
              const nextVouchers = readDemoVouchers();
              setVouchers(nextVouchers);
              setSelectedVoucherId(saved.id);
              setMessage(`Comprobante ${saved.voucherType} ${saved.pointOfSale.toString().padStart(4, '0')}-${saved.number.toString().padStart(8, '0')} creado.`);
            }}
          >
            <div className="grid-two">
              <label>
                Tipo
                <select value={form.voucherType} onChange={(event) => setForm((current) => ({ ...current, voucherType: event.target.value }))}>
                  {voucherTypeOptions.map((voucherType) => (
                    <option key={voucherType}>{voucherType}</option>
                  ))}
                </select>
              </label>
              <label>
                Estado inicial
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as DemoVoucher['status'] }))}>
                  <option value="Pendiente CAE">Pendiente CAE</option>
                  <option value="Autorizacion simulada">Autorizacion simulada</option>
                </select>
              </label>
            </div>
            <label>
              Cliente
              <select value={form.customerDocument} onChange={(event) => setForm((current) => ({ ...current, customerDocument: event.target.value }))}>
                {clients.map((client) => (
                  <option key={client.id} value={client.document}>
                    {client.taxName} · {client.document}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Importe total
              <input value={form.total} onChange={(event) => setForm((current) => ({ ...current, total: event.target.value }))} />
            </label>
            {message ? <p className="status-message success">{message}</p> : null}
            <button className="submit-button" type="submit">
              Guardar comprobante demo
            </button>
          </form>
        </article>

        <article className="module-card module-card-tall">
          <div className="panel-section-header">
            <div>
              <p className="result-label">Factura demo</p>
              <h2>Impresion y descarga</h2>
            </div>
          </div>
          {selectedVoucher ? (
            <>
              <div className="voucher-actions">
                <button
                  className="submit-button"
                  type="button"
                  onClick={() => {
                    void handleAuthorizeVoucher({
                      account,
                      client: selectedClient,
                      voucher: selectedVoucher,
                      setAuthorizationMessage,
                      setAuthorizationState,
                      setVouchers,
                    });
                  }}
                  disabled={printDisabled || authorizationState === 'submitting' || selectedVoucher.authorization?.source === 'wsfev1'}
                >
                  {selectedVoucher.authorization?.source === 'wsfev1'
                    ? 'Autorizado en ARCA'
                    : authorizationState === 'submitting'
                      ? 'Autorizando...'
                      : 'Emitir en ARCA'}
                </button>
                <button className="submit-button" type="button" onClick={() => handlePrint()} disabled={printDisabled}>
                  Imprimir factura
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    void handleDownloadPdf({
                      voucher: selectedVoucher,
                      client: selectedClient,
                      issuerName: account.organization.legalName,
                      issuerFantasyName: account.organization.fantasyName,
                      issuerDocument: account.organization.cuit,
                      issuerTaxCondition: account.organization.ivaConditionCode,
                      issuerAddress: buildIssuerAddress(account.organization),
                      pointOfSaleDescription: account.organization.pointsOfSale[0]?.description ?? 'Sucursal Demo',
                      qrDataUrl,
                    });
                  }}
                  disabled={printDisabled}
                >
                  Descargar PDF
                </button>
              </div>
              <p className="voucher-helper">
                Se genera un comprobante tipo C listo para imprimir o descargar. Mientras no tenga CAE real, sale marcado como borrador sin validez fiscal.
              </p>
              {authorizationMessage ? (
                <p className={`status-message ${authorizationState === 'error' ? 'error' : 'success'}`}>{authorizationMessage}</p>
              ) : null}
              <ul className="checklist">
                <li className="checklist-done">Borrador local del comprobante</li>
                <li className="checklist-done">Secuencia demo por punto de venta</li>
                <li className="checklist-done">Impresion y PDF comercial</li>
                <li className={selectedVoucher.authorization?.source === 'wsfev1' ? 'checklist-done' : 'checklist-pending'}>CAE real por WSFEv1</li>
              </ul>
            </>
          ) : (
            <p className="voucher-helper">Crea el primer comprobante para habilitar la impresion y la descarga PDF.</p>
          )}
        </article>
      </section>

      <section className="list-card">
        <div className="panel-section-header">
          <div>
            <p className="result-label">Operacion local</p>
            <h2>Comprobantes creados en este navegador</h2>
          </div>
          <Link className="secondary-link" href="/panel">
            Volver al panel
          </Link>
        </div>
        <div className="table-like">
          {vouchers.map((voucher) => (
            <article key={voucher.id} className={`table-row-card ${voucher.id === selectedVoucherId ? 'table-row-card-selected' : ''}`}>
              <div>
                <p className="result-label">Numero</p>
                <strong>{voucher.voucherType}</strong>
                <span>{voucher.pointOfSale.toString().padStart(4, '0')}-{voucher.number.toString().padStart(8, '0')}</span>
              </div>
              <div>
                <p className="result-label">Cliente</p>
                <strong>{voucher.customerName}</strong>
                <span>{voucher.customerDocument}</span>
              </div>
              <div>
                <p className="result-label">Total</p>
                <strong>{formatCurrency(voucher.total)}</strong>
                <span>{voucher.status}</span>
              </div>
              <div className="table-actions-cell">
                <span>Emitido {formatDateTime(voucher.issuedAt)}</span>
                <button className="secondary-button secondary-button-small" type="button" onClick={() => setSelectedVoucherId(voucher.id)}>
                  Ver factura
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedVoucher ? (
        <section className="invoice-sheet" id="invoice-sheet">
          <div className="invoice-form-code">Cod. 011</div>
          <div className="invoice-sheet-header">
            <div className="invoice-issuer-block">
              <div>
                <p className="result-label">Emisor</p>
                <h2>{account.organization.legalName}</h2>
                {account.organization.fantasyName ? <span>Fantasia {account.organization.fantasyName}</span> : null}
                <span>CUIT {account.organization.cuit}</span>
                <span>{account.organization.ivaConditionCode}</span>
              </div>
            </div>
            <div className="invoice-document-box">
              <div className="invoice-letter-badge">{resolveVoucherLetter(selectedVoucher.voucherType)}</div>
              <strong>{selectedVoucher.voucherType.toUpperCase()}</strong>
              <span>ORIGINAL</span>
              <small>
                {selectedVoucher.pointOfSale.toString().padStart(4, '0')}-{selectedVoucher.number.toString().padStart(8, '0')}
              </small>
            </div>
            <div className="invoice-status-stack">
              <div className="invoice-status-badge">{authorization?.source === 'wsfev1' ? 'ARCA / WSFEv1' : 'Modo demo'}</div>
              <div className="invoice-status-note">
                {authorization ? resolveAuthorizationHeadline(authorization.source) : 'Borrador sin validez fiscal'}
              </div>
            </div>
          </div>

          <div className="invoice-sheet-grid">
            <article>
              <p className="result-label">Domicilio comercial</p>
              {account.organization.fiscalAddress ? <span>{buildIssuerAddress(account.organization)}</span> : null}
              <span>
                {account.organization.activityStartDate
                  ? `Inicio de actividad ${formatDate(account.organization.activityStartDate)}`
                  : 'Inicio de actividad pendiente de confirmar'}
              </span>
            </article>
            <article>
              <p className="result-label">Cliente</p>
              <strong>{selectedVoucher.customerName}</strong>
              <span>Documento {selectedVoucher.customerDocument}</span>
              <span>{selectedClient?.iva ?? 'Condicion no informada'}</span>
              <span>{selectedClient?.city ?? 'Ciudad no informada'}</span>
            </article>
            <article>
              <p className="result-label">Datos del comprobante</p>
              <strong>{formatDate(selectedVoucher.issuedAt)}</strong>
              <span>Punto de venta {selectedVoucher.pointOfSale.toString().padStart(4, '0')}</span>
              <span>{account.organization.pointsOfSale[0]?.description ?? 'Sucursal Demo'}</span>
              <span>{authorization ? resolveAuthorizationHeadline(authorization.source) : selectedVoucher.status}</span>
            </article>
          </div>

          <div className="invoice-meta-strip">
            <div>
              <span className="result-label">Concepto</span>
              <strong>Servicios</strong>
            </div>
            <div>
              <span className="result-label">Moneda</span>
              <strong>PES</strong>
            </div>
            <div>
              <span className="result-label">Condicion frente al IVA del receptor</span>
              <strong>{selectedClient?.iva ?? 'Consumidor final'}</strong>
            </div>
          </div>

          <div className="invoice-lines">
            <div className="invoice-lines-head">
              <span>Descripcion</span>
              <span>Cantidad</span>
              <span>Precio unitario</span>
              <span>Importe</span>
            </div>
            <div className="invoice-lines-body">
              <span>Servicio profesional demo</span>
              <span>1</span>
              <span>{formatCurrency(selectedVoucher.total)}</span>
              <strong>{formatCurrency(selectedVoucher.total)}</strong>
            </div>
          </div>

          <div className="invoice-summary-card">
            <div className="invoice-summary-row">
              <span>Importe neto gravado</span>
              <strong>{formatCurrency(selectedVoucher.total)}</strong>
            </div>
            <div className="invoice-summary-row">
              <span>IVA</span>
              <strong>$ 0,00</strong>
            </div>
            <div className="invoice-summary-row">
              <span>Otros tributos</span>
              <strong>$ 0,00</strong>
            </div>
            <div className="invoice-summary-row invoice-summary-row-total">
              <span>Importe total</span>
              <strong>{formatCurrency(selectedVoucher.total)}</strong>
            </div>
          </div>

          <div className="invoice-fiscal-band">
            <div>
              <span className="result-label">Comprobante</span>
              <strong>{selectedVoucher.pointOfSale.toString().padStart(4, '0')}-{selectedVoucher.number.toString().padStart(8, '0')}</strong>
            </div>
            <div>
              <span className="result-label">Fecha</span>
              <strong>{formatDate(selectedVoucher.issuedAt)}</strong>
            </div>
            <div>
              <span className="result-label">Concepto</span>
              <strong>Servicios</strong>
            </div>
          </div>

          <div className="invoice-auth-grid">
            <article>
              <p className="result-label">CAE</p>
              <strong>{authorization?.cae ?? 'Pendiente de autorizacion'}</strong>
              <span>{authorization ? resolveAuthorizationCopy(authorization.source) : 'Todavia no se solicito CAE real a ARCA'}</span>
            </article>
            <article>
              <p className="result-label">Vencimiento CAE</p>
              <strong>{authorization ? formatDate(authorization.caeDueDate) : 'Sin definir'}</strong>
              <span>{authorization?.source === 'wsfev1' ? 'Fecha informada por ARCA' : 'Dato demostrativo hasta integrar WSFEv1'}</span>
            </article>
            <article className="invoice-qr-card">
              <p className="result-label">{authorization?.qrLabel ?? 'QR AFIP'}</p>
              {qrDataUrl ? <img className="invoice-qr-image" src={qrDataUrl} alt="QR fiscal demo del comprobante" /> : <div className="invoice-qr-placeholder">QR</div>}
              <span>{authorization?.source === 'wsfev1' ? 'Payload fiscal listo para validacion real.' : 'URL QR con payload AFIP base64 para simulacion visual.'}</span>
            </article>
          </div>

          <p className="invoice-legend">
            Documento generado en modo demo. Si el comprobante no tiene CAE real, debe tratarse como borrador comercial y no como comprobante fiscal definitivo.
          </p>
        </section>
      ) : null}
    </main>
  );
}

function handlePrint() {
  window.print();
}

async function handleDownloadPdf(input: {
  voucher: DemoVoucher;
  client: DemoClient | null;
  issuerName: string;
  issuerFantasyName?: string;
  issuerDocument: string;
  issuerTaxCondition: string;
  issuerAddress?: string;
  pointOfSaleDescription: string;
  qrDataUrl: string | null;
}) {
  const { client, issuerAddress, issuerDocument, issuerFantasyName, issuerName, issuerTaxCondition, pointOfSaleDescription, qrDataUrl, voucher } = input;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 18;
  let cursorY = 20;

  pdf.setDrawColor(40, 40, 40);
  pdf.rect(12, 12, 186, 263);
  pdf.rect(12, 12, 120, 44);
  pdf.rect(132, 12, 66, 44);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(issuerName, left, cursorY);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  cursorY += 8;
  pdf.text(`CUIT: ${issuerDocument}`, left, cursorY);
  cursorY += 6;
  pdf.text(`Condicion IVA: ${issuerTaxCondition}`, left, cursorY);
  if (issuerFantasyName) {
    cursorY += 6;
    pdf.text(`Fantasia: ${issuerFantasyName}`, left, cursorY);
  }
  if (issuerAddress) {
    cursorY += 6;
    pdf.text(`Domicilio: ${issuerAddress}`, left, cursorY);
  }
  cursorY += 6;
  pdf.text(`Punto de venta: ${voucher.pointOfSale.toString().padStart(4, '0')} · ${pointOfSaleDescription}`, left, cursorY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(30);
  pdf.text(resolveVoucherLetter(voucher.voucherType), 165, 26, { align: 'center' });
  pdf.setFontSize(15);
  pdf.text(voucher.voucherType.toUpperCase(), 165, 36, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text('ORIGINAL', 165, 44, { align: 'center' });
  pdf.text(`Punto de venta: ${voucher.pointOfSale.toString().padStart(4, '0')}`, 165, 52, { align: 'center' });
  pdf.text(`Comp. nro: ${voucher.number.toString().padStart(8, '0')}`, 165, 58, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Fecha de emision: ${formatDate(voucher.issuedAt)}`, left, 64);
  const authorization = resolveVoucherAuthorization({ voucher, client, account: null });

  pdf.text(authorization ? resolveAuthorizationHeadline(authorization.source) : 'Borrador sin validez fiscal', 198 - left, 64, { align: 'right' });

  cursorY = 78;
  pdf.setDrawColor(190, 174, 160);
  pdf.line(left, cursorY, 192, cursorY);
  cursorY += 10;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Cliente', left, cursorY);
  pdf.setFont('helvetica', 'normal');
  cursorY += 7;
  pdf.text(client?.taxName ?? voucher.customerName, left, cursorY);
  cursorY += 6;
  pdf.text(`Documento: ${voucher.customerDocument}`, left, cursorY);
  cursorY += 6;
  pdf.text(`Condicion IVA: ${client?.iva ?? 'No informada'}`, left, cursorY);
  cursorY += 6;
  pdf.text('Concepto: Servicios', left, cursorY);
  cursorY += 14;

  pdf.setFillColor(244, 239, 230);
  pdf.rect(left, cursorY, 174, 10, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.text('Descripcion', left + 2, cursorY + 6.5);
  pdf.text('Cant.', 110, cursorY + 6.5);
  pdf.text('P. unitario', 132, cursorY + 6.5);
  pdf.text('Importe', 178, cursorY + 6.5, { align: 'right' });
  cursorY += 18;

  pdf.setFont('helvetica', 'normal');
  pdf.text('Servicio profesional demo', left + 2, cursorY);
  pdf.text('1', 112, cursorY);
  pdf.text(formatCurrency(voucher.total), 132, cursorY);
  pdf.text(formatCurrency(voucher.total), 178, cursorY, { align: 'right' });
  cursorY += 18;

  pdf.line(120, cursorY, 192, cursorY);
  cursorY += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Importe otros tributos: $ 0,00', 120, cursorY);
  cursorY += 7;
  pdf.text('IVA: $ 0,00', 120, cursorY);
  cursorY += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Importe total', 150, cursorY);
  pdf.text(formatCurrency(voucher.total), 178, cursorY, { align: 'right' });

  cursorY += 18;
  pdf.setDrawColor(190, 174, 160);
  pdf.rect(left, cursorY - 6, 174, 20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CAE', left + 4, cursorY + 1);
  pdf.text(authorization?.cae ?? 'Pendiente de autorizacion', 70, cursorY + 1);
  pdf.text('Vto. CAE', 140, cursorY + 1);
  pdf.text(authorization ? formatDate(authorization.caeDueDate) : 'Sin definir', 190, cursorY + 1, { align: 'right' });

  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, 'PNG', 152, cursorY + 12, 28, 28);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(authorization?.qrLabel ?? 'QR AFIP', 166, cursorY + 44, { align: 'center' });
  }

  cursorY += 24;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Documento generado en modo demo. Sin CAE real, no tiene validez fiscal definitiva.', left, cursorY, { maxWidth: 160 });

  pdf.save(buildVoucherFileName(voucher));
}

async function handleAuthorizeVoucher(input: {
  account: NonNullable<ReturnType<typeof useDemoSession>['account']>;
  client: DemoClient | null;
  voucher: DemoVoucher;
  setAuthorizationMessage: (value: string | null) => void;
  setAuthorizationState: (value: 'idle' | 'submitting' | 'success' | 'error') => void;
  setVouchers: (value: DemoVoucher[]) => void;
}) {
  const { account, client, setAuthorizationMessage, setAuthorizationState, setVouchers, voucher } = input;

  if (voucher.authorization?.source === 'wsfev1') {
    setAuthorizationState('success');
    setAuthorizationMessage('Este comprobante ya fue autorizado por ARCA.');
    return;
  }

  setAuthorizationState('submitting');
  setAuthorizationMessage(null);

  try {
    const response = await fetch(`${defaultApiBaseUrl}/vouchers/authorize-wsfev1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization: {
          cuit: account.organization.cuit.replace(/\D/g, ''),
          environment: account.organization.environment,
        },
        voucher: {
          localId: voucher.id,
          voucherType: voucher.voucherType,
          pointOfSale: voucher.pointOfSale,
          issuedAt: voucher.issuedAt,
          total: voucher.total,
          customerName: voucher.customerName,
          customerDocument: voucher.customerDocument,
          customerIvaCondition: client?.iva,
        },
      }),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
      throw new Error(errorPayload?.message ?? 'No se pudo autorizar el comprobante en ARCA.');
    }

    const data = (await response.json()) as VoucherAuthorizationResponse;

    updateDemoVoucher(voucher.id, {
      number: data.voucher.number,
      issuedAt: data.voucher.issuedAt,
      status: data.voucher.status,
      authorization: data.authorization,
    });

    setVouchers(readDemoVouchers());
    setAuthorizationState('success');
    setAuthorizationMessage(`Comprobante autorizado por ARCA con CAE ${data.authorization.cae}.`);
  } catch (error) {
    setAuthorizationState('error');
    setAuthorizationMessage(error instanceof Error ? error.message : 'No se pudo autorizar el comprobante en ARCA.');
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
  }).format(new Date(value));
}

function buildVoucherFileName(voucher: DemoVoucher) {
  return `${voucher.voucherType.toLowerCase().replaceAll(/\s+/g, '-')}-${voucher.pointOfSale.toString().padStart(4, '0')}-${voucher.number.toString().padStart(8, '0')}.pdf`;
}

function resolveVoucherLetter(voucherType: string) {
  const match = voucherType.match(/\b([A-Z])$/);
  return match?.[1] ?? 'C';
}

function buildFiscalQrPayload(input: {
  voucher: DemoVoucher;
  client: DemoClient | null;
  account: NonNullable<ReturnType<typeof useDemoSession>['account']>;
}) {
  const { account, client, voucher } = input;

  const payload = {
    ver: 1,
    fecha: voucher.issuedAt.slice(0, 10),
    cuit: sanitizeDocument(account.organization.cuit),
    ptoVta: voucher.pointOfSale,
    tipoCmp: mapVoucherTypeToCode(voucher.voucherType),
    nroCmp: voucher.number,
    importe: Number(voucher.total.toFixed(2)),
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: mapRecipientDocumentType(client?.document ?? voucher.customerDocument),
    nroDocRec: sanitizeDocument(client?.document ?? voucher.customerDocument),
    tipoCodAut: 'E',
    codAut: Number(buildDemoAuthorizationCode(voucher)),
  };

  return `https://www.afip.gob.ar/fe/qr/?p=${encodeAfipQrPayload(payload)}`;
}

function buildDemoAuthorizationCode(voucher: DemoVoucher) {
  const pointOfSale = voucher.pointOfSale.toString().padStart(4, '0');
  const number = voucher.number.toString().padStart(10, '0');

  return `${pointOfSale}${number}`;
}

function resolveVoucherAuthorization(input: {
  voucher: DemoVoucher;
  client: DemoClient | null;
  account: NonNullable<ReturnType<typeof useDemoSession>['account']> | null;
}) {
  const { account, client, voucher } = input;

  if (voucher.authorization) {
    return voucher.authorization;
  }

  if (voucher.status !== 'Autorizacion simulada' || !account) {
    return null;
  }

  return {
    cae: buildDemoAuthorizationCode(voucher),
    caeDueDate: voucher.issuedAt,
    qrPayloadUrl: buildFiscalQrPayload({ voucher, client, account }),
    qrLabel: 'QR AFIP demo',
    source: 'demo' as const,
  };
}

function resolveAuthorizationHeadline(source: 'demo' | 'wsfev1') {
  return source === 'wsfev1' ? 'Autorizado por ARCA' : 'Autorizacion simulada';
}

function resolveAuthorizationCopy(source: 'demo' | 'wsfev1') {
  return source === 'wsfev1' ? 'CAE emitido desde WSFEv1 y persistido en el comprobante.' : 'CAE demo con formato numerico para simulacion local';
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

function sanitizeDocument(documentValue: string) {
  return Number(documentValue.replaceAll(/\D/g, ''));
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
  const digits = documentValue.replaceAll(/\D/g, '');

  if (digits.length === 11) {
    return 80;
  }

  if (digits.length >= 7 && digits.length <= 8) {
    return 96;
  }

  return 99;
}

function buildIssuerAddress(organization: {
  fiscalAddress?: string;
  locality?: string;
  postalCode?: string;
  province?: string;
}) {
  return [organization.fiscalAddress, organization.locality, organization.postalCode, organization.province].filter(Boolean).join(', ');
}