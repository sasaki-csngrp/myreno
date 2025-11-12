import bcrypt from 'bcryptjs';

/**
 * パスワードをハッシュ化する
 * @param password 平文のパスワード
 * @returns ハッシュ化されたパスワード
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * パスワードを検証する
 * @param password 平文のパスワード
 * @param hashedPassword ハッシュ化されたパスワード
 * @returns パスワードが一致する場合true
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

