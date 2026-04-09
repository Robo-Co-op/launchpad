/**
 * 個人識別情報 (PII) をマスクするユーティリティ
 * エージェントへの入力から機密情報を除去する
 */
export function maskPII(text: string): string {
  return text
    // メールアドレス
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    // 電話番号 (日本・国際形式)
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
    .replace(/\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{4,10}/g, '[PHONE]')
    // パスポート番号 (基本パターン)
    .replace(/\b[A-Z]{1,2}\d{6,9}\b/g, '[PASSPORT]')
    // 数字ID (9〜12桁)
    .replace(/\b\d{9,12}\b/g, '[ID_NUMBER]')
    // クレジットカード番号
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_NUMBER]')
}
