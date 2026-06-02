# Clarity CV

A clean browser-based resume tailoring workspace.

Users can:

- Sign in with email and name
- Save a reusable resume profile
- Upload or paste resume content
- Enter a target company, role, and job description
- Generate a tailored strategy review first
- Approve major structure edits, evidence gaps, and skills updates
- Generate a tailored one-page CV
- Download the CV and cover letter as Word `.docx` documents

This app uses a Vercel serverless API route to call OpenAI securely.

## Local development

1. Copy `.env.example` to `.env`
2. Add `OPENAI_API_KEY`
3. Run `npm install`
4. Run `npm run dev`
5. Open `http://localhost:4174`

User profiles are stored locally in the browser with `localStorage`. OpenAI API keys must stay on the server/Vercel side and should never be placed in frontend code.
