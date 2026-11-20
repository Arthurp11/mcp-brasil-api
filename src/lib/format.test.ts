import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  formatDate,
  getYesterday,
  isValidCnpj,
  matchesAllWords,
  normalizeCnpj,
  normalizeName,
  onlyDigits,
  toIsoDate,
} from "./format.js";

describe("onlyDigits", () => {
  test("remove tudo que não é dígito", () => {
    assert.equal(onlyDigits("01001-000"), "01001000");
    assert.equal(onlyDigits(" 12.345 "), "12345");
  });
});

describe("normalizeName", () => {
  test("remove acentos, espaços nas pontas e deixa em minúsculas", () => {
    assert.equal(normalizeName("São Paulo"), "sao paulo");
    assert.equal(normalizeName("  Açucena "), "acucena");
    assert.equal(normalizeName("MOGI GUAÇU"), "mogi guacu");
  });
});

describe("normalizeCnpj", () => {
  test("remove pontuação e deixa em maiúsculas", () => {
    assert.equal(normalizeCnpj("00.000.000/0001-91"), "00000000000191");
    assert.equal(normalizeCnpj("12.abc.345/01de-35"), "12ABC34501DE35");
  });
});

describe("isValidCnpj", () => {
  test("aceita CNPJs numéricos válidos, com ou sem pontuação", () => {
    assert.equal(isValidCnpj("00.000.000/0001-91"), true); // Banco do Brasil
    assert.equal(isValidCnpj("33000167000101"), true); // Petrobras
  });

  test("aceita CNPJ alfanumérico válido, inclusive em minúsculas", () => {
    // Exemplo oficial da Receita Federal
    assert.equal(isValidCnpj("12.ABC.345/01DE-35"), true);
    assert.equal(isValidCnpj("12abc34501de35"), true);
  });

  test("rejeita dígitos verificadores errados", () => {
    assert.equal(isValidCnpj("00.000.000/0001-92"), false);
    assert.equal(isValidCnpj("12.ABC.345/01DE-36"), false);
  });

  test("rejeita CNPJ com todos os caracteres iguais", () => {
    assert.equal(isValidCnpj("00000000000000"), false);
    assert.equal(isValidCnpj("11111111111111"), false);
  });

  test("rejeita tamanho errado e letras nos dígitos verificadores", () => {
    assert.equal(isValidCnpj("0000000000019"), false);
    assert.equal(isValidCnpj("000000000001911"), false);
    assert.equal(isValidCnpj("12ABC34501DEAB"), false);
  });
});

describe("formatDate", () => {
  test("converte data ISO para o formato brasileiro", () => {
    assert.equal(formatDate("1966-08-01"), "01/08/1966");
  });
});

describe("toIsoDate", () => {
  test("converte DD/MM/AAAA para ISO e mantém datas já em ISO", () => {
    assert.equal(toIsoDate("01/08/1966"), "1966-08-01");
    assert.equal(toIsoDate("1966-08-01"), "1966-08-01");
  });
});

describe("getYesterday", () => {
  test("usa o horário de Brasília", () => {
    // 02:00 UTC do dia 21 ainda é dia 20 em Brasília, então ontem é dia 19
    assert.equal(getYesterday(new Date("2026-11-21T02:00:00Z")), "2026-11-19");
  });

  test("funciona na virada do ano", () => {
    assert.equal(getYesterday(new Date("2027-01-01T15:00:00Z")), "2026-12-31");
  });
});

describe("matchesAllWords", () => {
  test("exige todas as palavras, em qualquer ordem, ignorando acentos", () => {
    assert.equal(matchesAllWords("ITAÚ UNIBANCO S.A.", "itau"), true);
    assert.equal(matchesAllWords("AMAROK High.CD 2.0 16V TDI", "high amarok"), true);
    assert.equal(matchesAllWords("AMAROK High.CD 2.0 16V TDI", "amarok 3.0"), false);
  });

  test("cada palavra precisa começar uma palavra do texto", () => {
    assert.equal(matchesAllWords("Polo 1.0 TSI", "polo"), true);
    assert.equal(matchesAllWords("Apolo GL 1.8", "polo"), false);
    assert.equal(matchesAllWords("Banco ItauBank S.A.", "itau"), true);
    assert.equal(matchesAllWords("ONIX HATCH 1.0", "1.0"), true);
    assert.equal(matchesAllWords("BCO SANTANDER (BRASIL) S.A.", "santander brasil"), true);
  });
});
