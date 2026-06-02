const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const STORAGE_KEY = "clarity-cv-users";
const ACTIVE_USER_KEY = "clarity-cv-active-user";

const fields = {
  loginEmail: $("#loginEmailInput"),
  loginName: $("#loginNameInput"),
  name: $("#candidateNameInput"),
  location: $("#locationInput"),
  phone: $("#phoneInput"),
  linkedin: $("#linkedinInput"),
  resume: $("#resumeInput"),
  company: $("#companyInput"),
  role: $("#roleInput"),
  jd: $("#jdInput"),
  questions: $("#questionsInput")
};

let generated = {
  resumeText: "",
  coverText: "",
  model: null,
  approvals: {
    structure: false,
    evidence: false,
    skills: false
  }
};

const stopWords = new Set([
  "and", "the", "for", "with", "you", "your", "our", "are", "will", "that", "this", "from",
  "have", "has", "job", "role", "work", "team", "teams", "using", "into", "over", "more",
  "able", "about", "their", "them", "they", "to", "of", "in", "on", "a", "an", "is", "as",
  "or", "be", "by", "at", "we", "it", "required", "skills", "experience"
]);

const sampleResume = `Chloe Li
+1 437 661 2745 | liminxuan118@gmail.com | LinkedIn | Toronto, ON

PROFESSIONAL SUMMARY
Product and data-driven Business Analyst with experience in financial reporting, data analysis, and operational planning. Skilled in Excel, SQL, Tableau, Power BI, Jira, Confluence, Power Automate, process mapping, and cross-functional collaboration.

PROFESSIONAL EXPERIENCE
Investment Management Corporation of Ontario (IMCO), Toronto, ON | 09/2025 - 01/2026
Business Systems Analyst | Internship
- Designed Power Automate workflows and Power Platform deployment request processes; automated monthly sanction screening using Excel and Power Query, reducing manual effort by 40% and improving compliance efficiency by 30%.
- Analyzed 150+ monthly service tickets to identify recurring pain points, propose data-driven solutions, and surface 8+ automation opportunities, accelerating issue resolution by 25%.
- Prepared IT enhancement proposals, data configuration standards, and process mapping documentation in Visio, improving workflow transparency by 50% and aligning 10+ cross-functional stakeholders.

Nissan Motor Corporation, Mississauga, ON | 05/2024 - 12/2024
Business Systems Analyst | Internship
- Led cross-functional development and launch support for MyNissan App financial features, translating business, compliance, and user requirements into delivery-ready specifications while resolving 15+ cross-team requirement conflicts.
- Supported Agile product delivery through Jira issue tracking, release coordination, defect triage, and stakeholder follow-ups, contributing to three on-time releases and a 95% defect resolution rate.
- Built Excel and Tableau dashboards to monitor financial performance, portfolio trends, and operational metrics, improving product and business decision-making by 15%.

HGTECH, Wuhan, China | 05/2023 - 08/2023
International Business Analyst | Internship
- Analyzed 1,000+ multi-channel inquiries and cleansed CRM data to identify customer demand patterns and inform product line adjustment decisions.
- Developed 10+ multilingual product websites using HTML/CSS and applied SEO and UX/UI improvements that increased organic traffic by 28%.

EDUCATION
University of Waterloo, Master of Management Sciences | 09/2023 - 06/2025
Queen's University, Bachelor of Computing (Honors), Major in Computing Arts; Minor in Economics | 09/2019 - 06/2023

SKILLS
SQL, Excel, Tableau, Power BI, Python, Power Query, Power Automate, Dynamics 365, Jira, Confluence, Visio, HTML, CSS, R`;

