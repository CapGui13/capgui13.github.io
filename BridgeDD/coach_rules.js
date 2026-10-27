/* DDS projected trick counts are always from declarer's side. */
(function(root) {
  "use strict";
  function sameSide(a,b) {
    return (a==="north"||a==="south")===(b==="north"||b==="south");
  }
  function evaluateChoice(map,card,seat,declarer,absoluteSideTricks=false) {
    if(!map || !Object.prototype.hasOwnProperty.call(map,card))return null;
    const vals=Object.values(map).filter(Number.isFinite);
    if(!vals.length)return null;
    const max=absoluteSideTricks||sameSide(seat,declarer);
    const best=max?Math.max(...vals):Math.min(...vals);
    const value=map[card];
    if(!Number.isFinite(value))return null;
    const loss=Math.max(0,Math.abs(best-value));
    return {loss,value,best,optimal:loss===0,
      alternatives:Object.keys(map).filter(k=>map[k]===best)};
  }
  root.BridgeCoachRules={sameSide,evaluateChoice};
  if(typeof module==="object"&&module.exports)module.exports=root.BridgeCoachRules;
})(typeof globalThis!=="undefined"?globalThis:this);
