// Offline audit algebra only. Never imported by the production calculator.
// See bearmaxxing-calculation-review/REPORT.md: this requires independently
// identified ordinary/special layers and matching report controls, not merely
// six merged percentages. No neutral special factor is assumed.
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function reconcileReportStat({reportedPp,knownOrdinaryPp,specialFactor,contextVerified,layerVerified}){
 if(!contextVerified||!layerVerified||!finite(reportedPp)||!finite(knownOrdinaryPp)||!finite(specialFactor)||specialFactor<=0)throw new Error('Matched report context and identified stat layers required');
 const baseline=(1+reportedPp/100)/specialFactor-1-knownOrdinaryPp/100;
 if(baseline<-1e-9)throw new Error('Incompatible report components or double counting');
 return {ordinaryBaselinePp:100*Math.max(0,baseline),scope:'Conditional reconciliation algebra; not a verified Kingshot formula'};
}
