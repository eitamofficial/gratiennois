(()=>{var a={};a.id=4096,a.ids=[4096],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},19696:(a,b,c)=>{Promise.resolve().then(c.t.bind(c,3991,23)),Promise.resolve().then(c.bind(c,39378))},26713:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/is-bot")},28354:a=>{"use strict";a.exports=require("util")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{"use strict";a.exports=require("path")},41025:a=>{"use strict";a.exports=require("next/dist/server/app-render/dynamic-access-async-storage.external.js")},50974:(a,b,c)=>{"use strict";c.r(b),c.d(b,{GlobalError:()=>E.default,__next_app__:()=>K,handler:()=>M,pages:()=>J,routeModule:()=>L,tree:()=>I});var d=c(34679),e=c(49754),f=c(9117),g=c(46595),h=c(32324),i=c(39326),j=c(38928),k=c(20175),l=c(12),m=c(54290),n=c(12696),o=c(52574),p=c(82802),q=c(77533),r=c(45229),s=c(32822),t=c(261),u=c(26453),v=c(52474),w=c(26713),x=c(51356),y=c(62685),z=c(36225),A=c(63446),B=c(2762),C=c(45742),D=c(86439),E=c(64182),F=c(62506),G=c(91203),H={};for(let a in F)0>["default","tree","pages","GlobalError","__next_app__","routeModule","handler"].indexOf(a)&&(H[a]=()=>F[a]);c.d(b,H);let I={children:["",{children:["admin",{children:["nouveau",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(c.bind(c,60944)),"C:\\Users\\Ethan Vasset\\Documents\\WikiGratienois\\src\\app\\admin\\nouveau\\page.tsx"]}]},{}]},{layout:[()=>Promise.resolve().then(c.bind(c,93972)),"C:\\Users\\Ethan Vasset\\Documents\\WikiGratienois\\src\\app\\admin\\layout.tsx"],loading:[()=>Promise.resolve().then(c.bind(c,21504)),"C:\\Users\\Ethan Vasset\\Documents\\WikiGratienois\\src\\app\\admin\\loading.tsx"],metadata:{icon:[async a=>(await Promise.resolve().then(c.bind(c,78162))).default(a)],apple:[],openGraph:[],twitter:[],manifest:"/manifest.webmanifest"}}]},{layout:[()=>Promise.resolve().then(c.bind(c,51472)),"C:\\Users\\Ethan Vasset\\Documents\\WikiGratienois\\src\\app\\layout.tsx"],template:[()=>Promise.resolve().then(c.bind(c,65768)),"C:\\Users\\Ethan Vasset\\Documents\\WikiGratienois\\src\\app\\template.tsx"],error:[()=>Promise.resolve().then(c.bind(c,5682)),"C:\\Users\\Ethan Vasset\\Documents\\WikiGratienois\\src\\app\\error.tsx"],"global-error":[()=>Promise.resolve().then(c.bind(c,64182)),"C:\\Users\\Ethan Vasset\\Documents\\WikiGratienois\\src\\app\\global-error.tsx"],"not-found":[()=>Promise.resolve().then(c.bind(c,59732)),"C:\\Users\\Ethan Vasset\\Documents\\WikiGratienois\\src\\app\\not-found.tsx"],forbidden:[()=>Promise.resolve().then(c.t.bind(c,90461,23)),"next/dist/client/components/builtin/forbidden.js"],unauthorized:[()=>Promise.resolve().then(c.t.bind(c,32768,23)),"next/dist/client/components/builtin/unauthorized.js"],metadata:{icon:[async a=>(await Promise.resolve().then(c.bind(c,78162))).default(a)],apple:[],openGraph:[],twitter:[],manifest:"/manifest.webmanifest"}}]}.children,J=["C:\\Users\\Ethan Vasset\\Documents\\WikiGratienois\\src\\app\\admin\\nouveau\\page.tsx"],K={require:c,loadChunk:()=>Promise.resolve()},L=new e.AppPageRouteModule({definition:{kind:f.RouteKind.APP_PAGE,page:"/admin/nouveau/page",pathname:"/admin/nouveau",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:I},distDir:".next-test",relativeProjectDir:""});async function M(a,b,e){var H;let N="/admin/nouveau/page";"/index"===N&&(N="/");let O=(0,i.getRequestMeta)(a,"postponed"),P=(0,i.getRequestMeta)(a,"minimalMode"),Q=await L.prepare(a,b,{srcPage:N,multiZoneDraftMode:!1});if(!Q)return b.statusCode=400,b.end("Bad Request"),null==e.waitUntil||e.waitUntil.call(e,Promise.resolve()),null;let{buildId:R,query:S,params:T,parsedUrl:U,pageIsDynamic:V,buildManifest:W,nextFontManifest:X,reactLoadableManifest:Y,serverActionsManifest:Z,clientReferenceManifest:$,subresourceIntegrityManifest:_,prerenderManifest:aa,isDraftMode:ab,resolvedPathname:ac,revalidateOnlyGenerated:ad,routerServerContext:ae,nextConfig:af,interceptionRoutePatterns:ag}=Q,ah=U.pathname||"/",ai=(0,t.normalizeAppPath)(N),{isOnDemandRevalidate:aj}=Q,ak=L.match(ah,aa),al=!!aa.routes[ac]&&(L.isDev||(0,d.isRouteCacheOwner)(ac,L.cacheOwner,aa.routes[ac])),am=!!(ak||al||aa.routes[ai]),an=a.headers["user-agent"]||"",ao=(0,w.getBotType)(an),ap=(0,r.isHtmlBotRequest)(a),aq=(0,i.getRequestMeta)(a,"isPrefetchRSCRequest")??"1"===a.headers[v.NEXT_ROUTER_PREFETCH_HEADER],ar=(0,i.getRequestMeta)(a,"isRSCRequest")??(0,o.f)(a.headers[v.RSC_HEADER]),as=(0,u.getIsPossibleServerAction)(a),at=(0,n.checkIsAppPPREnabled)(af.experimental.ppr)&&(null==(H=aa.routes[ai]??aa.dynamicRoutes[ai])?void 0:H.renderingMode)==="PARTIALLY_STATIC",au=!1,av=!1,aw=at?O:void 0,ax=at&&ar&&!aq,ay=(0,i.getRequestMeta)(a,"segmentPrefetchRSCRequest"),az=!an||(0,r.shouldServeStreamingMetadata)(an,af.htmlLimitedBots);ap&&at&&(am=!1,az=!1);let aA=!0===L.isDev||!am||"string"==typeof O||ax,aB=ap&&at,aC=null;ab||!am||aA||as||aw||ax||(aC=ac);let aD=aC;!aD&&L.isDev&&(aD=ac),L.isDev||ab||!am||!ar||ax||(0,l.d)(a.headers);let aE={...F,tree:I,pages:J,GlobalError:E.default,handler:M,routeModule:L,__next_app__:K};Z&&$&&(0,q.setReferenceManifestsSingleton)({page:N,clientReferenceManifest:$,serverActionsManifest:Z,serverModuleMap:(0,s.createServerModuleMap)({serverActionsManifest:Z})});let aF=a.method||"GET",aG=(0,h.getTracer)(),aH=aG.getActiveScopeSpan();try{let d=L.getVaryHeader(ac,ag);b.setHeader("Vary",d);let g=async(c,d)=>{let e=new m.NodeNextRequest(a),f=new m.NodeNextResponse(b);return L.render(e,f,d).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=aG.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==j.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${aF} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${aF} ${a.url}`)})},l=async({span:d,postponed:f,fallbackRouteParams:h})=>{let j={query:S,params:T,page:ai,sharedContext:{buildId:R},serverComponentsHmrCache:(0,i.getRequestMeta)(a,"serverComponentsHmrCache"),fallbackRouteParams:h,renderOpts:{App:()=>null,Document:()=>null,pageConfig:{},ComponentMod:aE,Component:(0,k.T)(aE),params:T,routeModule:L,page:N,postponed:f,shouldWaitOnAllReady:aB,serveStreamingMetadata:az,supportsDynamicResponse:"string"==typeof f||aA,buildManifest:W,nextFontManifest:X,reactLoadableManifest:Y,subresourceIntegrityManifest:_,serverActionsManifest:Z,clientReferenceManifest:$,setIsrStatus:null==ae?void 0:ae.setIsrStatus,dir:c(33873).join(process.cwd(),L.relativeProjectDir),isDraftMode:ab,isRevalidate:am&&!f&&!ax,botType:ao,isOnDemandRevalidate:aj,isPossibleServerAction:as,assetPrefix:af.assetPrefix,nextConfigOutput:af.output,crossOrigin:af.crossOrigin,trailingSlash:af.trailingSlash,previewProps:aa.preview,deploymentId:af.deploymentId,enableTainting:af.experimental.taint,htmlLimitedBots:af.htmlLimitedBots,devtoolSegmentExplorer:af.experimental.devtoolSegmentExplorer,reactMaxHeadersLength:af.reactMaxHeadersLength,multiZoneDraftMode:!1,incrementalCache:(0,i.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:af.experimental.cacheLife,basePath:af.basePath,serverActions:af.experimental.serverActions,...au?{nextExport:!0,supportsDynamicResponse:!1,isStaticGeneration:!0,isRevalidate:!0,isDebugDynamicAccesses:au}:{},experimental:{isRoutePPREnabled:at,expireTime:af.expireTime,staleTimes:af.experimental.staleTimes,cacheComponents:!!af.experimental.cacheComponents,clientSegmentCache:!!af.experimental.clientSegmentCache,clientParamParsing:!!af.experimental.clientParamParsing,dynamicOnHover:!!af.experimental.dynamicOnHover,inlineCss:!!af.experimental.inlineCss,authInterrupts:!!af.experimental.authInterrupts,clientTraceMetadata:af.experimental.clientTraceMetadata||[]},waitUntil:e.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:()=>{},onInstrumentationRequestError:(b,c,d)=>L.onRequestError(a,b,d,ae),err:(0,i.getRequestMeta)(a,"invokeError"),dev:L.isDev}},l=await g(d,j),{metadata:m}=l,{cacheControl:n,headers:o={},fetchTags:p}=m;if(p&&(o[A.NEXT_CACHE_TAGS_HEADER]=p),a.fetchMetrics=m.fetchMetrics,am&&(null==n?void 0:n.revalidate)===0&&!L.isDev&&!at){let a=m.staticBailoutInfo,b=Object.defineProperty(Error(`Page changed from static to dynamic at runtime ${ac}${(null==a?void 0:a.description)?`, reason: ${a.description}`:""}
see more here https://nextjs.org/docs/messages/app-static-to-dynamic-error`),"__NEXT_ERROR_CODE",{value:"E132",enumerable:!1,configurable:!0});if(null==a?void 0:a.stack){let c=a.stack;b.stack=b.message+c.substring(c.indexOf("\n"))}throw b}return{value:{kind:x.CachedRouteKind.APP_PAGE,html:l,headers:o,rscData:m.flightData,postponed:m.postponed,status:m.statusCode,segmentData:m.segmentData},cacheControl:n}},n=async({hasResolved:c,previousCacheEntry:d,isRevalidating:g,span:h})=>{let j,k=!1===L.isDev,m=c||b.writableEnded;if(aj&&ad&&!d&&!P)return(null==ae?void 0:ae.render404)?await ae.render404(a,b):(b.statusCode=404,b.end("This page could not be found")),null;if(ak&&(j=(0,y.parseFallbackField)(ak.fallback)),j===y.FallbackMode.PRERENDER&&(0,w.isBot)(an)&&(!at||ap)&&(j=y.FallbackMode.BLOCKING_STATIC_RENDER),(null==d?void 0:d.isStale)===-1&&(aj=!0),aj&&(j!==y.FallbackMode.NOT_FOUND||d)&&(j=y.FallbackMode.BLOCKING_STATIC_RENDER),!P&&j!==y.FallbackMode.BLOCKING_STATIC_RENDER&&aD&&!m&&!ab&&V&&(k||!al)){let b;if((k||ak)&&j===y.FallbackMode.NOT_FOUND)throw new D.NoFallbackError;if(at&&!ar){let c="string"==typeof(null==ak?void 0:ak.fallback)?ak.fallback:k?ai:null;if(b=await L.handleResponse({cacheKey:c,req:a,nextConfig:af,routeKind:f.RouteKind.APP_PAGE,isFallback:!0,prerenderManifest:aa,isRoutePPREnabled:at,responseGenerator:async()=>l({span:h,postponed:void 0,fallbackRouteParams:k||av?(0,p.u)(ai):null}),waitUntil:e.waitUntil}),null===b)return null;if(b)return delete b.cacheControl,b}}let n=aj||g||!aw?void 0:aw;if(au&&void 0!==n)return{cacheControl:{revalidate:1,expire:void 0},value:{kind:x.CachedRouteKind.PAGES,html:z.default.EMPTY,pageData:{},headers:void 0,status:void 0}};let o=V&&at&&((0,i.getRequestMeta)(a,"renderFallbackShell")||av)?(0,p.u)(ah):null;return l({span:h,postponed:n,fallbackRouteParams:o})},o=async c=>{var d,g,h,j,k;let m,o=await L.handleResponse({cacheKey:aC,responseGenerator:a=>n({span:c,...a}),routeKind:f.RouteKind.APP_PAGE,isOnDemandRevalidate:aj,isRoutePPREnabled:at,req:a,nextConfig:af,prerenderManifest:aa,waitUntil:e.waitUntil});if(ab&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate"),L.isDev&&b.setHeader("Cache-Control","no-store, must-revalidate"),!o){if(aC)throw Object.defineProperty(Error("invariant: cache entry required but not generated"),"__NEXT_ERROR_CODE",{value:"E62",enumerable:!1,configurable:!0});return null}if((null==(d=o.value)?void 0:d.kind)!==x.CachedRouteKind.APP_PAGE)throw Object.defineProperty(Error(`Invariant app-page handler received invalid cache entry ${null==(h=o.value)?void 0:h.kind}`),"__NEXT_ERROR_CODE",{value:"E707",enumerable:!1,configurable:!0});let p="string"==typeof o.value.postponed;am&&!ax&&(!p||aq)&&(P||b.setHeader("x-nextjs-cache",aj?"REVALIDATED":o.isMiss?"MISS":o.isStale?"STALE":"HIT"),b.setHeader(v.NEXT_IS_PRERENDER_HEADER,"1"));let{value:q}=o;if(aw)m={revalidate:0,expire:void 0};else if(P&&ar&&!aq&&at)m={revalidate:0,expire:void 0};else if(!L.isDev)if(ab)m={revalidate:0,expire:void 0};else if(am){if(o.cacheControl)if("number"==typeof o.cacheControl.revalidate){if(o.cacheControl.revalidate<1)throw Object.defineProperty(Error(`Invalid revalidate configuration provided: ${o.cacheControl.revalidate} < 1`),"__NEXT_ERROR_CODE",{value:"E22",enumerable:!1,configurable:!0});m={revalidate:o.cacheControl.revalidate,expire:(null==(j=o.cacheControl)?void 0:j.expire)??af.expireTime}}else m={revalidate:A.CACHE_ONE_YEAR,expire:void 0}}else b.getHeader("Cache-Control")||(m={revalidate:0,expire:void 0});if(o.cacheControl=m,"string"==typeof ay&&(null==q?void 0:q.kind)===x.CachedRouteKind.APP_PAGE&&q.segmentData){b.setHeader(v.NEXT_DID_POSTPONE_HEADER,"2");let c=null==(k=q.headers)?void 0:k[A.NEXT_CACHE_TAGS_HEADER];P&&am&&c&&"string"==typeof c&&b.setHeader(A.NEXT_CACHE_TAGS_HEADER,c);let d=q.segmentData.get(ay);return void 0!==d?(0,C.sendRenderResult)({req:a,res:b,generateEtags:af.generateEtags,poweredByHeader:af.poweredByHeader,result:z.default.fromStatic(d,v.RSC_CONTENT_TYPE_HEADER),cacheControl:o.cacheControl}):(b.statusCode=204,(0,C.sendRenderResult)({req:a,res:b,generateEtags:af.generateEtags,poweredByHeader:af.poweredByHeader,result:z.default.EMPTY,cacheControl:o.cacheControl}))}let r=(0,i.getRequestMeta)(a,"onCacheEntry");if(r&&await r({...o,value:{...o.value,kind:"PAGE"}},{url:(0,i.getRequestMeta)(a,"initURL")}))return null;if(p&&aw)throw Object.defineProperty(Error("Invariant: postponed state should not be present on a resume request"),"__NEXT_ERROR_CODE",{value:"E396",enumerable:!1,configurable:!0});if(q.headers){let a={...q.headers};for(let[c,d]of(P&&am||delete a[A.NEXT_CACHE_TAGS_HEADER],Object.entries(a)))if(void 0!==d)if(Array.isArray(d))for(let a of d)b.appendHeader(c,a);else"number"==typeof d&&(d=d.toString()),b.appendHeader(c,d)}let s=null==(g=q.headers)?void 0:g[A.NEXT_CACHE_TAGS_HEADER];if(P&&am&&s&&"string"==typeof s&&b.setHeader(A.NEXT_CACHE_TAGS_HEADER,s),!q.status||ar&&at||(b.statusCode=q.status),!P&&q.status&&G.RedirectStatusCode[q.status]&&ar&&(b.statusCode=200),p&&b.setHeader(v.NEXT_DID_POSTPONE_HEADER,"1"),ar&&!ab){if(void 0===q.rscData){if(q.postponed)throw Object.defineProperty(Error("Invariant: Expected postponed to be undefined"),"__NEXT_ERROR_CODE",{value:"E372",enumerable:!1,configurable:!0});return(0,C.sendRenderResult)({req:a,res:b,generateEtags:af.generateEtags,poweredByHeader:af.poweredByHeader,result:q.html,cacheControl:ax?{revalidate:0,expire:void 0}:o.cacheControl})}return(0,C.sendRenderResult)({req:a,res:b,generateEtags:af.generateEtags,poweredByHeader:af.poweredByHeader,result:z.default.fromStatic(q.rscData,v.RSC_CONTENT_TYPE_HEADER),cacheControl:o.cacheControl})}let t=q.html;if(!p||P||ar)return(0,C.sendRenderResult)({req:a,res:b,generateEtags:af.generateEtags,poweredByHeader:af.poweredByHeader,result:t,cacheControl:o.cacheControl});if(au)return t.push(new ReadableStream({start(a){a.enqueue(B.ENCODED_TAGS.CLOSED.BODY_AND_HTML),a.close()}})),(0,C.sendRenderResult)({req:a,res:b,generateEtags:af.generateEtags,poweredByHeader:af.poweredByHeader,result:t,cacheControl:{revalidate:0,expire:void 0}});let u=new TransformStream;return t.push(u.readable),l({span:c,postponed:q.postponed,fallbackRouteParams:null}).then(async a=>{var b,c;if(!a)throw Object.defineProperty(Error("Invariant: expected a result to be returned"),"__NEXT_ERROR_CODE",{value:"E463",enumerable:!1,configurable:!0});if((null==(b=a.value)?void 0:b.kind)!==x.CachedRouteKind.APP_PAGE)throw Object.defineProperty(Error(`Invariant: expected a page response, got ${null==(c=a.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E305",enumerable:!1,configurable:!0});await a.value.html.pipeTo(u.writable)}).catch(a=>{u.writable.abort(a).catch(a=>{console.error("couldn't abort transformer",a)})}),(0,C.sendRenderResult)({req:a,res:b,generateEtags:af.generateEtags,poweredByHeader:af.poweredByHeader,result:t,cacheControl:{revalidate:0,expire:void 0}})};if(!aH)return await aG.withPropagatedContext(a.headers,()=>aG.trace(j.BaseServerSpan.handleRequest,{spanName:`${aF} ${a.url}`,kind:h.SpanKind.SERVER,attributes:{"http.method":aF,"http.target":a.url}},o));await o(aH)}catch(b){throw b instanceof D.NoFallbackError||await L.onRequestError(a,b,{routerKind:"App Router",routePath:N,routeType:"render",revalidateReason:(0,g.c)({isRevalidate:am,isOnDemandRevalidate:aj})},ae),b}}},55511:a=>{"use strict";a.exports=require("crypto")},60944:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>q,dynamic:()=>p,metadata:()=>o});var d=c(75338),e=c(82161),f=c(67360),g=c(55004),h=c(65169),i=c.n(h);let j="> Source : r\xe9cit de la r\xe9daction du wiki. Les faits juridiques et les portraits proviennent respectivement des documents officiels et de l'API Discord.",k=[{id:"personnalite-souverain",name:"Personnalit\xe9 — souverain",description:"Dauphin, roi ou empereur. Le mod\xe8le insiste sur le r\xe8gne, les actes de souverainet\xe9 et la post\xe9rit\xe9, plut\xf4t que sur la biographie.",icon:"\uD83D\uDC51",category:"personnalites",tags:["personnalit\xe9","souverain"],summary:"Souverain du Delphinat : r\xe8gne, actes rapport\xe9s et post\xe9rit\xe9.",infobox:{caption:"Personnalit\xe9",fields:[{label:"Nom",value:""},{label:"Titre",value:""},{label:"R\xe8gne",value:""},{label:"Pr\xe9d\xe9cesseur",value:"Non renseign\xe9"},{label:"Successeur",value:"Non renseign\xe9"},{label:"Actes rapport\xe9s",value:"Non renseign\xe9"}],footer:"Photographie : API Discord. Biographie : r\xe9cit de la r\xe9daction du wiki."},content:`# Nom du souverain

${j}

Pr\xe9sentation en deux ou trois phrases : qui est cette personne, quel titre
porte-t-elle, et par quoi son r\xe8gne est-il connu dans le r\xe9cit du Delphinat.

## Le r\xe8gne

Dates, dur\xe9e, contexte d'accession. Ce qui n'est pas document\xe9 s'\xe9crit
**non renseign\xe9** — jamais une date approximative.

## Les actes de souverainet\xe9

Les d\xe9cisions qui rel\xe8vent du pouvoir : bannissements, promulgations,
nominations, trait\xe9s. Un acte de souverainet\xe9 se distingue d'un acte
d'administration : il engage le Delphinat lui-m\xeame.

## Le regard de la r\xe9daction

Ce que le r\xe9cit retient du personnage — y compris ce qui n'est pas flatteur.
Une encyclop\xe9die rapporte l'\xe9valuation, elle ne la corrige pas.

## Post\xe9rit\xe9

Ce qui reste : un texte portant son nom, une charge transform\xe9e, un conflit
prolong\xe9.

## Voir aussi

- [[histoire-du-delphinat]]
- [[la-constitution]]`},{id:"personnalite-dirigeant",name:"Personnalit\xe9 — dirigeant",description:"Premier Ministre, ministre, chef de parti. Met en avant la charge, le mandat et les d\xe9cisions, plut\xf4t que la personne.",icon:"\uD83C\uDF96️",category:"personnalites",tags:["personnalit\xe9","gouvernement"],summary:"Dirigeant du Delphinat : charge, mandat et d\xe9cisions.",infobox:{caption:"Personnalit\xe9",fields:[{label:"Nom",value:""},{label:"Charge",value:""},{label:"Mandat",value:"Non renseign\xe9"},{label:"Parti",value:"Non renseign\xe9"},{label:"Pr\xe9d\xe9cesseur",value:"Non renseign\xe9"},{label:"Faits marquants",value:"Non renseign\xe9"}],footer:"Photographie : API Discord. Biographie : r\xe9cit de la r\xe9daction du wiki."},content:`# Nom du dirigeant

${j}

Qui est cette personne, quelle charge occupe-t-elle, et dans quel contexte
politique.

## La charge

Ce que la Constitution dit de cette charge (article P-1), et ce que le
titulaire en a fait. Distinguez la fonction de son exercice.

## Le mandat

Dur\xe9e, \xe9lection ou nomination, programme annonc\xe9, programme r\xe9alis\xe9. Le r\xe9cit
ne documente souvent que le premier : \xe9crivez **non renseign\xe9** pour le reste.

## Les d\xe9cisions

Les actes rattach\xe9s \xe0 la personne, avec leur port\xe9e. Un d\xe9cret, une motion, un
vote : dites ce que cela a chang\xe9, pas seulement que cela a eu lieu.

## Vie politique

Parti, alliances, ruptures. Une affiliation se documente, elle ne se suppose
pas.

## Voir aussi

- [[le-premier-ministre]]
- [[la-hierarchie-delphinale]]`},{id:"personnalite-membre",name:"Personnalit\xe9 — membre",description:"Membre du serveur sans charge constitutionnelle. Sert aux figures cit\xe9es par le r\xe9cit sans fonction officielle document\xe9e.",icon:"\uD83E\uDDD1",category:"personnalites",tags:["personnalit\xe9"],summary:"Membre du Delphinat cit\xe9 par le r\xe9cit.",infobox:{caption:"Personnalit\xe9",fields:[{label:"Nom",value:""},{label:"R\xf4le document\xe9",value:""},{label:"Anciennet\xe9",value:"Non renseign\xe9e"},{label:"Fonction",value:"Non renseign\xe9e"}],footer:"Photographie : API Discord. Biographie : r\xe9cit de la r\xe9daction du wiki. La r\xe9daction ne documente, \xe0 ce jour, que le r\xf4le ci-dessus."},content:`# Nom du membre

${j}

R\xf4le document\xe9 par le r\xe9cit, en une phrase. Si le r\xe9cit ne dit qu'une chose,
cette page ne doit dire qu'une chose.

## Ce que le r\xe9cit rapporte

Le ou les faits attribu\xe9s \xe0 cette personne, avec leur contexte.

## Ce qui n'est pas document\xe9

Le r\xe9cit ne pr\xe9cise ni la fonction, ni l'anciennet\xe9, ni le parcours. Ces
\xe9l\xe9ments sont **non renseign\xe9s**.

Une page courte et exacte vaut mieux qu'une page longue et suppos\xe9e.

## Voir aussi

- [[les-trois-delphinats]]`},{id:"institution",name:"Institution ou charge",description:"Une des huit charges de l'article P-1, ou une institution d\xe9riv\xe9e. Le mod\xe8le impose de citer l'article qui la fonde.",icon:"\uD83C\uDFDB️",category:"institutions",tags:["institution","charge"],summary:"Institution du Delphinat : fondement constitutionnel, pouvoirs et limites.",infobox:{caption:"Institution",fields:[{label:"Institution",value:""},{label:"Fondement",value:"Article P-1 de la Constitution"},{label:"Titulaire",value:"Non renseign\xe9"},{label:"Pouvoirs",value:""},{label:"Limites",value:""}],footer:"Source : Constitution.pdf, article P-1."},content:`# Nom de l'institution

> Source officielle : [Constitution.pdf](/Constitution.pdf) — transcription int\xe9grale.

## Fondement

L'article de la Constitution qui institue cette charge, cit\xe9 entre guillemets
et **sans reformulation**. Le texte opposable prime sur le commentaire.

## Pouvoirs

Ce que l'institution peut faire, tel que le texte l'\xe9crit.

## Limites et contre-pouvoirs

Ce qu'elle ne peut pas faire, et qui la contr\xf4le. Une charge sans limite
document\xe9e est un fait \xe0 signaler, pas \xe0 combler.

## Exercice

Qui l'a port\xe9e, quand, et ce qui en est r\xe9sult\xe9. **Non renseign\xe9** si le r\xe9cit
ne le dit pas.

## Voir aussi

- [[la-hierarchie-delphinale]]
- [[les-lois-du-delphinat]]`},{id:"texte-fondateur",name:"Texte fondateur",description:"Constitution ou r\xe8glement. Page de transcription : aucune reformulation, orthographe d'origine conserv\xe9e.",icon:"\uD83D\uDCDC",category:"lois",tags:["loi","texte fondateur"],summary:"Texte fondateur du Delphinat, transcrit int\xe9gralement.",infobox:{caption:"Texte fondateur",fields:[{label:"Nature",value:""},{label:"R\xe8gne",value:""},{label:"Cr\xe9\xe9 par",value:""},{label:"Version en vigueur",value:""},{label:"Articles",value:""},{label:"Source",value:"Document officiel, transcription int\xe9grale"}],footer:"Document officiel consultable dans public/. Transcription int\xe9grale, orthographe d'origine conserv\xe9e."},content:`# Titre officiel du texte

> Source officielle : [Nom du document](/fichier.pdf) — cr\xe9\xe9 par …, version finale \xe9dit\xe9e le …

Pr\xe9sentation en une phrase : quel r\xe9gime ce texte institue, et \xe0 quelle date.

## Article P-1

> \xab Texte exact de l'article, entre guillemets. \xbb

### Premi\xe8re charge

> \xab Texte exact. \xbb

### Seconde charge

> \xab Texte exact. \xbb

## Les articles

### Article P-2

> \xab Texte exact. \xbb

## Ce que ce texte change

Deux ou trois phrases de commentaire, **clairement s\xe9par\xe9es** de la
transcription : ce qui est nouveau par rapport au texte pr\xe9c\xe9dent.

*Cette page est la transcription int\xe9grale du document officiel. Elle ne
contient aucun commentaire de la r\xe9daction.*`},{id:"article-de-loi",name:"Article de loi",description:"Une page consacr\xe9e \xe0 un article pr\xe9cis du code constitutionnel. Utile quand un article m\xe9rite son propre d\xe9veloppement.",icon:"⚖️",category:"lois",tags:["loi","article"],summary:"\xc9tude d'un article de la Constitution : texte, port\xe9e et application.",infobox:{caption:"Article de loi",fields:[{label:"Article",value:""},{label:"Texte",value:""},{label:"Port\xe9e",value:""},{label:"Application",value:"Non renseign\xe9e"}],footer:"Source : Constitution.pdf."},content:`# Article P-x

> Source officielle : [Constitution.pdf](/Constitution.pdf).

## Texte

> \xab Reproduction exacte de l'article. \xbb

## Port\xe9e

Ce que l'article autorise, interdit ou organise. Dites-le avec les mots du
texte quand c'est possible : la paraphrase est la premi\xe8re source d'erreur
juridique.

## Application

Les cas o\xf9 l'article a \xe9t\xe9 invoqu\xe9. **Non renseign\xe9** si aucun.

## D\xe9bats

Les critiques ou interpr\xe9tations rapport\xe9es, attribu\xe9es \xe0 leurs auteurs.

## Voir aussi

- [[la-constitution]]
- [[les-lois-du-delphinat]]`},{id:"evenement-guerre",name:"\xc9v\xe9nement — guerre ou conflit",description:"Guerre civile, s\xe9cession, intervention. Le mod\xe8le s\xe9pare les camps, le d\xe9roulement et l'issue — trois choses souvent confondues.",icon:"⚔️",category:"histoire",tags:["histoire","guerre","conflit"],summary:"Conflit du Delphinat : camps, d\xe9roulement et issue.",infobox:{caption:"\xc9v\xe9nement",fields:[{label:"Type",value:"Guerre"},{label:"Lieu",value:"Gratianopolis"},{label:"Camps",value:""},{label:"Issue",value:""},{label:"Dates",value:"Non renseign\xe9es"},{label:"Victimes",value:"Non renseign\xe9es"}],footer:"R\xe9cit de la r\xe9daction du wiki."},content:`# Nom du conflit

> Source : r\xe9cit de la r\xe9daction du wiki. Aucune date n'est \xe9tablie par une
> source \xe9crite : les p\xe9riodes sont ordonn\xe9es, pas dat\xe9es.

## Origines

Ce qui d\xe9clenche le conflit, et ce qui l'a rendu possible. Distinguez la cause
imm\xe9diate du contexte.

## Les camps

Qui combat qui, et au nom de quoi. Nommez les personnes, pas seulement les
blocs.

## D\xe9roulement

Les \xe9tapes document\xe9es. Ce qui n'est pas racont\xe9 s'\xe9crit **non renseign\xe9** —
une encyclop\xe9die n'invente pas de batailles.

## Issue

Armistice, victoire, statu quo. Pr\xe9cisez ce que l'issue change concr\xe8tement :
une souverainet\xe9 reconnue n'est pas une reddition.

## Voir aussi

- [[les-trois-delphinats]]
- [[histoire-du-delphinat]]`},{id:"evenement-crise",name:"\xc9v\xe9nement — crise politique",description:"Destitution, vacance, campagne \xe9lectorale. Le mod\xe8le impose de s\xe9parer la cause, la crise et la r\xe9solution.",icon:"\uD83D\uDD25",category:"histoire",tags:["histoire","crise politique"],summary:"Crise politique du Delphinat : cause, d\xe9roulement et r\xe9solution.",infobox:{caption:"Crise",fields:[{label:"Origine",value:""},{label:"D\xe9clencheur",value:""},{label:"Dur\xe9e",value:"Non renseign\xe9e"},{label:"Issue",value:"Non renseign\xe9e"}],footer:"R\xe9cit de la r\xe9daction du wiki."},content:`# Nom de la crise

> Source : r\xe9cit de la r\xe9daction du wiki.

## La cause

Le fait qui ouvre la crise. Un seul fait, nomm\xe9 pr\xe9cis\xe9ment.

## Le d\xe9roulement

Les \xe9tapes, dans l'ordre. Une crise se raconte comme une cha\xeene : chaque
maillon doit \xeatre document\xe9, sinon la cha\xeene est une hypoth\xe8se.

## Les acteurs

Qui intervient, \xe0 quel titre, et ce qu'il d\xe9cide.

## La r\xe9solution

Comment la crise se termine — ou qu'elle ne se termine pas. **Non renseign\xe9**
si le r\xe9cit s'arr\xeate avant.

## Voir aussi

- [[le-premier-ministre]]
- [[crise-politique-contemporaine]]`},{id:"periode-historique",name:"P\xe9riode historique",description:"Un r\xe8gne, un interr\xe8gne, une r\xe9publique. Le mod\xe8le est centr\xe9 sur la nature du r\xe9gime et ses transitions.",icon:"\uD83D\uDDD3️",category:"histoire",tags:["histoire","p\xe9riode"],summary:"P\xe9riode de l'histoire du Delphinat : nature du r\xe9gime et transitions.",infobox:{caption:"P\xe9riode historique",fields:[{label:"R\xe8gne",value:""},{label:"Nature",value:""},{label:"Souverain",value:""},{label:"Pr\xe9c\xe9d\xe9 par",value:""},{label:"Suivi par",value:""},{label:"Dates",value:"Non renseign\xe9es"}],footer:"Ordre des p\xe9riodes : shared/roster.json."},content:`# Nom de la p\xe9riode

> Source : r\xe9cit de la r\xe9daction du wiki. Aucune date n'est \xe9tablie par une
> source \xe9crite : les p\xe9riodes sont ordonn\xe9es, pas dat\xe9es.

## Nature du r\xe9gime

Ce qui distingue cette p\xe9riode des autres : delphinat, dictature, r\xe9publique.
La qualification n'est pas neutre — elle vient du r\xe9cit, citez-la.

## Souverainet\xe9

Qui d\xe9tient le pouvoir, et \xe0 quel titre.

## Transitions

Comment la p\xe9riode commence, comment elle finit. Une transition non document\xe9e
s'\xe9crit **non renseign\xe9e**.

## Ce que la p\xe9riode a produit

Textes, institutions, conflits qui lui survivent.

## Voir aussi

- [[les-trois-delphinats]]`},{id:"micronation",name:"Micronation voisine",description:"\xc9tat \xe9tranger cit\xe9 par le r\xe9cit. Le mod\xe8le rappelle de ne documenter que ce que la r\xe9daction a fourni.",icon:"\uD83C\uDF0D",category:"geographie",tags:["micronation","g\xe9ographie"],summary:"Micronation voisine du Delphinat : nature, souverain et relations.",infobox:{caption:"Micronation",fields:[{label:"Nom officiel",value:""},{label:"Nature",value:""},{label:"Souverain",value:""},{label:"Lien avec le Delphinat",value:""},{label:"Localisation",value:"Non renseign\xe9e"},{label:"Population",value:"Non renseign\xe9e"}],footer:"R\xe9cit de la r\xe9daction du wiki."},content:`# Nom de la micronation

> Source : r\xe9cit de la r\xe9daction du wiki.

## Nature du r\xe9gime

Monarchie, r\xe9publique, empire parlementaire. La qualification vient du r\xe9cit.

## Souverain

Qui dirige, \xe0 quel titre.

## Relations avec le Delphinat

Le ou les \xe9v\xe9nements qui relient cet \xc9tat \xe0 Gratianopolis, avec leur date
relative (avant ou apr\xe8s tel r\xe8gne) — jamais une date absolue non document\xe9e.

## Ce qui n'est pas document\xe9

Localisation, population, histoire propre, symboles. Ces \xe9l\xe9ments sont **non
renseign\xe9s** : une encyclop\xe9die indique une lacune, elle ne la comble pas par
d\xe9duction.

## Voir aussi

- [[geographie-du-delphinat]]`},{id:"parti-politique",name:"Parti politique",description:"Formation politique du serveur. Le mod\xe8le distingue le fondateur, le candidat et le programme.",icon:"\uD83D\uDDF3️",category:"institutions",tags:["parti politique","\xe9lections"],summary:"Parti politique du Delphinat : fondation, candidat et programme.",infobox:{caption:"Parti politique",fields:[{label:"Nom",value:""},{label:"Sigle",value:""},{label:"Fondateur",value:""},{label:"Candidat",value:"Non renseign\xe9"},{label:"Programme",value:"Non renseign\xe9"}],footer:"R\xe9cit de la r\xe9daction du wiki."},content:`# Nom du parti

> Source : r\xe9cit de la r\xe9daction du wiki.

## Fondation

Qui l'a cr\xe9\xe9, quand, et pourquoi. Un parti fond\xe9 \xab le premier \xbb ne l'est pas
par hasard : dites ce que cela change.

## Positionnement

Ce que le parti revendique. Le nom d'un parti est d\xe9j\xe0 un programme : lisez-le.

## Le candidat

Qui porte ses couleurs, \xe0 quelle \xe9lection, avec quel r\xe9sultat.

## Le programme

Ce qui est document\xe9. **Non renseign\xe9** est une r\xe9ponse valable, et plus
honn\xeate qu'un programme reconstitu\xe9.

## Voir aussi

- [[crise-politique-contemporaine]]
- [[le-premier-ministre]]`},{id:"election",name:"\xc9lection ou scrutin",description:"Un vote, une campagne, une destitution. Le mod\xe8le impose de distinguer le corps \xe9lectoral, les candidats et le r\xe9sultat.",icon:"\uD83D\uDCCA",category:"histoire",tags:["\xe9lection","vote"],summary:"Scrutin du Delphinat : corps \xe9lectoral, candidats et r\xe9sultat.",infobox:{caption:"Scrutin",fields:[{label:"Objet",value:""},{label:"Corps \xe9lectoral",value:"Les citoyens (article P-15)"},{label:"Candidats",value:""},{label:"R\xe9sultat",value:"Non renseign\xe9"},{label:"Date",value:"Non renseign\xe9e"}],footer:"R\xe9cit de la r\xe9daction du wiki."},content:`# Nom du scrutin

> Source : r\xe9cit de la r\xe9daction du wiki.

## Objet

Ce sur quoi porte le vote : une charge, une destitution, une loi.

## Corps \xe9lectoral

Qui vote, et \xe0 quel titre. L'article P-15 r\xe9serve le vote aux citoyens ;
pr\xe9cisez si le scrutin s'en \xe9carte.

## Candidats et positions

Qui se pr\xe9sente, sous quelle \xe9tiquette, avec quel argument.

## R\xe9sultat

Le r\xe9sultat document\xe9, avec sa formulation exacte (\xab destitu\xe9 \xe0 100 % \xbb n'est
pas \xab largement rejet\xe9 \xbb).

## Voir aussi

- [[crise-politique-contemporaine]]
- [[les-lois-du-delphinat]]`},{id:"page-libre",name:"Page libre",description:"Squelette minimal : un titre, un chapeau, trois rubriques. \xc0 utiliser quand aucun mod\xe8le ne correspond — et \xe0 ne pas utiliser par confort.",icon:"\uD83D\uDCC4",category:"histoire",tags:[],summary:"",content:`# Titre de la page

> Source : \xe0 pr\xe9ciser (r\xe9cit de la r\xe9daction, document officiel, API Discord).

Chapeau : deux ou trois phrases qui r\xe9sument le sujet et disent pourquoi il
figure dans cette encyclop\xe9die.

## Premi\xe8re rubrique

Contenu document\xe9.

## Deuxi\xe8me rubrique

Contenu document\xe9. Ce qui n'est pas document\xe9 s'\xe9crit **non renseign\xe9**.

## Voir aussi

- [[histoire-du-delphinat]]`}];var l=c(70401);function m(){return(0,d.jsxs)("section",{"aria-labelledby":"modeles-titre",className:"mt-10",children:[(0,d.jsxs)("div",{className:"mb-4 flex flex-wrap items-baseline justify-between gap-2",children:[(0,d.jsx)("h2",{id:"modeles-titre",className:"font-display text-xl font-semibold text-gold-200",children:"Partir d'un mod\xe8le"}),(0,d.jsxs)("p",{className:"text-xs text-slate-400",children:[k.length," mod\xe8les \xb7 structure, cat\xe9gorie et infobox pr\xe9-remplies"]})]}),(0,d.jsx)("ul",{className:"grid gap-3 sm:grid-cols-2",children:k.map(a=>(0,d.jsx)("li",{children:(0,d.jsxs)(i(),{href:`/admin/nouveau?modele=${encodeURIComponent(a.id)}`,className:"group flex h-full flex-col rounded-lg border border-night-600 bg-night-900/50 p-4 transition hover:border-gold-500/50 hover:bg-night-800/60",children:[(0,d.jsxs)("div",{className:"flex items-start gap-3",children:[(0,d.jsx)("span",{"aria-hidden":"true",className:"text-xl leading-none",children:a.icon}),(0,d.jsxs)("div",{className:"min-w-0",children:[(0,d.jsx)("p",{className:"text-sm font-semibold text-slate-100 group-hover:text-gold-200",children:a.name}),(0,d.jsx)("p",{className:"mt-1 text-xs leading-relaxed text-slate-400",children:a.description})]})]}),(0,d.jsxs)("p",{className:"mt-3 flex items-center gap-2 text-[11px] text-slate-500",children:[(0,d.jsxs)("span",{className:"rounded border border-night-600 px-1.5 py-0.5",children:[(0,l.Yl)(a.category)," ",(0,l.Jm)(a.category)]}),a.tags.length>0&&(0,d.jsx)("span",{className:"truncate",children:a.tags.slice(0,3).join(" \xb7 ")})]})]})},a.id))}),(0,d.jsxs)("p",{className:"mt-4 rounded-md border border-night-700 bg-night-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400",children:["Les mod\xe8les \xe9crivent \xab ",(0,d.jsx)("strong",{className:"text-slate-300",children:"non renseign\xe9"})," \xbb l\xe0 o\xf9 le r\xe9cit ne dit rien. C'est la r\xe8gle de l'encyclop\xe9die : une page incompl\xe8te mais honn\xeate vaut mieux qu'une page compl\xe8te et suppos\xe9e."]})]})}var n=c(92186);let o={title:"Nouvel article",robots:{index:!1}},p="force-dynamic";async function q({searchParams:a}){await (0,f.Mt)()||(0,e.redirect)("/connexion?next=/admin/nouveau");let{modele:b}=await a,c=b?k.find(a=>a.id===b)??null:null;return(0,d.jsxs)("div",{className:"mx-auto max-w-5xl",children:[(0,d.jsx)(n.A,{}),(0,d.jsxs)("header",{className:"mb-8",children:[(0,d.jsx)("p",{className:"text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400",children:"Espace d'\xe9dition"}),(0,d.jsx)("h1",{className:"mt-2 font-display text-3xl font-semibold text-gold-200",children:c?c.name:"Nouvel article"}),(0,d.jsx)("p",{className:"mt-2 max-w-2xl text-sm leading-relaxed text-slate-400",children:c?c.description:"Choisissez un mod\xe8le : il pr\xe9-remplit la cat\xe9gorie, la structure des rubriques et l'infobox. Une page blanche vous obligerait \xe0 r\xe9inventer une structure que l'encyclop\xe9die r\xe9p\xe8te."})]}),c?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)("div",{className:"mb-6 flex flex-wrap items-center gap-3 text-xs",children:[(0,d.jsxs)("span",{className:"rounded border border-gold-500/40 bg-gold-500/10 px-2 py-1 text-gold-200",children:["Mod\xe8le : ",c.icon," ",c.name]}),(0,d.jsx)("a",{href:"/admin/nouveau",className:"text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline",children:"Changer de mod\xe8le"})]}),(0,d.jsx)(g.default,{template:c})]}):(0,d.jsx)(m,{})]})}},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},64939:a=>{"use strict";a.exports=import("pg")},73024:a=>{"use strict";a.exports=require("node:fs")},76760:a=>{"use strict";a.exports=require("node:path")},77598:a=>{"use strict";a.exports=require("node:crypto")},84848:(a,b,c)=>{Promise.resolve().then(c.t.bind(c,65169,23)),Promise.resolve().then(c.bind(c,55004))},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[4887,577,511,4322,3005,9788,9981],()=>b(b.s=50974));module.exports=c})();