import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200,headers:HeadersInit={})=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
const key=(jsonName:string,legacyName:string)=>{
  try{const value=JSON.parse(Deno.env.get(jsonName)??"{}");if(typeof value.default==="string")return value.default;}catch{/* fallback */}
  return Deno.env.get(legacyName)??"";
};
const clean=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";

const allowedOrigin = (origin:string) => {
  try {
    const u = new URL(origin);
    return u.protocol === "https:" &&
      (u.hostname === "zyntra-flowbrief.vercel.app" ||
       u.hostname === "zyntra-flowbrief-v2.vercel.app" ||
       (u.hostname.startsWith("zyntra-flowbrief-v2-") && u.hostname.endsWith(".vercel.app")));
  } catch { return false; }
};

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin")??"";
  if(origin && !allowedOrigin(origin))return reply({error:"Origin not allowed"},403);
  const corsHeaders:HeadersInit=origin?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info"}:{};
  const reply=(body:unknown,status=200)=>json(body,status,corsHeaders);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});

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

  let body:Record<string,unknown>;
  try{
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>2048)return reply({error:"Request too large"},413);
    body=JSON.parse(raw);
  }catch{return reply({error:"Invalid JSON"},400);}
  const organizationId=clean(body.organization_id,64);
  if(!/^[0-9a-f-]{36}$/i.test(organizationId))return reply({error:"Invalid organization id"},400);

  const headers:Record<string,string>={apikey:secretKey,"Content-Type":"application/json"};
  if(!secretKey.startsWith("sb_secret_"))headers.Authorization="Bearer "+secretKey;
  try{
    const membership=await fetch(url+"/rest/v1/zyntra_organization_members?select=role&organization_id=eq."+
      encodeURIComponent(organizationId)+"&user_id=eq."+encodeURIComponent(user.id),{headers});
    if(!membership.ok)return reply({error:"Access check unavailable"},503);
    const rows=await membership.json();
    if(!rows?.length)return reply({error:"Organization access denied"},403);
    const result=await fetch(url+"/rest/v1/rpc/zyntra_get_org_dashboard",{
      method:"POST",headers,body:JSON.stringify({p_organization_id:organizationId})
    });
    if(!result.ok){console.error("Dashboard RPC failed",result.status,(await result.text()).slice(0,300));return reply({error:"Dashboard unavailable"},502);}
    const dashboard=await result.json();
    if(!dashboard)return reply({error:"Organization not found"},404);
    return reply({ok:true,role:rows[0].role,dashboard});
  }catch(error){console.error("Organization dashboard failed",error);return reply({error:"Unexpected server error"},500);}
});
