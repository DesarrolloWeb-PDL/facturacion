export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
};

export type SessionDraft = {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
};

export function createUserId() {
  return crypto.randomUUID();
}

export function createSessionId() {
  return crypto.randomUUID();
}

export function createSessionToken() {
  return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
}
