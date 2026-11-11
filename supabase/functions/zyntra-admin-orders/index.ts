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
  if(user?.app_metadata?.zyntra_platform_admin!==true)return reply({error:"Platform administrator access required"},403);
  let body:Record<string,unknown>;
  try{
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>1024)return reply({error:"Request too large"},413);
    body=JSON.parse(raw);
    if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Invalid request"},400);
  }catch{return reply({error:"Invalid JSON"},400);}
  const limit=Number.isInteger(body.limit)?Math.min(100,Math.max(1,Number(body.limit))):50;
  const offset=Number.isInteger(body.offset)?Math.min(5000,Math.max(0,Number(body.offset))):0;
  const headers:Record<string,string>={apikey:secretKey};
  if(!secretKey.startsWith("sb_secret_"))headers.Authorization="Bearer "+secretKey;
  const query=new URLSearchParams({
    select:"id,order_number,customer_name,contact,market,package_code,brief,payment_status,order_status,source,created_at,updated_at",
    order:"created_at.desc",
    limit:String(limit),
    offset:String(offset)
  });
  try{
    const response=await fetch(url+"/rest/v1/zyntra_orders?"+query.toString(),{headers});
    if(!response.ok){console.error("Admin order inbox query failed",response.status,(await response.text()).slice(0,300));return reply({error:"Order inbox unavailable"},502);}
    const orders=await response.json();
    return reply({ok:true,orders,limit,offset,read_only:true});
  }catch(error){console.error("Admin order inbox error",error);return reply({error:"Unexpected server error"},500);}
});
