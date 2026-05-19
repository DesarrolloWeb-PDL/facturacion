import { Arca } from '@arcasdk/core';
import type { AuthorizeVoucherInput, AuthorizeVoucherResponse } from '@facturacion/contracts';

import type { FiscalVoucherAuthorizer } from './voucher-service.js';

type ServiceErrorOptions = {
  code: string;
  message: string;
  statusCode: number;
};

class ServiceError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(options: ServiceErrorOptions) {
    super(options.message);
    this.code = options.code;
    this.statusCode = options.statusCode;
  }
}

export class ArcaWsfev1Service implements FiscalVoucherAuthorizer {
  async authorizeWsfev1(input: AuthorizeVoucherInput): Promise<AuthorizeVoucherResponse> {
    const cert = process.env.ARCA_CERT;
    const key = process.env.ARCA_KEY;

    if (!cert || !key) {
      throw new ServiceError({
        code: 'ARCA_WSFEV1_NOT_CONFIGURED',
        message: 'Faltan ARCA_CERT y ARCA_KEY para autorizar comprobantes por WSFEv1.',
        statusCode: 503,
      });
    }

    const voucherTypeCode = mapVoucherTypeToCode(input.voucher.voucherType);
    const customerDocument = normalizeDocument(input.voucher.customerDocument);
    const cuit = normalizeDocument(input.organization.cuit);

    const arca = new Arca({
      cert,
      key,
      cuit,
      production: input.organization.environment === 'production',
      useHttpsAgent: true,
    });

    try {
      const lastVoucherResponse = await arca.electronicBillingService.getLastVoucher(input.voucher.pointOfSale, voucherTypeCode);
      const lastVoucherNumber = Number(lastVoucherResponse.cbteNro ?? 0);
      const nextVoucherNumber = lastVoucherNumber + 1;
      const issueDate = input.voucher.issuedAt.slice(0, 10);

      const authorizationResponse = await arca.electronicBillingService.createVoucher({
        CantReg: 1,
        PtoVta: input.voucher.pointOfSale,
        CbteTipo: voucherTypeCode,
        Concepto: 2,
        DocTipo: mapRecipientDocumentType(customerDocument),
        DocNro: customerDocument,
        CbteDesde: nextVoucherNumber,
        CbteHasta: nextVoucherNumber,
        CbteFch: issueDate.replace(/-/g, ''),
        ImpTotal: roundAmount(input.voucher.total),
        ImpTotConc: 0,
        ImpNeto: roundAmount(input.voucher.total),
        ImpOpEx: 0,
        ImpIVA: 0,
        ImpTrib: 0,
        MonId: 'PES',
        MonCotiz: 1,
        CondicionIVAReceptorId: mapRecipientIvaCondition(input.voucher.customerIvaCondition),
      });

      const cae = String(authorizationResponse.cae ?? '');
      const caeDueDateRaw = String(authorizationResponse.caeFchVto ?? '');
      const result = String(authorizationResponse.response.FeCabResp.Resultado ?? '');
      const reproceso = authorizationResponse.response.FeCabResp.Reproceso;

      if (!cae || !caeDueDateRaw) {
        throw new ServiceError({
          code: 'ARCA_WSFEV1_INVALID_RESPONSE',
          message: 'ARCA no devolvio CAE o fecha de vencimiento.',
          statusCode: 502,
        });
      }

      return {
        voucher: {
          localId: input.voucher.localId,
          voucherType: input.voucher.voucherType,
          pointOfSale: input.voucher.pointOfSale,
          number: nextVoucherNumber,
          issuedAt: input.voucher.issuedAt,
          status: 'Autorizado ARCA',
        },
        authorization: {
          cae,
          caeDueDate: toIsoDate(caeDueDateRaw),
          qrPayloadUrl: buildFiscalQrUrl({
            issueDate,
            cuit,
            pointOfSale: input.voucher.pointOfSale,
            voucherTypeCode,
            voucherNumber: nextVoucherNumber,
            total: roundAmount(input.voucher.total),
            customerDocument,
            cae,
          }),
          qrLabel: 'QR AFIP',
          source: 'wsfev1',
        },
        arca: {
          result,
          reproceso: reproceso ? String(reproceso) : undefined,
        },
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Error inesperado al autorizar en ARCA';
      throw new ServiceError({
        code: 'ARCA_WSFEV1_REQUEST_FAILED',
        message,
        statusCode: 502,
      });
    }
  }
}

export function isVoucherServiceError(error: unknown): error is { code: string; message: string; statusCode: number } {
  return Boolean(error && typeof error === 'object' && 'code' in error && 'statusCode' in error);
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
      throw new ServiceError({
        code: 'UNSUPPORTED_VOUCHER_TYPE',
        message: `Tipo de comprobante no soportado por WSFEv1: ${voucherType}`,
        statusCode: 400,
      });
  }
}

function mapRecipientDocumentType(documentValue: number) {
  const digits = documentValue.toString();

  if (digits.length === 11) {
    return 80;
  }

  if (digits.length === 8) {
    return 96;
  }

  return 99;
}

function mapRecipientIvaCondition(ivaCondition?: string) {
  switch (ivaCondition?.toLowerCase()) {
    case 'iva responsable inscripto':
    case 'responsable inscripto':
      return 1;
    case 'consumidor final':
      return 5;
    case 'monotributo':
    case 'monotributista':
      return 6;
    case 'exento':
      return 4;
    default:
      return 5;
  }
}

function normalizeDocument(value: string) {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    throw new ServiceError({
      code: 'INVALID_DOCUMENT',
      message: 'No se pudo normalizar el documento fiscal enviado.',
      statusCode: 400,
    });
  }

  return Number(digits);
}

function roundAmount(value: number) {
  return Number(value.toFixed(2));
}

function toIsoDate(value: string) {
  if (!/^\d{8}$/.test(value)) {
    throw new ServiceError({
      code: 'INVALID_CAE_DUE_DATE',
      message: 'La fecha de vencimiento del CAE no tiene el formato esperado.',
      statusCode: 502,
    });
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
}

function buildFiscalQrUrl(input: {
  issueDate: string;
  cuit: number;
  pointOfSale: number;
  voucherTypeCode: number;
  voucherNumber: number;
  total: number;
  customerDocument: number;
  cae: string;
}) {
  const payload = {
    ver: 1,
    fecha: input.issueDate,
    cuit: input.cuit,
    ptoVta: input.pointOfSale,
    tipoCmp: input.voucherTypeCode,
    nroCmp: input.voucherNumber,
    importe: input.total,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: mapRecipientDocumentType(input.customerDocument),
    nroDocRec: input.customerDocument,
    tipoCodAut: 'E',
    codAut: Number(input.cae),
  };

  return `https://www.afip.gob.ar/fe/qr/?p=${encodePayload(payload)}`;
}

function encodePayload(payload: Record<string, number | string>) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}