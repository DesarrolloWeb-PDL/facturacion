export type FiscalEnvironment = 'testing' | 'production';

export type PointOfSaleDraft = {
  posNumber: number;
  description?: string;
};

export type OrganizationDraft = {
  id: string;
  legalName: string;
  cuit: string;
  ivaConditionCode: string;
  ingresosBrutos?: string;
  activityStartDate: string;
  taxRegime?: string;
  environment: FiscalEnvironment;
  pointsOfSale: PointOfSaleDraft[];
};

export function createOrganizationId() {
  return crypto.randomUUID();
}

export function createOrganizationDraft(input: OrganizationDraft): OrganizationDraft {
  return {
    ...input,
    pointsOfSale: [...input.pointsOfSale],
  };
}
