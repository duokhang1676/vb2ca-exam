import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseSampleJsonText } from "../lib/exam/parse-sample-json";
import { saveGeneratedSampleExam } from "../lib/exam/sample";

async function loadEnvLocal() {
  try {
    const text = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // App env may already be set.
  }
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error("Dùng: npx tsx scripts/import-ca1-sample.ts <file.json>");
  }

  await loadEnvLocal();

  const filePath = path.resolve(process.cwd(), fileArg);
  const payload = parseSampleJsonText(await readFile(filePath, "utf8"));
  const result = await saveGeneratedSampleExam({
    examCode: payload.examCode,
    essayPrompt: payload.essayPrompt,
    questions: payload.questions,
    answerKey: payload.answerKey,
    diversity: payload.diversity,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
