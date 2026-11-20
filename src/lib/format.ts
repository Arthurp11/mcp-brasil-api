export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Remove acentos e deixa em minúsculas, para comparar nomes. Ex: "São Paulo" -> "sao paulo" */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Remove pontuação e deixa em maiúsculas. Ex: "12.abc.345/01de-35" -> "12ABC34501DE35" */
export function normalizeCnpj(value: string): string {
  return value.replace(/[.\-/\s]/g, "").toUpperCase();
}

/**
 * Valida os dígitos verificadores de um CNPJ, numérico ou alfanumérico
 * (formato adotado pela Receita Federal a partir de julho de 2026).
 * Cada caractere vale seu código ASCII menos 48: "0"-"9" valem 0-9 e "A"-"Z" valem 17-42.
 */
export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj)) return false;
  // CNPJs com todos os caracteres iguais passam no cálculo, mas são inválidos
  if (/^(.)\1+$/.test(cnpj)) return false;

  const calcDigit = (base: string): number => {
    let sum = 0;
    let weight = 2;
    for (let i = base.length - 1; i >= 0; i--) {
      sum += (base.charCodeAt(i) - 48) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = calcDigit(cnpj.slice(0, 12));
  const second = calcDigit(cnpj.slice(0, 12) + first);
  return cnpj.endsWith(`${first}${second}`);
}

/** Converte "1966-08-01" em "01/08/1966". */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Converte "01/08/1966" em "1966-08-01". Datas já em ISO são devolvidas como estão. */
export function toIsoDate(date: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : date.trim();
}

/**
 * Data no fuso de Brasília, em ISO, deslocada em dias a partir de hoje.
 * Ex: isoDateInBrazil(-1) é a data de ontem.
 */
export function isoDateInBrazil(offsetDays = 0, now = new Date()): string {
  // "en-CA" formata como AAAA-MM-DD
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * Verdadeiro se todas as palavras da busca aparecem no texto, cada uma no início de uma
 * palavra (ignorando acentos e maiúsculas). Ex: "polo" encontra "Polo 1.0", mas não "Apolo".
 */
export function matchesAllWords(text: string, search: string): boolean {
  const normalized = normalizeName(text);
  return normalizeName(search)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => startsAWord(normalized, word));
}

function startsAWord(text: string, word: string): boolean {
  for (let i = text.indexOf(word); i !== -1; i = text.indexOf(word, i + 1)) {
    if (i === 0 || !/[a-z0-9]/.test(text.charAt(i - 1))) return true;
  }
  return false;
}
