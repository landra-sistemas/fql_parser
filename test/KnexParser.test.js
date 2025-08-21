import { expect } from "chai";
import { FQLParser, KnexParser } from "../src/index.mjs";
import Knex from "knex";
const knex = Knex({ client: "pg" });

describe("KnexParser", () => {
  describe("Parse Simple Query", () => {
    it("Parse: OR logic", () => {
      const parser = new FQLParser();

      const data = parser.parse("test:value OR (asdfasdf:fdfdsfd)");

      expect(data).not.to.be.null;
      expect(data).to.be.an("array");
      expect(data).to.have.lengthOf(2);

      const str = new KnexParser().toKnex(knex, data);

      expect(str.toSQL()).to.be.an("object");
      expect(str.toSQL()).to.have.property("sql");
      expect(str.toSQL().sql).to.contain("OR");

      console.log(str.toSQL());
    });
    it("Parse: Between", () => {
      const parser = new FQLParser();

      const data = parser.parse("test:[a TO z]");

      expect(data).not.to.be.null;
      expect(data).to.be.an("array");
      expect(data).to.have.lengthOf(1);

      const str = new KnexParser().toKnex(knex, data);

      expect(str.toSQL()).to.be.an("object");
      expect(str.toSQL()).to.have.property("sql");
      expect(str.toSQL().sql).to.contain("BETWEEN");

      console.log(str.toSQL());
    });

    it("Parse: IN", () => {
      const parser = new FQLParser();

      const data = parser.parse("test2:asdf,fdsf,asdf");

      expect(data).not.to.be.null;
      expect(data).to.be.an("array");
      expect(data).to.have.lengthOf(1);

      const str = new KnexParser().toKnex(knex, data);

      expect(str.toSQL()).to.be.an("object");
      expect(str.toSQL()).to.have.property("sql");
      expect(str.toSQL().sql).to.contain("IN");

      console.log(str.toSQL());
    });

    it("Parse: withQuotes", () => {
      const parser = new FQLParser();

      const data = parser.parse('test:"query larga con espacios"');

      expect(data).not.to.be.null;
      expect(data).to.be.an("array");
      expect(data).to.have.lengthOf(1);

      const str = new KnexParser().toKnex(knex, data);

      expect(str.toSQL()).to.be.an("object");
      expect(str.toSQL()).to.have.property("sql");
      expect(str.toSQL().sql).to.contain("LIKE");

      console.log(str.toSQL());
    });
    it("Parse: withQuotes and special syntax", () => {
      const parser = new FQLParser();

      const data = parser.parse('rule_definition:"Tests[TestLISCode = 2362]"');

      expect(data).not.to.be.null;
      expect(data).to.be.an("array");
      expect(data).to.have.lengthOf(1);

      const str = new KnexParser().toKnex(knex, data);

      expect(str.toSQL()).to.be.an("object");
      expect(str.toSQL()).to.have.property("sql");
      expect(str.toSQL().sql).to.contain("LIKE");

      console.log(str.toSQL());
    });

    it("Parse: fulltext", () => {
      const parser = new FQLParser({ allowGlobalSearch: true });

      const data = parser.parse("+testing");

      expect(data).not.to.be.null;
      expect(data).to.be.an("array");
      expect(data).to.have.lengthOf(1);

      const str = new KnexParser().toKnex(knex, data);

      console.log(str.toSQL());
      expect(str.toSQL()).to.be.an("object");
      expect(str.toSQL()).to.have.property("sql");
      expect(str.toSQL().sql).to.contain("vector");

    });
  });
});
