// Premium Email Template System for Home Hold'em Club
// Mobile-first, dark casino green theme with gold accents and premium SVG icons
// NO EMOJIS - all decorative elements use inline SVG or styled Unicode suits

// Inline SVG Icons for email compatibility
const icons = {
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  
  pokerChip: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>`,
  
  playingCards: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="12" height="16" rx="2" transform="rotate(-6 8 12)"/><rect x="10" y="4" width="12" height="16" rx="2" transform="rotate(6 16 12)"/></svg>`,
  
  envelope: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8d4c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
  
  mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8d4c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  
  home: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8d4c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  
  key: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
  
  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
  
  partyPopper: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>`,
  
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  
  helpCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
  
  waveHand: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8fb5a5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64A9 9 0 1 1 5.64 18.36"/><path d="M12 3a9 9 0 0 1 9 9"/><path d="m16 8-4-4-4 4"/></svg>`,
  
  trophy: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  
  dice: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="12" height="12" x="2" y="10" rx="2" ry="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/></svg>`,

  // Small inline icons for info cards
  calendarSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
  
  mapPinSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  
  homeSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  
  cardSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`,
};

// Medal icons for podium
const medals = {
  gold: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><circle cx="12" cy="14" r="6" fill="#ffd700" stroke="#b8860b" stroke-width="1.5"/><path d="M9 3L12 9L15 3" fill="none" stroke="#ef4444" stroke-width="2"/><text x="12" y="17" text-anchor="middle" font-size="7" font-weight="bold" fill="#8b6914">1</text></svg>`,
  
  silver: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><circle cx="12" cy="14" r="6" fill="#c0c0c0" stroke="#808080" stroke-width="1.5"/><path d="M9 3L12 9L15 3" fill="none" stroke="#3b82f6" stroke-width="2"/><text x="12" y="17" text-anchor="middle" font-size="7" font-weight="bold" fill="#606060">2</text></svg>`,
  
  bronze: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><circle cx="12" cy="14" r="6" fill="#cd7f32" stroke="#8b4513" stroke-width="1.5"/><path d="M9 3L12 9L15 3" fill="none" stroke="#22c55e" stroke-width="2"/><text x="12" y="17" text-anchor="middle" font-size="7" font-weight="bold" fill="#5c3317">3</text></svg>`,
};

const baseStyles = {
  wrapper: `margin: 0; padding: 0; background-color: #0f1f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;`,
  container: `padding: 24px 16px; background-color: #0f1f1a;`,
  card: `background: linear-gradient(180deg, #172a24 0%, #0d1916 100%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px; max-width: 480px; margin: 0 auto; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);`,
  header: `text-align: center; padding: 28px 16px 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.2); background: linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 50%, transparent 100%);`,
  headerText: `color: #d4af37; font-size: 11px; font-weight: 600; letter-spacing: 4px; margin: 0; text-transform: uppercase; text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);`,
  content: `padding: 40px 28px; text-align: center;`,
  headline: `color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 12px; line-height: 1.3; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);`,
  subtext: `color: #8fb5a5; font-size: 15px; line-height: 1.6; margin: 0 0 28px;`,
  infoCard: `background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.06) 50%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 20px 24px; margin: 0 0 28px; text-align: left; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06);`,
  button: `display: inline-block; background: linear-gradient(135deg, #e8c84a 0%, #d4af37 40%, #b8962e 100%); color: #000000; font-weight: 700; font-size: 14px; padding: 16px 40px; border-radius: 8px; text-decoration: none; text-align: center; box-shadow: 0 4px 16px rgba(212, 175, 55, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.1); text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);`,
  footer: `text-align: center; padding: 20px 24px; border-top: 1px solid rgba(212, 175, 55, 0.2); background: linear-gradient(0deg, rgba(212, 175, 55, 0.06) 0%, rgba(212, 175, 55, 0.02) 50%, transparent 100%);`,
  footerText: `color: #4a7566; font-size: 11px; margin: 0; letter-spacing: 1px;`,
  codeBox: `background: linear-gradient(135deg, #1f3830 0%, #172a24 100%); border: 2px solid #d4af37; border-radius: 12px; padding: 24px 20px; margin: 0 auto 24px; max-width: 220px; box-shadow: 0 0 40px rgba(212, 175, 55, 0.2), 0 0 80px rgba(212, 175, 55, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08);`,
  codeText: `font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #d4af37; font-family: 'SF Mono', Monaco, 'Courier New', monospace; margin: 0; text-shadow: 0 0 20px rgba(212, 175, 55, 0.5);`,
  iconWrapper: `margin-bottom: 20px; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));`,
  highlightCard: `background: linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.12) 50%, rgba(212, 175, 55, 0.08) 100%); border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 0 30px rgba(212, 175, 55, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08);`,
};

