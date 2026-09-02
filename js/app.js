const $ = s => document.querySelector(s);
function formatUSD(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n); }
function toast(msg){ const t=$("#toast"); if(!t) return; t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),3200); }
function uuid(){ return "ord_"+Math.random().toString(36).slice(2,9) + Date.now().toString(36); }
function downloadToken(){ return Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10); }
function getPayLink(p){ return p.paypalLink || p.stripeLink || ""; }
let PRODUCTS = loadProducts();
async function init(){
  $("#storeName") && ($("#storeName").textContent = CONFIG.storeName);
  $("#storeTagline") && ($("#storeTagline").textContent = CONFIG.tagline);
  render(PRODUCTS);
  const s=loadSettings();
  if(s.appsScriptUrl){
    fetchProductsFromSheet().then(remote=>{
      if(remote && remote.length){
        const localStr=JSON.stringify(PRODUCTS.map(p=>p.id+':'+p.stock+':'+p.price).sort());
        const remoteStr=JSON.stringify(remote.map(p=>p.id+':'+p.stock+':'+p.price).sort());
        if(localStr!==remoteStr){
          console.log(`Sheets stock/price differs from local — keeping local display. Use manage.html → Sync to update Sheets, or clear localStorage to force Sheets.`, {local:PRODUCTS, remote});
        }
      }
    });
  }
  $("#searchInput")?.addEventListener("input", e=>{
    const q=e.target.value.toLowerCase().trim();
    render(PRODUCTS.filter(p=> (p.title+p.description).toLowerCase().includes(q)));
  });
  $("#checkoutModal")?.addEventListener("click", e=>{ if(e.target.id==="checkoutModal") closeCheckout(); });
}
function render(list){
  const grid=$("#productGrid"); if(!grid) return;
  console.log(`Render ${list.length} products`, list);
  const active = list.filter(p=> String(p.active).toLowerCase()!=="false" && p.active!==false);
  if(active.length===0){ grid.innerHTML=`<p class="muted">No products available yet. (Total ${list.length} — check Active flag in manage.html)</p>`; return; }
  if(active.length!==list.length) console.warn(`${list.length-active.length} hidden by Active=false`);
  grid.innerHTML = active.map(p=>{
    const stockLabel = p.stock<=0 ? '<span class="stock low">Sold out</span>' : p.stock<10 ? `<span class="stock low">Only ${p.stock} left</span>` : `<span class="stock ok">In stock • ${p.stock}</span>`;
    return `<article class="card">
      <div class="card-thumb"><img src="${p.image||'./producto-ejemplo.png'}" alt="${p.title}" loading="lazy" onerror="this.onerror=null;this.src='./producto-ejemplo.png'"><span class="price-badge">${formatUSD(Number(p.price))}</span>${stockLabel}</div>
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
  $("#detailImage").src=p.image||"./producto-ejemplo.png"; $("#detailImage").onerror=function(){this.onerror=null;this.src="./producto-ejemplo.png";};
  $("#detailsModal").classList.add("open");
}
function closeDetails(){ $("#detailsModal").classList.remove("open"); }
function buy(id){
  const p=PRODUCTS.find(x=>x.id===id); if(!p) return;
  if(p.stock<=0) return toast("This product is out of stock.");
  openCheckout(p);
}
function openCheckout(product){
  pendingProduct=product;
  $("#checkoutModal").classList.add("open");
  $("#checkoutTitle").textContent = `Complete your purchase — ${product.title}`;
  $("#checkoutPrice").textContent = formatUSD(Number(product.price));
  $("#emailInput").value=""; $("#emailInput").focus();
}
function closeCheckout(){ $("#checkoutModal").classList.remove("open"); pendingProduct=null; }
async function confirmPurchase(){
  const email=$("#emailInput").value.trim();
  if(!pendingProduct) return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Please enter a valid email.");
  const product=pendingProduct;
  const link=getPayLink(product);
  const token=downloadToken();
  const sale={ id:uuid(), date:new Date().toISOString(), productId:product.id, product:product.title, email, amount:Number(product.price), currency:"USD", status:"pending_paypal", token, fileUrl: product.fileUrl||"#" };
  const sales=loadSales(); sales.unshift(sale); saveSales(sales);
  recordSaleToSheet(sale);
  closeCheckout();
  if(link){ window.open(link, "_blank"); }
  const box=$("#downloadBox");
  if(box){
    box.style.display="block";
    box.innerHTML=`<div class="notice" style="border-color:#22c55e;background:rgba(34,197,94,.12);color:#dcfce7"><b>Payment initiated</b> — we opened PayPal in a new tab.<br>After you complete the payment, your download link will be sent automatically to <b>${sale.email}</b>. Please check your inbox and spam folder. Order <span class="muted">${sale.id}</span><br><span class="muted" style="font-size:12px">If you already paid, you'll receive the email within minutes (via PayPal IPN). If not, complete the PayPal checkout.</span></div>`;
    box.scrollIntoView({behavior:"smooth"});
  }
  toast("Check your email after PayPal payment — link is sent automatically.");
}
document.addEventListener("DOMContentLoaded", init);
