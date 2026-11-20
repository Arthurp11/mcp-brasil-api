export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// "São Paulo" -> "sao paulo"
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// "12.abc.345/01de-35" -> "12ABC34501DE35"
export function normalizeCnpj(value: string): string {
  return value.replace(/[.\-/\s]/g, "").toUpperCase();
}

// No CNPJ alfanumérico cada caractere vale o código ASCII menos 48 ("0" = 0, "A" = 17)
function calcCnpjDigit(base: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    sum += (base.charCodeAt(i) - 48) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj)) return false;
  if (/^(.)\1+$/.test(cnpj)) return false;

  const base = cnpj.slice(0, 12);
  const first = calcCnpjDigit(base);
  const second = calcCnpjDigit(base + first);
  return cnpj.endsWith(`${first}${second}`);
}

// "1966-08-01" -> "01/08/1966"
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// "01/08/1966" -> "1966-08-01"
export function toIsoDate(date: string): string {
  if (!date.includes("/")) return date;
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
}

// Data de ontem no horário de Brasília, no formato AAAA-MM-DD
export function getYesterday(now = new Date()): string {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return yesterday.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// Confere se cada palavra da busca é o começo de alguma palavra do texto.
// Ex: "polo" encontra "Polo 1.0", mas não "Apolo".
export function matchesAllWords(text: string, search: string): boolean {
  const textWords = normalizeName(text).split(/[\s()/,-]+/);
  const searchWords = normalizeName(search).split(/\s+/);

  return searchWords.every((word) => textWords.some((textWord) => textWord.startsWith(word)));
}
