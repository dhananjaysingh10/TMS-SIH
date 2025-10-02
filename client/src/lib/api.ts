// src/lib/api.ts
const base = import.meta.env.VITE_API_URL || 'http://localhost:10000'

export async function api(path:string, body:unknown){
  const res = await fetch(`${base}/api/auth/${path}`,{
    method:'POST',
    credentials:'include',               // cookie-based auth
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  })
  if(!res.ok) throw new Error((await res.json()).message)
  return res.json()
}
