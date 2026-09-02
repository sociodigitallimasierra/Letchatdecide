const $ = s => document.querySelector(s);
function formatUSD(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n); }
function toast(msg){ const t=$("#toast"); if(!t) return; t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2600); }
function uuid(){ return "ord_"+Math.random().toString(36).slice(2,9) + Date.now().toString(36); }
function downloadToken(){ return Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10); }

let PRODUCTS = loadProducts();

async function init(){
  $("#storeName") && ($("#storeName").textContent = CONFIG.storeName);
  $("#storeTagline") && ($("#storeTagline").textContent = CONFIG.tagline);
  const remote = await fetchProductsFromSheet();
  if(remote) PRODUCTS = remote;
  render(PRODUCTS);
  $("#searchInput")?.addEventListener("input", e=>{
    const q=e.target.value.toLowerCase().trim();
    render(PRODUCTS.filter(p=> (p.title+p.description).toLowerCase().includes(q)));
  });
  $("#checkoutModal")?.addEventListener("click", e=>{ if(e.target.id==="checkoutModal") closeCheckout(); });
}
function render(list){
  const grid=$("#productGrid"); if(!grid) return;
  const active = list.filter(p=> p.active!==false);
  if(active.length===0){ grid.innerHTML='<p class="muted">No products available yet.</p>'; return; }
  grid.innerHTML = active.map(p=>{
    const stockLabel = p.stock<=0 ? '<span class="stock low">Sold out</span>' : p.stock<10 ? `<span class="stock low">Only ${p.stock} left</span>` : `<span class="stock ok">In stock • ${p.stock}</span>`;
    return `<article class="card">
      <div class="card-thumb"><img src="${p.image||'./producto-ejemplo.png'}" alt="${p.title}" loading="lazy"><span class="price-badge">${formatUSD(Number(p.price))}</span>${stockLabel}</div>
      <div class="card-body">
        <h3>${p.title}</h3>
        <p>${p.description||''}</p>
        <div class="card-foot">
          <button class="btn btn-ghost btn-sm" onclick="openDetails('${p.id}')">Details</button>
          <button class="btn btn-primary btn-sm" ${p.stock<=0?'disabled':''} onclick="buy('${p.id}')">${p.stock<=0?'Out of stock':'Buy now'}</button>
        </div>
      </div>
    </article>`;
  }).join("");
}
let pendingProduct=null;
function openDetails(id){
  const p=PRODUCTS.find(x=>x.id===id); if(!p) return;
  pendingProduct=p;
  $("#detailTitle").textContent=p.title;
  $("#detailDesc").textContent=p.description;
  $("#detailPrice").textContent=formatUSD(Number(p.price));
  $("#detailImage").src=p.image||"./producto-ejemplo.png";
  $("#detailsModal").classList.add("open");
}
function closeDetails(){ $("#detailsModal").classList.remove("open"); }
function buy(id){
  const p=PRODUCTS.find(x=>x.id===id); if(!p) return;
  if(p.stock<=0) return toast("This product is out of stock.");
  if(p.stripeLink){ window.open(p.stripeLink, "_blank"); openCheckout(p, true); }
  else openCheckout(p, false);
}
function openCheckout(product, viaStripe){
  pendingProduct=product;
  $("#checkoutModal").classList.add("open");
  $("#checkoutTitle").textContent = viaStripe ? "Complete your Stripe payment, then enter email" : `Get instant download — ${product.title}`;
  $("#checkoutPrice").textContent = formatUSD(Number(product.price));
  $("#stripeHint").style.display = viaStripe ? "block" : "none";
  $("#emailInput").value=""; $("#emailInput").focus();
}
function closeCheckout(){ $("#checkoutModal").classList.remove("open"); pendingProduct=null; }
async function confirmPurchase(){
  const email=$("#emailInput").value.trim();
  if(!pendingProduct) return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Please enter a valid email.");
  const product=pendingProduct;
  const token=downloadToken();
  const sale={ id:uuid(), date:new Date().toISOString(), productId:product.id, product:product.title, email, amount:Number(product.price), currency:"USD", status:"paid", token, fileUrl: product.fileUrl||"#" };
  const sales=loadSales(); sales.unshift(sale); saveSales(sales);
  recordSaleToSheet(sale);
  product.stock = Math.max(0, Number(product.stock)-1);
  saveProducts(PRODUCTS);
  pushProductToSheet(product,"update");
  render(PRODUCTS);
  closeCheckout();
  showDownload(sale, product);
  try{
    const s=loadSettings();
    if(s.appsScriptUrl){
      await fetch(s.appsScriptUrl,{method:"POST", body: JSON.stringify({action:"sendDownload", sale}), headers:{"Content-Type":"text/plain"}});
    }
  }catch{}
  toast("Purchase confirmed — check your email!");
}
function showDownload(sale, product){
  const url = product.fileUrl && product.fileUrl!=="#" ? product.fileUrl : `success.html?token=${sale.token}&id=${sale.productId}`;
  const box=$("#downloadBox");
  if(box){
    box.style.display="block";
    box.innerHTML=`<div class="notice"><b>Success!</b> Your download is ready. A link was also sent to <b>${sale.email}</b>.<br><a class="btn btn-primary" style="margin-top:10px;display:inline-flex" href="${url}" target="_blank" rel="noopener">Download now</a> <span class="muted" style="margin-left:8px">Order ${sale.id}</span></div>`;
    box.scrollIntoView({behavior:"smooth"});
  } else {
    location.href=url;
  }
}
document.addEventListener("DOMContentLoaded", init);
