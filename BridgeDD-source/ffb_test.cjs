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

test("FFB pink/red screenshot layout is recognized (dealer tile excluded)",()=>{
 const w=750,h=1334,data=new Uint8ClampedArray(w*h*4);
 function rect(x,y,width,height,r,g,b){
  for(let py=y;py<y+height;py++)for(let px=x;px<x+width;px++){
   const i=(py*w+px)*4;data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;
  }
 }
 rect(223,52,304,101,255,229,225);
 rect(32,381,304,101,255,229,225);
 rect(414,381,304,101,255,229,225);
 rect(223,710,304,101,255,229,225);
 rect(32,52,144,144,255,229,225);
 const seats=p.detectFFBHeaders({width:w,height:h,data});
 assert.deepEqual(seats.map(x=>x.seat),["north","west","east","south"]);
 assert.deepEqual(seats.map(x=>[x.x,x.y,x.w,x.h]),[
  [223,52,304,101],[32,381,304,101],[414,381,304,101],[223,710,304,101]
 ]);
});
test("New FFB red screenshot example has 52 unique cards",()=>{
 const hands={
  north:{S:"V1084",H:"94",D:"ADV8",C:"V52"},
  west:{S:"AR732",H:"RD5",D:"7532",C:"9"},
  east:{S:"965",H:"1072",D:"R4",C:"D10764"},
  south:{S:"D",H:"AV863",D:"1096",C:"AR83"}
 };
 const v=p.validate(hands);
 assert.equal(v.complete,true,JSON.stringify(v));
 assert.deepEqual(v.counts,{north:13,east:13,south:13,west:13});
});
