/* Bridge DD / FFB screenshot parser, independent of OCR engine and UI.
   Same-origin image processing: no upload or remote recognition. */
(function(root){
"use strict";
const seats=["north","east","south","west"], suits=["S","H","D","C"], ranks="AKQJT98765432";
const french={K:"R",Q:"D",J:"V",T:"10"};
function toFrench(value){return [...String(value)].map(c=>french[c]||c).join(" ");}
function normalize(text,ocr=false){
 let raw=String(text||"").normalize("NFKC").toUpperCase()
  .replace(/[\s.,;:_-]/g,"").replace(/[♠♥♦♣]/g,"")
  .replace(/[O]/g,ocr?"0":"O");
 if(ocr){
  raw=raw.replace(/[I|L]/g,"1").replace(/Z/g,"2").replace(/B/g,"8");
  let fixed="";
  for(let i=0;i<raw.length;i++){
   if(raw[i]==="0" && (i===0||raw[i-1]!=="1"))fixed+="1";
   fixed+=raw[i];
  }
  raw=fixed;
 }
 raw=raw.replace(/10/g,"T").replace(/R/g,"K").replace(/D/g,"Q").replace(/V/g,"J");
 return {value:raw,invalid:raw.replace(/[AKQJT2-9]/g,"")};
}
function empty(){return Object.fromEntries(seats.map(seat=>[seat,{S:"",H:"",D:"",C:""}]));}
function validate(hands){
 const counts={}, duplicates=[], unknown=[], seen=new Map();
 for(const seat of seats){
  let count=0;
  for(const suit of suits){
   const raw=String(hands?.[seat]?.[suit]||"");
   const parsed=normalize(raw);
   if(parsed.invalid)unknown.push(seat+" "+suit+": "+parsed.invalid);
   for(const pip of parsed.value){
    if(!ranks.includes(pip))continue;
    count++;
    const card=suit+pip;
    if(seen.has(card))duplicates.push(card+" ("+seen.get(card)+"/"+seat+")");
    else seen.set(card,seat);
   }
  }
  counts[seat]=count;
 }
 const missing=[];
 for(const suit of suits)for(const pip of ranks)
  if(!seen.has(suit+pip))missing.push(suit+pip);
 const complete=seats.every(seat=>counts[seat]===13)&&
  duplicates.length===0&&unknown.length===0&&missing.length===0;
 return {complete,counts,duplicates,missing,unknown,total:Object.values(counts).reduce((a,b)=>a+b,0)};
}
/* FFB uses green headers for ordinary results, light salmon headers for
   vulnerable / red table themes. Detect both without reading any player data. */
function detectHeadersByColor(image,palette){
 const {width:w,height:h,data}=image,n=w*h;
 if(!w||!h||!data||data.length<n*4||n>14000000)return [];
 const mask=new Uint8Array(n),queue=new Int32Array(n);
 for(let i=0,j=0;i<n;i++,j+=4){
  const r=data[j],g=data[j+1],b=data[j+2];
  const green=g>88 && g>r*1.65 && g>b*1.22 && r<110 && b<155;
  const pink=r>245 && g>198 && g<245 && b>191 && b<243 &&
   r-g>12 && Math.abs(g-b)<16;
  if(palette==="green"?green:pink)mask[i]=1;
 }
 const hits=[],minW=w*.28,minH=h*.026;
 for(let start=0;start<n;start++){
  if(!mask[start])continue;
  let head=0,tail=1,area=0,minx=w,maxx=0,miny=h,maxy=0;
  queue[0]=start;mask[start]=0;
  while(head<tail){
   const i=queue[head++],y=Math.floor(i/w),x=i-y*w;
   area++;if(x<minx)minx=x;if(x>maxx)maxx=x;
   if(y<miny)miny=y;if(y>maxy)maxy=y;
   const candidates=[
    x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1
   ];
   for(const neighbor of candidates)
    if(neighbor>=0 && mask[neighbor]){
     mask[neighbor]=0;queue[tail++]=neighbor;
    }
  }
  const bw=maxx-minx+1,bh=maxy-miny+1;
  if(bw>=minW&&bh>=minH&&bw/bh>1.65&&bw/bh<7&&area>=bw*bh*.26)
   hits.push({x:minx,y:miny,w:bw,h:bh,area});
 }
 if(hits.length<4)return [];
 hits.sort((a,b)=>b.area-a.area);
 const four=hits.slice(0,4).sort((a,b)=>a.y+a.h/2-(b.y+b.h/2));
 const [north,...rest]=four,south=rest.pop();
 rest.sort((a,b)=>a.x-b.x);
 if(rest.length!==2)return [];
 const [west,east]=rest;
 if(Math.abs((west.y+west.h/2)-(east.y+east.h/2))>Math.max(west.h,east.h)*.7)return [];
 if(north.y>=west.y||south.y<=west.y)return [];
 if(Math.abs(north.x+north.w/2-(south.x+south.w/2))>w*.17)return [];
 return [
  {seat:"north",...north},
  {seat:"west",...west},
  {seat:"east",...east},
  {seat:"south",...south}
 ];
}
function detectFFBHeaders(image){
 const green=detectHeadersByColor(image,"green");
 if(green.length===4)return green;
 return detectHeadersByColor(image,"pink");
}
function detectGreenHeaders(image){return detectFFBHeaders(image);}

function cropForRow(header,row,imWidth,imHeight){
 const {x,y,w,h}=header;
 const x0=Math.max(0,Math.round(x+w*.15));
 const x1=Math.min(imWidth,Math.round(x+w*.968));
 const y0=Math.max(0,Math.round(y+h+h*(.13+row*.445)));
 const y1=Math.min(imHeight,Math.round(y+h+h*(.56+row*.445)));
 return {x:x0,y:y0,w:Math.max(0,x1-x0),h:Math.max(0,y1-y0)};
}
const api={seats,suits,ranks,normalize,toFrench,empty,validate,detectGreenHeaders,detectFFBHeaders,cropForRow};
root.BridgeFFB=api;
if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
