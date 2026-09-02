const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function fmt(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n); }
function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); }
function getPayLink(p){ return p.paypalLink || p.stripeLink || ""; }
let PRODUCTS=loadProducts(), SALES=loadSales();
function requireAuth(){
  if(sessionStorage.getItem("dv_admin")==="1") return true;
  $("#loginView").style.display="block"; $("#adminView").style.display="none"; return false;
}
function login(){
  const v=$("#adminPass").value;
  if(v===CONFIG.adminPassword){ sessionStorage.setItem("dv_admin","1"); $("#loginView").style.display="none"; $("#adminView").style.display="block"; initAdmin(); }
  else toast("Wrong password");
}
function logout(){ sessionStorage.removeItem("dv_admin"); location.reload(); }
function initAdmin(){
  $("#sheetId").value=loadSettings().sheetId||"";
  $("#appsUrl").value=loadSettings().appsScriptUrl||"";
  const gh=loadGitHubSettings();
  $("#ghRepo").value=gh.repo||""; $("#ghBranch").value=gh.branch||"main"; $("#ghFolder").value=gh.folder||"images"; $("#ghToken").value=gh.token||"";
  bindTabs();
  renderStats(); renderProductsTable(); renderSalesTable(); renderSettingsInfo(); renderGitHubInfo();
}
function bindTabs(){
  $$(".tab").forEach(b=> b.addEventListener("click", ()=>{
    $$(".tab").forEach(x=>x.classList.remove("active")); b.classList.add("active");
    $$(".panel").forEach(p=>p.classList.remove("active")); $("#panel-"+b.dataset.tab).classList.add("active");
  }));
}
function renderStats(){
  const totalRev=SALES.reduce((a,s)=>a+Number(s.amount||0),0);
  $("#statProducts").textContent=PRODUCTS.length;
  $("#statSales").textContent=SALES.length;
  $("#statRevenue").textContent=fmt(totalRev);
  $("#statStock").textContent=PRODUCTS.reduce((a,p)=>a+Number(p.stock||0),0);
}
function renderProductsTable(){
  const tbody=$("#productsTbody");
  tbody.innerHTML=PRODUCTS.map(p=>`
    <tr>
      <td><img src="${p.image}" style="width:44px;height:32px;object-fit:contain;background:#0b0b12;border-radius:8px;vertical-align:middle"> <b>${p.title}</b><br><span class="muted">${p.id}</span></td>
      <td>${fmt(Number(p.price))}</td>
      <td>${p.stock}</td>
      <td><a href="${p.fileUrl}" target="_blank" class="muted">link</a></td>
      <td>${getPayLink(p)?`<a href="${getPayLink(p)}" target="_blank">PayPal</a>`:`<span class="muted">—</span>`}</td>
      <td>${p.active===false?'No':'Yes'}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-sm" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn btn-sm" onclick="delProduct('${p.id}')">Delete</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="7" class="muted">No products</td></tr>`;
}
function renderSalesTable(){
  const tbody=$("#salesTbody");
  tbody.innerHTML=SALES.map(s=>`
    <tr>
      <td>${new Date(s.date).toLocaleString()}</td>
      <td>${s.product}</td>
      <td>${s.email}</td>
      <td>${fmt(Number(s.amount))}</td>
      <td>${s.status}</td>
      <td><span class="muted">${s.token||"-"}</span></td>
    </tr>`).join("") || `<tr><td colspan="6" class="muted">No sales yet</td></tr>`;
}
function renderSettingsInfo(){
  const s=loadSettings();
  $("#settingsInfo").innerHTML=`<span class="muted">Sheet ID:</span> ${s.sheetId||"<i>not set</i>"}<br><span class="muted">Apps Script URL:</span> ${s.appsScriptUrl||"<i>not set</i>"}`;
}
const LS_GH="dv_github";
function loadGitHubSettings(){ try{ return JSON.parse(localStorage.getItem(LS_GH)||"{}"); }catch{ return {}; } }
function saveGitHubSettings(){
  const repo=$("#ghRepo").value.trim(), branch=$("#ghBranch").value.trim()||"main", folder=$("#ghFolder").value.trim()||"images", token=$("#ghToken").value.trim();
  localStorage.setItem(LS_GH, JSON.stringify({repo,branch,folder,token}));
  renderGitHubInfo(); toast("GitHub settings saved");
}
function renderGitHubInfo(){
  const g=loadGitHubSettings();
  $("#ghInfo").innerHTML= g.repo && g.token ? `<span style="color:#22c55e">● Ready</span> <span class="muted">Repo ${g.repo} → ${g.folder}/ on ${g.branch}</span>` : `<span class="muted">Not configured — images will be uploaded to <code>${(g.folder||"images")}/</code> once you save repo + token.</span>`;
}
async function uploadImageFile(input){
  const file=input.files && input.files[0]; if(!file) return;
  const g=loadGitHubSettings();
  if(!g.repo || !g.token) return toast("Set GitHub repo & PAT in Settings first");
  if(!g.repo.includes("/")) return toast("Repo must be owner/repo");
  $("#uploadStatus").textContent="Uploading...";
  try{
    const b64=await fileToBase64(file);
    const cleanName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
    const path=`${(g.folder||"images").replace(/^\/|\/$/g,"")}/${Date.now()}-${cleanName}`;
    const url=`https://api.github.com/repos/${g.repo}/contents/${path}`;
    const res=await fetch(url, {method:"PUT", headers:{Authorization:`token ${g.token}`, Accept:"application/vnd.github.v3+json", "Content-Type":"application/json"}, body: JSON.stringify({message:`Add product image ${cleanName}`, content:b64.split(",")[1], branch:g.branch||"main"})});
    const j=await res.json();
    if(!res.ok) throw new Error(j.message||res.statusText);
    const raw=j.content ? j.content.download_url : `https://raw.githubusercontent.com/${g.repo}/${g.branch||"main"}/${path}`;
    $("#p_image").value=raw;
    $("#uploadStatus").innerHTML=`<span style="color:#22c55e">Uploaded ✔</span> <a href="${raw}" target="_blank" style="text-decoration:underline">view</a> — path will be saved on Save product`;
    toast("Image uploaded to GitHub");
  }catch(e){ $("#uploadStatus").textContent="Error: "+e.message; toast("Upload failed: "+e.message); }
}
function fileToBase64(f){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); }); }
function saveSettingsUI(){
  const sheetId=$("#sheetId").value.trim(), appsScriptUrl=$("#appsUrl").value.trim();
  saveSettings({ ...loadSettings(), sheetId, appsScriptUrl });
  toast("Settings saved"); renderSettingsInfo();
}
function openProductModal(id){
  const isEdit=!!id;
  const p=isEdit? PRODUCTS.find(x=>x.id===id) : {id:"prod_"+Math.random().toString(36).slice(2,7), title:"", description:"", price:19, stock:100, image:"./producto-ejemplo.png", fileUrl:"", paypalLink:"", active:true};
  const payLink=getPayLink(p);
  $("#pmTitle").textContent=isEdit?"Edit product":"Add product";
  $("#p_id").value=p.id; $("#p_title").value=p.title; $("#p_desc").value=p.description; $("#p_price").value=p.price; $("#p_stock").value=p.stock; $("#p_image").value=p.image; $("#p_file").value=p.fileUrl; $("#p_paypal").value=payLink; $("#p_active").value=String(p.active!==false);
  $("#productModal").classList.add("open");
}
function closeProductModal(){ $("#productModal").classList.remove("open"); }
function editProduct(id){ openProductModal(id); }
async function saveProduct(){
  const id=$("#p_id").value.trim()||"prod_"+Math.random().toString(36).slice(2,7);
  const data={ id, title:$("#p_title").value.trim(), description:$("#p_desc").value.trim(), price:parseFloat($("#p_price").value)||0, stock:parseInt($("#p_stock").value)||0, image:$("#p_image").value.trim()||"./producto-ejemplo.png", fileUrl:$("#p_file").value.trim()||"#", paypalLink:$("#p_paypal").value.trim(), active: $("#p_active").value==="true" };
  if(!data.title) return toast("Title required");
  const idx=PRODUCTS.findIndex(x=>x.id===id);
  const mode= idx>=0 ? "update" : "add";
  if(idx>=0) PRODUCTS[idx]=data; else PRODUCTS.unshift(data);
  saveProducts(PRODUCTS); renderProductsTable(); renderStats(); closeProductModal(); toast(mode==="update"?"Product updated":"Product added");
  pushProductToSheet(data, mode);
}
async function delProduct(id){
  if(!confirm("Delete this product?")) return;
  const p=PRODUCTS.find(x=>x.id===id);
  PRODUCTS=PRODUCTS.filter(x=>x.id!==id); saveProducts(PRODUCTS); renderProductsTable(); renderStats(); toast("Product deleted");
  if(p) pushProductToSheet(p,"delete");
}
async function syncFromSheet(){
  const a=await fetchProductsFromSheet(); const b=await fetchSalesFromSheet();
  if(a){ PRODUCTS=a; saveProducts(a); }
  if(b) SALES=b;
  renderProductsTable(); renderSalesTable(); renderStats(); toast(a||b?"Synced from Google Sheets":"No Apps Script URL set");
}
function exportCSV(){
  const header="id,title,price,stock,fileUrl,paypalLink,active\n";
  const rows=PRODUCTS.map(p=> [p.id, `"${p.title.replace(/"/g,'""')}"`, p.price, p.stock, p.fileUrl, getPayLink(p), p.active].join(",")).join("\n");
  const blob=new Blob([header+rows],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="products.csv"; a.click();
}
function exportSalesCSV(){
  const h="id,date,product,email,amount,status,token\n";
  const rows=SALES.map(s=> [s.id,s.date,`"${s.product}"`,s.email,s.amount,s.status,s.token].join(",")).join("\n");
  const blob=new Blob([h+rows],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="sales.csv"; a.click();
}
document.addEventListener("DOMContentLoaded", ()=>{
  if(requireAuth()) initAdmin();
  $("#productModal")?.addEventListener("click", e=>{ if(e.target.id==="productModal") closeProductModal(); });
});
