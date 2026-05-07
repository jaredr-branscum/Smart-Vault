import { PII_PATTERNS, CONTEXTUAL_PII_PATTERNS } from '../src/lib/pii-patterns';

describe('PII Detection Patterns', () => {
  const testPatterns = (text: string, context: string[] = []) => {
    const globalMatch = PII_PATTERNS.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(text);
    });
    if (globalMatch) return true;

    const contextualMatch = CONTEXTUAL_PII_PATTERNS.some(cp => {
      cp.pattern.lastIndex = 0;
      if (cp.pattern.test(text)) {
        return cp.keywords.some(kw => context.some(c => c.toLowerCase().includes(kw)));
      }
      return false;
    });
    return contextualMatch;
  };

  it('detects credit card and account numbers globally', () => {
    expect(testPatterns('My card is 1234-5678-9012-3456')).toBe(true);
    expect(testPatterns('9283-1002-4451')).toBe(true); // Account number
  });

  it('detects email addresses globally', () => {
    expect(testPatterns('Contact me at john.doe@example.com')).toBe(true);
  });

  it('detects SSNs only with context', () => {
    expect(testPatterns('666-12-1234')).toBe(false); // No context
    expect(testPatterns('666-12-1234', ['SSN'])).toBe(true); // With context
  });

  it('detects dates of birth only with context', () => {
    expect(testPatterns('09/22/1992')).toBe(false); // No context
    expect(testPatterns('09/22/1992', ['DOB'])).toBe(true); // With context
  });

  it('detects phone numbers globally', () => {
    expect(testPatterns('My number is 123-456-7890')).toBe(true);
    expect(testPatterns('(123) 456-7890')).toBe(true);
  });

  it('detects zip codes only with context', () => {
    expect(testPatterns('90210')).toBe(false); // No context (might be merchant)
    expect(testPatterns('90210', ['Address'])).toBe(true); // With context
  });

  it('does not flag normal merchant names or amounts', () => {
    expect(testPatterns('Walmart')).toBe(false);
    expect(testPatterns('Total: $123.45')).toBe(false);
  });
});
