const SUPABASE_URL="https://ijbmdftluptwnglryaqx.supabase.co";
const SUPABASE_KEY="sb_publishable_dNArmXDvR5C1C_LZlY1sMg_yYaOQh0R";
const ENDPOINTS={
  organizations:"zyntra-my-organizations",
  createOrganization:"zyntra-create-organization",
  dashboard:"zyntra-org-dashboard",
  activity:"zyntra-org-activity"
};
let accessToken=null;
let authMode="login";
let organizations=[];
let selectedOrganizationId=null;
let currentView="overview";
const $=(id)=>document.getElementById(id);
const authPanel=$("auth-panel"),appPanel=$("app-panel");
const setMessage=(el,message,type="")=>{el.textContent=message;el.className="message "+type;};
const apiHeaders=(token=accessToken)=>({apikey:SUPABASE_KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"});
async function api(path,body,token=accessToken){
 const response=await fetch(SUPABASE_URL+path,{method:"POST",headers:apiHeaders(token),body:JSON.stringify(body??{})});
 const data=await response.json().catch(()=>({}));
 if(response.status===401){showAuth();setMessage($("auth-message"),"انتهت الجلسة. سجّل الدخول مجددًا.","error");throw new Error("Session expired");}
 if(!response.ok)throw new Error(data.error||"Request failed ("+response.status+")");
 return data;
}
function showAuth(){
 accessToken=null;organizations=[];selectedOrganizationId=null;
 authPanel.hidden=false;appPanel.hidden=true;
 $("connection-state").textContent="غير متصل";
}
function showApp(){
 authPanel.hidden=true;appPanel.hidden=false;
 $("connection-state").textContent="جلسة آمنة";
}
function setAuthMode(mode){
 authMode=mode;
 document.querySelectorAll("[data-auth-mode]").forEach(button=>button.classList.toggle("active",button.dataset.authMode===mode));
 $("auth-submit").textContent=mode==="login"?"تسجيل الدخول":"إنشاء حساب";
 $("auth-password").autocomplete=mode==="login"?"current-password":"new-password";
 setMessage($("auth-message"),"");
}
async function authSubmit(event){
 event.preventDefault();
 const email=$("auth-email").value.trim();
 const password=$("auth-password").value;
 if(password.length<12){setMessage($("auth-message"),"استخدم كلمة مرور لا تقل عن 12 حرفًا.","error");return;}
 const button=$("auth-submit");button.disabled=true;
 try{
  if(authMode==="signup"){
   const redirect=encodeURIComponent(window.location.origin+"/console/");
   const response=await fetch(SUPABASE_URL+"/auth/v1/signup?redirect_to="+redirect,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.msg||data.message||data.error_description||"تعذر إنشاء الحساب.");
   if(data.access_token){accessToken=data.access_token;showApp();await loadOrganizations();}
   else setMessage($("auth-message"),"تم إرسال طلب التسجيل. تحقق من بريدك الإلكتروني لتأكيد الحساب، ثم سجّل الدخول.","success");
  }else{
   const response=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.access_token)throw new Error(data.msg||data.message||data.error_description||"بيانات الدخول غير صحيحة.");
   accessToken=data.access_token;showApp();await loadOrganizations();
  }
 }catch(error){setMessage($("auth-message"),error.message||"حدث خطأ.","error");}
 finally{button.disabled=false;}
}
async function loadOrganizations(){
 setMessage($("app-message"),"جارٍ تحميل المؤسسات...");
 try{
  const data=await api("/functions/v1/"+ENDPOINTS.organizations,{});
  organizations=data.organizations||[];
  const select=$("organization-select");select.replaceChildren();
  for(const org of organizations){
   const option=document.createElement("option");option.value=org.id;option.textContent=org.display_name+" · "+org.status;select.append(option);
  }
  if(organizations.length){
   selectedOrganizationId=organizations[0].id;select.value=selectedOrganizationId;
   $("create-org-panel").hidden=true;await loadDashboard();
  }else{
   $("overview-panel").hidden=true;$("pending-panel").hidden=true;$("create-org-panel").hidden=false;
   setMessage($("app-message"),"أنشئ مؤسستك الأولى لبدء إعداد مساحة العمل.");
  }
 }catch(error){setMessage($("app-message"),error.message,"error");}
}
async function loadDashboard(){
 if(!selectedOrganizationId)return;
 setMessage($("app-message"),"جارٍ تحديث البيانات...");
 try{
  const data=await api("/functions/v1/"+ENDPOINTS.dashboard,{organization_id:selectedOrganizationId});
  const d=data.dashboard;const org=d.organization;
  $("workspace-title").textContent=org.display_name;
  $("workspace-subtitle").textContent="دورك: "+data.role+" · "+org.slug;
  $("organization-status").textContent=org.status;
  $("metric-intents").textContent=d.payment_intents.total;
  $("metric-succeeded").textContent=d.payment_intents.succeeded;
  $("metric-ledger").textContent=d.ledger_transactions;
  $("metric-approvals").textContent=d.pending_approvals;
  $("metric-assets").textContent=d.available_assets;
  $("metric-providers").textContent=d.enabled_providers;
  $("overview-panel").hidden=false;
  $("create-org-panel").hidden=true;
  $("pending-panel").hidden=org.status!=="pending";
  if(org.status==="pending")$("overview-panel").hidden=true;
  setMessage($("app-message"),"تم تحديث بيانات مساحة العمل.","success");
 }catch(error){setMessage($("app-message"),error.message,"error");}
}
async function createOrganization(event){
 event.preventDefault();
 const button=$("organization-form").querySelector("button[type=submit]");button.disabled=true;
 setMessage($("organization-message"),"جارٍ إنشاء المؤسسة...");
 try{
  const data=await api("/functions/v1/"+ENDPOINTS.createOrganization,{
   legal_name:$("legal-name").value.trim(),
   display_name:$("display-name").value.trim(),
   slug:$("organization-slug").value.trim().toLowerCase(),
   incorporation_country:$("incorporation-country").value.trim().toUpperCase()
  });
  setMessage($("organization-message"),data.message+" رقم المؤسسة: "+data.organization_id,"success");
  await loadOrganizations();
 }catch(error){setMessage($("organization-message"),error.message,"error");}
 finally{button.disabled=false;}
}
function renderActivityTable(container,title,rows,columns){
 const section=document.createElement("section");section.className="activity-section";
 const heading=document.createElement("h3");heading.textContent=title;section.append(heading);
 if(!rows.length){const empty=document.createElement("p");empty.className="muted";empty.textContent="لا توجد سجلات.";section.append(empty);container.append(section);return;}
 const table=document.createElement("table");table.className="activity-table";
 const thead=document.createElement("thead"),headRow=document.createElement("tr");
 for(const column of columns){const th=document.createElement("th");th.textContent=column.label;headRow.append(th);}
 thead.append(headRow);table.append(thead);
 const tbody=document.createElement("tbody");
 for(const row of rows){const tr=document.createElement("tr");for(const column of columns){const td=document.createElement("td");const value=row[column.key];td.textContent=value===null||value===undefined||value===""?"—":String(value);tr.append(td);}tbody.append(tr);}
 table.append(tbody);section.append(table);container.append(section);
}
async function loadActivity(){
 const container=$("activity-content");container.replaceChildren();
 const loading=document.createElement("p");loading.className="muted";loading.textContent="جارٍ تحميل السجلات...";container.append(loading);
 try{
  const data=await api("/functions/v1/"+ENDPOINTS.activity,{organization_id:selectedOrganizationId});
  container.replaceChildren();
  renderActivityTable(container,"طلبات الدفع الداخلية",data.activity.payment_intents,[{key:"created_at",label:"التاريخ"},{key:"order_reference",label:"مرجع الطلب"},{key:"amount_atoms",label:"الوحدات"},{key:"status",label:"الحالة"}]);
  renderActivityTable(container,"دفتر الحسابات",data.activity.ledger_transactions,[{key:"created_at",label:"التاريخ"},{key:"description",label:"الوصف"},{key:"status",label:"الحالة"},{key:"posted_at",label:"تاريخ الترحيل"}]);
  renderActivityTable(container,"الموافقات",data.activity.approvals,[{key:"created_at",label:"التاريخ"},{key:"action_type",label:"الإجراء"},{key:"resource_type",label:"المورد"},{key:"status",label:"الحالة"},{key:"reason",label:"السبب"}]);
  renderActivityTable(container,"التسويات المسجلة",data.activity.settlements,[{key:"created_at",label:"التاريخ"},{key:"provider_batch_reference",label:"مرجع المزود"},{key:"gross_atoms",label:"الإجمالي"},{key:"fee_atoms",label:"الرسوم"},{key:"net_atoms",label:"الصافي"},{key:"reconciled_at",label:"تاريخ المطابقة"}]);
  setMessage($("app-message"),"تم تحميل السجلات للقراءة فقط.","success");
 }catch(error){container.replaceChildren();const message=document.createElement("p");message.className="message error";message.textContent=error.message||"تعذر تحميل السجلات.";container.append(message);}
}
async function showFeature(view){
 currentView=view;
 const names={
  payments:["المدفوعات","تسجيل نوايا الدفع متاح عبر API محمي فقط. لا يوجد مزود أو أصل مفعّل، ولا يمكن تحصيل أموال حاليًا."],
  ledger:["دفتر الحسابات","نواة دفتر مزدوج القيد موجودة. واجهة الترحيل والمطابقة لا تزال قيد البناء."],
  assets:["الأصول والمزودون","كتالوج العملات والأصول والمزودين موجود، لكن جميع الأصول والمزودين غير مفعّلين."],
  security:["الأمن والحوكمة","RLS، صلاحيات الخادم، سجل التدقيق وحواجز دفتر الحسابات قيد التطوير والاختبار المستمر."]
 };
 $("activity-panel").hidden=view!=="activity";
 $("feature-panel").hidden=view==="activity"||view==="overview";
 $("overview-panel").hidden=view!=="overview";
 if(view==="activity"){await loadActivity();return;}
 const item=names[view];if(!item)return;
 $("feature-title").textContent=item[0];$("feature-description").textContent=item[1];
}
async function signout(){
 try{if(accessToken)await fetch(SUPABASE_URL+"/auth/v1/logout",{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+accessToken}});}catch{/* clear local session regardless */}
 showAuth();
}
document.querySelectorAll("[data-auth-mode]").forEach(button=>button.addEventListener("click",()=>setAuthMode(button.dataset.authMode)));
$("auth-form").addEventListener("submit",authSubmit);
$("organization-form").addEventListener("submit",createOrganization);
$("organization-select").addEventListener("change",async(event)=>{selectedOrganizationId=event.target.value;await loadDashboard();});
$("new-organization-toggle").addEventListener("click",()=>{$("create-org-panel").hidden=!$("create-org-panel").hidden;});
$("refresh-button").addEventListener("click",loadDashboard);
$("signout-button").addEventListener("click",signout);
document.querySelectorAll("[data-view]").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x===button));showFeature(button.dataset.view);}));
setAuthMode("login");
