// 챗봇 서버 — 로컬 개발 전용(PDF 9쪽: 기존 Vite 화면 + 로컬 Node 서버).
// Express 등 새 의존성을 넣지 않고 Node 내장 http 만 쓴다("최소 의존성만
// 추가하고 이유를 기록" 원칙 — 이 서버는 라우트가 POST /api/chat 하나뿐
// 이라 프레임워크가 없어도 코드량 차이가 거의 없다).
//
// 배포는 하지 않는다. 이 폴더는 애초에 빌드 산출물 폴더(app/dist/) 밖에
// 있어서 자산으로 같이 올라갈 일이 없다.
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { respond } from '../src/chat/respond.js';
import { createLLM } from './llm.mjs';

// .env 를 읽는다(Node 20.6+ 내장 — 새 의존성 없이 된다). Node 는 .env 를
// 저절로 안 읽어서, 이게 없으면 .env 에 OPENAI_API_KEY 를 채워도 서버가
// 못 본다 — 실제로 한 번 이렇게 비어 있는 채로 떠서(process.env 에
// CHAT_LLM_ENABLED 가 아예 없어 llmEnabled=false) 잡았다. 파일이 없으면
// (테스트, .env 를 아직 안 만든 경우) 조용히 넘어간다 — 그때는 llm.mjs 가
// 알아서 규칙 기반으로만 돈다.
try { process.loadEnvFile(); } catch { /* .env 없음 — 정상 상황 */ }

const MAX_BODY_BYTES = 16 * 1024; // 13쪽: 본문 16KB 초과 413
const RATE_LIMIT_PER_MIN = 10; // 13쪽: IP별 분당 10회
const REQUEST_TIMEOUT_MS = 25000; // llm.mjs 자체 20초 제한보다 여유 있게

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(json);
}

function sendError(res, status, code, message, requestId) {
  // 내부 오류·키·프롬프트는 절대 응답에 안 담는다(11쪽).
  sendJson(res, status, { error: { code, message }, requestId });
}

