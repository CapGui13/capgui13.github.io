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
/* Identify FFB player headers in both colours, including mixed tables.
   North may be scrolled off-screen: the two complete horizontal player
   headers anchor the 329/101 geometry of the FFB deal diagram. */
function detectFFBHeaders(image){
 const {width:w,height:h,data}=image;
 const n=w*h;
 if(!w||!h||!data||data.length<n*4||n>14000000)return [];
 const pixel=new Uint8Array(n),queue=new Int32Array(n);
 for(let i=0,j=0;i<n;i++,j+=4){
  const r=data[j],g=data[j+1],b=data[j+2];
  const green=g>88&&g>r*1.65&&g>b*1.22&&r<110&&b<155;
  const pink=r>245&&g>198&&g<245&&b>191&&b<243&&r-g>12&&Math.abs(g-b)<16;
  pixel[i]=green?1:(pink?2:0);
 }
 const components=[];
 for(let start=0;start<n;start++){
  const colour=pixel[start];
  if(!colour)continue;
  let head=0,tail=1,minX=w,maxX=-1,minY=h,maxY=-1;
  queue[0]=start;pixel[start]=0;
  while(head<tail){
   const i=queue[head++],y=Math.floor(i/w),x=i-y*w;
   if(x<minX)minX=x;if(x>maxX)maxX=x;
   if(y<minY)minY=y;if(y>maxY)maxY=y;
   const near=[x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1];
   for(const k of near)if(k>=0&&pixel[k]===colour){
    pixel[k]=0;queue[tail++]=k;
   }
  }
  const bw=maxX-minX+1,bh=maxY-minY+1;
  if(bw>=w*.26&&bh>=Math.max(13,h*.009)&&bw/bh>1.6&&bw/bh<12&&
     tail>=bw*bh*.25)
   components.push({x:minX,y:minY,w:bw,h:bh,area:tail});
 }
 let best=null,bestScore=-Infinity;
 for(const left of components)for(const right of components){
  if(left===right||left.x>=right.x)continue;
  const a=(left.x+left.w/2)/w,b=(right.x+right.w/2)/w;
  if(a>.47||b<.53||b-a<.35)continue;
  if(Math.abs(left.y-right.y)>Math.max(5,Math.min(left.h,right.h)*.1))continue;
  if(Math.abs(left.w-right.w)>Math.max(left.w,right.w)*.12)continue;
  if(Math.abs(left.h-right.h)>Math.max(left.h,right.h)*.13)continue;
  if(Math.min(left.h,right.h)<w*.08)continue;
  const score=left.area+right.area-Math.abs(left.y-right.y)*100;
  if(score>bestScore){best=[left,right];bestScore=score;}
 }
 if(!best)return [];
 const [west,east]=best;
 const width=Math.round((west.w+east.w)/2);
 const height=Math.round((west.h+east.h)/2);
 const yMiddle=Math.round((west.y+east.y)/2);
 const xMiddle=Math.round((west.x+east.x)/2);
 const offset=Math.round(height*(329/101));
 return [
  {seat:"north",x:xMiddle,y:yMiddle-offset,w:width,h:height,inferred:true},
  {seat:"west",...west},
  {seat:"east",...east},
  {seat:"south",x:xMiddle,y:yMiddle+offset,w:width,h:height,inferred:true}
 ];
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
