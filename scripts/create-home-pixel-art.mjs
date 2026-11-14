import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Editable, deterministic artwork. Every drawing operation lands on the source pixel grid.
const C = { ink:'#122638', sky:'#243d50', dark:'#1b3043', white:'#ecf2ed', grey:'#9aadb4', greyDark:'#637e8d', gold:'#efc157', goldDark:'#b98334', goldLight:'#ffe49a', cyan:'#66dbe8', cyanDark:'#348eaa', red:'#df5357', redDark:'#a93545', glass:'#52283b', ground:'#9aafb3', groundDark:'#6d8790', planet:'#75aaa8', planetDark:'#4b7c87', land:'#b4d2b4' };
function surface(w,h) {
  const cells=Array(w*h).fill(null);
  const dot=(x,y,color)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<w&&y<h)cells[y*w+x]=color;};
  const rect=(x,y,width,height,color)=>{for(let j=y;j<y+height;j++)for(let i=x;i<x+width;i++)dot(i,j,color);};
  const line=(x,y,xx,yy,color)=>{let dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1,e=dx+dy;for(;;){dot(x,y,color);if(x===xx&&y===yy)break;let z=2*e;if(z>=dy){e+=dy;x+=sx;}if(z<=dx){e+=dx;y+=sy;}}};
  const polygon=(points,color,stroke=C.ink)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[c,d]=points[j];if((b>y+.5)!==(d>y+.5)&&(x+.5<(c-a)*(y+.5-b)/(d-b)+a))inside=!inside;}if(inside)dot(x,y,color);}if(stroke)points.forEach((p,i)=>line(...p,...points[(i+1)%points.length],stroke));};
  const ellipse=(cx,cy,rx,ry,color,stroke)=>{for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++){const d=((x-cx)/rx)**2+((y-cy)/ry)**2;if(d<=1)dot(x,y,stroke&&((x-cx)/Math.max(1,rx-1))**2+((y-cy)/Math.max(1,ry-1))**2>1?stroke:color);}};
  return {w,h,cells,dot,rect,line,polygon,ellipse};
}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let b=0;b<8;b++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([size,t,data,crc]);}
function save(name,s){
  const root=fileURLToPath(new URL('../public/images/',import.meta.url));
  const raw=Buffer.alloc(s.h*(s.w*4+1));
  const pieces=[];
  for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const color=s.cells[y*s.w+x];if(!color)continue;const v=parseInt(color.slice(1),16),offset=y*(s.w*4+1)+1+x*4;raw[offset]=v>>16;raw[offset+1]=(v>>8)&255;raw[offset+2]=v&255;raw[offset+3]=255;}
  for(let y=0;y<s.h;y++)for(let x=0;x<s.w;){const color=s.cells[y*s.w+x];if(!color){x++;continue;}let end=x+1;while(end<s.w&&s.cells[y*s.w+end]===color)end++;pieces.push(`<rect x="${x}" y="${y}" width="${end-x}" height="1" fill="${color}"/>`);x=end;}
  const header=Buffer.alloc(13);header.writeUInt32BE(s.w);header.writeUInt32BE(s.h,4);header[8]=8;header[9]=6;
  writeFileSync(`${root}${name}.png`,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
  writeFileSync(`${root}${name}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w} ${s.h}" shape-rendering="crispEdges">\n${pieces.join('\n')}\n</svg>\n`);
  console.log(`${name}: ${s.w}x${s.h}, ${new Set(s.cells.filter(Boolean)).size} colors`);
}

const guide=surface(32,40);
guide.ellipse(16,38,12,1,C.ink);
guide.rect(6,17,7,14,C.ink);guide.rect(7,18,5,12,C.greyDark);
guide.polygon([[10,27],[15,27],[15,34],[13,36],[9,36]],C.gold);
guide.polygon([[18,27],[22,27],[24,35],[19,36],[17,31]],C.goldDark);
guide.rect(8,35,7,3,C.ink);guide.rect(9,35,6,2,C.white);guide.rect(18,35,8,3,C.ink);guide.rect(19,35,6,2,C.white);
guide.polygon([[10,17],[7,19],[4,24],[6,27],[10,25],[14,20]],C.gold);
guide.polygon([[21,17],[24,20],[27,17],[30,19],[26,25],[22,24],[18,20]],C.gold);
guide.rect(5,24,3,2,C.white);guide.rect(27,17,3,3,C.white);
guide.rect(10,16,13,14,C.ink);guide.rect(11,17,11,12,C.gold);guide.rect(20,19,2,9,C.goldDark);
guide.ellipse(16,10,10,10,C.gold,C.ink);guide.rect(12,2,7,1,C.goldLight);
guide.ellipse(16,10,8,6,C.dark,C.cyan);
guide.line(11,10,13,8,C.cyan);guide.line(13,8,14,10,C.cyan);guide.line(18,10,20,8,C.cyan);guide.line(20,8,21,10,C.cyan);
guide.rect(12,20,9,7,C.ink);guide.rect(13,21,7,5,C.white);guide.rect(14,22,5,2,C.cyan);guide.dot(14,25,C.ink);guide.dot(18,25,C.ink);
save('astronauta-guia',guide);

