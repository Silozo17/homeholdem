// Email template styling constants
const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #0a0a0a;
  color: #ffffff;
`;

const cardStyles = `
  background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
  border: 1px solid #d4af37;
  border-radius: 12px;
  padding: 32px;
  margin: 20px auto;
  max-width: 600px;
`;

const buttonStyles = `
  display: inline-block;
  background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%);
  color: #000000;
  font-weight: 600;
  padding: 14px 28px;
  border-radius: 8px;
  text-decoration: none;
  margin-top: 20px;
`;

const headingStyles = `
  color: #d4af37;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
`;

const subHeadingStyles = `
  color: #d4af37;
  font-size: 18px;
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 8px;
`;

const textStyles = `
  color: #a0a0a0;
  font-size: 16px;
  line-height: 1.6;
`;

const highlightStyles = `
  color: #ffffff;
  font-weight: 500;
`;

// Base email wrapper
function emailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="${baseStyles} margin: 0; padding: 20px;">
        <div style="${cardStyles}">
          ${content}
        </div>
        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
          Home Hold'em Club — Manage your poker nights with ease
        </p>
      </body>
    </html>
  `;
}

// Event created notification template
export function eventCreatedTemplate({
  eventTitle,
  clubName,
  description,
  dateOptions,
  eventUrl,
}: {
  eventTitle: string;
  clubName: string;
  description?: string;
  dateOptions: string[];
  eventUrl: string;
}): string {
  const dateOptionsHtml = dateOptions
    .map((date) => `<li style="margin: 8px 0; color: #ffffff;">📅 ${date}</li>`)
    .join('');

  return emailWrapper(`
    <h1 style="${headingStyles}">🃏 New Poker Night!</h1>
    <p style="${textStyles}">
      A new event has been created in <span style="${highlightStyles}">${clubName}</span>
    </p>
    
    <h2 style="${subHeadingStyles}">${eventTitle}</h2>
    ${description ? `<p style="${textStyles}">${description}</p>` : ''}
    
    <h3 style="${subHeadingStyles}">Vote for a Date</h3>
    <ul style="list-style: none; padding: 0; margin: 16px 0;">
      ${dateOptionsHtml}
    </ul>
    
    <p style="${textStyles}">
      Head over to the event page to cast your vote and RSVP!
    </p>
    
    <a href="${eventUrl}" style="${buttonStyles}">View Event & RSVP</a>
  `);
}

// RSVP confirmation template
export function rsvpConfirmationTemplate({
  eventTitle,
  status,
  eventDate,
  location,
  eventUrl,
}: {
  eventTitle: string;
  status: 'going' | 'maybe' | 'not_going';
  eventDate?: string;
  location?: string;
  eventUrl: string;
}): string {
  const statusEmoji = status === 'going' ? '✅' : status === 'maybe' ? '🤔' : '❌';
  const statusText = status === 'going' ? "You're in!" : status === 'maybe' ? "You're a maybe" : "You're not going";
  const statusMessage =
    status === 'going'
      ? "We've saved your spot at the table. Get ready for some action!"
      : status === 'maybe'
      ? "We've noted your interest. Update your RSVP when you know for sure!"
      : "No worries! Maybe next time. You can always change your mind.";

  return emailWrapper(`
    <h1 style="${headingStyles}">${statusEmoji} ${statusText}</h1>
    <p style="${textStyles}">${statusMessage}</p>
    
    <h2 style="${subHeadingStyles}">${eventTitle}</h2>
    ${eventDate ? `<p style="${textStyles}">📅 <span style="${highlightStyles}">${eventDate}</span></p>` : ''}
    ${location ? `<p style="${textStyles}">📍 <span style="${highlightStyles}">${location}</span></p>` : ''}
    
    <p style="${textStyles}">
      Need to change your RSVP? No problem!
    </p>
    
    <a href="${eventUrl}" style="${buttonStyles}">View Event</a>
  `);
}

// Welcome to club template
export function welcomeToClubTemplate({
  clubName,
  inviteCode,
  memberCount,
  clubUrl,
}: {
  clubName: string;
  inviteCode: string;
  memberCount: number;
  clubUrl: string;
}): string {
  return emailWrapper(`
    <h1 style="${headingStyles}">🎉 Welcome to ${clubName}!</h1>
    <p style="${textStyles}">
      You're now part of a poker club with <span style="${highlightStyles}">${memberCount} member${memberCount !== 1 ? 's' : ''}</span>.
    </p>
    
    <h2 style="${subHeadingStyles}">What's Next?</h2>
    <ul style="list-style: none; padding: 0; margin: 16px 0;">
      <li style="margin: 12px 0; ${textStyles}">🃏 Check out upcoming poker nights</li>
      <li style="margin: 12px 0; ${textStyles}">📅 Vote for event dates that work for you</li>
      <li style="margin: 12px 0; ${textStyles}">👥 Invite your friends to join</li>
    </ul>
    
    <h2 style="${subHeadingStyles}">Share the Invite Code</h2>
    <p style="${textStyles}">
      Want to bring friends? Share this code:
    </p>
    <div style="background: #0a0a0a; border: 2px dashed #d4af37; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #d4af37; font-family: monospace;">
        ${inviteCode}
      </span>
    </div>
    
    <a href="${clubUrl}" style="${buttonStyles}">View Club</a>
  `);
}

// Event reminder template
export function eventReminderTemplate({
  eventTitle,
  eventDate,
  location,
  hostName,
  eventUrl,
}: {
  eventTitle: string;
  eventDate: string;
  location?: string;
  hostName?: string;
  eventUrl: string;
}): string {
  return emailWrapper(`
    <h1 style="${headingStyles}">⏰ Poker Night Tomorrow!</h1>
    <p style="${textStyles}">
      Don't forget — you have a poker night coming up!
    </p>
    
    <h2 style="${subHeadingStyles}">${eventTitle}</h2>
    <p style="${textStyles}">📅 <span style="${highlightStyles}">${eventDate}</span></p>
    ${location ? `<p style="${textStyles}">📍 <span style="${highlightStyles}">${location}</span></p>` : ''}
    ${hostName ? `<p style="${textStyles}">🏠 Hosted by <span style="${highlightStyles}">${hostName}</span></p>` : ''}
    
    <p style="${textStyles}">
      Make sure you've got your poker face ready! 🃏
    </p>
    
    <a href="${eventUrl}" style="${buttonStyles}">View Event Details</a>
  `);
}

// Club invitation template
export function clubInviteTemplate({
  clubName,
  inviterName,
  inviteCode,
  joinUrl,
}: {
  clubName: string;
  inviterName: string;
  inviteCode: string;
  joinUrl: string;
}): string {
  return emailWrapper(`
    <h1 style="${headingStyles}">🃏 You're Invited!</h1>
    <p style="${textStyles}">
      <span style="${highlightStyles}">${inviterName}</span> has invited you to join their poker club on Home Hold'em Club!
    </p>
    
    <h2 style="${subHeadingStyles}">${clubName}</h2>
    
    <p style="${textStyles}">
      Join us for regular poker nights, track your stats, and compete on the leaderboard.
    </p>
    
    <h3 style="${subHeadingStyles}">Your Invite Code</h3>
    <div style="background: #0a0a0a; border: 2px dashed #d4af37; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #d4af37; font-family: monospace;">
        ${inviteCode}
      </span>
    </div>
    
    <p style="${textStyles}">
      Click the button below to join, or enter the code after signing up.
    </p>
    
    <a href="${joinUrl}" style="${buttonStyles}">Join Club</a>
  `);
}
