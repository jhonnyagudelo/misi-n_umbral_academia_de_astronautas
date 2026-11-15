import Localized from './Localized';
import {memo} from 'react';

// Original cutaway inspired by the supplied composition, not a certified NASA vehicle.
export default memo(function HabitatBackdrop(){
  return <Localized><svg className="habitat-drawing" viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="habitat-metal"><stop stopColor="#a7b5ba"/><stop offset=".17" stopColor="#edf1e6"/><stop offset=".74" stopColor="#d2d5ce"/><stop offset="1" stopColor="#6a7d8d"/></linearGradient><clipPath id="habitat-hull"><path d="M280 10h440l160 177v525q0 65-135 70H255q-135-5-135-70V187z"/></clipPath><pattern id="habitat-rungs" width="30" height="16" patternUnits="userSpaceOnUse"><path d="M2 0v16m26-16v16M2 8h26" fill="none" stroke="#d3d7ca" strokeWidth="3"/></pattern></defs>
    <path d="m235 760-35 40h90l15-40m390 0 15 40h90l-35-40" fill="#65717d" stroke="#293241" strokeWidth="8"/>
    <path d="M280 10h440l160 177v525q0 65-135 70H255q-135-5-135-70V187z" fill="url(#habitat-metal)" stroke="#26394c" strokeWidth="9"/>
    <g clipPath="url(#habitat-hull)">
      <path d="M170 25h660v170H170z" fill="#96aeb5"/><path d="M150 205h700v184H150z" fill="#b4a885"/><path d="M150 402h700v184H150z" fill="#85b9c0"/><path d="M150 599h700v190H150z" fill="#d9a0bd"/>
      <g fill="#263e50" stroke="#c5d4ce" strokeWidth="5"><path d="M240 60h190v65H240zM570 60h190v65H570z"/><path d="M210 445h120v85H210zm460 0h120v85H670z"/></g>
      <g fill="#72d7cf"><path d="M255 78h30v27h-30zm42 0h30v27h-30zm42 0h30v27h-30zm42 0h30v27h-30zM585 78h30v27h-30zm42 0h30v27h-30zm42 0h30v27h-30zm42 0h30v27h-30z"/></g>
      <path d="M210 145h235l-15 30H210zm345 0h235v30H570z" fill="#d5d9cd" stroke="#4c6476" strokeWidth="5"/>
      <g stroke="#52657a" strokeWidth="5"><path d="M240 255h110v110H240z" fill="#d2b855"/><path d="M258 243h74v12h-74z" fill="#748492"/><path d="m290 274-19 35h20l-9 28 34-43h-22l10-20" fill="#43596b" stroke="none"/>
        <path d="M650 258h60v105h-60zm75 0h60v105h-60z" fill="#637b8f"/><path d="M665 275h30v67h-30zm75 0h30v67h-30z" fill="#b3d2c5" stroke="none"/>
        <path d="M240 443q50-30 100 0v107q-50 30-100 0z" fill="#bdedf0"/><path d="M240 504q50-17 100 0v46q-50 22-100 0z" fill="#6fb3d2" stroke="none"/>
        <path d="M665 440q35-25 70 0v115q-35 20-70 0zM752 440q25-25 50 0v115q-25 20-50 0z" fill="#c6dfda"/>
        <path d="M384 428h28v131h-28zm-10 122h49v15h-49z" fill="#ceaf72"/>
      </g>
      <g fill="none" strokeWidth="8"><path d="M390 230v-13h70v170h-230" stroke="#c3815b"/><path d="M620 228v-11h-85v170h220" stroke="#648d99"/><path d="M210 422v-15h220v158h-40" stroke="#d0e4d3"/><path d="M790 420v-13h-220v158h70" stroke="#b3a0b9"/></g>
      <g fill="#786c8a" stroke="#e2c7d6" strokeWidth="4"><path d="M200 637h235v130H200zm365 0h235v130H565z"/></g>
      <g fill="none" stroke="#d7c3c7" strokeWidth="5"><path d="M205 674h225m-225 44h225m140-44h225m-225 44h225"/></g>
      {[0,1,2].flatMap(row=>[0,1,2,3].map(col=><g key={`${row}-${col}`} transform={`translate(${230+col*56},${652+row*44})`}><path d="M-10 7H10l-2 10H-8z" fill="#9d765a"/><path d="M0 8q-25-20-10-19L0 0q20-25 15-7z" fill={row===1?'#9bbd6f':'#639c69'}/></g>))}
      {[0,1,2].flatMap(row=>[0,1,2].map(col=><g key={`${row}-${col}`} transform={`translate(${610+col*65},${652+row*44})`}><path d="M-14 7h28l-4 10h-20z" fill="#96785e"/><path d="M0 6q-24-16-18-18L0-1q28-24 18-8z" fill="#729f75"/></g>))}
      <path d="M180 193h640v13H180zm-30 195h700v15H150zm0 198h700v14H150z" fill="#5a6c7e"/>
      <path d="M474 112h52v660h-52z" fill="#374756" stroke="#7a8b96" strokeWidth="5"/><path d="M485 115h30v650h-30z" fill="url(#habitat-rungs)"/>
      <path d="M136 195v570M864 195v570" stroke="#e3e2ce" strokeWidth="12"/>
    </g>
    <path d="M310 13h380l25 24H285z" fill="#becdce" stroke="#26394c" strokeWidth="7"/>
    <g fill="none" stroke="#b9c9c8" strokeWidth="6"><path d="M825 82q60 15 40 75l-40-30z" fill="#d8dbca"/><path d="m824 82 28 41m-27 4 27-4 14 34m-14-34 14-17"/></g>
  </svg></Localized>;
});
