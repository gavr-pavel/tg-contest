(window.webpackJsonp=window.webpackJsonp||[]).push([[3],{49:function(t,e,a){"use strict";a.r(e),a.d(e,"getInputPasswordSRP",(function(){return n}));var c=a(37),r=a(38);async function n(t,e){return await async function(t,e){const{srp_B:a,srp_id:i}=e,{p:s,salt1:o,salt2:b}=e.current_algo,j=new Uint8Array([e.current_algo.g]),O=Object(c.a)(s),w=Object(c.a)(a),u=Object(c.c)(0),d=new Uint8Array(256);d.set(j),d.reverse();const l=new Uint8Array(Object(c.e)(256)),y=Object(c.a)(l),p=await Object(c.i)(j,l,s),[f,m,A]=await Promise.all([n((new TextEncoder).encode(t),o,b),Object(r.f)(Object(c.d)(p,a)),Object(r.f)(Object(c.d)(s,d))]),B=await Object(c.i)(j,f,s),P=Object(c.a)(A).multiply(Object(c.a)(B)).mod(O);let _=w.subtract(P).mod(O);_.compareTo(u)<0&&(_=_.add(O));const g=y.add(Object(c.a)(m).multiply(Object(c.a)(f))).toByteArray(),v=await Object(c.i)(_.toByteArray(),g,s),U=new Uint8Array(256);U.set(v);const[h,K,k,D,F]=await Promise.all([Object(r.f)(U),Object(r.f)(s),Object(r.f)(d),Object(r.f)(o),Object(r.f)(b)]),J=await Object(r.f)(Object(c.d)(Object(c.l)(K,k),D,F,p,a,h));return{srp_id:i,A:p,M1:J}}(t,e);async function a(t,e){return await Object(r.f)(Object(c.d)(e,t,e))}async function n(t,e,c){const r=await a(await a(t,e),c),n=await crypto.subtle.importKey("raw",r,"PBKDF2",!1,["deriveBits"]);return a(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-512",salt:e,iterations:1e5},n,512),c)}}}}]);