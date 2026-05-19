import type { AuthorizeVoucherInput, AuthorizeVoucherResponse } from '@facturacion/contracts';

export interface FiscalVoucherAuthorizer {
  authorizeWsfev1(input: AuthorizeVoucherInput): Promise<AuthorizeVoucherResponse>;
}

export class VoucherService {
  constructor(private readonly authorizer: FiscalVoucherAuthorizer) {}

  async authorizeWsfev1(input: AuthorizeVoucherInput): Promise<AuthorizeVoucherResponse> {
    return this.authorizer.authorizeWsfev1(input);
  }
}