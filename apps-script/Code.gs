const PRODUCTS_SHEET = 'Products';
const SALES_SHEET = 'Sales';
const HEADER_PRODUCTS = ['id','title','description','price','stock','image','fileUrl','stripeLink','active'];
const HEADER_SALES = ['id','date','productId','product','email','amount','currency','status','token','fileUrl'];

function doGet(e){
  const action = e.parameter.action;
  if(action==='getProducts') return json({products: getProducts()});
  if(action==='getSales') return json({sales: getSales()});
  return json({ok:true, message:'Use ?action=getProducts or getSales'});
}
function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents);
    if(body.action==='addProduct' || body.action==='updateProduct') upsertProduct(body.product);
    if(body.action==='deleteProduct') deleteProduct(body.product.id);
    if(body.action==='addSale') addSale(body.sale);
    if(body.action==='sendDownload') sendDownloadEmail(body.sale);
    return json({ok:true});
  }catch(err){ return json({ok:false, error: String(err)}); }
}
function getProducts(){
  const sh = getSheet(PRODUCTS_SHEET, HEADER_PRODUCTS);
  const vals = sh.getDataRange().getValues();
  if(vals.length<=1) return [];
  const header = vals[0];
  return vals.slice(1).filter(r=>r[0]).map(r=>{
    const o={}; header.forEach((h,i)=> o[h]=r[i]);
    o.price=Number(o.price); o.stock=Number(o.stock); o.active= String(o.active).toLowerCase()!=='false';
    return o;
  });
}
function getSales(){
  const sh = getSheet(SALES_SHEET, HEADER_SALES);
  const vals = sh.getDataRange().getValues();
  if(vals.length<=1) return [];
  const header = vals[0];
  return vals.slice(1).filter(r=>r[0]).map(r=>{ const o={}; header.forEach((h,i)=> o[h]=r[i]); return o; });
}
function upsertProduct(p){
  const sh = getSheet(PRODUCTS_SHEET, HEADER_PRODUCTS);
  const vals = sh.getDataRange().getValues();
  let row = -1;
  for(let i=1;i<vals.length;i++) if(String(vals[i][0])===String(p.id)) row=i+1;
  const rowData = HEADER_PRODUCTS.map(h=> p[h]!==undefined? p[h] : '');
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
  const row = HEADER_SALES.map(h=> s[h]!==undefined? s[h] : '');
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
  return sh;
}
function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
