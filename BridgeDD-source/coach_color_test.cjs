const test=require("node:test"), assert=require("node:assert/strict");
const {evaluateChoice}=require("./coach_rules.js");
test("Declarer: max projected tricks green",()=>{
 const map={SA:10,SK:9,S2:10};
 assert.equal(evaluateChoice(map,"SA","south","south").optimal,true);
 assert.equal(evaluateChoice(map,"SK","south","south").loss,1);
 assert.equal(evaluateChoice(map,"S2","south","south").optimal,true);
});
test("Defender: min declarer projected tricks green",()=>{
 const map={SA:10,SK:9,S2:10};
 assert.equal(evaluateChoice(map,"SK","east","south").optimal,true);
 assert.equal(evaluateChoice(map,"SA","east","south").loss,1);
});
test("Partial position: max current side tricks green",()=>{
 const map={SA:10,SK:9};
 assert.equal(evaluateChoice(map,"SA","east","south",true).optimal,true);
 assert.equal(evaluateChoice(map,"SK","east","south",true).loss,1);
});
test("Missing card cannot be evaluated",()=>{
 assert.equal(evaluateChoice({SA:10},"SQ","south","south"),null);
});
