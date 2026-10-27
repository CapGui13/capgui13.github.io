/* Diagramme mobile traditionnel — les boutons de jeu DDS sont conservés. */
(function(){
"use strict";
const seats=["north","west","east","south"];
const suits=["spades","hearts","diamonds","clubs"];
let scheduled=false;
function compass(){
 const center=document.querySelector(".grid-filler-center");
 if(!center||center.querySelector(".bridge-compass"))return;
 const node=document.createElement("div");
 node.className="bridge-compass";
 node.setAttribute("role","img");
 node.setAttribute("aria-label","Nord Ouest Est Sud");
 for(const [place,letter] of [["north","N"],["west","O"],["east","E"],["south","S"]]){
   const span=document.createElement("span");
   span.className=place;span.textContent=letter;span.setAttribute("aria-hidden","true");
   node.appendChild(span);
 }
 center.insertBefore(node,center.firstChild);
}
function fit(){
 if(!window.matchMedia("(max-width:650px)").matches)return;
 for(const seat of seats)for(const suit of suits){
   const el=document.getElementById(seat+"_"+suit+"_cards");
   if(!el)continue;
   el.style.setProperty("--bridge-pip-font","18px");
   const available=el.clientWidth,needed=el.scrollWidth;
   if(!(available>0&&needed>available))continue;
   const size=Math.max(10,Math.min(18,18*(available-2)/needed));
   el.style.setProperty("--bridge-pip-font",size.toFixed(2)+"px");
 }
}
function schedule(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;fit()});
}
function init(){
 compass();
 const grid=document.querySelector(".grid-outer");
 if(grid)new MutationObserver(schedule).observe(grid,{childList:true,subtree:true});
 window.addEventListener("resize",schedule);
 window.addEventListener("orientationchange",schedule);
 if(document.fonts?.ready)document.fonts.ready.then(schedule);
 schedule();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
