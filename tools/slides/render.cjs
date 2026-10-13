// 슬라이드 그리기: node tools/slides/render.cjs <spec.json> <출력 폴더>  (사이트 루트에서 http.server 8766을 띄운 상태)
const {chromium}=require("playwright");const fs=require("fs");
const [spec,out]=process.argv.slice(2);const S=JSON.parse(fs.readFileSync(spec,"utf8"));
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1,colorScheme:"light"});
let i=0;for(const s of S){i++;await p.goto("http://localhost:8766/tools/slides/slide.html?s="+encodeURIComponent(encodeURIComponent(JSON.stringify(s))));await p.waitForTimeout(500);await p.evaluate(()=>document.fonts.ready);
await p.locator("#slide").screenshot({path:out+"/s"+String(i).padStart(2,"0")+".png"});}
await b.close();})();
