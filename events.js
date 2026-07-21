(function(){
var d=document,head=d.getElementsByTagName("head")[0]||d.documentElement,cur=d.currentScript||d.getElementsByTagName("script")[d.getElementsByTagName("script").length-1],src=cur&&cur.src?cur.src:"",base=src.substring(0,src.lastIndexOf("/")+1),css=d.getElementById("cfle-events-css");
if(base&&!css){css=d.createElement("link");css.id="cfle-events-css";css.rel="stylesheet";css.type="text/css";css.href=base+"events.css?v=3";head.appendChild(css);}

var CFG={feedUrl:"/templates/events.htm",cacheKey:"cfleEventsV3",cacheMs:600000},
state={events:[],active:"all",search:"",range:"all",cadence:"all"};

function qs(s,p){return(p||d).querySelector(s);}
function qsa(s,p){return[].slice.call((p||d).querySelectorAll(s));}
function txt(v){return String(v||"").replace(/\u00a0/g," ").replace(/\s+/g," ").replace(/^\s+|\s+$/g,"");}
function esc(s){return String(s||"").replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
function abs(u){if(!u)return"";var a=d.createElement("a");a.href=u;return a.href;}
function slug(s){return txt(s).toLowerCase();}
function isApple(){return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent||"");}
function pad(n){n=parseInt(n,10);return n<10?"0"+n:String(n);}
function monthNum(name){var m={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};return m[String(name||"").toLowerCase()]||0;}
function parseClock(v){var m=txt(v).match(/(\d{1,2}):(\d{2})\s*(am|pm)/i),h;if(!m)return null;h=parseInt(m[1],10);if(m[3].toLowerCase()==="pm"&&h!==12)h+=12;if(m[3].toLowerCase()==="am"&&h===12)h=0;return{h:h,m:parseInt(m[2],10)};}
function parseDateLabel(v){
  var m=txt(v).match(/(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Shabbat)\s*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*,?\s*(\d{4})/i);
  if(!m)return null;
  return{weekday:m[1],month:m[2],day:parseInt(m[3],10),year:parseInt(m[4],10),label:m[1]+", "+m[2]+" "+m[3]+", "+m[4]};
}
function getEventDateObj(ev){
  if(!ev.date)return null;
  var t=parseClock(ev.time)||{h:12,m:0},mo=monthNum(ev.date.month)-1;
  return new Date(ev.date.year,mo,ev.date.day,t.h,t.m,0,0);
}
function rangeMatch(ev){
  var now=new Date(),dt=getEventDateObj(ev),start,end;
  if(!dt)return true;
  if(state.range==="thisweek"){
    start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    end=new Date(start.getTime()); end.setDate(start.getDate()+(6-start.getDay()+7)%7+1); end.setHours(0,0,0,0);
    return dt>=start&&dt<end;
  }
  if(state.range==="thismonth"){
    start=new Date(now.getFullYear(),now.getMonth(),1);
    end=new Date(now.getFullYear(),now.getMonth()+1,1);
    return dt>=start&&dt<end;
  }
  return true;
}
function cadenceMatch(ev){
  if(state.cadence==="recurring")return !!ev.recurring;
  if(state.cadence==="onetime")return !ev.recurring;
  return true;
}
function mapUrl(loc){
  var q=encodeURIComponent((loc.name?loc.name+" ":"")+(loc.address||loc.text||""));
  if(/Android/i.test(navigator.userAgent||""))return "geo:0,0?q="+q;
  if(isApple())return "https://maps.apple.com/?q="+q;
  return "https://www.google.com/maps/search/?api=1&query="+q;
}
function googleCalUrl(ev){
  var dt=getEventDateObj(ev),end,desc="";
  if(!dt)return"#";
  end=new Date(dt.getTime()+60*60*1000);
  if(ev.detailsUrl)desc="More information: "+ev.detailsUrl;
  function stamp(x){return x.getFullYear()+pad(x.getMonth()+1)+pad(x.getDate())+"T"+pad(x.getHours())+pad(x.getMinutes())+"00";}
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(ev.title)+"&dates="+encodeURIComponent(stamp(dt)+"/"+stamp(end))+"&location="+encodeURIComponent(ev.location.text||"")+"&details="+encodeURIComponent(desc);
}
function icsText(ev){
  var dt=getEventDateObj(ev),end,desc="";
  if(!dt)return"";
  end=new Date(dt.getTime()+60*60*1000);
  if(ev.detailsUrl)desc="More information: "+ev.detailsUrl;
  function stamp(x){return x.getFullYear()+pad(x.getMonth()+1)+pad(x.getDate())+"T"+pad(x.getHours())+pad(x.getMinutes())+"00";}
  function safe(s){return String(s||"").replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");}
  return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Chabad of Fort Lee//Upcoming at Chabad//EN\r\nBEGIN:VEVENT\r\nUID:"+Date.now()+"-"+Math.random().toString(36).slice(2)+"@chabadfortlee.com\r\nDTSTART:"+stamp(dt)+"\r\nDTEND:"+stamp(end)+"\r\nSUMMARY:"+safe(ev.title)+"\r\nLOCATION:"+safe(ev.location.text||"")+"\r\nDESCRIPTION:"+safe(desc)+"\r\nEND:VEVENT\r\nEND:VCALENDAR";
}
function downloadICS(ev){
  var blob=new Blob([icsText(ev)],{type:"text/calendar;charset=utf-8"}),url=URL.createObjectURL(blob),a=d.createElement("a");
  a.href=url;
  a.download=(ev.title||"event").replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()+".ics";
  d.body.appendChild(a);a.click();d.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1500);
}
function getCache(){try{var raw=sessionStorage.getItem(CFG.cacheKey),obj=raw?JSON.parse(raw):null;return obj&&Date.now()-obj.time<CFG.cacheMs?obj.html:"";}catch(e){return"";}}
function setCache(html){try{sessionStorage.setItem(CFG.cacheKey,JSON.stringify({time:Date.now(),html:html}));}catch(e){}}

function extractMarkers(title){
  var markers=[],clean=String(title||"").replace(/\[([^\]]+)\]/g,function(_,m){markers.push(txt(m));return"";});
  return{markers:markers,clean:txt(clean)};
}
function parseLocation(item){
  var link=qs('.event_info a[href*="maps.google.com"],.event_info a[href*="google.com/maps"]',item),clone,brs,parts,textVal;
  if(!link)return{text:"",name:"",address:"",url:""};
  clone=link.cloneNode(true); brs=clone.getElementsByTagName("br");
  while(brs.length){brs[0].parentNode.replaceChild(d.createTextNode(" | "),brs[0]);}
  textVal=txt(clone.textContent||clone.innerText);
  parts=textVal.split("|");
  return{text:textVal.replace(/\s*\|\s*/g," — "),name:txt(parts[0]),address:txt(parts.slice(1).join(" ")),url:abs(link.getAttribute("href"))};
}
function parseDescription(item){
  var infos=qsa(".event_wrapper > .event_info",item),i,t;
  for(i=0;i<infos.length;i++){
    t=txt(infos[i].textContent||infos[i].innerText);
    if(t)return t;
  }
  return "";
}
function parseEvent(item){
  var parent=item.parentNode,dateNode=qs(".date_stamp .date",parent),date=parseDateLabel(dateNode?dateNode.textContent:""),timeNode,titleNode,rawTitle,titleBits,details;
  timeNode=(function(){var divs=qsa(".event_options.list_info div",item),i,t;for(i=divs.length-1;i>=0;i--){t=txt(divs[i].textContent||divs[i].innerText);if(/\d{1,2}:\d{2}\s*(am|pm)/i.test(t))return t;}return"";}());
  titleNode=qs(".event_wrapper .event_name",item); rawTitle=titleNode?txt(titleNode.textContent||titleNode.innerText):"";
  titleBits=extractMarkers(rawTitle);
  details=qs(".more_info a",item);
  return{
    id:"ev-"+Math.random().toString(36).slice(2),
    rawTitle:rawTitle,
    title:titleBits.clean||rawTitle,
    markers:titleBits.markers,
    date:date,
    time:timeNode,
    description:parseDescription(item),
    location:parseLocation(item),
    detailsUrl:details?abs(details.getAttribute("href")):"",
    categories:[],
    featured:false,
    spotlight:false,
    recurring:false
  };
}
function addCat(ev,key){
  if(ev.categories.indexOf(key)===-1)ev.categories.push(key);
}
function inferCategories(ev){
  var t=slug(ev.title),markers=ev.markers.map(function(x){return slug(x);}),m;
  function hasMarker(arr){return arr.some(function(k){return markers.indexOf(k)>-1;});}
  if(hasMarker(["spotlight"]))ev.spotlight=true;
  if(hasMarker(["featured","feature","spotlight"]))ev.featured=true;
  if(hasMarker(["holiday","holidays"]))addCat(ev,"holidays");
  if(hasMarker(["youth","teen","kids","children","family"]))addCat(ev,"youth");
  if(hasMarker(["learning","class","classes","learning class","study"]))addCat(ev,"learning");
  if(hasMarker(["recurring","weekly","ongoing","monthly"]))ev.recurring=true;
  if(hasMarker(["one-time","onetime","special"]))ev.recurring=false;

  if(/rosh hashanah|yom kippur|sukkot|simchat torah|chanukah|hanukkah|purim|passover|pesach|shavuot|lag b.?omer|tu b.?shvat|tisha b.?av|selichot|high holiday/.test(t))addCat(ev,"holidays");
  if(/youth|teen|cteen|child|children|kid|kids|family|hebrew school|camp|bar mitzvah|bat mitzvah/.test(t))addCat(ev,"youth");
  if(/class|learning|learn|torah|talmud|chassidus|kabbalah|lecture|course|parsha|lox.*learn|shiur/.test(t))addCat(ev,"learning");
  if(/featured|spotlight/.test(t))ev.featured=true;
  if(/weekly|every monday|every tuesday|every wednesday|every thursday|every friday|every saturday|every sunday|ongoing|monthly/.test(t))ev.recurring=true;
}
function finalizeEvents(arr){
  var counts={},i,key;
  for(i=0;i<arr.length;i++){key=slug(arr[i].title);counts[key]=(counts[key]||0)+1;}
  for(i=0;i<arr.length;i++){
    inferCategories(arr[i]);
    key=slug(arr[i].title);
    if(counts[key]>1&&!arr[i].markers.join(" ").match(/one-time/i))arr[i].recurring=true;
    if(arr[i].spotlight)arr[i].featured=true;
  }
  arr.sort(function(a,b){
    var da=getEventDateObj(a),db=getEventDateObj(b);
    return (da?da.getTime():0)-(db?db.getTime():0);
  });
  return arr;
}
function parseFeed(html){
  var doc=new DOMParser().parseFromString(html,"text/html"),items=qsa(".category_item",doc),out=[],i,ev;
  for(i=0;i<items.length;i++){ev=parseEvent(items[i]); if(ev&&ev.title)out.push(ev);}
  return finalizeEvents(out);
}
function labelForFilter(key){
  return{all:"All",featured:"Featured",holidays:"Holidays",youth:"Youth",learning:"Classes & Learning"}[key]||"All";
}
function visibleMainEvents(){
  var q=slug(state.search);
  return state.events.filter(function(ev){
    var hay,matchCat;
    if(ev.spotlight)return false;
    matchCat=(state.active==="all")||(state.active==="featured"&&ev.featured)||(state.active==="holidays"&&ev.categories.indexOf("holidays")>-1)||(state.active==="youth"&&ev.categories.indexOf("youth")>-1)||(state.active==="learning"&&ev.categories.indexOf("learning")>-1);
    if(!matchCat)return false;
    if(!rangeMatch(ev)||!cadenceMatch(ev))return false;
    if(!q)return true;
    hay=slug([ev.title,ev.description,ev.location.text,ev.categories.join(" "),ev.time,ev.date?ev.date.label:""].join(" "));
    return hay.indexOf(q)>-1;
  });
}
function visibleSpotlights(){
  return state.events.filter(function(ev){return ev.spotlight;});
}
function buildTag(key,text){
  var cls="cfle-tag";
  if(key==="featured")cls+=" cfle-tag--featured";
  if(key==="holidays")cls+=" cfle-tag--holiday";
  if(key==="youth")cls+=" cfle-tag--youth";
  if(key==="learning")cls+=" cfle-tag--learning";
  if(key==="recurring")cls+=" cfle-tag--recurring";
  if(key==="onetime")cls+=" cfle-tag--onetime";
  return '<span class="'+cls+'">'+esc(text)+'</span>';
}
function eventTags(ev,forSpotlight){
  var out=[];
  if(forSpotlight||state.active==="featured"||ev.featured)out.push(buildTag("featured","Featured"));
  if(ev.categories.indexOf("holidays")>-1)out.push(buildTag("holidays","Holiday"));
  if(ev.categories.indexOf("youth")>-1)out.push(buildTag("youth","Youth"));
  if(ev.categories.indexOf("learning")>-1)out.push(buildTag("learning","Classes & Learning"));
  out.push(buildTag(ev.recurring?"recurring":"onetime",ev.recurring?"Weekly":"One-Time"));
  return out.join("");
}
function eventTitleHtml(ev){
  if(ev.detailsUrl)return '<a class="cfle-title" href="'+esc(ev.detailsUrl)+'">'+esc(ev.title)+'</a>';
  return '<span class="cfle-title cfle-title--plain">'+esc(ev.title)+'</span>';
}
function actionButtonsHtml(ev){
  var cal2=isApple()?"Apple Calendar":"Other Calendar";
  return '<div class="cfle-actions">'+
    '<button type="button" class="cfle-action-btn" data-cal="google" data-id="'+esc(ev.id)+'">Google Calendar</button>'+
    '<button type="button" class="cfle-action-btn" data-cal="ics" data-id="'+esc(ev.id)+'">'+cal2+'</button>'+
    (ev.detailsUrl?'<a class="cfle-detail-btn" href="'+esc(ev.detailsUrl)+'">View Details</a>':'')+
  '</div>';
}
function renderMeta(ev){
  var parts=[];
  if(ev.time)parts.push('<span class="cfle-meta-item">&#9716; '+esc(ev.time)+'</span>');
  if(ev.location&&ev.location.text)parts.push('<a class="cfle-meta-item cfle-location" href="'+esc(mapUrl(ev.location))+'" target="_blank" rel="noopener noreferrer">&#128205; '+esc(ev.location.name||ev.location.text)+'</a>');
  return '<div class="cfle-meta">'+parts.join('<span class="cfle-meta-item">|</span>')+'</div>';
}
function cardHtml(ev,spot){
  var date=ev.date||{},desc=ev.description?'<p class="cfle-desc">'+esc(ev.description)+'</p>':'',cls='cfle-card'+(spot?' cfle-card--spotlight':'')+(!ev.description?' no-desc':'');
  return '<article class="'+cls+'">'+
    '<div class="cfle-date"><span class="cfle-date-month">'+esc((date.month||"").slice(0,3))+'</span><span class="cfle-date-day">'+esc(date.day||"")+'</span><span class="cfle-date-weekday">'+esc((date.weekday||"").slice(0,3))+'</span></div>'+
    '<div class="cfle-body">'+eventTitleHtml(ev)+'<div class="cfle-tags">'+eventTags(ev,spot)+'</div>'+desc+renderMeta(ev)+'</div>'+
    actionButtonsHtml(ev)+
  '</article>';
}
function renderEmpty(){
  return '<div class="cfle-empty"><strong>Nothing here just yet.</strong><span>More programs are on the way&mdash;try another category or check back soon.</span><a href="#" class="cfle-reset-link" id="cfle-reset-link">View All</a></div>';
}
function render(){
  var spot=visibleSpotlights(),main=visibleMainEvents(),spotWrap=qs("#cfle-spotlight-section"),mainWrap=qs("#cfle-main-section"),count=qs("#cfle-count"),headLabel=labelForFilter(state.active),html="",i;
  count.innerHTML='<strong>'+main.length+'</strong> upcoming programs';

  if(spot.length){
    html='<h2 class="cfle-section-title"><span class="cfle-star">&#9733;</span> Spotlight</h2><p class="cfle-subtle">Promoted programs always stay visible here.</p><div class="cfle-spot-grid count-'+(spot.length>4?4:spot.length)+'">';
    for(i=0;i<spot.length;i++)html+=cardHtml(spot[i],true);
    html+='</div>';
    spotWrap.innerHTML=html;
  }else{
    spotWrap.innerHTML="";
  }

  html='<h2 class="cfle-section-title">'+esc(headLabel)+' <small>now showing</small></h2>';
  html+=main.length?'<div class="cfle-list">'+main.map(function(ev){return cardHtml(ev,false);}).join("")+'</div>':renderEmpty();
  mainWrap.innerHTML=html;
}
function setActiveFilter(key){
  state.active=key;
  qsa(".cfle-filter-btn").forEach(function(btn){btn.className="cfle-filter-btn"+(btn.getAttribute("data-filter")===key?" active":"");});
  render();
}
function setChipState(){
  qsa(".cfle-chip-btn").forEach(function(btn){
    var group=btn.getAttribute("data-group"),val=btn.getAttribute("data-value"),active=(group==="range"&&state.range===val)||(group==="cadence"&&state.cadence===val);
    btn.className="cfle-chip-btn"+(active?" active":"");
  });
}
function bindUI(){
  var mount=qs("#cfle-events"),search=qs("#cfle-search"),more=qs("#cfle-more-toggle"),panel=qs("#cfle-more-panel");
  if(!mount)return;
  mount.addEventListener("click",function(e){
    var t=e.target,btn=t.closest?t.closest("button,a"):null,id,ev;
    if(btn&&btn.classList.contains("cfle-filter-btn")){e.preventDefault();setActiveFilter(btn.getAttribute("data-filter"));return;}
    if(btn&&btn.id==="cfle-more-toggle"){e.preventDefault();panel.className=panel.className.indexOf("open")>-1?"cfle-more-panel":"cfle-more-panel open";return;}
    if(btn&&btn.classList.contains("cfle-chip-btn")){e.preventDefault();if(btn.getAttribute("data-group")==="range")state.range=btn.getAttribute("data-value");if(btn.getAttribute("data-group")==="cadence")state.cadence=btn.getAttribute("data-value");setChipState();render();return;}
    if(btn&&btn.id==="cfle-reset-link"){e.preventDefault();state.range="all";state.cadence="all";state.search="";search.value="";setChipState();setActiveFilter("all");return;}
    if(btn&&btn.classList.contains("cfle-action-btn")){
      e.preventDefault(); id=btn.getAttribute("data-id"); ev=state.events.filter(function(x){return x.id===id;})[0];
      if(!ev)return;
      if(btn.getAttribute("data-cal")==="google"){window.open(googleCalUrl(ev),"_blank");return;}
      if(btn.getAttribute("data-cal")==="ics"){downloadICS(ev);return;}
    }
  });
  search.addEventListener("input",function(){state.search=this.value||"";render();});
}
function init(){
  var cached=getCache();
  bindUI();
  setChipState();
  if(cached){try{state.events=parseFeed(cached);render();}catch(e){}}
  fetch(CFG.feedUrl,{credentials:"same-origin",cache:"default"})
    .then(function(r){if(!r.ok)throw Error(r.status);return r.text();})
    .then(function(html){setCache(html);state.events=parseFeed(html);render();})
    .catch(function(){
      if(!state.events.length){
        qs("#cfle-main-section").innerHTML='<div class="cfle-empty"><strong>We couldn&rsquo;t load the programs.</strong><span>Please refresh the page and try again.</span></div>';
      }
    });
}
if(d.readyState==="loading"){d.addEventListener("DOMContentLoaded",init);}else{init();}
})();
