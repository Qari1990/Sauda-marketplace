import type { Backend } from './types';
import { createDemoBackend } from './demo';
import { createSupabaseBackend } from './supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Uses the real Supabase backend when keys are set in .env, otherwise demo mode. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : createDemoBackend();
export type { Backend, Session } from './types';
