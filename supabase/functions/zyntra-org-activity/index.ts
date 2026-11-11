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
  try{
    const auth=await fetch(url+"/auth/v1/user",{headers:{apikey:publicKey,Authorization:"Bearer "+token}});
    if(!auth.ok)return reply({error:"Invalid or expired session"},401);
    const user=await auth.json();
    if(!user?.id)return reply({error:"Invalid session"},401);
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>2048)return reply({error:"Request too large"},413);
    let body:Record<string,unknown>;
    try{body=JSON.parse(raw);if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Invalid request"},400);}catch{return reply({error:"Invalid JSON"},400);}
    const organizationId=typeof body.organization_id==="string"?body.organization_id.trim():"";
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId))return reply({error:"Invalid organization id"},400);
    const headers:Record<string,string>={apikey:secretKey};
    if(!secretKey.startsWith("sb_secret_"))headers.Authorization="Bearer "+secretKey;
    const base=url+"/rest/v1/";
    const membership=await fetch(base+"zyntra_organization_members?select=role&organization_id=eq."+encodeURIComponent(organizationId)+"&user_id=eq."+encodeURIComponent(user.id),{headers});
    if(!membership.ok)return reply({error:"Access check unavailable"},503);
    const memberships=await membership.json();
    if(!memberships?.length)return reply({error:"Organization access denied"},403);
    const query=(table:string,select:string)=>fetch(base+table+"?select="+encodeURIComponent(select)+"&organization_id=eq."+encodeURIComponent(organizationId)+"&order=created_at.desc&limit=25",{headers});
    const [intents,ledger,approvals,settlements,agents]=await Promise.all([
      query("zyntra_payment_intents","id,order_reference,amount_atoms,asset_id,status,created_at"),
      query("zyntra_ledger_transactions","id,description,status,created_at,posted_at"),
      query("zyntra_approvals","id,action_type,resource_type,status,reason,created_at"),
      query("zyntra_settlements","id,provider_batch_reference,gross_atoms,fee_atoms,net_atoms,reconciled_at,created_at"),
      fetch(base+"zyntra_ai_agents?select=agent_key,display_name,purpose,status,model_provider,model_name,human_approval_required&organization_id=is.null&order=agent_key.asc&limit=25",{headers})
    ]);
    const responses=[intents,ledger,approvals,settlements,agents];
    if(responses.some(x=>!x.ok)){console.error("Organization activity query failed",responses.map(x=>x.status));return reply({error:"Activity data unavailable"},502);}
    const [paymentIntents,ledgerTransactions,pendingApprovals,settlementRecords,agentCatalog]=await Promise.all(responses.map(x=>x.json()));
    return reply({ok:true,organization_id:organizationId,role:memberships[0].role,activity:{payment_intents:paymentIntents,ledger_transactions:ledgerTransactions,approvals:pendingApprovals,settlements:settlementRecords,agent_catalog:agentCatalog},limits:{per_section:25},read_only:true});
  }catch(error){console.error("Organization activity error",error);return reply({error:"Unexpected server error"},500);}
});
