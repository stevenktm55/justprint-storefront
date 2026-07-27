const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSegment(length: number): string {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length);
    result += ALPHABET[randomIndex];
  }
  return result;
}

/** Realistic mock JustPrint configuration id, e.g. raw_cfg_x8k2m9 */
export function generateConfigurationId(): string {
  return `raw_cfg_${randomSegment(6)}`;
}
