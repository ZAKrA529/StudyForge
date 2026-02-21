import { useState, useEffect, useRef } from "react";

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  dark:  { bg:"#0a0a0f", surface:"#111118", s2:"#1a1a25", s3:"#22223a", border:"#2a2a45", gold:"#FFD700", red:"#c0392b", blue:"#00d4ff", text:"#e8e8ff", muted:"#7777aa", ok:"#00ff88", warn:"#ff8800" },
  light: { bg:"#f0f0f8", surface:"#ffffff",  s2:"#e8e8f5", s3:"#d8d8ee", border:"#c0c0dd", gold:"#b8860b", red:"#c0392b", blue:"#0088aa", text:"#1a1a2e", muted:"#555577", ok:"#007744", warn:"#cc6600" },
};

// ─── CHESS ENGINE ─────────────────────────────────────────────────────────────
const INIT_BOARD = [
  ["bR","bN","bB","bQ","bK","bB","bN","bR"],
  ["bP","bP","bP","bP","bP","bP","bP","bP"],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ["wP","wP","wP","wP","wP","wP","wP","wP"],
  ["wR","wN","wB","wQ","wK","wB","wN","wR"],
];
const GLYPHS = { wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙", bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟" };
const col = p => p ? p[0] : null;
const opp = c => c==="w"?"b":"w";

function getLegalMoves(board, r, c, lastMove, castling) {
  const piece = board[r][c]; if (!piece) return [];
  const color = piece[0], type = piece[1];
  const moves = [];
  const inBounds = (r,c) => r>=0&&r<8&&c>=0&&c<8;
  const empty = (r,c) => inBounds(r,c) && !board[r][c];
  const enemy = (r,c) => inBounds(r,c) && board[r][c] && board[r][c][0]!==color;
  const slide = (dr,dc) => { let nr=r+dr,nc=c+dc; while(inBounds(nr,nc)){if(board[nr][nc]){if(board[nr][nc][0]!==color)moves.push([nr,nc]); break;} moves.push([nr,nc]); nr+=dr; nc+=dc; }};

  if (type==="P") {
    const dir = color==="w"?-1:1, startRow = color==="w"?6:1;
    if (empty(r+dir,c)) { moves.push([r+dir,c]); if (r===startRow && empty(r+2*dir,c)) moves.push([r+2*dir,c]); }
    if (enemy(r+dir,c-1)) moves.push([r+dir,c-1]);
    if (enemy(r+dir,c+1)) moves.push([r+dir,c+1]);
    // En passant
    if (lastMove && lastMove.piece[1]==="P" && Math.abs(lastMove.from[0]-lastMove.to[0])===2) {
      if (lastMove.to[0]===r && Math.abs(lastMove.to[1]-c)===1) moves.push([r+dir, lastMove.to[1]]);
    }
  }
  if (type==="N") { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>{ if(inBounds(r+dr,c+dc)&&(!board[r+dr][c+dc]||board[r+dr][c+dc][0]!==color))moves.push([r+dr,c+dc]); }); }
  if (type==="B") { [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  if (type==="R") { [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  if (type==="Q") { [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  if (type==="K") {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>{ if(inBounds(r+dr,c+dc)&&(!board[r+dr][c+dc]||board[r+dr][c+dc][0]!==color))moves.push([r+dr,c+dc]); });
    // Castling
    const row = color==="w"?7:0;
    if (r===row && c===4) {
      if (castling[color].kingSide && !board[row][5] && !board[row][6]) moves.push([row,6]);
      if (castling[color].queenSide && !board[row][3] && !board[row][2] && !board[row][1]) moves.push([row,2]);
    }
  }
  return moves;
}

function isInCheck(board, color) {
  let kr=-1,kc=-1;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]===color+"K"){kr=r;kc=c;}
  if(kr===-1) return false;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if(board[r][c]&&board[r][c][0]===opp(color)) {
      const m = getLegalMoves(board,r,c,null,{w:{kingSide:false,queenSide:false},b:{kingSide:false,queenSide:false}});
      if(m.some(([mr,mc])=>mr===kr&&mc===kc)) return true;
    }
  }
  return false;
}

function applyMove(board, from, to, lastMove, castling, promotion="Q") {
  const nb = board.map(r=>[...r]);
  const piece = nb[from[0]][from[1]];
  const color = piece[0], type = piece[1];
  const newCastling = { w:{...castling.w}, b:{...castling.b} };

  // Castling move
  if (type==="K") {
    newCastling[color] = {kingSide:false,queenSide:false};
    if (Math.abs(to[1]-from[1])===2) {
      if (to[1]===6) { nb[to[0]][5]=color+"R"; nb[to[0]][7]=null; }
      if (to[1]===2) { nb[to[0]][3]=color+"R"; nb[to[0]][0]=null; }
    }
  }
  if (type==="R") {
    if (from[1]===7) newCastling[color].kingSide=false;
    if (from[1]===0) newCastling[color].queenSide=false;
  }
  // En passant capture
  if (type==="P" && from[1]!==to[1] && !nb[to[0]][to[1]]) nb[from[0]][to[1]]=null;
  // Promotion
  nb[to[0]][to[1]] = (type==="P" && (to[0]===0||to[0]===7)) ? color+promotion : piece;
  nb[from[0]][from[1]] = null;
  return { board: nb, castling: newCastling };
}

function filterLegal(board, r, c, moves, lastMove, castling, color) {
  return moves.filter(([tr,tc]) => {
    const { board: nb } = applyMove(board,[r,c],[tr,tc],lastMove,castling);
    return !isInCheck(nb, color);
  });
}

function hasAnyLegal(board, color, lastMove, castling) {
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if(board[r][c]&&board[r][c][0]===color) {
      const raw = getLegalMoves(board,r,c,lastMove,castling);
      if(filterLegal(board,r,c,raw,lastMove,castling,color).length>0) return true;
    }
  }
  return false;
}

// ─── UNIT CONVERTER ──────────────────────────────────────────────────────────
const UNITS = {
  length: { m:1, km:1000, cm:0.01, mm:0.001, mi:1609.34, ft:0.3048, inch:0.0254 },
  mass:   { kg:1, g:0.001, mg:0.000001, lb:0.453592, oz:0.0283495, t:1000 },
  temp:   { C:1, F:1, K:1 },
  speed:  { "m/s":1, "km/h":1/3.6, mph:0.44704, knot:0.514444 },
  area:   { "m²":1, "km²":1e6, "cm²":0.0001, "ft²":0.092903, acre:4046.86 },
  volume: { L:1, mL:0.001, "m³":1000, "ft³":28.3168, gal:3.78541 },
};
const CONSTANTS = [
  { name:"Velocidad de la luz", symbol:"c", value:"299,792,458 m/s" },
  { name:"Constante de Planck", symbol:"h", value:"6.626×10⁻³⁴ J·s" },
  { name:"Número de Avogadro", symbol:"Nₐ", value:"6.022×10²³ mol⁻¹" },
  { name:"Constante gravitacional", symbol:"G", value:"6.674×10⁻¹¹ N·m²/kg²" },
  { name:"Carga del electrón", symbol:"e", value:"1.602×10⁻¹⁹ C" },
  { name:"Constante de Boltzmann", symbol:"k", value:"1.381×10⁻²³ J/K" },
  { name:"Constante de los gases", symbol:"R", value:"8.314 J/(mol·K)" },
  { name:"Masa del electrón", symbol:"mₑ", value:"9.109×10⁻³¹ kg" },
  { name:"Número π", symbol:"π", value:"3.14159265358979..." },
  { name:"Número de Euler", symbol:"e", value:"2.71828182845904..." },
];

// ─── BIBLIOGRAPHY FORMATS ────────────────────────────────────────────────────
function genAPA(b) {
  if(b.type==="book") return `${b.author} (${b.year}). *${b.title}*. ${b.publisher}.`;
  if(b.type==="article") return `${b.author} (${b.year}). ${b.title}. *${b.journal}*, ${b.volume}(${b.issue}), ${b.pages}.`;
  return `${b.author} (${b.year}). *${b.title}*. Recuperado de ${b.url}`;
}
function genMLA(b) {
  if(b.type==="book") return `${b.author}. *${b.title}*. ${b.publisher}, ${b.year}.`;
  if(b.type==="article") return `${b.author}. "${b.title}." *${b.journal}* ${b.volume}.${b.issue} (${b.year}): ${b.pages}.`;
  return `${b.author}. "${b.title}." Web. ${b.year}. <${b.url}>.`;
}
function genChicago(b) {
  if(b.type==="book") return `${b.author}. *${b.title}*. ${b.publisher}, ${b.year}.`;
  if(b.type==="article") return `${b.author}. "${b.title}." *${b.journal}* ${b.volume}, no. ${b.issue} (${b.year}): ${b.pages}.`;
  return `${b.author}. "${b.title}." Last modified ${b.year}. ${b.url}.`;
}

