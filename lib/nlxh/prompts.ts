import type { PracticeMode, QuestionAnalysis } from "./types";
import { PRACTICE_MODE_LABELS, QUESTION_TYPE_LABELS } from "./types";

export function analysisPrompt(question: string): string {
  return `Bạn là hệ thống phân tích đề Nghị luận xã hội tiếng Việt.
Phân tích đề sau. Phân loại duy nhất:
D1_L1 = phẩm chất/tư tưởng tích cực
D1_L2 = tư tưởng/lối sống tiêu cực
D1_L3 = ý kiến/câu nói/quan niệm sống
D2_L1 = hiện tượng đời sống tiêu cực
D2_L2 = hiện tượng đời sống tích cực
Không bịa sự kiện. Trả JSON ngắn.

QUESTION:
${question}`;
}

export function seedPrompt(params: {
  question: string;
  analysis: QuestionAnalysis;
  mode: PracticeMode;
  level: number;
}): string {
  return `Tạo dữ liệu luyện tập tái sử dụng cho kỹ năng ${PRACTICE_MODE_LABELS[params.mode]} (cấp ${params.level}).
QUESTION: ${params.question}
TYPE: ${params.analysis.questionType}
CORE ISSUE: ${params.analysis.coreIssue}
Không bịa số liệu, nhân vật, văn bản pháp luật.
Task ngắn. hints tối đa 3.`;
}

export function evaluatePrompt(params: {
  question: string;
  analysis: QuestionAnalysis | null;
  mode: PracticeMode;
  answer: string;
  previousWeaknesses?: string[];
}): string {
  const extra = params.previousWeaknesses?.length
    ? `PREVIOUS WEAKNESSES:\n${params.previousWeaknesses.join("; ")}`
    : "";
  return `ROLE: Vietnamese social-essay evaluator.
TASK: Evaluate only ${PRACTICE_MODE_LABELS[params.mode]}.
QUESTION: ${params.question.slice(0, 400)}
CORE ISSUE: ${params.analysis?.coreIssue ?? ""}
ANSWER:
${params.answer.slice(0, 2500)}
${extra}
RUBRIC: relevance, clarity, completeness.
Return short JSON: score 0-10, strengths max 2, weaknesses max 2, suggestedRevision.
Không viết bài mẫu dài. Không bịa dẫn chứng.`;
}

export function fullEssayEvaluatePrompt(params: {
  question: string;
  analysis: QuestionAnalysis | null;
  answer: string;
}): string {
  return `Chấm bài nghị luận xã hội tiếng Việt, thang 0-10.
QUESTION: ${params.question.slice(0, 400)}
TYPE: ${params.analysis?.questionType ?? ""}
CORE ISSUE: ${params.analysis?.coreIssue ?? ""}
ESSAY:
${params.answer.slice(0, 6000)}
Không yêu cầu viết lại cả bài. Không bịa sự kiện.
Trả JSON: overallScore, scores (taskResponse, structure, argumentation, analysis, criticalThinking, evidence, solutions, language, cohesion), strengths, priorityFixes, missingComponents, nextPractice.`;
}

export function packExportPrompt(essays: { fingerprint: string; prompt: string }[]): string {
  const list = essays
    .map(
      (item, index) =>
        `[${index + 1}] fingerprint=${item.fingerprint}\n${item.prompt}`,
    )
    .join("\n\n");

  return `Bạn là hệ thống tạo dữ liệu luyện Nghị luận xã hội tiếng Việt cho kỳ thi Văn bằng 2 Công an.

Nhiệm vụ: với MỖI đề dưới đây, trả về JSON đúng schema, không markdown.

Quy tắc:
- Không bịa số liệu, văn bản pháp luật, nhân vật, sự kiện cụ thể. Dẫn chứng phải khái quát.
- questionType chỉ một trong: D1_L1, D1_L2, D1_L3, D2_L1, D2_L2.
- Sinh seed cho các mode: identify_type, identify_issue, introduction, explanation, build_arguments, causes, benefits, consequences, evidence, counter_argument, solutions, conclusion, paragraph, outline, full_essay.
- Mỗi mode cần level 1 và 2; các mode viết (introduction, explanation, build_arguments, counter_argument, solutions, conclusion, full_essay) thêm level 3.
- data.task bắt buộc. data.hints tối đa 3 câu. identify_type phải có correctType. build_arguments/evidence level 1 nên có choices (id, text, correct).
- Có thể thêm referenceEssay (essay 700-900 chữ + outline 8-12 gạch) nếu chắc chắn không bịa dẫn chứng.

Schema gốc:
{
  "version": 1,
  "frameworkVersion": "framework_v1",
  "promptVersion": "core_v1",
  "items": [
    {
      "essayFingerprint": "",
      "analysis": {
        "questionType": "",
        "mainTopic": "",
        "coreIssue": "",
        "keywords": [],
        "suggestedPosition": ""
      },
      "seeds": [
        { "practiceMode": "introduction", "level": 1, "data": { "task": "", "hints": [] } }
      ],
      "referenceEssay": { "essay": "", "outline": [] }
    }
  ]
}

Dạng đề:
${Object.entries(QUESTION_TYPE_LABELS)
  .map(([key, label]) => `- ${key}: ${label}`)
  .join("\n")}

ĐỀ:
${list}

Chỉ trả JSON hợp lệ.`;
}

export function externalGradePrompt(params: {
  attemptId: string;
  question: string;
  analysis: QuestionAnalysis | null;
  mode: PracticeMode;
  answer: string;
}): string {
  return `Chấm bài luyện ${PRACTICE_MODE_LABELS[params.mode]} (thang 0-10).
attemptId: ${params.attemptId}
QUESTION: ${params.question}
TYPE: ${params.analysis?.questionType ?? ""}
CORE ISSUE: ${params.analysis?.coreIssue ?? ""}
ANSWER:
${params.answer}

Không bịa dẫn chứng. Không viết lại cả bài trừ suggestedRevision ngắn.

Trả JSON:
{
  "attemptId": "${params.attemptId}",
  "overallScore": 0,
  "score": 0,
  "strengths": [],
  "weaknesses": [],
  "priorityFixes": [],
  "missingComponents": [],
  "nextPractice": [],
  "scores": {
    "taskResponse": 0,
    "structure": 0,
    "argumentation": 0,
    "analysis": 0,
    "criticalThinking": 0,
    "evidence": 0,
    "solutions": 0,
    "language": 0,
    "cohesion": 0
  }
}`;
}
