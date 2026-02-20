"use server"

import { getOpenAIClient } from "@/lib/openai"

export type AiActionState = {
  status: "idle" | "success" | "error"
  message?: string
  output?: string
}

export const aiInitialState: AiActionState = { status: "idle" }

export async function generateIdeaAction(
  _prevState: AiActionState,
  formData: FormData
): Promise<AiActionState> {
  const prompt = String(formData.get("prompt") ?? "").trim()

  if (!prompt) {
    return { status: "error", message: "Prompt is required." }
  }

  const client = getOpenAIClient()
  if (!client) {
    return {
      status: "error",
      message: "OPENAI_API_KEY is not configured. Add it to .env.local and restart the dev server.",
    }
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5-nano-2025-08-07",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You are a concise product strategist helping founders stress-test ideas.",
        },
        { role: "user", content: prompt },
      ],
    })

    const message = completion.choices[0]?.message?.content

    const output = Array.isArray(message)
      ? message
        .map((part) => {
          if (typeof part === "string") return part
          if (typeof part === "object" && "text" in part && typeof part.text === "string") {
            return part.text
          }
          return ""
        })
        .join("\n")
        .trim()
      : (message ?? "").toString().trim()

    return {
      status: "success",
      message: "Idea draft generated.",
      output: output || "OpenAI did not return any text.",
    }
  } catch (error) {
    console.error("OpenAI error", error)
    const friendlyMessage =
      error instanceof Error ? error.message : "Unexpected error while calling OpenAI."

    return { status: "error", message: friendlyMessage }
  }
}
