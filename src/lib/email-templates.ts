// Premium Email Template System for Home Hold'em Club
// Mobile-first, dark theme, minimalistic design

const baseStyles = {
  wrapper: `margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;`,
  container: `padding: 24px 16px; background-color: #0a0a0a;`,
  card: `background: linear-gradient(180deg, #141414 0%, #0f0f0f 100%); border: 1px solid rgba(212, 175, 55, 0.15); border-radius: 16px; max-width: 480px; margin: 0 auto; overflow: hidden;`,
  header: `text-align: center; padding: 28px 16px 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.1);`,
  headerText: `color: #d4af37; font-size: 11px; font-weight: 600; letter-spacing: 4px; margin: 0; text-transform: uppercase;`,
  content: `padding: 40px 28px; text-align: center;`,
  headline: `color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 12px; line-height: 1.3;`,
  subtext: `color: #888888; font-size: 15px; line-height: 1.5; margin: 0 0 28px;`,
  infoCard: `background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; padding: 20px 24px; margin: 0 0 28px; text-align: left;`,
  button: `display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 16px 40px; border-radius: 8px; text-decoration: none; text-align: center;`,
  footer: `text-align: center; padding: 20px 24px; border-top: 1px solid rgba(212, 175, 55, 0.1);`,
  footerText: `color: #4a4a4a; font-size: 11px; margin: 0; letter-spacing: 1px;`,
};

function emailWrapper(content: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Home Hold'em Club</title></head><body style="${baseStyles.wrapper}"><div style="${baseStyles.container}"><div style="${baseStyles.card}"><div style="${baseStyles.header}"><p style="${baseStyles.headerText}">♠ Home Hold'em Club ♠</p></div>${content}<div style="${baseStyles.footer}"><p style="${baseStyles.footerText}">Home Hold'em Club</p><p style="color: #3a3a3a; font-size: 14px; letter-spacing: 8px; margin-top: 8px;">♥ ♠ ♦ ♣</p></div></div></div></body></html>`;
}

