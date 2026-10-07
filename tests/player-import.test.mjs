import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import handler from '../netlify/functions/player.mjs';

const routes=['/api/player/100111478','/.netlify/functions/player?id=100111478'];
const payload={player:{uid:'100111478'},heroes:[{id:1}],gov_gear:{items:[]}};

async function withProvider(fn){
 const originalFetch=global.fetch;
 const originalKey=process.env.MIGHTPULSE_API_KEY;
 const calls=[];
 process.env.MIGHTPULSE_API_KEY='test-only-import-key';
 global.fetch=async(url,options)=>{
  if(String(url).startsWith('https://api.mightpulse.com/')){
   calls.push(String(url));
   assert.equal(options.headers.Authorization,'Bearer test-only-import-key');
   return Response.json(payload);
  }
  return originalFetch(url,options);
 };
 try{await fn(calls,originalFetch);}
 finally{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.MIGHTPULSE_API_KEY;else process.env.MIGHTPULSE_API_KEY=originalKey;}
}

test('both production URL forms import exactly the requested ID',async()=>{
 await withProvider(async calls=>{
  for(const route of routes){
   const response=await handler(new Request('https://test'+route));
   assert.equal(response.status,200);
   assert.deepEqual(await response.json(),payload);
  }
  assert.deepEqual(calls,Array(2).fill('https://api.mightpulse.com/v1/players/100111478?include=base,heroes,gov_gear'));
 });
});

test('public path ID takes precedence over conflicting rewrite query',async()=>{
 await withProvider(async calls=>{
  const response=await handler(new Request('https://test/api/player/100111478?id=999999'));
  assert.equal(response.status,200);
  assert.match(calls[0],/\/100111478\?/);
 });
});

test('invalid IDs in either route never access the provider',async()=>{
 await withProvider(async calls=>{
  for(const route of ['/api/player/invalid?id=100111478','/api/player/1234','/api/player/1234567890123456','/.netlify/functions/player?id=invalid','/.netlify/functions/player?id=1234','/.netlify/functions/player?id=1234567890123456','/.netlify/functions/player']){
   const response=await handler(new Request('https://test'+route));
   assert.equal(response.status,400,route);
   assert.match((await response.json()).error,/valid numeric/);
  }
  assert.equal(calls.length,0);
 });
});

test('both valid routes report missing configuration before provider access',async()=>{
 await withProvider(async calls=>{
  delete process.env.MIGHTPULSE_API_KEY;
  for(const route of routes){
   const response=await handler(new Request('https://test'+route));
   assert.equal(response.status,503);
   assert.match((await response.json()).error,/MIGHTPULSE_API_KEY/);
  }
  assert.equal(calls.length,0);
 });
});

test('local HTTP requests verify both routes and invalid-ID responses',async()=>{
 await withProvider(async(calls,request)=>{
  const server=createServer(async(req,res)=>{
   try{
    const response=await handler(new Request('http://127.0.0.1'+req.url,{method:req.method}));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
   }catch{res.writeHead(500);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
   const origin='http://127.0.0.1:'+server.address().port;
   for(const route of routes){const response=await request(origin+route);assert.equal(response.status,200);assert.deepEqual(await response.json(),payload);}
   for(const route of ['/api/player/invalid','/.netlify/functions/player?id=invalid']){const response=await request(origin+route);assert.equal(response.status,400);}
   assert.equal((await request(origin+routes[0],{method:'POST'})).status,405);
   assert.equal(calls.length,2);
  }finally{await new Promise(resolve=>server.close(resolve));}
 });
});
