const test=require("node:test"),assert=require("node:assert/strict");
const M=require("./dd_matrix.js");
test("13 tricks permits 7-level contracts",()=>{
 const x=M.describe(13,M.strains[3]);
 assert.equal(x.level,7);assert.equal(x.label,"7");
 assert.match(x.aria,/Contrats de 1 à 7/);
});
test("Ten tricks permits 1 to 4 spades",()=>{
 const x=M.describe(10,M.strains[3]);
 assert.equal(x.level,4);assert.equal(x.tricks,10);
 assert.equal(x.detail,"1♠ à 4♠");
});
test("At six tricks no 1-level contract makes",()=>{
 assert.equal(M.describe(6,M.strains[0]).label,"—");
 assert.equal(M.describe(0,M.strains[0]).level,0);
});
test("Bad or incomplete DDS table is never displayed",()=>{
 assert.equal(M.describe(14,M.strains[0]),null);
 assert.equal(M.readExistingResults(null,null,()=>true),null);
});
test("Native order N E S W maps to display N S E O, all 20 values",()=>{
 const rows=[{cells:new Array(6).fill({textContent:""})}];
 for(let r=1;r<=4;r++){
  rows[r]={cells:[{textContent:""}]};
  for(let col=1;col<=5;col++)
   rows[r].cells[col]={textContent:String(6+r+((col+1)%3))};
 }
 const matrix=M.readExistingResults({rows},{},()=>true);
 assert.ok(matrix);
 assert.equal(matrix.length,4);
 assert.equal(matrix[0][0].tricks,9); // native north, col 1
 assert.equal(matrix[1][0].tricks,11); // native south, col 1
 assert.equal(matrix[2][0].tricks,10); // native east, col 1
 assert.equal(matrix[3][0].tricks,12); // native west, col 1
 assert.equal(matrix.flat().length,20);
});
