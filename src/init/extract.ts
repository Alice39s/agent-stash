import { parseSync, Visitor, type TemplateLiteral } from "oxc-parser";

/**
 * 取出 slash command 源码里 `{ type: "submit_prompt", content: \`…\` }` 的模板字符串。
 * 插值只允许 `values` 里列出的标识符，替换为对应的文本。
 */
export function extractSubmitPrompt(
  filename: string,
  source: string,
  values: Readonly<Record<string, string>>,
): string {
  const { program, errors } = parseSync(filename, source);
  if (errors.length > 0) {
    throw new Error(`Cannot parse ${filename}: ${errors.map((error) => error.message).join("; ")}`);
  }
  const found: TemplateLiteral[] = [];
  new Visitor({
    ObjectExpression(node) {
      const props = new Map(
        node.properties.flatMap((prop) =>
          prop.type === "Property" && prop.key.type === "Identifier"
            ? [[prop.key.name, prop.value] as const]
            : [],
        ),
      );
      const type = props.get("type");
      const content = props.get("content");
      if (
        type?.type === "Literal" &&
        type.value === "submit_prompt" &&
        content?.type === "TemplateLiteral"
      ) {
        found.push(content);
      }
    },
  }).visit(program);
  const [literal, ...rest] = found;
  if (literal === undefined || rest.length > 0) {
    throw new Error(`${filename} has ${found.length} submit_prompt templates, expected 1`);
  }
  const parts = literal.quasis.map((quasi, index) => {
    if (quasi.value.cooked === null) {
      throw new Error(`${filename} has an invalid escape in its submit_prompt template`);
    }
    const expression = literal.expressions[index];
    if (expression === undefined) return quasi.value.cooked;
    const value = expression.type === "Identifier" ? values[expression.name] : undefined;
    if (value === undefined) {
      throw new Error(`${filename} interpolates an unsupported expression in its submit_prompt`);
    }
    return quasi.value.cooked + value;
  });
  return `${parts.join("").trim()}\n`;
}

/** 删掉 prompt 开头的一句话；上游改了这句的措辞时直接报错。 */
export function removeLeadingSentence(prompt: string, sentence: string): string {
  if (!prompt.startsWith(sentence)) {
    throw new Error(`The prompt no longer starts with "${sentence}"`);
  }
  return prompt.slice(sentence.length).trimStart();
}
