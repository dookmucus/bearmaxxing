import {test} from 'node:test';import assert from 'node:assert/strict';
import {tooltipPosition} from '../src/tooltip-position.mjs';
test('tooltips remain within phone and desktop viewports at either edge',()=>{
 for(const width of [375,390,430,1440])for(const left of [0,70,width-16]){
  const position=tooltipPosition({left,top:300,bottom:316},140,width,812);
  assert.ok(position.left>=16);assert.ok(position.left+position.width<=width-16);
  assert.ok(position.top>=16);assert.ok(position.top+140<=796);
 }
});
test('bottom-edge tooltips open above their trigger; long tooltips scroll within the viewport',()=>{
 const bottom=tooltipPosition({left:350,top:770,bottom:786},140,375,812);
 assert.ok(bottom.top+140<770);
 const long=tooltipPosition({left:0,top:700,bottom:716},2000,375,812);
 assert.equal(long.top,16);assert.equal(long.maxHeight,780);assert.equal(long.overflowY,'auto');
});
