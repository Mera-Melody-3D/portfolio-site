/* melody line: bars move like a sound wave and rise where the pointer is */
(function(){var w=document.querySelector('.wave');if(!w)return;var N=innerWidth<761?36:72,b=[],mx=-1,on=false,rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
for(var i=0;i<N;i++){var e=document.createElement('i');w.appendChild(e);b.push(e)}
w.addEventListener('pointermove',function(e){var r=w.getBoundingClientRect();mx=(e.clientX-r.left)/r.width});
w.addEventListener('pointerleave',function(){mx=-1});
function f(t){if(!on)return;t/=1000;for(var i=0;i<N;i++){var p=i/N,v=.28+.22*Math.sin(p*9+t*1.6)+.14*Math.sin(p*23-t*2.3);if(mx>=0){var d=p-mx;v+=.5*Math.exp(-d*d*260)}b[i].style.transform='scaleY('+Math.max(.06,Math.min(1,v))+')'}if(!rm)requestAnimationFrame(f)}
new IntersectionObserver(function(en){on=en[0].isIntersecting;if(on)requestAnimationFrame(f)}).observe(w)})();
