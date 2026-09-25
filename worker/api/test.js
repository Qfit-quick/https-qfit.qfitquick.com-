export async function test(request) {
  const url = new URL(request.url);

  if (url.pathname === "/api/test" && request.method === "POST") {
    const body = await request.json();

    return Response.json({
      success: true,
      user: body,
    });
  }

  return Response.json({ error: "Not Found" }, { status: 404 });
}