// Premium spade icons for header (using styled Unicode for maximum email compatibility)
const headerSpade = `<span style="color: #d4af37; margin: 0 4px;">♠</span>`;
const footerSuits = `<div style="color: #3d5e52; font-size: 14px; letter-spacing: 8px; margin-top: 8px; text-shadow: 0 0 10px rgba(212, 175, 55, 0.2);"><span style="color: #ef4444;">♥</span> <span style="color: #d4af37;">♠</span> <span style="color: #ef4444;">♦</span> <span style="color: #d4af37;">♣</span></div>`;

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <style>
      :root {
        color-scheme: dark;
        supported-color-schemes: dark;
      }
      body {
        background-color: #0f1f1a !important;
      }
    </style>
    <title>Home Hold'em Club</title>
  </head>
  <body style="${baseStyles.wrapper}" bgcolor="#0f1f1a">
    <div style="${baseStyles.container}">
      <div style="${baseStyles.card}">
        <div style="${baseStyles.header}">
          <p style="${baseStyles.headerText}">${headerSpade}Home Hold'em Club${headerSpade}</p>
        </div>
        ${content}
        <div style="${baseStyles.footer}">
          <p style="${baseStyles.footerText}">Home Hold'em Club</p>
          ${footerSuits}
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function otpTemplate({ code, name }: { code: string; name?: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icons.lock}</div><h1 style="${baseStyles.headline}">Verify your email</h1><p style="${baseStyles.subtext}">${name ? `Hey ${name}, enter` : 'Enter'} this code to complete your signup</p><div style="${baseStyles.codeBox}"><p style="${baseStyles.codeText}">${code}</p></div><p style="color: #6b9a8a; font-size: 12px; margin: 0;">This code expires in 10 minutes</p></div>`);
}

export function welcomeTemplate({ name, dashboardUrl }: { name: string; dashboardUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icons.pokerChip}</div><h1 style="${baseStyles.headline}">Welcome to the table</h1><p style="${baseStyles.subtext}">Hey ${name}, your account is ready. Create your first club or join an existing one to start organizing poker nights.</p><a href="${dashboardUrl}" style="${baseStyles.button}">Get Started</a></div>`);
}

export function welcomeToClubTemplate({ clubName, inviteCode, memberCount, clubUrl }: { clubName: string; inviteCode: string; memberCount: number; clubUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icons.playingCards}</div><h1 style="${baseStyles.headline}">You joined ${clubName}</h1><p style="${baseStyles.subtext}">Welcome aboard! You're now member #${memberCount} of the club.</p><div style="${baseStyles.infoCard}"><p style="margin: 0 0 8px; color: #8fb5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Invite Code</p><p style="margin: 0; color: #d4af37; font-size: 24px; font-weight: 700; letter-spacing: 4px; font-family: 'SF Mono', Monaco, monospace; text-shadow: 0 0 15px rgba(212, 175, 55, 0.4);">${inviteCode}</p></div><a href="${clubUrl}" style="${baseStyles.button}">View Club</a></div>`);
}

