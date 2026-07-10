import { NextRequest, NextResponse } from 'next/server';
import { checkPixPayments } from '@/lib/email-reader';
import { getClient, ensureTables } from '@/lib/db';
import { randomUUID } from 'crypto';

export const maxDuration = 30;

async function verifyAdmin(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    await ensureTables();
    const client = getClient();

    // Check for new PIX payments via email
    const { payments, error } = await checkPixPayments();

    if (error) {
      return NextResponse.json({ error, results: [] }, { status: 500 });
    }

    const results: {
      amount: number;
      description: string;
      senderName: string;
      credited: boolean;
      username: string | null;
      creditsAdded: number | null;
      message: string;
    }[] = [];

    for (const payment of payments) {
      const desc = payment.description.trim();
      let username: string | null = null;
      let credited = false;
      let creditsAdded: number | null = null;
      let message = '';

      if (desc) {
        // Try to find a user with username matching the PIX description
        const userResult = await client.execute({
          sql: `SELECT id, username, displayName, credits FROM "User" WHERE LOWER(username) = LOWER(?) AND isActive = 1`,
          args: [desc],
        });

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0] as any;
          username = user.username;

          // Determine how many credits to add based on amount
          // Default: 1 credit per R$1, but you can customize this
          const creditsToAdd = Math.floor(payment.amount);

          if (creditsToAdd > 0) {
            const oldCredits = user.credits;
            await client.execute({
              sql: `UPDATE "User" SET credits = credits + ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?`,
              args: [creditsToAdd, user.id],
            });

            // Create notification for the user
            const diff = creditsToAdd;
            await client.execute({
              sql: `INSERT INTO "Notification" (id, userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, 'credit', 0, CURRENT_TIMESTAMP)`,
              args: [
                randomUUID(),
                user.id,
                'Pagamento PIX confirmado',
                `Voce recebeu ${diff} creditos via PIX (R$${payment.amount.toFixed(2)}). Novo saldo: ${oldCredits + creditsToAdd} creditos.`,
              ],
            });

            // Log the payment
            await client.execute({
              sql: `INSERT INTO "Transaction" (id, keyId, productName, credits, buyerInfo, createdAt, userId) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
              args: [
                randomUUID(),
                'pix-payment',
                `PIX Auto - R$${payment.amount.toFixed(2)}`,
                creditsToAdd,
                `Remetente: ${payment.senderName} | Descricao: ${desc}`,
                user.id,
              ],
            });

            credited = true;
            creditsAdded = creditsToAdd;
            message = `Creditado ${creditsToAdd} creditos para ${user.displayName} (${user.username})`;
          } else {
            message = `Valor muito baixo para creditos (R$${payment.amount.toFixed(2)})`;
          }
        } else {
          message = `Nenhum usuario encontrado com o username "${desc}"`;
        }
      } else {
        message = 'Sem descricao no PIX - nao foi possivel identificar o usuario';
      }

      results.push({
        amount: payment.amount,
        description: desc,
        senderName: payment.senderName,
        credited,
        username,
        creditsAdded,
        message,
      });
    }

    return NextResponse.json({
      success: true,
      total: payments.length,
      results,
    });
  } catch (err: any) {
    console.error('Check PIX error:', err);
    return NextResponse.json(
      { error: `Erro interno: ${err.message}` },
      { status: 500 }
    );
  }
}