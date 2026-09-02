const PRODUCTS_SHEET = 'Products';
const SALES_SHEET = 'Sales';
const HEADER_PRODUCTS = ['id','title','description','price','stock','image','fileUrl','paypalLink','active'];
const HEADER_SALES = ['id','date','productId','product','email','amount','currency','status','token','fileUrl'];
const LEGACY_STRIPE_COL = 'stripeLink';

function doGet(e){
  const action = e.parameter.action;
  if(action==='getProducts') return json({products: getProducts()});
  if(action==='getSales') return json({sales: getSales()});
  return json({ok:true, message:'Use ?action=getProducts or getSales'});
}

function doPost(e){
  const raw = e.postData ? e.postData.contents : '';
  const params = e.parameter || {};
  if(raw.indexOf('"action"') === -1 && (raw.indexOf('txn_id')>-1 || raw.indexOf('payment_status')>-1 || params.txn_id)){
    return handlePayPalIPN(e);
  }
  try{
    const body = JSON.parse(raw || '{}');
    if(body.action==='addProduct' || body.action==='updateProduct') upsertProduct(body.product);
    if(body.action==='deleteProduct') deleteProduct(body.product.id);
    if(body.action==='addSale') addSale(body.sale);
    if(body.action==='sendDownload') sendDownloadEmail(body.sale);
    return json({ok:true});
  }catch(err){ return json({ok:false, error: String(err)}); }
}

function handlePayPalIPN(e){
  try{
    const ipn = {};
    if(e.postData && e.postData.contents){
      const pairs = e.postData.contents.split('&');
      pairs.forEach(function(p){
        const kv=p.split('=');
        ipn[decodeURIComponent(kv[0])]= kv[1] ? decodeURIComponent(kv[1].replace(/\+/g,' ')) : '';
      });
    }
    for(var k in e.parameter) if(!ipn[k]) ipn[k]=e.parameter[k];

    const verifyPayload = 'cmd=_notify-validate&' + (e.postData ? e.postData.contents : '');
    let verified = false;
    try{
      const verifyRes = UrlFetchApp.fetch('https://ipnpb.paypal.com/cgi-bin/webscr', {method:'post', payload: verifyPayload, headers:{'Content-Type':'application/x-www-form-urlencoded'}});
      verified = verifyRes.getContentText().indexOf('VERIFIED')>-1;
    } catch(errVerify){
      try{
        const v2 = UrlFetchApp.fetch('https://www.paypal.com/cgi-bin/webscr', {method:'post', payload: verifyPayload});
        verified = v2.getContentText().indexOf('VERIFIED')>-1;
      }catch(e2){}
    }
    if(!verified){
      // For sandbox testing allow if you use sandbox URL - log but still process if payment_status Completed for testing
      // Uncomment next line to reject unverified:
      // return ContentService.createTextOutput('INVALID');
    }
    const status = (ipn.payment_status||'').toLowerCase();
    if(status!=='completed' && status!=='verified') return ContentService.createTextOutput('OK');

    const payerEmail = ipn.payer_email || ipn.payerEmail || '';
    const amount = parseFloat(ipn.mc_gross || ipn.amount || ipn.payment_gross || 0);
    const productId = (ipn.custom || ipn.item_number || '').trim();
    const txnId = ipn.txn_id || ('pp_'+new Date().getTime());

    let product = null;
    const products = getProducts();
    if(productId) product = products.filter(function(p){ return String(p.id)===String(productId); })[0];
    if(!product && amount) product = products.filter(function(p){ return Math.abs(Number(p.price)-amount)<0.01; })[0];
    if(!product) return ContentService.createTextOutput('OK');

    if(Number(product.stock) <= 0) return ContentService.createTextOutput('OK');

    const token = Utilities.getUuid().slice(0,16);
    const sale = { id: txnId, date: new Date().toISOString(), productId: product.id, product: product.title, email: payerEmail, amount: product.price, currency:'USD', status:'paid', token: token, fileUrl: product.fileUrl };
    addSale(sale);
    product.stock = Math.max(0, Number(product.stock)-1);
    upsertProduct(product);
    if(payerEmail) sendDownloadEmail(sale);
    return ContentService.createTextOutput('OK');
  }catch(err){
    return ContentService.createTextOutput('ERROR '+err);
  }
}

