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
 // Uniform spacing on every suit. Shrink only the font when a long suit
 // needs more room; never change the inter-card gap or hide a card.
 for(const seat of seats){
   const holders=suits.map(suit=>document.getElementById(seat+"_"+suit+"_cards")).filter(Boolean);
   if(!holders.length)continue;
   // Same font size for all four suits of one hand keeps rows aligned.
   let size=18;
   for(const el of holders)el.style.setProperty("--bridge-pip-font",size+"px");
   const fits=()=>holders.every(el=>el.scrollWidth<=el.clientWidth+1);
   while(size>8&& !fits()){
     size-=0.5;
     for(const el of holders)el.style.setProperty("--bridge-pip-font",size+"px");
   }
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
