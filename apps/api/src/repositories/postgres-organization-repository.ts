import { Pool } from 'pg';

import type { OrganizationDraft } from '@facturacion/domain';

import type { OrganizationRepository, StoredOrganization } from './organization-repository.js';

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: OrganizationDraft): Promise<StoredOrganization> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      const organizationResult = await client.query<{
        id: string;
        legal_name: string;
        cuit: string;
        ingresos_brutos: string | null;
        activity_start_date: string;
        iva_condition_code: string;
        tax_regime: string | null;
        created_at: string;
      }>(
        `
          insert into organizations (
            id,
            legal_name,
            cuit,
            ingresos_brutos,
            activity_start_date,
            iva_condition_code,
            tax_regime
          ) values ($1, $2, $3, $4, $5, $6, $7)
          returning id, legal_name, cuit::text, ingresos_brutos, activity_start_date::text, iva_condition_code, tax_regime, created_at::text
        `,
        [
          input.id,
          input.legalName,
          input.cuit,
          input.ingresosBrutos ?? null,
          input.activityStartDate,
          input.ivaConditionCode,
          input.taxRegime ?? null,
        ],
      );

      for (const pointOfSale of input.pointsOfSale) {
        await client.query(
          `
            insert into points_of_sale (
              organization_id,
              pos_number,
              description,
              environment,
              active
            ) values ($1, $2, $3, $4, true)
          `,
          [input.id, pointOfSale.posNumber, pointOfSale.description ?? null, input.environment],
        );
      }

      await client.query('commit');

      const organization = organizationResult.rows[0];

      return {
        id: organization.id,
        legalName: organization.legal_name,
        cuit: organization.cuit,
        ingresosBrutos: organization.ingresos_brutos ?? undefined,
        activityStartDate: organization.activity_start_date,
        ivaConditionCode: organization.iva_condition_code,
        taxRegime: organization.tax_regime ?? undefined,
        environment: input.environment,
        pointsOfSale: [...input.pointsOfSale],
        createdAt: organization.created_at,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
