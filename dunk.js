"use strict";
(function(){
var C=document.getElementById("c"),X=C.getContext("2d");
function resize(){C.width=window.innerWidth;C.height=window.innerHeight;}
window.addEventListener("resize",resize);resize();

// -- LB --
var LK="nbc-dunk-lb";
function gLB(){try{var r=localStorage.getItem(LK);return r?JSON.parse(r):[]}catch(e){return[]}}
function sLB(n,s){var l=gLB();l.push({name:n||"Anonym",score:s,date:Date.now()});l.sort(function(a,b){return b.score-a.score});l.splice(10);try{localStorage.setItem(LK,JSON.stringify(l))}catch(e){}}
function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML}
function rLB(){
  var c=document.getElementById("lbl"),lb=gLB();
  if(!lb.length){c.innerHTML='<div style="text-align:center;color:#64748b;padding:20px;font-size:12px">Noch keine Eintr&auml;ge</div>return}
  var h='<table style="width:100%;border-collapse:collapse"><thead><tr style="color:#F2722C;font-size:10px;text-transform:uppercase"><th style="padding:6px;width:30px">#</th><th style="padding:6px;text-align:left">Name</th><th style="padding:6px;text-align:right">Punkte</th></tr></thead><tbody>';
  lb.forEach(function(e,i){var m=i===0?"&#x1F947;":i===1?"&#x1F948;":i===2?"&#x1F949;":(i+1);h+='<tr><td style="padding:7px;color:#F2722C">'+m+'</td><td style="padding:7px;color:#e2e8f0;font-size:12px">'+esc(e.name)+'</td><td style="padding:7px;color:#F2722C;text-align:right">'+e.score+'</td></tr>'});
  h+='</tbody></table>';c.innerHTML=h;
}

// -- Helpers --
function $(id){return document.getElementById(id)}
function dist(a,b,c,d){return Math.sqrt((a-c)*(a-c)+(b-d)*(b-d))}

// -- Game State --
var G={
  state:"menu",total:0,ascores:[],att:0,max:5,hits:0,best:0,
  gx:0,gy:0,hx:0,hy:0,hw:0,
  ball:null,particles:[],crowd:[],
  drag:false,dx:0,dy:0,sx:0,sy:0,
  shake:0,popText:"",popTimer:0
};

G.init=function(){
  this.gy=C.height-80;
  this.hx=C.width*.65;
  this.hy=this.gy-160;
  this.hw=50;
  this.ball={x:C.width*.25,y:this.gy-30,r:12,vx:0,vy:0,rot:0,active:false};
  this.particles=[];
  this.crowd=[];
  for(var r=0;r<2;r++)for(var s=0;s<16;s++){
    this.crowd.push({x:s/16*C.width,y:this.gy-50-r*12,
      color:["#F2722C","#7457A3","#3498db","#e74c3c","#2ecc71"][Math.floor(Math.random()*5)],
      ao:Math.random()*6,ex:Math.random()*.2});
  }
};

G.start=function(){
  $("start").classList.add("none");$("over").classList.add("none");$("result").classList.add("none");
  $("hud").style.display="flex";
  this.state="play";this.total=0;this.ascores=[];this.att=0;this.hits=0;this.best=0;
  this.init();this.newAtt();
};

G.newAtt=function(){
  this.att++;
  this.ball.x=C.width*.2+Math.random()*.15*C.width;
  this.ball.y=this.gy-30;
  this.ball.vx=0;this.ball.vy=0;this.ball.active=false;
  this.ball.rot=0;
  this.particles=[];
  this.hx=C.width*.55+Math.random()*.2*C.width;
  this.hy=this.gy-150-Math.random()*30;
  this.crowd.forEach(function(c){c.ex=Math.random()*.2});
  $("sc").textContent=this.total;$("at").textContent=this.att+"/"+this.max;
};

G.endAtt=function(){
  var last=this.ascores[this.ascores.length-1];
  this.state="result";
  $("hud").style.display="none";
  $("result").classList.remove("none");
  $("ra").textContent=this.att+"/"+this.max;
  $("asc").textContent=last;
  var stars=last>=80?5:last>=60?4:last>=40?3:last>=20?2:last>0?1:0;
  var sEls=$("stars").children;
  for(var i=0;i<5;i++)sEls[i].classList.toggle("on",i<stars);
  $("bn").textContent=this.att>=this.max?"ERGEBNIS":"WEITER";
};

G.showFinal=function(){
  this.state="over";
  $("result").classList.add("none");$("over").classList.remove("none");
  var rec=this.total>(this._hb||0);
  $("nr").classList.toggle("none",!rec);
  $("fsc").textContent=this.total;
  $("s0").textContent=this.hits;$("s1").textContent=this.best;
  $("s2").textContent=this.max>0?Math.round(this.hits/this.max*100)+"%":0;
  var avg=this.total/this.max,gr,gc;
  if(avg>=70){gr="A";gc="gA"}else if(avg>=55){gr="B";gc="gB"}else if(avg>=40){gr="C";gc="gC"}else if(avg>=25){gr="D";gc="gD"}else{gr="F";gc="gF"}
  var ge=$("gr");ge.textContent=gr;ge.className="gr "+gc;
  var sc=avg>=70?5:avg>=55?4:avg>=40?3:avg>=25?2:1;
  var fs=document.querySelectorAll("#fss span");fs.forEach(function(s,i){s.classList.toggle("on",i<sc)});
};

G.showMenu=function(){$("over").classList.add("none");$("hud").style.display="none";$("start").classList.remove("none");this.state="menu"};
G.showLB=function(){$("start").classList.add("none");$("over").classList.add("none");$("lb").classList.remove("none");rLB()};
G.hideLB=function(){$("lb").classList.add("none");$("start").classList.remove("none")};

G.pop=function(t){
  this.popText=t;this.popTimer=60;
  var el=$("tp");el.textContent=t;el.classList.remove("show");
  void el.offsetWidth;el.classList.add("show");
};

// -- Input --
G._ib=function(){
  var self=this;
  function getXY(e){if(e.touches&&e.touches.length>0)return{x:e.touches[0].clientX,y:e.touches[0].clientY};return{x:e.clientX,y:e.clientY}}
  function onDown(e){
    if(self.state!=="play"||self.ball.active)return;
    var p=getXY(e);
    if(dist(p.x,p.y,self.ball.x,self.ball.y)<40){self.drag=true;self.sx=p.x;self.sy=p.y;self.dx=0;self.dy=0}
  }
  function onMove(e){
    if(!self.drag)return;
    var p=getXY(e);self.dx=self.sx-p.x;self.dy=self.sy-p.y;
  }
  function onUp(e){
    if(!self.drag)return;
    self.drag=false;
    var power=Math.sqrt(self.dx*self.dx+self.dy*self.dy);
    if(power>20){
      var angle=Math.atan2(-self.dy,-self.dx);
      var speed=Math.min(power*.12,18);
      self.ball.vx=Math.cos(angle)*speed;
      self.ball.vy=Math.sin(angle)*speed-2;
      self.ball.active=true;
    }
  }
  C.addEventListener("touchstart",function(e){e.preventDefault();onDown(e)},{passive:false});
  C.addEventListener("touchmove",function(e){e.preventDefault();onMove(e)},{passive:false});
  C.addEventListener("touchend",function(e){e.preventDefault();onUp(e)},{passive:false});
  C.addEventListener("mousedown",function(e){onDown(e)});
  C.addEventListener("mousemove",function(e){onMove(e)});
  C.addEventListener("mouseup",function(e){onUp(e)});
  $("bs").addEventListener("click",function(){self.start()});
  $("bn").addEventListener("click",function(){if(self.att>=self.max)self.showFinal();else{self.newAtt();self.state="play";$("result").classList.add("none");$("hud").style.display="flex"}});
  $("br").addEventListener("click",function(){self.start()});
  $("bm").addEventListener("click",function(){self.showMenu()});
  $("bl").addEventListener("click",function(){self.showLB()});
  $("bb").addEventListener("click",function(){self.hideLB()});
};

// -- Update --
G.update=function(){
  if(this.state!=="play")return;
  var b=this.ball;
  if(b.active){
    b.vy+=.45;b.x+=b.vx;b.y+=b.vy;b.rot+=b.vx*.05;
    // walls
    if(b.x<b.r){b.x=b.r;b.vx*=-.7}
    if(b.x>C.width-b.r){b.x=C.width-b.r;b.vx*=-.7}
    if(b.y<b.r){b.y=b.r;b.vy*=-.7}
    // hoop collision
    var hx=this.hx,hy=this.hy,hw=this.hw;
    // rim left
    if(dist(b.x,b.y,hx-hw,hy)<b.r+4&&b.vy>0){b.vy*=-.6;b.vx+=1;this.shake=5}
    // rim right
    if(dist(b.x,b.y,hx+hw,hy)<b.r+4&&b.vy>0){b.vy*=-.6;b.vx-=1;this.shake=5}
    // through hoop (score!)
    if(b.x>hx-hw+5&&b.x<hx+hw-5&&b.y>hy-5&&b.y<hy+15&&b.vy>0&&!b.scored){
      b.scored=true;this.hits++;
      var d=dist(b.x,b.y,hx,hy);
      var pts=d<15?80:d<30?60:d<45?40:20;
      this.total+=pts;this.ascores.push(pts);this.best=Math.max(this.best,pts);
      this.shake=8;this.pop(pts+" PUNKTE!");
      for(var i=0;i<20;i++)this.particles.push({x:hx+(Math.random()-.5)*30,y:hy,vx:(Math.random()-.5)*8,vy:-Math.random()*6,life:1,col:i%2?"#F2722C":"#7457A3",sz:3+Math.random()*4});
      this.crowd.forEach(function(c){c.ex=1});
      var self=this;setTimeout(function(){b.scored=false;self.endAtt()},1200);
      $("sc").textContent=this.total;
    }
    // ground
    if(b.y>this.gy-b.r){
      b.y=this.gy-b.r;b.vy*=-.5;b.vx*=.8;
      if(Math.abs(b.vy)<1&&Math.abs(b.vx)<.5){
        b.active=false;b.vx=0;b.vy=0;
        this.ascores.push(0);this.total+=0;
        var self2=this;setTimeout(function(){self2.endAtt()},800);
      }
    }
    // out of bounds
    if(b.y>C.height+50){b.active=false;this.ascores.push(0);var self3=this;setTimeout(function(){self3.endAtt()},500)}
  }
  // particles
  this.particles=this.particles.filter(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=.15;p.life-=.025;return p.life>0});
  this.shake*=.9;if(this.shake<.3)this.shake=0;
  if(this.popTimer>0)this.popTimer--;
  this.crowd.forEach(function(c){c.ex*=.99});
};

// -- Draw --
G.draw=function(){
  ctx.save();
  if(this.shake>0)ctx.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);

  // sky
  var sg=ctx.createLinearGradient(0,0,0,C.height);
  sg.addColorStop(0,"#050510");sg.addColorStop(.4,"#0a0a1a");sg.addColorStop(1,"#1a1a2e");
  ctx.fillStyle=sg;ctx.fillRect(0,0,C.width,C.height);

  // stars
  for(var i=0;i<40;i++){ctx.fillStyle="rgba(255,255,255,.15)";ctx.beginPath();ctx.arc((i*97)%C.width,(i*43)%180,.8+i%3*.4,0,6.28);ctx.fill()}

  // wall
  ctx.fillStyle="#111827";ctx.fillRect(0,40,C.width,this.gy-40);

  // crowd
  this.crowd.forEach(function(c){
    var cy=G.gy-c.y+Math.sin(Date.now()*.004+c.ao)*c.ex*6;
    ctx.fillStyle=c.color;
    ctx.beginPath();ctx.arc(c.x,cy,2+c.ex,0,6.28);ctx.fill();
    ctx.fillRect(c.x-1.5,cy+2,3,4);
    if(c.ex>.4){ctx.strokeStyle=c.color;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(c-1,cy+4);ctx.lineTo(c-4,cy-c.ex*6);ctx.stroke();
      ctx.beginPath();ctx.moveTo(c+1,cy+4);ctx.lineTo(c+4,cy-c.ex*6);ctx.stroke();
    }
  });

  // floor
  var fg=ctx.createLinearGradient(0,this.gy,0,C.height);
  fg.addColorStop(0,"#1a1a2e");fg.addColorStop(1,"#0d0d15");
  ctx.fillStyle=fg;ctx.fillRect(0,this.gy,C.width,C.height-this.gy);
  ctx.strokeStyle="#F2722C";ctx.lineWidth=2;ctx.shadowColor="#F2722C";ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(0,this.gy);ctx.lineTo(C.width,this.gy);ctx.stroke();ctx.shadowBlur=0;

  // hoop
  var hx=this.hx,hy=this.hy,hw=this.hw;
  // backboard
  ctx.fillStyle="rgba(255,255,255,.85)";ctx.fillRect(hx-42,hy-55,84,55);
  ctx.strokeStyle="#F2722C";ctx.lineWidth=2;ctx.strokeRect(hx-42,hy-55,84,55);
  ctx.strokeRect(hx-18,hy-35,36,25);
  // pole
  ctx.fillStyle="#444";ctx.fillRect(hx-3,hy-55,6,-20);
  // rim
  ctx.strokeStyle="#F2722C";ctx.lineWidth=4;ctx.shadowColor="#F2722C";ctx.shadowBlur=6;
  ctx.beginPath();ctx.moveTo(hx-hw,hy);ctx.lineTo(hx+hw,hy);ctx.stroke();ctx.shadowBlur=0;
  // net
  ctx.strokeStyle="rgba(255,255,255,.4)";ctx.lineWidth=1;
  for(var ni=0;ni<=6;ni++){var nx=hx-hw+(hw*2/6)*ni;ctx.beginPath();ctx.moveTo(nx,hy);ctx.quadraticCurveTo(hx+(nx-hx)*.3,hy+22,hx+(nx-hx)*.1,hy+35);ctx.stroke()}
  for(var nj=1;nj<=3;nj++){var ny=hy+(35/4)*nj,sp=hw*(1-nj*.2);ctx.beginPath();ctx.moveTo(hx-sp*.8,ny);ctx.lineTo(hx+sp*.8,ny);ctx.stroke()}

  // ball
  var b=this.ball;
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);
  ctx.shadowColor="#F2722C";ctx.shadowBlur=8;
  var bg=ctx.createRadialGradient(-2,-2,0,0,0,b.r);bg.addColorStop(0,"#ffad33");bg.addColorStop(1,"#d35400");
  ctx.fillStyle=bg;ctx.beginPath();ctx.arc(0,0,b.r,0,6.28);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle="#2c3e50";ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,b.r-2,0,6.28).stroke();
  ctx.beginPath();ctx.moveTo(-b.r+3,0);ctx.lineTo(b.r-3,0).stroke();
  ctx.restore();

  // drag line
  if(this.drag){
    ctx.strokeStyle="rgba(242,114,44,.5)";ctx.lineWidth=2;ctx.setLineDash([4,6]);
    ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+this.dx,b.y+this.dy);ctx.stroke();
    ctx.setLineDash([]);
    // power indicator
    var pw=Math.min(Math.sqrt(this.dx*this.dx+this.dy*this.dy)/150,1);
    ctx.fillStyle="rgba(242,114,44,"+.3+pw*.4+")";
    ctx.beginPath();ctx.arc(b.x+this.dx,b.y+this.dy,8+pw*8,0,6.28);ctx.fill();
  }

  // particles
  this.particles.forEach(function(p){
    ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(p.x,p.y,p.sz*p.life,0,6.28);ctx.fill();
  });
  ctx.globalAlpha=1;

  ctx.restore();
};

G.loop=function(){this.update();this.draw();requestAnimationFrame(function(){G.loop()})};

// Init
G._hb=gLB().reduce(function(a,b){return Math.max(a,b.score)},0);
G.init();G._ib();G.loop();

})();
