import { decryptContactBook, encryptContactBook, type ContactRecord, type EncryptedContactBook } from './crypto';

const ENCRYPTED_CONTACTS_KEY = 'kite:encrypted-address-book:v1';

export async function loadContacts(prfRoot: Uint8Array): Promise<ContactRecord[]> {
  const raw = localStorage.getItem(ENCRYPTED_CONTACTS_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Encrypted address book storage is corrupted.');
  }
  return decryptContactBook(prfRoot, parsed);
}

export async function saveContacts(prfRoot: Uint8Array, contacts: ContactRecord[]): Promise<void> {
  const vault: EncryptedContactBook = await encryptContactBook(prfRoot, contacts);
  localStorage.setItem(ENCRYPTED_CONTACTS_KEY, JSON.stringify(vault));
}

export function clearEncryptedContacts() {
  localStorage.removeItem(ENCRYPTED_CONTACTS_KEY);
}
