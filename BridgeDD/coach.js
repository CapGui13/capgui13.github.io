/* Bridge DD: training experience above the upstream DDS Web card engine. */
(function() {
  "use strict";
  const $=id=>document.getElementById(id);
  const seats={north:"Nord",south:"Sud",east:"Est",west:"Ouest"};
  const suits={S:"♠",H:"♥",D:"♦",C:"♣",N:"SA"};
  const honors={A:"A",K:"R",Q:"D",J:"V",T:"10"};
  const cardName=key=>(honors[key?.[1]]||key?.[1]||"")+(suits[key?.[0]]||"");
  let mode="training",reveal=false;
  const history=[];

  // Traduction visuelle des figures seulement : DDS conserve ses codes K/Q/J/T.
  function translateSamplePlaceholder(){
    const option=$("sample-deals")?.querySelector("option[disabled]");
    if(option&&option.textContent!=="Donnes…")option.textContent="Donnes…";
  }
  function translateHonors(){
    const names={K:"R",Q:"D",J:"V",T:"10"};
    document.querySelectorAll(".hand-card[data-card]").forEach(button=>{
      const pip=button.dataset.card?.charAt(1);
      const name=names[pip];
      if(name&&button.firstChild?.nodeType===3&&button.firstChild.nodeValue!==name){
        button.firstChild.nodeValue=name;
      }
    });
  }
  function verdict(text,kind="neutral"){
    const el=$("coach-verdict");
    if(!el)return;
    el.className="coach-verdict "+kind;el.textContent=text;
  }
  function update() {
    const state=window.playState;
    document.body.classList.toggle("coach-training",mode==="training"&&!reveal);
    document.body.classList.toggle("coach-analysis",mode==="analysis"||reveal);
    $("coach-mode").textContent=mode==="training"?"Mode entraînement":"Mode analyse";
    $("coach-reveal").textContent=reveal?"Masquer les indices":"Voir les indices";
    $("coach-reveal").disabled=mode==="analysis"||!state;
    $("coach-undo").disabled=!state||!state.history.length;
    $("coach-start").textContent=state?"↻ Rejouer":"▶ Jouer";
    const count=state&&window.playDealCardCount?window.playDealCardCount(state):52;
    $("coach-step").textContent=state
      ? (state.history.length>=count?"Donne terminée":("Carte "+(state.history.length+1)+" sur "+count))
      :"Charge une donne puis choisis ton contrat.";
    $("coach-progress").textContent=history.length
      ? "Coups analysés : "+history.length+" · Optimaux : "+history.filter(v=>v.loss===0).length
      :"Le verdict apparaîtra après chaque carte.";
    // Never leak the forthcoming solution to screen readers in training mode.
    if(mode==="training"&&!reveal){
      document.querySelectorAll(".hand-card[data-card]").forEach(el=>{
        el.setAttribute("aria-label","Carte "+cardName(el.dataset.card)+" ("+(seats[el.dataset.direction]||"")+")");
      });
    }
  }
  function refresh(){if(window.isPlayMode?.())window.renderPlayUi();else update();}
  function intercept(){
    if(typeof window.startPlay!=="function"||typeof window.tryPlayCard!=="function"||typeof window.undoPlay!=="function"){
      verdict("Le module DDS n'a pas pu être initialisé.","bad");return;
    }
    const start=window.startPlay,play=window.tryPlayCard,undo=window.undoPlay,exit=window.exitPlay,render=window.renderPlayUi;
    window.startPlay=function(...args) {
      const success=start(...args);
      if(success){
        history.length=0;reveal=false;window.playState.autoPlay=false;
        verdict("À toi ! Joue une carte. Les meilleures réponses sont cachées.","neutral");
        update();
      }
      return success;
    };
    window.tryPlayCard=function(seat,card,auto){
      const state=window.playState;
      const key=String(card).toUpperCase();
      const result=(!auto&&state&&state.pendingDiffs)
        ?window.BridgeCoachRules.evaluateChoice({...state.pendingDiffs},key,seat,state.declarer):null;
      const ok=play(seat,card,auto);
      if(!ok)return false;
      if(window.playState)window.playState.autoPlay=false;
      if(!auto){
        if(result){
          history.push({seat,key,...result});
          if(result.optimal)verdict(seats[seat]+" joue "+cardName(key)+" : jeu optimal ✓ (aucune levée perdue).","good");
          else verdict(seats[seat]+" joue "+cardName(key)+" : "+result.loss+" levée"+(result.loss>1?"s":"")+" perdue"+(result.loss>1?"s":"")+" en double dummy. Meilleur choix : "+result.alternatives.map(cardName).join(", ")+".","bad");
        } else verdict("Carte jouée, mais l'évaluation DDS n'est pas disponible.","neutral");
        reveal=false;
      }
      update();return true;
    };
    window.undoPlay=function(){
      const before=window.playState?.history.filter(p=>!p.auto).length||0;
      undo();
      const after=window.playState?.history.filter(p=>!p.auto).length||0;
      for(let i=after;i<before;i++)history.pop();
      verdict("Coup annulé : essaie un autre maniement.");update();
    };
    window.exitPlay=function(...args){
      const v=exit(...args);history.length=0;
      verdict("Choisis une donne et un contrat.");update();return v;
    };
    window.renderPlayUi=function(...args){const v=render(...args);update();return v;};
  }
  function init(){
    const div=document.createElement("section");
    div.id="coach-toolbar";
    div.innerHTML=`<div class="coach-title"><strong>♠ <span>Bridge DD</span> ♥</strong><small>Entraînement double dummy · iPhone</small></div>
    <div class="coach-fields">
      <label>Déclarant<select id="coach-seat"><option value="south">Sud</option><option value="north">Nord</option><option value="east">Est</option><option value="west">Ouest</option></select></label>
      <label>Niveau<select id="coach-level"><option>1</option><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option><option>7</option></select></label>
      <label>Contrat<select id="coach-strain"><option value="S">♠</option><option value="H">♥</option><option value="D">♦</option><option value="C">♣</option><option value="N">SA</option></select></label>
      <button id="coach-start" type="button" class="coach-primary">▶ Jouer</button>
    </div>
    <div class="coach-actions">
      <button id="coach-mode" type="button">Mode entraînement</button>
      <button id="coach-reveal" type="button">Voir les indices</button>
      <button id="coach-undo" type="button" disabled>↶ Annuler</button>
    </div>
    <p id="coach-step" class="coach-hint">Charge une donne puis choisis ton contrat.</p>
    <div id="coach-verdict" class="coach-verdict neutral" aria-live="polite">Pour commencer : « Donne d'exemple… » ou importer un fichier PBN.</div>
    <p id="coach-progress" class="coach-hint">Le verdict apparaîtra après chaque carte.</p>
    </div>`;
    document.body.insertBefore(div,document.body.firstChild);
    $("coach-start").addEventListener("click",()=>{
      const seat=$("coach-seat").value, strain=$("coach-strain").value;
      const target=Number($("coach-level").value)+6;
      if(window.isPlayMode?.())window.exitPlay();
      const ok=window.startPlay(seat,strain,target);
      if(!ok){verdict("Saisis ou importe une donne complète et valide : 13 cartes par joueur.","bad");return;}
      window.playState.autoPlay=false;
      window.scheduleDealSolve();
      refresh();
    });
    $("coach-undo").addEventListener("click",()=>window.undoPlay());
    $("coach-mode").addEventListener("click",()=>{mode=mode==="training"?"analysis":"training";reveal=false;refresh();});
    $("coach-reveal").addEventListener("click",()=>{reveal=!reveal;refresh();});
    for(const btn of document.querySelectorAll("body>button")){
      const translation={"Clear entries":"Effacer","Import deal…":"Importer","Rotate the hands clockwise":"Tourner"};
      if(translation[btn.textContent.trim()])btn.textContent=translation[btn.textContent.trim()];
    }
    translateSamplePlaceholder();
    window.addEventListener("load",translateSamplePlaceholder,{once:true});
    const playhint=$("play-hint");if(playhint)playhint.textContent="Touche une carte jouable. Son verdict apparaît après le coup. Retour arrière avec « Annuler ».";
    intercept();update();
    const grid=document.querySelector(".grid-outer");
    if(grid)new MutationObserver(translateHonors).observe(grid,{childList:true,subtree:true});
    translateHonors();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
