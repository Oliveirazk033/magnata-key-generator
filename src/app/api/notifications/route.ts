import { NextRequest, NextResponse } from 'next/server';
import { getClient, ensureTables } from '@/lib/db';

// GET /api/notifications — Buscar notificações
// User: ?userId=xxx (próprias notificações)
// Admin: ?admin=true (todas) ou ?userId=xxx (de um usuário específico)
export async function GET(request: NextRequest) {
  try {
    await ensureTables();
    const client = getClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isAdmin = request.headers.get('x-admin-key') === process.env.ADMIN_SECRET;

    if (userId) {
      // User fetching own notifications
      const result = await client.execute({
        sql: `SELECT * FROM "Notification" WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT 50`,
        args: [userId],
      });
      const notifications = result.rows.map((r: any) => ({
        id: r.id, userId: r.userId, title: r.title, message: r.message,
        type: r.type, isRead: Boolean(r.isRead), createdAt: r.createdAt,
      }));
      const unread = notifications.filter(n => !n.isRead).length;
      return NextResponse.json({ notifications, unread });
    }

    if (isAdmin) {
      const result = await client.execute({
        sql: `SELECT n.*, u."displayName" as "userName", u.username FROM "Notification" n LEFT JOIN "User" u ON n."userId" = u.id ORDER BY n."createdAt" DESC LIMIT 100`,
        args: [],
      });
      const notifications = result.rows.map((r: any) => ({
        id: r.id, userId: r.userId, userName: r.userName, username: r.username,
        title: r.title, message: r.message, type: r.type,
        isRead: Boolean(r.isRead), createdAt: r.createdAt,
      }));
      return NextResponse.json({ notifications });
    }

    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/notifications — Criar notificação (admin)
// Body: { userId?: string, title, message, type?: 'announcement'|'credit'|'system' }
// Se userId = null ou vazio = envia para todos os usuários
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key');
  if (authHeader !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    await ensureTables();
    const client = getClient();
    const body = await request.json();
    const { userId, title, message, type = 'announcement' } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'title e message sao obrigatorios' }, { status: 400 });
    }

    const id = 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    if (userId) {
      // Notificação para um usuário específico
      await client.execute({
        sql: `INSERT INTO "Notification" ("id", "userId", "title", "message", "type") VALUES (?, ?, ?, ?, ?)`,
        args: [id, userId, title, message, type],
      });
      return NextResponse.json({ success: true, notification: { id, userId, title, message, type } });
    } else {
      // Notificação para todos os usuários ativos
      const users = await client.execute({ sql: `SELECT id FROM "User" WHERE "isActive" = 1`, args: [] });
      let count = 0;
      for (const u of users.rows) {
        const nid = 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + count;
        await client.execute({
          sql: `INSERT INTO "Notification" ("id", "userId", "title", "message", "type") VALUES (?, ?, ?, ?, ?)`,
          args: [nid, u.id, title, message, type],
        });
        count++;
      }
      return NextResponse.json({ success: true, sentTo: count });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/notifications — Marcar como lida
// Body: { id: string } ou { all: true, userId: string }
export async function PATCH(request: NextRequest) {
  try {
    await ensureTables();
    const client = getClient();
    const body = await request.json();

    if (body.all && body.userId) {
      await client.execute({
        sql: `UPDATE "Notification" SET "isRead" = 1 WHERE "userId" = ? AND "isRead" = 0`,
        args: [body.userId],
      });
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      await client.execute({
        sql: `UPDATE "Notification" SET "isRead" = 1 WHERE "id" = ?`,
        args: [body.id],
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'id ou all+userId obrigatorios' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/notifications?id=xxx — Deletar notificação (admin)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  }

  const authHeader = request.headers.get('x-admin-key');
  if (authHeader !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    await ensureTables();
    const client = getClient();
    await client.execute({ sql: `DELETE FROM "Notification" WHERE "id" = ?`, args: [id] });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}