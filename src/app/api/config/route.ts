import { NextRequest, NextResponse } from 'next/server';
import { getClient, ensureTables } from '@/lib/db';

const DEFAULT_CONFIG: Record<string, string> = {
  pix_key: 'adrianviniciusdeoliveiraa@gmail.com',
  pix_holder: 'ADRIAN VINICIUS DE OLIVEIRA',
  credit_packages: JSON.stringify([
    { credits: 5, price: 5, popular: false },
    { credits: 15, price: 12, popular: true },
    { credits: 30, price: 22, popular: false },
    { credits: 50, price: 35, popular: false },
    { credits: 100, price: 60, popular: true },
  ]),
};

async function verifyAdmin(request: NextRequest) {
  return request.headers.get('x-admin-key') === process.env.ADMIN_SECRET;
}

export async function GET() {
  try {
    await ensureTables();
    const client = getClient();

    const keys = Object.keys(DEFAULT_CONFIG);
    const placeholders = keys.map(() => '?').join(',');
    const rows = await client.execute({
      sql: `SELECT * FROM "SiteConfig" WHERE "key" IN (${placeholders})`,
      args: keys,
    });

    const config: Record<string, string> = { ...DEFAULT_CONFIG };
    for (const row of rows.rows as any[]) {
      config[row.key] = row.value;
    }

    // Parse packages
    let packages;
    try {
      packages = JSON.parse(config.credit_packages);
    } catch {
      packages = JSON.parse(DEFAULT_CONFIG.credit_packages);
    }

    return NextResponse.json({
      pixKey: config.pix_key,
      pixHolder: config.pix_holder,
      packages,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    await ensureTables();
    const client = getClient();
    const body = await request.json();
    const { pixKey, pixHolder, packages } = body;

    const upsert = async (key: string, value: string) => {
      await client.execute({
        sql: `INSERT INTO "SiteConfig" ("key", "value", "updatedAt") VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT("key") DO UPDATE SET "value" = ?, "updatedAt" = CURRENT_TIMESTAMP`,
        args: [key, value, value],
      });
    };

    if (pixKey !== undefined) await upsert('pix_key', pixKey);
    if (pixHolder !== undefined) await upsert('pix_holder', pixHolder);
    if (packages !== undefined) await upsert('credit_packages', JSON.stringify(packages));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}