const LS_PRODUCTS="dv_products", LS_SALES="dv_sales", LS_SETTINGS="dv_settings";
function loadSettings(){
  try{ return JSON.parse(localStorage.getItem(LS_SETTINGS)||"null") || CONFIG.googleSheet; }catch{ return CONFIG.googleSheet }
}
function saveSettings(s){ localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); }
function loadProducts(){
  try{
    const p = JSON.parse(localStorage.getItem(LS_PRODUCTS)||"null");
    if(p && Array.isArray(p) && p.length) return p;
  }catch{}
  return CONFIG.demoProducts;
}
function saveProducts(list){ localStorage.setItem(LS_PRODUCTS, JSON.stringify(list)); }
function loadSales(){ try{ return JSON.parse(localStorage.getItem(LS_SALES)||"[]"); }catch{ return [] } }
function saveSales(list){ localStorage.setItem(LS_SALES, JSON.stringify(list)); }
async function fetchProductsFromSheet(){
  const s = loadSettings();
  if(!s.appsScriptUrl) return null;
  try{
    const r = await fetch(s.appsScriptUrl + "?action=getProducts", {method:"GET"});
    if(!r.ok) throw new Error(r.statusText);
    const j = await r.json();
    if(j.products) { saveProducts(j.products); return j.products; }
  }catch(e){ console.warn("Sheets fetch failed", e); }
  return null;
}
async function pushProductToSheet(product, mode){
  const s = loadSettings();
  if(!s.appsScriptUrl) return false;
  try{
    await fetch(s.appsScriptUrl, {method:"POST", body: JSON.stringify({action: mode==="delete"?"deleteProduct":mode==="update"?"updateProduct":"addProduct", product}), headers:{"Content-Type":"text/plain"}});
    return true;
  }catch(e){ console.warn(e); return false; }
}
async function recordSaleToSheet(sale){
  const s = loadSettings();
  if(!s.appsScriptUrl) return false;
  try{
    await fetch(s.appsScriptUrl, {method:"POST", body: JSON.stringify({action:"addSale", sale}), headers:{"Content-Type":"text/plain"}});
    return true;
  }catch{ return false; }
}
async function fetchSalesFromSheet(){
  const s = loadSettings();
  if(!s.appsScriptUrl) return null;
  try{
    const r = await fetch(s.appsScriptUrl + "?action=getSales");
    const j = await r.json();
    if(j.sales){ saveSales(j.sales); return j.sales; }
  }catch{}
  return null;
}
