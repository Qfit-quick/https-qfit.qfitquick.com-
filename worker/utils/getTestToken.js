export async function getTestToken(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  email,
  pw,
) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: pw,
      }),
    },
  );
  const data =await response.json();
  data.access_token= 'Bearer '+data.access_token
  // console.log(data);
  // console.log("ACCESS TOKEN:");
  console.log(typeof data.access_token);
  return data.access_token;
}
