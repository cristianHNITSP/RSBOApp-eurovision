import { chromium } from "playwright"; import fs from "fs";
const TOKEN=fs.readFileSync("/tmp/pw-verify/token.txt","utf8").trim();
const OID="6a227ff83540e0c78c9c9e0f";
const log=(...a)=>console.log("[notif]",...a);
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1366,height:900}});
await c.addCookies([{name:"auth_token",value:TOKEN,domain:"localhost",path:"/"},{name:"csrf_token",value:"v",domain:"localhost",path:"/"}]);
const p=await c.newPage();
await p.addInitScript(()=>{ window.__ws=[]; window.addEventListener("lab:ws",e=>window.__ws.push(e.detail&&e.detail.type)); });
try{
  await p.goto("http://localhost:5173/l/inventario/optica",{waitUntil:"networkidle",timeout:30000});
  await p.waitForSelector("text=Gestión de Óptica",{timeout:15000}); await p.waitForTimeout(2500);
  // badge de campana (conteo de notis)
  const bell = await p.locator('.fa-bell, [class*="notif"]').count();
  log("elementos campana/notif en DOM:", bell);
  await p.screenshot({path:"/tmp/pw-verify/N1-topbar.png"});
  // disparar una alerta nueva por API (Oakley → crítico)
  log("PATCH Oakley stock=1 (crítico) por API…");
  await p.evaluate(async(id)=>{ await fetch("/api/optica/armazones/"+id+"/stock",{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({stock:1})}); }, OID);
  await p.waitForTimeout(3500);
  const ws = await p.evaluate(()=>window.__ws);
  log("eventos lab:ws recibidos:", JSON.stringify(ws));
  log("¿recibió NOTIFICATION_NEW?:", ws.includes("NOTIFICATION_NEW"));
  // abrir panel de notificaciones (click en campana)
  const bellBtn = p.locator('.fa-bell').first();
  if(await bellBtn.count()){ await bellBtn.click({force:true}).catch(()=>{}); await p.waitForTimeout(1200); }
  const alerts = await p.locator('text=/Stock crítico|Advertencia de stock/').allInnerTexts().catch(()=>[]);
  log("alertas visibles en panel:", alerts.length, JSON.stringify(alerts.slice(0,4)));
  await p.screenshot({path:"/tmp/pw-verify/N2-panel.png"});
}catch(e){log("ERR",e.message);await p.screenshot({path:"/tmp/pw-verify/N-err.png"}).catch(()=>{});}
finally{await b.close();}
