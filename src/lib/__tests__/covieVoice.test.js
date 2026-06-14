import { describe, it, expect } from 'vitest';
import { isAdviceQuestion } from '../covieVoice';

// Covie must refuse PERSONAL-advice prompts (educational tool only) but still answer genuine
// concept/education questions. The tricky case is a decision request dressed up in concept
// framing — the personal-advice triggers are checked BEFORE the concept allowlist so a stray
// "explain"/"why" can't open a bypass.
describe('isAdviceQuestion — personal-advice gate', () => {
  it('refuses a decision request disguised as a concept question', () => {
    expect(isAdviceQuestion('Explain why I should retire at 60')).toBe(true);
    expect(isAdviceQuestion('Can you explain why we should downsize the house?')).toBe(true);
  });

  it('refuses natural "I/we should <verb>" phrasing', () => {
    expect(isAdviceQuestion('I think we should buy an investment property')).toBe(true);
    expect(isAdviceQuestion('Maybe I should salary sacrifice more this year')).toBe(true);
  });

  it('refuses classic "should I/we <verb>" phrasing', () => {
    expect(isAdviceQuestion('Should I retire now?')).toBe(true);
    expect(isAdviceQuestion('Can we afford to stop working?')).toBe(true);
    expect(isAdviceQuestion('Will we have enough?')).toBe(true);
    expect(isAdviceQuestion('What should I invest in?')).toBe(true);
  });

  it('allows genuine concept/education questions', () => {
    expect(isAdviceQuestion('What is a franking credit?')).toBe(false);
    expect(isAdviceQuestion('Explain how franking credits work')).toBe(false);
    expect(isAdviceQuestion('How does the age pension work?')).toBe(false);
    expect(isAdviceQuestion('What is the difference between concessional and non-concessional contributions?')).toBe(false);
  });

  it('does not fire on "should I understand …" (no decision verb)', () => {
    expect(isAdviceQuestion('Should I understand franking credits before retiring?')).toBe(false);
  });

  it('handles empty / nullish input', () => {
    expect(isAdviceQuestion('')).toBe(false);
    expect(isAdviceQuestion(null)).toBe(false);
    expect(isAdviceQuestion(undefined)).toBe(false);
  });
});