export function clubInviteTemplate({ clubName, inviterName, inviteCode, joinUrl }: { clubName: string; inviterName: string; inviteCode: string; joinUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icons.envelope}</div><h1 style="${baseStyles.headline}">You're invited</h1><p style="${baseStyles.subtext}">${inviterName} has invited you to join <strong style="color: #ffffff;">${clubName}</strong> for private poker nights.</p><div style="${baseStyles.infoCard}"><p style="margin: 0 0 8px; color: #8fb5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your Invite Code</p><p style="margin: 0; color: #d4af37; font-size: 24px; font-weight: 700; letter-spacing: 4px; font-family: 'SF Mono', Monaco, monospace; text-shadow: 0 0 15px rgba(212, 175, 55, 0.4);">${inviteCode}</p></div><a href="${joinUrl}" style="${baseStyles.button}">Join Now</a></div>`);
}

export function eventCreatedTemplate({ eventTitle, clubName, description, dateOptions, eventUrl }: { eventTitle: string; clubName: string; description?: string; dateOptions: string[]; eventUrl: string }): string {
  const dateList = dateOptions.map(date => `<li style="margin-bottom: 10px; color: #ffffff; padding: 8px 12px; background: rgba(212, 175, 55, 0.08); border-radius: 6px; border-left: 3px solid #d4af37;">${icons.calendarSmall}${date}</li>`).join('');
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icons.dice}</div><h1 style="${baseStyles.headline}">New poker night</h1><p style="${baseStyles.subtext}"><strong style="color: #ffffff;">${eventTitle}</strong> was created in ${clubName}.${description ? `<br><br>${description}` : ''}</p><div style="${baseStyles.infoCard}"><p style="margin: 0 0 12px; color: #8fb5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Vote on a date</p><ul style="margin: 0; padding-left: 0; list-style: none;">${dateList}</ul></div><a href="${eventUrl}" style="${baseStyles.button}">Vote & RSVP</a></div>`);
}

export function rsvpConfirmationTemplate({ eventTitle, status, eventDate, location, eventUrl }: { eventTitle: string; status: 'going' | 'maybe' | 'not_going'; eventDate?: string; location?: string; eventUrl: string }): string {
  const config = { 
    going: { icon: icons.checkCircle, headline: "You're in!", message: 'Your seat is confirmed.' }, 
    maybe: { icon: icons.helpCircle, headline: 'Noted!', message: "We've recorded your maybe." }, 
    not_going: { icon: icons.waveHand, headline: 'Maybe next time', message: "We'll miss you at the table." } 
  };
  const { icon, headline, message } = config[status];
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icon}</div><h1 style="${baseStyles.headline}">${headline}</h1><p style="${baseStyles.subtext}">${message}</p>${(eventDate || location) ? `<div style="${baseStyles.infoCard}"><p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 16px;">${eventTitle}</p>${eventDate ? `<p style="margin: 10px 0 0; color: #b8d4c8; font-size: 14px;">${icons.calendarSmall}${eventDate}</p>` : ''}${location ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">${icons.mapPinSmall}${location}</p>` : ''}</div>` : ''}<a href="${eventUrl}" style="${baseStyles.button}">View Event</a></div>`);
}

export function eventReminderTemplate({ eventTitle, eventDate, location, hostName, eventUrl }: { eventTitle: string; eventDate: string; location?: string; hostName?: string; eventUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icons.clock}</div><h1 style="${baseStyles.headline}">Tomorrow night</h1><p style="${baseStyles.subtext}">Don't forget – you have a poker night coming up!</p><div style="${baseStyles.infoCard}"><p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 16px;">${eventTitle}</p><p style="margin: 12px 0 0; color: #b8d4c8; font-size: 14px;">${icons.calendarSmall}${eventDate}</p>${location ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">${icons.mapPinSmall}${location}</p>` : ''}${hostName ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">${icons.homeSmall}Hosted by ${hostName}</p>` : ''}</div><a href="${eventUrl}" style="${baseStyles.button}">View Details</a></div>`);
}

