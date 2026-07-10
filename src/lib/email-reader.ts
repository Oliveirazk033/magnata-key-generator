import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

interface PixPayment {
  amount: number;
  description: string;
  senderName: string;
  date: Date;
  messageId: string;
}

function extractAmount(text: string): number | null {
  // Match patterns like "R$ 10,00", "R$10,00", "R$ 100,50", "R$1.500,00"
  const patterns = [
    /R\$\s*([\d.]+,\d{2})/g,
    /recebeu\s+([\d.]+,\d{2})/gi,
    /valor\s*(?:de|:)\s*R?\$\s*([\d.]+,\d{2})/gi,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      const cleaned = match[1].replace('.', '').replace(',', '.');
      return parseFloat(cleaned);
    }
  }
  return null;
}

function extractSender(text: string, html: string): string {
  // Try to find sender name from text patterns
  const senderPatterns = [
    /de\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+via\s+PIX/i,
    /enviado\s+por\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /recebido\s+de\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /Quem enviou[:\s]*([^\n<]+)/i,
    /Remetente[:\s]*([^\n<]+)/i,
  ];

  for (const pattern of senderPatterns) {
    const match = pattern.exec(text);
    if (match) {
      return match[1].trim();
    }
  }

  // Try HTML patterns
  if (html) {
    const htmlPatterns = [
      /Quem enviou[^<]*<\/[^>]+>\s*<\/[^>]+>\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i,
      /Remetente[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)/i,
    ];
    for (const pattern of htmlPatterns) {
      const match = pattern.exec(html);
      if (match) {
        return match[1].trim();
      }
    }
  }

  return 'Desconhecido';
}

function extractDescription(text: string): string {
  // Extract PIX description/message - usually the identifier the user typed
  const descPatterns = [
    /Descri[cç][aã]o[:\s]*([^\n\r.]+)/i,
    /Mensagem[:\s]*([^\n\r.]+)/i,
    /Identificador[:\s]*([^\n\r.]+)/i,
    /mensagem\s+do\s+PIX[:\s]*([^\n\r.]+)/i,
    /com\s+a\s+descri[cç][aã]o[:\s]*"?([^"\n]+)"?/i,
    /com\s+a\s+mensagem[:\s]*"?([^"\n]+)"?/i,
  ];

  for (const pattern of descPatterns) {
    const match = pattern.exec(text);
    if (match) {
      return match[1].trim().replace(/["']/g, '');
    }
  }

  return '';
}

function isNubankPixEmail(from: string, subject: string): boolean {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();

  const isNubank =
    fromLower.includes('nubank') ||
    fromLower.includes('notificacoes@') ||
    fromLower.includes('contato@nubank');

  const isPix =
    subjectLower.includes('pix') ||
    subjectLower.includes('receb') ||
    subjectLower.includes('transfer') ||
    subjectLower.includes('pagamento') ||
    subjectLower.includes('entrada') ||
    subjectLower.includes('você recebeu');

  return isNubank && isPix;
}

export async function checkPixPayments(): Promise<{
  payments: PixPayment[];
  error: string | null;
}> {
  const emailUser = process.env.PIX_EMAIL_USER;
  const emailPass = process.env.PIX_EMAIL_PASS;

  if (!emailUser || !emailPass) {
    return { payments: [], error: 'Credenciais de email nao configuradas' };
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    logger: false as any,
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Search for unread emails from the last 7 days
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const sinceStr = since.toISOString().replace(/T.*/, '');

      const messages = await client.search({
        unseen: true,
        from: 'nubank',
        since: sinceStr,
        subject: 'pix',
      });

      // If no results with nubank filter, try broader search
      let searchMessages = messages;
      if (messages.length === 0) {
        searchMessages = await client.search({
          unseen: true,
          since: sinceStr,
        });
      }

      const payments: PixPayment[] = [];

      for (const uid of searchMessages) {
        const message = await client.fetchOne(uid, {
          source: true,
          flags: true,
          envelope: true,
        });

        const parsed = await simpleParser(message.source);

        const from = parsed.from?.text || '';
        const subject = parsed.subject || '';

        // Only process Nubank PIX emails
        if (!isNubankPixEmail(from, subject)) {
          continue;
        }

        const textContent = (parsed.text || '') + ' ' + (parsed.textAsHtml || '');
        const htmlContent = parsed.html || '';

        const amount = extractAmount(textContent);
        if (!amount) {
          // Try extracting from HTML
          const htmlText = htmlContent.replace(/<[^>]+>/g, ' ');
          const htmlAmount = extractAmount(htmlText);
          if (!htmlAmount) continue;
        }

        const finalAmount = amount || extractAmount(htmlContent.replace(/<[^>]+>/g, ' ')) || 0;
        const description = extractDescription(textContent) || extractDescription(htmlContent.replace(/<[^>]+>/g, ' '));
        const senderName = extractSender(textContent, htmlContent);

        payments.push({
          amount: finalAmount,
          description,
          senderName,
          date: parsed.date || new Date(),
          messageId: parsed.messageId || `${uid}`,
        });

        // Mark as read
        await client.messageFlagsAdd(uid, ['\\Seen']);
      }

      return { payments, error: null };
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error('IMAP Error:', err);
    return {
      payments: [],
      error: `Erro ao conectar ao email: ${err.message}`,
    };
  } finally {
    await client.logout();
  }
}