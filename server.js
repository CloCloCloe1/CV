import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import handler from "./api/generate.js";

const root = process.cwd();
const port = Number(process.env.PORT || 4174);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm"
};

createServer(async (req, res) => {
  if (req.url === "/api/generate" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }
      const apiRes = {
        setHeader: (...args) => res.setHeader(...args),
        status(code) {
          res.statusCode = code;
          return this;
        },
        json(payload) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(payload));
        }
      };
      await handler(req, apiRes);
    });
    return;
  }

  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = normalize(join(root, urlPath));
  if (!filePath.startsWith(root)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.setHeader("Content-Type", types[extname(filePath)] || "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`Clarity CV local server: http://localhost:${port}`);
});
