// QA-only native engine strategy. No manufactured won/outcome fields.
export function missionVictory(m,ship='orion'){
  let s=m.createCampaign();const act=action=>s=m.actCampaign(s,action),tick=()=>s=m.tickCampaign(s,100);
  act({type:'skip-intro'});['boots','armor','radio'].forEach((id,slot)=>act({type:'equip',id,slot}));act({type:'confirm-equipment'});act({type:'choose-ship',ship});
  ['water','food','battery','water',...(ship==='orion'?['food','water']:[])].forEach((cargo,slot)=>act({type:'cargo',cargo,slot}));act({type:'confirm-ship'});act({type:'shelter',ids:['light','supplies']});act({type:'launch'});
  for(let i=0;i<3;i++)act({type:'advance-flight'});act({type:'travel',mode:'eco'});for(let control=0;control<3;control++)act({type:'flight-control',control});act({type:'travel',mode:'eco'});act({type:'travel',mode:'eco'});act({type:'land'});
  for(const [batteryId,stationId]of[['b1','air'],['b2','water'],['b3','thermal'],['b4','lab']])act({type:'base-action',action:{type:'place-battery',batteryId,stationId}});act({type:'avatar-study'});
  function sortie(site){act({type:'excursion',site,route:'short'});for(let i=0;i<1500&&s.excursion&&s.phase==='base';i++){if(s.excursion.stage==='work'&&s.excursion.progress===0){act({type:'antenna',angle:90});act({type:'work'});}if(s.repairs[site]&&s.excursion?.stage==='work')act({type:'return-outside'});tick();}if(s.phase!=='base'||!s.repairs[site])throw Error(s.cause||'Sortie failed');}
  sortie('relay');act({type:'base-action',action:{type:'place-battery',batteryId:'b4',stationId:'comms'}});act({type:'base-action',action:{type:'set-shelter-presence',inside:true}});for(let i=0;i<1500&&s.base.solar.status!=='resolved';i++)tick();act({type:'base-action',action:{type:'set-shelter-presence',inside:false}});act({type:'base-action',action:{type:'place-battery',batteryId:'b4',stationId:'greenhouse'}});
  for(const [x,deck,wait]of[[24,2,50],[76,1,40]]){act({type:'walk',x,deck});for(let i=0;i<200&&(Math.abs(s.playerX-x)>.001||s.playerDeck!==deck);i++)tick();for(let i=0;i<wait;i++)tick();}
  act({type:'open-lab'});act({type:'confirm-equipment'});sortie('recycler');for(let i=0;i<1500&&s.phase==='base';i++)tick();if(s.phase!=='return')throw Error(s.cause||'Mission not won');return s;
}
