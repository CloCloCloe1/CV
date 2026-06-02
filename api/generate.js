import OpenAI from "openai";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "candidateName",
    "contactLine",
    "targetHeadline",
    "summary",
    "experience",
    "education",
    "skills",
    "coverLetter",
    "answers",
    "truthCheckNotes",
    "fitScore"
  ],
  properties: {
    candidateName: { type: "string" },
    contactLine: { type: "string" },
    targetHeadline: { type: "string" },
    summary: { type: "string" },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["organization", "location", "dates", "title", "bullets"],
        properties: {
          organization: { type: "string" },
          location: { type: "string" },
          dates: { type: "string" },
          title: { type: "string" },
          bullets: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 5
          }
        }
      },
      minItems: 1,
      maxItems: 4
    },
    education: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5
    },
    skills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "items"],
        properties: {
          label: { type: "string" },
          items: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 12
          }
        }
      },
      minItems: 3,
      maxItems: 6
    },
    coverLetter: { type: "string" },
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" }
        }
      },
      minItems: 0,
      maxItems: 8
    },
    truthCheckNotes: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 8
    },
    fitScore: {
      type: "object",
      additionalProperties: false,
      required: ["score", "strengths", "gaps"],
      properties: {
        score: { type: "integer", minimum: 0, maximum: 100 },
        strengths: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 6
        },
        gaps: {
          type: "array",
          items: { type: "string" },
          minItems: 0,
          maxItems: 6
        }
      }
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured. Add it in Vercel Project Settings or your local .env file."
    });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    const input = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const {
      profile = {},
      resume = "",
      company = "",
      role = "",
      jobDescription = "",
      questions = ""
    } = input || {};

    if (!resume.trim() || !jobDescription.trim()) {
      return res.status(400).json({ error: "Resume and job description are required." });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-2024-08-06",
      input: [
        {
          role: "system",
          content: [
            "You are an elite resume strategist, senior product career coach, and ATS-aware editor.",
            "Your job is to create a truthful, highly competitive, one-page resume for a specific role.",
            "Do not fabricate employers, dates, degrees, certifications, tools, metrics, domain experience, visas, or years of experience.",
            "You may rewrite, compress, merge, reorder, and sharpen existing content. You may add professional framing only when it is a reasonable inference from the resume.",
            "If the JD asks for a requirement the candidate does not appear to meet, do not pretend they meet it. Add it to truthCheckNotes/gaps and position adjacent strengths.",
            "Keep the resume concise enough for one page. Prioritize the most relevant experience and remove weaker unrelated details.",
            "Use strong, specific, professional English suitable for Canadian/North American job applications.",
            "Return only JSON matching the provided schema."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            candidateProfile: profile,
            baseResume: resume,
            targetCompany: company,
            targetRole: role,
            jobDescription,
            applicationQuestions: questions,
            outputInstructions: [
              "Make the resume fit the target role as strongly as possible while staying truthful.",
              "Keep total resume content appropriate for one page.",
              "Preserve the candidate's real timeline and combined experience level.",
              "Write coverLetter as a complete letter.",
              "Answer each application question if provided.",
              "For skills, group by useful categories such as Product & Strategy, Agile & Delivery, Data & Tools, Domain."
            ]
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "tailored_resume_package",
          strict: true,
          schema
        }
      }
    });

    const text = response.output_text;
    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Generation failed. Please check the API key, model access, and input length.",
      detail: error?.message || String(error)
    });
  }
}