export function otpTemplate({ code, name }: { code: string; name?: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">🔐</div><h1 style="${baseStyles.headline}">Verify your email</h1><p style="${baseStyles.subtext}">${name ? `Hey ${name}, enter` : 'Enter'} this code to complete your signup</p><div style="background: #1a1a1a; border: 2px solid #d4af37; border-radius: 12px; padding: 24px 20px; margin: 0 auto 24px; max-width: 220px;"><p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #d4af37; font-family: monospace; margin: 0;">${code}</p></div><p style="color: #666666; font-size: 12px; margin: 0;">This code expires in 10 minutes</p></div>`);
}

export function welcomeTemplate({ name, dashboardUrl }: { name: string; dashboardUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">🎰</div><h1 style="${baseStyles.headline}">Welcome to the table</h1><p style="${baseStyles.subtext}">Hey ${name}, your account is ready. Create your first club or join an existing one to start organizing poker nights.</p><a href="${dashboardUrl}" style="${baseStyles.button}">Get Started</a></div>`);
}

export function welcomeToClubTemplate({ clubName, inviteCode, memberCount, clubUrl }: { clubName: string; inviteCode: string; memberCount: number; clubUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">🃏</div><h1 style="${baseStyles.headline}">You joined ${clubName}</h1><p style="${baseStyles.subtext}">Welcome aboard! You're now member #${memberCount} of the club.</p><div style="${baseStyles.infoCard}"><p style="margin: 0 0 8px; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Invite Code</p><p style="margin: 0; color: #d4af37; font-size: 24px; font-weight: 700; letter-spacing: 4px; font-family: monospace;">${inviteCode}</p></div><a href="${clubUrl}" style="${baseStyles.button}">View Club</a></div>`);
}

export function clubInviteTemplate({ clubName, inviterName, inviteCode, joinUrl }: { clubName: string; inviterName: string; inviteCode: string; joinUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">✉️</div><h1 style="${baseStyles.headline}">You're invited</h1><p style="${baseStyles.subtext}">${inviterName} has invited you to join <strong style="color: #ffffff;">${clubName}</strong> for private poker nights.</p><div style="${baseStyles.infoCard}"><p style="margin: 0 0 8px; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Invite Code</p><p style="margin: 0; color: #d4af37; font-size: 24px; font-weight: 700; letter-spacing: 4px; font-family: monospace;">${inviteCode}</p></div><a href="${joinUrl}" style="${baseStyles.button}">Join Now</a></div>`);
}

export function eventCreatedTemplate({ eventTitle, clubName, description, dateOptions, eventUrl }: { eventTitle: string; clubName: string; description?: string; dateOptions: string[]; eventUrl: string }): string {
  const dateList = dateOptions.map(date => `<li style="margin-bottom: 8px; color: #ffffff;">📅 ${date}</li>`).join('');
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">🎲</div><h1 style="${baseStyles.headline}">New poker night</h1><p style="${baseStyles.subtext}"><strong style="color: #ffffff;">${eventTitle}</strong> was created in ${clubName}.${description ? `<br><br>${description}` : ''}</p><div style="${baseStyles.infoCard}"><p style="margin: 0 0 12px; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Vote on a date</p><ul style="margin: 0; padding-left: 0; list-style: none;">${dateList}</ul></div><a href="${eventUrl}" style="${baseStyles.button}">Vote & RSVP</a></div>`);
}

export function rsvpConfirmationTemplate({ eventTitle, status, eventDate, location, eventUrl }: { eventTitle: string; status: 'going' | 'maybe' | 'not_going'; eventDate?: string; location?: string; eventUrl: string }): string {
  const config = { going: { emoji: '✅', headline: "You're in!", message: 'Your seat is confirmed.' }, maybe: { emoji: '🤔', headline: 'Noted!', message: "We've recorded your maybe." }, not_going: { emoji: '👋', headline: 'Maybe next time', message: "We'll miss you at the table." } };
  const { emoji, headline, message } = config[status];
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">${emoji}</div><h1 style="${baseStyles.headline}">${headline}</h1><p style="${baseStyles.subtext}">${message}</p>${(eventDate || location) ? `<div style="${baseStyles.infoCard}"><p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 16px;">${eventTitle}</p>${eventDate ? `<p style="margin: 8px 0 0; color: #cccccc; font-size: 14px;">📅 ${eventDate}</p>` : ''}${location ? `<p style="margin: 8px 0 0; color: #cccccc; font-size: 14px;">📍 ${location}</p>` : ''}</div>` : ''}<a href="${eventUrl}" style="${baseStyles.button}">View Event</a></div>`);
}

export function eventReminderTemplate({ eventTitle, eventDate, location, hostName, eventUrl }: { eventTitle: string; eventDate: string; location?: string; hostName?: string; eventUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">⏰</div><h1 style="${baseStyles.headline}">Tomorrow night</h1><p style="${baseStyles.subtext}">Don't forget – you have a poker night coming up!</p><div style="${baseStyles.infoCard}"><p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 16px;">${eventTitle}</p><p style="margin: 12px 0 0; color: #cccccc; font-size: 14px;">📅 ${eventDate}</p>${location ? `<p style="margin: 8px 0 0; color: #cccccc; font-size: 14px;">📍 ${location}</p>` : ''}${hostName ? `<p style="margin: 8px 0 0; color: #cccccc; font-size: 14px;">🏠 Hosted by ${hostName}</p>` : ''}</div><a href="${eventUrl}" style="${baseStyles.button}">View Details</a></div>`);
}

export function waitlistPromotionTemplate({ eventTitle, eventDate, location, clubName, eventUrl }: { eventTitle: string; eventDate?: string; location?: string; clubName?: string; eventUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">🎉</div><h1 style="${baseStyles.headline}">A spot opened up!</h1><p style="${baseStyles.subtext}">Great news! You've been promoted from the waitlist and your seat is now confirmed.</p><div style="${baseStyles.infoCard}"><p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 16px;">${eventTitle}</p>${clubName ? `<p style="margin: 8px 0 0; color: #888888; font-size: 13px;">🎴 ${clubName}</p>` : ''}${eventDate ? `<p style="margin: 8px 0 0; color: #cccccc; font-size: 14px;">📅 ${eventDate}</p>` : ''}${location ? `<p style="margin: 8px 0 0; color: #cccccc; font-size: 14px;">📍 ${location}</p>` : ''}</div><a href="${eventUrl}" style="${baseStyles.button}">View Event</a></div>`);
}

export function gameResultsTemplate({ eventTitle, placements, prizePool, yourPlacement, resultsUrl }: { eventTitle: string; eventDate: string; placements: { name: string; prize: string; position: number }[]; prizePool: string; yourPlacement?: { position: number; prize?: string }; resultsUrl: string }): string {
  const podiumEmojis = ['🥇', '🥈', '🥉'];
  const placementList = placements.slice(0, 3).map((p, i) => `<div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(212, 175, 55, 0.1);"><span style="color: #ffffff;">${podiumEmojis[i]} ${p.name}</span><span style="color: #d4af37; font-weight: 600;">${p.prize}</span></div>`).join('');
  const getOrdinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; };
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">🏆</div><h1 style="${baseStyles.headline}">Results are in</h1><p style="${baseStyles.subtext}">${eventTitle} has concluded. Thanks for playing!</p>${yourPlacement ? `<div style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;"><p style="margin: 0 0 4px; color: #888888; font-size: 12px; text-transform: uppercase;">Your finish</p><p style="margin: 0; color: #d4af37; font-size: 28px; font-weight: 700;">${yourPlacement.position}${getOrdinal(yourPlacement.position)} Place</p>${yourPlacement.prize ? `<p style="margin: 8px 0 0; color: #ffffff; font-size: 16px;">Won: ${yourPlacement.prize}</p>` : ''}</div>` : ''}<div style="${baseStyles.infoCard}"><p style="margin: 0 0 4px; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Final Standings</p>${placementList}<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(212, 175, 55, 0.2);"><span style="color: #888888; font-size: 13px;">Prize Pool:</span><span style="color: #ffffff; font-weight: 600; margin-left: 8px;">${prizePool}</span></div></div><a href="${resultsUrl}" style="${baseStyles.button}">View Full Results</a></div>`);
}

export function passwordResetTemplate({ resetUrl }: { resetUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="font-size: 48px; margin-bottom: 20px;">🔑</div><h1 style="${baseStyles.headline}">Reset your password</h1><p style="${baseStyles.subtext}">We received a request to reset your password. Click below to choose a new one.</p><a href="${resetUrl}" style="${baseStyles.button}">Reset Password</a><p style="color: #666666; font-size: 12px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p></div>`);
}
