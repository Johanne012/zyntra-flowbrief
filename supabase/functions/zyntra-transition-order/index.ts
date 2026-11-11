import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200,headers:HeadersInit={})=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
const key=(jsonName:string,legacyName:string)=>{
  try{const value=JSON.parse(Deno.env.get(jsonName)??"{}");if(typeof value.default==="string")return value.default;}catch{/* fallback */}
  return Deno.env.get(legacyName)??"";
};
const allowedOrigin=(origin:string)=>{
  try{const u=new URL(origin);return u.protocol==="https:"&&(u.hostname==="zyntra-flowbrief.vercel.app"||u.hostname==="zyntra-flowbrief-v2.vercel.app"||(u.hostname.startsWith("zyntra-flowbrief-v2-")&&u.hostname.endsWith(".vercel.app")));}catch{return false;}
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses=new Set(["received","reviewing","awaiting_payment","paid","in_progress","delivered","cancelled"]);

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin")??"";
  if(origin&&!allowedOrigin(origin))return json({error:"Origin not allowed"},403);
  const cors:HeadersInit=origin?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info, idempotency-key"}:{};
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
    if(user?.app_metadata?.zyntra_platform_admin!==true)return reply({error:"Platform administrator access required"},403);

    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>2048)return reply({error:"Request too large"},413);
    let body:Record<string,unknown>;
    try{body=JSON.parse(raw);}catch{return reply({error:"Invalid JSON"},400);}
    if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Invalid request"},400);

    const orderId=body.order_id;
    const expected=body.expected_status;
    const next=body.next_status;
    const reason=body.reason;
    const requestId=req.headers.get("idempotency-key")??body.request_id;
    if(typeof orderId!=="string"||!uuid.test(orderId))return reply({error:"Invalid order id"},400);
    if(typeof expected!=="string"||!statuses.has(expected)||typeof next!=="string"||!statuses.has(next))return reply({error:"Invalid order status"},400);
    if(reason!==undefined&&reason!==null&&(typeof reason!=="string"||reason.length>500))return reply({error:"Invalid reason"},400);
    if(typeof requestId!=="string"||requestId.length<8||requestId.length>128)return reply({error:"A valid idempotency key is required"},400);

    const headers:Record<string,string>={apikey:secretKey,"Content-Type":"application/json"};
    if(!secretKey.startsWith("sb_secret_"))headers.Authorization="Bearer "+secretKey;
    const response=await fetch(url+"/rest/v1/rpc/zyntra_transition_order",{
      method:"POST",headers,
      body:JSON.stringify({
        p_order_id:orderId,
        p_expected_status:expected,
        p_next_status:next,
        p_actor_user_id:user.id,
        p_reason:reason??null,
        p_request_id:requestId
      })
    });
    if(!response.ok){
      const failure=await response.json().catch(()=>({}));
      const code=failure?.code;
      if(code==="P0002")return reply({error:"Order not found"},404);
      if(code==="40001")return reply({error:"Order changed; refresh and retry"},409);
      if(code==="23505")return reply({error:"Idempotency key already used"},409);
      if(code==="23514")return reply({error:"Order transition is not allowed"},422);
      if(code==="22023")return reply({error:"Invalid transition details"},400);
      console.error("Order transition RPC failed",code??response.status);
      return reply({error:"Order transition unavailable"},502);
    }
    return reply({ok:true,result:await response.json()});
  }catch(error){
    console.error("Order transition request failed",error);
    return reply({error:"Unexpected server error"},500);
  }
});
