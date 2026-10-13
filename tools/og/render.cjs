const {chromium}=require("playwright");const cards=require(process.cwd()+"/tools/og/cards.json");
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1,colorScheme:"light"});
for(const [n,c] of Object.entries(cards)){await p.goto("http://localhost:8766/tools/og/card.html?c="+encodeURIComponent(encodeURIComponent(JSON.stringify(c))));await p.waitForTimeout(700);await p.evaluate(()=>document.fonts.ready);
await p.locator("#card").screenshot({path:"assets/og/"+n+".png"});}
await b.close();})();
