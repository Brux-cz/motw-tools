(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(r){if(r.ep)return;r.ep=!0;const a=n(r);fetch(r.href,a)}})();const M=(e,t)=>t.some(n=>e instanceof n);let j,B;function U(){return j||(j=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function G(){return B||(B=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const S=new WeakMap,k=new WeakMap,y=new WeakMap;function X(e){const t=new Promise((n,s)=>{const r=()=>{e.removeEventListener("success",a),e.removeEventListener("error",o)},a=()=>{n(x(e.result)),r()},o=()=>{s(e.error),r()};e.addEventListener("success",a),e.addEventListener("error",o)});return y.set(t,e),t}function J(e){if(S.has(e))return;const t=new Promise((n,s)=>{const r=()=>{e.removeEventListener("complete",a),e.removeEventListener("error",o),e.removeEventListener("abort",o)},a=()=>{n(),r()},o=()=>{s(e.error||new DOMException("AbortError","AbortError")),r()};e.addEventListener("complete",a),e.addEventListener("error",o),e.addEventListener("abort",o)});S.set(e,t)}let I={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return S.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return x(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function F(e){I=e(I)}function Q(e){return G().includes(e)?function(...t){return e.apply(D(this),t),x(this.request)}:function(...t){return x(e.apply(D(this),t))}}function Y(e){return typeof e=="function"?Q(e):(e instanceof IDBTransaction&&J(e),M(e,U())?new Proxy(e,I):e)}function x(e){if(e instanceof IDBRequest)return X(e);if(k.has(e))return k.get(e);const t=Y(e);return t!==e&&(k.set(e,t),y.set(t,e)),t}const D=e=>y.get(e);function ee(e,t,{blocked:n,upgrade:s,blocking:r,terminated:a}={}){const o=indexedDB.open(e,t),p=x(o);return s&&o.addEventListener("upgradeneeded",i=>{s(x(o.result),i.oldVersion,i.newVersion,x(o.transaction),i)}),n&&o.addEventListener("blocked",i=>n(i.oldVersion,i.newVersion,i)),p.then(i=>{a&&i.addEventListener("close",()=>a()),r&&i.addEventListener("versionchange",m=>r(m.oldVersion,m.newVersion,m))}).catch(()=>{}),p}const te=["get","getKey","getAll","getAllKeys","count"],ne=["put","add","delete","clear"],$=new Map;function _(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if($.get(t))return $.get(t);const n=t.replace(/FromIndex$/,""),s=t!==n,r=ne.includes(n);if(!(n in(s?IDBIndex:IDBObjectStore).prototype)||!(r||te.includes(n)))return;const a=async function(o,...p){const i=this.transaction(o,r?"readwrite":"readonly");let m=i.store;return s&&(m=m.index(p.shift())),(await Promise.all([m[n](...p),r&&i.done]))[0]};return $.set(t,a),a}F(e=>({...e,get:(t,n,s)=>_(t,n)||e.get(t,n,s),has:(t,n)=>!!_(t,n)||e.has(t,n)}));const se=["continue","continuePrimaryKey","advance"],A={},T=new WeakMap,q=new WeakMap,re={get(e,t){if(!se.includes(t))return e[t];let n=A[t];return n||(n=A[t]=function(...s){T.set(this,q.get(this)[t](...s))}),n}};async function*ae(...e){let t=this;if(t instanceof IDBCursor||(t=await t.openCursor(...e)),!t)return;t=t;const n=new Proxy(t,re);for(q.set(n,t),y.set(n,D(t));t;)yield n,t=await(T.get(n)||t.continue()),T.delete(n)}function H(e,t){return t===Symbol.asyncIterator&&M(e,[IDBIndex,IDBObjectStore,IDBCursor])||t==="iterate"&&M(e,[IDBIndex,IDBObjectStore])}F(e=>({...e,get(t,n,s){return H(t,n)?ae:e.get(t,n,s)},has(t,n){return H(t,n)||e.has(t,n)}}));const oe="motw-db",ie=1,f={campaigns:"campaigns",settings:"settings"};let v=null;async function W(){if(v)return v;try{return v=await ee(oe,ie,{upgrade(e,t,n,s){if(console.log(`Upgrading DB from version ${t} to ${n}`),!e.objectStoreNames.contains(f.campaigns)){const r=e.createObjectStore(f.campaigns,{keyPath:"id",autoIncrement:!1});r.createIndex("name","name",{unique:!1}),r.createIndex("lastModified","lastModified",{unique:!1})}e.objectStoreNames.contains(f.settings)||e.createObjectStore(f.settings,{keyPath:"key"})}}),console.log("IndexedDB initialized"),v}catch(e){throw console.error("Failed to initialize IndexedDB:",e),e}}async function ce(e){const t=await W(),n={...e,lastModified:Date.now()};try{return await t.put(f.campaigns,n),console.log("Campaign saved:",e.id),n}catch(s){throw console.error("Failed to save campaign:",s),s}}const de={campaign:null,currentMystery:null,currentTab:"session",isFooterExpanded:!1,settings:{autoSave:!0,autoSaveDelay:500}};let u={...de},h=[],L=null;function K(e){return h.push(e),()=>{h=h.filter(t=>t!==e)}}function c(){return{...u}}function d(e){const t={...u};u={...u,...e},console.log("State updated:",e),h.forEach(n=>{try{n(u,t)}catch(s){console.error("Listener error:",s)}}),u.settings.autoSave&&e.campaign&&le()}function le(){L&&clearTimeout(L),L=setTimeout(async()=>{if(u.campaign)try{await ce(u.campaign),console.log("Auto-saved campaign")}catch(e){console.error("Auto-save failed:",e)}},u.settings.autoSaveDelay)}function pe(e){const t={id:ue(),name:e,hunters:[],arcs:[],mysteries:[],npcArchive:[],locationArchive:[],sessionLog:[],createdAt:Date.now(),lastModified:Date.now()};return d({campaign:t}),t}function ue(){return`${Date.now()}-${Math.random().toString(36).substr(2,9)}`}typeof window<"u"&&(window.__MOTW_STATE__={getState:c,setState:d,subscribe:K});function me(){document.querySelectorAll("[data-tab]").forEach(t=>{t.addEventListener("click",n=>{const s=n.currentTarget.dataset.tab;s&&C(s)})}),console.log("Tabs initialized")}function C(e){const{currentTab:t}=c(),n=document.getElementById(`tab-${t}`);n&&n.classList.add("hidden");const s=document.getElementById(`tab-${e}`);s&&s.classList.remove("hidden"),document.querySelectorAll("[data-tab]").forEach(a=>{a.classList.remove("sidebar-item-active")});const r=document.querySelector(`[data-tab="${e}"]`);r&&r.classList.add("sidebar-item-active"),d({currentTab:e}),console.log("Switched to tab:",e)}function xe(){const e=document.getElementById("footer-toggle");e&&e.addEventListener("click",R),document.querySelectorAll("[data-hunter-index]").forEach(t=>{t.addEventListener("click",n=>{const s=parseInt(n.currentTarget.dataset.hunterIndex);V(s)})}),console.log("Footer initialized")}function R(){const{isFooterExpanded:e}=c(),t=document.getElementById("hunter-footer"),n=document.getElementById("footer-collapsed"),s=document.getElementById("footer-expanded"),r=document.getElementById("footer-chevron"),a=document.querySelector(".app-grid");if(!t||!n||!s||!r){console.error("Footer elements not found");return}e?(t.style.height="48px",n.classList.remove("hidden"),s.classList.add("hidden"),r.textContent="expand_less",a&&(a.style.gridTemplateRows="60px 1fr 48px")):(t.style.height="300px",n.classList.add("hidden"),s.classList.remove("hidden"),r.textContent="expand_more",a&&(a.style.gridTemplateRows="60px 1fr 300px")),d({isFooterExpanded:!e})}function V(e){const{isFooterExpanded:t}=c();t||R(),console.log("Expand to hunter:",e)}function g(){const{campaign:e}=c();if(!e||!e.hunters)return;const t=document.getElementById("footer-collapsed");if(!t)return;const n=e.hunters.map((s,r)=>`
    <div class="flex items-center gap-3 cursor-pointer hover:bg-white/5 px-3 py-1 rounded transition" data-hunter-index="${r}">
      <span class="material-symbols-outlined text-gray-400">person</span>
      <span class="text-xs font-semibold text-gray-300">${s.name||`Hunter ${r+1}`}</span>
      <div class="flex gap-1">
        <span class="text-[10px] text-red-500" title="Harm">${s.harm||0}/7</span>
        <span class="text-[10px] text-blue-500" title="Luck">${s.luck||7}/7</span>
      </div>
    </div>
  `).join("");t.innerHTML=`
    <div class="h-[48px] flex items-center justify-between px-6">
      <div class="flex items-center gap-6">
        ${n||'<span class="text-xs text-gray-500">No hunters yet</span>'}
      </div>
      <button id="btn-add-hunter" class="text-gray-400 hover:text-white transition">
        <span class="material-symbols-outlined">add</span>
      </button>
    </div>
  `,t.querySelectorAll("[data-hunter-index]").forEach(s=>{s.addEventListener("click",r=>{const a=parseInt(r.currentTarget.dataset.hunterIndex);V(a)})})}function b(){const{campaign:e}=c();if(!e||!e.hunters)return;const t=document.getElementById("footer-expanded");if(!t)return;const n=e.hunters.map((s,r)=>`
    <div class="border-b border-white/5 p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-gray-400">person</span>
          <div>
            <h4 class="font-semibold text-gray-200">${s.name||`Hunter ${r+1}`}</h4>
            <span class="text-xs text-gray-500">${s.playbook||"Unknown Playbook"}</span>
          </div>
        </div>
        <button class="text-gray-400 hover:text-red-500 transition">
          <span class="material-symbols-outlined">edit</span>
        </button>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <!-- Harm -->
        <div>
          <div class="text-[10px] text-gray-500 uppercase mb-2">Harm (${s.harm||0}/7)</div>
          <div class="flex gap-1">
            ${Array.from({length:7},(a,o)=>`
              <div class="harm-box ${o<(s.harm||0)?"harm-box-filled":""}" data-hunter="${s.id}" data-type="harm" data-index="${o}"></div>
            `).join("")}
          </div>
        </div>

        <!-- Luck -->
        <div>
          <div class="text-[10px] text-gray-500 uppercase mb-2">Luck (${s.luck||7}/7)</div>
          <div class="flex gap-1">
            ${Array.from({length:7},(a,o)=>`
              <div class="luck-box ${o<(s.luck||7)?"luck-box-filled":""}" data-hunter="${s.id}" data-type="luck" data-index="${o}"></div>
            `).join("")}
          </div>
        </div>

        <!-- XP -->
        <div>
          <div class="text-[10px] text-gray-500 uppercase mb-2">XP (${s.experience||0}/5)</div>
          <div class="flex items-center gap-2">
            <button class="xp-decrement text-gray-400 hover:text-red-500 transition" data-hunter="${s.id}">
              <span class="material-symbols-outlined text-lg">remove</span>
            </button>
            <div class="text-2xl font-bold text-green-500 min-w-[2rem] text-center">${s.experience||0}</div>
            <button class="xp-increment text-gray-400 hover:text-green-500 transition" data-hunter="${s.id}">
              <span class="material-symbols-outlined text-lg">add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join("");t.innerHTML=`
    <div class="h-[300px] overflow-y-auto">
      ${n||'<div class="p-6 text-center text-gray-500">No hunters yet</div>'}
    </div>
  `,fe()}function fe(){document.querySelectorAll(".harm-box").forEach(e=>{e.addEventListener("click",t=>{const n=t.target.dataset.hunter,s=parseInt(t.target.dataset.index);ge(n,s)})}),document.querySelectorAll(".luck-box").forEach(e=>{e.addEventListener("click",t=>{const n=t.target.dataset.hunter,s=parseInt(t.target.dataset.index);be(n,s)})}),document.querySelectorAll(".xp-increment").forEach(e=>{e.addEventListener("click",t=>{const n=t.currentTarget.dataset.hunter;z(n,1)})}),document.querySelectorAll(".xp-decrement").forEach(e=>{e.addEventListener("click",t=>{const n=t.currentTarget.dataset.hunter;z(n,-1)})})}function ge(e,t){const{campaign:n}=c();if(!n)return;const s=n.hunters.find(a=>a.id===e);if(!s)return;const r=s.harm||0;t===r?s.harm=Math.min(7,r+1):t<r&&(s.harm=t),d({campaign:n}),b(),g()}function be(e,t){const{campaign:n}=c();if(!n)return;const s=n.hunters.find(a=>a.id===e);if(!s)return;const r=s.luck||7;t===r-1?s.luck=Math.max(0,r-1):t>=r&&(s.luck=Math.min(7,t+1)),d({campaign:n}),b(),g()}function z(e,t){const{campaign:n}=c();if(!n)return;const s=n.hunters.find(a=>a.id===e);if(!s)return;const r=s.experience||0;s.experience=Math.max(0,Math.min(5,r+t)),s.experience===5&&t>0&&console.log("Level up!",s.name),d({campaign:n}),b(),g()}function ve(){document.querySelectorAll("[data-countdown-phase]").forEach((t,n)=>{t.addEventListener("click",()=>{O(n)})}),O(0),console.log("Timeline initialized")}function O(e){document.querySelectorAll("[data-countdown-phase]").forEach((n,s)=>{const r=s<=e,a=s<e;n.classList.toggle("timeline-node-active",r),a?n.style.background="#b91c1c":n.style.background="#1e1e1e"}),console.log("Countdown set to phase:",e)}function l(e,t=document){return t.querySelector(e)}function w(){const e=l("#tab-session");if(!e)return;const t=c(),n=t.campaign?.mysteries?.find(s=>s.id===t.currentMysteryId);e.innerHTML=`
    <div class="grid grid-cols-12 gap-6 h-full">
      <!-- LEFT COLUMN: Countdown + Game Log -->
      <div class="col-span-3 flex flex-col gap-6">
        ${he(n)}
        ${ye(t.sessionLog||[])}
      </div>

      <!-- MIDDLE COLUMN: Pinned Cards -->
      <div class="col-span-5 flex flex-col gap-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">Připnuté karty</h2>
          <div class="flex gap-2">
            <button id="btn-add-card" class="text-xs bg-red-900/40 hover:bg-red-800/60 px-3 py-1 rounded border border-red-700/50 transition">
              + Karta
            </button>
            <button id="btn-generate-npc" class="text-xs bg-gray-700/40 hover:bg-gray-600/60 px-3 py-1 rounded border border-gray-600/50 transition">
              🎲 NPC
            </button>
          </div>
        </div>
        <div id="pinned-cards-container" class="flex-1 overflow-y-auto space-y-4">
          ${we(n)}
        </div>
      </div>

      <!-- RIGHT COLUMN: Keeper Panel -->
      <div class="col-span-4 flex flex-col">
        ${Me()}
      </div>
    </div>
  `,Se()}function he(e){if(!e)return`
      <div class="bg-black/40 border border-white/5 rounded-lg p-6">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Odpočet</h2>
        <p class="text-sm text-gray-500">Žádná aktivní záhada</p>
      </div>
    `;const t=[{key:"day",label:"Den"},{key:"shadows",label:"Příšeří"},{key:"sunset",label:"Západ"},{key:"dusk",label:"Soumrak"},{key:"nightfall",label:"Noc"},{key:"midnight",label:"Půlnoc"}],n=e.countdown?.currentPhase||0,s=e.countdown?.phases||[];return`
    <div class="bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col">
      <div class="p-4 border-b border-white/5">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">Odpočet</h2>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        ${t.map((r,a)=>{const o=a===n,p=a<n,i=s[a]?.description||"Žádný popis";return`
            <button
              class="countdown-phase w-full text-left p-3 rounded border transition ${o?"bg-red-900/30 border-red-700/50 ring-2 ring-red-700/30":p?"bg-gray-800/20 border-white/5 opacity-50":"bg-black/20 border-white/5 hover:bg-white/5"}"
              data-phase-index="${a}"
              ${p?"disabled":""}
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="material-symbols-outlined text-sm ${o?"text-red-400":"text-gray-500"}">
                  ${o?"radio_button_checked":p?"check_circle":"radio_button_unchecked"}
                </span>
                <span class="text-xs font-bold uppercase tracking-wider ${o?"text-red-300":"text-gray-400"}">
                  ${r.label}
                </span>
              </div>
              <p class="text-xs text-gray-400 ml-6 line-clamp-2">${i}</p>
            </button>
          `}).join("")}
      </div>

      <div class="p-4 border-t border-white/5">
        <button id="btn-advance-countdown" class="w-full bg-red-900/40 hover:bg-red-800/60 px-4 py-2 rounded border border-red-700/50 transition text-sm font-semibold flex items-center justify-center gap-2"
          ${n>=5?"disabled":""}>
          <span class="material-symbols-outlined text-sm">skip_next</span>
          Posunout ▸
        </button>
      </div>
    </div>
  `}function ye(e){return`
    <div class="bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col flex-1">
      <div class="p-4 border-b border-white/5">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">Herní log</h2>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        ${e.length===0?`
          <p class="text-xs text-gray-500 italic">Zatím žádné záznamy</p>
        `:e.map(t=>`
          <div class="text-xs border-l-2 border-gray-700 pl-3 py-1">
            <div class="text-gray-500 text-[10px] mb-0.5">${Be(t.timestamp)}</div>
            <div class="text-gray-300">${t.text}</div>
          </div>
        `).reverse().join("")}
      </div>

      <div class="p-4 border-t border-white/5">
        <div class="flex gap-2">
          <input
            type="text"
            id="log-input"
            placeholder="Přidat poznámku..."
            class="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-700/50"
          />
          <button id="btn-add-log" class="bg-red-900/40 hover:bg-red-800/60 px-4 py-2 rounded border border-red-700/50 transition text-sm">
            <span class="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
      </div>
    </div>
  `}function we(e){if(!e)return`
      <div class="text-center py-12 text-gray-500">
        <span class="material-symbols-outlined text-4xl mb-2 block opacity-20">style</span>
        <p class="text-sm">Žádné připnuté karty</p>
      </div>
    `;const t=[];return e.monster&&t.push(ke(e.monster)),e.bystanders&&e.bystanders.forEach(n=>{t.push($e(n))}),e.locations&&e.locations.forEach(n=>{t.push(Le(n))}),t.length===0?`
      <div class="text-center py-12 text-gray-500">
        <span class="material-symbols-outlined text-4xl mb-2 block opacity-20">style</span>
        <p class="text-sm">Žádné připnuté karty</p>
        <p class="text-xs mt-1">Přidej kartu nebo vygeneruj NPC</p>
      </div>
    `:t.join("")}function ke(e){return`
    <div class="card bg-gradient-to-br from-red-950/40 to-black/40 border border-red-900/50 rounded-lg overflow-hidden">
      <div class="p-4">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-red-400 text-sm">pest_control</span>
              <span class="text-xs font-bold uppercase tracking-wider text-red-300">Příšera</span>
            </div>
            <h3 class="text-lg font-bold text-white">${e.name}</h3>
            <p class="text-xs text-gray-400">${e.type}</p>
          </div>
          <button class="text-gray-400 hover:text-white transition" data-card-id="${e.id}" data-card-type="monster">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        ${e.description?`<p class="text-sm text-gray-300 mb-3">${e.description}</p>`:""}

        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div class="text-gray-500 uppercase text-[10px] tracking-wider mb-1">Zranění</div>
            <div class="flex gap-1">
              ${Ee(e.harm||10,e.currentHarm||0)}
            </div>
          </div>
          <div>
            <div class="text-gray-500 uppercase text-[10px] tracking-wider mb-1">Zbroj</div>
            <div class="text-white font-semibold">${e.armor||0}</div>
          </div>
        </div>

        ${e.weakness?`
          <div class="mt-3 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded">
            <div class="text-[10px] text-yellow-400 uppercase tracking-wider mb-1">Slabina</div>
            <div class="text-xs text-yellow-200">${e.weakness}</div>
          </div>
        `:""}
      </div>
    </div>
  `}function $e(e){return`
    <div class="card bg-black/40 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition">
      <div class="p-4">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-blue-400 text-sm">person</span>
              <span class="text-xs font-bold uppercase tracking-wider text-blue-300">${e.type}</span>
            </div>
            <h3 class="text-base font-bold text-white">${e.name}</h3>
          </div>
          <button class="text-gray-400 hover:text-white transition" data-card-id="${e.id}" data-card-type="npc">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        ${e.description?`<p class="text-xs text-gray-400">${e.description}</p>`:""}
      </div>
    </div>
  `}function Le(e){return`
    <div class="card bg-black/40 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition">
      <div class="p-4">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-green-400 text-sm">place</span>
              <span class="text-xs font-bold uppercase tracking-wider text-green-300">${e.type}</span>
            </div>
            <h3 class="text-base font-bold text-white">${e.name}</h3>
          </div>
          <button class="text-gray-400 hover:text-white transition" data-card-id="${e.id}" data-card-type="location">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        ${e.description?`<p class="text-xs text-gray-400">${e.description}</p>`:""}
      </div>
    </div>
  `}function Ee(e,t){const n=[];for(let s=0;s<e;s++){const r=s<t;n.push(`
      <button class="harm-box w-5 h-5 border ${r?"bg-red-700 border-red-600":"bg-black/40 border-white/20 hover:border-red-700/50"} rounded transition" data-harm-index="${s}"></button>
    `)}return n.join("")}function Me(){return`
    <div class="bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col h-full">
      <!-- Tabs -->
      <div class="flex border-b border-white/5">
        <button class="keeper-tab keeper-tab-active flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition" data-keeper-tab="moves">
          Tahy SM
        </button>
        <button class="keeper-tab flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition border-l border-r border-white/5" data-keeper-tab="hunter-moves">
          Tahy lovců
        </button>
        <button class="keeper-tab flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition" data-keeper-tab="weapons">
          Zbraně
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <div id="keeper-content-moves" class="keeper-content">
          <div class="text-xs text-gray-400">Načítání tahů Strážce...</div>
        </div>
        <div id="keeper-content-hunter-moves" class="keeper-content hidden">
          <div class="text-xs text-gray-400">Načítání tahů lovců...</div>
        </div>
        <div id="keeper-content-weapons" class="keeper-content hidden">
          <div class="text-xs text-gray-400">Načítání zbraní...</div>
        </div>
      </div>
    </div>
  `}function Se(){const e=l("#btn-advance-countdown");e&&e.addEventListener("click",Ie);const t=l("#btn-add-log"),n=l("#log-input");t&&n&&(t.addEventListener("click",()=>P(n.value)),n.addEventListener("keypress",r=>{r.key==="Enter"&&P(n.value)})),document.querySelectorAll(".keeper-tab").forEach(r=>{r.addEventListener("click",()=>{const a=r.dataset.keeperTab;De(a)})}),Z()}function Ie(){const e=c(),t=e.campaign?.mysteries?.find(r=>r.id===e.currentMysteryId);if(!t||!t.countdown)return;const n=t.countdown.currentPhase||0;if(n>=5)return;t.countdown.currentPhase=n+1,d({campaign:e.campaign}),P(`Odpočet posunut: ${["Den","Příšeří","Západ","Soumrak","Noc","Půlnoc"][n+1]}`),w()}function P(e){if(!e||!e.trim())return;const n=c().sessionLog||[];n.push({timestamp:Date.now(),text:e.trim()}),d({sessionLog:n});const s=l("#log-input");s&&(s.value=""),w()}function De(e){document.querySelectorAll(".keeper-tab").forEach(n=>{n.dataset.keeperTab===e?n.classList.add("keeper-tab-active"):n.classList.remove("keeper-tab-active")}),document.querySelectorAll(".keeper-content").forEach(n=>{n.classList.add("hidden")});const t=l(`#keeper-content-${e}`);t&&t.classList.remove("hidden"),e==="moves"?Z():e==="hunter-moves"?Te():e==="weapons"&&Ce()}async function Z(){const e=l("#keeper-content-moves");if(e)try{const n=await(await fetch("/motw-tools/data/keeper-moves.json")).json(),s=n.filter(o=>o.type==="soft"),r=n.filter(o=>o.type==="hard"),a=n.filter(o=>o.type!=="soft"&&o.type!=="hard");e.innerHTML=`
      <div class="space-y-4">
        ${s.length>0?`
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Měkké tahy</h3>
            <div class="space-y-1">
              ${s.map(o=>E(o)).join("")}
            </div>
          </div>
        `:""}

        ${r.length>0?`
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Tvrdé tahy</h3>
            <div class="space-y-1">
              ${r.map(o=>E(o)).join("")}
            </div>
          </div>
        `:""}

        ${a.length>0?`
          <div class="space-y-1">
            ${a.map(o=>E(o)).join("")}
          </div>
        `:""}
      </div>
    `}catch(t){console.error("Failed to load keeper moves:",t),e.innerHTML='<p class="text-xs text-red-400">Nepodařilo se načíst tahy Strážce</p>'}}function E(e){return`
    <details class="group bg-black/20 border border-white/5 rounded hover:border-white/10 transition">
      <summary class="px-3 py-2 cursor-pointer list-none flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-200">${e.name_cz}</span>
        <span class="material-symbols-outlined text-gray-500 text-sm group-open:rotate-180 transition-transform">expand_more</span>
      </summary>
      <div class="px-3 pb-3 pt-2 border-t border-white/5 space-y-2">
        <p class="text-xs text-gray-400">${e.description}</p>
        ${e.examples&&e.examples.length>0?`
          <div class="mt-2">
            <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Příklady:</div>
            <div class="space-y-1">
              ${e.examples.map(t=>`
                <div class="text-xs text-gray-400 italic pl-3 border-l-2 border-gray-700">${t}</div>
              `).join("")}
            </div>
          </div>
        `:""}
      </div>
    </details>
  `}async function Te(){const e=l("#keeper-content-hunter-moves");if(e)try{const n=await(await fetch("/motw-tools/data/basic-moves.json")).json();e.innerHTML=`
      <div class="space-y-2">
        ${n.map(s=>Pe(s)).join("")}
      </div>
    `}catch(t){console.error("Failed to load hunter moves:",t),e.innerHTML='<p class="text-xs text-red-400">Nepodařilo se načíst tahy lovců</p>'}}function Pe(e){return`
    <details class="group bg-black/20 border border-white/5 rounded hover:border-white/10 transition">
      <summary class="px-3 py-2 cursor-pointer list-none flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-200">${e.name_cz}</span>
          <span class="text-[10px] text-gray-500 uppercase tracking-wider">+${e.stat_cz}</span>
        </div>
        <span class="material-symbols-outlined text-gray-500 text-sm group-open:rotate-180 transition-transform">expand_more</span>
      </summary>
      <div class="px-3 pb-3 pt-2 border-t border-white/5 space-y-2">
        <div class="text-xs text-gray-400 italic">${e.trigger_cz}</div>

        <div class="space-y-2 mt-3">
          <div>
            <div class="text-[10px] text-green-400 uppercase tracking-wider mb-1">10+</div>
            <div class="text-xs text-gray-300">${e.result_10plus}</div>
            ${e.result_10plus_options?`
              <ul class="mt-1 space-y-1">
                ${e.result_10plus_options.map(t=>`
                  <li class="text-xs text-gray-400 ml-3">• ${t}</li>
                `).join("")}
              </ul>
            `:""}
          </div>

          <div>
            <div class="text-[10px] text-yellow-400 uppercase tracking-wider mb-1">7-9</div>
            <div class="text-xs text-gray-300">${e.result_7_9}</div>
          </div>

          <div>
            <div class="text-[10px] text-red-400 uppercase tracking-wider mb-1">6-</div>
            <div class="text-xs text-gray-300">${e.result_6_minus}</div>
          </div>

          ${e.questions&&e.questions.length>0?`
            <div class="mt-2">
              <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Otázky:</div>
              <ul class="space-y-1">
                ${e.questions.map(t=>`
                  <li class="text-xs text-gray-400 ml-3">• ${t}</li>
                `).join("")}
              </ul>
            </div>
          `:""}
        </div>
      </div>
    </details>
  `}async function Ce(){const e=l("#keeper-content-weapons");if(e)try{const n=await(await fetch("/motw-tools/data/weapons.json")).json(),s={improvised:{name:"Improvizované",weapons:[]},melee:{name:"Chladné zbraně",weapons:[]},firearms:{name:"Střelné zbraně",weapons:[]},heavy:{name:"Těžké zbraně",weapons:[]},special:{name:"Speciální",weapons:[]},magic:{name:"Magie",weapons:[]},natural:{name:"Přirozené",weapons:[]}};n.weapons.forEach(r=>{s[r.category]&&s[r.category].weapons.push(r)}),e.innerHTML=`
      <div class="space-y-4">
        ${Object.entries(s).map(([r,a])=>a.weapons.length===0?"":`
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">${a.name}</h3>
              <div class="space-y-1">
                ${a.weapons.map(o=>je(o,n.tags)).join("")}
              </div>
            </div>
          `).join("")}
      </div>
    `}catch(t){console.error("Failed to load weapons:",t),e.innerHTML='<p class="text-xs text-red-400">Nepodařilo se načíst zbraně</p>'}}function je(e,t){const n=e.tags.map(s=>{const r=t.find(a=>a.name===s);return r?`${r.name_cz}: ${r.description}`:s});return`
    <details class="group bg-black/20 border border-white/5 rounded hover:border-white/10 transition">
      <summary class="px-3 py-2 cursor-pointer list-none flex items-center justify-between">
        <div class="flex items-center gap-3 flex-1">
          <span class="text-sm font-semibold text-gray-200">${e.name_cz}</span>
          <span class="text-xs text-gray-500">${e.harm}-harm</span>
          <span class="text-xs text-gray-500">${e.range_cz}</span>
        </div>
        ${e.tags.length>0?`
          <span class="material-symbols-outlined text-gray-500 text-sm group-open:rotate-180 transition-transform">expand_more</span>
        `:""}
      </summary>
      ${e.tags.length>0?`
        <div class="px-3 pb-2 pt-1 border-t border-white/5">
          <div class="flex flex-wrap gap-1">
            ${e.tags.map((s,r)=>`
              <span class="text-[10px] bg-gray-700/40 px-2 py-0.5 rounded border border-gray-600/50" title="${n[r]}">
                ${t.find(a=>a.name===s)?.name_cz||s}
              </span>
            `).join("")}
          </div>
        </div>
      `:""}
    </details>
  `}function Be(e){return new Date(e).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}async function N(){console.log("🎲 Initializing Strážcovský panel...");try{await W(),console.log("✓ Database initialized"),me(),xe(),console.log("✓ UI components initialized"),K((e,t)=>{console.log("State changed:",{newState:e,oldState:t}),e.campaign!==t.campaign&&_e(e.campaign),e.campaign?.hunters!==t.campaign?.hunters&&(g(),b())}),Ae(),w(),C("session"),g(),b(),console.log("✓ Application initialized")}catch(e){console.error("Failed to initialize application:",e),He("Nepodařilo se načíst aplikaci. Zkuste obnovit stránku.")}}function _e(e){if(!e)return;const t=l("#campaign-name");t&&(t.textContent=e.name)}function Ae(){const e=pe("Pine Woods Horror");e.hunters=[{id:"hunter-1",name:"Sam Winchester",playbook:"Professional",harm:2,luck:5,experience:1},{id:"hunter-2",name:"Dean Winchester",playbook:"Wronged",harm:3,luck:6,experience:0},{id:"hunter-3",name:"Castiel",playbook:"Divine",harm:0,luck:7,experience:2}];const t={id:"mystery-1",name:"Hollow Creek Disappearances",status:"active",hook:"Teenagers are vanishing in the woods around Hollow Creek. Local authorities are baffled.",monster:{id:"monster-1",name:"Rev. Silas Thorne",type:"Sorcerer",motivation:"Gain supernatural power",description:"Former minister turned to dark magic, seeks immortality",powers:["Magic","Mind Control","Telekinesis"],attack:{description:"Dark energy blast",harm:3,range:"close"},harm:10,currentHarm:3,armor:1,weakness:"Break his staff of power"},bystanders:[{id:"npc-1",name:"Dave Holloway",type:"Gossip",motivation:"Spread rumors",description:"Bartender at Rusty Nail, knows everyone's business"},{id:"npc-2",name:"Sheriff Morgan",type:"Official",motivation:"Maintain order",description:"Small-town sheriff, skeptical of supernatural"}],locations:[{id:"loc-1",name:"Rusty Nail Bar",type:"Crossroads",motivation:"Bring people together",description:"Only bar in town, gossip central"}],countdown:{structure:"escalation",currentPhase:2,phases:[{day:"Day",description:"First teenager goes missing from campsite"},{day:"Shadows",description:"Second victim taken near the old church ruins"},{day:"Sunset",description:"Silas performs ritual, gains more power"},{day:"Dusk",description:"Mass disappearance at high school football game"},{day:"Nightfall",description:"Silas opens portal to shadow realm"},{day:"Midnight",description:"Portal fully open, shadow creatures flood town"}]}};e.mysteries=[t],d({campaign:e,currentMysteryId:t.id,sessionLog:[{timestamp:Date.now()-36e5,text:"Session started"},{timestamp:Date.now()-18e5,text:"Hunters arrived in Hollow Creek"},{timestamp:Date.now()-9e5,text:"Interviewed Dave at the bar"}]}),console.log("Demo campaign created with mystery")}function He(e){const t=document.createElement("div");t.className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900 border border-red-700 text-white px-6 py-3 rounded-lg shadow-xl z-50",t.textContent=e,document.body.appendChild(t),setTimeout(()=>{t.remove()},5e3)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",N):N();typeof window<"u"&&(window.__MOTW__={getState:c,setState:d,switchTab:C,initTimeline:ve,renderSessionTab:w});
