import { apiError } from "@/lib/api";
import {
  hasCloudChat,
  hasHuggingFaceChat,
  hasOpenAIChat,
  isVercelDeploy,
} from "@/lib/env";
import { getHuggingFaceModel } from "@/src/services/ai/huggingface";
import {
  getHuggingFaceImageModel,
  hasHuggingFaceImages,
} from "@/lib/services/huggingface-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({
      vercel: isVercelDeploy(),
      huggingface: hasHuggingFaceChat(),
      openai: hasOpenAIChat(),
      cloudChat: hasCloudChat(),
      cloudImages: hasHuggingFaceImages(),
      defaultModel: hasHuggingFaceChat()
        ? getHuggingFaceModel()
        : hasOpenAIChat()
          ? process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"
          : null,
      defaultImageModel: hasHuggingFaceImages()
        ? getHuggingFaceImageModel()
        : null,
    });
  } catch {
    return apiError("cloud status failed", 500);
  }
}
