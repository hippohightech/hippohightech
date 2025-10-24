import crypto from 'crypto';

export const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateUniqueSlug = async (
  name: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> => {
  let slug = createSlug(name);
  let counter = 1;

  while (await checkExists(slug)) {
    slug = `${createSlug(name)}-${counter}`;
    counter++;
  }

  return slug;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const calculateTrialEndDate = (): Date => {
  return addDays(new Date(), 14); // 14-day trial
};

export const isTrialActive = (trialEndsAt: string | null): boolean => {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
};
