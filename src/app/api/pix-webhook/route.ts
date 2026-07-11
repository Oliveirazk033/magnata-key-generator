import { NextRequest, NextResponse } from 'next/server';
import { getClient, ensureTables } from '@/lib/db';
import { randomUUID } from 'crypto';

/**
 * POST /api/pix-webhook
 * Recebe dados de um PIX detectado pelo monitor Python e auto-aprova
 * o pedido correspondente, creditando o usuário.
 *
 * Autenticação via header x-webhook-secret (mesmo valor que ADMIN_SECRET)
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticação do webhook
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (webhookSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    await ensureTables();
    const client = getClient();

    const body = await request.json();
    const { amount, sender, description, messageId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor do PIX obrigatorio' }, { status: 400 });
    }

    // Busca pedido pendente com valor correspondente (comparação em centavos para evitar float issues)
    const amountCents = Math.round(amount * 100);

    const orders = await client.execute({
      sql: `SELECT * FROM "PaymentOrder" WHERE status = 'pending' ORDER BY "createdAt" ASC`,
      args: [],
    });

    // Procura pedido com valor igual (comparação em centavos)
    let matchedOrder: any = null;
    for (const row of orders.rows) {
      const orderAmountCents = Math.round(Number(row.amount) * 100);
      if (orderAmountCents === amountCents) {
        matchedOrder = row as any;
        break;
      }
    }

    if (!matchedOrder) {
      return NextResponse.json({
        success: false,
        message: `Nenhum pedido pendente encontrado para R$ ${Number(amount).toFixed(2)}`,
        pendingOrders: orders.rows.map((r: any) => ({
          id: r.id,
          amount: Number(r.amount).toFixed(2),
          credits: r.credits,
          buyerName: r.buyerName,
        })),
      }, { status: 404 });
    }

    const order = matchedOrder;

    // Marca como aprovado
    await client.execute({
      sql: `UPDATE "PaymentOrder" SET status = 'approved', adminNotes = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [`Auto-aprovado via PIX Monitor | Remetente: ${sender || 'N/A'} | MsgID: ${messageId || 'N/A'}`, order.id],
    });

    // Credita o usuário
    await client.execute({
      sql: `UPDATE "User" SET credits = credits + ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [order.credits, order.userId],
    });

    // Busca dados atualizados do usuário
    const userResult = await client.execute({
      sql: `SELECT credits, displayName FROM "User" WHERE id = ?`,
      args: [order.userId],
    });
    const user = userResult.rows[0] as any;

    // Notifica o usuário (ignora erro se userId não existir)
    try {
      await client.execute({
        sql: `INSERT INTO "Notification" (id, userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, 'credit', 0, CURRENT_TIMESTAMP)`,
        args: [
          randomUUID(),
          'Pagamento aprovado automaticamente!',
          `Seu pagamento de R$${Number(order.amount).toFixed(2)} (${order.credits} creditos) foi detectado e aprovado automaticamente! Novo saldo: ${user?.credits || 0} creditos.`,
          order.userId,
        ],
      });
    } catch (_) { /* userId pode não existir mais */ }

    // Registra transação (ignora erro se userId não existir)
    try {
      await client.execute({
        sql: `INSERT INTO "Transaction" (id, keyId, productName, credits, buyerInfo, createdAt, userId) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        args: [
          randomUUID(),
          `pix-auto-${order.id}`,
          `Compra de Creditos (Auto) - R$${Number(order.amount).toFixed(2)}`,
          order.credits,
          `Nome: ${order.buyerName} | Email: ${order.buyerEmail} | CPF: ${order.buyerCpf} | PIX de: ${sender || 'N/A'}`,
          order.userId,
        ],
      });
    } catch (_) { /* FK pode falhar se user não existe */ }

    // Notifica admin sobre aprovação automática
    await client.execute({
      sql: `INSERT INTO "Notification" (id, userId, title, message, type, isRead, createdAt) VALUES (?, NULL, ?, ?, 'announcement', 0, CURRENT_TIMESTAMP)`,
      args: [
        randomUUID(),
        'Pedido auto-aprovado via PIX',
        `${order.credits} creditos - R$${Number(order.amount).toFixed(2)} | ${order.buyerName} | PIX de: ${sender || 'N/A'}`,
      ],
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      credits: order.credits,
      amount: Number(order.amount).toFixed(2),
      buyerName: order.buyerName,
      message: `Pedido ${order.id} aprovado automaticamente! ${order.credits} creditos adicionados.`,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}