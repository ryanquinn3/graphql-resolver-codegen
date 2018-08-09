#!/usr/bin/env node

import * as yargs from "yargs";
import { parse, DocumentNode } from "graphql";
import * as fs from "fs";
import * as chalk from "chalk";
import * as prettier from "prettier";
import { GraphQLTypeObject, extractGraphQLTypes } from "./source-helper";
import { resolve } from "path";
import { generate } from "./generators/ts-generator";
import { importSchema } from "graphql-import";

type CLIArgs = {
  schemaPath: string;
  output: string;
};

export type GenerateCodeArgs = {
  schema: DocumentNode;
  prettify?: boolean;
};

export function generateCode({
  schema = undefined,
  prettify = true
}: GenerateCodeArgs): string {
  if (!schema) {
    console.error(chalk.default.red(`Please provide a parsed GraphQL schema`));
  }

  const types: GraphQLTypeObject[] = extractGraphQLTypes(schema);
  const code = generate(types);

  if (prettify) {
    return prettier.format(code, {
      parser: "typescript"
    });
  } else {
    return code;
  }
}

function run() {
  const argv = yargs
    .usage("Usage: $0 -s [schema-path] -o [output-path]")
    .alias("s", "schema-path")
    .describe("s", "GraphQL schema file path")
    .alias("o", "output")
    .describe("o", "Output file path")
    .demandOption(["s"])
    .strict().argv;
  const args: CLIArgs = {
    schemaPath: resolve(argv.schemaPath),
    output: argv.output || "./resolvers.ts"
  };

  if (!fs.existsSync(args.schemaPath)) {
    console.error(`The schema file ${args.schemaPath} does not exist`);
    process.exit(1);
  }

  let schema = undefined;
  try {
    schema = importSchema(args.schemaPath);
  } catch (e) {
    console.error(
      chalk.default.red(`Error occurred while reading schema: ${e}`)
    );
    process.exit(1);
  }

  let parsedSchema = undefined;
  try {
    parsedSchema = parse(schema);
  } catch (e) {
    console.error(chalk.default.red(`Failed to parse schema: ${e}`));
    process.exit(1);
  }

  const code = generateCode({ schema: parsedSchema });
  try {
    fs.writeFileSync(args.output, code, { encoding: "utf-8" });
  } catch (e) {
    console.error(
      chalk.default.red(
        `Failed to write the file at ${args.output}, error: ${e}`
      )
    );
  }
  console.log(chalk.default.green(`Code generated at ${args.output}`));
  process.exit(0);
}

// Only call run when running from CLI, not when included for tests
if (require.main === module) {
  run();
}