const ship=surface(64,40);
ship.polygon([[14,15],[9,17],[6,20],[1,23],[7,23],[11,26],[15,25]],C.gold,null);
ship.polygon([[14,18],[8,21],[5,22],[11,23],[14,24]],C.goldLight,null);
ship.polygon([[23,11],[14,2],[34,13]],C.redDark);
ship.polygon([[18,9],[27,9],[39,11],[48,14],[59,20],[48,25],[36,28],[25,30],[18,30]],C.white);
ship.polygon([[20,24],[31,25],[45,23],[59,20],[48,25],[36,28],[25,30],[18,30]],C.grey,null);
ship.polygon([[46,13],[51,16],[59,20],[51,23],[46,26],[48,21],[48,18]],C.red);
ship.polygon([[17,9],[25,9],[23,15],[23,24],[25,30],[17,30]],C.red);
ship.ellipse(17,20,6,10,C.redDark,C.ink);ship.ellipse(16,20,4,7,C.grey,C.ink);ship.ellipse(15,20,2,5,C.glass);ship.rect(14,18,1,4,C.gold);
ship.polygon([[25,26],[16,38],[37,27]],C.red);ship.polygon([[25,31],[16,38],[30,32]],C.redDark,null);
ship.ellipse(37,15,3,2,C.greyDark,C.ink);ship.rect(36,14,3,2,C.glass);ship.rect(28,11,7,1,C.white);ship.rect(34,23,2,1,C.gold);
save('cohete',ship);

const planet=surface(32,32);
planet.ellipse(16,16,14,14,C.planet,C.ink);
for(let y=2;y<31;y++)for(let x=2;x<31;x++)if((x-16)**2+(y-16)**2<=169){if(x>24||y>25)planet.dot(x,y,C.planetDark);else if((x>=11&&x<=15&&y<=8)||(x>=13&&x<=19&&y>=8&&y<=12)||(x>=18&&x<=23&&y>=12&&y<=17)||(x>=7&&x<=12&&y>=21&&y<=25))planet.dot(x,y,C.land);}
save('planeta-destino',planet);

const background=surface(384,216);background.rect(0,0,384,216,C.sky);
let seed=73;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<49;i++){let x=Math.floor(random()*384),y=8+Math.floor(random()*164);background.dot(x,y,i%4===0?C.goldLight:C.grey);}
for(const[x,y]of [[45,76],[135,34],[248,71],[355,46]]){background.line(x-1,y,x+1,y,C.white);background.line(x,y-1,x,y+1,C.white);}
const ring=(frontOnly)=>{for(let t=0;t<Math.PI*2;t+=.035){if(frontOnly&&Math.sin(t)<0)continue;const a=Math.cos(t)*27,b=Math.sin(t)*6;const angle=-.3;background.dot(70+a*Math.cos(angle)-b*Math.sin(angle),103+a*Math.sin(angle)+b*Math.cos(angle),C.grey);}};
ring(false);background.ellipse(70,103,15,15,C.goldDark,C.ink);
for(let y=89;y<=117;y++)for(let x=55;x<=85;x++)if((x-70)**2+(y-103)**2<196&&((y>=95&&y<=97)||(y>=104&&y<=106)))background.dot(x,y,C.gold);
ring(true);background.ellipse(144,92,4,4,C.grey);background.dot(143,91,C.greyDark);
for(let x=0;x<384;x++){const top=Math.round(185+Math.sin(x/51)*3+Math.sin(x/121)*2);background.rect(x,top,1,216-top,C.ground);background.dot(x,top,C.white);}
for(const[x,y,rx]of [[36,198,9],[116,208,13],[247,200,7],[340,211,14]]){background.ellipse(x,y,rx,2,C.groundDark);background.line(x-rx+2,y-2,x+rx-2,y-2,C.grey);}
save('home-scene',background);