// ─── MIND MAP ─────────────────────────────────────────────────────────────────
function MindMap({ t }) {
  const [nodes, setNodes] = useState([{ id:1, text:"Tema central", x:300, y:200, parentId:null, color:"#FFD700" }]);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [offset, setOffset] = useState({x:0,y:0});
  const [newText, setNewText] = useState("");
  const svgRef = useRef();

  const addNode = () => {
    if (!selected || !newText) return;
    const parent = nodes.find(n=>n.id===selected);
    const colors = [t.gold, t.blue, t.red, t.ok, t.warn, "#aa44ff"];
    setNodes(p=>[...p, { id:Date.now(), text:newText, x:parent.x+120, y:parent.y+40*(p.length%5), parentId:selected, color:colors[p.length%colors.length] }]);
    setNewText("");
  };

  const onMouseDown = (e, id) => {
    e.stopPropagation();
    setSelected(id);
    const node = nodes.find(n=>n.id===id);
    setDragging(id);
    setOffset({x:e.clientX-node.x, y:e.clientY-node.y});
  };
  const onMouseMove = (e) => {
    if(!dragging) return;
    setNodes(p=>p.map(n=>n.id===dragging?{...n,x:e.clientX-offset.x,y:e.clientY-offset.y}:n));
  };
  const onMouseUp = () => setDragging(null);

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <input style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:"6px 10px",color:t.text,fontSize:13,flex:1}} placeholder="Texto del nuevo nodo" value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNode()} />
        <button onClick={addNode} style={{background:t.gold,color:"#000",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700}}>+ Nodo</button>
        <button onClick={()=>selected&&setNodes(p=>{ const remove=(id)=>{const children=p.filter(n=>n.parentId===id);children.forEach(c=>remove(c.id));return p.filter(n=>n.id!==id&&n.parentId!==id);}; if(selected===1)return p; return p.filter(n=>n.id!==selected&&n.parentId!==selected); })} style={{background:t.red,color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer"}}>Eliminar</button>
        <span style={{color:t.muted,fontSize:12,alignSelf:"center"}}>Click=seleccionar · Arrastrar=mover · Selecciona un nodo y escribe para agregar hijo</span>
      </div>
      <svg ref={svgRef} width="100%" height={420} style={{background:t.s2,borderRadius:12,border:`1px solid ${t.border}`,cursor:"grab"}}
        onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
        {nodes.filter(n=>n.parentId).map(n=>{
          const p=nodes.find(x=>x.id===n.parentId);
          return p?<line key={`l${n.id}`} x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke={n.color} strokeWidth={2} strokeOpacity={0.6}/>:null;
        })}
        {nodes.map(n=>(
          <g key={n.id} onMouseDown={e=>onMouseDown(e,n.id)} style={{cursor:"grab"}}>
            <ellipse cx={n.x} cy={n.y} rx={Math.max(50,n.text.length*5)} ry={22} fill={n.id===selected?`${n.color}55`:`${n.color}22`} stroke={n.color} strokeWidth={n.id===selected?2.5:1.5}/>
            <text x={n.x} y={n.y+5} textAnchor="middle" fill={n.color} fontSize={13} fontWeight={700} style={{userSelect:"none",pointerEvents:"none"}}>{n.text}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── STUDY GROUP ─────────────────────────────────────────────────────────────
function StudyGroup({ t, currentUser, users }) {
  const [groups, setGroups] = useState(() => { try { return JSON.parse(localStorage.getItem("sf_groups")||"[]"); } catch{return[];} });
  const [activeGroup, setActiveGroup] = useState(null);
  const [form, setForm] = useState({name:"",topic:"",members:[]});
  const [boardText, setBoardText] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(()=>{ localStorage.setItem("sf_groups",JSON.stringify(groups)); },[groups]);

  const createGroup = () => {
    if(!form.name) return;
    const g = { id:Date.now(), name:form.name, topic:form.topic, creator:currentUser.email, members:[currentUser.email,...form.members], board:"", messages:[], topics:[], created:new Date().toISOString() };
    setGroups(p=>[...p,g]);
    setForm({name:"",topic:"",members:[]});
  };

  const sendMsg = () => {
    if(!msg.trim()||!activeGroup) return;
    setGroups(p=>p.map(g=>g.id===activeGroup.id?{...g,messages:[...g.messages,{from:currentUser.name,text:msg,ts:new Date().toISOString()}]}:g));
    setMsg("");
  };

  const saveBoard = () => {
    if(!activeGroup) return;
    setGroups(p=>p.map(g=>g.id===activeGroup.id?{...g,board:boardText}:g));
  };

  const ag = activeGroup ? groups.find(g=>g.id===activeGroup.id) : null;

  return (
    <div>
      {!ag ? (
        <>
          <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{fontWeight:700,marginBottom:8,color:t.gold}}>Crear grupo de estudio</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <input style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13}} placeholder="Nombre del grupo *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
              <input style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13}} placeholder="Tema principal" value={form.topic} onChange={e=>setForm(p=>({...p,topic:e.target.value}))} />
            </div>
            <div style={{marginTop:8,marginBottom:8,color:t.muted,fontSize:12}}>Invitar miembros:</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {Object.values(users).filter(u=>u.email!==currentUser.email).map(u=>(
                <div key={u.email} onClick={()=>setForm(p=>({...p,members:p.members.includes(u.email)?p.members.filter(m=>m!==u.email):[...p.members,u.email]}))}
                  style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${form.members.includes(u.email)?t.gold:t.border}`,background:form.members.includes(u.email)?`${t.gold}22`:"transparent",cursor:"pointer",fontSize:12,color:form.members.includes(u.email)?t.gold:t.muted}}>
                  {u.name}
                </div>
              ))}
            </div>
            <button onClick={createGroup} style={{background:t.gold,color:"#000",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontWeight:700,marginTop:12}}>Crear grupo</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
            {groups.filter(g=>g.members.includes(currentUser.email)).map(g=>(
              <div key={g.id} onClick={()=>{ setActiveGroup(g); setBoardText(g.board); }} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,cursor:"pointer"}}>
                <div style={{fontWeight:700,color:t.gold,marginBottom:4}}>👥 {g.name}</div>
                <div style={{color:t.muted,fontSize:12,marginBottom:6}}>{g.topic}</div>
                <div style={{fontSize:12}}>{g.members.length} miembros · {g.messages.length} mensajes</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <button onClick={()=>setActiveGroup(null)} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,padding:"6px 12px",color:t.muted,cursor:"pointer",marginBottom:12}}>← Volver</button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <div style={{fontWeight:700,color:t.gold,marginBottom:8}}>💬 Chat del grupo</div>
              <div style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,height:280,overflowY:"auto",padding:12,marginBottom:8}}>
                {ag.messages.map((m,i)=>(
                  <div key={i} style={{marginBottom:8}}>
                    <span style={{color:t.gold,fontSize:12,fontWeight:700}}>{m.from}</span>
                    <span style={{color:t.muted,fontSize:11,marginLeft:6}}>{new Date(m.ts).toLocaleTimeString()}</span>
                    <div style={{fontSize:13,marginTop:2}}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <input style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13,flex:1}} value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Mensaje..." />
                <button onClick={sendMsg} style={{background:t.gold,color:"#000",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:700}}>➤</button>
              </div>
            </div>
            <div>
              <div style={{fontWeight:700,color:t.gold,marginBottom:8}}>📋 Pizarra compartida</div>
              <textarea value={boardText} onChange={e=>setBoardText(e.target.value)} style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:12,color:t.text,fontSize:13,width:"100%",height:280,resize:"none",boxSizing:"border-box"}} placeholder="Escribe apuntes, fórmulas, temas a repasar..."/>
              <button onClick={saveBoard} style={{background:t.blue,color:"#000",border:"none",borderRadius:8,padding:"6px 16px",cursor:"pointer",fontWeight:700,marginTop:8}}>💾 Guardar pizarra</button>
            </div>
          </div>
          <div style={{marginTop:16}}>
            <div style={{fontWeight:700,color:t.gold,marginBottom:8}}>👥 Miembros</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {ag.members.map(email=>{
                const u=users[email];
                return u?(<div key={email} style={{background:`${t.gold}22`,border:`1px solid ${t.gold}44`,borderRadius:20,padding:"4px 12px",fontSize:12}}>
                  {u.name} <span style={{color:t.muted}}>· {u.career}</span>
                </div>):null;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HABIT TRACKER ────────────────────────────────────────────────────────────
function HabitTracker({ t, pomCycles }) {
  const [log, setLog] = useState(() => { try { return JSON.parse(localStorage.getItem("sf_habitlog")||"{}"); } catch{return{};} });
  useEffect(()=>{ localStorage.setItem("sf_habitlog",JSON.stringify(log)); },[log]);

  const today = new Date().toISOString().split("T")[0];
  const days = Array.from({length:28},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-27+i); return d.toISOString().split("T")[0];
  });

  const getColor = (day) => {
    const d = log[day];
    if(!d) return t.s3;
    const score = (d.pomodoros||0)*2 + (d.tasks||0)*3 + (d.manual?5:0);
    if(score>=10) return t.ok;
    if(score>=5) return t.warn;
    return `${t.gold}66`;
  };

  const todayLog = log[today]||{pomodoros:0,tasks:0,manual:false};

  return (
    <div>
      <div style={{marginBottom:16}}>
        <div style={{color:t.muted,fontSize:12,letterSpacing:2,marginBottom:8}}>ACTIVIDAD DE LOS ÚLTIMOS 28 DÍAS</div>
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          {days.map(day=>(
            <div key={day} title={day} style={{width:22,height:22,borderRadius:4,background:getColor(day),cursor:"pointer",border:`1px solid ${t.border}`}}
              onClick={()=>setLog(p=>({...p,[day]:{...todayLog,manual:!todayLog.manual}}))}/>
          ))}
        </div>
        <div style={{display:"flex",gap:12,marginTop:8,fontSize:11,color:t.muted}}>
          <span style={{color:t.s3}}>■ Sin actividad</span>
          <span style={{color:`${t.gold}66`}}>■ Poca</span>
          <span style={{color:t.warn}}>■ Media</span>
          <span style={{color:t.ok}}>■ Alta</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {[
          { label:"Pomodoros hoy", value:pomCycles, color:t.red },
          { label:"Días con actividad", value:Object.keys(log).filter(k=>log[k]&&(log[k].pomodoros>0||log[k].tasks>0||log[k].manual)).length, color:t.ok },
          { label:"Racha actual", value:(()=>{ let streak=0; const sorted=[...days].reverse(); for(const d of sorted){if(log[d]&&(log[d].pomodoros>0||log[d].manual))streak++;else break;} return streak; })(), color:t.gold },
        ].map(({label,value,color})=>(
          <div key={label} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,textAlign:"center"}}>
            <div style={{fontSize:36,fontWeight:900,color,fontFamily:"Orbitron,monospace"}}>{value}</div>
            <div style={{color:t.muted,fontSize:12,marginTop:4}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:16,background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16}}>
        <div style={{color:t.gold,fontWeight:700,marginBottom:8}}>Registrar actividad manual de hoy</div>
        <button onClick={()=>setLog(p=>({...p,[today]:{...todayLog,manual:true}}))} style={{background:t.ok,color:"#000",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontWeight:700}}>✅ Marcar como día de estudio</button>
      </div>
    </div>
  );
}

// ─── EXAM SIMULATOR ──────────────────────────────────────────────────────────
function ExamSimulator({ t }) {
  const [exams, setExams] = useState(() => { try { return JSON.parse(localStorage.getItem("sf_exams")||"[]"); } catch{return[];} });
  const [active, setActive] = useState(null);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [form, setForm] = useState({name:"",time:30,questions:[{q:"",opts:["","","",""],answer:0}]});
  const [creating, setCreating] = useState(false);
  const ivRef = useRef();

  useEffect(()=>{ localStorage.setItem("sf_exams",JSON.stringify(exams)); },[exams]);

  const startExam = (exam) => {
    setActive(exam); setQi(0); setAnswers({}); setFinished(false);
    setTimeLeft(exam.time*60);
    clearInterval(ivRef.current);
    ivRef.current = setInterval(()=>{
      setTimeLeft(p=>{ if(p<=1){ clearInterval(ivRef.current); setFinished(true); return 0; } return p-1; });
    },1000);
  };

  const answer = (idx) => {
    setAnswers(p=>({...p,[qi]:idx}));
    if(qi+1 >= active.questions.length){ clearInterval(ivRef.current); setFinished(true); }
    else setQi(q=>q+1);
  };

  const score = active ? active.questions.filter((q,i)=>answers[i]===q.answer).length : 0;
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const addQ = () => setForm(p=>({...p,questions:[...p.questions,{q:"",opts:["","","",""],answer:0}]}));
  const saveExam = () => {
    if(!form.name) return;
    setExams(p=>[...p,{...form,id:Date.now()}]);
    setCreating(false);
    setForm({name:"",time:30,questions:[{q:"",opts:["","","",""],answer:0}]});
  };

  if(creating) return (
    <div>
      <button onClick={()=>setCreating(false)} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,padding:"6px 12px",color:t.muted,cursor:"pointer",marginBottom:12}}>← Cancelar</button>
      <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <input style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13}} placeholder="Nombre del examen *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input type="number" style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13,width:80}} value={form.time} onChange={e=>setForm(p=>({...p,time:Number(e.target.value)}))} />
            <span style={{color:t.muted,fontSize:13}}>minutos</span>
          </div>
        </div>
        {form.questions.map((q,qi)=>(
          <div key={qi} style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:12,marginBottom:8}}>
            <input style={{background:t.s3,border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 10px",color:t.text,fontSize:13,width:"100%",marginBottom:8,boxSizing:"border-box"}} placeholder={`Pregunta ${qi+1}`} value={q.q} onChange={e=>setForm(p=>({...p,questions:p.questions.map((x,i)=>i===qi?{...x,q:e.target.value}:x)}))} />
            {q.opts.map((opt,oi)=>(
              <div key={oi} style={{display:"flex",gap:6,marginBottom:4,alignItems:"center"}}>
                <input type="radio" checked={q.answer===oi} onChange={()=>setForm(p=>({...p,questions:p.questions.map((x,i)=>i===qi?{...x,answer:oi}:x)}))} style={{accentColor:t.gold}} />
                <input style={{background:t.s3,border:`1px solid ${t.border}`,borderRadius:6,padding:"4px 8px",color:t.text,fontSize:12,flex:1}} placeholder={`Opción ${oi+1}`} value={opt} onChange={e=>setForm(p=>({...p,questions:p.questions.map((x,i)=>i===qi?{...x,opts:x.opts.map((o,j)=>j===oi?e.target.value:o)}:x)}))} />
              </div>
            ))}
          </div>
        ))}
        <div style={{display:"flex",gap:8}}>
          <button onClick={addQ} style={{background:t.s3,color:t.muted,border:`1px solid ${t.border}`,borderRadius:8,padding:"6px 14px",cursor:"pointer"}}>+ Pregunta</button>
          <button onClick={saveExam} style={{background:t.gold,color:"#000",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700}}>Guardar examen</button>
        </div>
      </div>
    </div>
  );

  if(active && !finished) return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
        <div style={{color:t.gold,fontWeight:700}}>{active.name} — Pregunta {qi+1}/{active.questions.length}</div>
        <div style={{fontFamily:"Orbitron,monospace",color:timeLeft<60?t.red:t.gold,fontSize:18}}>{fmt(timeLeft)}</div>
      </div>
      <div style={{height:4,background:t.s3,borderRadius:2,marginBottom:16}}>
        <div style={{height:4,background:t.gold,width:`${((qi)/active.questions.length)*100}%`,borderRadius:2,transition:"width 0.3s"}}/>
      </div>
      <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:24,marginBottom:16}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:20}}>{active.questions[qi].q}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {active.questions[qi].opts.map((opt,i)=>(
            <button key={i} onClick={()=>answer(i)} style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:10,padding:16,cursor:"pointer",color:t.text,fontSize:14,textAlign:"left",transition:"all 0.2s"}}>
              <span style={{color:t.gold,fontWeight:700,marginRight:8}}>{String.fromCharCode(65+i)}.</span>{opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if(active && finished) return (
    <div style={{textAlign:"center",padding:"40px 0"}}>
      <div style={{fontSize:64,marginBottom:16}}>{score/active.questions.length>=0.7?"🏆":"📝"}</div>
      <div style={{fontSize:32,color:t.gold,fontWeight:900,fontFamily:"Orbitron,monospace",marginBottom:8}}>{score}/{active.questions.length}</div>
      <div style={{color:t.muted,marginBottom:24}}>{Math.round(score/active.questions.length*100)}% de respuestas correctas</div>
      <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,textAlign:"left",marginBottom:16}}>
        {active.questions.map((q,i)=>(
          <div key={i} style={{marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${t.border}`}}>
            <div style={{marginBottom:4}}><span style={{color:answers[i]===q.answer?t.ok:t.red,marginRight:6}}>{answers[i]===q.answer?"✓":"✗"}</span>{q.q}</div>
            <div style={{color:t.ok,fontSize:13}}>✓ Correcta: {q.opts[q.answer]}</div>
            {answers[i]!==q.answer&&<div style={{color:t.red,fontSize:13}}>✗ Tu respuesta: {q.opts[answers[i]]??"Sin responder"}</div>}
          </div>
        ))}
      </div>
      <button onClick={()=>setActive(null)} style={{background:t.gold,color:"#000",border:"none",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontWeight:700}}>Volver a exámenes</button>
    </div>
  );

  return (
    <div>
      <button onClick={()=>setCreating(true)} style={{background:t.gold,color:"#000",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontWeight:700,marginBottom:16}}>+ Crear examen</button>
      {exams.length===0&&<div style={{color:t.muted,textAlign:"center",padding:40}}>No hay exámenes creados aún. ¡Crea el primero!</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
        {exams.map(ex=>(
          <div key={ex.id} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16}}>
            <div style={{fontWeight:700,marginBottom:4}}>{ex.name}</div>
            <div style={{color:t.muted,fontSize:13,marginBottom:12}}>{ex.questions.length} preguntas · {ex.time} min</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>startExam(ex)} style={{background:t.gold,color:"#000",border:"none",borderRadius:8,padding:"6px 16px",cursor:"pointer",fontWeight:700,flex:1}}>▶ Iniciar</button>
              <button onClick={()=>setExams(p=>p.filter(e=>e.id!==ex.id))} style={{background:"transparent",border:`1px solid ${t.red}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",color:t.red}}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WEEKLY CHALLENGE ────────────────────────────────────────────────────────
const CHALLENGES = [
  { title:"Completa 10 Pomodoros esta semana", metric:"pomodoros", goal:10, pts:50 },
  { title:"Sube 3 recursos al banco", metric:"resources", goal:3, pts:30 },
  { title:"Completa 5 tareas", metric:"tasks", goal:5, pts:40 },
  { title:"Juega 3 partidas de ajedrez", metric:"chess", goal:3, pts:25 },
  { title:"Responde 20 preguntas de trivia", metric:"trivia", goal:20, pts:35 },
];

// ─── MAIN APP ────────────────────────────────────────────────────────────────
const MOTIVATIONAL = [
  "El éxito es la suma de pequeños esfuerzos repetidos cada día.",
  "No cuentes los días, haz que los días cuenten.",
  "La disciplina es el puente entre metas y logros.",
  "Estudia hoy para liderar mañana.",
  "Cada experto fue una vez un principiante.",
  "Tu futuro está creado por lo que haces hoy.",
  "El conocimiento es poder. ¡Adquiérelo!",
  "La educación es el arma más poderosa para cambiar el mundo.",
];

const TRIVIA_Q = [
  {q:"¿Cuál es la derivada de x²?",opts:["2x","x","2","x²"],a:0,cat:"académico"},
  {q:"¿Quién desarrolló la teoría de la relatividad?",opts:["Newton","Einstein","Tesla","Bohr"],a:1,cat:"académico"},
  {q:"¿Qué lenguaje creó Guido van Rossum?",opts:["Java","C++","Python","Ruby"],a:2,cat:"académico"},
  {q:"¿Cuántos huesos tiene el cuerpo humano adulto?",opts:["206","180","220","195"],a:0,cat:"académico"},
  {q:"¿Cuál es la fórmula del agua?",opts:["H₂O","CO₂","NaCl","O₂"],a:0,cat:"académico"},
  {q:"¿Quién escribió 'Cien años de soledad'?",opts:["Borges","Neruda","García Márquez","Vargas Llosa"],a:2,cat:"cultura"},
  {q:"¿En qué año salió la primera película de Iron Man?",opts:["2006","2008","2010","2012"],a:1,cat:"cultura"},
  {q:"¿Cuántos jugadores tiene un equipo de fútbol?",opts:["10","11","12","9"],a:1,cat:"cultura"},
  {q:"¿Qué significa HTML?",opts:["HyperText Markup Language","High Tech Modern Language","HyperText Modern Links","HyperText Machine Language"],a:0,cat:"académico"},
  {q:"¿Cuál es el planeta más grande del sistema solar?",opts:["Saturno","Neptuno","Júpiter","Urano"],a:2,cat:"académico"},
  {q:"¿Quién pintó la Mona Lisa?",opts:["Van Gogh","Da Vinci","Picasso","Rembrandt"],a:1,cat:"cultura"},
  {q:"¿Cuántos bits hay en un byte?",opts:["4","8","16","2"],a:1,cat:"académico"},
];

const MAGIC_8 = ["Sí, definitivamente","Sin duda","Puedes contar con ello","Muy probablemente","Las perspectivas son buenas","Concéntrate y pregunta de nuevo","No puedo predecirlo ahora","Mejor no decirte ahora","No cuentes con ello","Mis fuentes dicen que no","Las perspectivas no son buenas","Muy dudoso"];

const WORD_LIST = ["calculo","algebra","fisica","quimica","biologia","historia","filosofia","economia","derecho","medicina","ingenieria","literatura","estadistica","geometria"];

export default function StudyForge() {
  const [dark, setDark] = useState(true);
  const t = dark ? T.dark : T.light;

  // Auth
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState({});
  const [authMode, setAuthMode] = useState("login");
  const [af, setAf] = useState({name:"",email:"",password:"",career:"",year:"1",courses:""});
  const [authErr, setAuthErr] = useState("");

  // Nav
  const [sec, setSec] = useState("home");
  const [notif, setNotif] = useState("");

  // Channels
  const [channels, setChannels] = useState([{id:"general",name:"general",desc:"Canal principal",messages:[],polls:[]},{id:"dudas",name:"dudas",desc:"Para preguntas",messages:[],polls:[]}]);
  const [activeCh, setActiveCh] = useState("general");
  const [chatMsg, setChatMsg] = useState("");
  const [showNewCh, setShowNewCh] = useState(false);
  const [newChForm, setNewChForm] = useState({name:"",desc:""});
  const [pollForm, setPollForm] = useState({question:"",options:["",""]});
  const [showPoll, setShowPoll] = useState(false);
  const [dmTarget, setDmTarget] = useState(null);
  const [dms, setDms] = useState({});
  const [dmMsg, setDmMsg] = useState("");
  const [showDM, setShowDM] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({title:"",desc:"",subject:"",due:"",priority:"media"});

  // Calendar
  const [events, setEvents] = useState([]);
  const [evForm, setEvForm] = useState({title:"",desc:"",date:"",time:"",type:"examen"});
  const [calMonth, setCalMonth] = useState(new Date());

  // Pomodoro
  const [pom, setPom] = useState({running:false,mode:"work",left:25*60,cycles:0,subject:""});
  const pomRef = useRef(null);

  // Notes
  const [notes, setNotes] = useState([]);
  const [noteForm, setNoteForm] = useState({title:"",content:"",subject:"",color:"#FFD700"});

  // Flashcards
  const [decks, setDecks] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [newDeck, setNewDeck] = useState({name:"",subject:"",cards:[{front:"",back:""}]});

  // GPA
  const [gpaSubs, setGpaSubs] = useState([{name:"",grade:"",credits:""}]);
  const [examCalc, setExamCalc] = useState([{name:"",grade:"",weight:""}]);
  const [examTarget, setExamTarget] = useState(70);

  // Attendance
  const [attendance, setAttendance] = useState({});
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);

  // Timetable
  const [timetable, setTimetable] = useState({});
  const [ttForm, setTtForm] = useState({subject:"",professor:"",room:"",day:"Lunes",start:"08:00",end:"10:00"});

  // Resources
  const [resources, setResources] = useState([]);
  const [resForm, setResForm] = useState({title:"",url:"",subject:"",career:""});

  // Calculator
  const [calcIn, setCalcIn] = useState("");
  const [calcOut, setCalcOut] = useState("");
  const [calcHist, setCalcHist] = useState([]);
  const [calcMode, setCalcMode] = useState("scientific");
  const [graphFns, setGraphFns] = useState(["Math.sin(x)","x*x/10"]);
  const [graphIn, setGraphIn] = useState("");
  const canvasRef = useRef();

  // Bibliography
  const [bibForm, setBibForm] = useState({type:"book",author:"",title:"",year:"",publisher:"",journal:"",volume:"",issue:"",pages:"",url:""});
  const [bibRefs, setBibRefs] = useState([]);
  const [bibFormat, setBibFormat] = useState("APA");

  // Unit converter
  const [unitCat, setUnitCat] = useState("length");
  const [unitFrom, setUnitFrom] = useState("m");
  const [unitTo, setUnitTo] = useState("km");
  const [unitVal, setUnitVal] = useState("1");

  // Diary
  const [diary, setDiary] = useState([]);
  const [diaryEntry, setDiaryEntry] = useState({learned:"",struggled:"",tomorrow:""});
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().split("T")[0]);

  // Mentorship
  const [mentors, setMentors] = useState([]);
  const [mentorSub, setMentorSub] = useState("");

  // Announcements
  const [anns, setAnns] = useState([{id:1,title:"Tutoría de Cálculo disponible",content:"Ofrezco tutorías de Cálculo I y II los viernes. Contactar por DM.",author:"Admin",date:new Date().toISOString()}]);
  const [annForm, setAnnForm] = useState({title:"",content:""});

  // Chess
  const [board, setBoard] = useState(INIT_BOARD.map(r=>[...r]));
  const [selSq, setSelSq] = useState(null);
  const [legalSqs, setLegalSqs] = useState([]);
  const [chessTurn, setChessTurn] = useState("w");
  const [lastMove, setLastMove] = useState(null);
  const [castling, setCastling] = useState({w:{kingSide:true,queenSide:true},b:{kingSide:true,queenSide:true}});
  const [chessMsg, setChessMsg] = useState("Turno: Blancas ♔");
  const [chessStats, setChessStats] = useState({w:0,l:0,d:0,streak:0,max:0});
  const [promotePending, setPromotePending] = useState(null);

  // Trivia
  const [triviaOn, setTriviaOn] = useState(false);
  const [triviaIdx, setTriviaIdx] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaAns, setTriviaAns] = useState(null);
  const [triviaCat, setTriviaCat] = useState("all");
  const [triviaStreak, setTriviaStreak] = useState(0);

  // Games
  const [game, setGame] = useState("chess");
  const [magic8Q, setMagic8Q] = useState("");
  const [magic8A, setMagic8A] = useState("");
  const [hangWord, setHangWord] = useState(()=>WORD_LIST[Math.floor(Math.random()*WORD_LIST.length)]);
  const [hangGuesses, setHangGuesses] = useState([]);
  const [hangIn, setHangIn] = useState("");
  const [hangStatus, setHangStatus] = useState("playing");
  const [roulOpts, setRoulOpts] = useState(["Estudiar","Descansar","Ejercitarse"]);
  const [roulRes, setRoulRes] = useState("");
  const [roulSpin, setRoulSpin] = useState(false);
  const [roulIn, setRoulIn] = useState("");
  const [wordleWord] = useState(()=>WORD_LIST[Math.floor(Math.random()*WORD_LIST.length)]);
  const [wordleGuesses, setWordleGuesses] = useState([]);
  const [wordleIn, setWordleIn] = useState("");
  const [wordleStatus, setWordleStatus] = useState("playing");
  const [shipPlayerGrid, setShipPlayerGrid] = useState(()=>Array(10).fill(null).map(()=>Array(10).fill(0)));
  const [shipEnemyGrid, setShipEnemyGrid] = useState(()=>{
    const g=Array(10).fill(null).map(()=>Array(10).fill(0));
    [5,4,3,3,2].forEach(size=>{let placed=false;while(!placed){const h=Math.random()>0.5;const r=Math.floor(Math.random()*(h?10:10-size));const c=Math.floor(Math.random()*(h?10-size:10));let ok=true;for(let i=0;i<size;i++){if(h?g[r][c+i]!==0:g[r+i][c]!==0){ok=false;break;}}if(ok){for(let i=0;i<size;i++){if(h)g[r][c+i]=1;else g[r+i][c]=1;}placed=true;}}});
    return g;
  });
  const [shipPhase, setShipPhase] = useState("place");
  const [shipMsg, setShipMsg] = useState("Coloca barco de tamaño 5");
  const [shipIdx, setShipIdx] = useState(0);
  const SHIPS = [5,4,3,3,2];

  // Focus
  const [focusOn, setFocusOn] = useState(false);
  const [focusTime, setFocusTime] = useState(25);
  const [focusLeft, setFocusLeft] = useState(0);
  const focusRef = useRef(null);

  // About
  const [about, setAbout] = useState({name:"StudyForge",desc:"La plataforma académica definitiva para estudiantes universitarios.",creator:"Tu nombre aquí",institution:"Universidad de Costa Rica",social:"@studyforge"});
  const [editAbout, setEditAbout] = useState(false);

  // Profile
  const [editProfile, setEditProfile] = useState(false);
  const [profForm, setProfForm] = useState({});

  // Reputation
  const [rep, setRep] = useState({});

  // Challenge progress
  const [chalProgress, setChalProgress] = useState({pomodoros:0,resources:0,tasks:0,chess:0,trivia:0});
  const weekChallenge = CHALLENGES[new Date().getDay()%CHALLENGES.length];

  const chatEnd = useRef();

  // ── PERSISTENCE LOAD ──
  useEffect(()=>{
    const load = (key, setter, def) => { try { const v=localStorage.getItem(key); if(v) setter(JSON.parse(v)); else if(def!==undefined) setter(def); } catch{} };
    const stored = localStorage.getItem("sf_users");
    const SEED = { "zakra@ucr.ac.cr":{ name:"Zakra529", email:"zakra@ucr.ac.cr", password:" ", career:"Electromecánica Industrial", year:"2", courses:"", isAdmin:false, points:0, streak:0, badges:[], joinDate:new Date().toISOString(), bio:"", avatarColor:"#00d4ff", lastActive:new Date().toISOString() }};
    const existing = stored ? JSON.parse(stored) : {};
    const merged = { ...SEED, ...existing };
    setUsers(merged);
    localStorage.setItem("sf_users", JSON.stringify(merged));
    load("sf_tasks", setTasks, []);
    load("sf_channels", setChannels, channels);
    load("sf_events", setEvents, []);
    load("sf_notes", setNotes, []);
    load("sf_decks", setDecks, []);
    load("sf_resources", setResources, []);
    load("sf_diary", setDiary, []);
    load("sf_mentors", setMentors, []);
    load("sf_anns", setAnns, anns);
    load("sf_rep", setRep, {});
    load("sf_dms", setDms, {});
    load("sf_chessStats", setChessStats, {w:0,l:0,d:0,streak:0,max:0});
    load("sf_about", setAbout, about);
    load("sf_bibrefs", setBibRefs, []);
    load("sf_timetable", setTimetable, {});
    load("sf_attendance", setAttendance, {});
    load("sf_chalProgress", setChalProgress, {pomodoros:0,resources:0,tasks:0,chess:0,trivia:0});
  },[]);

  // ── PERSISTENCE SAVE ──
  useEffect(()=>{ localStorage.setItem("sf_users",JSON.stringify(users)); },[users]);
  useEffect(()=>{ localStorage.setItem("sf_tasks",JSON.stringify(tasks)); },[tasks]);
  useEffect(()=>{ localStorage.setItem("sf_channels",JSON.stringify(channels)); },[channels]);
  useEffect(()=>{ localStorage.setItem("sf_events",JSON.stringify(events)); },[events]);
  useEffect(()=>{ localStorage.setItem("sf_notes",JSON.stringify(notes)); },[notes]);
  useEffect(()=>{ localStorage.setItem("sf_decks",JSON.stringify(decks)); },[decks]);
  useEffect(()=>{ localStorage.setItem("sf_resources",JSON.stringify(resources)); },[resources]);
  useEffect(()=>{ localStorage.setItem("sf_diary",JSON.stringify(diary)); },[diary]);
  useEffect(()=>{ localStorage.setItem("sf_mentors",JSON.stringify(mentors)); },[mentors]);
  useEffect(()=>{ localStorage.setItem("sf_anns",JSON.stringify(anns)); },[anns]);
  useEffect(()=>{ localStorage.setItem("sf_rep",JSON.stringify(rep)); },[rep]);
  useEffect(()=>{ localStorage.setItem("sf_dms",JSON.stringify(dms)); },[dms]);
  useEffect(()=>{ localStorage.setItem("sf_chessStats",JSON.stringify(chessStats)); },[chessStats]);
  useEffect(()=>{ localStorage.setItem("sf_about",JSON.stringify(about)); },[about]);
  useEffect(()=>{ localStorage.setItem("sf_bibrefs",JSON.stringify(bibRefs)); },[bibRefs]);
  useEffect(()=>{ localStorage.setItem("sf_timetable",JSON.stringify(timetable)); },[timetable]);
  useEffect(()=>{ localStorage.setItem("sf_attendance",JSON.stringify(attendance)); },[attendance]);
  useEffect(()=>{ localStorage.setItem("sf_chalProgress",JSON.stringify(chalProgress)); },[chalProgress]);

  useEffect(()=>{ if(chatEnd.current) chatEnd.current.scrollIntoView({behavior:"smooth"}); },[channels, activeCh, showDM]);
  useEffect(()=>{ if(canvasRef.current && sec==="calculator" && calcMode==="graph") drawGraph(); },[graphFns, sec, calcMode, dark]);

  // ── HELPERS ──
  const toast = (msg) => { setNotif(msg); setTimeout(()=>setNotif(""),3000); };
  const addRep = (email, pts) => setRep(p=>({...p,[email]:(p[email]||0)+pts}));
  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const upcoming = events.filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,5);
  const daysUntil = d => Math.ceil((new Date(d)-new Date())/(86400000));
  const isFirstUser = user && Object.keys(users)[0]===user.email;
  const BLOCKED = ["games","trivia","confessions"];

  // ── AUTH ──
  const handleAuth = () => {
    setAuthErr("");
    if(authMode==="register"){
      if(!af.name||!af.email||!af.password||!af.career){ setAuthErr("Completa todos los campos obligatorios"); return; }
      const ucrReg = /^[A-Za-z]+\.[A-Za-z]+@ucr\.ac\.cr$/;
      if(!ucrReg.test(af.email)){ setAuthErr("El correo debe tener el formato Nombre.Apellido@ucr.ac.cr"); return; }
      if(users[af.email]){ setAuthErr("Este correo ya está registrado"); return; }
      const isAdmin = Object.keys(users).length===0;
      const nu = {...af, isAdmin, points:0, streak:0, badges:[], joinDate:new Date().toISOString(), bio:"", avatarColor:"#FFD700", lastActive:new Date().toISOString()};
      setUsers(p=>({...p,[af.email]:nu}));
      setUser(nu);
      toast(`¡Bienvenido a StudyForge, ${af.name}! 🚀`);
    } else {
      const u = users[af.email];
      if(!u||u.password!==af.password){ setAuthErr("Credenciales incorrectas"); return; }
      const up = {...u, lastActive:new Date().toISOString()};
      setUsers(p=>({...p,[af.email]:up}));
      setUser(up);
      toast(`¡Bienvenido de vuelta, ${u.name}! 💫`);
    }
  };

  // ── POMODORO ──
  const startPom = () => {
    if(pomRef.current) return;
    pomRef.current = setInterval(()=>{
      setPom(p=>{
        if(p.left<=1){
          clearInterval(pomRef.current); pomRef.current=null;
          const nc = p.mode==="work"?p.cycles+1:p.cycles;
          if(p.mode==="work"){ addRep(user?.email,5); setChalProgress(cp=>({...cp,pomodoros:cp.pomodoros+1})); toast("¡Pomodoro completado! +5 pts 🎉"); }
          const nm = p.mode==="work"?"break":"work";
          const nt = nm==="work"?25*60:(nc%4===0?15*60:5*60);
          return {...p, running:false, mode:nm, left:nt, cycles:nc};
        }
        return {...p, left:p.left-1};
      });
    },1000);
    setPom(p=>({...p,running:true}));
  };
  const stopPom = () => { clearInterval(pomRef.current); pomRef.current=null; setPom(p=>({...p,running:false})); };
  const resetPom = () => { stopPom(); setPom({running:false,mode:"work",left:25*60,cycles:0,subject:""}); };

  // ── FOCUS ──
  const startFocus = () => {
    setFocusLeft(focusTime*60); setFocusOn(true);
    focusRef.current = setInterval(()=>{ setFocusLeft(p=>{ if(p<=1){ clearInterval(focusRef.current); focusRef.current=null; setFocusOn(false); toast("¡Modo focus terminado! 🏆"); return 0; } return p-1; }); },1000);
  };
  const stopFocus = () => { clearInterval(focusRef.current); focusRef.current=null; setFocusOn(false); };

  // ── CHESS ──
  const handleChessClick = (r, c) => {
    if(promotePending) return;
    const piece = board[r][c];
    if(selSq){
      const [sr,sc] = selSq;
      if(legalSqs.some(([lr,lc])=>lr===r&&lc===c)){
        const moving = board[sr][sc];
        const isPawnPromo = moving[1]==="P" && (r===0||r===7);
        if(isPawnPromo){
          setPromotePending({from:[sr,sc],to:[r,c]});
          setSelSq(null); setLegalSqs([]);
          return;
        }
        doMove([sr,sc],[r,c]);
      } else if(piece && col(piece)===chessTurn){
        const raw = getLegalMoves(board,r,c,lastMove,castling);
        const legal = filterLegal(board,r,c,raw,lastMove,castling,chessTurn);
        setSelSq([r,c]); setLegalSqs(legal);
      } else { setSelSq(null); setLegalSqs([]); }
    } else {
      if(piece && col(piece)===chessTurn){
        const raw = getLegalMoves(board,r,c,lastMove,castling);
        const legal = filterLegal(board,r,c,raw,lastMove,castling,chessTurn);
        setSelSq([r,c]); setLegalSqs(legal);
      }
    }
  };

  const doMove = (from, to, promo="Q") => {
    const {board:nb, castling:nc} = applyMove(board,from,to,lastMove,castling,promo);
    const mv = {piece:board[from[0]][from[1]], from, to};
    const next = opp(chessTurn);
    setBoard(nb); setCastling(nc); setLastMove(mv); setChessTurn(next);
    setSelSq(null); setLegalSqs([]); setPromotePending(null);
    const check = isInCheck(nb,next);
    const hasLegal = hasAnyLegal(nb,next,mv,nc);
    if(!hasLegal){
      if(check){ setChessMsg(next==="w"?"Jaque mate! Negras ganan ♛":"Jaque mate! Blancas ganan ♔"); }
      else { setChessMsg("¡Ahogado! Empate"); }
    } else if(check){
      setChessMsg(`¡Jaque al ${next==="w" ? "Rey blanco" : "Rey negro"}!`);
    } else {
      setChessMsg(`Turno: ${next==="w" ? "Blancas" : "Negras"}`);
    }
    setChalProgress(cp=>({...cp,chess:cp.chess+0.5}));
  };

  const resetChess = (result) => {
    setBoard(INIT_BOARD.map(r=>[...r])); setSelSq(null); setLegalSqs([]); setChessTurn("w");
    setCastling({w:{kingSide:true,queenSide:true},b:{kingSide:true,queenSide:true}});
    setLastMove(null); setPromotePending(null);
    if(result==="w"){ setChessStats(p=>({...p,w:p.w+1,streak:p.streak+1,max:Math.max(p.max,p.streak+1)})); toast("¡Victoria de Blancas! 🏆"); }
    else if(result==="b"){ setChessStats(p=>({...p,l:p.l+1,streak:0})); toast("¡Victoria de Negras!"); }
    else { setChessStats(p=>({...p,d:p.d+1})); }
    setChessMsg("Turno: Blancas ♔");
  };

  // ── TRIVIA ──
  const filteredQ = triviaCat==="all"?TRIVIA_Q:TRIVIA_Q.filter(q=>q.cat===triviaCat);
  const ansTrivia = (idx) => {
    const q = filteredQ[triviaIdx]; setTriviaAns(idx);
    const ok = idx===q.a;
    if(ok){ setTriviaScore(s=>s+1); setTriviaStreak(s=>s+1); addRep(user?.email,3); setChalProgress(cp=>({...cp,trivia:cp.trivia+1})); }
    else setTriviaStreak(0);
    setTimeout(()=>{ if(triviaIdx+1<filteredQ.length){ setTriviaIdx(i=>i+1); setTriviaAns(null); } else { setTriviaOn(false); toast(`Trivia: ${triviaScore+(ok?1:0)}/${filteredQ.length} 🎯`); }},1200);
  };

  // Safe math evaluator (no new Function needed)
  const safeEval = (expr, x) => {
    const e = expr
      .replace(/\bx\b/g, String(x))
      .replace(/\bMath\./g, "")
      .replace(/\bpi\b/gi, String(Math.PI))
      .replace(/\bPI\b/g, String(Math.PI))
      .replace(/\^/g, "**");
    const allowed = /^[\d\s\+\-\*\/\(\)\.\,a-z\_]+$/i;
    if(!allowed.test(e)) throw new Error("Invalid");
    const fns = { sin:Math.sin, cos:Math.cos, tan:Math.tan, asin:Math.asin, acos:Math.acos, atan:Math.atan, sqrt:Math.sqrt, abs:Math.abs, log:Math.log, log10:Math.log10, exp:Math.exp, ceil:Math.ceil, floor:Math.floor, round:Math.round, pow:Math.pow };
    const body = e.replace(/\b(sin|cos|tan|asin|acos|atan|sqrt|abs|log|log10|exp|ceil|floor|round|pow)\b/g, m => `fns.${m}`);
    return eval(body);
  };

  const calcSafeEval = (expr) => {
    const e = expr
      .replace(/π/g, String(Math.PI))
      .replace(/\be\b/g, String(Math.E))
      .replace(/\^/g, "**")
      .replace(/\bln\(/g, "log(")
      .replace(/\blog\(/g, "log10(");
    const fns = { sin:Math.sin, cos:Math.cos, tan:Math.tan, asin:Math.asin, acos:Math.acos, atan:Math.atan, sqrt:Math.sqrt, abs:Math.abs, log:Math.log, log10:Math.log10, exp:Math.exp, ceil:Math.ceil, floor:Math.floor, round:Math.round, pow:Math.pow, PI:Math.PI, E:Math.E };
    const body = e.replace(/\b(sin|cos|tan|asin|acos|atan|sqrt|abs|log|log10|exp|ceil|floor|round|pow)\b/g, m => `fns.${m}`).replace(/\bPI\b/g,"fns.PI").replace(/\bE\b/g,"fns.E");
    return eval(body);
  };

  // ── GRAPH ──
  const drawGraph = () => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const W=canvas.width, H=canvas.height, sc=40;
    ctx.fillStyle=t.surface; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=t.border; ctx.lineWidth=0.5;
    for(let x=0;x<W;x+=sc){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=sc){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.strokeStyle=t.muted; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();
    ctx.fillStyle=t.muted; ctx.font="10px monospace";
    for(let i=-7;i<=7;i++){if(i===0)continue; const px=W/2+i*sc; ctx.fillText(i,px-4,H/2+12); const py=H/2+i*sc; ctx.fillText(-i,W/2+4,py+4);}
    const colors=[t.gold,t.blue,t.red,t.ok,t.warn,"#aa44ff"];
    graphFns.forEach((fn,fi)=>{
      ctx.strokeStyle=colors[fi%colors.length]; ctx.lineWidth=2; ctx.beginPath(); let started=false;
      for(let px=0;px<W;px++){
        const x=(px-W/2)/sc;
        try{
          const y=safeEval(fn,x);
          const py=H/2-y*sc;
          if(!isFinite(y)||Math.abs(py)>H*3){started=false;continue;}
          if(!started){ctx.moveTo(px,py);started=true;}else ctx.lineTo(px,py);
        }catch{started=false;}
      }
      ctx.stroke();
    });
  };

  // ── UNIT CONVERTER ──
  const convertUnit = () => {
    if(unitCat==="temp"){
      const v=parseFloat(unitVal);
      if(unitFrom==="C"&&unitTo==="F") return ((v*9/5)+32).toFixed(4);
      if(unitFrom==="C"&&unitTo==="K") return (v+273.15).toFixed(4);
      if(unitFrom==="F"&&unitTo==="C") return ((v-32)*5/9).toFixed(4);
      if(unitFrom==="F"&&unitTo==="K") return ((v-32)*5/9+273.15).toFixed(4);
      if(unitFrom==="K"&&unitTo==="C") return (v-273.15).toFixed(4);
      if(unitFrom==="K"&&unitTo==="F") return ((v-273.15)*9/5+32).toFixed(4);
      return v.toFixed(4);
    }
    const base = parseFloat(unitVal) * (UNITS[unitCat][unitFrom]||1);
    return (base / (UNITS[unitCat][unitTo]||1)).toFixed(6);
  };

  // ── BATTLESHIP ──
  const attackEnemy = (r,c) => {
    if(shipPhase!=="battle") return;
    if(shipEnemyGrid[r][c]===2||shipEnemyGrid[r][c]===3) return;
    const ng = shipEnemyGrid.map(row=>[...row]);
    const hit = ng[r][c]===1; ng[r][c]=hit?2:3;
    setShipEnemyGrid(ng);
    setShipMsg(hit ? "Impacto! 💥" : "Agua 💧");
    if(ng.flat().filter(v=>v===1).length===0){ setShipMsg("¡Ganaste! 🏆"); setShipPhase("done"); }
  };

  const placeShip = (r,c) => {
    if(shipPhase!=="place") return;
    const size=SHIPS[shipIdx];
    const ng = shipPlayerGrid.map(row=>[...row]);
    if(c+size>10){ setShipMsg("¡No cabe ahí!"); return; }
    for(let i=0;i<size;i++) if(ng[r][c+i]!==0){ setShipMsg("Posición ocupada"); return; }
    for(let i=0;i<size;i++) ng[r][c+i]=1;
    setShipPlayerGrid(ng);
    const ni=shipIdx+1;
    setShipIdx(ni);
    if(ni>=SHIPS.length){ setShipPhase("battle"); setShipMsg("¡A atacar! Haz click en el tablero enemigo"); }
    else setShipMsg(`Coloca barco de tamaño ${SHIPS[ni]}`);
  };

  const resetShip = () => {
    setShipPlayerGrid(Array(10).fill(null).map(()=>Array(10).fill(0)));
    setShipPhase("place"); setShipMsg(`Coloca barco de tamaño ${SHIPS[0]}`); setShipIdx(0);
    const g=Array(10).fill(null).map(()=>Array(10).fill(0));
    [5,4,3,3,2].forEach(size=>{let placed=false;while(!placed){const h=Math.random()>0.5;const r=Math.floor(Math.random()*(h?10:10-size));const c=Math.floor(Math.random()*(h?10-size:10));let ok=true;for(let i=0;i<size;i++){if(h?g[r][c+i]!==0:g[r+i][c]!==0){ok=false;break;}}if(ok){for(let i=0;i<size;i++){if(h)g[r][c+i]=1;else g[r+i][c]=1;}placed=true;}}});
    setShipEnemyGrid(g);
  };

  // ── GPA ──
  const calcGPA = () => { let t=0,c=0; gpaSubs.forEach(s=>{ if(s.grade&&s.credits){ t+=parseFloat(s.grade)*parseFloat(s.credits); c+=parseFloat(s.credits); }}); return c>0?(t/c).toFixed(2):"0.00"; };
  const calcNeeded = () => { let e=0,tw=0; examCalc.forEach(x=>{ if(x.grade&&x.weight){ e+=parseFloat(x.grade)*parseFloat(x.weight)/100; tw+=parseFloat(x.weight); }}); const rem=100-tw; if(rem<=0)return "N/A"; return ((examTarget-e)/(rem/100)).toFixed(1); };
  const attPct = (sub) => { const keys=Object.keys(attendance).filter(k=>k.startsWith(sub+"_")); if(!keys.length)return 100; return Math.round(keys.filter(k=>attendance[k]).length/keys.length*100); };
  const gpa = calcGPA();
  const needed = calcNeeded();

  // ── STYLES ──
  const card = {background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:16,marginBottom:16};
  const inp = {background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13,outline:"none",boxSizing:"border-box"};
  const btn = (bg=t.gold,fg="#000") => ({background:`linear-gradient(135deg,${bg},${bg}cc)`,color:fg,border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:13,letterSpacing:1});
  const btnO = {background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:t.muted,fontSize:12};
  const tag = (c) => ({background:`${c}22`,color:c,border:`1px solid ${c}44`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700,display:"inline-block"});
  const h2 = {color:t.gold,fontSize:22,fontWeight:900,letterSpacing:2,marginBottom:16,textShadow:`0 0 8px ${t.gold}44`,fontFamily:"Orbitron,monospace"};
  const h3 = {color:t.text,fontSize:15,fontWeight:700,marginBottom:8};
  const g2 = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12};
  const wrap = {maxWidth:900,margin:"0 auto"};

  const repBoard = Object.entries(rep).sort((a,b)=>b[1]-a[1]).slice(0,10);

  // ── LOGIN SCREEN ──
  if(!user) return (
    <div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Rajdhani,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{width:440,background:t.surface,border:`1px solid ${t.border}`,borderRadius:16,padding:32,boxShadow:`0 0 40px ${t.gold}22`}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:8}}>⚙️</div>
          <div style={{fontSize:28,fontWeight:900,color:t.gold,letterSpacing:3,fontFamily:"Orbitron",textShadow:`0 0 20px ${t.gold}66`}}>STUDYFORGE</div>
          <div style={{color:t.muted,fontSize:11,letterSpacing:3,marginTop:4}}>PLATAFORMA ACADÉMICA UCR</div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{...btn(authMode===m?t.gold:t.s2,authMode===m?"#000":t.muted),flex:1,padding:10}}>
              {m==="login" ? "Iniciar Sesion" : "Registrarse"}
            </button>
          ))}
        </div>
        {authErr&&<div style={{background:`${t.red}22`,border:`1px solid ${t.red}`,borderRadius:8,padding:10,color:t.red,fontSize:13,marginBottom:12}}>{authErr}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {authMode==="register"&&<>
            <input style={{...inp,width:"100%"}} placeholder="Nombre completo *" value={af.name} onChange={e=>setAf(p=>({...p,name:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Carrera *" value={af.career} onChange={e=>setAf(p=>({...p,career:e.target.value}))} />
            <select style={{...inp,width:"100%"}} value={af.year} onChange={e=>setAf(p=>({...p,year:e.target.value}))}>
              {[1,2,3,4,5,6].map(y=><option key={y} value={y}>{y}° año</option>)}
            </select>
            <input style={{...inp,width:"100%"}} placeholder="Materias (separadas por coma)" value={af.courses} onChange={e=>setAf(p=>({...p,courses:e.target.value}))} />
          </>}
          <input style={{...inp,width:"100%"}} placeholder="Correo (Nombre.Apellido@ucr.ac.cr)" value={af.email} onChange={e=>setAf(p=>({...p,email:e.target.value}))} />
          <input style={{...inp,width:"100%"}} type="password" placeholder="Contraseña *" value={af.password} onChange={e=>setAf(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAuth()} />
          <button onClick={handleAuth} style={{...btn(),padding:12,fontSize:15,letterSpacing:2,width:"100%"}}>
            {authMode==="login"?"⚡ ENTRAR":"🚀 CREAR CUENTA"}
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:16,color:t.muted,fontSize:11,fontStyle:"italic"}}>
          "{MOTIVATIONAL[new Date().getDate()%MOTIVATIONAL.length]}"
        </div>
      </div>
    </div>
  );

  // ── SECTIONS ──
  const renderSection = () => {
    if(focusOn && BLOCKED.includes(sec)) return (
      <div style={{...wrap,textAlign:"center",paddingTop:80}}>
        <div style={{fontSize:64,marginBottom:16}}>🔒</div>
        <div style={h2}>MODO FOCUS ACTIVO</div>
        <div style={{color:t.muted,marginBottom:16}}>Esta sección está bloqueada. Tiempo restante:</div>
        <div style={{fontSize:48,color:t.gold,fontFamily:"Orbitron",marginBottom:24}}>{fmtTime(focusLeft)}</div>
        <button onClick={stopFocus} style={btn(t.red,"#fff")}>Cancelar Focus</button>
      </div>
    );

    switch(sec) {

    // ── HOME ──
    case "home": return (
      <div style={wrap}>
        <div style={h2}>⚡ BIENVENIDO, {user.name.toUpperCase()}</div>
        <div style={{...card,background:`linear-gradient(135deg,${t.s2},${t.s3})`,border:`1px solid ${t.gold}44`}}>
          <div style={{color:t.gold,fontSize:13,letterSpacing:2,marginBottom:6}}>💡 FRASE DEL DÍA</div>
          <div style={{fontSize:15,fontStyle:"italic"}}>"{MOTIVATIONAL[new Date().getDate()%MOTIVATIONAL.length]}"</div>
        </div>
        <div style={g2}>
          <div style={card}>
            <div style={h3}>📋 Tareas pendientes</div>
            <div style={{fontSize:36,color:t.gold,fontWeight:900,fontFamily:"Orbitron"}}>{tasks.filter(x=>!x.done).length}</div>
            {tasks.filter(x=>!x.done).slice(0,3).map(x=><div key={x.id} style={{color:t.muted,fontSize:12,marginTop:3}}>• {x.title}</div>)}
          </div>
          <div style={card}>
            <div style={h3}>📅 Próximos eventos</div>
            {upcoming.slice(0,3).map(ev=>(
              <div key={ev.id} style={{marginBottom:6}}>
                <div style={{fontSize:13}}>{ev.title}</div>
                <span style={tag(daysUntil(ev.date)<=3?t.red:t.blue)}>{daysUntil(ev.date)===0 ? "Hoy!":daysUntil(ev.date)+" días"}</span>
              </div>
            ))}
            {!upcoming.length&&<div style={{color:t.muted,fontSize:13}}>Sin eventos próximos</div>}
          </div>
          <div style={card}>
            <div style={h3}>🍅 Pomodoros hoy</div>
            <div style={{fontSize:36,color:t.gold,fontWeight:900,fontFamily:"Orbitron"}}>{pom.cycles}</div>
            <div style={{color:t.muted,fontSize:13}}>Modo: {pom.mode==="work"?"Trabajo":"Descanso"}</div>
          </div>
          <div style={card}>
            <div style={h3}>⭐ Tu reputación</div>
            <div style={{fontSize:36,color:t.gold,fontWeight:900,fontFamily:"Orbitron"}}>{rep[user.email]||0}</div>
            <div style={{color:t.muted,fontSize:13}}>puntos acumulados</div>
          </div>
        </div>
        <div style={card}>
          <div style={h3}>🏆 Reto semanal: {weekChallenge.title}</div>
          <div style={{height:6,background:t.s3,borderRadius:3,margin:"8px 0"}}>
            <div style={{height:6,background:t.gold,width:`${Math.min(100,(chalProgress[weekChallenge.metric]||0)/weekChallenge.goal*100)}%`,borderRadius:3,transition:"width 0.3s"}}/>
          </div>
          <div style={{color:t.muted,fontSize:12}}>{chalProgress[weekChallenge.metric]||0}/{weekChallenge.goal} — +{weekChallenge.pts} pts al completar</div>
        </div>
        <div style={card}>
          <div style={h3}>⏱️ Modo Focus</div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {[25,45,60].map(m=>(
              <button key={m} onClick={()=>setFocusTime(m)} style={{...btnO,color:focusTime===m?t.gold:t.muted,border:`1px solid ${focusTime===m?t.gold:t.border}`}}>{m} min</button>
            ))}
            <button onClick={startFocus} disabled={focusOn} style={btn(t.blue,"#000")}>🔒 Iniciar Focus</button>
            {focusOn&&<span style={{color:t.gold,fontWeight:700}}>{fmtTime(focusLeft)} restante</span>}
          </div>
        </div>
      </div>
    );

    // ── CHANNELS ──
    case "channels": return (
      <div style={{display:"flex",height:"calc(100vh - 100px)",gap:0}}>
        <div style={{width:180,background:t.s2,borderRight:`1px solid ${t.border}`,padding:8,overflowY:"auto",flexShrink:0}}>
          <div style={{color:t.muted,fontSize:11,letterSpacing:2,padding:"4px 8px",marginBottom:6}}>CANALES</div>
          {channels.map(ch=>(
            <div key={ch.id} onClick={()=>{setActiveCh(ch.id);setShowDM(false);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",cursor:"pointer",borderRadius:6,margin:"2px 0",background:activeCh===ch.id&&!showDM?`${t.gold}22`:"transparent",color:activeCh===ch.id&&!showDM?t.gold:t.muted,fontSize:13}}>
              # {ch.name}
            </div>
          ))}
          <button onClick={()=>setShowNewCh(!showNewCh)} style={{...btnO,width:"100%",marginTop:6,fontSize:11}}>+ Canal</button>
          {showNewCh&&(
            <div style={{marginTop:6}}>
              <input style={{...inp,width:"100%",marginBottom:4}} placeholder="Nombre" value={newChForm.name} onChange={e=>setNewChForm(p=>({...p,name:e.target.value}))} />
              <input style={{...inp,width:"100%",marginBottom:4}} placeholder="Descripción" value={newChForm.desc} onChange={e=>setNewChForm(p=>({...p,desc:e.target.value}))} />
              <button onClick={()=>{ if(!newChForm.name)return; setChannels(p=>[...p,{id:Date.now().toString(),name:newChForm.name,desc:newChForm.desc,messages:[],polls:[]}]); setNewChForm({name:"",desc:""}); setShowNewCh(false); }} style={{...btn(),fontSize:11,padding:"5px 10px"}}>Crear</button>
            </div>
          )}
          <div style={{color:t.muted,fontSize:11,letterSpacing:2,padding:"10px 8px 4px",marginTop:6}}>MENSAJES DIRECTOS</div>
          {Object.values(users).filter(u2=>u2.email!==user.email).map(u2=>(
            <div key={u2.email} onClick={()=>{setDmTarget(u2.email);setShowDM(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",cursor:"pointer",borderRadius:6,margin:"2px 0",background:showDM&&dmTarget===u2.email?`${t.blue}22`:"transparent",color:showDM&&dmTarget===u2.email?t.blue:t.muted,fontSize:12}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:t.ok,flexShrink:0}}/>
              {u2.name}
            </div>
          ))}
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          {showDM&&dmTarget ? (
            <>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${t.border}`,background:t.surface,display:"flex",alignItems:"center",gap:8}}>
                <span style={{color:t.blue,fontWeight:700}}>💬 DM con {users[dmTarget]?.name}</span>
                <button onClick={()=>setShowDM(false)} style={{...btnO,marginLeft:"auto"}}>✕</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:16}}>
                {(dms[[user.email,dmTarget].sort().join("_")]||[]).map((m,i)=>(
                  <div key={i} style={{marginBottom:10,textAlign:m.from===user.email?"right":"left"}}>
                    <div style={{display:"inline-block",background:m.from===user.email?`${t.gold}22`:`${t.blue}22`,border:`1px solid ${t.border}`,borderRadius:10,padding:"7px 13px",fontSize:13,maxWidth:"70%",textAlign:"left"}}>{m.text}</div>
                    <div style={{color:t.muted,fontSize:10,marginTop:2}}>{new Date(m.ts).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:12,borderTop:`1px solid ${t.border}`,display:"flex",gap:8}}>
                <input style={{...inp,flex:1}} placeholder="Mensaje directo..." value={dmMsg} onChange={e=>setDmMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&dmMsg.trim()){const key=[user.email,dmTarget].sort().join("_");setDms(p=>({...p,[key]:[...(p[key]||[]),{from:user.email,text:dmMsg,ts:new Date().toISOString()}]}));setDmMsg("");}}}/>
                <button onClick={()=>{if(dmMsg.trim()){const key=[user.email,dmTarget].sort().join("_");setDms(p=>({...p,[key]:[...(p[key]||[]),{from:user.email,text:dmMsg,ts:new Date().toISOString()}]}));setDmMsg("");}}} style={btn()}>➤</button>
              </div>
            </>
          ) : (
            <>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${t.border}`,background:t.surface,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{color:t.gold,fontWeight:700}}>#{channels.find(c=>c.id===activeCh)?.name}</span>
                <span style={{color:t.muted,fontSize:12}}>{channels.find(c=>c.id===activeCh)?.desc}</span>
                <button onClick={()=>setShowPoll(!showPoll)} style={{...btnO,marginLeft:"auto"}}>📊 Encuesta</button>
              </div>
              {showPoll&&(
                <div style={{padding:12,background:t.s2,borderBottom:`1px solid ${t.border}`}}>
                  <input style={{...inp,width:"100%",marginBottom:6}} placeholder="Pregunta de la encuesta" value={pollForm.question} onChange={e=>setPollForm(p=>({...p,question:e.target.value}))} />
                  {pollForm.options.map((opt,i)=>(
                    <input key={i} style={{...inp,width:"100%",marginBottom:4}} placeholder={`Opción ${i+1}`} value={opt} onChange={e=>setPollForm(p=>({...p,options:p.options.map((o,j)=>j===i?e.target.value:o)}))} />
                  ))}
                  <div style={{display:"flex",gap:8,marginTop:6}}>
                    <button onClick={()=>setPollForm(p=>({...p,options:[...p.options,""]}))} style={btnO}>+ Opción</button>
                    <button onClick={()=>{
                      if(!pollForm.question)return;
                      const poll={id:Date.now(),question:pollForm.question,options:pollForm.options.filter(Boolean).map(o=>({text:o,votes:0,voters:[]})),creator:user.name};
                      setChannels(p=>p.map(ch=>ch.id===activeCh?{...ch,polls:[...(ch.polls||[]),poll]}:ch));
                      setPollForm({question:"",options:["",""]});setShowPoll(false);
                    }} style={btn()}>Crear encuesta</button>
                  </div>
                </div>
              )}
              {(channels.find(c=>c.id===activeCh)?.polls||[]).map(poll=>{
                const total=poll.options.reduce((a,o)=>a+o.votes,0);
                return(
                  <div key={poll.id} style={{margin:"8px 16px",background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:12}}>
                    <div style={{fontWeight:700,marginBottom:8}}>📊 {poll.question}</div>
                    {poll.options.map((opt,i)=>(
                      <div key={i} style={{marginBottom:6}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                          <span style={{fontSize:13}}>{opt.text}</span>
                          <span style={{color:t.muted,fontSize:12}}>{total?Math.round(opt.votes/total*100):0}% ({opt.votes})</span>
                        </div>
                        <div style={{height:4,background:t.s3,borderRadius:2}}>
                          <div style={{height:4,background:t.gold,width:`${total?(opt.votes/total*100):0}%`,borderRadius:2,transition:"width 0.3s"}}/>
                        </div>
                        <button onClick={()=>{if(!opt.voters.includes(user.email)){setChannels(p=>p.map(ch=>ch.id===activeCh?{...ch,polls:ch.polls.map(pl=>pl.id===poll.id?{...pl,options:pl.options.map((o,j)=>j===i?{...o,votes:o.votes+1,voters:[...o.voters,user.email]}:o)}:pl)}:ch));}}} style={{...btnO,fontSize:10,marginTop:3}}>Votar</button>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div style={{flex:1,overflowY:"auto",padding:16}}>
                {(channels.find(c=>c.id===activeCh)?.messages||[]).map(m=>(
                  <div key={m.id} style={{marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:`${t.gold}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:t.gold,fontWeight:700}}>{m.user[0]}</div>
                      <span style={{color:t.gold,fontSize:13,fontWeight:700}}>{m.user}</span>
                      <span style={{color:t.muted,fontSize:11}}>{new Date(m.ts).toLocaleTimeString()}</span>
                    </div>
                    <div style={{marginLeft:36,fontSize:14}}>{m.text}</div>
                  </div>
                ))}
                <div ref={chatEnd}/>
              </div>
              <div style={{padding:12,borderTop:`1px solid ${t.border}`,display:"flex",gap:8}}>
                <input style={{...inp,flex:1}} placeholder={`Mensaje en #${channels.find(c=>c.id===activeCh)?.name}...`} value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&chatMsg.trim()){setChannels(p=>p.map(ch=>ch.id===activeCh?{...ch,messages:[...ch.messages,{id:Date.now(),user:user.name,email:user.email,text:chatMsg,ts:new Date().toISOString()}]}:ch));setChatMsg("");addRep(user.email,1);}}}/>
                <button onClick={()=>{if(chatMsg.trim()){setChannels(p=>p.map(ch=>ch.id===activeCh?{...ch,messages:[...ch.messages,{id:Date.now(),user:user.name,email:user.email,text:chatMsg,ts:new Date().toISOString()}]}:ch));setChatMsg("");addRep(user.email,1);}}} style={btn()}>➤</button>
              </div>
            </>
          )}
        </div>
      </div>
    );

    // ── TASKS ──
    case "tasks": return (
      <div style={wrap}>
        <div style={h2}>✅ TAREAS Y PENDIENTES</div>
        <div style={card}>
          <div style={{height:6,background:t.s3,borderRadius:3,marginBottom:6}}>
            <div style={{height:6,background:t.gold,width:`${tasks.length?(tasks.filter(x=>x.done).length/tasks.length*100):0}%`,borderRadius:3,transition:"width 0.3s"}}/>
          </div>
          <div style={{color:t.muted,fontSize:12,marginBottom:12}}>{tasks.filter(x=>x.done).length}/{tasks.length} completadas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <input style={{...inp,width:"100%"}} placeholder="Título *" value={taskForm.title} onChange={e=>setTaskForm(p=>({...p,title:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Materia" value={taskForm.subject} onChange={e=>setTaskForm(p=>({...p,subject:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Descripción" value={taskForm.desc} onChange={e=>setTaskForm(p=>({...p,desc:e.target.value}))} />
            <input style={{...inp,width:"100%"}} type="date" value={taskForm.due} onChange={e=>setTaskForm(p=>({...p,due:e.target.value}))} />
            <select style={{...inp,width:"100%"}} value={taskForm.priority} onChange={e=>setTaskForm(p=>({...p,priority:e.target.value}))}>
              <option value="alta">🔴 Alta</option><option value="media">🟡 Media</option><option value="baja">🟢 Baja</option>
            </select>
            <button onClick={()=>{if(!taskForm.title)return;setTasks(p=>[...p,{...taskForm,id:Date.now(),done:false,createdAt:new Date().toISOString()}]);setTaskForm({title:"",desc:"",subject:"",due:"",priority:"media"});addRep(user.email,2);}} style={btn()}>+ Agregar</button>
          </div>
        </div>
        {tasks.map(task=>(
          <div key={task.id} style={{...card,opacity:task.done?0.6:1,borderLeft:`3px solid ${task.priority==="alta"?t.red:task.priority==="media"?t.warn:t.ok}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="checkbox" checked={task.done} onChange={()=>{setTasks(p=>p.map(x=>x.id===task.id?{...x,done:!x.done}:x));if(!task.done){addRep(user.email,5);setChalProgress(cp=>({...cp,tasks:cp.tasks+1}));toast("¡Tarea completada! +5 pts 🎉");}}} style={{accentColor:t.gold,width:16,height:16}}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,textDecoration:task.done?"line-through":"none"}}>{task.title}</div>
                <div style={{color:t.muted,fontSize:12}}>{task.subject}{task.due&&` • Vence: ${task.due}`}</div>
                {task.desc&&<div style={{color:t.muted,fontSize:12,marginTop:2}}>{task.desc}</div>}
              </div>
              <span style={tag(task.priority==="alta"?t.red:task.priority==="media"?t.warn:t.ok)}>{task.priority}</span>
              {task.due&&daysUntil(task.due)<=3&&daysUntil(task.due)>=0&&<span style={tag(t.red)}>⚠️ {daysUntil(task.due)}d</span>}
              <button onClick={()=>setTasks(p=>p.filter(x=>x.id!==task.id))} style={{...btnO,color:t.red}}>✕</button>
            </div>
          </div>
        ))}
      </div>
    );

    // ── CALENDAR ──
    case "calendar": return (
      <div style={wrap}>
        <div style={h2}>📅 CALENDARIO ACADÉMICO</div>
        <div style={card}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            <input style={{...inp,flex:1,minWidth:150}} placeholder="Título *" value={evForm.title} onChange={e=>setEvForm(p=>({...p,title:e.target.value}))} />
            <input style={{...inp,width:160}} type="date" value={evForm.date} onChange={e=>setEvForm(p=>({...p,date:e.target.value}))} />
            <input style={{...inp,width:110}} type="time" value={evForm.time} onChange={e=>setEvForm(p=>({...p,time:e.target.value}))} />
            <select style={{...inp,width:140}} value={evForm.type} onChange={e=>setEvForm(p=>({...p,type:e.target.value}))}>
              <option value="examen">📝 Examen</option><option value="entrega">📤 Entrega</option><option value="clase">🎓 Clase</option><option value="meetup">💻 Meetup</option>
            </select>
            <button onClick={()=>{if(!evForm.title||!evForm.date)return;setEvents(p=>[...p,{...evForm,id:Date.now()}]);setEvForm({title:"",desc:"",date:"",time:"",type:"examen"});}} style={btn()}>+ Agregar</button>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <button onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()-1))} style={btnO}>◀</button>
          <div style={{flex:1,textAlign:"center",fontWeight:700,color:t.gold,fontSize:18,fontFamily:"Orbitron"}}>{calMonth.toLocaleString("es",{month:"long",year:"numeric"}).toUpperCase()}</div>
          <button onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()+1))} style={btnO}>▶</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:16}}>
          {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d=><div key={d} style={{textAlign:"center",color:t.muted,fontSize:11,padding:4}}>{d}</div>)}
          {(()=>{
            const fd=new Date(calMonth.getFullYear(),calMonth.getMonth(),1).getDay();
            const dim=new Date(calMonth.getFullYear(),calMonth.getMonth()+1,0).getDate();
            const cells=[];
            for(let i=0;i<fd;i++) cells.push(<div key={`e${i}`}/>);
            for(let d=1;d<=dim;d++){
              const ds=`${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              const devs=events.filter(e=>e.date===ds);
              const isToday=new Date().toDateString()===new Date(calMonth.getFullYear(),calMonth.getMonth(),d).toDateString();
              cells.push(
                <div key={d} style={{background:isToday?`${t.gold}22`:t.s2,border:`1px solid ${isToday?t.gold:t.border}`,borderRadius:4,padding:"4px 3px",minHeight:44}}>
                  <div style={{color:isToday?t.gold:t.text,fontWeight:isToday?700:400,fontSize:12}}>{d}</div>
                  {devs.map(ev=><div key={ev.id} style={{background:ev.type==="examen"?`${t.red}55`:`${t.blue}44`,borderRadius:2,fontSize:9,padding:"1px 3px",marginTop:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{ev.title}</div>)}
                </div>
              );
            }
            return cells;
          })()}
        </div>
        <div style={h3}>📋 Todos los eventos</div>
        {events.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(ev=>{
          const d=daysUntil(ev.date);
          return(
            <div key={ev.id} style={{...card,borderLeft:`3px solid ${d<=3&&d>=0?t.red:t.blue}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700}}>{ev.title}</div>
                  <div style={{color:t.muted,fontSize:12}}>{ev.date} {ev.time} • {ev.type}</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {d>=0&&<span style={tag(d<=3?t.red:t.blue)}>{d===0?"HOY":`${d}d`}</span>}
                  <button onClick={()=>setEvents(p=>p.filter(e=>e.id!==ev.id))} style={{...btnO,color:t.red}}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );

    // ── POMODORO ──
    case "pomodoro": return (
      <div style={wrap}>
        <div style={h2}>🍅 TEMPORIZADOR POMODORO</div>
        <div style={{...card,textAlign:"center"}}>
          <div style={{fontSize:12,color:t.muted,letterSpacing:3,marginBottom:8}}>{pom.mode==="work"?"🔥 TRABAJO":"😌 DESCANSO"}</div>
          <div style={{fontSize:80,fontFamily:"Orbitron,monospace",color:pom.mode==="work"?t.gold:t.blue,textShadow:`0 0 20px ${pom.mode==="work"?t.gold:t.blue}66`,marginBottom:16}}>{fmtTime(pom.left)}</div>
          <div style={{color:t.muted,marginBottom:12}}>Ciclos completados: <span style={{color:t.gold,fontWeight:700}}>{pom.cycles}</span></div>
          <input style={{...inp,maxWidth:300,margin:"0 auto 16px",display:"block"}} placeholder="Materia (opcional)" value={pom.subject} onChange={e=>setPom(p=>({...p,subject:e.target.value}))} />
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button onClick={startPom} disabled={pom.running} style={btn(t.ok,"#000")}>▶ Iniciar</button>
            <button onClick={stopPom} disabled={!pom.running} style={btn(t.warn,"#000")}>⏸ Pausar</button>
            <button onClick={resetPom} style={btn(t.red,"#fff")}>↺ Reiniciar</button>
          </div>
        </div>
        <div style={card}>
          <div style={h3}>⚙️ Duración de trabajo</div>
          <div style={{display:"flex",gap:8}}>
            {[15,25,50].map(m=><button key={m} onClick={()=>{stopPom();setPom(p=>({...p,left:m*60,mode:"work"}));}} style={btnO}>{m} min</button>)}
          </div>
        </div>
        <HabitTracker t={t} pomCycles={pom.cycles} />
      </div>
    );

    // ── NOTES ──
    case "notes": return (
      <div style={wrap}>
        <div style={h2}>📝 NOTAS RÁPIDAS</div>
        <div style={card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <input style={{...inp,width:"100%"}} placeholder="Título" value={noteForm.title} onChange={e=>setNoteForm(p=>({...p,title:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Materia" value={noteForm.subject} onChange={e=>setNoteForm(p=>({...p,subject:e.target.value}))} />
            <textarea style={{...inp,gridColumn:"1/-1",minHeight:80,resize:"vertical"}} placeholder="Contenido..." value={noteForm.content} onChange={e=>setNoteForm(p=>({...p,content:e.target.value}))} />
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
            {["#FFD700","#00d4ff","#c0392b","#00ff88","#ff8800","#aa44ff"].map(c=>(
              <div key={c} onClick={()=>setNoteForm(p=>({...p,color:c}))} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:noteForm.color===c?"3px solid white":"2px solid transparent"}}/>
            ))}
          </div>
          <button onClick={()=>{if(!noteForm.title)return;setNotes(p=>[...p,{...noteForm,id:Date.now(),pinned:false}]);setNoteForm({title:"",content:"",subject:"",color:"#FFD700"});}} style={btn()}>+ Agregar nota</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
          {[...notes].sort((a,b)=>b.pinned-a.pinned).map(note=>(
            <div key={note.id} style={{background:`${note.color}12`,border:`1px solid ${note.color}44`,borderRadius:12,padding:16,position:"relative"}}>
              {note.pinned&&<div style={{position:"absolute",top:8,right:8,fontSize:16}}>📌</div>}
              <div style={{color:note.color,fontWeight:700,marginBottom:4,paddingRight:24}}>{note.title}</div>
              {note.subject&&<span style={{...tag(note.color),marginBottom:8}}>{note.subject}</span>}
              <div style={{color:t.text,fontSize:13,whiteSpace:"pre-wrap",marginTop:6}}>{note.content}</div>
              <div style={{display:"flex",gap:4,marginTop:10}}>
                <button onClick={()=>setNotes(p=>p.map(n=>n.id===note.id?{...n,pinned:!n.pinned}:n))} style={{...btnO,fontSize:11}}>{note.pinned?"Desanclar":"Anclar"}</button>
                <button onClick={()=>setNotes(p=>p.filter(n=>n.id!==note.id))} style={{...btnO,color:t.red,fontSize:11}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    // ── FLASHCARDS ──
    case "flashcards": return (
      <div style={wrap}>
        <div style={h2}>🃏 FLASHCARDS</div>
        {activeDeck ? (
          <div style={{textAlign:"center"}}>
            <button onClick={()=>{setActiveDeck(null);setCardIdx(0);setFlipped(false);}} style={{...btnO,marginBottom:16}}>← Volver</button>
            <div style={{color:t.muted,marginBottom:12}}>Carta {cardIdx+1} de {activeDeck.cards.length} — {activeDeck.name}</div>
            <div onClick={()=>setFlipped(!flipped)} style={{background:flipped?`${t.blue}22`:`${t.gold}22`,border:`2px solid ${flipped?t.blue:t.gold}`,borderRadius:16,padding:"48px 24px",cursor:"pointer",maxWidth:480,margin:"0 auto 24px",minHeight:200,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,transition:"all 0.3s",userSelect:"none"}}>
              {flipped ? activeDeck.cards[cardIdx]?.back : activeDeck.cards[cardIdx]?.front}
            </div>
            <div style={{color:t.muted,fontSize:13,marginBottom:16}}>Click para {flipped?"ver pregunta":"ver respuesta"}</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={()=>{setCardIdx(p=>Math.max(0,p-1));setFlipped(false);}} style={btnO} disabled={cardIdx===0}>◀ Anterior</button>
              <button onClick={()=>{setCardIdx(p=>Math.min(activeDeck.cards.length-1,p+1));setFlipped(false);}} style={btn()} disabled={cardIdx===activeDeck.cards.length-1}>Siguiente ▶</button>
            </div>
          </div>
        ) : (
          <>
            <div style={card}>
              <div style={h3}>Nuevo mazo</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <input style={{...inp,width:"100%"}} placeholder="Nombre del mazo" value={newDeck.name} onChange={e=>setNewDeck(p=>({...p,name:e.target.value}))} />
                <input style={{...inp,width:"100%"}} placeholder="Materia" value={newDeck.subject} onChange={e=>setNewDeck(p=>({...p,subject:e.target.value}))} />
              </div>
              {newDeck.cards.map((c,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
                  <input style={{...inp,flex:1}} placeholder="Frente" value={c.front} onChange={e=>setNewDeck(p=>({...p,cards:p.cards.map((x,j)=>j===i?{...x,front:e.target.value}:x)}))} />
                  <input style={{...inp,flex:1}} placeholder="Atrás (respuesta)" value={c.back} onChange={e=>setNewDeck(p=>({...p,cards:p.cards.map((x,j)=>j===i?{...x,back:e.target.value}:x)}))} />
                  {newDeck.cards.length>1&&<button onClick={()=>setNewDeck(p=>({...p,cards:p.cards.filter((_,j)=>j!==i)}))} style={{...btnO,color:t.red}}>✕</button>}
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={()=>setNewDeck(p=>({...p,cards:[...p.cards,{front:"",back:""}]}))} style={btnO}>+ Carta</button>
                <button onClick={()=>{if(!newDeck.name)return;setDecks(p=>[...p,{...newDeck,id:Date.now()}]);setNewDeck({name:"",subject:"",cards:[{front:"",back:""}]});}} style={btn()}>Crear mazo</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              {decks.map(deck=>(
                <div key={deck.id} style={{...card,cursor:"pointer",textAlign:"center",margin:0}} onClick={()=>{setActiveDeck(deck);setCardIdx(0);setFlipped(false);}}>
                  <div style={{fontSize:32,marginBottom:8}}>🃏</div>
                  <div style={{fontWeight:700}}>{deck.name}</div>
                  <div style={{color:t.muted,fontSize:12}}>{deck.subject}</div>
                  <div style={{color:t.gold,fontSize:13,margin:"8px 0"}}>{deck.cards.length} cartas</div>
                  <button onClick={e=>{e.stopPropagation();setDecks(p=>p.filter(d=>d.id!==deck.id));}} style={{...btnO,color:t.red,fontSize:11}}>Eliminar</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );

    // ── GPA ──
    case "gpa": return (
      <div style={wrap}>
        <div style={h2}>📊 CALCULADORA DE PROMEDIOS</div>
        <div style={g2}>
          <div style={card}>
            <div style={h3}>GPA / Promedio ponderado por créditos</div>
            {gpaSubs.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
                <input style={{...inp,flex:2}} placeholder="Materia" value={s.name} onChange={e=>setGpaSubs(p=>p.map((x,j)=>j===i?{...x,name:e.target.value}:x))} />
                <input style={{...inp,width:70}} type="number" placeholder="Nota" min={0} max={100} value={s.grade} onChange={e=>setGpaSubs(p=>p.map((x,j)=>j===i?{...x,grade:e.target.value}:x))} />
                <input style={{...inp,width:70}} type="number" placeholder="Créditos" min={1} value={s.credits} onChange={e=>setGpaSubs(p=>p.map((x,j)=>j===i?{...x,credits:e.target.value}:x))} />
                {gpaSubs.length>1&&<button onClick={()=>setGpaSubs(p=>p.filter((_,j)=>j!==i))} style={{...btnO,color:t.red}}>✕</button>}
              </div>
            ))}
            <button onClick={()=>setGpaSubs(p=>[...p,{name:"",grade:"",credits:""}])} style={btnO}>+ Materia</button>
            <div style={{marginTop:16,textAlign:"center"}}>
              <div style={{color:t.muted,fontSize:13}}>Promedio ponderado</div>
              <div style={{fontSize:56,color:parseFloat(gpa)>=70?t.ok:t.red,fontFamily:"Orbitron,monospace",fontWeight:900}}>{gpa}</div>
              <div style={tag(parseFloat(gpa)>=70?t.ok:t.red)}>{parseFloat(gpa)>=90?"Sobresaliente":parseFloat(gpa)>=80?"Muy bien":parseFloat(gpa)>=70?"Aprobado":"Reprobado"}</div>
            </div>
          </div>
          <div style={card}>
            <div style={h3}>¿Qué necesito sacar en el final?</div>
            <div style={{color:t.muted,fontSize:12,marginBottom:8}}>Ingresa notas parciales y su peso en %</div>
            {examCalc.map((e,i)=>(
              <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
                <input style={{...inp,flex:2}} placeholder="Evaluación" value={e.name} onChange={ev=>setExamCalc(p=>p.map((x,j)=>j===i?{...x,name:ev.target.value}:x))} />
                <input style={{...inp,width:70}} type="number" placeholder="Nota" value={e.grade} onChange={ev=>setExamCalc(p=>p.map((x,j)=>j===i?{...x,grade:ev.target.value}:x))} />
                <input style={{...inp,width:70}} type="number" placeholder="% peso" value={e.weight} onChange={ev=>setExamCalc(p=>p.map((x,j)=>j===i?{...x,weight:ev.target.value}:x))} />
                {examCalc.length>1&&<button onClick={()=>setExamCalc(p=>p.filter((_,j)=>j!==i))} style={{...btnO,color:t.red}}>✕</button>}
              </div>
            ))}
            <button onClick={()=>setExamCalc(p=>[...p,{name:"",grade:"",weight:""}])} style={btnO}>+ Evaluación</button>
            <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10}}>
              <input style={{...inp,width:90}} type="number" value={examTarget} onChange={e=>setExamTarget(Number(e.target.value))} />
              <span style={{color:t.muted,fontSize:13}}>= meta de aprobación</span>
            </div>
            <div style={{marginTop:16,textAlign:"center"}}>
              <div style={{color:t.muted,fontSize:13}}>Necesitas en el examen final</div>
              <div style={{fontSize:56,color:needed==="N/A"||parseFloat(needed)<=100?t.ok:t.red,fontFamily:"Orbitron,monospace",fontWeight:900}}>{needed}</div>
              {needed!=="N/A"&&parseFloat(needed)>100&&<span style={tag(t.red)}>Imposible con estos pesos</span>}
            </div>
          </div>
        </div>
      </div>
    );

    // ── ATTENDANCE ──
    case "attendance": return (
      <div style={wrap}>
        <div style={h2}>📋 CONTROL DE ASISTENCIA</div>
        <div style={{...card,display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:t.muted,fontSize:13}}>Fecha:</span>
          <input type="date" style={{...inp,width:170}} value={attDate} onChange={e=>setAttDate(e.target.value)} />
        </div>
        {(user?.courses||"").split(",").map(c=>c.trim()).filter(Boolean).map(course=>{
          const pct=attPct(course);
          return(
            <div key={course} style={{...card,borderLeft:`3px solid ${pct<75?t.red:t.ok}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:700}}>{course}</div>
                <span style={tag(pct<75?t.red:t.ok)}>{pct}% asistencia</span>
              </div>
              <div style={{height:6,background:t.s3,borderRadius:3,marginBottom:10}}>
                <div style={{height:6,background:pct<75?t.red:t.ok,width:`${pct}%`,borderRadius:3,transition:"width 0.3s"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setAttendance(p=>({...p,[`${course}_${attDate}`]:true}))} style={btn(t.ok,"#000")}>✓ Asistí</button>
                <button onClick={()=>setAttendance(p=>({...p,[`${course}_${attDate}`]:false}))} style={btn(t.red,"#fff")}>✗ Falté</button>
                <span style={{color:t.muted,fontSize:12,alignSelf:"center"}}>
                  {attendance[`${course}_${attDate}`]===true?"✓ Asististe":attendance[`${course}_${attDate}`]===false?"✗ Faltaste":"Sin registrar"}
                </span>
              </div>
              {pct<75&&<div style={{color:t.red,fontSize:12,marginTop:8}}>⚠️ Asistencia por debajo del 75% mínimo recomendado</div>}
            </div>
          );
        })}
        {!(user?.courses) && <div style={{color:t.muted,textAlign:"center",padding:32}}>Agrega materias en tu perfil para registrar asistencia.</div>}
      </div>
    );

    // ── TIMETABLE ──
    case "timetable": return (
      <div style={wrap}>
        <div style={h2}>🗓️ HORARIO SEMANAL</div>
        <div style={card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
            <input style={{...inp,width:"100%"}} placeholder="Materia" value={ttForm.subject} onChange={e=>setTtForm(p=>({...p,subject:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Profesor" value={ttForm.professor} onChange={e=>setTtForm(p=>({...p,professor:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Aula" value={ttForm.room} onChange={e=>setTtForm(p=>({...p,room:e.target.value}))} />
            <select style={{...inp,width:"100%"}} value={ttForm.day} onChange={e=>setTtForm(p=>({...p,day:e.target.value}))}>
              {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"].map(d=><option key={d}>{d}</option>)}
            </select>
            <input style={{...inp,width:"100%"}} type="time" value={ttForm.start} onChange={e=>setTtForm(p=>({...p,start:e.target.value}))} />
            <input style={{...inp,width:"100%"}} type="time" value={ttForm.end} onChange={e=>setTtForm(p=>({...p,end:e.target.value}))} />
          </div>
          <button onClick={()=>{if(!ttForm.subject)return;setTimetable(p=>({...p,[ttForm.day]:[...(p[ttForm.day]||[]),{...ttForm,id:Date.now()}]}));setTtForm(p=>({...p,subject:"",professor:"",room:""}));}} style={btn()}>+ Agregar clase</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,minWidth:600}}>
            {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"].map(day=>(
              <div key={day}>
                <div style={{color:t.gold,fontWeight:700,textAlign:"center",padding:8,background:t.s2,borderRadius:8,marginBottom:8,fontSize:13}}>{day}</div>
                {(timetable[day]||[]).sort((a,b)=>a.start.localeCompare(b.start)).map(cls=>(
                  <div key={cls.id} style={{background:`${t.blue}22`,border:`1px solid ${t.blue}44`,borderRadius:6,padding:8,marginBottom:4,fontSize:12}}>
                    <div style={{fontWeight:700,color:t.blue}}>{cls.subject}</div>
                    <div style={{color:t.muted}}>{cls.start}–{cls.end}</div>
                    {cls.professor&&<div style={{color:t.muted}}>{cls.professor}</div>}
                    {cls.room&&<div style={{color:t.muted}}>{cls.room}</div>}
                    <button onClick={()=>setTimetable(p=>({...p,[day]:(p[day]||[]).filter(c=>c.id!==cls.id)}))} style={{...btnO,fontSize:10,marginTop:4,color:t.red}}>✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    // ── RESOURCES ──
    case "resources": return (
      <div style={wrap}>
        <div style={h2}>📚 BANCO DE RECURSOS</div>
        <div style={card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <input style={{...inp,width:"100%"}} placeholder="Título *" value={resForm.title} onChange={e=>setResForm(p=>({...p,title:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="URL o enlace" value={resForm.url} onChange={e=>setResForm(p=>({...p,url:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Materia" value={resForm.subject} onChange={e=>setResForm(p=>({...p,subject:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Carrera" value={resForm.career} onChange={e=>setResForm(p=>({...p,career:e.target.value}))} />
          </div>
          <button onClick={()=>{if(!resForm.title)return;setResources(p=>[...p,{...resForm,id:Date.now(),votes:0,voters:[],uploader:user.name}]);setResForm({title:"",url:"",subject:"",career:""});addRep(user.email,3);setChalProgress(cp=>({...cp,resources:cp.resources+1}));toast("+3 pts por subir recurso 📚");}} style={{...btn(),marginTop:8}}>+ Subir recurso</button>
        </div>
        {resources.sort((a,b)=>b.votes-a.votes).map(res=>(
          <div key={res.id} style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700}}>{res.title}</div>
                <div style={{color:t.muted,fontSize:12,marginTop:2}}>{[res.subject,res.career].filter(Boolean).join(" · ")} · por {res.uploader}</div>
                {res.url&&<a href={res.url} target="_blank" rel="noopener noreferrer" style={{color:t.blue,fontSize:13,marginTop:4,display:"block"}}>🔗 {res.url}</a>}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                <button onClick={()=>{if(!res.voters.includes(user.email)){setResources(p=>p.map(r=>r.id===res.id?{...r,votes:r.votes+1,voters:[...r.voters,user.email]}:r));addRep(res.uploader,2);}}} style={btn(t.gold)}>👍 {res.votes}</button>
                <button onClick={()=>setResources(p=>p.filter(r=>r.id!==res.id))} style={{...btnO,color:t.red}}>✕</button>
              </div>
            </div>
          </div>
        ))}
        {!resources.length&&<div style={{color:t.muted,textAlign:"center",padding:32}}>Sé el primero en subir un recurso 📖</div>}
      </div>
    );

    // ── CALCULATOR ──
    case "calculator": return (
      <div style={wrap}>
        <div style={h2}>🧮 CALCULADORA MATEMÁTICA</div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {[["scientific","🔬 Científica"],["graph","📈 Gráfica"],["algebra","🔢 Álgebra"],["units","📐 Unidades"],["constants","⚛️ Constantes"]].map(([m,label])=>(
            <button key={m} onClick={()=>setCalcMode(m)} style={{...btn(calcMode===m?t.gold:t.s3,calcMode===m?"#000":t.muted),fontSize:12}}>{label}</button>
          ))}
        </div>

        {calcMode==="scientific"&&(
          <div style={card}>
            <input style={{...inp,fontSize:20,marginBottom:8,textAlign:"right",width:"100%"}} value={calcIn} onChange={e=>setCalcIn(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"){try{const r=calcSafeEval(calcIn);setCalcOut(String(r));setCalcHist(p=>[`${calcIn} = ${r}`,...p.slice(0,9)]);}catch{setCalcOut("Error");}} }} placeholder="Ingresa una expresión..."/>
            {calcOut&&<div style={{textAlign:"right",fontSize:24,color:t.gold,marginBottom:12,fontFamily:"Orbitron"}}>= {calcOut}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
              {["7","8","9","/","√(","4","5","6","*","^","1","2","3","-","π","0",".","=","+","e","sin(","cos(","tan(","log(","ln(","(",")","%","C","⌫"].map(b=>(
                <button key={b} onClick={()=>{
                  if(b==="="){try{const r=calcSafeEval(calcIn);setCalcOut(String(r));setCalcHist(p=>[`${calcIn} = ${r}`,...p.slice(0,9)]);}catch{setCalcOut("Error");}}
                  else if(b==="C"){setCalcIn("");setCalcOut("");}
                  else if(b==="⌫") setCalcIn(p=>p.slice(0,-1));
                  else if(b==="√(") setCalcIn(p=>p+"sqrt(");
                  else setCalcIn(p=>p+b);
                }} style={{...btn(b==="="?t.gold:b==="C"?t.red:t.s3,b==="="?"#000":b==="C"?"#fff":t.text),padding:"10px 2px",fontSize:13}}>
                  {b==="√("?"√":b}
                </button>
              ))}
            </div>
            {calcHist.length>0&&<div style={{marginTop:12}}>
              <div style={{color:t.muted,fontSize:11,marginBottom:4}}>Historial</div>
              {calcHist.map((h,i)=><div key={i} onClick={()=>setCalcIn(h.split(" = ")[0])} style={{color:t.muted,fontSize:12,cursor:"pointer",padding:"2px 0"}}>{h}</div>)}
            </div>}
          </div>
        )}

        {calcMode==="graph"&&(
          <div style={card}>
            <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              <input style={{...inp,flex:1}} placeholder="f(x) = ej: Math.sin(x), x**2, x+2" value={graphIn} onChange={e=>setGraphIn(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&graphIn){setGraphFns(p=>[...p,graphIn]);setGraphIn("");}}} />
              <button onClick={()=>{if(graphIn){setGraphFns(p=>[...p,graphIn]);setGraphIn("");}}} style={btn()}>Graficar</button>
              <button onClick={()=>setGraphFns([])} style={btn(t.red,"#fff")}>Limpiar</button>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              {graphFns.map((fn,i)=>(
                <div key={i} style={{...tag([t.gold,t.blue,t.red,t.ok,t.warn][i%5]),display:"flex",alignItems:"center",gap:4}}>
                  {fn} <span onClick={()=>setGraphFns(p=>p.filter((_,j)=>j!==i))} style={{cursor:"pointer"}}>✕</span>
                </div>
              ))}
            </div>
            <div style={{color:t.muted,fontSize:11,marginBottom:8}}>Usa Math.sin(x), Math.cos(x), Math.sqrt(x), Math.abs(x), x**2, x**3, etc.</div>
            <canvas ref={el=>{if(el&&!canvasRef.current){canvasRef.current=el;setTimeout(drawGraph,50);}else if(el){canvasRef.current=el;drawGraph();}}} width={700} height={400} style={{width:"100%",borderRadius:8,border:`1px solid ${t.border}`}}/>
          </div>
        )}

        {calcMode==="algebra"&&(
          <div style={card}>
            <div style={h3}>Calculadora Algebraica</div>
            <div style={{color:t.muted,fontSize:12,marginBottom:12}}>Resuelve ecuaciones lineales, cuadráticas y sistemas de ecuaciones.</div>
            <div style={{marginBottom:16}}>
              <div style={{color:t.gold,fontWeight:700,marginBottom:6}}>Ecuación lineal: ax + b = c</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <input style={{...inp,width:60}} placeholder="a" id="la" type="number" defaultValue="2"/>
                <span style={{color:t.muted}}>x +</span>
                <input style={{...inp,width:60}} placeholder="b" id="lb" type="number" defaultValue="3"/>
                <span style={{color:t.muted}}>=</span>
                <input style={{...inp,width:60}} placeholder="c" id="lc" type="number" defaultValue="11"/>
                <button onClick={()=>{
                  const a=parseFloat(document.getElementById("la")?.value||0);
                  const b2=parseFloat(document.getElementById("lb")?.value||0);
                  const c2=parseFloat(document.getElementById("lc")?.value||0);
                  if(a===0){setCalcOut("No es lineal (a=0)");return;}
                  setCalcOut(`x = ${((c2-b2)/a).toFixed(4)}`);
                }} style={btn()}>Resolver</button>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{color:t.gold,fontWeight:700,marginBottom:6}}>Ecuación cuadrática: ax² + bx + c = 0</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <input style={{...inp,width:60}} placeholder="a" id="qa" type="number" defaultValue="1"/>
                <span style={{color:t.muted}}>x² +</span>
                <input style={{...inp,width:60}} placeholder="b" id="qb" type="number" defaultValue="-5"/>
                <span style={{color:t.muted}}>x +</span>
                <input style={{...inp,width:60}} placeholder="c" id="qc" type="number" defaultValue="6"/>
                <button onClick={()=>{
                  const a=parseFloat(document.getElementById("qa")?.value||0);
                  const b2=parseFloat(document.getElementById("qb")?.value||0);
                  const c2=parseFloat(document.getElementById("qc")?.value||0);
                  const disc=b2*b2-4*a*c2;
                  if(disc<0){setCalcOut("Sin soluciones reales (discriminante < 0)");return;}
                  const x1=(-b2+Math.sqrt(disc))/(2*a);
                  const x2=(-b2-Math.sqrt(disc))/(2*a);
                  setCalcOut(disc===0?`x = ${x1.toFixed(4)}`:`x₁ = ${x1.toFixed(4)}, x₂ = ${x2.toFixed(4)}`);
                }} style={btn()}>Resolver</button>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{color:t.gold,fontWeight:700,marginBottom:6}}>Sistema 2×2: a₁x + b₁y = c₁ / a₂x + b₂y = c₂</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {[["s_a1","a₁"],["s_b1","b₁"],["s_c1","c₁"],["s_a2","a₂"],["s_b2","b₂"],["s_c2","c₂"]].map(([id,label])=>(
                  <div key={id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{color:t.muted,fontSize:11}}>{label}</span>
                    <input style={{...inp,width:56}} id={id} type="number" defaultValue="1"/>
                  </div>
                ))}
                <button onClick={()=>{
                  const a1=parseFloat(document.getElementById("s_a1")?.value||0);
                  const b1=parseFloat(document.getElementById("s_b1")?.value||0);
                  const c1=parseFloat(document.getElementById("s_c1")?.value||0);
                  const a2=parseFloat(document.getElementById("s_a2")?.value||0);
                  const b2=parseFloat(document.getElementById("s_b2")?.value||0);
                  const c2=parseFloat(document.getElementById("s_c2")?.value||0);
                  const det=a1*b2-a2*b1;
                  if(det===0){setCalcOut("Sin solución única (determinante = 0)");return;}
                  const x=(c1*b2-c2*b1)/det; const y=(a1*c2-a2*c1)/det;
                  setCalcOut(`x = ${x.toFixed(4)}, y = ${y.toFixed(4)}`);
                }} style={btn()}>Resolver</button>
              </div>
            </div>
            {calcOut&&<div style={{background:t.s2,border:`1px solid ${t.gold}`,borderRadius:8,padding:16,color:t.gold,fontSize:18,fontFamily:"Orbitron",textAlign:"center"}}>{calcOut}</div>}
          </div>
        )}

        {calcMode==="units"&&(
          <div style={card}>
            <div style={h3}>Convertidor de Unidades</div>
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              {Object.keys(UNITS).map(cat=>(
                <button key={cat} onClick={()=>{setUnitCat(cat);const u=Object.keys(UNITS[cat]);setUnitFrom(u[0]);setUnitTo(u[1]||u[0]);}} style={{...btn(unitCat===cat?t.gold:t.s3,unitCat===cat?"#000":t.muted),fontSize:12,textTransform:"capitalize"}}>{cat}</button>
              ))}
              <button onClick={()=>setUnitCat("temp")} style={{...btn(unitCat==="temp"?t.gold:t.s3,unitCat==="temp"?"#000":t.muted),fontSize:12}}>temperatura</button>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:16}}>
              <input style={{...inp,width:120}} type="number" value={unitVal} onChange={e=>setUnitVal(e.target.value)} />
              <select style={{...inp,width:100}} value={unitFrom} onChange={e=>setUnitFrom(e.target.value)}>
                {Object.keys(unitCat==="temp"?{C:1,F:1,K:1}:UNITS[unitCat]).map(u=><option key={u}>{u}</option>)}
              </select>
              <span style={{color:t.gold,fontSize:20}}>→</span>
              <select style={{...inp,width:100}} value={unitTo} onChange={e=>setUnitTo(e.target.value)}>
                {Object.keys(unitCat==="temp"?{C:1,F:1,K:1}:UNITS[unitCat]).map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div style={{background:t.s2,border:`1px solid ${t.gold}`,borderRadius:12,padding:20,textAlign:"center"}}>
              <div style={{color:t.muted,fontSize:13,marginBottom:4}}>{unitVal} {unitFrom} =</div>
              <div style={{fontSize:40,color:t.gold,fontFamily:"Orbitron",fontWeight:900}}>{convertUnit()}</div>
              <div style={{color:t.muted,fontSize:13,marginTop:4}}>{unitTo}</div>
            </div>
          </div>
        )}

        {calcMode==="constants"&&(
          <div style={card}>
            <div style={h3}>Constantes físicas y matemáticas universales</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
              {CONSTANTS.map(c=>(
                <div key={c.name} style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:8,padding:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                    <span style={tag(t.blue)}>{c.symbol}</span>
                  </div>
                  <div style={{color:t.gold,fontFamily:"monospace",fontSize:13}}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // ── BIBLIOGRAPHY ──
    case "bibliography": return (
      <div style={wrap}>
        <div style={h2}>📖 GENERADOR DE REFERENCIAS</div>
        <div style={card}>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {["APA","MLA","Chicago"].map(f=>(
              <button key={f} onClick={()=>setBibFormat(f)} style={{...btn(bibFormat===f?t.gold:t.s3,bibFormat===f?"#000":t.muted),fontSize:12}}>{f}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {["book","article","web"].map(tp=>(
              <button key={tp} onClick={()=>setBibForm(p=>({...p,type:tp}))} style={{...btn(bibForm.type===tp?t.blue:t.s3,bibForm.type===tp?"#000":t.muted),fontSize:12}}>{tp==="book"?"📚 Libro":tp==="article"?"📄 Artículo":"🌐 Web"}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <input style={{...inp,width:"100%"}} placeholder="Autor (Apellido, N.)" value={bibForm.author} onChange={e=>setBibForm(p=>({...p,author:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Título" value={bibForm.title} onChange={e=>setBibForm(p=>({...p,title:e.target.value}))} />
            <input style={{...inp,width:"100%"}} placeholder="Año" value={bibForm.year} onChange={e=>setBibForm(p=>({...p,year:e.target.value}))} />
            {bibForm.type==="book"&&<input style={{...inp,width:"100%"}} placeholder="Editorial" value={bibForm.publisher} onChange={e=>setBibForm(p=>({...p,publisher:e.target.value}))} />}
            {bibForm.type==="article"&&<><input style={{...inp,width:"100%"}} placeholder="Revista/Journal" value={bibForm.journal} onChange={e=>setBibForm(p=>({...p,journal:e.target.value}))} /><input style={{...inp,width:"100%"}} placeholder="Volumen" value={bibForm.volume} onChange={e=>setBibForm(p=>({...p,volume:e.target.value}))} /><input style={{...inp,width:"100%"}} placeholder="Número/Issue" value={bibForm.issue} onChange={e=>setBibForm(p=>({...p,issue:e.target.value}))} /><input style={{...inp,width:"100%"}} placeholder="Páginas (ej: 12-28)" value={bibForm.pages} onChange={e=>setBibForm(p=>({...p,pages:e.target.value}))} /></>}
            {bibForm.type==="web"&&<input style={{...inp,gridColumn:"1/-1",width:"100%"}} placeholder="URL" value={bibForm.url} onChange={e=>setBibForm(p=>({...p,url:e.target.value}))} />}
          </div>
          <button onClick={()=>{
            const ref = {id:Date.now(),format:bibFormat,type:bibForm.type,data:bibForm,apa:genAPA(bibForm),mla:genMLA(bibForm),chicago:genChicago(bibForm)};
            setBibRefs(p=>[...p,ref]);
            toast("Referencia generada ✅");
          }} style={{...btn(),marginTop:12}}>Generar referencia</button>
        </div>
        {bibRefs.map(ref=>(
          <div key={ref.id} style={card}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div><span style={tag(t.blue)}>{ref.type}</span> <span style={tag(t.gold)}>{ref.format}</span></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{ const text=ref.format==="APA"?ref.apa:ref.format==="MLA"?ref.mla:ref.chicago; navigator.clipboard?.writeText(text); toast("Copiado al portapapeles 📋"); }} style={btnO}>📋 Copiar</button>
                <button onClick={()=>setBibRefs(p=>p.filter(r=>r.id!==ref.id))} style={{...btnO,color:t.red}}>✕</button>
              </div>
            </div>
            <div style={{background:t.s2,borderRadius:8,padding:12,fontFamily:"Georgia,serif",fontSize:13,lineHeight:1.6}}>
              {bibFormat==="APA"?ref.apa:bibFormat==="MLA"?ref.mla:ref.chicago}
            </div>
          </div>
        ))}
      </div>
    );

    // ── MINDMAP ──
    case "mindmap": return (
      <div style={wrap}>
        <div style={h2}>🧠 MAPA MENTAL</div>
        <MindMap t={t} />
      </div>
    );

    // ── EXAM SIMULATOR ──
    case "examsim": return (
      <div style={wrap}>
        <div style={h2}>📝 SIMULADOR DE EXAMEN</div>
        <ExamSimulator t={t} />
      </div>
    );

    // ── DIARY ──
    case "diary": return (
      <div style={wrap}>
        <div style={h2}>📔 DIARIO DE APRENDIZAJE</div>
        <div style={card}>
          <input type="date" style={{...inp,width:"100%",marginBottom:10}} value={diaryDate} onChange={e=>setDiaryDate(e.target.value)} />
          <textarea style={{...inp,minHeight:80,width:"100%",marginBottom:8,resize:"vertical"}} placeholder="¿Qué aprendí hoy?" value={diaryEntry.learned} onChange={e=>setDiaryEntry(p=>({...p,learned:e.target.value}))} />
          <textarea style={{...inp,minHeight:60,width:"100%",marginBottom:8,resize:"vertical"}} placeholder="¿Qué me costó trabajo?" value={diaryEntry.struggled} onChange={e=>setDiaryEntry(p=>({...p,struggled:e.target.value}))} />
          <textarea style={{...inp,minHeight:60,width:"100%",marginBottom:8,resize:"vertical"}} placeholder="¿Qué quiero repasar mañana?" value={diaryEntry.tomorrow} onChange={e=>setDiaryEntry(p=>({...p,tomorrow:e.target.value}))} />
          <button onClick={()=>{if(!diaryEntry.learned)return;setDiary(p=>[...p.filter(d=>d.date!==diaryDate),{...diaryEntry,date:diaryDate,id:Date.now()}]);setDiaryEntry({learned:"",struggled:"",tomorrow:""});toast("Entrada guardada 📔");}} style={btn()}>Guardar entrada</button>
        </div>
        {diary.sort((a,b)=>b.date.localeCompare(a.date)).map(entry=>(
          <div key={entry.id} style={card}>
            <div style={{color:t.gold,fontWeight:700,marginBottom:8}}>📅 {entry.date}</div>
            {entry.learned&&<div style={{marginBottom:6}}><span style={{color:t.ok}}>✅ Aprendí:</span> {entry.learned}</div>}
            {entry.struggled&&<div style={{marginBottom:6}}><span style={{color:t.warn}}>⚠️ Me costó:</span> {entry.struggled}</div>}
            {entry.tomorrow&&<div><span style={{color:t.blue}}>🔄 Para mañana:</span> {entry.tomorrow}</div>}
            <button onClick={()=>setDiary(p=>p.filter(d=>d.id!==entry.id))} style={{...btnO,color:t.red,marginTop:8,fontSize:11}}>Eliminar</button>
          </div>
        ))}
      </div>
    );

    // ── STUDY GROUPS ──
    case "groups": return (
      <div style={wrap}>
        <div style={h2}>👥 GRUPOS DE ESTUDIO</div>
        <StudyGroup t={t} currentUser={user} users={users} />
      </div>
    );

    // ── MENTORSHIP ──
    case "mentorship": return (
      <div style={wrap}>
        <div style={h2}>🎓 SISTEMA DE MENTORÍA</div>
        <div style={card}>
          <div style={h3}>Registrarme como mentor</div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <input style={{...inp,flex:1}} placeholder="Materia en que puedo enseñar" value={mentorSub} onChange={e=>setMentorSub(e.target.value)} />
            <button onClick={()=>{if(!mentorSub)return;setMentors(p=>[...p.filter(m=>!(m.email===user.email&&m.subject===mentorSub)),{email:user.email,name:user.name,subject:mentorSub,year:user.year,career:user.career}]);setMentorSub("");toast("¡Ya eres mentor! 🎓");addRep(user.email,10);}} style={btn()}>Registrarme</button>
          </div>
          <div style={{color:t.muted,fontSize:12}}>Los mentores ganan puntos de reputación cuando son contactados por otros estudiantes.</div>
        </div>
        <div style={h3}>Mentores disponibles</div>
        {mentors.map((m,i)=>(
          <div key={i} style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700}}>{m.name}</div>
                <div style={{color:t.muted,fontSize:13}}>{m.career} · {m.year}° año</div>
                <span style={tag(t.gold)}>📚 {m.subject}</span>
              </div>
              <button onClick={()=>{setDmTarget(m.email);setShowDM(true);setSec("channels");addRep(m.email,5);}} style={btn(t.blue,"#000")}>Contactar 💬</button>
            </div>
          </div>
        ))}
        {!mentors.length&&<div style={{color:t.muted,textAlign:"center",padding:32}}>¡Sé el primer mentor de la plataforma!</div>}
      </div>
    );

    // ── ANNOUNCEMENTS ──
    case "announcements": return (
      <div style={wrap}>
        <div style={h2}>📢 TABLÓN DE ANUNCIOS</div>
        <div style={card}>
          <input style={{...inp,width:"100%",marginBottom:8}} placeholder="Título del anuncio" value={annForm.title} onChange={e=>setAnnForm(p=>({...p,title:e.target.value}))} />
          <textarea style={{...inp,minHeight:80,width:"100%",resize:"vertical",marginBottom:8}} placeholder="Contenido del anuncio..." value={annForm.content} onChange={e=>setAnnForm(p=>({...p,content:e.target.value}))} />
          <button onClick={()=>{if(!annForm.title)return;setAnns(p=>[...p,{...annForm,id:Date.now(),author:user.name,date:new Date().toISOString()}]);setAnnForm({title:"",content:""}); }} style={btn()}>Publicar anuncio</button>
        </div>
        {[...anns].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(ann=>(
          <div key={ann.id} style={{...card,borderLeft:`3px solid ${t.gold}`}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{ann.title}</div>
            <div style={{fontSize:14,marginBottom:8,lineHeight:1.5}}>{ann.content}</div>
            <div style={{color:t.muted,fontSize:12}}>Por {ann.author} · {new Date(ann.date).toLocaleDateString()}</div>
            {(isFirstUser||ann.author===user.name)&&<button onClick={()=>setAnns(p=>p.filter(a=>a.id!==ann.id))} style={{...btnO,color:t.red,marginTop:8,fontSize:11}}>Eliminar</button>}
          </div>
        ))}
      </div>
    );

    // ── GAMES ──
    case "games": return (
      <div style={wrap}>
        <div style={h2}>🎮 JUEGOS</div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {[["chess","♔ Ajedrez"],["battleship","🚢 Barcos"],["hangman","🔤 Ahorcado"],["wordle","📝 Wordle"],["roulette","🎡 Ruleta"],["magic8","🎱 8 Ball"]].map(([g,label])=>(
            <button key={g} onClick={()=>setGame(g)} style={{...btn(game===g?t.gold:t.s3,game===g?"#000":t.muted),fontSize:12}}>{label}</button>
          ))}
        </div>

        {game==="chess"&&(
          <div style={card}>
            {promotePending&&(
              <div style={{position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
                <div style={{background:t.surface,border:`2px solid ${t.gold}`,borderRadius:16,padding:32,textAlign:"center"}}>
                  <div style={{color:t.gold,fontWeight:700,marginBottom:16}}>Promover peón a:</div>
                  <div style={{display:"flex",gap:12}}>
                    {["Q","R","B","N"].map(p=>(
                      <button key={p} onClick={()=>doMove(promotePending.from,promotePending.to,p)} style={{...btn(),fontSize:28,padding:"12px 20px"}}>
                        {chessTurn==="w"?GLYPHS["w"+p]:GLYPHS["b"+p]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div style={{color:t.gold,fontWeight:700}}>{chessMsg}</div>
              <div style={{display:"flex",gap:8}}>
                <span style={tag(t.ok)}>W:{chessStats.w}</span>
                <span style={tag(t.red)}>L:{chessStats.l}</span>
                <span style={tag(t.muted)}>D:{chessStats.d}</span>
                <span style={tag(t.gold)}>🔥{chessStats.streak}</span>
                <span style={tag(t.blue)}>Max:{chessStats.max}</span>
              </div>
            </div>
            <div style={{display:"inline-grid",gridTemplateColumns:"repeat(8,48px)",border:`2px solid ${t.gold}`,userSelect:"none"}}>
              {board.map((row,r)=>row.map((piece,c)=>{
                const light=(r+c)%2===0;
                const isSel=selSq&&selSq[0]===r&&selSq[1]===c;
                const isLegal=legalSqs.some(([lr,lc])=>lr===r&&lc===c);
                const isLastFrom=lastMove&&lastMove.from[0]===r&&lastMove.from[1]===c;
                const isLastTo=lastMove&&lastMove.to[0]===r&&lastMove.to[1]===c;
                return(
                  <div key={`${r}${c}`} onClick={()=>handleChessClick(r,c)} style={{width:48,height:48,background:isSel?`${t.gold}88`:isLastFrom||isLastTo?`${t.blue}44`:light?"#f0d9b5":"#b58863",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:28,position:"relative",transition:"background 0.1s"}}>
                    {isLegal&&<div style={{position:"absolute",width:16,height:16,borderRadius:"50%",background:piece?"transparent":"#00000044",border:piece?"3px solid #00000044":"none",pointerEvents:"none"}}/>}
                    {piece?GLYPHS[piece]:""}
                  </div>
                );
              }))}
            </div>
            <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
              <button onClick={()=>resetChess("w")} style={btn(t.ok,"#000")}>Blancas ganan</button>
              <button onClick={()=>resetChess("b")} style={btn(t.red,"#fff")}>Negras ganan</button>
              <button onClick={()=>resetChess("d")} style={btnO}>Empate</button>
              <button onClick={()=>{setBoard(INIT_BOARD.map(r=>[...r]));setSelSq(null);setLegalSqs([]);setChessTurn("w");setCastling({w:{kingSide:true,queenSide:true},b:{kingSide:true,queenSide:true}});setLastMove(null);setPromotePending(null);setChessMsg("Turno: Blancas ♔");}} style={btn(t.s3,t.muted)}>↺ Nueva</button>
            </div>
          </div>
        )}

        {game==="battleship"&&(
          <div style={card}>
            <div style={{color:t.gold,fontWeight:700,marginBottom:10}}>{shipMsg}</div>
            <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
              {[["Tu flota",shipPlayerGrid,placeShip,false],["Flota enemiga",shipEnemyGrid,attackEnemy,true]].map(([label,grid,onClick,hideShips])=>(
                <div key={label}>
                  <div style={{color:t.muted,fontSize:12,marginBottom:4}}>{label}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(10,28px)"}}>
                    {grid.map((row,r)=>row.map((cell,c)=>(
                      <div key={`${r}${c}`} onClick={()=>onClick(r,c)} style={{width:28,height:28,background:cell===1&&!hideShips?`${t.blue}66`:cell===2?`${t.red}66`:cell===3?`${t.blue}22`:t.s3,border:`1px solid ${t.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                        {cell===2?"💥":cell===3?"·":""}
                      </div>
                    )))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={resetShip} style={{...btn(t.red,"#fff"),marginTop:12}}>↺ Nueva partida</button>
          </div>
        )}

        {game==="hangman"&&(
          <div style={{...card,textAlign:"center"}}>
            <div style={{fontSize:56,marginBottom:12}}>
              {["😊","😐","😟","😨","😱","💀","☠️"][hangGuesses.filter(g=>!hangWord.includes(g)).length]}
            </div>
            <div style={{fontSize:36,letterSpacing:10,marginBottom:12,fontFamily:"Orbitron",minHeight:48}}>
              {hangWord.split("").map((l,i)=><span key={i}>{hangGuesses.includes(l)?l:"_"} </span>)}
            </div>
            <div style={{color:t.red,fontSize:13,marginBottom:12}}>
              Incorrectas: {hangGuesses.filter(g=>!hangWord.includes(g)).join(" ")} ({6-hangGuesses.filter(g=>!hangWord.includes(g)).length} restantes)
            </div>
            {hangStatus==="playing"?(
              <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                <input style={{...inp,maxWidth:80,textAlign:"center"}} maxLength={1} value={hangIn} onChange={e=>setHangIn(e.target.value.toLowerCase())} onKeyDown={e=>{if(e.key==="Enter"&&hangIn&&!hangGuesses.includes(hangIn)){const ng=[...hangGuesses,hangIn];setHangGuesses(ng);setHangIn("");if(ng.filter(g=>!hangWord.includes(g)).length>=6)setHangStatus("lost");else if(hangWord.split("").every(l=>ng.includes(l)))setHangStatus("won");}}} placeholder="a-z"/>
                <button onClick={()=>{if(hangIn&&!hangGuesses.includes(hangIn)){const ng=[...hangGuesses,hangIn];setHangGuesses(ng);setHangIn("");if(ng.filter(g=>!hangWord.includes(g)).length>=6)setHangStatus("lost");else if(hangWord.split("").every(l=>ng.includes(l)))setHangStatus("won");}}} style={btn()}>Adivinar</button>
              </div>
            ):(
              <div>
                <div style={{color:hangStatus==="won"?t.ok:t.red,fontSize:22,fontWeight:700,marginBottom:12}}>
                  {hangStatus==="won" ? "Ganaste! 🎉":`¡Perdiste! La palabra era: "${hangWord}"`}
                </div>
                <button onClick={()=>{setHangWord(WORD_LIST[Math.floor(Math.random()*WORD_LIST.length)]);setHangGuesses([]);setHangStatus("playing");}} style={btn()}>Nueva palabra</button>
              </div>
            )}
          </div>
        )}

        {game==="wordle"&&(
          <div style={{...card,textAlign:"center"}}>
            <div style={{color:t.muted,fontSize:12,marginBottom:12}}>Adivina la palabra de {wordleWord.length} letras</div>
            <div style={{marginBottom:16}}>
              {wordleGuesses.map((guess,i)=>(
                <div key={i} style={{display:"flex",gap:4,justifyContent:"center",marginBottom:4}}>
                  {guess.split("").map((l,j)=>{
                    const bg=l===wordleWord[j]?t.ok:wordleWord.includes(l)?t.warn:t.s3;
                    return <div key={j} style={{width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center",background:bg,borderRadius:6,fontWeight:700,fontSize:18,textTransform:"uppercase",border:`2px solid ${t.border}`}}>{l}</div>;
                  })}
                </div>
              ))}
              {wordleStatus==="playing"&&wordleGuesses.length<6&&(
                <div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:4}}>
                  {Array(wordleWord.length).fill(0).map((_,j)=><div key={j} style={{width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center",background:t.s2,borderRadius:6,fontWeight:700,fontSize:18,textTransform:"uppercase",border:`2px solid ${t.border}`}}>{wordleIn[j]||""}</div>)}
                </div>
              )}
            </div>
            {wordleStatus==="playing"?(
              <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                <input style={{...inp,maxWidth:180,textAlign:"center"}} maxLength={wordleWord.length} value={wordleIn} onChange={e=>setWordleIn(e.target.value.toLowerCase())} onKeyDown={e=>{if(e.key==="Enter"&&wordleIn.length===wordleWord.length){const ng=[...wordleGuesses,wordleIn];setWordleGuesses(ng);setWordleIn("");if(wordleIn===wordleWord)setWordleStatus("won");else if(ng.length>=6)setWordleStatus("lost");}}} placeholder={`${wordleWord.length} letras`}/>
                <button onClick={()=>{if(wordleIn.length===wordleWord.length){const ng=[...wordleGuesses,wordleIn];setWordleGuesses(ng);setWordleIn("");if(wordleIn===wordleWord)setWordleStatus("won");else if(ng.length>=6)setWordleStatus("lost");}}} style={btn()}>Adivinar</button>
              </div>
            ):(
              <div>
                <div style={{color:wordleStatus==="won"?t.ok:t.red,fontSize:22,fontWeight:700,marginBottom:12}}>
                  {wordleStatus==="won" ? "Adivinaste! 🎉":`La palabra era: "${wordleWord}"`}
                </div>
              </div>
            )}
            <div style={{color:t.muted,fontSize:11,marginTop:8}}>
              🟩 Letra correcta en posición · 🟨 Letra en la palabra · ⬛ No está
            </div>
          </div>
        )}

        {game==="roulette"&&(
          <div style={{...card,textAlign:"center"}}>
            <div style={{fontSize:roulSpin?72:64,marginBottom:16,transition:"font-size 0.2s",display:"inline-block",animation:roulSpin?"spin 0.4s linear infinite":"none"}}>🎡</div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            {roulRes&&<div style={{fontSize:24,color:t.gold,fontWeight:900,marginBottom:16}}>➜ {roulRes}</div>}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:16}}>
              {roulOpts.map((opt,i)=>(
                <div key={i} style={{background:t.s2,border:`1px solid ${t.border}`,borderRadius:20,padding:"4px 12px",fontSize:13,display:"flex",gap:6,alignItems:"center"}}>
                  {opt}
                  <span onClick={()=>setRoulOpts(p=>p.filter((_,j)=>j!==i))} style={{cursor:"pointer",color:t.red,fontWeight:700}}>✕</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:12}}>
              <input style={{...inp,maxWidth:200}} placeholder="Nueva opción" value={roulIn} onChange={e=>setRoulIn(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&roulIn){setRoulOpts(p=>[...p,roulIn]);setRoulIn("");}}}/>
              <button onClick={()=>{if(roulIn){setRoulOpts(p=>[...p,roulIn]);setRoulIn("");}}} style={btn()}>+</button>
            </div>
            <button onClick={()=>{if(roulOpts.length===0)return;setRoulSpin(true);setRoulRes("");setTimeout(()=>{setRoulRes(roulOpts[Math.floor(Math.random()*roulOpts.length)]);setRoulSpin(false);},2000);}} disabled={roulSpin||roulOpts.length===0} style={btn()}>🎡 ¡Girar!</button>
          </div>
        )}

        {game==="magic8"&&(
          <div style={{...card,textAlign:"center"}}>
            <div style={{fontSize:80,marginBottom:16}}>🎱</div>
            {magic8A&&<div style={{background:t.s2,border:`1px solid ${t.blue}`,borderRadius:12,padding:20,marginBottom:16,fontSize:18,color:t.blue,fontStyle:"italic",maxWidth:400,margin:"0 auto 16px"}}>"{magic8A}"</div>}
            <input style={{...inp,maxWidth:400,margin:"0 auto 12px",display:"block",textAlign:"center"}} placeholder="Haz tu pregunta de sí o no..." value={magic8Q} onChange={e=>setMagic8Q(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&magic8Q)setMagic8A(MAGIC_8[Math.floor(Math.random()*MAGIC_8.length)]);}}/>
            <button onClick={()=>{ if(!magic8Q)return; setMagic8A(MAGIC_8[Math.floor(Math.random()*MAGIC_8.length)]); }} style={btn()}>🎱 ¡Preguntar!</button>
          </div>
        )}
      </div>
    );

    // ── TRIVIA ──
    case "trivia": return (
      <div style={wrap}>
        <div style={h2}>🎯 TRIVIA</div>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          {[["all","🌐 Todas"],["académico","📚 Académico"],["cultura","🎬 Cultura"]].map(([c,label])=>(
            <button key={c} onClick={()=>setTriviaCat(c)} style={{...btn(triviaCat===c?t.gold:t.s3,triviaCat===c?"#000":t.muted)}}>{label}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:12,marginBottom:16}}>
          <span style={tag(t.gold)}>🎯 Racha: {triviaStreak}</span>
          <span style={tag(t.blue)}>✅ Pts esta sesión: {triviaScore}</span>
          <span style={tag(t.muted)}>{filteredQ.length} preguntas</span>
        </div>
        {!triviaOn?(
          <div style={{...card,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>🎯</div>
            <button onClick={()=>{setTriviaOn(true);setTriviaIdx(0);setTriviaScore(0);setTriviaAns(null);}} style={btn()}>▶ Iniciar Trivia</button>
          </div>
        ):triviaIdx<filteredQ.length?(
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div style={{color:t.muted,fontSize:12}}>Pregunta {triviaIdx+1}/{filteredQ.length}</div>
              <span style={tag(t.gold)}>Racha: {triviaStreak}</span>
            </div>
            <div style={{height:4,background:t.s3,borderRadius:2,marginBottom:16}}>
              <div style={{height:4,background:t.gold,width:`${(triviaIdx/filteredQ.length)*100}%`,borderRadius:2}}/>
            </div>
            <div style={{fontSize:18,fontWeight:700,marginBottom:20}}>{filteredQ[triviaIdx].q}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {filteredQ[triviaIdx].opts.map((opt,i)=>{
                let bg=t.s2,border=t.border;
                if(triviaAns!==null){if(i===filteredQ[triviaIdx].a){bg=`${t.ok}44`;border=t.ok;}else if(triviaAns===i){bg=`${t.red}44`;border=t.red;}}
                return(
                  <button key={i} onClick={()=>triviaAns===null&&ansTrivia(i)} style={{background:bg,border:`2px solid ${border}`,borderRadius:10,padding:16,cursor:"pointer",color:t.text,fontSize:14,textAlign:"left",transition:"all 0.2s"}}>
                    <span style={{color:t.gold,fontWeight:700,marginRight:8}}>{String.fromCharCode(65+i)}.</span>{opt}
                  </button>
                );
              })}
            </div>
          </div>
        ):(
          <div style={{...card,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>🏆</div>
            <div style={{fontSize:32,color:t.gold,fontFamily:"Orbitron",fontWeight:900}}>{triviaScore}/{filteredQ.length}</div>
            <div style={{color:t.muted,margin:"8px 0 16px"}}>{Math.round(triviaScore/filteredQ.length*100)}% correctas</div>
            <button onClick={()=>{setTriviaOn(true);setTriviaIdx(0);setTriviaScore(0);setTriviaAns(null);}} style={btn()}>Jugar de nuevo</button>
          </div>
        )}
      </div>
    );

    // ── CONFESSIONS ──
    case "confessions": return (
      <div style={wrap}>
        <div style={h2}>🤫 CONFESIONES UNIVERSITARIAS</div>
        <div style={card}>
          <textarea style={{...inp,minHeight:80,width:"100%",marginBottom:8,resize:"vertical"}} placeholder="Comparte algo de forma anónima... nadie sabrá quién eres 🤫" value={""} onChange={()=>{}} ref={el=>{if(el)el.value="";}}/>
          <button onClick={()=>{
            const textarea=document.querySelector("textarea[placeholder*='anón']");
            if(!textarea||!textarea.value.trim())return;
            const conf={id:Date.now(),text:textarea.value,reactions:{},ts:new Date().toISOString()};
            const stored=JSON.parse(localStorage.getItem("sf_confessions")||"[]");
            stored.unshift(conf);
            localStorage.setItem("sf_confessions",JSON.stringify(stored));
            textarea.value="";
            toast("Confesión publicada 🤫");
          }} style={btn()}>Confesar anónimamente</button>
        </div>
        {(()=>{
          try{const cs=JSON.parse(localStorage.getItem("sf_confessions")||"[]");
          return cs.map(conf=>(
            <div key={conf.id} style={card}>
              <div style={{fontSize:14,marginBottom:10,lineHeight:1.6}}>{conf.text}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["😂","😭","😱","🔥","💀","❤️","🫡","😤"].map(emoji=>{
                  const c2=JSON.parse(localStorage.getItem("sf_confessions")||"[]");
                  const cc=c2.find(x=>x.id===conf.id);
                  const cnt=cc?.reactions?.[emoji]||0;
                  return(<button key={emoji} onClick={()=>{
                    const cs2=JSON.parse(localStorage.getItem("sf_confessions")||"[]");
                    const updated=cs2.map(c=>c.id===conf.id?{...c,reactions:{...c.reactions,[emoji]:(c.reactions[emoji]||0)+1}}:c);
                    localStorage.setItem("sf_confessions",JSON.stringify(updated));
                    toast(`${emoji} +1`);
                  }} style={{...btnO,fontSize:16,padding:"4px 10px"}}>{emoji} {cnt||""}</button>);
                })}
              </div>
            </div>
          ));}catch{return null;}
        })()}
      </div>
    );

    // ── REPUTATION ──
    case "reputation": return (
      <div style={wrap}>
        <div style={h2}>🏆 RANKING Y REPUTACIÓN</div>
        <div style={g2}>
          <div style={card}>
            <div style={h3}>Tu posición</div>
            <div style={{fontSize:56,color:t.gold,fontFamily:"Orbitron",fontWeight:900}}>{rep[user.email]||0}</div>
            <div style={{color:t.muted}}>puntos de reputación</div>
            <div style={{marginTop:12}}>
              <div style={{color:t.muted,fontSize:12,marginBottom:4}}>¿Cómo ganar puntos?</div>
              {[["Completar tareas","5 pts"],["Subir recursos","3 pts"],["Responder trivia","3 pts"],["Completar Pomodoros","5 pts"],["Enviar mensajes","1 pt"],["Ser mentor contactado","5 pts"]].map(([a,p])=>(
                <div key={a} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",borderBottom:`1px solid ${t.border}`}}>
                  <span>{a}</span><span style={{color:t.gold}}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={h3}>🥇 Top 10</div>
            {repBoard.map(([email,pts],i)=>(
              <div key={email} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${t.border}`}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:i===0?t.gold:i===1?"#aaa":i===2?"#cd7f32":t.s2,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,color:i<3?"#000":t.muted,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:email===user.email?700:400,color:email===user.email?t.gold:t.text,fontSize:13}}>{users[email]?.name||email}</div>
                  <div style={{color:t.muted,fontSize:11}}>{users[email]?.career}</div>
                </div>
                <div style={{color:t.gold,fontWeight:700}}>{pts}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={h3}>📚 Ranking por carreras</div>
          {Object.entries(Object.values(users).filter(u=>u.career).reduce((acc,u)=>{
            if(!acc[u.career]) acc[u.career]={count:0,pts:0};
            acc[u.career].count++;
            acc[u.career].pts+=(rep[u.email]||0);
            return acc;
          },{})).sort((a,b)=>b[1].pts-a[1].pts).map(([career,data])=>(
            <div key={career} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.border}`,fontSize:13}}>
              <div>{career}</div>
              <div style={{color:t.muted}}>{data.count} estudiantes · <span style={{color:t.gold}}>{data.pts} pts</span></div>
            </div>
          ))}
        </div>
      </div>
    );

    // ── PROFILE ──
    case "profile": return (
      <div style={wrap}>
        <div style={h2}>👤 MI PERFIL</div>
        {editProfile?(
          <div style={card}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["name","Nombre"],["career","Carrera"],["courses","Materias (coma separadas)"],["bio","Biografía"]].map(([k,label])=>(
                <input key={k} style={{...inp,width:"100%",gridColumn:k==="bio"||k==="courses"?"1/-1":"auto"}} placeholder={label} value={profForm[k]??user[k]??""} onChange={e=>setProfForm(p=>({...p,[k]:e.target.value}))} />
              ))}
              <select style={{...inp,width:"100%"}} value={profForm.year??user.year??1} onChange={e=>setProfForm(p=>({...p,year:e.target.value}))}>
                {[1,2,3,4,5,6].map(y=><option key={y} value={y}>{y}° año</option>)}
              </select>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:t.muted,fontSize:12}}>Color:</span>
                {["#FFD700","#00d4ff","#c0392b","#00ff88","#ff8800","#aa44ff"].map(c=>(
                  <div key={c} onClick={()=>setProfForm(p=>({...p,avatarColor:c}))} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:(profForm.avatarColor??user.avatarColor)===c?"3px solid white":"2px solid transparent"}}/>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={()=>{const up={...user,...profForm};setUser(up);setUsers(p=>({...p,[user.email]:up}));setEditProfile(false);toast("Perfil actualizado ✅");}} style={btn()}>Guardar</button>
              <button onClick={()=>setEditProfile(false)} style={btnO}>Cancelar</button>
            </div>
          </div>
        ):(
          <div style={card}>
            <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:16}}>
              <div style={{width:68,height:68,borderRadius:"50%",background:user.avatarColor||t.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:900,color:"#000",boxShadow:`0 0 24px ${user.avatarColor||t.gold}66`,flexShrink:0}}>{user.name[0]}</div>
              <div>
                <div style={{fontSize:22,fontWeight:900}}>{user.name}</div>
                <div style={{color:t.muted,fontSize:13}}>{user.email}</div>
                {user.isAdmin&&<span style={tag(t.gold)}>⚙️ Administrador</span>}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div><span style={{color:t.muted}}>Carrera:</span> {user.career}</div>
              <div><span style={{color:t.muted}}>Año:</span> {user.year}°</div>
              <div style={{gridColumn:"1/-1"}}><span style={{color:t.muted}}>Materias:</span> {user.courses||"No especificadas"}</div>
              {user.bio&&<div style={{gridColumn:"1/-1"}}><span style={{color:t.muted}}>Bio:</span> {user.bio}</div>}
              <div><span style={{color:t.muted}}>Reputación:</span> <span style={{color:t.gold,fontWeight:700}}>{rep[user.email]||0} pts</span></div>
              <div><span style={{color:t.muted}}>Miembro desde:</span> {new Date(user.joinDate).toLocaleDateString()}</div>
            </div>
            <button onClick={()=>{setProfForm({});setEditProfile(true);}} style={btn()}>✏️ Editar perfil</button>
          </div>
        )}
        <div style={card}>
          <div style={h3}>🏅 Logros</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {cond:(rep[user.email]||0)>=10,icon:"🌟",name:"Primeros pasos",desc:"10 pts de reputación"},
              {cond:pom.cycles>=10,icon:"🍅",name:"Pomodoro Activo",desc:"10 pomodoros"},
              {cond:tasks.filter(x=>x.done).length>=5,icon:"✅",name:"Cumplidor",desc:"5 tareas"},
              {cond:chessStats.w>=5,icon:"♔",name:"Ajedrecista",desc:"5 victorias"},
              {cond:resources.filter(r=>r.uploader===user.name).length>=1,icon:"📚",name:"Contribuidor",desc:"1 recurso subido"},
              {cond:triviaScore>=10,icon:"🎯",name:"Sabio",desc:"10 respuestas correctas"},
              {cond:diary.length>=5,icon:"📔",name:"Reflexivo",desc:"5 entradas en el diario"},
              {cond:chessStats.streak>=3,icon:"🔥",name:"En racha",desc:"3 victorias seguidas"},
            ].map((b,i)=>(
              <div key={i} style={{background:b.cond?`${t.gold}22`:t.s2,border:`1px solid ${b.cond?t.gold:t.border}`,borderRadius:10,padding:12,opacity:b.cond?1:0.45,width:120,textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:4}}>{b.icon}</div>
                <div style={{fontSize:12,fontWeight:700,color:b.cond?t.gold:t.muted}}>{b.name}</div>
                <div style={{fontSize:10,color:t.muted,marginTop:2}}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{color:t.muted}}>¿Listo para cerrar sesión?</div>
          <button onClick={()=>{setUser(null);setSec("home");}} style={btn(t.red,"#fff")}>Cerrar sesión</button>
        </div>
      </div>
    );

    // ── ABOUT ──
    case "about": return (
      <div style={wrap}>
        <div style={h2}>ℹ️ ACERCA DE</div>
        {editAbout&&isFirstUser?(
          <div style={card}>
            {[["name","Nombre de la plataforma"],["desc","Descripción"],["creator","Creador/Desarrollador"],["institution","Institución"],["social","Redes sociales"]].map(([k,label])=>(
              <input key={k} style={{...inp,width:"100%",marginBottom:8}} placeholder={label} value={about[k]} onChange={e=>setAbout(p=>({...p,[k]:e.target.value}))} />
            ))}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setEditAbout(false)} style={btn()}>Guardar</button>
              <button onClick={()=>setEditAbout(false)} style={btnO}>Cancelar</button>
            </div>
          </div>
        ):(
          <div style={{...card,textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:16}}>⚙️</div>
            <div style={{fontSize:28,fontWeight:900,color:t.gold,fontFamily:"Orbitron",marginBottom:8,textShadow:`0 0 16px ${t.gold}66`}}>{about.name}</div>
            <div style={{color:t.muted,marginBottom:20,maxWidth:500,margin:"0 auto 20px",lineHeight:1.6}}>{about.desc}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,textAlign:"left",maxWidth:400,margin:"0 auto",marginBottom:16}}>
              {[["Creador",about.creator],["Institución",about.institution],["Redes",about.social],["Versión","1.0.0"]].map(([k,v])=>(
                <div key={k}><span style={{color:t.muted,fontSize:12}}>{k}:</span><br/><span style={{fontWeight:700}}>{v}</span></div>
              ))}
            </div>
            {isFirstUser&&<button onClick={()=>setEditAbout(true)} style={btn()}>✏️ Editar información</button>}
          </div>
        )}
      </div>
    );

    default: return <div style={{color:t.muted,textAlign:"center",padding:60}}>Sección en desarrollo 🔧</div>;
    }
  };

  const NAV = [
    {id:"home",icon:"🏠",label:"Inicio"},
    {id:"channels",icon:"💬",label:"Canales"},
    {id:"tasks",icon:"✅",label:"Tareas"},
    {id:"calendar",icon:"📅",label:"Calendario"},
    {id:"pomodoro",icon:"🍅",label:"Pomodoro"},
    {id:"notes",icon:"📝",label:"Notas"},
    {id:"flashcards",icon:"🃏",label:"Flashcards"},
    {id:"gpa",icon:"📊",label:"Promedios"},
    {id:"attendance",icon:"📋",label:"Asistencia"},
    {id:"timetable",icon:"🗓️",label:"Horario"},
    {id:"resources",icon:"📚",label:"Recursos"},
    {id:"calculator",icon:"🧮",label:"Calculadora"},
    {id:"bibliography",icon:"📖",label:"Referencias"},
    {id:"mindmap",icon:"🧠",label:"Mapa Mental"},
    {id:"examsim",icon:"📝",label:"Simulador"},
    {id:"diary",icon:"📔",label:"Diario"},
    {id:"groups",icon:"👥",label:"Grupos"},
    {id:"mentorship",icon:"🎓",label:"Mentoría"},
    {id:"announcements",icon:"📢",label:"Anuncios"},
    {id:"games",icon:"🎮",label:"Juegos"},
    {id:"trivia",icon:"🎯",label:"Trivia"},
    {id:"confessions",icon:"🤫",label:"Confesiones"},
    {id:"reputation",icon:"🏆",label:"Ranking"},
    {id:"profile",icon:"👤",label:"Perfil"},
    {id:"about",icon:"ℹ️",label:"Acerca de"},
  ];

  return (
    <div style={{display:"flex",height:"100vh",background:t.bg,color:t.text,fontFamily:"Rajdhani,sans-serif",overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${t.border};border-radius:3px;}input,select,textarea{font-family:inherit;}button{font-family:inherit;transition:opacity 0.15s;}button:hover:not(:disabled){opacity:0.85;}button:disabled{opacity:0.4;cursor:not-allowed;}`}</style>

      {notif&&<div style={{position:"fixed",top:20,right:20,background:`${t.gold}22`,border:`1px solid ${t.gold}`,borderRadius:12,padding:"12px 20px",color:t.gold,fontWeight:700,zIndex:9999,backdropFilter:"blur(10px)",boxShadow:`0 0 20px ${t.gold}44`,fontSize:14}}>{notif}</div>}

      {focusOn&&<div style={{position:"fixed",top:0,left:0,right:0,background:`${t.blue}22`,borderBottom:`2px solid ${t.blue}`,padding:"6px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:1000}}>
        <span style={{color:t.blue,fontWeight:700,fontSize:13}}>🔒 MODO FOCUS — {fmtTime(focusLeft)}</span>
        <button onClick={stopFocus} style={{...btn(t.red,"#fff"),padding:"3px 12px",fontSize:12}}>Cancelar</button>
      </div>}

      {/* SIDEBAR */}
      <div style={{width:210,background:t.surface,borderRight:`1px solid ${t.border}`,display:"flex",flexDirection:"column",overflowY:"auto",flexShrink:0,marginTop:focusOn?36:0}}>
        <div style={{padding:"14px 12px",borderBottom:`1px solid ${t.border}`,background:`linear-gradient(135deg,${t.s2},${t.surface})`}}>
          <div style={{fontSize:18,fontWeight:900,letterSpacing:2,color:t.gold,textShadow:`0 0 10px ${t.gold}44`,fontFamily:"Orbitron"}}>⚙️ STUDYFORGE</div>
          <div style={{color:t.muted,fontSize:9,letterSpacing:3,marginTop:2}}>PLATAFORMA UCR</div>
        </div>
        <div style={{flex:1,paddingBottom:8,overflowY:"auto"}}>
          {NAV.map(item=>(
            <div key={item.id} onClick={()=>{ if(focusOn&&BLOCKED.includes(item.id)){toast("Modo focus activo 🔒");return;} setSec(item.id); }} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 12px",cursor:"pointer",borderRadius:6,margin:"1px 6px",background:sec===item.id?`${t.gold}22`:"transparent",color:sec===item.id?t.gold:t.muted,borderLeft:sec===item.id?`2px solid ${t.gold}`:"2px solid transparent",fontSize:13,transition:"all 0.15s"}}>
              <span style={{fontSize:14}}>{item.icon}</span>
              <span>{item.label}</span>
              {focusOn&&BLOCKED.includes(item.id)&&<span style={{marginLeft:"auto",fontSize:9}}>🔒</span>}
            </div>
          ))}
        </div>
        <div style={{padding:8,borderTop:`1px solid ${t.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 4px"}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:user.avatarColor||t.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#000",flexShrink:0}}>{user.name[0]}</div>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>{user.name.split(" ")[0]}</div>
                <div style={{fontSize:10,color:t.muted}}>{rep[user.email]||0} pts</div>
              </div>
            </div>
            <button onClick={()=>setDark(!dark)} style={{...btnO,fontSize:14,padding:"4px 8px"}}>{dark?"☀️":"🌙"}</button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",marginTop:focusOn?36:0}}>
        <div style={{padding:"9px 20px",background:t.surface,borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontWeight:700}}>{NAV.find(n=>n.id===sec)?.icon} {NAV.find(n=>n.id===sec)?.label}</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {pom.running&&<span style={tag(t.red)}>🍅 {fmtTime(pom.left)}</span>}
            <span style={tag(t.gold)}>⭐ {rep[user.email]||0} pts</span>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:20}}>
          {renderSection()}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{width:200,background:t.surface,borderLeft:`1px solid ${t.border}`,padding:12,overflowY:"auto",flexShrink:0,marginTop:focusOn?36:0,display:"flex",flexDirection:"column",gap:12}}>
        <div>
          <div style={{color:t.muted,fontSize:10,letterSpacing:2,marginBottom:6}}>EN LÍNEA</div>
          {Object.values(users).filter(u=>{ try{return new Date(u.lastActive)>new Date(Date.now()-5*60000);}catch{return false;} }).map(u=>(
            <div key={u.email} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:t.ok,flexShrink:0}}/>
              <div style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{color:t.muted,fontSize:10,letterSpacing:2,marginBottom:6}}>PRÓXIMOS</div>
          {upcoming.map(ev=>(
            <div key={ev.id} style={{background:t.s2,border:`1px solid ${daysUntil(ev.date)<=3?t.red:t.border}`,borderRadius:6,padding:8,marginBottom:6,fontSize:11}}>
              <div style={{fontWeight:700,marginBottom:2}}>{ev.title}</div>
              <div style={{color:daysUntil(ev.date)<=3?t.red:t.muted}}>{daysUntil(ev.date)===0 ? "Hoy!":daysUntil(ev.date)<0?"Vencido":`${daysUntil(ev.date)}d`}</div>
            </div>
          ))}
          {!upcoming.length&&<div style={{color:t.muted,fontSize:11}}>Sin eventos</div>}
        </div>
        <div>
          <div style={{color:t.muted,fontSize:10,letterSpacing:2,marginBottom:6}}>RETO SEMANAL</div>
          <div style={{background:`${t.gold}11`,border:`1px solid ${t.gold}33`,borderRadius:6,padding:8,fontSize:11}}>
            <div style={{color:t.gold,fontWeight:700,marginBottom:4}}>{weekChallenge.title}</div>
            <div style={{height:3,background:t.s3,borderRadius:2,marginBottom:4}}>
              <div style={{height:3,background:t.gold,width:`${Math.min(100,(chalProgress[weekChallenge.metric]||0)/weekChallenge.goal*100)}%`,borderRadius:2}}/>
            </div>
            <div style={{color:t.muted}}>{chalProgress[weekChallenge.metric]||0}/{weekChallenge.goal}</div>
          </div>
        </div>
      </div>
    </div>
  );
}