function users() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUsers(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function activeEmail() {
  return localStorage.getItem(ACTIVE_USER_KEY) || "";
}

function activeUser() {
  const email = activeEmail();
  return email ? users()[email] || null : null;
}

function login(email, name) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    showToast("请输入 email。");
    return;
  }

  const allUsers = users();
  allUsers[normalizedEmail] ||= {
    email: normalizedEmail,
    name: name.trim() || normalizedEmail.split("@")[0],
    location: "",
    phone: "",
    linkedin: "",
    resume: "",
    updatedAt: new Date().toISOString()
  };
  if (name.trim()) allUsers[normalizedEmail].name = name.trim();
  saveUsers(allUsers);
  localStorage.setItem(ACTIVE_USER_KEY, normalizedEmail);
  hydrate();
  showApp();
}

function logout() {
  localStorage.removeItem(ACTIVE_USER_KEY);
  $("#appShell").classList.add("hidden");
  $("#loginScreen").classList.remove("hidden");
  fields.loginEmail.value = "";
  fields.loginName.value = "";
}

function hydrate() {
  const user = activeUser();
  if (!user) return;
  $("#currentUserEmail").textContent = user.email;
  fields.name.value = user.name || "";
  fields.location.value = user.location || "";
  fields.phone.value = user.phone || "";
  fields.linkedin.value = user.linkedin || "";
  fields.resume.value = user.resume || "";
}

