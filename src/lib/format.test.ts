import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatDate, isValidCnpj, normalizeCnpj, normalizeName, onlyDigits } from "./format.js";

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
