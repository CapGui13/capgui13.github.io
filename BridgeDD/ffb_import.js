/* Import photo FFB de Bridge DD.
   Reconnaissance Tesseract WASM locale, toujours avec validation humaine. */
(function(){
"use strict";
const P=window.BridgeFFB;
if(!P)return;
const symbols={S:"♠",H:"♥",D:"♦",C:"♣"};
const seatNames={north:"Nord",east:"Est",south:"Sud",west:"Ouest"};
const seatOrder=["north","west","east","south"];
const suitOrder=["S","H","D","C"];
let hands=P.empty(), busy=false, imageUrl=null;
const $=id=>document.getElementById(id);
function setStatus(message){$("ffb-status").textContent=message;}
function setBusy(value){
 busy=value;$("ffb-file").disabled=value;
 $("ffb-select").disabled=value;
 $("ffb-apply").disabled=value||!P.validate(hands).complete;
}
function closeDialog(){
 if(busy)return;
 $("ffb-dialog").hidden=true;
 if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=null;}
}
function showDialog(){
 $("ffb-dialog").hidden=false;
 $("ffb-close").focus();
}
function repaintForm(){
 const area=$("ffb-hands");
 area.replaceChildren();
 for(const seat of seatOrder){
  const box=document.createElement("fieldset");
  box.className="ffb-seat";
  const legend=document.createElement("legend");
  legend.textContent=seatNames[seat];box.append(legend);
  for(const suit of suitOrder){
   const label=document.createElement("label");
   label.className="ffb-suit-row";
   const glyph=document.createElement("span");
   glyph.className="ffb-glyph "+(suit==="D"||suit==="H"?"red":"");
   glyph.textContent=symbols[suit];
   const input=document.createElement("input");
   input.type="text";input.autocapitalize="characters";
   input.spellcheck=false;input.autocomplete="off";
   input.inputMode="text";input.dataset.seat=seat;input.dataset.suit=suit;
   input.value=P.toFrench(hands[seat][suit]).replace(/ /g,"");
   input.setAttribute("aria-label",seatNames[seat]+" "+symbols[suit]);
   input.addEventListener("input",()=>{
    hands[seat][suit]=P.normalize(input.value).value;
    updateValidation();
   });
   label.append(glyph,input);box.append(label);
  }
  area.append(box);
 }
 updateValidation();
}
function updateValidation(){
 const v=P.validate(hands);
 const results=$("ffb-validation");
 const seats=seatOrder.map(seat=>seatNames[seat]+" "+v.counts[seat]+"/13").join(" · ");
 let issues="";
 if(v.duplicates.length)issues+=" Doublons : "+v.duplicates.map(x=>cardFr(x.slice(0,2))).join(", ")+".";
 if(v.unknown.length)issues+=" Caractères inconnus à corriger.";
 if(v.missing.length)issues+=" Manquantes : "+v.missing.length+".";
 results.textContent=(v.complete?"✓ Donne valide : 52 cartes distinctes. ":"À corriger : ")+seats+"."+issues;
 results.className=v.complete?"ffb-validation good":"ffb-validation warn";
 $("ffb-apply").disabled=busy||!v.complete;
 const incomplete=Object.keys(v.counts).filter(seat=>v.counts[seat]===12);
 const canFix=v.total===51&&v.missing.length===1&&
  !v.duplicates.length&&!v.unknown.length&&incomplete.length===1&&
  Object.values(v.counts).every(n=>n===12||n===13);
 const hint=$("ffb-complete");
 hint.hidden=!canFix;
 if(canFix){
  const seat=incomplete[0],card=v.missing[0];
  hint.textContent="Proposer "+cardFr(card)+" à "+seatNames[seat];
  hint.onclick=()=>{
   const target=hands[seat][card[0]];
   if(!target.includes(card[1]))hands[seat][card[0]]=target+card[1];
   repaintForm();
   setStatus("Carte complétée d'après les 51 autres. Vérifie le diagramme.");
  };
 }
}
function cardFr(card){
 const names={K:"R",Q:"D",J:"V",T:"10"};
 return (names[card?.[1]]||card?.[1]||"?")+(symbols[card?.[0]]||"");
}
async function loadImage(file) {
 return new Promise((resolve,reject)=>{
  const img=new Image(),url=URL.createObjectURL(file);
  img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Impossible de lire cette image."));};
  img.src=url;
 });
}
function baseCanvas(image){
 const maxWidth=1000,ratio=Math.min(1,maxWidth/image.naturalWidth);
 const canvas=document.createElement("canvas");
 canvas.width=Math.round(image.naturalWidth*ratio);
 canvas.height=Math.round(image.naturalHeight*ratio);
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 if(!ctx)throw new Error("Canvas indisponible sur cet appareil.");
 ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(image,0,0,canvas.width,canvas.height);
 return canvas;
}
function cropCanvas(image,rect) {
 if(!rect.w||!rect.h)throw new Error("Cadrage des cartes invalide.");
 const scale=3,canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(rect.w*scale));
 canvas.height=Math.max(1,Math.round(rect.h*scale));
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
 ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,canvas.width,canvas.height);
 return canvas;
}
function addScript(){
 if(window.Tesseract)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src=new URL("ocr/tesseract.min.js",document.baseURI).href;
  script.onload=resolve;script.onerror=()=>reject(new Error("Chargement du moteur OCR impossible."));
  document.head.appendChild(script);
 });
}
function workerPath(part){
 return new URL("ocr/"+part,document.baseURI).href.replace(/\/$/,"");
}
async function readFFB(source,headers){
 setStatus("Initialisation de la reconnaissance (premier chargement parfois long)…");
 await addScript();
 if(!window.Tesseract)throw new Error("Moteur de reconnaissance non disponible.");
 let worker=null;
 const newHands=P.empty();
 try {
  worker=await window.Tesseract.createWorker("eng",1,{
   workerPath:workerPath("worker.min.js"),
   corePath:workerPath("core"),
   langPath:workerPath("lang"),
   workerBlobURL:false,
   logger:msg=>{
    if(msg.status==="loading language traineddata"){
      setStatus("Chargement du dictionnaire de reconnaissance…");
    }
   }
  });
  await worker.setParameters({
   tessedit_char_whitelist:"ARDVJQKT0123456789",
   tessedit_pageseg_mode:"7",
   preserve_interword_spaces:"1"
  });
  let done=0;
  for(const header of headers){
   for(let row=0;row<4;row++){
    done++;
    setStatus("Lecture des cartes… "+done+"/16");
    const rect=P.cropForRow(header,row,source.width,source.height);
    const cropped=cropCanvas(source,rect);
    const result=await worker.recognize(cropped);
    const parsed=P.normalize(result.data.text,true);
    // Ne pas inventer une valeur : la vérification finale est obligatoire.
    newHands[header.seat][suitOrder[row]]=parsed.value;
   }
  }
 } finally {if(worker)await worker.terminate();}
 return newHands;
}
async function handleFile(file) {
 if(!file||busy)return;
 setBusy(true);showDialog();
 setStatus("Analyse du screenshot FFB…");
 try {
  if(!file.type.startsWith("image/"))throw new Error("Choisis une image depuis Photos.");
  const image=await loadImage(file);
  const canvas=baseCanvas(image),ctx=canvas.getContext("2d",{willReadFrequently:true});
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  const headers=P.detectGreenHeaders(pixels);
  if(headers.length!==4){
   throw new Error("Les quatre bandeaux verts FFB n'ont pas été trouvés. Essaie une capture complète de la donne, comme ton exemple.");
  }
  if(imageUrl)URL.revokeObjectURL(imageUrl);
  imageUrl=URL.createObjectURL(file);
  $("ffb-preview-image").src=imageUrl;
  $("ffb-image-details").hidden=false;
  hands=await readFFB(canvas,headers);
  repaintForm();
  setStatus("Reconnaissance terminée. Corrige les éventuelles erreurs avant de charger la donne.");
 }catch(err){
  setStatus("Reconnaissance impossible : "+(err?.message||"erreur inconnue")+". Tu peux choisir une autre capture.");
 }finally{
  setBusy(false);updateValidation();
 }
}
function applyDeal(){
 const v=P.validate(hands);
 if(!v.complete||busy)return;
 if(typeof window.fillFormWithTestData!=="function"){
  setStatus("Le moteur de jeu n'est pas encore prêt.");return;
 }
 const deal=["north","east","south","west"].map(seat=>
  suitOrder.map(suit=>P.normalize(hands[seat][suit]).value).join("."));
 window.fillFormWithTestData(deal);
 closeDialog();
 $("ffb-file").value="";
 const state=$("coach-verdict");
 if(state){state.className="coach-verdict good";state.textContent="Donne FFB importée : 52 cartes validées. Choisis un contrat puis joue !";}
 document.querySelector(".grid-outer")?.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function init(){
 const input=document.createElement("input");
 input.type="file";input.accept="image/*";input.id="ffb-file";input.hidden=true;
 const button=document.createElement("button");
 button.type="button";button.id="ffb-select";button.textContent="📷 FFB";
 button.title="Importer une capture d'écran FFB";
 button.onclick=()=>{if(!busy){input.value="";input.click();}};
 const after=$("sample-deals");
 if(after)after.after(button,input);else document.body.append(button,input);
 const modal=document.createElement("section");
 modal.id="ffb-dialog";modal.hidden=true;
 modal.innerHTML=`<div class="ffb-scrim"></div>
 <div class="ffb-sheet" role="dialog" aria-modal="true" aria-labelledby="ffb-title">
  <div class="ffb-head"><strong id="ffb-title">Importer une capture FFB</strong>
   <button type="button" id="ffb-close">Fermer</button></div>
  <p id="ffb-status" role="status">Sélectionne une capture d'écran FFB.</p>
  <details id="ffb-image-details" hidden><summary>Voir la capture</summary>
   <img alt="Capture d'écran sélectionnée" id="ffb-preview-image"></details>
  <div id="ffb-hands" class="ffb-hands"></div>
  <p id="ffb-validation" class="ffb-validation"></p>
  <div class="ffb-buttons">
    <button type="button" id="ffb-complete" hidden></button>
    <button type="button" id="ffb-apply" disabled>Charger la donne</button>
  </div>
  <p class="ffb-privacy">Reconnaissance sur l'iPhone : aucune image envoyée à un serveur. Vérifie toujours les 52 cartes.</p>
 </div>`;
 document.body.appendChild(modal);
 $("ffb-close").addEventListener("click",closeDialog);
 input.addEventListener("change",()=>handleFile(input.files?.[0]));
 $("ffb-apply").addEventListener("click",applyDeal);
 repaintForm();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
