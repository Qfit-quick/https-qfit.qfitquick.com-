// Workers 정적 자산(assets.directory)은 Range 요청을 지원하지 않는다 — Range
// 를 보내도 항상 200(전체 파일)으로 응답한다. video 태그는 이걸 받아도
// readyState 가 0에서 못 올라가서(HAVE_NOTHING) 영상이 영원히 안 뜬다.
// (Cloudflare 공식 한계 — cloudflare/workers-sdk#3861. 캐시엔 없던 문제라
// 동작 클립을 붙인 뒤로 처음 걸린 것으로 보인다.)
//
// 동영상 요청만 여기서 가로채 진짜 206 을 만든다. 파일이 다 커봐야 수백
// KB~수 MB(운동 클립)라 통째로 메모리에 올려도 부담 없다.
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || !VIDEO_EXT.test(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const range = request.headers.get('Range');
    // Range 없는 요청은 원래대로 서빙하되, 브라우저가 다음부터 Range 를
    // 쓰도록 Accept-Ranges 만 얹는다.
    if (!range) {
      const res = await env.ASSETS.fetch(request);
      const headers = new Headers(res.headers);
      headers.set('Accept-Ranges', 'bytes');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }

    // 정적 자산 쪽은 Range 를 무시하고 항상 전체를 주므로, Range 없이 다시
    // 받아서 여기서 직접 자른다.
    const full = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
    if (!full.ok) return full;

    const buf = await full.arrayBuffer();
    const size = buf.byteLength;
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;

    if (!m || Number.isNaN(start) || start >= size || start > end) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' },
      });
    }

    const headers = new Headers(full.headers);
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    headers.set('Accept-Ranges', 'bytes');
    return new Response(buf.slice(start, end + 1), { status: 206, headers });
  },
};
