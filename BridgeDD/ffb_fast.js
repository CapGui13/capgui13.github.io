/* FFB screenshot rank reader — glyph templates contain no names or screenshot images.
   Captures using a different font are routed to Tesseract for manual correction. */
(function(root){
"use strict";
const glyphData="A|13|18|AcABwAfAB/AH8AfwD/AP8A/4D/gPeB94HngeeB58Hjw//D/8P/4//v/+//7wDvAP\nA|13|18|AcABwAfAB/AH8AfwD/AP8A/4D/gPeB94HngeeB58Hjw//D/8P/4//v/+//7wDvAP\nR|12|18|/wD/AP/w//z8Pvw+/B78Hvwe/B78Hvz+//z//P/w/+D98P3w/PD8/Pw+/D78Pvwf\nR|11|18|/4D/gP/8//74fvh++B/4H/gf+B/4H/h+//z//P/w//D48Pjw+Pz4fvh++H74H/gf\nD|11|18|/wD/AP/w//z//v/++H74H/gP+A/4D/gP+A/4D/gP+A/4H/gf+H/7/v/8//z/8P+A\nD|12|17|/+D/4P/8//z//PA+8B7wHvAe8A7wDvAO8A/wDvAO8B7wHvA+8D7w/P/8//z/4P8A\nV|13|18|8AfwB/AP8A74DvgOOA44Pjg8ODw+PB48HjwePB58H3gPeA94D3gP+A/wD/AH8Afw\nV|12|17|8APwA/APMA8wDzwPPA48DjwOHB4eHh4eHhweHB4cDjwPPA8wDzAP8APwA/AD8APg\n1|7|18|AD8APwH/Af////////////4//j8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/\n1|7|18|AD8APwH/Af////////////4//j8APwA/AD8APwA/AD8APwA/AD8APwA/AD8APwA/\n0|12|18|A+AD4A/8H/4+Pj4+PB/8D/AP8A/wD/AP8A/wD/AP8A/8D/wPPB8+Hj/+P/4f/A/w\n0|12|18|A+AD4A/8H/4+Pj4+PB/8D/AP8A/wD/AP8A/wD/AP8A/8D/wPPB8+Hj/+P/4f/A/w\n9|12|18|A+AD4B/8P/4+Pj4+PA/8D/wP/A88DzwfP/8//x//D+8ADwAPAA88Hj/+P/4f/A/w\n9|12|18|AQABAB/wP/w8Pjw+8B7wDvAO8A7wD/AfPv8+/x/vD84ADgAOAB48Hj78Pvwf8A/g\n8|13|18|B/AH8B/8P/4+Pj4+OA44Dj4+Pj4f/B/4H/wf/D7+OD74D/gP+A84Dj/+P/4f/A/4\n8|12|18|D/AP8B/8P/48Hzwf/B/8HzwePB4//h/8H/4f/j7+/B/wD/AP8A/8H//+//4//g/w\n7|10|18|//////////8APwA/AD8APgD+AP4A/gH4AfgB+AHwB/AHwAfAD8APwD8APwA/AP4A\n7|11|18|P/8///////8AHwAfAB4AfgB+AH4A/AD8APAA8APwA+AH4AfgB4AfgB+AH4A/AD8A\n6|12|18|AfAB8A/+H/8eHx4fPA48ADzgPOA//v/+/x//H/wPPA88DzwPPA8+Hx//H/8P/gP8\n6|12|18|A/AD8A/8H/4+Hj4ePBzwAPDg8ODz/P/+/h7+Hvwf8A/wD/AP/B88Hz/+P/4f/A/w\n5|12|18|P/w//D/+P/48ADwAPAA8AD3wPfA//D/+PD48PgAfAB8wHzAf8B/8Pv/+//4//A/w\n5|12|17|H/4f/h/+HAAcABwAHAAcABzgH/wf/h/+Hh4ADwAPAA8AD/AP8A88Hz/+P/4f/APw\n4|13|18|AHgAeAD8APwB/AH8B/wH/A98D3wffB58OHw4fDh8+Hz//////////wB8AHwAfAB8\n4|12|17|APwA/AH8AfwB/AP8DzwPPA88HjwcPBw8PDzwPPA88Dz///////8APAA8ADwAPAA8\n3|12|18|A/AD8B/8H/4+Hz4fPB8AHwAeAB4APgP8AfwB/AAfAA8ADwAP/A/8Hz//P/8f/g/8\n3|12|18|A+AD4B/8P/78Pvw+/B4AHgAeAB4APAPwA/wD/AAeAB8AHwAf8B/8H//+//4//g/w\n2|11|18|B/AH8B/+P/78f/x/+B/4DwAPAA8AHwAfAH4AfgB+APwD8APwH+D/gP//////////\n2|12|18|A/AD8B/8P/4+/j7+/B8wHwAeAB4AHgAeAD4APgD8AfAD4APgD8A/AP//////////";
const templates=glyphData.split("\n").filter(Boolean).map(line=>{
 const [label,w,h,encoded]=line.split("|");
 const bytes=typeof atob==="function"?atob(encoded):Buffer.from(encoded,"base64").toString("binary");
 const bmp=new Uint8Array(384);
 for(let i=0;i<384;i++)bmp[i]=(bytes.charCodeAt(i>>3)>>(7-(i&7)))&1;
 return {label,w:+w,h:+h,bmp};
});
function decodeRow(image){
 const {width:w,height:h,data}=image;
 if(!w||!h||!data||data.length!==w*h*4)return {raw:"",uncertain:1,components:0};
 const black=new Uint8Array(w*h);
 let bx0=w,by0=h,bx1=-1,by1=-1,bcount=0;
 for(let i=0,j=0;i<w*h;i++,j+=4){
  const r=data[j],g=data[j+1],b=data[j+2];
  if(r<125&&g<125&&b<125&&Math.abs(r-g)<50)black[i]=1;
  if(b>140&&b>r*1.7&&b>g*1.17&&g<180){
   const y=(i/w)|0,x=i-y*w;
   if(x<bx0)bx0=x;if(x>bx1)bx1=x;
   if(y<by0)by0=y;if(y>by1)by1=y;bcount++;
  }
 }
 const bw=bx1-bx0+1,bh=by1-by0+1;
 if(bcount>=60&&bw>=14&&bw<=43&&bh>=14&&bh<=43&&Math.abs(bw-bh)<10){
  const cx=(bx0+bx1)/2,cy=(by0+by1)/2,radius=Math.min(bw,bh)*.40;
  for(let y=by0;y<=by1;y++)for(let x=bx0;x<=bx1;x++){
   const i=y*w+x,j=i*4,dx=x-cx,dy=y-cy;
   if(dx*dx+dy*dy<radius*radius)
    black[i]=data[j]>205&&data[j+1]>205&&data[j+2]>205?1:0;
  }
 }
 const visited=new Uint8Array(w*h),queue=new Int32Array(w*h),parts=[];
 for(let start=0;start<w*h;start++){
  if(!black[start]||visited[start])continue;
  visited[start]=1;queue[0]=start;
  let head=0,tail=1,x0=w,y0=h,x1=-1,y1=-1;
  while(head<tail){
   const i=queue[head++],y=(i/w)|0,x=i-y*w;
   if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   for(let ny=Math.max(0,y-1);ny<=Math.min(h-1,y+1);ny++)
    for(let nx=Math.max(0,x-1);nx<=Math.min(w-1,x+1);nx++){
     const j=ny*w+nx;
     if(black[j]&&!visited[j]){visited[j]=1;queue[tail++]=j;}
    }
  }
  const pw=x1-x0+1,ph=y1-y0+1;
  if(tail>=5&&ph>=11&&pw>=2&&ph<=38&&pw<=27)parts.push({x:x0,y:y0,w:pw,h:ph});
 }
 parts.sort((a,b)=>a.x-b.x);
 let raw="",uncertain=0;
 for(const part of parts){
  const raster=new Uint8Array(384);
  for(let py=0;py<24;py++)for(let px=0;px<16;px++){
   const sx=part.x+Math.floor(px*part.w/16);
   const sy=part.y+Math.floor(py*part.h/24);
   raster[py*16+px]=black[sy*w+sx];
  }
  let best=null,second=Infinity;
  for(const template of templates){
   let errors=0;
   for(let i=0;i<384;i++)if(raster[i]!==template.bmp[i])errors++;
   const score=errors/384+Math.abs(part.w-template.w)*.012+
    Math.abs(part.h-template.h)*.025;
   if(best===null||score<best.score){
    if(best!==null&&best.label!==template.label)second=Math.min(second,best.score);
    best={label:template.label,score};
   }else if(template.label!==best.label)second=Math.min(second,score);
  }
  if(best){
   raw+=best.label;
   if(best.score>.20||second-best.score<.08)uncertain++;
  }
 }
 if((raw.match(/1/g)||[]).length!==(raw.match(/0/g)||[]).length)uncertain++;
 return {raw,uncertain,components:parts.length};
}
function recognize(source,headers,parser){
 if(!source||!headers||headers.length!==4||!parser)return null;
 const hands=parser.empty();
 let uncertain=0,readCount=0;
 for(const head of headers)for(let row=0;row<4;row++){
  const rect=parser.cropForRow(head,row,source.width,source.height);
  if(rect.w<=0||rect.h<=0){uncertain++;continue;}
  const paper=document.createElement("canvas");
  paper.width=248;paper.height=44;
  const ctx=paper.getContext("2d",{willReadFrequently:true});
  if(!ctx){uncertain++;continue;}
  ctx.fillStyle="#fff";ctx.fillRect(0,0,248,44);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(source,rect.x,rect.y,rect.w,rect.h,0,0,248,44);
  const result=decodeRow(ctx.getImageData(0,0,248,44));
  const cleaned=parser.normalize(result.raw);
  hands[head.seat][parser.suits[row]]=cleaned.value;
  uncertain+=result.uncertain+(cleaned.invalid?1:0);
  readCount++;
 }
 return {hands,uncertain,readCount};
}
const api={decodeRow,recognize};
root.BridgeFFBFast=api;
if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
