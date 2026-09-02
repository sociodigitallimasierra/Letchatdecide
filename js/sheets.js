const LS_PRODUCTS="dv_products", LS_SALES="dv_sales", LS_SETTINGS="dv_settings";
function loadSettings(){
  try{ return JSON.parse(localStorage.getItem(LS_SETTINGS)||"null") || CONFIG.googleSheet; }catch{ return CONFIG.googleSheet }
}
function saveSettings(s){ localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); }
function loadProducts(){
  try{
    const p = JSON.parse(localStorage.getItem(LS_PRODUCTS)||"null");
    if(p && Array.isArray(p) && p.length) return p.map(normalizeProduct);
  }catch{}
  return CONFIG.demoProducts.map(normalizeProduct);
}
function normalizeProduct(p){
  if(p.paypalLink===undefined && p.stripeLink) p.paypalLink=p.stripeLink;
  if(p.image==="images/pinceles.jpg") p.image="images/pinceles.png";
  if(p.image && p.image.startsWith("images/")) p.image="./"+p.image;
  return p;
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
    if(j.products) {
      const norm=j.products.map(normalizeProduct).filter(p=>p && p.id && p.title);
      if(norm.length===0) return null;
      return norm;
    }
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
