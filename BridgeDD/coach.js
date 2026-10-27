/* Bridge DD: training experience above the upstream DDS Web card engine. */
(function() {
  "use strict";
  const $=id=>document.getElementById(id);
  const seats={north:"Nord",south:"Sud",east:"Est",west:"Ouest"};
  const suits={S:"♠",H:"♥",D:"♦",C:"♣",N:"SA"};
  const honors={A:"A",K:"R",Q:"D",J:"V",T:"10"};
  const cardName=key=>(honors[key?.[1]]||key?.[1]||"")+(suits[key?.[0]]||"");
  const history=[];
  let stage="photo";
  const setStage=next=>{
    stage=next;
    document.body.classList.add("bridge-wizard");
    document.body.dataset.bridgeStage=next;
    for(const name of ["photo","contract","play"]){
      const el=$("bridge-step-"+name);
      if(el)el.hidden=name!==next;
    }
  };
  const contractText=()=>{
    const value=$("coach-level").value;
    const strain=$("coach-strain").value;
    return value+(suits[strain]||strain)+" · "+(seats[$("coach-seat").value]||"");
  };

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
    // Le pli central est rendu séparément par DDS et ne partage pas le
    // data-card des mains. On traduit uniquement le dernier nœud texte.
    document.querySelectorAll("#trick-status .trick-card").forEach(card=>{
      const last=card.lastChild;
      if(last?.nodeType!==3)return;
      const translated=names[last.nodeValue?.trim()]||null;
      if(translated&&last.nodeValue!==translated)last.nodeValue=translated;
    });
  }
  function localizePlayControls(){
    const change=$("edit-hands");
    if(change&&change.textContent!=="Modifier la donne")change.textContent="Modifier la donne";
    const hint=$("play-hint");
    const french="Vert : carte optimale. Noir : autre carte jouable. Les cartes déjà jouées restent grisées.";
    if(hint&&hint.textContent!==french)hint.textContent=french;
    const status=$("trick-status");
    if(status)status.setAttribute("aria-label","Pli en cours");
  }
  // Mark only currently legal plays, and only after DDS has returned
  // its live per-card solution. Non-playable cards are never scored.
  function paintOptimalCards(state){
    const active=!!state;
    const diffs=active?state.pendingDiffs:null;
    let graded=0,good=0;
    for(const el of document.querySelectorAll(".hand-card[data-card]")){
      el.classList.remove("bridge-optimal","bridge-nonoptimal");
      el.removeAttribute("data-dd-evaluation");
      if(!diffs||!el.classList.contains("hand-card-playable"))continue;
      const key=el.dataset.card,seat=el.dataset.direction;
      if(!Object.prototype.hasOwnProperty.call(diffs,key))continue;
      // DDS scores are projected from the declarer's side for full deals:
      // declaring side maximizes; defending side minimizes.
      const evaluation=window.BridgeCoachRules?.evaluateChoice(
        diffs,key,seat,state.declarer,!!state.absoluteSideTricks);
      if(!evaluation)continue;
      const optimal=evaluation.optimal;
      el.classList.add(optimal?"bridge-optimal":"bridge-nonoptimal");
      el.dataset.ddEvaluation=optimal?"optimal":"nonoptimal";
      el.setAttribute("aria-label",
        "Carte "+cardName(key)+" ("+(seats[seat]||seat)+") : "+
        (optimal?"optimale":"non optimale, "+evaluation.loss+
          " levée"+(evaluation.loss>1?"s":"")+" perdue"+(evaluation.loss>1?"s":"")));
      graded++;
      if(optimal)good++;
    }
    const legend=$("coach-color-legend");
    if(legend){
      legend.hidden=!active;
      const pending=$("coach-color-progress");
      if(pending)pending.textContent=graded
        ? (good+" carte"+(good>1?"s":"")+" optimale"+(good>1?"s":""))
        : "Calcul DDS en cours…";
    }
  }
  function verdict(text,kind="neutral"){
    const el=$("coach-verdict");
    if(!el)return;
    el.className="coach-verdict "+kind;el.textContent=text;
  }
  function update() {
    localizePlayControls();
    const state=window.playState;
    document.body.classList.add("coach-analysis");
    $("coach-undo").disabled=!state||!state.history.length;
    const count=state&&window.playDealCardCount?window.playDealCardCount(state):52;
    $("coach-step").textContent=state
      ? (state.history.length>=count?"Donne terminée":("Carte "+(state.history.length+1)+" sur "+count))
      :"Charge une donne puis choisis ton contrat.";
    $("coach-progress").textContent=history.length
      ? "Coups analysés : "+history.length+" · Optimaux : "+history.filter(v=>v.loss===0).length
      :"Le verdict apparaîtra après chaque carte.";
    paintOptimalCards(state);
    // Les cartes jouables restent toujours évaluées : mode analyse unique.
  }
  function refresh(){if(window.isPlayMode?.())window.renderPlayUi();else update();}
  function intercept(){
    if(typeof window.startPlay!=="function"||typeof window.tryPlayCard!=="function"||typeof window.undoPlay!=="function"){
      verdict("Le module DDS n'a pas pu être initialisé.","bad");return;
    }
    const start=window.startPlay,play=window.tryPlayCard,undo=window.undoPlay,exit=window.exitPlay,render=window.renderPlayUi;
    // Le rendu DDS cache normalement les cartes jouées. Le résoudre sans
    // toucher au solveur : afficher les mains initiales au complet, et griser
    // uniquement les cartes figurant dans l'historique de la donne.
    const renderHands=window.updateHandCardDisplays;
    if(typeof renderHands==="function"){
      window.updateHandCardDisplays=function(hands){
        const state=window.playState;
        const active=!!state&&Array.isArray(state.history)&&state.hands;
        const result=renderHands(active?state.hands:hands);
        if(active){
          const played=new Set(state.history.map(p=>p.seat+":"+p.key));
          for(const button of document.querySelectorAll(".hand-card[data-card]")){
            const key=button.dataset.direction+":"+button.dataset.card;
            const used=played.has(key);
            button.classList.toggle("bridge-played",used);
            if(used){
              button.disabled=true;
              button.setAttribute("aria-label","Carte déjà jouée : "+cardName(button.dataset.card));
            }
          }
          // Espacement constant, indépendant de la longueur des couleurs :
          // la taille des caractères s'ajuste dans classic.js, pas le gap.
        }
        return result;
      };
    }
    window.startPlay=function(...args) {
      const success=start(...args);
      if(success){
        history.length=0;window.playState.autoPlay=false;
        verdict("Analyse DDS : les meilleures cartes apparaissent en vert.","neutral");
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
    div.innerHTML=`<div class="coach-title"><strong>♠ <span>Bridge DD</span> ♥</strong><small>Analyse double dummy</small></div>
    <section id="bridge-step-photo" class="bridge-wizard-step">
      <h2>Importer une donne</h2>
      <p>Choisis une capture du diagramme FFB depuis ton téléphone ou ton ordinateur.</p>
      <button id="bridge-upload" type="button" class="coach-primary">📷 Choisir une image</button>
      <p id="bridge-photo-error" class="bridge-error" hidden role="alert"></p>
      <p class="bridge-wizard-note">Les 52 cartes sont reconnues automatiquement. Tu pourras corriger une erreur si nécessaire.</p>
    </section>
    <section id="bridge-step-contract" class="bridge-wizard-step" hidden>
      <h2>Quel contrat a été joué ?</h2>
      <p class="bridge-confirmed">✓ Donne reconnue : 52 cartes.</p>
      <div class="coach-fields" id="bridge-contract-fields">
        <label>Niveau<select id="coach-level"><option>1</option><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option><option>7</option></select></label>
        <label>Couleur<select id="coach-strain"><option value="S">♠</option><option value="H">♥</option><option value="D">♦</option><option value="C">♣</option><option value="N">SA</option></select></label>
        <label>Déclarant<select id="coach-seat"><option value="north">Nord</option><option value="east">Est</option><option value="south" selected>Sud</option><option value="west">Ouest</option></select></label>
      </div>
      <button id="coach-start" type="button" class="coach-primary">▶ Jouer et analyser</button>
      <button id="bridge-contract-newphoto" type="button" class="bridge-secondary">Choisir une autre image</button>
      <p id="bridge-contract-error" class="bridge-error" hidden role="alert"></p>
    </section>
    <section id="bridge-step-play" class="bridge-play-step" hidden>
      <div class="bridge-playing-top">
        <strong id="bridge-playing-contract">Contrat en cours</strong>
        <div class="bridge-playing-buttons">
          <button id="bridge-dd-open" type="button" aria-haspopup="dialog" aria-controls="bridge-dd-panel">Double dummy</button>
          <button id="bridge-newphoto" type="button">Nouvelle donne</button>
          <button id="bridge-change-contract" type="button">Changer contrat</button>
          <button id="coach-undo" type="button" disabled>↶ Annuler</button>
        </div>
      </div>
      <div id="coach-color-legend" class="coach-color-legend" hidden aria-live="polite">
        <span class="bridge-key-green">Vert : optimal</span>
        <span class="bridge-key-black">Noir : non optimal</span>
        <span id="coach-color-progress"></span>
      </div>
      <p id="coach-step" class="coach-hint"></p>
      <div id="coach-verdict" class="coach-verdict neutral" aria-live="polite">Calcul du meilleur jeu…</div>
      <p id="coach-progress" class="coach-hint"></p>
    </section>`;
    document.body.insertBefore(div,document.body.firstChild);
    const newPhoto=()=>{
      if(window.isPlayMode?.())window.exitPlay();
      setStage("photo");
      update();
    };
    $("bridge-upload").addEventListener("click",()=>{
      // Un seul clic programmatique sur l'input, pendant le geste utilisateur :
      // compatible avec les restrictions de Safari iPhone pour Photos.
      const input=$("ffb-file");
      if(input&&!input.disabled){
        input.value="";
        input.click();
      }else{
        const error=$("bridge-photo-error");
        error.textContent="L'import d'image n'est pas encore disponible. Recharge la page.";
        error.hidden=false;
      }
    });
    $("bridge-contract-newphoto").addEventListener("click",newPhoto);
    $("bridge-newphoto").addEventListener("click",newPhoto);
    $("bridge-change-contract").addEventListener("click",()=>{
      if(window.isPlayMode?.())window.exitPlay();
      setStage("contract");
      update();
    });
    window.addEventListener("bridge:deal-imported",()=>{
      if(window.isPlayMode?.())window.exitPlay();
      $("bridge-contract-error").hidden=true;
      setStage("contract");
      update();
    });
    $("coach-start").addEventListener("click",()=>{
      const seat=$("coach-seat").value,strain=$("coach-strain").value;
      const target=Number($("coach-level").value)+6;
      if(window.isPlayMode?.())window.exitPlay();
      const ok=window.startPlay(seat,strain,target);
      if(!ok){
        const error=$("bridge-contract-error");
        error.textContent="Impossible de démarrer : la donne doit comporter 52 cartes valides.";
        error.hidden=false;
        return;
      }
      const error=$("bridge-contract-error");
      error.hidden=true;
      $("bridge-playing-contract").textContent=contractText();
      setStage("play");
      window.playState.autoPlay=false;
      window.scheduleDealSolve();
      refresh();
    });
    $("coach-undo").addEventListener("click",()=>window.undoPlay());
    for(const btn of document.querySelectorAll("body>button")){
      const translation={"Clear entries":"Effacer","Import deal…":"Importer","Rotate the hands clockwise":"Tourner"};
      if(translation[btn.textContent.trim()])btn.textContent=translation[btn.textContent.trim()];
    }
    translateSamplePlaceholder();
    window.addEventListener("load",translateSamplePlaceholder,{once:true});
    const playhint=$("play-hint");if(playhint)playhint.textContent="Touche une carte jouable. Son verdict apparaît après le coup. Retour arrière avec « Annuler ».";
    setStage("photo");
    intercept();localizePlayControls();update();
    const grid=document.querySelector(".grid-outer");
    if(grid)new MutationObserver(translateHonors).observe(grid,{childList:true,subtree:true});
    translateHonors();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
