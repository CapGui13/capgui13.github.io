/* Clavier bridge tactile, conservant le stockage DDS d'origine. */
(function(){
"use strict";
const SEATS=[["north","Nord"],["east","Est"],["south","Sud"],["west","Ouest"]];
const SUITS=[["spades","♠","Piques"],["hearts","♥","Cœurs"],["diamonds","♦","Carreaux"],["clubs","♣","Trèfles"]];
const RANKS=[["A","A"],["K","R"],["Q","D"],["J","V"],["T","10"],["9","9"],["8","8"],["7","7"],["6","6"],["5","5"],["4","4"],["3","3"],["2","2"]];
const ORDER="AKQJT98765432";
const state={seat:"north",suit:"spades",open:true,undo:[]};
const byId=id=>document.getElementById(id);
const playing=()=>document.body.classList.contains("playing");
const input=(seat,suit)=>byId(seat+"_"+suit);
const fields=()=>SEATS.flatMap(([seat])=>SUITS.map(([suit])=>input(seat,suit)));
const nameSeat=seat=>SEATS.find(x=>x[0]===seat)?.[1]||seat;
const handCount=seat=>SUITS.reduce((n,[suit])=>n+(input(seat,suit)?.value.length||0),0);
const owner=(suit,pip)=>SEATS.find(([seat])=>(input(seat,suit)?.value||"").includes(pip))?.[0]||null;
function message(text){const el=byId("bridge-kb-message");if(el)el.textContent=text;}
function snapshot(){return fields().map(el=>el?.value||"");}
function render(){
 const host=byId("bridge-keyboard");
 if(!host)return;
 host.hidden=playing();
 host.classList.toggle("bridge-kb-closed",!state.open);
 document.body.classList.toggle("bridge-keyboard-open",!playing()&&state.open);
 byId("bridge-kb-toggle").textContent=state.open?"Réduire":"Ouvrir le clavier";
 byId("bridge-kb-toggle").setAttribute("aria-expanded",String(state.open));
 byId("bridge-kb-status").textContent=nameSeat(state.seat)+" · "+handCount(state.seat)+"/13 cartes";
 byId("bridge-kb-undo").disabled=state.undo.length===0;
 const value=input(state.seat,state.suit)?.value||"";
 byId("bridge-kb-clear").disabled=!value;
 host.querySelectorAll("[data-seat]").forEach(b=>{
  const active=b.dataset.seat===state.seat;
  b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
 });
 host.querySelectorAll("[data-suit]").forEach(b=>{
  const active=b.dataset.suit===state.suit;
  b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
 });
 host.querySelectorAll("[data-rank]").forEach(b=>{
  const pip=b.dataset.rank,who=owner(state.suit,pip),active=value.includes(pip);
  b.classList.toggle("active",active);b.classList.toggle("taken",!!who&&who!==state.seat);
  b.disabled=!!who&&who!==state.seat;
  b.setAttribute("aria-pressed",String(active));
  b.title=who&&who!==state.seat?"Déjà chez "+nameSeat(who):active?"Retirer":"Ajouter";
 });
 document.querySelectorAll(".grid-item .hand-suit").forEach(row=>{
  const el=row.querySelector(".hand-suit-input");
  const selected=el?.id===state.seat+"_"+state.suit;
  row.classList.toggle("bridge-kb-selected",selected&&!playing());
 });
}
function select(seat,suit){
 if(playing()||!SEATS.some(x=>x[0]===seat)||!SUITS.some(x=>x[0]===suit))return;
 state.seat=seat;state.suit=suit;state.open=true;render();
}
function remember(){state.undo.push(snapshot());if(state.undo.length>100)state.undo.shift();}
function update(){
 if(typeof window.updateActionButtons!=="function"){message("Chargement DDS inachevé.");return;}
 window.updateActionButtons();render();
}
function toggle(rank){
 if(playing())return;
 const el=input(state.seat,state.suit);
 if(!el)return;
 const value=el.value.toUpperCase(),who=owner(state.suit,rank);
 if(who&&who!==state.seat){message("Déjà chez "+nameSeat(who));return;}
 if(!value.includes(rank)&&handCount(state.seat)>=13){
  message("Main complète : retire une carte avant d'en ajouter.");return;
 }
 remember();
 el.value=ORDER.split("").filter(p=>p===rank?!value.includes(p):value.includes(p)).join("");
 update();
 message(value.includes(rank)?"Carte retirée.":"Carte ajoutée.");
}
function clearSuit(){
 if(playing())return;
 const el=input(state.seat,state.suit);
 if(!el?.value)return;
 remember();el.value="";update();message("Couleur effacée.");
}
function restore(){
 if(!state.undo.length||playing())return;
 const values=state.undo.pop();
 fields().forEach((el,i)=>{if(el)el.value=values[i]||"";});
 update();message("Dernière saisie annulée.");
}
function addButton(parent,text,attr,value,onClick){
 const b=document.createElement("button");
 b.type="button";b.textContent=text;b.dataset[attr]=value;
 b.addEventListener("click",onClick);parent.append(b);
}
function create(){
 const host=document.createElement("aside");
 host.id="bridge-keyboard";
 host.setAttribute("aria-label","Clavier de saisie des cartes");
 host.innerHTML=`<div class="bridge-kb-head"><div><strong>Clavier bridge</strong><span id="bridge-kb-status"></span></div><button type="button" id="bridge-kb-toggle" aria-expanded="true">Réduire</button></div>
 <div class="bridge-kb-content"><div class="bridge-kb-seats" id="bridge-kb-seats"></div>
 <div class="bridge-kb-suits" id="bridge-kb-suits"></div>
 <div class="bridge-kb-ranks" id="bridge-kb-ranks"></div>
 <div class="bridge-kb-footer"><button type="button" id="bridge-kb-undo">↶ Annuler</button>
 <button type="button" id="bridge-kb-clear">Effacer la couleur</button>
 <span id="bridge-kb-message" role="status">Sélectionne une main et une couleur.</span></div></div>`;
 document.body.append(host);
 SEATS.forEach(([seat,label])=>addButton(byId("bridge-kb-seats"),label,"seat",seat,()=>select(seat,state.suit)));
 SUITS.forEach(([suit,icon,label])=>addButton(byId("bridge-kb-suits"),icon+" "+label,"suit",suit,()=>select(state.seat,suit)));
 RANKS.forEach(([pip,label])=>addButton(byId("bridge-kb-ranks"),label,"rank",pip,()=>toggle(pip)));
 byId("bridge-kb-undo").addEventListener("click",restore);
 byId("bridge-kb-clear").addEventListener("click",clearSuit);
 byId("bridge-kb-toggle").addEventListener("click",()=>{state.open=!state.open;render();});
}
function captureSuitTap(event){
 if(playing()||!event.target?.closest)return;
 const row=event.target.closest(".grid-item .hand-suit");
 const el=row?.querySelector(".hand-suit-input");
 if(!el)return;
 const parts=el.id.split("_");
 if(parts.length!==2)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 select(parts[0],parts[1]);
}
function init(){
 fields().forEach(el=>{
  if(!el)return;
  el.readOnly=true;el.setAttribute("inputmode","none");
  el.setAttribute("autocomplete","off");el.tabIndex=-1;
 });
 create();
 document.addEventListener("click",captureSuitTap,true);
 document.addEventListener("focusin",event=>{
  if(event.target.classList?.contains("hand-suit-input"))event.target.blur();
 },true);
 window.addEventListener("load",()=>{
  if(document.activeElement?.classList?.contains("hand-suit-input"))document.activeElement.blur();
  render();
 },{once:true});
 document.addEventListener("change",event=>{
  if(["sample-deals","import-deal-file"].includes(event.target?.id)){
   state.undo.length=0;queueMicrotask(render);
  }
 });
 document.addEventListener("click",event=>{
  if(event.target.matches?.("body > button")){state.undo.length=0;queueMicrotask(render);}
 });
 new MutationObserver(changes=>{
  if(changes.some(x=>x.attributeName==="class"))render();
 }).observe(document.body,{attributes:true,attributeFilter:["class"]});
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
