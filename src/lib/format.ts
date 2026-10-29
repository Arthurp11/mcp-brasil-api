export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
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