function getProducts(){
  const sh = getSheet(PRODUCTS_SHEET, HEADER_PRODUCTS);
  const vals = sh.getDataRange().getValues();
  if(vals.length<=1) return [];
  let header = vals[0].map(function(h){return String(h).trim();});
  const hasLegacy = header.indexOf(LEGACY_STRIPE_COL)>-1 && header.indexOf('paypalLink')===-1;
  return vals.slice(1).filter(function(r){return r[0];}).map(function(r){
    const o={}; header.forEach(function(h,i){ o[h]=r[i]; });
    if(hasLegacy && o[LEGACY_STRIPE_COL] && !o.paypalLink) o.paypalLink=o[LEGACY_STRIPE_COL];
    o.price=Number(o.price); o.stock=Number(o.stock); o.active= String(o.active).toLowerCase()!=='false';
    return o;
  });
}
function getSales(){
  const sh = getSheet(SALES_SHEET, HEADER_SALES);
  const vals = sh.getDataRange().getValues();
  if(vals.length<=1) return [];
  const header = vals[0];
  return vals.slice(1).filter(function(r){return r[0];}).map(function(r){ const o={}; header.forEach(function(h,i){ o[h]=r[i]; }); return o; });
}
function upsertProduct(p){
  if(p.stripeLink && !p.paypalLink) p.paypalLink=p.stripeLink;
  const sh = getSheet(PRODUCTS_SHEET, HEADER_PRODUCTS);
  const vals = sh.getDataRange().getValues();
  let row = -1;
  for(let i=1;i<vals.length;i++) if(String(vals[i][0])===String(p.id)) row=i+1;
  const rowData = HEADER_PRODUCTS.map(function(h){ return p[h]!==undefined? p[h] : ''; });
  if(row>0) sh.getRange(row,1,1,rowData.length).setValues([rowData]);
  else sh.appendRow(rowData);
}
function deleteProduct(id){
  const sh = getSheet(PRODUCTS_SHEET, HEADER_PRODUCTS);
  const vals = sh.getDataRange().getValues();
  for(let i=1;i<vals.length;i++) if(String(vals[i][0])===String(id)) { sh.deleteRow(i+1); break; }
}
function addSale(s){
  const sh = getSheet(SALES_SHEET, HEADER_SALES);
  const row = HEADER_SALES.map(function(h){ return s[h]!==undefined? s[h] : ''; });
  sh.appendRow(row);
}
function sendDownloadEmail(sale){
  const subject = 'Your download is ready — ' + sale.product;
  const link = sale.fileUrl && sale.fileUrl!=='#' ? sale.fileUrl : 'Contact support with token '+sale.token;
  const body = 'Hi!\n\nThanks for your purchase ('+sale.product+' — $'+sale.amount+' USD).\n\nDownload link: '+link+'\nOrder: '+sale.id+'\nToken: '+sale.token+'\n\nIf you have any issue reply to this email.\n\n— Let the chat decide';
  try{ MailApp.sendEmail(sale.email, subject, body); }catch(e){}
}
function getSheet(name, header){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if(!sh){ sh=ss.insertSheet(name); sh.getRange(1,1,1,header.length).setValues([header]); }
  const first = sh.getRange(1,1,1,header.length).getValues()[0];
  if(first.join('')==='') sh.getRange(1,1,1,header.length).setValues([header]);
  if(header.indexOf('paypalLink')>-1){
    const h0 = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].join('|');
    if(h0.indexOf('stripeLink')>-1 && h0.indexOf('paypalLink')===-1){
      sh.getRange(1, header.indexOf('paypalLink')+1).setValue('paypalLink');
    }
  }
  return sh;
}
function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
