import { NextRequest, NextResponse } from 'next/server';
import { getClient, ensureTables } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    await ensureTables();
    const client = getClient();

    const userId = request.headers.get('x-user-id');
    const adminKey = request.headers.get('x-admin-key');

    if (adminKey === process.env.ADMIN_SECRET) {
      // Admin: return all orders with user info
      const status = request.nextUrl.searchParams.get('status') || 'pending';
      const validStatuses = ['pending', 'approved', 'rejected'];
      const filterStatus = validStatuses.includes(status) ? status : 'pending';

      const orders = await client.execute({
        sql: `SELECT o.*, u.username, u.displayName as userDisplayName FROM "PaymentOrder" o LEFT JOIN "User" u ON o.userId = u.id WHERE o.status = ? ORDER BY o.createdAt DESC`,
        args: [filterStatus],
      });

      return NextResponse.json({ orders: orders.rows });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    // User: return their own orders
    const orders = await client.execute({
      sql: `SELECT * FROM "PaymentOrder" WHERE userId = ? ORDER BY createdAt DESC`,
      args: [userId],
    });

    return NextResponse.json({ orders: orders.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables();
    const client = getClient();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { credits, amount, buyerName, buyerEmail, buyerCpf, pixKey } = body;

    if (!credits || !amount || !buyerName || !buyerEmail || !buyerCpf) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatorios' }, { status: 400 });
    }

    if (credits < 1 || amount < 1) {
      return NextResponse.json({ error: 'Valores invalidos' }, { status: 400 });
    }

    // Simple CPF format validation (just basic check)
    const cleanCpf = buyerCpf.replace(/\D/g, '');
    if (cleanCpf.length < 11) {
      return NextResponse.json({ error: 'CPF invalido' }, { status: 400 });
    }

    const id = randomUUID();

    await client.execute({
      sql: `INSERT INTO "PaymentOrder" (id, userId, credits, amount, buyerName, buyerEmail, buyerCpf, status, pixKey, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [id, userId, credits, amount, buyerName, buyerEmail, cleanCpf, pixKey || null],
    });

    // Notify admin
    const userResult = await client.execute({
      sql: `SELECT username, displayName FROM "User" WHERE id = ?`,
      args: [userId],
    });
    const user = userResult.rows[0] as any;

    await client.execute({
      sql: `INSERT INTO "Notification" (id, userId, title, message, type, isRead, createdAt) VALUES (?, NULL, ?, ?, 'announcement', 0, CURRENT_TIMESTAMP)`,
      args: [
        randomUUID(),
        `Novo pedido de ${user?.displayName || user?.username || 'usuario'}`,
        `${credits} creditos - R$${Number(amount).toFixed(2)} | ${buyerName} (${buyerEmail}) | CPF: ${cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`,
      ],
    });

    return NextResponse.json({ success: true, orderId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}