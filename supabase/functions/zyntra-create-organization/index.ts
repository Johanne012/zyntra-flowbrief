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
  if(origin && !allowedOrigin(origin))return json({error:"Origin not allowed"},403);
  const corsHeaders:HeadersInit=origin?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info"}:{};
  const reply=(body:unknown,status=200)=>json(body,status,corsHeaders);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});

  if(req.method!=="POST")return reply({error:"Method not allowed"},405);
  const authHeader=req.headers.get("authorization")??"";
  const token=authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
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
    if(new TextEncoder().encode(raw).byteLength>4096)return reply({error:"Request too large"},413);
    body=JSON.parse(raw);
    if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Invalid request"},400);
  }catch{return reply({error:"Invalid JSON"},400);}

  const legalName=clean(body.legal_name,180);
  const displayName=clean(body.display_name,100);
  const slug=clean(body.slug,48).toLowerCase();
  if(legalName.length<2||displayName.length<2||!/^[a-z0-9][a-z0-9-]{2,47}$/.test(slug))
    return reply({error:"Provide valid legal name, display name and URL slug"},400);

  const headers:Record<string,string>={apikey:secretKey,"Content-Type":"application/json"};
  if(!secretKey.startsWith("sb_secret_"))headers.Authorization="Bearer "+secretKey;
  try{
    const response=await fetch(url+"/rest/v1/rpc/zyntra_create_organization",{
      method:"POST",headers,
      body:JSON.stringify({p_actor_id:user.id,p_legal_name:legalName,p_display_name:displayName,p_slug:slug})
    });
    if(response.status===409)return reply({error:"Organization slug is already in use"},409);
    if(!response.ok){
      const message=(await response.text()).slice(0,400);
      if(response.status===400)return reply({error:"Organization details were rejected"},400);
      console.error("Organization creation failed",response.status,message);
      return reply({error:"Could not create organization"},502);
    }
    const organizationId=await response.json();
    return reply({ok:true,organization_id:organizationId,status:"pending",message:"Organization submitted for activation review."},201);
  }catch(error){console.error("Organization onboarding failed",error);return reply({error:"Unexpected server error"},500);}
});
