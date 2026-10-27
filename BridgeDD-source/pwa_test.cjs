const test=require("node:test"), assert=require("node:assert/strict");
const fs=require("node:fs");
test("PWA manifest installed under BridgeDD with standalone scope",()=>{
 const m=JSON.parse(fs.readFileSync("BridgeDD/manifest.webmanifest","utf8"));
 assert.equal(m.start_url,"/BridgeDD/");
 assert.equal(m.scope,"/BridgeDD/");
 assert.equal(m.display,"standalone");
 assert.equal(m.short_name,"Bridge DD");
 assert.ok(m.icons.some(x=>x.sizes==="192x192"&&x.type==="image/png"));
 assert.ok(m.icons.some(x=>x.sizes==="512x512"&&x.type==="image/png"));
});
test("Apple install icon and manifest metadata exist",()=>{
 const html=fs.readFileSync("BridgeDD/index.html","utf8");
 assert.match(html,/name="apple-mobile-web-app-capable" content="yes"/);
 assert.match(html,/rel="apple-touch-icon" sizes="180x180"/);
 assert.match(html,/rel="manifest" href="manifest\.webmanifest\?v=pwa-v20"/);
 for(const [name,size] of [["apple-touch-icon.png",180],["icon-192.png",192],["icon-512.png",512]]){
   const bytes=fs.readFileSync("BridgeDD/"+name);
   assert.equal(bytes.subarray(1,4).toString(),"PNG");
   assert.equal(bytes.readUInt32BE(16),size);
   assert.equal(bytes.readUInt32BE(20),size);
 }
});
test("DDS cross origin isolation worker preserved for installed app",()=>{
 const html=fs.readFileSync("BridgeDD/index.html","utf8");
 assert.match(html,/src="coi-serviceworker\.js"/);
 assert.ok(fs.existsSync("BridgeDD/coi-serviceworker.js"));
});
