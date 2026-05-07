// Sensitive patterns for PII detection
export const PII_PATTERNS = [
  // Credit card / Account numbers (12-19 digits)
  /\b(?:\d[ -]*?){12,19}\b/g,
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers (e.g., (123) 456-7890)
  /(?:\(\d{3}\)|\b\d{3})[-. ]?\d{3}[-. ]?\d{4}\b/g,
];

// Patterns that require context (e.g. keywords) to be redacted
// These are often confused with transaction IDs or dates
export const CONTEXTUAL_PII_PATTERNS = [
  // SSN (Standard format and variations) - 9 digits
  { pattern: /\b\d{3}[- ]?\d{2}[- ]?(?:\d{4}|[X]{4})\b/gi, keywords: ['ssn', 'social', 'tax', 'id'] },
  // Date of Birth - MM/DD/YYYY
  { pattern: /\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/g, keywords: ['dob', 'birth', 'born'] },
  // Zip codes - 5 or 9 digits
  { pattern: /\b\d{5}(?:-\d{4})?\b/g, keywords: ['address', 'zip', 'customer', 'bill', 'ship'] }
];

// Keywords that suggest following text is PII
export const PII_KEYWORDS = [
  'name', 'ssn', 'dob', 'phone', 'email', 'address', 'customer', 'cardholder', 'acc', 'account', 'routing', 'iban'
];