export function waitlistPromotionTemplate({ eventTitle, eventDate, location, clubName, eventUrl }: { eventTitle: string; eventDate?: string; location?: string; clubName?: string; eventUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icons.partyPopper}</div><h1 style="${baseStyles.headline}">A spot opened up!</h1><p style="${baseStyles.subtext}">Great news! You've been promoted from the waitlist and your seat is now confirmed.</p><div style="${baseStyles.highlightCard}"><p style="margin: 0; color: #d4af37; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);">${icons.sparkles} Seat Confirmed</p></div><div style="${baseStyles.infoCard}"><p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 16px;">${eventTitle}</p>${clubName ? `<p style="margin: 10px 0 0; color: #8fb5a5; font-size: 13px;">${icons.cardSmall}${clubName}</p>` : ''}${eventDate ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">${icons.calendarSmall}${eventDate}</p>` : ''}${location ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">${icons.mapPinSmall}${location}</p>` : ''}</div><a href="${eventUrl}" style="${baseStyles.button}">View Event</a></div>`);
}

export function gameResultsTemplate({ eventTitle, placements, prizePool, yourPlacement, resultsUrl }: { eventTitle: string; eventDate: string; placements: { name: string; prize: string; position: number }[]; prizePool: string; yourPlacement?: { position: number; prize?: string }; resultsUrl: string }): string {
  const podiumStyles = [
    'background: linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 215, 0, 0.1) 100%); border-left: 3px solid #ffd700;',
    'background: linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.08) 100%); border-left: 3px solid #c0c0c0;',
    'background: linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.08) 100%); border-left: 3px solid #cd7f32;'
  ];
  const medalIcons = [medals.gold, medals.silver, medals.bronze];
  const placementList = placements.slice(0, 3).map((p, i) => `<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; margin-bottom: 8px; border-radius: 8px; ${podiumStyles[i]}"><span style="color: #ffffff; font-weight: 500;">${medalIcons[i]}${p.name}</span><span style="color: #d4af37; font-weight: 700; text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);">${p.prize}</span></div>`).join('');
  const getOrdinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; };
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icons.trophy}</div><h1 style="${baseStyles.headline}">Results are in</h1><p style="${baseStyles.subtext}">${eventTitle} has concluded. Thanks for playing!</p>${yourPlacement ? `<div style="${baseStyles.highlightCard}"><p style="margin: 0 0 4px; color: #8fb5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your finish</p><p style="margin: 0; color: #d4af37; font-size: 32px; font-weight: 700; text-shadow: 0 0 20px rgba(212, 175, 55, 0.4);">${yourPlacement.position}${getOrdinal(yourPlacement.position)} Place</p>${yourPlacement.prize ? `<p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; font-weight: 500;">Won: ${yourPlacement.prize}</p>` : ''}</div>` : ''}<div style="${baseStyles.infoCard}"><p style="margin: 0 0 16px; color: #8fb5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Final Standings</p>${placementList}<div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(212, 175, 55, 0.3); display: flex; justify-content: space-between; align-items: center;"><span style="color: #8fb5a5; font-size: 13px;">Prize Pool</span><span style="color: #ffffff; font-weight: 700; font-size: 16px; text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);">${prizePool}</span></div></div><a href="${resultsUrl}" style="${baseStyles.button}">View Full Results</a></div>`);
}

export function passwordResetTemplate({ resetUrl }: { resetUrl: string }): string {
  return emailWrapper(`<div style="${baseStyles.content}"><div style="${baseStyles.iconWrapper}">${icons.key}</div><h1 style="${baseStyles.headline}">Reset your password</h1><p style="${baseStyles.subtext}">We received a request to reset your password. Click below to choose a new one.</p><a href="${resetUrl}" style="${baseStyles.button}">Reset Password</a><p style="color: #6b9a8a; font-size: 12px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p></div>`);
}
