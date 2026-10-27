/* Bridge DD — Résultats double dummy d'une donne complète.
   Lit la matrice officielle du solveur DDS ; aucun recalcul ou score inventé. */
(function(root){
"use strict";
const seatDefs=[
 {label:"Nord",row:1},
 {label:"Sud",row:3},
 {label:"Est",row:2},
 {label:"Ouest",row:4}
];
const strains=[
 {label:"♣",name:"trèfle",column:1},
 {label:"♦",name:"carreau",column:2},
 {label:"♥",name:"cœur",column:3},
 {label:"♠",name:"pique",column:4},
 {label:"SA",name:"sans-atout",column:5}
];
function describe(tricks,strain){
 if(!Number.isInteger(tricks)||tricks<0||tricks>13)return null;
 const level=Math.max(0,tricks-6);
 return {
  tricks,level,
  label:level?String(level):"—",
  aria:level
   ?("Contrats de 1 à "+level+" "+strain.name+
     " réalisables, maximum "+tricks+" levées.")
   :("Aucun contrat au palier de 1 réalisable, maximum "+
     tricks+" levées."),
  detail:level?("1"+strain.label+" à "+level+strain.label):"Aucun contrat"
 };
}
// DDS fournit déjà les levées maximales en défense optimale pour chaque
// déclarant et couleur. Le tableau est mis en cache par donne/PBN dans DDS.
function readExistingResults(table,currentHands,validFn){
 if(!table||!table.rows||table.rows.length<5||!validFn(currentHands))return null;
 const matrix=[];
 for(const seat of seatDefs){
  const row=[];
  for(const strain of strains){
   const cell=table.rows[seat.row]?.cells?.[strain.column];
   const raw=cell?.textContent?.trim()??"";
   if(!/^(?:[0-9]|1[0-3])$/.test(raw))return null;
   const value=Number(raw);
   const result=describe(value,strain);
   if(!result)return null;
   row.push(result);
  }
  matrix.push(row);
 }
 return matrix;
}
function init(){
 const button=document.getElementById("bridge-dd-open");
 if(!button)return;
 const dialog=document.createElement("section");
 dialog.id="bridge-dd-panel";
 dialog.setAttribute("aria-label","Double dummy de la donne");
 dialog.hidden=true;
 dialog.innerHTML=`<div class="bridge-dd-scrim" data-close="true"></div>
 <div class="bridge-dd-dialog" role="dialog" aria-modal="true"
 aria-labelledby="bridge-dd-heading">
  <div class="bridge-dd-heading"><h2 id="bridge-dd-heading">Double dummy</h2>
   <button id="bridge-dd-close" type="button" aria-label="Fermer le tableau">✕</button>
  </div>
  <p class="bridge-dd-subtitle">Tableau des contrats réalisables · style Bridgemate</p>
  <p id="bridge-dd-status" class="bridge-dd-status" role="status"></p>
  <div id="bridge-dd-table-slot"></div>
  <p id="bridge-dd-explanation" class="bridge-dd-explanation">
   Chaque case indique le plus haut contrat réalisable. Tous les contrats
   inférieurs dans la même couleur sont également gagnants en double dummy.
  </p>
  <div class="bridge-dd-switches"><button id="bridge-dd-format" type="button">
   Afficher les levées</button></div>
  <p class="bridge-dd-note">Résultats pour la donne complète,
   avec défense et jeu de la carte optimaux.</p>
 </div>`;
 document.body.append(dialog);
 const status=document.getElementById("bridge-dd-status");
 const slot=document.getElementById("bridge-dd-table-slot");
 const fmt=document.getElementById("bridge-dd-format");
 let showTricks=false, lastModel=null,restore=null,scheduled=false;
 function currentMatrix(){
  const table=document.getElementById("result-table");
  const hands=typeof root.collectHands==="function"?root.collectHands():null;
  const valid=(h)=>!!h && typeof root.ddTableLooksPopulated==="function"
   &&root.ddTableLooksPopulated(table,h);
  return readExistingResults(table,hands,valid);
 }
 function render(){
  if(dialog.hidden)return;
  lastModel=currentMatrix();
  slot.replaceChildren();
  if(!lastModel){
   status.textContent="Calcul DDS en cours…";
   fmt.disabled=true;
   return;
  }
  status.textContent="";
  fmt.disabled=false;
  fmt.textContent=showTricks?"Afficher les contrats":"Afficher les levées";
  const table=document.createElement("table");
  table.className="bridge-dd-matrix";
  const caption=document.createElement("caption");
  caption.textContent=showTricks?"Levées maximales":"Plus hauts contrats gagnants";
  table.append(caption);
  const tr=document.createElement("tr");
  const corner=document.createElement("th");
  corner.scope="col";corner.textContent="";tr.append(corner);
  for(const strain of strains){
   const th=document.createElement("th");
   th.scope="col";
   th.textContent=strain.label;
   th.className="bridge-dd-suit "+(strain.column===2||strain.column===3?"red":"");
   tr.append(th);
  }
  const thead=document.createElement("thead");thead.append(tr);table.append(thead);
  const body=document.createElement("tbody");
  seatDefs.forEach((seat,index)=>{
   const row=document.createElement("tr"),name=document.createElement("th");
   name.scope="row";name.textContent=seat.label;row.append(name);
   strains.forEach((strain,j)=>{
    const value=lastModel[index][j],cell=document.createElement("td");
    cell.textContent=showTricks?String(value.tricks):value.label;
    cell.className=value.level?"bridge-dd-make":"bridge-dd-down";
    cell.title=seat.label+" · "+strain.name+" : "+value.aria;
    cell.setAttribute("aria-label",seat.label+" "+strain.name+". "+value.aria);
    row.append(cell);
   });
   body.append(row);
  });
  table.append(body);slot.append(table);
  document.getElementById("bridge-dd-explanation").hidden=showTricks;
 }
 function scheduleRender(){
  if(scheduled||dialog.hidden)return;
  scheduled=true;
  (root.requestAnimationFrame||((cb)=>Promise.resolve().then(cb)))(()=>{
   scheduled=false;render();
  });
 }
 function close(){
  if(dialog.hidden)return;
  dialog.hidden=true;
  document.body.classList.remove("bridge-dd-open");
  if(restore&&typeof restore.focus==="function")restore.focus();
 }
 button.addEventListener("click",()=>{
  restore=document.activeElement;
  dialog.hidden=false;
  document.body.classList.add("bridge-dd-open");
  showTricks=false;
  render();
  document.getElementById("bridge-dd-close").focus();
  if(!lastModel&&typeof root.scheduleDealSolve==="function")
   void root.scheduleDealSolve();
 });
 fmt.addEventListener("click",()=>{showTricks=!showTricks;render();});
 document.getElementById("bridge-dd-close").addEventListener("click",close);
 dialog.querySelector(".bridge-dd-scrim").addEventListener("click",close);
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!dialog.hidden){event.preventDefault();close();}
 });
 const nativeTable=document.getElementById("result-table");
 if(nativeTable)new MutationObserver(scheduleRender).observe(nativeTable,{
  subtree:true,childList:true,characterData:true
 });
 const output=document.getElementById("result");
 if(output)new MutationObserver(scheduleRender).observe(output,{
  subtree:true,childList:true,characterData:true
 });
 // Si l'utilisateur quitte la donne, refermer un tableau potentiellement
 // obsolète, même si le solveur précédent termine en retard.
 document.getElementById("bridge-newphoto")?.addEventListener("click",close);
 document.getElementById("bridge-change-contract")?.addEventListener("click",close);
}
root.BridgeDDMatrix={strains,seatDefs,describe,readExistingResults};
if(typeof module==="object"&&module.exports)module.exports=root.BridgeDDMatrix;
if(typeof document!=="undefined"){
 if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
}
})(typeof globalThis!=="undefined"?globalThis:this);
