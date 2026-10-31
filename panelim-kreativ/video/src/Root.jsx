import React from 'react';
import {AbsoluteFill, Composition, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
const scenes = [
  {small:'HƏR GÜN EYNİ SUAL?', title:'Bu gün kim işdədir?', sub:'Davamiyyəti bir baxışda izləyin.', icon:'✓'},
  {small:'PLANLAMA', title:'Növbələr artıq aydındır.', sub:'Komandanızın qrafiki bir yerdə.', icon:'▦'},
  {small:'AY SONU', title:'Hesablaşmanı sadələşdirin.', sub:'Saatlar, avanslar və xülasə.', icon:'₼'},
  {small:'KOMANDANIZ ÜÇÜN', title:'İşinizi bir paneldən idarə edin.', sub:'Panelim.az — tezliklə', icon:'P'},
];
const Scene=({data})=>{const frame=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame,fps,config:{damping:18}});return <AbsoluteFill style={{background:'linear-gradient(145deg,#101b32,#17354a)',color:'#fff',fontFamily:'Arial,sans-serif',padding:80,justifyContent:'center',overflow:'hidden'}}><div style={{position:'absolute',right:-170,top:-100,width:650,height:650,borderRadius:'50%',background:'#47e4c0',opacity:.12,transform:`scale(${.8+p*.2})`}}/><div style={{fontWeight:700,fontSize:28,letterSpacing:5,color:'#6ce8c9',opacity:p}}>{data.small}</div><div style={{fontWeight:800,fontSize:82,lineHeight:1.12,marginTop:35,transform:`translateY(${interpolate(p,[0,1],[70,0])}px)`,opacity:p}}>{data.title}</div><div style={{fontSize:38,lineHeight:1.4,color:'#c4d8de',marginTop:32,opacity:p}}>{data.sub}</div><div style={{marginTop:75,width:170,height:170,borderRadius:48,background:'#76e8c8',color:'#102c3b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:110,fontWeight:800,transform:`scale(${p})`}}>{data.icon}</div><div style={{position:'absolute',bottom:95,left:80,fontSize:34,fontWeight:800,letterSpacing:1}}>panelim.az</div></AbsoluteFill>};
const Video=()=> <AbsoluteFill>{scenes.map((data,i)=><Sequence key={i} from={i*105} durationInFrames={105}><Scene data={data}/></Sequence>)}</AbsoluteFill>;
export const Root=()=> <Composition id="Panelim" component={Video} durationInFrames={420} fps={30} width={1080} height={1920}/>;