// ── 입력 검증 ────────────────────────────────────────────────
// 타입·길이를 전부 본다. system 역할과 형태가 안 맞는 값은 전부 400.
function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'message 가 없습니다.' };
  }
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 1000) {
    return { error: 'message 는 1~1000자여야 합니다.' };
  }

  let history = [];
  if (body.history !== undefined) {
    if (!Array.isArray(body.history) || body.history.length > 6) {
      return { error: 'history 는 최대 6개 배열이어야 합니다.' };
    }
    for (const h of body.history) {
      if (!h || typeof h !== 'object') return { error: 'history 항목이 잘못됐습니다.' };
      if (h.role !== 'user' && h.role !== 'assistant') {
        return { error: 'history.role 은 user 또는 assistant 만 허용합니다.' }; // system 역할 차단
      }
      if (typeof h.content !== 'string' || h.content.length > 1000) {
        return { error: 'history.content 는 1000자 이하 문자열이어야 합니다.' };
      }
    }
    history = body.history;
  }

  let conversationContext = [];
  if (body.conversationContext !== undefined) {
    if (!Array.isArray(body.conversationContext) || body.conversationContext.length > 5) {
      return { error: 'conversationContext 는 최대 5개 배열이어야 합니다.' };
    }
    if (!body.conversationContext.every((id) => typeof id === 'string' && id.length <= 200)) {
      return { error: 'conversationContext 항목은 문자열이어야 합니다.' };
    }
    conversationContext = body.conversationContext;
  }

  // locale 은 선택 항목(2026-09-21, 영·중 지원). 형태만 본다 — 'ko'/'en'/
  // 'zh' 가 아닌 값은 여기서 거부하지 않고 respond.js 가 'ko' 로 조용히
  // 되돌린다(엄격히 막을 만큼 위험한 입력이 아니라서, 안 맞는 값 하나로
  // 요청 전체를 400 내는 게 더 나쁘다).
  const locale = typeof body.locale === 'string' ? body.locale : undefined;

  return { value: { message, history, conversationContext, locale } };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let done = false;
    req.on('data', (chunk) => {
      if (done) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        done = true;
        // req.destroy() 는 안 쓴다 — HTTP/1.1 은 요청·응답이 같은 소켓을
        // 쓰기 때문에, 여기서 소켓을 끊으면 413 응답 자체가 클라이언트에
        // 못 간다(클라이언트는 응답을 못 받고 ECONNRESET만 본다). 남은
        // 바이트는 그냥 버리고(청크를 안 쌓음) 응답은 정상적으로 내보낸다.
        reject(Object.assign(new Error('too large'), { code: 'TOO_LARGE' }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    req.on('error', (e) => { if (!done) reject(e); });
  });
}

// 테스트가 실제 네트워크 포트를 열지 않고도 서버 로직을 검증할 수 있게,
// createServer() 는 http.Server 만 만들고 listen() 은 이 파일이 직접
// 실행됐을 때만 한다(맨 아래). import 만 해서는 아무 포트도 안 열린다.
// callLLM/llmEnabled 를 주입할 수 있게 해서, 테스트가 실제 OpenAI 대신
// 모의 성공·실패·시간초과 함수를 넣어 볼 수 있다(12쪽 "모델 없이도 확인
// 가능하게").
export function createServer({ callLLM: injectedLLM, llmEnabled: injectedEnabled } = {}) {
  const callLLM = injectedLLM !== undefined ? injectedLLM : createLLM(process.env);
  const llmEnabled = injectedEnabled !== undefined ? injectedEnabled : typeof callLLM === 'function';

  // IP → 최근 요청 시각들. 서버 하나짜리 로컬 개발 도구라 메모리로
  // 충분하다(13쪽: "운영에서는 공유 저장소 기반 제한과 비용 한도를 추가").
  const hits = new Map();
  function rateLimited(ip) {
    const now = Date.now();
    const windowStart = now - 60_000;
    const arr = (hits.get(ip) || []).filter((t) => t > windowStart);
    arr.push(now);
    hits.set(ip, arr);
    return arr.length > RATE_LIMIT_PER_MIN;
  }

  async function handleChat(req, res, requestId) {
    let raw;
    try {
      raw = await readBody(req);
    } catch (e) {
      if (e.code === 'TOO_LARGE') return sendError(res, 413, 'payload_too_large', '요청이 너무 큽니다.', requestId);
      return sendError(res, 400, 'bad_request', '요청 본문을 읽을 수 없습니다.', requestId);
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return sendError(res, 400, 'bad_json', 'JSON 형식이 아닙니다.', requestId);
    }

    const validated = validateBody(body);
    if (validated.error) return sendError(res, 400, 'invalid_input', validated.error, requestId);

    try {
      const result = await respond(validated.value, { callLLM, llmEnabled });
      sendJson(res, 200, { ...result, requestId });
    } catch {
      // respond() 자체가 죽는 건 규칙 기반 경로에서는 거의 안 나야 정상이다 —
      // 그래도 서버가 죽지 않고 안전하게 500 을 낸다.
      sendError(res, 500, 'internal_error', '답을 만들지 못했습니다.', requestId);
    }
  }

  const server = http.createServer((req, res) => {
    const requestId = crypto.randomUUID();
    const ip = req.socket.remoteAddress || 'unknown';
    const start = Date.now();

    res.on('finish', () => {
      // 요청 원문·대화 내용은 안 남긴다 — 메서드·경로·상태·걸린 시간만.
      console.log(`[chat] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms rid=${requestId}`);
    });

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (req.url !== '/api/chat' || req.method !== 'POST') {
      return sendError(res, 404, 'not_found', '경로를 찾을 수 없습니다.', requestId);
    }

    if (rateLimited(ip)) {
      return sendError(res, 429, 'rate_limited', '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.', requestId);
    }

    const timeout = setTimeout(() => {
      if (!res.writableEnded) sendError(res, 504, 'timeout', '응답이 지연되고 있습니다.', requestId);
    }, REQUEST_TIMEOUT_MS);

    handleChat(req, res, requestId).finally(() => clearTimeout(timeout));
  });

  return server;
}

// `node server/chat.mjs` 로 직접 실행했을 때만 듣는다 — 테스트가
// import { createServer } 만 가져다 쓸 때는 포트를 안 연다.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const PORT = Number(process.env.CHAT_PORT) || 8787;
  const server = createServer();
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[chat] listening on http://127.0.0.1:${PORT}/api/chat (llmEnabled=${typeof createLLM(process.env) === 'function'})`);
  });
}
