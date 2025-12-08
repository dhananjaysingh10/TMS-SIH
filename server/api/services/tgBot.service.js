import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import LocalSession from 'telegraf-session-local';

dotenv.config();

const bot = new Telegraf(process.env.TG_BOT_TOKEN);
const API_URL = 'http://localhost:10000';

bot.use(new LocalSession({ database: 'session_db.json' }).middleware());

async function fetchJSON(url, options = {}) {
  console.log(url);

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
  //   console.log(res);
  return res.json();
}

bot.start((ctx) =>
  ctx.reply('👋 Welcome to the Ticket Service Bot!\nUse /help to see all available commands.')
);

bot.command('myid', (ctx) =>
  ctx.reply(`🆔 Your Telegram ID: ${ctx.from.id}\nShare this with your admin to link your account.`)
);

bot.command('help', (ctx) => {
  const commands = [
    ['/start', 'Start the bot and get a welcome message.'],
    ['/myid', 'Show your Telegram ID.'],
    ['/linkaccount', 'Link your Telegram account by email.'],
    ['/getactivetickets', 'View your active (open) tickets.'],
    ['/getassignedtickets', 'View tickets assigned to you.'],
    ['/getprogress', 'Check progress for a specific ticket.'],
    ['/createticket', 'Create a new ticket.'],
    ['/addcomment', 'Add a comment to a ticket.'],
  ];

  let msg = '📖 *Available Commands:*\n\n';
  commands.forEach(([cmd, desc]) => (msg += `${cmd} — ${desc}\n`));
  ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('linkaccount', (ctx) => {
  ctx.session.waitingForEmail = true;
  ctx.reply('📧 Please enter your email address to link your account:');
});

bot.command('getactivetickets', async (ctx) => {
  const telegramId = ctx.from.id.toString();

  try {
    const user = await fetchJSON(`${API_URL}/api/user/byTelegramId/${telegramId}`);
    if (!user.success)
      return ctx.reply('❌ Your Telegram is not linked. Use /linkaccount to connect your account.');
    // console.log(user.user);
    const ticketsRes = await fetchJSON(
      `${API_URL}/api/ticket/createdBy/${user.user._id}?page=1&limit=50`
    );

    let tickets = ticketsRes.data?.filter(
      (t) => t.status !== 'closed' && t.status !== 'resolved'
    );

    if (!tickets?.length) return ctx.reply('✅ No active tickets found.');

    let msg = '🎟 *Your Active Tickets:*\n\n';
    tickets.forEach((t, i) => {
      msg += `#${i + 1} — *${t.title}*\nID: ${t.ticketId}\nStatus: ${t.status}\nPriority: ${t.priority}\nDepartment: ${t.department}\n\n`;
    });
    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(err);
    ctx.reply('⚠️ Error fetching your tickets. Try again later.');
  }
});

bot.command('getassignedtickets', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  try {
    const user = await fetchJSON(`${API_URL}/api/user/byTelegramId/${telegramId}`);
    if (!user.success) return ctx.reply('❌ Your account is not linked. Use /linkaccount.');
    console.log(user);
    const res = await fetchJSON(`${API_URL}/api/ticket/assignedto`, {
      method: 'POST',
      body: JSON.stringify({ email: user.user.email }),
    });

    const tickets = res.data || [];
    if (!tickets.length) return ctx.reply('✅ No tickets currently assigned to you.');

    let msg = '🧾 *Tickets Assigned To You:*\n\n';
    tickets.forEach((t, i) => {
      msg += `#${i + 1} — *${t.title}*\nID: ${t.ticketId}\nStatus: ${t.status}\nFrom: ${t.createdBy.name}\n\n`;
    });
    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(err);
    ctx.reply('⚠️ Could not fetch assigned tickets.');
  }
});

bot.command('getprogress', (ctx) => {
  ctx.session.waitingForTicketId = true;
  ctx.reply('🔍 Please enter the Ticket ID to check its progress:');
});

bot.command('createticket', async (ctx) => {
  const user = await fetchJSON(`${API_URL}/api/user/byTelegramId/${ctx.from.id}`);
  if (!user.success) return ctx.reply('❌ Please link your account first using /linkaccount.');

  ctx.session.createTicket = { step: 'title', data: {} };
  ctx.reply('📝 Please enter the ticket *title*:', { parse_mode: 'Markdown' });
});

bot.command('addcomment', (ctx) => {
  ctx.session.waitingForTicketIdForComment = true;
  ctx.reply('💬 Please enter the Ticket ID you want to comment on:');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();

  if (ctx.session?.waitingForEmail) {
    ctx.session.waitingForEmail = false;
    try {
      const res = await fetchJSON(`${API_URL}/api/user/linkTelegram`, {
        method: 'PUT',
        body: JSON.stringify({ email: text, telegramId: ctx.from.id.toString() }),
      });
      if (res.success)
        ctx.reply('✅ Account linked successfully! You can now use /getactivetickets.');
      else ctx.reply(`❌ ${res.message || 'Failed to link account.'}`);
    } catch {
      ctx.reply('⚠️ Error linking account. Try again.');
    }
  }

  else if (ctx.session?.waitingForTicketId) {
    ctx.session.waitingForTicketId = false;
    try {
      const ticket = await fetchJSON(`${API_URL}/api/ticket/${text}`);
      if (!ticket.success) return ctx.reply('❌ Ticket not found.');

      if (!ticket.data.progress?.length)
        return ctx.reply(`ℹ️ No progress updates for Ticket ID: ${text}`);

      let msg = `📈 *Progress for Ticket ${text}:*\n\n`;

      // console.log("hello bro");
      // console.log(ticket);
      // console.log(ticket.data);
      // console.log(ticket.data.progress);
      ticket.data.progress.forEach((p, i) => {
        msg += `${i + 1}. ${p.description} — ${p.remark || 'No remark'}\nAt: ${new Date(
          p.timestamp
        ).toLocaleString()}\n\n`;
      });
      ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch {
      ctx.reply('⚠️ Error fetching ticket progress.');
    }
  }

  else if (ctx.session?.createTicket) {
    const { step, data } = ctx.session.createTicket;
    try {
      if (step === 'title') {
        data.title = text;
        ctx.reply('✏️ Enter ticket *description*:', { parse_mode: 'Markdown' });
        ctx.session.createTicket.step = 'description';
      } else if (step === 'description') {
        data.description = text;

        const user = await fetchJSON(`${API_URL}/api/user/byTelegramId/${ctx.from.id}`);
        if (!user.success) return ctx.reply('❌ Please link your account first.');

        const res = await fetchJSON(`${API_URL}/api/ticket/frontend`, {
          method: 'POST',
          body: JSON.stringify({ ...data, useremail: user.user.email }),
        });

        if (res.success)
          ctx.reply(`✅ Ticket created successfully!\nTicket ID: ${res.ticket_id}`);
        else ctx.reply('⚠️ Failed to create ticket.');

        ctx.session.createTicket = null;
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      ctx.reply('⚠️ Error creating ticket. Try again.');
      ctx.session.createTicket = null;
    }
  }

  else if (ctx.session?.waitingForTicketIdForComment) {
    ctx.session.waitingForTicketIdForComment = false;
    ctx.session.commentTicketId = text;
    ctx.reply('✏️ Please type your comment:');
  } else if (ctx.session?.commentTicketId) {
    const ticketId = ctx.session.commentTicketId;
    ctx.session.commentTicketId = null;
    try {
      const user = await fetchJSON(`${API_URL}/api/user/byTelegramId/${ctx.from.id}`);
      const res = await fetchJSON(`${API_URL}/api/ticket/${ticketId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ content: text, userId: user.userId }),
      });
      if (res.success) ctx.reply('💬 Comment added successfully!');
      else ctx.reply('⚠️ Failed to add comment.');
    } catch {
      ctx.reply('⚠️ Error adding comment.');
    }
  }
});

bot.launch().then(() => console.log('🤖 Bot running via polling...'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
