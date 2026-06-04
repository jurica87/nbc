"use strict";
(function(){
var C=document.getElementById("gc"),ctx=C.getContext("2d");

function resize(){C.width=window.innerWidth;C.height=window.innerHeight;}
window.addEventListener("resize",resize);resize();

// roundRect polyfill
if(!ctx.roundRect)ctx.roundRect=function(x,y,w,h,r){
  if(typeof r==="number")r=[r,r,r,r];
  this.moveTo(x+r[0],y);this.lineTo(x+w-r[1],y);
  this.quadraticCurveTo(x+w,y,x+w,y+r[1]);
  this.lineTo(x+w,y+h-r[2]);
  this.quadraticCurveTo(x+w,y+h,x+w-r[2],y+h);
  this.lineTo(x+r[3],y+h);
  this.quadraticCurveTo(x,y+h,x,y+h-r[3]);
  this.lineTo(x,y+r[0]);
  this.quadraticCurveTo(x,y,x+r[0],y);
  this.closePath();
};

// LB
var LBK="nbc-dunk-lb";
function getLB(){try{var r=localStorage.getItem(LBK);return r?JSON.parse(r):[]}catch(e){return[]}}
function saveLB(n,s){var l=getLB();l.push({name:n||"Anonym",score:s,date:Date.now()});l.sort(function(a,b){return b.score-a.score});l.splice(10);try{localStorage.setItem(LBK,JSON.stringify(l))}catch(e){}}
function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML}

// TRICKS
var TRK=[{k:"windmill",n:"Windmill",p:30},{k:"tomahawk",n:"Tomahawk",p:25},{k:"betweenlegs",n:"Between Legs",p:35},{k:"spin360",n:"360 Spin",p:40}];

// GAME
var G={
  state:"menu",total:0,ascores:[],att:0,max:5,
  best:0,tcount:0,clean:0,
  gx:0,gy:0,hx:0,hy:0,
  P:null,B:null,parts:[],crowd:[],
  charging:false,keys:{},
  shake:0,camY:0,tcamY:0
};

G.initP=function(){
  this.P={x:0,y:0,vx:0,vy:0,w:38,h:54,rot:0,rs:0,sx:1,sy:1,st:"ready",tricks:[],onfire:false,ft:0,ball:true,ct:0};
  this.B={x:0,y:0,r:12,rot:0};
  this.parts=[];this.shake=0;this.camY=0;this.tcamY=0;
};

G.initCrowd=function(){
  this.crowd=[];
  for(var r=0;r<3;r++)for(var s=0;s<18;s++){
    this.crowd.push({x:s/18*100,y:5+r*8,
      color:["#F2722C","#7457A3","#3498db","#e74c3c","#2ecc71","#f39c12"][Math.floor(Math.random()*6)],
      ao:Math.random()*6,ex:Math.random()*.3});
  }
};

G.start=function(){
  $("startScreen").classList.add("hidden");
  $("gameOverScreen").classList.add("hidden");
  $("resultScreen").classList.add("hidden");
  $("hud").classList.remove("hidden");
  this.state="play";this.total=0;this.ascores=[];this.att=0;
  this.tcount=0;this.clean=0;this.best=0;this.keys={};
  this.gy=C.height-100;
  this.newAtt();this.updateHUD();
};

G.newAtt=function(){
  this.att++;this.initP();
  this.P.st="ready";this.P.tricks=[];this.P.onfire=false;this.P.ball=true;
  this.P.rot=0;this.P.rs=0;this.P.sx=1;this.P.sy=1;this.P.ct=0;
  this.charging=false;this.parts=[];
  this.P.x=C.width*.15+Math.random()*C.width*.18;
  this.P.y=this.gy-this.P.h;this.P.vx=0;this.P.vy=0;
  this.hx=C.width*.5+Math.random()*C.width*.25;
  this.hy=this.gy-180-Math.random()*40;
  this.B.x=this.P.x+this.P.w/2+15;this.B.y=this.P.y+24;
  this.initCrowd();this.updateHUD();
};

G.startCharge=function(){this.charging=true;this.P.st="charging";this.P.ct=0;};

G.releaseJump=function(){
  this.charging=false;
  var pw=Math.min(this.P.ct/1500,1);
  this.P.vy=-(8+pw*10);
  this.P.vx=(this.keys["ArrowLeft"]?-3:0)+(this.keys["ArrowRight"]?3:0);
  this.P.st="jump";
  this.P.sx=.85;this.P.sy=1.15;
  for(var i=0;i<6;i++)this.parts.push({x:this.P.x+this.P.w/2,y:this.gy,vx:(Math.random()-.5)*5,vy:-Math.random()*3,life:1,col:"rgba(180,160,140,0.5)",sz:3+Math.random()*4,tp:"d"});
};

G.doTrick=function(k){
  if(this.P.st!=="jump"&&this.P.st!=="air"&&this.P.st!=="dunk")return;
  if(this.P.tricks.indexOf(k)!==-1||this.P.tricks.length>=3)return;
  this.P.tricks.push(k);
  var t=TRK.filter(function(x){return x.k===k})[0];if(!t)return;
  this.tcount++;
  this.showPop(t.n+"!");
  for(var i=0;i<12;i++)this.parts.push({x:this.P.x+this.P.w/2,y:this.P.y+this.P.h/2,vx:(Math.random()-.5)*10,vy:-Math.random()*8,life:1,col:"#F2722C",sz:3+Math.random()*5,tp:"s"});
  if(this.ascores.length>=2&&this.ascores[this.ascores.length-1]>50){
    this.P.onfire=true;this.P.ft=300;this.showPop("ON FIRE!");
  }
  this.crowd.forEach(function(c){c.ex=Math.min(c.ex+.3,1)});
};

G.showPop=function(txt){
  var el=$("tp");el.textContent=txt;el.classList.remove("show");
  void el.offsetWidth;el.classList.add("show");
};

G.endAtt=function(){
  var p=this.P,sc=0;
  if(!p.ball&&p.st!=="fall"){sc+=20}
  p.tricks.forEach(function(k){var t=TRK.filter(function(x){return x.k===k})[0];sc+=t?t.p:0});
  if(p.tricks.length>=2)sc+=p.tricks.length*15;
  if(p.st==="land")sc+=10;
  if(p.onfire)sc=Math.floor(sc*1.5);
  sc+=Math.min(p.vx*0+p.vy*0,0); // placeholder
  sc=Math.max(0,Math.floor(sc));
  this.ascores.push(sc);this.total+=sc;this.best=Math.max(this.best,sc);
  this.showResult(sc);
};

G.showResult=function(sc){
  this.state="result";
  $("hud").classList.add("hidden");$("resultScreen").classList.remove("hidden");
  $("ra").textContent=this.att+"/"+this.max;$("ascore").textContent=sc;
  var stars=sc>=80?5:sc>=60?4:sc>=40?3:sc>=20?2:sc>0?1:0;
  for(var i=1;i<=5;i++){$("star"+i).classList.toggle("lit",i<=stars)}
  $("atrick").textContent=this.P.tricks.length>0?this.P.tricks.map(function(k){var t=TRK.filter(function(x){return x.k===k})[0];return t?t.n:k}).join(" + "):"Kein Trick";
  $("nb").textContent=this.att>=this.max?"ERGEBNIS SEHEN":"N&Auml;CHSTER VERSUCH";
};

G.showFinal=function(){
  this.state="over";$("resultScreen").classList.add("hidden");
  $("gameOverScreen").classList.remove("hidden");
  var rec=this.total>(this._hb||0);this._hb=this.total;
  if(rec)$("nrl").classList.remove("hidden");else $("nrl").classList.add("hidden");
  $("fsc").textContent=this.total;$("fscore")&&($("fscore").textContent=this.total);
  $("st0").textContent=this.tcount;$("st1").textContent=this.best;$("st2").textContent=this.clean;
  var avg=this.total/this.max,gr,gc;
  if(avg>=70){gr="A";gc="gA"}else if(avg>=55){gr="B";gc="gB"}else if(avg>=40){gr="C";gc="gC"}else if(avg>=25){gr="D";gc="gD"}else{gr="F";gc="gF"}
  var ge=$("fg");ge.textContent=gr;ge.className="grade "+gc;
  var sc=avg>=70?5:avg>=55?4:avg>=40?3:avg>=25?2:1;
  var fs=document.querySelectorAll("#fstars span");fs.forEach(function(s,i){s.classList.toggle("lit",i<sc)});
};

G.showMenu=function(){$("gameOverScreen").classList.add("hidden");$("hud").classList.add("hidden");$("startScreen").classList.remove("hidden");this.state="menu"};

G.showLB=function(){
  $("startScreen").classList.add("hidden");$("gameOverScreen").classList.add("hidden");
  $("lbScreen").classList.remove("hidden");
  var lb=getLB(),c=$("lbl");
  if(!lb.length){c.innerHTML='<div style="text-align:center;color:#64748b;padding:24px;font-size:13px">Noch keine Eintr&auml;ge</div>return}
  var h='<table style="width:100%;border-collapse:collapse"><thead><tr style="color:#F2722C;font-size:11px;text-transform:uppercase;letter-spacing:1px"><th style="padding:6px;width:36px">#</th><th style="padding:6px;text-align:left">Name</th><th style="padding:6px;text-align:right">Punkte</th></tr></thead><tbody>';
  lb.forEach(function(e,i){var m=i===0?"&#x1F947;":i===1?"&#x1F948;":i===2?"&#x1F949;":(i+1);h+='<tr><td style="padding:8px;color:#F2722C">'+m+'</td><td style="padding:8px;color:#e2e8f0;font-size:13px">'+esc(e.name)+'</td><td style="padding:8px;color:#F2722C;text-align:right">'+e.score+"</td></tr>"});
  h+="</tbody></table>";c.innerHTML=h;
};

G.hideLB=function(){$("lbScreen").classList.add("hidden");$("startScreen").classList.remove("hidden")};

G.share=function(){
  var txt="NBC Dunk Contest: "+this.total+" Punkte! Note: "+$("fg").textContent+"\nKannst du das schlagen?";
  if(navigator.share)navigator.share({title:"NBC Dunk Contest",text:txt,url:location.href});
  else navigator.clipboard.writeText(txt).then(function(){alert("Kopiert!")});
};

G.updateHUD=function(){$("hs").textContent=this.total;$("ha").textContent=this.att+"/"+this.max};

// INPUTS
G._ib=function(){
  var self=this;
  document.addEventListener("keydown",function(e){self.keys[e.code]=true;if(self.state!=="play")return;if((e.code==="Space"||e.code==="ArrowUp")&&!e.repeat){e.preventDefault();if(self.P.st==="ready"||self.P.st==="charging")self.startCharge()}});
  document.addEventListener("keyup",function(e){self.keys[e.code]=false;if(self.state!=="play")return;if((e.code==="Space"||e.code==="ArrowUp")&&self.charging)self.releaseJump()});
  C.addEventListener("touchstart",function(e){
    e.preventDefault();if(self.state!=="play")return;
    var t=e.touches[0],bw=52,bh=52,gp=8,tw=TRK.length*bw+(TRK.length-1)*gp,sx=(C.width-tw)/2,by=C.height-75;
    if((self.P.st==="jump"||self.P.st==="air")&&t.clientY>=by&&t.clientY<=by+bh){var idx=Math.floor((t.clientX-sx)/(bw+gp));if(idx>=0&&idx<TRK.length&&self.P.tricks.indexOf(TRK[idx].k)===-1){self.doTrick(TRK[idx].k);return}}
    if(self.P.st==="ready"||self.P.st==="charging")self.startCharge();
  },{passive:false});
  C.addEventListener("touchend",function(e){e.preventDefault();if(self.state!=="play"||!self.charging)return;self.releaseJump()},{passive:false});
  C.addEventListener("mousedown",function(e){if(self.state!=="play")return;if(self.P.st==="ready"||self.P.st==="charging")self.startCharge()});
  C.addEventListener("mouseup",function(e){if(self.state!=="play"||!self.charging)return;self.releaseJump()});
  $("sb").addEventListener("click",function(){self.start()});
  $("nb").addEventListener("click",function(){if(self.att>=self.max)self.showFinal();else{self.newAtt();self.state="play";$("resultScreen").classList.add("hidden");$("hud").classList.remove("hidden")}});
  $("rb").addEventListener("click",function(){self.start()});
  $("mb").addEventListener("click",function(){self.showMenu()});
  $("shb").addEventListener("click",function(){self.share()});
  $("lbb").addEventListener("click",function(){self.showLB()});
  $("lbb2").addEventListener("click",function(){self.showLB()});
  $("bb").addEventListener("click",function(){self.hideLB()});
};

G.update=function(){
  if(this.state!=="play")return;
  var p=this.P;
  if(this.charging&&p.st==="charging"){p.ct=Math.min(p.ct+16,1500);p.sy=1-(p.ct/1500)*.2;p.sx=1+(p.ct/1500)*.15}

  if(p.st==="jump"||p.st==="air"||p.st==="dunk"){
    p.vy+=.55;p.y+=p.vy;p.x+=p.vx;p.rot+=p.rs;
    if(this.keys["ArrowLeft"]){p.vx-=.3;p.rs-=.007}
    if(this.keys["ArrowRight"]){p.vx+=.3;p.rs+=.007}
    // trick via keys
    if(this.keys["ArrowLeft"]&&this.P.tricks.length<3&&!this._lt){this._lt=true;var k=TRK[this.P.tricks.length%TRK.length].k;if(this.P.tricks.indexOf(k)===-1)this.doTrick(k)}
    if(!this.keys["ArrowLeft"])this._lt=false;
    if(this.keys["ArrowRight"]&&this._rt&&this.P.tricks.length<3&&!this._rtm){this._rtm=true;var k2=TRK[(this.P.tricks.length+1)%TRK.length].k;if(this.P.tricks.indexOf(k2)===-1)this.doTrick(k2)}
    if(!this.keys["ArrowRight"])this._rtm=false;

    // auto-dunk near hoop
    var dx=(p.x+p.w/2)-this.hx,dy=(p.y+p.h/2)-this.hy;
    if(Math.sqrt(dx*dx+dy*dy)<55&&p.vy>0&&p.ball&&p.st!=="dunk"){
      p.st="dunk";p.ball=false;p.vy=3;p.rs*=.3;this.shake=12;
      for(var i=0;i<20;i++)this.parts.push({x:this.hx+(Math.random()-.5)*40,y:this.hy,vx:(Math.random()-.5)*10,vy:Math.random()*3,life:1,col:i%2===0?"#F2722C":"#7457A3",sz:3+Math.random()*5,tp:"s"});
      this.B.x=this.hx;this.B.y=this.hy;this.showPop("SLAM DUNK!");
      this.crowd.forEach(function(c){c.ex=1});
    }

    if(p.y>=this.gy-p.h){
      p.y=this.gy-p.h;p.vy=0;p.vx*=.7;p.rs*=.9;
      var la=Math.abs(p.rot%(Math.PI*2));
      p.st=(la<.4||la>6.0)?"land":"fall";
      this.parts.push({x:p.x+p.w/2,y:this.gy,life:1,vx:0,vy:0,sz:15,tp:"dust"});
      var self=this;setTimeout(function(){p.st="done";self.endAtt()},1000);
    }
    if(p.y>C.height+100){this.endAtt();p.st="done"}
    if(this.keys["Space"]||this.keys["ArrowUp"]){p.st="air"} // prevent re-trigger
  }

  p.sx+=(1-p.sx)*.12;p.sy+=(1-p.sy)*.12;

  if(this.charging)p.st="charging";

  if(p.y<this.gy-200)this.tcamY=Math.min(p.y-(this.gy-250),0);else this.tcamY=0;
  this.camY+=(this.tcamY-this.camY)*.05;
  this.shake*=.9;if(this.shake<.3)this.shake=0;

  if(p.ball){this.B.x=p.x+p.w/2+Math.sin(p.rot<0?-1:1)*12;this.B.y=p.y+20;this.B.rot+=.1}
  else{this.B.y+=2;this.B.x+=Math.sin(this.B.y*.1)*.5}

  if(p.onfire){p.ft--;if(p.ft<=0)p.onfire=false}

  this.parts=this.parts.filter(function(pt){
    pt.x+=pt.vx;pt.y+=pt.vy;
    if(pt.tp==="d"){pt.vy+=.1;pt.life-=.03}else if(pt.tp==="s"){pt.vy+=.15;pt.life-=.025}else{pt.life-=.02}
    return pt.life>0
  });

  this.crowd.forEach(function(c){c.ex*=.995});
  this.keys["ArrowLeft"]=false;this.keys["ArrowRight"]=false; // consume one-shot tricks
};

G.draw=function(){
  ctx.save();
  if(this.shake>0)ctx.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);
  var cmy=this.camY;

  // sky
  var sg=ctx.createLinearGradient(0,0,0,C.height+cmy);
  sg.addColorStop(0,"#050510");sg.addColorStop(.3,"#0a0a1a");sg.addColorStop(1,"#1a1a2e");
  ctx.fillStyle=sg;ctx.fillRect(0,0,C.width,C.height);

  // stars
  for(var i=0;i<50;i++){ctx.fillStyle="rgba(255,255,255,"+(.1+i%4*.08)+")";ctx.beginPath();ctx.arc((i*73+30)%C.width,(i*37+10)%200+cmy*.3,.5+i%3*.5,0,6.28);ctx.fill()}

  ctx.save();ctx.translate(0,cmy);

  // wall
  ctx.fillStyle="#111827";ctx.fillRect(0,50+cmy*.2,C.width,this.gy-50-cmy*.2);
  ctx.strokeStyle="rgba(255,255,255,.02)";ctx.lineWidth=1;
  for(var wy=80;wy<this.gy;wy+=40){ctx.beginPath();ctx.moveTo(0,wy+cmy*.15);ctx.lineTo(C.width,wy+cmy*.15);ctx.stroke()}

  // crowd
  this.crowd.forEach(function(c){
    var cx=(c.x/100)*C.width,cy=G.gy-80-c.y+Math.sin(Date.now()*.005+c.ao)*c.ex*8;
    ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(cx,cy,2.5+c.ex*1.5,0,6.28);ctx.fill();
    ctx.fillRect(cx-1.5,cy+2,3,5);
    if(c.ex>.5){ctx.strokeStyle=c.color;ctx.lineWidth=1;var ay=cy+3-c.ex*7;
      ctx.beginPath();ctx.moveTo(cx-1,cy+5);ctx.lineTo(cx-5,ay);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+1,cy+5);ctx.lineTo(cx+5,ay);ctx.stroke();
    }
  });

  // hoop
  var hx=this.hx,hy=this.hy;
  ctx.fillStyle="rgba(255,255,255,.9)";ctx.fillRect(hx-45,hy-65,90,65);
  ctx.strokeStyle="#F2722C";ctx.lineWidth=2;ctx.strokeRect(hx-45,hy-65,90,65);
  ctx.strokeRect(hx-22,hy-40,44,30);
  ctx.fillStyle="#555";ctx.fillRect(hx-4,hy-65,8,-25);
  ctx.strokeStyle="#F2722C";ctx.lineWidth=4;ctx.shadowColor="#F2722C";ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(hx-30,hy);ctx.lineTo(hx+30,hy);ctx.stroke();ctx.shadowBlur=0;
  // net
  ctx.strokeStyle="rgba(255,255,255,.5)";ctx.lineWidth=1;
  for(var ni=0;ni<=7;ni++){var nx=hx-30+(60/7)*ni;ctx.beginPath();ctx.moveTo(nx,hy);ctx.quadraticCurveTo(hx+(nx-hx)*.3,hy+27,hx+(nx-hx)*.1,hy+40);ctx.stroke()}
  for(var nj=1;nj<=3;nj++){var ny=hy+(40/4)*nj,sp=30*(1-nj*.2);ctx.beginPath();ctx.moveTo(hx-sp*.8,ny);ctx.lineTo(hx+sp*.8,ny);ctx.stroke()}

  // player
  this.drawPlayer();

  // ball
  this.drawBall();

  // charge bar
  if(this.charging){
    var pw=this.P.ct/1500;
    ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(C.width/2-50,C.height-40,100,12);
    var cg=ctx.createLinearGradient(C.width/2-48,0,C.width/2+48,0);
    cg.addColorStop(0,"#F2722C");cg.addColorStop(1,pw>.8?"#2ecc71":"#7457A3");
    ctx.fillStyle=cg;ctx.fillRect(C.width/2-48,C.height-38,96*pw,8);
    ctx.fillStyle="#fff";ctx.font="9px Oswald";ctx.textAlign="center";
    ctx.fillText(pw>.8?"MAX POWER!":"HALTE...",C.width/2,C.height-44);
  }

  // trick buttons in air
  if(this.P.st==="jump"||this.P.st==="air"||this.P.st==="dunk"){
    var bw=52,bh=52,gp=8,tw=TRK.length*bw+(TRK.length-1)*gp,sx=(C.width-tw)/2,by=C.height-75;
    TRK.forEach(function(t,i){
      var x=sx+i*(bw+gp),used=G.P.tricks.indexOf(t.k)!==-1;
      ctx.globalAlpha=used?.3:.8;
      ctx.fillStyle=used?"#333":"rgba(242,114,44,.2)";ctx.strokeStyle=used?"#555":"#F2722C";ctx.lineWidth=2;
      ctx.beginPath();ctx.roundRect(x,by,bw,bh,10);ctx.fill();ctx.stroke();
      ctx.globalAlpha=1;ctx.font="20px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
      var icons={windmill:"&#x1F32C;",tomahawk:"&#x1FA93;",betweenlegs:"&#x1F9B5;",spin360:"&#x1F300;"};
      ctx.fillText(icons[t.k]||"?",x+bw/2,by+bh/2);
    });
  }

  // particles
  this.parts.forEach(function(pt){
    ctx.globalAlpha=Math.max(0,pt.life);ctx.fillStyle=pt.col;ctx.beginPath();
    if(pt.tp==="s"){var a=0,sz=pt.sz*pt.life;ctx.moveTo(pt.x,pt.y-sz);for(var j=1;j<5;j++){a+=3.14159*2/5;ctx.lineTo(pt.x+Math.cos(a)*sz*.5,pt.y+Math.sin(a)*sz*.5);a+=3.14159*2/5;ctx.lineTo(pt.x+Math.cos(a)*sz,pt.y+Math.sin(a)*sz)}ctx.closePath()}else{ctx.arc(pt.x,pt.y,pt.sz*pt.life,0,6.28)}
    ctx.fill();
  });
  ctx.globalAlpha=1;

  ctx.restore();ctx.restore();
};

