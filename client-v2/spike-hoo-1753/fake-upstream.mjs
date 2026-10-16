// Fake chat-completions upstream for the HOO-1753 browser probe.
// Round 1: a write_file tool call. Round 2 (a tool result is present): text.
import http from "node:http";
const port = Number(process.argv[2] ?? 13061);
const frame = (o) => `data: ${JSON.stringify(o)}\n\n`;
http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    const last = body.messages?.at(-1);
    console.log(new Date().toISOString(), "roles:", body.messages?.map((m) => m.role).join(","), "tools:", body.tools?.length);
    res.writeHead(200, { "content-type": "text/event-stream" });
    const send = (o) => res.write(frame(o));
    if (last?.role === "tool") {
      for (const w of ["The file ", "is written. ", "Build when ready."]) send({ id: "x", choices: [{ index: 0, delta: { content: w } }] });
      send({ id: "x", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
    } else {
      send({ id: "x", choices: [{ index: 0, delta: { content: "I will add a note file." } }] });
      send({ id: "x", choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "write_file", arguments: JSON.stringify({ path: "src/NOTE.md", content: "written through the ai SDK\n" }) } }] } }] });
      send({ id: "x", choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] });
    }
    res.end("data: [DONE]\n\n");
  });
}).listen(port, () => console.log("fake upstream on", port));
