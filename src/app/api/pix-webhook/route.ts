import { NextRequest, NextResponse } from 'next/server';
import { getClient, ensureTables } from '@/lib/db';
import { randomUUID } from 'crypto';

/**
 * Normaliza um nome para comparação: remove acentos, lowercase, trim, espaços extras
 */
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Compara dois nomes de forma flexível.
 * Retorna true se os nomes forem considerados iguais.
 * - Nome completo normalizado igual
 * - Primeiro nome igual E sobrenome igual (independente da ordem dos nomes do meio)
 * - Pelo menos as 2 primeiras palavras iguais (nome + primeiro sobrenome)
 */
function namesMatch(pixSender: string, buyerName: string): boolean {
  const a = normalizeName(pixSender);
  const b = normalizeName(buyerName);

  if (!a || !b) return false;

  // 1) Nome completo igual
  if (a === b) return true;

  const wordsA = a.split(' ').filter(Boolean);
  const wordsB = b.split(' ').filter(Boolean);

  // 2) Pelo menos as 2 primeiras palavras batem (nome + sobrenome)
  if (wordsA.length >= 2 && wordsB.length >= 2) {
    if (wordsA[0] === wordsB[0] && wordsA[1] === wordsB[1]) return true;
  }

  // 3) Primeiro nome igual e os sobrenomes se intercruzam
  if (wordsA[0] === wordsB[0]) {
    const lastA = wordsA[wordsA.length - 1];
    const lastB = wordsB[wordsB.length - 1];
    if (lastA === lastB) return true;
  }

  return false;
}

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

    // Procura pedido com valor E nome do remetente correspondentes
    let matchedOrder: any = null;
    const skippedOrders: any[] = [];

    for (const row of orders.rows) {
      const orderAmountCents = Math.round(Number(row.amount) * 100);
      if (orderAmountCents !== amountCents) continue;

      // Verifica se o nome do remetente do PIX bate com o nome do comprador
      if (sender && row.buyerName) {
        if (!namesMatch(sender, row.buyerName)) {
          skippedOrders.push({
            id: row.id,
            amount: Number(row.amount).toFixed(2),
            credits: row.credits,
            buyerName: row.buyerName,
            reason: 'nome nao confere',
          });
          continue;
        }
      }

      matchedOrder = row as any;
      break;
    }

    if (!matchedOrder) {
      return NextResponse.json({
        success: false,
        message: `Nenhum pedido pendente encontrado para R$ ${Number(amount).toFixed(2)} com nome "${sender || 'N/A'}"`,
        pendingOrders: orders.rows.map((r: any) => ({
          id: r.id,
          amount: Number(r.amount).toFixed(2),
          credits: r.credits,
          buyerName: r.buyerName,
        })),
        skippedOrders,
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

    // Notifica o usuário (ignora erro silenciosamente)
    try {
      await client.execute({
        sql: `INSERT INTO "Notification" (id, userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, 'credit', 0, CURRENT_TIMESTAMP)`,
        args: [
          randomUUID(),
          order.userId,
          'Pagamento aprovado automaticamente!',
          `Seu pagamento de R$${Number(order.amount).toFixed(2)} (${order.credits} creditos) foi detectado e aprovado automaticamente! Novo saldo: ${user?.credits || 0} creditos.`,
        ],
      });
    } catch (_) { /* ignorar erro de notificação */ }

    // Registra transação — usa keyId vazio pois é compra de créditos, não de chave
    // A tabela Transaction pode ter FK constraint do Prisma, então envolvemos em try/catch
    try {
      await client.execute({
        sql: `INSERT INTO "Transaction" (id, keyId, productName, credits, buyerInfo, createdAt, userId) VALUES (?, '', ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        args: [
          randomUUID(),
          `Compra de Creditos (Auto) - R$${Number(order.amount).toFixed(2)}`,
          order.credits,
          `Nome: ${order.buyerName} | Email: ${order.buyerEmail} | CPF: ${order.buyerCpf} | PIX de: ${sender || 'N/A'}`,
          order.userId,
        ],
      });
    } catch (_) { /* FK pode falhar — não é critico */ }

    // Notifica admin sobre aprovação automática
    try {
      await client.execute({
        sql: `INSERT INTO "Notification" (id, userId, title, message, type, isRead, createdAt) VALUES (?, NULL, ?, ?, 'announcement', 0, CURRENT_TIMESTAMP)`,
        args: [
          randomUUID(),
          'Pedido auto-aprovado via PIX',
          `${order.credits} creditos - R$${Number(order.amount).toFixed(2)} | ${order.buyerName} | PIX de: ${sender || 'N/A'}`,
        ],
      });
    } catch (_) { /* ignorar erro de notificação admin */ }

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