function showApp() {
  $("#loginScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  lucide.createIcons();
}

function saveProfile() {
  const email = activeEmail();
  if (!email) return logout();
  const allUsers = users();
  allUsers[email] = {
    ...allUsers[email],
    name: fields.name.value.trim(),
    location: fields.location.value.trim(),
    phone: fields.phone.value.trim(),
    linkedin: fields.linkedin.value.trim(),
    resume: fields.resume.value.trim(),
    updatedAt: new Date().toISOString()
  };
  saveUsers(allUsers);
  showToast("Profile saved. 之后这个用户不需要重复上传简历。");
}

async function handleResumeUpload(file) {
  if (!file) return;
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    fields.resume.value = await file.text();
    showToast("Resume text imported. 点击 Save Profile 保存。");
    return;
  }

  if (!window.pdfjsLib) {
    showToast("PDF reader did not load. Please paste resume text instead.");
    return;
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "./vendor/pdf.worker.min.js";
  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  fields.resume.value = pages.join("\n\n");
  showToast("PDF text extracted. 点击 Save Profile 保存。");
}

function tokenize(text) {
  return (text.toLowerCase().match(/[a-zA-Z][a-zA-Z+.#-]{2,}/g) || [])
    .map((word) => word.replace(/[.,;:()]/g, ""))
    .filter((word) => !stopWords.has(word));
}

function topKeywords(text, limit = 18) {
  const counts = new Map();
  tokenize(text).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function sectionText(resume, names) {
  const lines = resume.split(/\r?\n/);
  const normalizedNames = names.map((name) => name.toUpperCase());
  let start = -1;
  let end = lines.length;

  for (let i = 0; i < lines.length; i += 1) {
    if (normalizedNames.includes(lines[i].trim().toUpperCase())) {
      start = i + 1;
      break;
    }
  }

  if (start === -1) return "";
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^[A-Z][A-Z\s/&+-]{2,}$/.test(line)) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function scoreLine(line, keywords) {
  const lower = line.toLowerCase();
  let score = 0;
  keywords.forEach((word) => {
    if (lower.includes(word.toLowerCase())) score += 3;
  });
  if (/%|\$|\b\d{2,}\b/.test(line)) score += 2;
  if (/product|agile|jira|stakeholder|dashboard|financial|market|user|research|launch|process|data/i.test(line)) score += 2;
  return score;
}

function compactExperience(resume, keywords) {
  const experience = sectionText(resume, ["PROFESSIONAL EXPERIENCE", "EXPERIENCE", "WORK EXPERIENCE"]);
  const lines = (experience || resume)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const selected = [];
  let lastHeader = "";
  lines.forEach((line) => {
    const isBullet = /^[-•]/.test(line);
    if (!isBullet) {
      lastHeader = line;
      if (selected.length < 14) selected.push({ type: "header", text: line });
      return;
    }
    selected.push({ type: "bullet", text: line.replace(/^[-•]\s*/, ""), score: scoreLine(line, keywords), header: lastHeader });
  });

  const headers = selected.filter((item) => item.type === "header").slice(0, 6);
  const bullets = selected
    .filter((item) => item.type === "bullet")
    .sort((a, b) => b.score - a.score)
    .slice(0, 11);

  const ordered = [];
  let bulletIndex = 0;
  headers.forEach((header) => {
    ordered.push(header);
    const related = bullets.filter((bullet) => bullet.header === header.text).slice(0, 3);
    related.forEach((bullet) => ordered.push(bullet));
    bulletIndex += related.length;
  });

  if (bulletIndex < 8) {
    bullets.slice(0, 8 - bulletIndex).forEach((bullet) => ordered.push(bullet));
  }
  return ordered.slice(0, 18);
}

function modelToText(model) {
  const exp = model.experience.map((item) => {
    const head = `${item.organization}${item.location ? `, ${item.location}` : ""}${item.dates ? ` | ${item.dates}` : ""}\n${item.title}`;
    return `${head}\n${item.bullets.map((bullet) => `- ${bullet}`).join("\n")}`;
  }).join("\n\n");
  const skills = model.skills.map((group) => `${group.label}: ${group.items.join(", ")}`).join("\n");
  const edu = model.education.length ? model.education.join("\n") : "Education details from saved resume";
  return `${model.candidateName}
${model.contactLine}

PROFESSIONAL SUMMARY
${model.summary}

PROFESSIONAL EXPERIENCE
${exp}

EDUCATION
${edu}

SKILLS
${skills}`;
}

async function generate() {
  if (!fields.resume.value.trim()) {
    showToast("请先在 Profile 页面保存或输入简历母版。");
    switchView("profile");
    return;
  }
  if (!fields.jd.value.trim()) {
    showToast("请先输入目标岗位描述。");
    switchView("role");
    return;
  }

  setGenerating(true);
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: {
          name: fields.name.value.trim(),
          email: activeEmail(),
          phone: fields.phone.value.trim(),
          linkedin: fields.linkedin.value.trim(),
          location: fields.location.value.trim()
        },
        resume: fields.resume.value.trim(),
        company: fields.company.value.trim(),
        role: fields.role.value.trim(),
        jobDescription: fields.jd.value.trim(),
        questions: fields.questions.value.trim()
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Generation failed");
    }

    generated.model = payload;
    resetApprovals();
  } catch (error) {
    showToast(error.message || "AI generation failed. Check OPENAI_API_KEY.");
    return;
  } finally {
    setGenerating(false);
  }

  generated.resumeText = modelToText(generated.model);
  generated.coverText = generated.model.coverLetter;
  $("#resumeOutput").textContent = generated.resumeText;
  $("#letterOutput").textContent = generated.coverText;
  $("#resumeOutput").classList.remove("empty");
  $("#letterOutput").classList.remove("empty");
  $("#resumeStatus").textContent = "Generated";
  $("#coverStatus").textContent = "Generated";
  renderReview(generated.model.review);
  updateApprovalState();
  switchView("documents");
  showToast("AI strategy generated. Please approve the review sections before downloading.");
}

function setGenerating(isGenerating) {
  const button = $("#generateBtn");
  button.disabled = isGenerating;
  button.querySelector("span").textContent = isGenerating ? "Generating..." : "Generate";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileSafeName(value) {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "document";
}

async function downloadResumeDoc() {
  if (!generated.model) await generate();
  if (!generated.model) return;
  if (!isApproved()) {
    showToast("Please approve the three review sections before downloading.");
    switchView("documents");
    return;
  }
  const name = fileSafeName(`${generated.model.candidateName}_${fields.company.value || "Company"}_${fields.role.value || "Role"}_CV`);
  await downloadDocxResume(generated.model, `${name}.docx`);
}

async function downloadCoverDoc() {
  if (!generated.model) await generate();
  if (!generated.model) return;
  if (!isApproved()) {
    showToast("Please approve the three review sections before downloading.");
    switchView("documents");
    return;
  }
  const name = fileSafeName(`${generated.model.candidateName}_${fields.company.value || "Company"}_${fields.role.value || "Role"}_Cover_Letter`);
  await downloadDocxCover(generated.model, generated.coverText, `${name}.docx`);
}

async function downloadDocxResume(model, filename) {
  const paragraphs = [
    { text: model.candidateName, align: "center", bold: true, size: 32, after: 20 },
    { text: model.contactLine, align: "center", size: 18, after: 120 },
    { text: "PROFESSIONAL SUMMARY", heading: true },
    { text: model.summary, size: 18, after: 35 },
    { text: "PROFESSIONAL EXPERIENCE", heading: true }
  ];

  model.experience.forEach((item) => {
    const header = `${item.organization}${item.location ? `, ${item.location}` : ""}${item.dates ? ` | ${item.dates}` : ""}`;
    paragraphs.push({ text: header, bold: false, size: 18, after: 0 });
    paragraphs.push({ text: item.title, bold: true, size: 18, after: 6 });
    item.bullets.forEach((bullet) => {
      paragraphs.push({ text: bullet, bullet: true, size: 17, after: 8 });
    });
  });

  paragraphs.push({ text: "EDUCATION", heading: true });
  (model.education.length ? model.education : ["Education details from saved resume"]).forEach((line) => {
    paragraphs.push({ text: line, bold: /Master|Bachelor|University|College/i.test(line), size: 17, after: 6 });
  });
  paragraphs.push({ text: "SKILLS", heading: true });
  model.skills.forEach((group) => {
    paragraphs.push({ text: `${group.label}: ${group.items.join(", ")}`, size: 17, after: 6, bold: false });
  });

  const blob = await buildDocxBlob(paragraphs, { compact: true });
  downloadBlob(blob, filename);
}

async function downloadDocxCover(model, text, filename) {
  const paragraphs = text.split(/\n\n/).map((para, index) => ({
    text: para,
    size: 22,
    after: index === text.split(/\n\n/).length - 1 ? 0 : 190
  }));
  const blob = await buildDocxBlob(paragraphs, { compact: false });
  downloadBlob(blob, filename);
}

async function buildDocxBlob(paragraphs, options) {
  if (!window.JSZip) throw new Error("JSZip unavailable");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const margin = options.compact ? 430 : 900;
  const body = paragraphs.map(paragraphXml).join("");
  zip.folder("word").file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="280" w:footer="280" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function paragraphXml(item) {
  const align = item.align ? `<w:jc w:val="${item.align}"/>` : "";
  const border = item.heading ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="111111"/></w:pBdr>` : "";
  const spacingBefore = item.heading ? 85 : 0;
  const spacingAfter = item.heading ? 25 : (item.after ?? 20);
  const indent = item.bullet ? `<w:ind w:left="320" w:hanging="160"/>` : "";
  const text = `${item.bullet ? "• " : ""}${item.text}`;
  const size = item.heading ? 22 : (item.size || 18);
  const bold = item.heading || item.bold ? "<w:b/>" : "";
  return `<w:p>
    <w:pPr>${align}${border}<w:spacing w:before="${spacingBefore}" w:after="${spacingAfter}" w:line="240" w:lineRule="auto"/>${indent}</w:pPr>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial"/>${bold}<w:sz w:val="${size}"/></w:rPr>
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>
  </w:p>`;
}

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;"
  }[char]));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function switchView(view) {
  $$(".view").forEach((item) => item.classList.toggle("active", item.id === `${view}View`));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
}

function renderReview(review) {
  renderReviewList("#structureReview", review?.structureChanges || [], (item) => `
    <span class="review-tag">${escapeHtml(item.section)}</span>
    <strong>${escapeHtml(item.recommendation)}</strong>
    <p>${escapeHtml(item.reason)}</p>
    <p>${escapeHtml(item.impact)}</p>
  `);

  renderReviewList("#evidenceReview", review?.experienceToSupplement || [], (item) => `
    <span class="review-tag">${escapeHtml(item.jdNeed)}</span>
    <strong>${escapeHtml(item.currentGap)}</strong>
    <p>${escapeHtml(item.suggestedEvidence)}</p>
    <p>${escapeHtml(item.safeWording)}</p>
  `);

  renderReviewList("#skillsReview", review?.skillUpdates || [], (item) => `
    <span class="review-tag">${escapeHtml(item.action)}</span>
    <strong>${escapeHtml(item.skill)}</strong>
    <p>${escapeHtml(item.reason)}</p>
  `);
}

function renderReviewList(selector, items, template) {
  const node = $(selector);
  if (!items.length) {
    node.classList.add("empty");
    node.textContent = "No major changes recommended.";
    return;
  }
  node.classList.remove("empty");
  node.innerHTML = items.map((item) => `<div class="review-item">${template(item)}</div>`).join("");
}

function resetApprovals() {
  generated.approvals = { structure: false, evidence: false, skills: false };
  $$(".approve-button").forEach((button) => {
    button.classList.remove("approved");
    button.textContent = "Approve";
  });
}

function isApproved() {
  return generated.approvals.structure && generated.approvals.evidence && generated.approvals.skills;
}

function updateApprovalState() {
  const ready = isApproved();
  $("#downloadResumeBtn").disabled = !ready;
  $("#downloadCoverBtn").disabled = !ready;
  $("#approvalBanner").classList.toggle("ready", ready);
  $("#approvalBanner").textContent = ready
    ? "Review approved. Final Word documents are unlocked."
    : "Approve the three review sections to unlock the final downloadable documents.";
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

$("#loginSubmitBtn").addEventListener("click", () => login(fields.loginEmail.value, fields.loginName.value));
$("#logoutBtn").addEventListener("click", logout);
$("#saveProfileBtn").addEventListener("click", saveProfile);
$("#generateBtn").addEventListener("click", generate);
$("#downloadResumeBtn").addEventListener("click", downloadResumeDoc);
$("#downloadCoverBtn").addEventListener("click", downloadCoverDoc);
$("#resumeFile").addEventListener("change", (event) => handleResumeUpload(event.target.files?.[0]));

$$(".approve-button").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.approve;
    generated.approvals[key] = !generated.approvals[key];
    button.classList.toggle("approved", generated.approvals[key]);
    button.textContent = generated.approvals[key] ? "Approved" : "Approve";
    updateApprovalState();
  });
});

$$(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.addEventListener("DOMContentLoaded", () => {
  if (activeUser()) {
    hydrate();
    showApp();
  }
  lucide.createIcons();
  updateApprovalState();
});

window.ClarityCV = {
  fillSample() {
    fields.loginEmail.value = "chloe@example.com";
    fields.loginName.value = "Chloe Li";
    login(fields.loginEmail.value, fields.loginName.value);
    fields.name.value = "Chloe Li";
    fields.location.value = "Toronto, ON";
    fields.phone.value = "+1 437 661 2745";
    fields.linkedin.value = "LinkedIn";
    fields.resume.value = sampleResume;
    fields.company.value = "Tata Consultancy Services";
    fields.role.value = "Product Management Specialist";
    fields.jd.value = "Strategy, Business Case, Revenue Growth, Market Research, Market Analysis, Client Engagement, Cross-Functional Team Leadership, Data Synthesis, Product Owner, Agile Development, Scrum, Kanban, SAFe, User Stories, SDLC, Rapid Prototyping, User Research, Backlog Prioritization, VOC Survey, User Testing, AB Testing, Human Centered Design, Design Thinking, Jira, Confluence, PowerBI.";
    fields.questions.value = "Why are you interested in this company?";
    saveProfile();
  }
};
