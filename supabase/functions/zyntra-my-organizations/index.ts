import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200,headers:HeadersInit={})=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
const key=(jsonName:string,legacyName:string)=>{
  try{const value=JSON.parse(Deno.env.get(jsonName)??"{}");if(typeof value.default==="string")return value.default;}catch{/* fallback */}
  return Deno.env.get(legacyName)??"";
};
const allowedOrigin=(origin:string)=>{
  try{const u=new URL(origin);return u.protocol==="https:"&&(u.hostname==="zyntra-flowbrief.vercel.app"||u.hostname==="zyntra-flowbrief-v2.vercel.app"||(u.hostname.startsWith("zyntra-flowbrief-v2-")&&u.hostname.endsWith(".vercel.app")));}catch{return false;}
};

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin")??"";
  if(origin&&!allowedOrigin(origin))return json({error:"Origin not allowed"},403);
  const cors:HeadersInit=origin?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info"}:{};
  const reply=(body:unknown,status=200)=>json(body,status,cors);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return reply({error:"Method not allowed"},405);

  const token=(req.headers.get("authorization")??"").match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return reply({error:"Authentication required"},401);
  const url=Deno.env.get("SUPABASE_URL")?.replace(/\/$/,"");
  const publicKey=key("SUPABASE_PUBLISHABLE_KEYS","SUPABASE_ANON_KEY");
  const secretKey=key("SUPABASE_SECRET_KEYS","SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!publicKey||!secretKey)return reply({error:"Service unavailable"},503);
  const auth=await fetch(url+"/auth/v1/user",{headers:{apikey:publicKey,Authorization:"Bearer "+token}});
  if(!auth.ok)return reply({error:"Invalid or expired session"},401);
  const user=await auth.json();
  if(!user?.id)return reply({error:"Invalid session"},401);

  const headers:Record<string,string>={apikey:secretKey};
  if(!secretKey.startsWith("sb_secret_"))headers.Authorization="Bearer "+secretKey;
  const select="organization_id,role,organization:zyntra_organizations!zyntra_organization_members_organization_id_fkey(id,display_name,slug,status,created_at)";
  const response=await fetch(url+"/rest/v1/zyntra_organization_members?select="+encodeURIComponent(select)+"&user_id=eq."+encodeURIComponent(user.id)+"&order=created_at.desc",{headers});
  if(!response.ok){console.error("Organization list failed",response.status,(await response.text()).slice(0,300));return reply({error:"Could not load organizations"},502);}
  const rows=await response.json();
  return reply({ok:true,organizations:rows.map((row:any)=>({id:row.organization?.id??row.organization_id,display_name:row.organization?.display_name??"",slug:row.organization?.slug??"",status:row.organization?.status??"unknown",created_at:row.organization?.created_at??null,role:row.role}))});
});
