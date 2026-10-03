const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
export default async function handler(req){
 if(req.method!=='GET')return reply(405,{error:'Only GET requests are supported.'});
 const id=new URL(req.url).searchParams.get('id');
 if(!/^\d{5,15}$/.test(id||''))return reply(400,{error:'Enter a valid numeric Kingshot player ID (5–15 digits).'});
 const key=process.env.MIGHTPULSE_API_KEY;
 if(!key)return reply(503,{error:'Player import needs a MightPulse API key. Set MIGHTPULSE_API_KEY in Netlify, redeploy, and try again. Manual entry works without a key.'});
 try{
   const upstream=await fetch(`https://api.mightpulse.com/v1/players/${id}?include=base,heroes,gov_gear`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(20000)});
   if(!upstream.ok){const messages={401:'The provider API key is invalid.',404:'No player was found for that ID.',429:'The player lookup limit was reached. Try again later.'};return reply(upstream.status===404?404:upstream.status===429?429:502,{error:messages[upstream.status]||'The player provider is temporarily unavailable.'});}
   const data=await upstream.json();if(!data.player)return reply(502,{error:'The provider returned an unexpected response.'});
   return reply(200,{player:data.player,heroes:data.heroes,cached_at:data.cached_at,age_seconds:data.age_seconds,fresh:data.fresh});
 }catch{return reply(502,{error:'The player provider did not respond in time. Try again later or enter your details manually.'});}
}

export const config = { rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