G.drawPlayer=function(){
  var p=this.P;if(p.st==="done")return;
  ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h);ctx.scale(p.sx,p.sy);ctx.rotate(p.rot);ctx.translate(-p.w/2,-p.h);

  // fire aura
  if(p.onfire){ctx.shadowColor="#F2722C";ctx.shadowBlur=20;for(var i=0;i<4;i++){ctx.fillStyle="rgba(242,114,44,"+(.08-i*.015)+")";ctx.beginPath();ctx.ellipse(p.w/2,p.h/2,p.w/2+6+i*3,p.h/2+6+i*3,0,0,6.28);ctx.fill()}ctx.shadowBlur=0}

  // shadow
  ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(p.w/2,2,p.w*.35,4,0,0,6.28);ctx.fill();

  // legs
  var la=p.st==="jump"||p.st==="air"||p.st==="dunk"?10:Math.sin(Date.now()*.01)*3;
  ctx.strokeStyle="#2c3e50";ctx.lineWidth=7;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(p.w*.35,p.h*.55);ctx.lineTo(p.w*.3-la,p.h*.95);ctx.stroke();
  ctx.beginPath();ctx.moveTo(p.w*.65,p.h*.55);ctx.lineTo(p.w*.6+la,p.h*.95);ctx.stroke();
  ctx.fillStyle="#F2722C";
  ctx.beginPath();ctx.ellipse(p.w*.3-la,p.h*.97,7,3,0,0,6.28);ctx.fill();
  ctx.beginPath();ctx.ellipse(p.w*.6+la,p.h*.97,7,3,0,0,6.28);ctx.fill();

  // body
  ctx.fillStyle=p.onfire?"#ff6b35":"#F2722C";
  ctx.beginPath();ctx.roundRect(p.w*.18,p.h*.15,p.w*.64,p.h*.42,5);ctx.fill();
  ctx.fillStyle="#fff";ctx.font="bold 12px Oswald";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("NBC",p.w/2,p.h*.33);

  // arms
  ctx.strokeStyle="#f0c090";ctx.lineWidth=5;ctx.lineCap="round";
  if(p.st==="dunk"){ctx.beginPath();ctx.moveTo(p.w*.5,p.h*.25);ctx.lineTo(p.w*.5,-8);ctx.stroke()}
  else if(p.st==="jump"||p.st==="air"){ctx.beginPath();ctx.moveTo(p.w*.2,p.h*.3);ctx.lineTo(p.w*.05,p.h*.1);ctx.stroke();ctx.beginPath();ctx.moveTo(p.w*.8,p.h*.3);ctx.lineTo(p.w*.95,p.h*.1);ctx.stroke()}
  else{var as=this.charging?(this.P.ct/1500)*8:0;ctx.beginPath();ctx.moveTo(p.w*.2,p.h*.3);ctx.lineTo(p.w*.1+as,p.h*.5);ctx.stroke();ctx.beginPath();ctx.moveTo(p.w*.8,p.h*.3);ctx.lineTo(p.w*.9-as,p.h*.5);ctx.stroke()}

  // head
  ctx.fillStyle="#f0c090";ctx.beginPath();ctx.arc(p.w/2,p.h*.09,11,0,6.28);ctx.fill();
  ctx.fillStyle="#4a3728";ctx.beginPath();ctx.arc(p.w/2,p.h*.05,9,3.14,6.28);ctx.fill();
  ctx.fillStyle="#F2722C";ctx.fillRect(p.w/2-9,p.h*.01,18,3);
  ctx.fillStyle="#2c3e50";ctx.beginPath();ctx.arc(p.w/2-3,p.h*.07,1.5,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(p.w/2+3,p.h*.07,1.5,0,6.28).fill();
  ctx.strokeStyle="#2c3e50";ctx.lineWidth=1.2;
  if(p.st==="charging"){ctx.beginPath();ctx.arc(p.w/2,p.h*.13,3,.2,2.94);ctx.stroke()}
  else if(p.st==="jump"||p.st==="air"||p.st==="dunk"){ctx.beginPath();ctx.moveTo(p.w/2-2,p.h*.12);ctx.lineTo(p.w/2+2,p.h*.12);ctx.stroke()}
  else{ctx.beginPath();ctx.arc(p.w/2,p.h*.11,3,.1,3.04);ctx.stroke()}

  ctx.restore();
};

G.drawBall=function(){
  var bx=this.B.x,by=this.B.y,br=this.B.r;
  ctx.save();ctx.translate(bx,by);ctx.rotate(this.B.rot);
  ctx.shadowColor="#F2722C";ctx.shadowBlur=8;
  var g=ctx.createRadialGradient(-2,-2,0,0,0,br);g.addColorStop(0,"#ffad33");g.addColorStop(1,"#d35400");
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,br,0,6.28);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle="#2c3e50";ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,br-2,0,6.28).stroke();
  ctx.beginPath();ctx.moveTo(-br+3,0);ctx.lineTo(br-3,0).stroke();
  ctx.restore();
};

G.loop=function(){this.update();this.draw();requestAnimationFrame(function(){G.loop()})};

// helpers
function $(id){return document.getElementById(id)}

// init
G._hb=getLB().reduce(function(a,b){return Math.max(a,b.score)},0);
G.initCrowd();
G._ib();
G.loop();

})();
