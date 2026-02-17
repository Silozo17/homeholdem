export interface BotPersona {
  name: string;
  avatarUrl: string;
  level: number;
  countryCode: string;
}

export const BOT_PERSONAS: BotPersona[] = [
  { name: 'Viktor',   avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Viktor&backgroundColor=b6e3f4',   level: 32, countryCode: 'RU' },
  { name: 'Luna',     avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc',     level: 18, countryCode: 'BR' },
  { name: 'Ace',      avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Ace&backgroundColor=c0aede',      level: 41, countryCode: 'US' },
  { name: 'Maverick', avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Maverick&backgroundColor=d1f4d1', level: 12, countryCode: 'AU' },
  { name: 'Sakura',   avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Sakura&backgroundColor=ffdfbf',   level: 27, countryCode: 'JP' },
  { name: 'Klaus',    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Klaus&backgroundColor=b6e3f4',    level: 35, countryCode: 'DE' },
  { name: 'Priya',    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Priya&backgroundColor=ffd5dc',    level: 9,  countryCode: 'IN' },
  { name: 'Carlos',   avatarUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Carlos&backgroundColor=c0aede',   level: 22, countryCode: 'MX' },
];

/** Get persona for a bot by its 0-based bot index */
export function getBotPersona(botIndex: number): BotPersona {
  return BOT_PERSONAS[botIndex % BOT_PERSONAS.length];
}
