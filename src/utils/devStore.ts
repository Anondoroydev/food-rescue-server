import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), '.dev_users.json');

type DevUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  role?: string;
  organization_name?: string;
  latitude?: number;
  longitude?: number;
  reset_token?: string | null;
  reset_token_expiry?: Date | string | null;
  is_active?: boolean;
};

const read = (): DevUser[] => {
  try {
    if (!fs.existsSync(FILE)) return [];
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (_) {
    return [];
  }
};

const write = (items: DevUser[]) => {
  try {
    fs.writeFileSync(FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (_) {}
};

export const getDevUsers = (): DevUser[] => read();
export const getDevUserByEmail = (email: string): DevUser | undefined => read().find(u => u.email === email);
export const addDevUser = (user: DevUser) => {
  const items = read();
  items.push(user);
  write(items);
};
export const updateDevUser = (email: string, updates: Partial<DevUser>): DevUser | undefined => {
  const items = read();
  const idx = items.findIndex(u => u.email === email);
  if (idx === -1) return undefined;
  items[idx] = { ...items[idx], ...updates };
  write(items);
  return items[idx];
};
export const clearDevUsers = () => write([]);

export default { getDevUsers, getDevUserByEmail, addDevUser, clearDevUsers };
