import { NextRequest, NextResponse } from 'next/server';
import { getClient, ensureTables } from '@/lib/db';
import { randomUUID } from 'crypto';

async function verifyAdmin(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_SECRET;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    await ensureTables();
    const client = getClient();
    const { id: orderId } = await params;

    const { action, adminNotes } = await request.json();

    if (!orderId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
    }

    const orderResult = await client.execute({
      sql: `SELECT * FROM "PaymentOrder" WHERE id = ? AND status = 'pending'`,
      args: [orderId],
    });

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Pedido nao encontrado ou ja processado' }, { status: 404 });
    }

    const order = orderResult.rows[0] as any;
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await client.execute({
      sql: `UPDATE "PaymentOrder" SET status = ?, adminNotes = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [newStatus, adminNotes || null, orderId],
    });

    if (action === 'approve') {
      await client.execute({
        sql: `UPDATE "User" SET credits = credits + ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [order.credits, order.userId],
      });

      const userResult = await client.execute({
        sql: `SELECT credits, displayName FROM "User" WHERE id = ?`,
        args: [order.userId],
      });
      const user = userResult.rows[0] as any;

      await client.execute({
        sql: `INSERT INTO "Notification" (id, userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, 'credit', 0, CURRENT_TIMESTAMP)`,
        args: [
          randomUUID(),
          'Pagamento aprovado!',
          `Seu pedido de ${order.credits} creditos (R$${Number(order.amount).toFixed(2)}) foi aprovado! Novo saldo: ${user?.credits || 0} creditos.`,
          order.userId,
        ],
      });

      await client.execute({
        sql: `INSERT INTO "Transaction" (id, keyId, productName, credits, buyerInfo, createdAt, userId) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        args: [
          randomUUID(),
          `order-${orderId}`,
          `Compra de Creditos - R$${Number(order.amount).toFixed(2)}`,
          order.credits,
          `Nome: ${order.buyerName} | Email: ${order.buyerEmail} | CPF: ${order.buyerCpf}`,
          order.userId,
        ],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO "Notification" (id, userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, 'announcement', 0, CURRENT_TIMESTAMP)`,
        args: [
          randomUUID(),
          'Pagamento recusado',
          `Seu pedido de ${order.credits} creditos (R$${Number(order.amount).toFixed(2)}) foi recusado.${adminNotes ? ' Motivo: ' + adminNotes : ''}`,
          order.userId,
        ],
      });
    }

    return NextResponse.json({ success: true, newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}