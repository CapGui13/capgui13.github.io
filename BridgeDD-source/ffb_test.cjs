const test=require("node:test"),assert=require("node:assert/strict"),p=require("./ffb_parse.js");
test("Example FFB : 52 distinct cards",()=>{
 const hands={
 north:{S:"ARD762",H:"84",D:"R86",C:"62"},
 west:{S:"V",H:"R652",D:"D9754",C:"DV3"},
 east:{S:"1083",H:"V107",D:"AV102",C:"R107"},
 south:{S:"954",H:"AD93",D:"3",C:"A9854"}
 };
 const v=p.validate(hands);
 assert.equal(v.complete,true,JSON.stringify(v));
 assert.deepEqual(v.counts,{north:13,east:13,south:13,west:13});
 assert.equal(v.missing.length,0);
});
test("OCR French 10 and 0 without 1 are handled",()=>{
 assert.equal(p.normalize("A V 10",true).value,"AJT");
 assert.equal(p.normalize("A V 0",true).value,"AJT");
 assert.equal(p.normalize("R D V 9").value,"KQJ9");
});
test("Duplicate/missing caught even if the total is 52",()=>{
 const hands={
 north:{S:"ARD762",H:"84",D:"R86",C:"62"},
 west:{S:"V",H:"R652",D:"D9754",C:"DV3"},
 east:{S:"1083",H:"V107",D:"AV103",C:"R107"},
 south:{S:"954",H:"AD93",D:"3",C:"A9854"}
 };
 const v=p.validate(hands);assert.equal(v.complete,false);
 assert.ok(v.duplicates.includes("D3 (east/south)"));
 assert.ok(v.missing.includes("D2"));
});
test("Green FFB blocks assign seats by position",()=>{
 const w=150,h=270,data=new Uint8ClampedArray(w*h*4);
 function rect(x,y,width,height){for(let py=y;py<y+height;py++)for(let px=x;px<x+width;px++){
 const i=(py*w+px)*4;data[i]=0;data[i+1]=145;data[i+2]=64;data[i+3]=255;
 }}
 rect(44,13,60,18);rect(6,94,60,18);rect(84,94,60,18);rect(44,174,60,18);
 rect(3,3,27,32); // dealer compass must not be interpreted as a hand
 const got=p.detectGreenHeaders({width:w,height:h,data});
 assert.deepEqual(got.map(x=>x.seat),["north","west","east","south"]);
});
