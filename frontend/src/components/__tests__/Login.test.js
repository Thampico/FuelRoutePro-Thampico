import { isValidPassword } from '../Login';

describe('isValidPassword', () => {
  test('rejects passwords that are too short', () => {
    expect(isValidPassword('a1!')).toBe(false);
  });

  test('rejects passwords without digits', () => {
    expect(isValidPassword('abcdef!')).toBe(false);
  });

  test('rejects passwords without special characters', () => {
    expect(isValidPassword('abcdef1')).toBe(false);
  });

  test('accepts valid passwords', () => {
    expect(isValidPassword('abc123!')).toBe(true);
  });
});
