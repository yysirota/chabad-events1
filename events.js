(function(){
"use strict";

if(window.CFLE_UPCOMING_EVENTS_V621_LOADED){
    return;
}
window.CFLE_UPCOMING_EVENTS_V621_LOADED=true;

var d=document;
var head=d.getElementsByTagName("head")[0]||d.documentElement;
var currentScript=d.currentScript||d.getElementsByTagName("script")[d.getElementsByTagName("script").length-1];
var scriptSource=currentScript&&currentScript.src?currentScript.src:"";
var base=scriptSource.substring(0,scriptSource.lastIndexOf("/")+1);
var stylesheet=d.getElementById("cfle-events-css");

if(base){
    if(!stylesheet){
        stylesheet=d.createElement("link");
        stylesheet.id="cfle-events-css";
        stylesheet.rel="stylesheet";
        stylesheet.type="text/css";
        head.appendChild(stylesheet);
    }
    stylesheet.href=base+"events.css?v=6.2.1";
}

var CFG={
    feedUrl:"/templates/events.htm",
    pageUrl:"/templates/articlecco_cdo/aid/7437974/jewish/Upcoming-at-Chabad.htm",
    cacheKey:"cfleEventsV621",
    cacheMs:86400000
};

var state={
    events:[],
    active:"all",
    search:"",
    range:"all",
    cadence:"all",
    uiBound:false
};

function qs(selector,parent){
    return (parent||d).querySelector(selector);
}

function qsa(selector,parent){
    return [].slice.call((parent||d).querySelectorAll(selector));
}

function cleanText(value){
    return String(value||"")
        .replace(/\u00a0/g," ")
        .replace(/\s+/g," ")
        .replace(/^\s+|\s+$/g,"");
}

function escapeHtml(value){
    return String(value||"").replace(/[&<>\"]/g,function(character){
        return {
            "&":"&amp;",
            "<":"&lt;",
            ">":"&gt;",
            "\"":"&quot;"
        }[character];
    });
}

function absoluteUrl(url){
    var anchor;
    if(!url){
        return "";
    }
    anchor=d.createElement("a");
    anchor.href=url;
    return anchor.href;
}

function normalized(value){
    return cleanText(value).toLowerCase();
}

function slug(value){
    return normalized(value)
        .replace(/[^a-z0-9]+/g,"-")
        .replace(/^-+|-+$/g,"");
}

function titleKey(value){
    return normalized(value)
        .replace(/[\'’]/g,"")
        .replace(/&/g," and ")
        .replace(/[^a-z0-9]+/g," ")
        .replace(/^\s+|\s+$/g,"")
        .replace(/\s+/g," ");
}

function isAppleDevice(){
    return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent||"");
}

function pad(number){
    number=parseInt(number,10);
    return number<10?"0"+number:String(number);
}

function monthNumber(name){
    var months={
        january:1,
        february:2,
        march:3,
        april:4,
        may:5,
        june:6,
        july:7,
        august:8,
        september:9,
        october:10,
        november:11,
        december:12
    };
    return months[String(name||"").toLowerCase()]||0;
}

function parseClock(value){
    var match=cleanText(value).match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    var hour;
    if(!match){
        return null;
    }
    hour=parseInt(match[1],10);
    if(match[3].toLowerCase()==="pm"&&hour!==12){
        hour+=12;
    }
    if(match[3].toLowerCase()==="am"&&hour===12){
        hour=0;
    }
    return {
        hour:hour,
        minute:parseInt(match[2],10)
    };
}

function parseDateLabel(value){
    var match=cleanText(value).match(/(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Shabbat)\s*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*,?\s*(\d{4})/i);
    if(!match){
        return null;
    }
    return {
        weekday:match[1],
        month:match[2],
        day:parseInt(match[3],10),
        year:parseInt(match[4],10),
        label:match[1]+", "+match[2]+" "+match[3]+", "+match[4]
    };
}

function eventTimeParts(eventItem){
    var pieces=String(eventItem.time||"").split(/\s*-\s*/);
    var start=parseClock(pieces[0]);
    var end=parseClock(pieces[1]);
    if(!start){
        return null;
    }
    if(!end){
        end={
            hour:start.hour+1,
            minute:start.minute
        };
    }
    return {
        start:start,
        end:end
    };
}

function eventDateObject(eventItem){
    var time;
    if(!eventItem.date){
        return null;
    }
    time=eventTimeParts(eventItem);
    time=time?time.start:{hour:12,minute:0};
    return new Date(
        eventItem.date.year,
        monthNumber(eventItem.date.month)-1,
        eventItem.date.day,
        time.hour,
        time.minute,
        0,
        0
    );
}

function eventEndDateObject(eventItem){
    var times;
    var start;
    var end;
    if(!eventItem.date){
        return null;
    }
    times=eventTimeParts(eventItem);
    if(!times){
        return new Date(
            eventItem.date.year,
            monthNumber(eventItem.date.month)-1,
            eventItem.date.day,
            23,
            59,
            59,
            999
        );
    }
    start=new Date(
        eventItem.date.year,
        monthNumber(eventItem.date.month)-1,
        eventItem.date.day,
        times.start.hour,
        times.start.minute,
        0,
        0
    );
    end=new Date(
        eventItem.date.year,
        monthNumber(eventItem.date.month)-1,
        eventItem.date.day,
        times.end.hour,
        times.end.minute,
        0,
        0
    );
    if(end.getTime()<=start.getTime()){
        end.setDate(end.getDate()+1);
    }
    return end;
}

function eventIsUpcoming(eventItem,referenceTime){
    var end=eventEndDateObject(eventItem);
    if(!end){
        return true;
    }
    return end.getTime()>=(referenceTime||new Date()).getTime();
}

function eventDateKey(eventItem){
    if(!eventItem.date){
        return "undated";
    }
    return eventItem.date.year+"-"+
        pad(monthNumber(eventItem.date.month))+"-"+
        pad(eventItem.date.day);
}

function eventKey(eventItem){
    return slug(eventItem.title)+"--"+
        eventDateKey(eventItem)+"--"+
        slug(eventItem.time||"time");
}

function generatedEventUrl(eventItem){
    return CFG.pageUrl+"#event="+encodeURIComponent(eventKey(eventItem));
}

function hashValue(name){
    var hash=String(window.location.hash||"").replace(/^#/,"").split("&");
    var index;
    var parts;
    for(index=0;index<hash.length;index++){
        parts=hash[index].split("=");
        if(decodeURIComponent(parts[0]||"")===name){
            return decodeURIComponent((parts.slice(1).join("=")||"").replace(/\+/g," "));
        }
    }
    return "";
}

function queryValue(name){
    var query=String(window.location.search||"").replace(/^\?/,"").split("&");
    var index;
    var parts;
    for(index=0;index<query.length;index++){
        parts=query[index].split("=");
        if(decodeURIComponent(parts[0]||"")===name){
            return decodeURIComponent((parts.slice(1).join("=")||"").replace(/\+/g," "));
        }
    }
    return "";
}

function requestedEventKey(){
    return hashValue("event")||queryValue("event");
}

function freshFeedUrl(){
    return CFG.feedUrl+
        (CFG.feedUrl.indexOf("?")>-1?"&":"?")+
        "cfle_refresh="+new Date().getTime();
}

function rangeMatches(eventItem){
    var now=new Date();
    var date=eventDateObject(eventItem);
    var start;
    var end;
    if(!date){
        return true;
    }
    if(state.range==="thisweek"){
        start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
        end=new Date(start.getTime());
        end.setDate(start.getDate()+(6-start.getDay()+7)%7+1);
        end.setHours(0,0,0,0);
        return date>=start&&date<end;
    }
    if(state.range==="thismonth"){
        start=new Date(now.getFullYear(),now.getMonth(),1);
        end=new Date(now.getFullYear(),now.getMonth()+1,1);
        return date>=start&&date<end;
    }
    return true;
}

function cadenceMatches(eventItem){
    if(state.cadence==="recurring"){
        return !!eventItem.recurring;
    }
    if(state.cadence==="onetime"){
        return !eventItem.recurring;
    }
    return true;
}

function mapsUrl(location){
    var query=encodeURIComponent(
        (location.name?location.name+" ":"")+
        (location.address||location.text||"")
    );
    if(/Android/i.test(navigator.userAgent||"")){
        return "geo:0,0?q="+query;
    }
    if(isAppleDevice()){
        return "https://maps.apple.com/?q="+query;
    }
    return "https://www.google.com/maps/search/?api=1&query="+query;
}

function calendarStamp(eventItem,clock){
    return eventItem.date.year+
        pad(monthNumber(eventItem.date.month))+
        pad(eventItem.date.day)+"T"+
        pad(clock.hour)+
        pad(clock.minute)+"00";
}

function eventInformationUrl(eventItem){
    return eventItem.detailsUrl||generatedEventUrl(eventItem);
}

function googleCalendarUrl(eventItem){
    var times=eventTimeParts(eventItem);
    var description=eventItem.description||"";
    var dates;
    if(!times||!eventItem.date){
        return "#";
    }
    dates=calendarStamp(eventItem,times.start)+"/"+
        calendarStamp(eventItem,times.end);
    description+=(description?"\n\n":"")+
        "More information: "+eventInformationUrl(eventItem);
    return "https://calendar.google.com/calendar/render"+
        "?action=TEMPLATE"+
        "&text="+encodeURIComponent(eventItem.title)+
        "&dates="+encodeURIComponent(dates)+
        "&ctz="+encodeURIComponent("America/New_York")+
        "&location="+encodeURIComponent(eventItem.location.text||"")+
        "&details="+encodeURIComponent(description);
}

function escapeIcs(value){
    return String(value||"")
        .replace(/\\/g,"\\\\")
        .replace(/\r?\n/g,"\\n")
        .replace(/,/g,"\\,")
        .replace(/;/g,"\\;");
}

function icsText(eventItem){
    var times=eventTimeParts(eventItem);
    var description=eventItem.description||"";
    if(!times||!eventItem.date){
        return "";
    }
    description+=(description?"\n\n":"")+
        "More information: "+eventInformationUrl(eventItem);
    return "BEGIN:VCALENDAR\r\n"+
        "VERSION:2.0\r\n"+
        "PRODID:-//Chabad of Fort Lee//Upcoming at Chabad//EN\r\n"+
        "BEGIN:VEVENT\r\n"+
        "UID:"+eventKey(eventItem)+"@chabadfortlee.com\r\n"+
        "DTSTART;TZID=America/New_York:"+calendarStamp(eventItem,times.start)+"\r\n"+
        "DTEND;TZID=America/New_York:"+calendarStamp(eventItem,times.end)+"\r\n"+
        "SUMMARY:"+escapeIcs(eventItem.title)+"\r\n"+
        "LOCATION:"+escapeIcs(eventItem.location.text||"")+"\r\n"+
        "DESCRIPTION:"+escapeIcs(description)+"\r\n"+
        "END:VEVENT\r\n"+
        "END:VCALENDAR";
}

function downloadIcs(eventItem){
    var blob=new Blob([icsText(eventItem)],{
        type:"text/calendar;charset=utf-8"
    });
    var url=URL.createObjectURL(blob);
    var anchor=d.createElement("a");
    anchor.href=url;
    anchor.download=slug(eventItem.title||"event")+".ics";
    d.body.appendChild(anchor);
    anchor.click();
    d.body.removeChild(anchor);
    window.setTimeout(function(){
        URL.revokeObjectURL(url);
    },1500);
}

function readCache(){
    try{
        var raw=window.localStorage.getItem(CFG.cacheKey);
        var stored=raw?JSON.parse(raw):null;
        if(stored&&stored.html&&new Date().getTime()-stored.time<CFG.cacheMs){
            return stored.html;
        }
    } catch(error){
    }
    return "";
}

function writeCache(html){
    try{
        window.localStorage.setItem(CFG.cacheKey,JSON.stringify({
            time:new Date().getTime(),
            html:html
        }));
    } catch(error){
    }
}

function isDedicatedPageUrl(url){
    var anchor;
    var path;
    var hostname;
    if(!url){
        return false;
    }
    anchor=d.createElement("a");
    anchor.href=url;
    path=String(anchor.pathname||"").toLowerCase();
    hostname=String(anchor.hostname||"").toLowerCase();
    if(!path){
        return false;
    }
    if(
        path.indexOf("/templates/events.htm")>-1||
        path.indexOf("/calendar/view/")>-1||
        path.indexOf("/templates/articlecco_cdo/aid/7437974/")>-1
    ){
        return false;
    }
    if(
        hostname.indexOf("maps.google.")>-1||
        hostname.indexOf("calendar.google.")>-1
    ){
        return false;
    }
    return true;
}

function titleSimilarity(first,second){
    var firstKey=titleKey(first);
    var secondKey=titleKey(second);
    var firstTokens;
    var secondTokens;
    var intersection=0;
    var index;
    var ratio;
    if(!firstKey||!secondKey){
        return 0;
    }
    if(firstKey===secondKey){
        return 100;
    }
    if(
        firstKey.indexOf(secondKey)>-1||
        secondKey.indexOf(firstKey)>-1
    ){
        return 82+
            Math.round(
                Math.min(firstKey.length,secondKey.length)/
                Math.max(firstKey.length,secondKey.length)*12
            );
    }
    firstTokens=firstKey.split(" ");
    secondTokens=secondKey.split(" ");
    for(index=0;index<firstTokens.length;index++){
        if(secondTokens.indexOf(firstTokens[index])>-1){
            intersection++;
        }
    }
    ratio=intersection/Math.max(firstTokens.length,secondTokens.length);
    return Math.round(ratio*78);
}

function findMatchingSitePage(title){
    var links=qsa(
        ".site-nav-wrapper a[href],"+
        "#header a[href],"+
        ".main_menu_container a[href]"
    );
    var bestUrl="";
    var bestScore=0;
    var index;
    var link;
    var url;
    var score;
    for(index=0;index<links.length;index++){
        link=links[index];
        if((" "+link.className+" ").indexOf(" cfle-auto-event-link ")>-1){
            continue;
        }
        url=absoluteUrl(link.getAttribute("href"));
        if(!isDedicatedPageUrl(url)){
            continue;
        }
        score=titleSimilarity(
            title,
            link.textContent||link.innerText||""
        );
        if(/articlecco_cdo/i.test(url)){
            score+=3;
        }
        if(score>bestScore){
            bestScore=score;
            bestUrl=url;
        }
    }
    return bestScore>=82?bestUrl:"";
}

function resolveDetailsUrl(eventItem){
    var matched;
    if(isDedicatedPageUrl(eventItem.nativeDetailsUrl)){
        return eventItem.nativeDetailsUrl;
    }
    matched=findMatchingSitePage(eventItem.title);
    if(matched){
        return matched;
    }
    return generatedEventUrl(eventItem);
}

function isGeneratedDetailsUrl(url){
    var anchor=d.createElement("a");
    if(!url){
        return false;
    }
    anchor.href=url;
    return String(anchor.pathname||"").toLowerCase()
        .indexOf("/templates/articlecco_cdo/aid/7437974/")>-1&&
        String(anchor.hash||"").indexOf("#event=")===0;
}

function extractMarkers(title){
    var markers=[];
    var allowed={
        "s":true,
        "spotlight":true,
        "featured":true,
        "feature":true,
        "holiday":true,
        "holidays":true,
        "youth":true,
        "teen":true,
        "kids":true,
        "children":true,
        "family":true,
        "learning":true,
        "class":true,
        "classes":true,
        "learning class":true,
        "study":true,
        "recurring":true,
        "weekly":true,
        "ongoing":true,
        "monthly":true,
        "one-time":true,
        "onetime":true,
        "special":true
    };
    var clean=String(title||"").replace(
        /\[([^\]]+)\]|\(([^)]+)\)/g,
        function(fullMarker,squareMarker,roundMarker){
            var marker=normalized(squareMarker||roundMarker||"");
            if(allowed[marker]){
                markers.push(marker);
                return "";
            }
            return fullMarker;
        }
    );
    return {
        markers:markers,
        clean:cleanText(clean)
    };
}

function nodeTextWithBreaks(node){
    var clone=node.cloneNode(true);
    var breaks=qsa("br",clone);
    var blocks=qsa("p,div,li",clone);
    var index;
    var text;
    for(index=0;index<breaks.length;index++){
        if(breaks[index].parentNode){
            breaks[index].parentNode.replaceChild(
                d.createTextNode("\n"),
                breaks[index]
            );
        }
    }
    for(index=0;index<blocks.length;index++){
        blocks[index].appendChild(d.createTextNode("\n"));
    }
    text=String(clone.textContent||clone.innerText||"")
        .replace(/\u00a0/g," ")
        .replace(/[ \t]+\n/g,"\n")
        .replace(/\n[ \t]+/g,"\n")
        .replace(/\n{3,}/g,"\n\n")
        .replace(/^\s+|\s+$/g,"");
    return text;
}

function parseLocation(item){
    var link=qs(
        '.event_info a[href*="maps.google.com"],'+
        '.event_info a[href*="google.com/maps"]',
        item
    );
    var clone;
    var breaks;
    var parts;
    var value;
    if(!link){
        return {
            text:"",
            name:"",
            address:"",
            url:""
        };
    }
    clone=link.cloneNode(true);
    breaks=clone.getElementsByTagName("br");
    while(breaks.length){
        breaks[0].parentNode.replaceChild(
            d.createTextNode(" | "),
            breaks[0]
        );
    }
    value=cleanText(clone.textContent||clone.innerText);
    parts=value.split("|");
    return {
        text:value.replace(/\s*\|\s*/g," — "),
        name:cleanText(parts[0]),
        address:cleanText(parts.slice(1).join(" ")),
        url:absoluteUrl(link.getAttribute("href"))
    };
}

function parseDescription(item){
    var infos=qsa(".event_wrapper .event_info",item);
    var index;
    var info;
    var text;
    var candidates=[];
    for(index=0;index<infos.length;index++){
        info=infos[index];
        if(qs(
            'a[href*="maps.google.com"],'+
            'a[href*="google.com/maps"]',
            info
        )){
            continue;
        }
        if((" "+info.className+" ").indexOf(" more_info ")>-1){
            continue;
        }
        text=nodeTextWithBreaks(info);
        text=text
            .replace(/^where:\s*/i,"")
            .replace(/^more information\s*»?\s*/i,"")
            .replace(/^off\s*$/i,"");
        if(text){
            candidates.push(text);
        }
    }
    return candidates.join("\n\n")
        .replace(/\n{3,}/g,"\n\n")
        .replace(/^\s+|\s+$/g,"");
}

function findEventTime(item){
    var nodes=qsa(".event_options.list_info div",item);
    var index;
    var text;
    for(index=nodes.length-1;index>=0;index--){
        text=cleanText(nodes[index].textContent||nodes[index].innerText);
        if(/\d{1,2}:\d{2}\s*(am|pm)/i.test(text)){
            return text;
        }
    }
    return "";
}

function parseEvent(item){
    var parent=item.parentNode;
    var dateNode=parent?qs(".date_stamp .date",parent):null;
    var date=parseDateLabel(dateNode?dateNode.textContent:"");
    var titleNode=qs(".event_wrapper .event_name",item);
    var titleAnchor;
    var rawTitle=titleNode?cleanText(titleNode.textContent||titleNode.innerText):"";
    var titleParts=extractMarkers(rawTitle);
    var details=qs(".more_info a",item);
    if(!details&&titleNode){
        titleAnchor=String(titleNode.tagName||"").toLowerCase()==="a"?
            titleNode:
            qs("a",titleNode);
        details=titleAnchor;
    }
    return {
        id:"",
        rawTitle:rawTitle,
        title:titleParts.clean||rawTitle,
        markers:titleParts.markers,
        date:date,
        time:findEventTime(item),
        description:parseDescription(item),
        location:parseLocation(item),
        nativeDetailsUrl:details?absoluteUrl(details.getAttribute("href")):"",
        detailsUrl:"",
        categories:[],
        featured:false,
        spotlight:false,
        recurring:false
    };
}

function addCategory(eventItem,key){
    if(eventItem.categories.indexOf(key)===-1){
        eventItem.categories.push(key);
    }
}

function inferCategories(eventItem){
    var title=normalized(eventItem.title);
    var markers=eventItem.markers.map(normalized);
    function hasMarker(options){
        return options.some(function(option){
            return markers.indexOf(option)>-1;
        });
    }
    if(hasMarker(["s","spotlight"])){
        eventItem.spotlight=true;
    }
    if(hasMarker(["featured","feature","spotlight","s"])){
        eventItem.featured=true;
    }
    if(hasMarker(["holiday","holidays"])){
        addCategory(eventItem,"holidays");
    }
    if(hasMarker(["youth","teen","kids","children","family"])){
        addCategory(eventItem,"youth");
    }
    if(hasMarker(["learning","class","classes","learning class","study"])){
        addCategory(eventItem,"learning");
    }
    if(hasMarker(["recurring","weekly","ongoing","monthly"])){
        eventItem.recurring=true;
    }
    if(hasMarker(["one-time","onetime","special"])){
        eventItem.recurring=false;
    }
    if(/rosh hashanah|yom kippur|sukkot|simchat torah|chanukah|hanukkah|purim|passover|pesach|shavuot|lag b.?omer|tu b.?shvat|tisha b.?av|selichot|high holiday/.test(title)){
        addCategory(eventItem,"holidays");
    }
    if(/youth|teen|cteen|child|children|kid|kids|family|hebrew school|camp|bar mitzvah|bat mitzvah/.test(title)){
        addCategory(eventItem,"youth");
    }
    if(/class|learning|learn|torah|talmud|chassidus|kabbalah|lecture|course|parsha|lox.*learn|shiur/.test(title)){
        addCategory(eventItem,"learning");
    }
    if(/featured|spotlight/.test(title)){
        eventItem.featured=true;
    }
    if(/weekly|every monday|every tuesday|every wednesday|every thursday|every friday|every saturday|every sunday|ongoing|monthly/.test(title)){
        eventItem.recurring=true;
    }
}

function finalizeEvents(events){
    var counts={};
    var index;
    var key;
    for(index=0;index<events.length;index++){
        key=normalized(events[index].title);
        counts[key]=(counts[key]||0)+1;
    }
    for(index=0;index<events.length;index++){
        inferCategories(events[index]);
        key=normalized(events[index].title);
        if(
            counts[key]>1&&
            !events[index].markers.join(" ").match(/one-time|onetime|special/i)
        ){
            events[index].recurring=true;
        }
        if(events[index].spotlight){
            events[index].featured=true;
        }
        events[index].id=eventKey(events[index]);
        events[index].detailsUrl=resolveDetailsUrl(events[index]);
        events[index].generatedDetails=isGeneratedDetailsUrl(events[index].detailsUrl);
    }
    events.sort(function(first,second){
        var firstDate=eventDateObject(first);
        var secondDate=eventDateObject(second);
        return (firstDate?firstDate.getTime():0)-
            (secondDate?secondDate.getTime():0);
    });
    return events;
}

function parseFeed(html){
    var parsed=new DOMParser().parseFromString(html,"text/html");
    var items=qsa(".category_item",parsed);
    var events=[];
    var index;
    var eventItem;
    for(index=0;index<items.length;index++){
        eventItem=parseEvent(items[index]);
        if(
            eventItem&&
            eventItem.title&&
            eventItem.date&&
            eventIsUpcoming(eventItem)
        ){
            events.push(eventItem);
        }
    }
    return finalizeEvents(events);
}

function labelForFilter(key){
    return {
        all:"All",
        featured:"Featured",
        holidays:"Holidays",
        youth:"Youth",
        learning:"Classes & Learning"
    }[key]||"All";
}

function visibleMainEvents(){
    var query=normalized(state.search);
    return state.events.filter(function(eventItem){
        var haystack;
        var categoryMatches;
        if(eventItem.spotlight){
            return false;
        }
        categoryMatches=
            state.active==="all"||
            (state.active==="featured"&&eventItem.featured)||
            (state.active==="holidays"&&eventItem.categories.indexOf("holidays")>-1)||
            (state.active==="youth"&&eventItem.categories.indexOf("youth")>-1)||
            (state.active==="learning"&&eventItem.categories.indexOf("learning")>-1);
        if(!categoryMatches||!rangeMatches(eventItem)||!cadenceMatches(eventItem)){
            return false;
        }
        if(!query){
            return true;
        }
        haystack=normalized([
            eventItem.title,
            eventItem.description,
            eventItem.location.text,
            eventItem.categories.join(" "),
            eventItem.time,
            eventItem.date?eventItem.date.label:""
        ].join(" "));
        return haystack.indexOf(query)>-1;
    });
}

function visibleSpotlights(){
    var seen={};
    var now=new Date();
    var visible=[];
    state.events.forEach(function(eventItem){
        var date;
        var key;
        if(!eventItem.spotlight){
            return;
        }
        date=eventEndDateObject(eventItem);
        if(date&&date.getTime()<now.getTime()){
            return;
        }
        if(eventItem.recurring){
            key=normalized(eventItem.title);
            if(seen[key]){
                return;
            }
            seen[key]=true;
        }
        visible.push(eventItem);
    });
    return visible;
}

function buildTag(key,text){
    var className="cfle-tag";
    if(key==="featured"){
        className+=" cfle-tag--featured";
    }
    if(key==="holidays"){
        className+=" cfle-tag--holiday";
    }
    if(key==="youth"){
        className+=" cfle-tag--youth";
    }
    if(key==="learning"){
        className+=" cfle-tag--learning";
    }
    if(key==="recurring"){
        className+=" cfle-tag--recurring";
    }
    if(key==="onetime"){
        className+=" cfle-tag--onetime";
    }
    return '<span class="'+className+'">'+escapeHtml(text)+'</span>';
}

function eventTags(eventItem,forSpotlight){
    var tags=[];
    if(forSpotlight||state.active==="featured"||eventItem.featured){
        tags.push(buildTag("featured","Featured"));
    }
    if(eventItem.categories.indexOf("holidays")>-1){
        tags.push(buildTag("holidays","Holiday"));
    }
    if(eventItem.categories.indexOf("youth")>-1){
        tags.push(buildTag("youth","Youth"));
    }
    if(eventItem.categories.indexOf("learning")>-1){
        tags.push(buildTag("learning","Classes & Learning"));
    }
    tags.push(buildTag(
        eventItem.recurring?"recurring":"onetime",
        eventItem.recurring?"Recurring":"One-Time"
    ));
    return tags.join("");
}

function clockIcon(){
    return '<span class="cfle-meta-icon" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24" focusable="false">'+
        '<circle cx="12" cy="12" r="8.6"></circle>'+
        '<path d="M12 7.2v5.1l3.5 2.1"></path>'+
        '</svg></span>';
}

function locationIcon(){
    return '<span class="cfle-location-icon" aria-hidden="true">'+
        '<svg viewBox="0 0 24 28" focusable="false">'+
        '<path d="M12 1.7c-5.55 0-10.05 4.42-10.05 9.87 0 7.2 10.05 14.72 10.05 14.72s10.05-7.52 10.05-14.72C22.05 6.12 17.55 1.7 12 1.7z"></path>'+
        '<circle cx="12" cy="11.5" r="3.7"></circle>'+
        '</svg></span>';
}

function googleIcon(){
    return '<span class="cfle-google-logo" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24" focusable="false">'+
        '<path fill="#4285F4" d="M21.6 12.23c0-.76-.07-1.49-.2-2.19H12v4.15h5.37a4.59 4.59 0 0 1-1.99 3.01v2.69h3.23c1.89-1.74 2.99-4.31 2.99-7.66z"></path>'+
        '<path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.61-2.42l-3.23-2.69c-.89.6-2.04.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.78A9.99 9.99 0 0 0 12 22z"></path>'+
        '<path fill="#FBBC05" d="M6.39 13.72A6.02 6.02 0 0 1 6.08 12c0-.6.1-1.18.31-1.72V7.5H3.05A9.99 9.99 0 0 0 2 12c0 1.61.38 3.14 1.05 4.5l3.34-2.78z"></path>'+
        '<path fill="#EA4335" d="M12 6.15c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.96 3.16 14.7 2 12 2a9.99 9.99 0 0 0-8.95 5.5l3.34 2.78C7.18 7.91 9.39 6.15 12 6.15z"></path>'+
        '</svg></span>';
}

function appleIcon(){
    return '<span class="cfle-apple-logo" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24" focusable="false">'+
        '<path fill="currentColor" d="M16.8 12.8c.03-2.45 2-3.63 2.09-3.69-1.14-1.67-2.92-1.9-3.55-1.93-1.5-.16-2.95.9-3.71.9-.78 0-1.95-.88-3.21-.85-1.63.03-3.16.97-4 2.44-1.73 3-.44 7.4 1.22 9.83.83 1.19 1.8 2.51 3.08 2.46 1.25-.05 1.72-.79 3.23-.79 1.5 0 1.94.79 3.24.76 1.35-.02 2.2-1.19 3-2.39.96-1.36 1.34-2.7 1.35-2.77-.03-.01-2.57-.99-2.54-3.97zM14.36 5.6c.67-.84 1.13-1.98 1-3.12-.98.04-2.21.68-2.91 1.5-.62.72-1.17 1.9-1.02 3 .99.08 2.23-.57 2.93-1.38z"></path>'+
        '</svg></span>';
}

function calendarIcon(){
    return '<span class="cfle-action-icon" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24" focusable="false">'+
        '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect>'+
        '<path d="M7 3v4M17 3v4M3 9h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>'+
        '<path d="M7.3 13h3M13.7 13h3M7.3 17h3M13.7 17h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>'+
        '</svg></span>';
}

function eventTitleHtml(eventItem){
    var generatedClass=eventItem.generatedDetails?" cfle-generated-detail-link":"";
    return '<a class="cfle-title'+generatedClass+'" href="'+
        escapeHtml(eventItem.detailsUrl)+'" data-event-id="'+
        escapeHtml(eventItem.id)+'" aria-label="View details for '+
        escapeHtml(eventItem.title)+'">'+
        escapeHtml(eventItem.title)+'</a>';
}

function calendarButtonsHtml(eventItem){
    var googleButton=
        '<button type="button" class="cfle-action-btn cfle-calendar-google" data-cal="google" data-id="'+escapeHtml(eventItem.id)+'">'+
        googleIcon()+'<span>Add to Calendar</span></button>';
    var secondaryButton;
    if(isAppleDevice()){
        secondaryButton=
            '<button type="button" class="cfle-action-btn cfle-calendar-apple" data-cal="ics" data-id="'+escapeHtml(eventItem.id)+'">'+
            appleIcon()+'<span>Add to Calendar</span></button>';
        return secondaryButton+googleButton;
    }
    secondaryButton=
        '<button type="button" class="cfle-action-btn cfle-calendar-other" data-cal="ics" data-id="'+escapeHtml(eventItem.id)+'">'+
        calendarIcon()+'<span>Other Calendar</span></button>';
    return googleButton+secondaryButton;
}

function actionButtonsHtml(eventItem){
    var generatedClass=eventItem.generatedDetails?" cfle-generated-detail-link":"";
    return '<div class="cfle-actions">'+
        calendarButtonsHtml(eventItem)+
        '<a class="cfle-detail-btn'+generatedClass+'" href="'+
        escapeHtml(eventItem.detailsUrl)+'" data-event-id="'+
        escapeHtml(eventItem.id)+'" aria-label="View details for '+
        escapeHtml(eventItem.title)+'">View Details</a>'+
        '</div>';
}

function renderMeta(eventItem){
    var parts=[];
    if(eventItem.time){
        parts.push(
            '<span class="cfle-meta-item">'+
            clockIcon()+
            '<span>'+escapeHtml(eventItem.time)+'</span></span>'
        );
    }
    if(eventItem.location&&eventItem.location.text){
        parts.push(
            '<a class="cfle-meta-item cfle-location" href="'+
            escapeHtml(mapsUrl(eventItem.location))+
            '" target="_blank" rel="noopener noreferrer">'+
            locationIcon()+
            '<span class="cfle-nowrap">'+
            escapeHtml(eventItem.location.name||eventItem.location.text)+
            '</span></a>'
        );
    }
    return '<div class="cfle-meta">'+
        parts.join('<span class="cfle-meta-separator">|</span>')+
        '</div>';
}

function cardHtml(eventItem,spotlight){
    var date=eventItem.date||{};
    var description=eventItem.description?
        '<p class="cfle-desc">'+
        escapeHtml(eventItem.description).replace(/\n/g,"<br />")+
        '</p>':
        "";
    var className="cfle-card"+
        (spotlight?" cfle-card--spotlight":"")+
        (!eventItem.description?" no-desc":"");
    return '<article class="'+className+'">'+
        '<div class="cfle-date">'+
        '<span class="cfle-date-month">'+escapeHtml((date.month||"").slice(0,3))+'</span>'+
        '<span class="cfle-date-day">'+escapeHtml(date.day||"")+'</span>'+
        '<span class="cfle-date-weekday">'+escapeHtml((date.weekday||"").slice(0,3))+'</span>'+
        '</div>'+
        '<div class="cfle-body">'+
        eventTitleHtml(eventItem)+
        '<div class="cfle-tags">'+eventTags(eventItem,spotlight)+'</div>'+
        description+
        renderMeta(eventItem)+
        '</div>'+
        actionButtonsHtml(eventItem)+
        '</article>';
}

function emptyHtml(){
    return '<div class="cfle-empty">'+
        '<strong>Nothing here just yet.</strong>'+
        '<span>More programs are on the way&mdash;try another category or check back soon.</span>'+
        '<a href="#" class="cfle-reset-link" id="cfle-reset-link">View All</a>'+
        '</div>';
}

function ensureRenderContainers(){
    var mount=qs("#cfle-events");
    var spotlight=qs("#cfle-spotlight-section");
    var main=qs("#cfle-main-section");
    if(!mount){
        return {
            mount:null,
            spotlight:null,
            main:null
        };
    }
    if(!spotlight){
        spotlight=d.createElement("div");
        spotlight.id="cfle-spotlight-section";
        spotlight.className="cfle-section";
        mount.appendChild(spotlight);
    }
    if(!main){
        main=d.createElement("div");
        main.id="cfle-main-section";
        main.className="cfle-section";
        mount.appendChild(main);
    }
    return {
        mount:mount,
        spotlight:spotlight,
        main:main
    };
}

function renderList(){
    var containers=ensureRenderContainers();
    var spotlightEvents=visibleSpotlights();
    var mainEvents=visibleMainEvents();
    var count=qs("#cfle-count");
    var heading=labelForFilter(state.active);
    var html="";
    var index;
    if(!containers.mount||!containers.spotlight||!containers.main||!count){
        return;
    }
    count.innerHTML='<strong>'+mainEvents.length+'</strong> upcoming programs';
    if(spotlightEvents.length){
        html='<h2 class="cfle-section-title"><span class="cfle-star">&#9733;</span> Spotlight</h2>'+
            '<div class="cfle-spot-grid count-'+
            (spotlightEvents.length>4?4:spotlightEvents.length)+'">';
        for(index=0;index<spotlightEvents.length;index++){
            html+=cardHtml(spotlightEvents[index],true);
        }
        html+='</div>';
        containers.spotlight.innerHTML=html;
    } else {
        containers.spotlight.innerHTML="";
    }
    html='<h2 class="cfle-section-title">'+
        escapeHtml(heading)+
        ' <small>now showing</small></h2>';
    html+=mainEvents.length?
        '<div class="cfle-list">'+
        mainEvents.map(function(eventItem){
            return cardHtml(eventItem,false);
        }).join("")+
        '</div>':
        emptyHtml();
    containers.main.innerHTML=html;
}

function detailMetaHtml(eventItem){
    var date=eventItem.date||{};
    var pieces=[];
    if(date.label){
        pieces.push('<strong>'+escapeHtml(date.label)+'</strong>');
    }
    if(eventItem.time){
        pieces.push(
            '<span class="cfle-meta-item">'+clockIcon()+
            '<span>'+escapeHtml(eventItem.time)+'</span></span>'
        );
    }
    if(eventItem.location&&eventItem.location.text){
        pieces.push(
            '<a class="cfle-event-detail-location cfle-meta-item cfle-location" href="'+
            escapeHtml(mapsUrl(eventItem.location))+
            '" target="_blank" rel="noopener noreferrer">'+
            locationIcon()+
            '<span class="cfle-nowrap">'+
            escapeHtml(eventItem.location.text)+
            '</span></a>'
        );
    }
    return pieces.join("");
}

function detailHtml(eventItem){
    var date=eventItem.date||{};
    var description=eventItem.description?
        escapeHtml(eventItem.description).replace(/\n/g,"<br />"):
        "Details will be posted soon.";
    return '<article class="cfle-event-detail">'+
        '<a class="cfle-event-detail-back" href="'+escapeHtml(CFG.pageUrl)+'">&larr; Back to Upcoming at Chabad</a>'+
        '<div class="cfle-event-detail-card">'+
        '<div class="cfle-event-detail-date">'+
        '<span>'+escapeHtml((date.month||"").slice(0,3))+'</span>'+
        '<strong>'+escapeHtml(date.day||"")+'</strong>'+
        '<small>'+escapeHtml(date.year||"")+'</small>'+
        '</div>'+
        '<div class="cfle-event-detail-main">'+
        '<div class="cfle-tags">'+eventTags(eventItem,eventItem.spotlight)+'</div>'+
        '<h1>'+escapeHtml(eventItem.title)+'</h1>'+
        '<div class="cfle-event-detail-meta">'+detailMetaHtml(eventItem)+'</div>'+
        '<div class="cfle-event-detail-description">'+description+'</div>'+
        '<div class="cfle-actions cfle-event-detail-actions">'+
        calendarButtonsHtml(eventItem)+
        '</div>'+
        '</div></div></article>';
}

function setControlsVisible(visible){
    qsa(
        ".cfle-toolbar,"+
        ".cfle-intro,"+
        ".cfle-filters,"+
        ".cfle-top-filters,"+
        ".cfle-more-panel"
    ).forEach(function(element){
        element.style.display=visible?"":"none";
    });
}

function findEvent(id){
    var index;
    for(index=0;index<state.events.length;index++){
        if(state.events[index].id===id){
            return state.events[index];
        }
    }
    return null;
}

function hideNativeListingHeading(){
    var headings=qsa("h1,h2");
    var mount=qs("#cfle-events");
    var index;
    var text;
    for(index=0;index<headings.length;index++){
        if(mount&&mount.contains(headings[index])){
            continue;
        }
        text=normalized(
            headings[index].textContent||
            headings[index].innerText||
            ""
        );
        if(
            text==="upcoming at chabad"||
            text==="programs & events"||
            text==="programs and events"
        ){
            headings[index].style.display="none";
        }
    }
}

function renderDetail(){
    var key=requestedEventKey();
    var mount=qs("#cfle-events");
    var eventItem;
    if(!key||!mount){
        return false;
    }
    eventItem=findEvent(key);
    if(
        eventItem&&
        !eventItem.generatedDetails&&
        eventItem.detailsUrl&&
        !isGeneratedDetailsUrl(eventItem.detailsUrl)
    ){
        window.location.replace(eventItem.detailsUrl);
        return true;
    }
    hideNativeListingHeading();
    setControlsVisible(false);
    mount.className+=(mount.className?" ":"")+"cfle-detail-mode";
    mount.innerHTML=eventItem?
        detailHtml(eventItem):
        '<div class="cfle-empty">'+
        '<strong>This event could not be found.</strong>'+
        '<span>It may have passed, changed, or not finished publishing to the public calendar yet.</span>'+
        '<a class="cfle-reset-link" href="'+escapeHtml(CFG.pageUrl)+'">View all upcoming programs</a>'+
        '</div>';
    if(eventItem){
        d.title=eventItem.title+" | Chabad of Fort Lee";
    }
    return true;
}

function openGeneratedDetail(eventItem){
    var nextHash="event="+encodeURIComponent(eventItem.id);
    if(window.location.hash.replace(/^#/,"")===nextHash){
        renderDetail();
        return;
    }
    window.location.hash=nextHash;
}

function setActiveFilter(key){
    state.active=key;
    qsa(".cfle-filter-btn").forEach(function(button){
        button.className="cfle-filter-btn"+
            (button.getAttribute("data-filter")===key?" active":"");
    });
    renderList();
}

function setChipState(){
    qsa(".cfle-chip-btn").forEach(function(button){
        var group=button.getAttribute("data-group");
        var value=button.getAttribute("data-value");
        var active=
            (group==="range"&&state.range===value)||
            (group==="cadence"&&state.cadence===value);
        button.className="cfle-chip-btn"+(active?" active":"");
    });
}

function closestButtonOrLink(node,root){
    while(node&&node!==root){
        if(
            node.nodeType===1&&
            /^(A|BUTTON)$/i.test(node.tagName||"")
        ){
            return node;
        }
        node=node.parentNode;
    }
    return null;
}

function handleClick(event){
    var target=event.target;
    var button=closestButtonOrLink(target,qs("#cfle-events"));
    var eventItem;
    var id;
    var panel;
    var search;
    if(!button){
        return;
    }
    if(button.classList.contains("cfle-generated-detail-link")){
        event.preventDefault();
        id=button.getAttribute("data-event-id");
        eventItem=findEvent(id);
        if(eventItem){
            openGeneratedDetail(eventItem);
        }
        return;
    }
    if(button.classList.contains("cfle-filter-btn")){
        event.preventDefault();
        setActiveFilter(button.getAttribute("data-filter"));
        return;
    }
    if(button.id==="cfle-more-toggle"){
        event.preventDefault();
        panel=qs("#cfle-more-panel");
        if(panel){
            panel.className=panel.className.indexOf("open")>-1?
                "cfle-more-panel":
                "cfle-more-panel open";
        }
        return;
    }
    if(button.classList.contains("cfle-chip-btn")){
        event.preventDefault();
        if(button.getAttribute("data-group")==="range"){
            state.range=button.getAttribute("data-value");
        }
        if(button.getAttribute("data-group")==="cadence"){
            state.cadence=button.getAttribute("data-value");
        }
        setChipState();
        renderList();
        return;
    }
    if(button.id==="cfle-reset-link"){
        event.preventDefault();
        state.range="all";
        state.cadence="all";
        state.search="";
        search=qs("#cfle-search");
        if(search){
            search.value="";
        }
        setChipState();
        setActiveFilter("all");
        return;
    }
    if(button.classList.contains("cfle-action-btn")){
        event.preventDefault();
        id=button.getAttribute("data-id");
        eventItem=findEvent(id);
        if(!eventItem){
            return;
        }
        if(button.getAttribute("data-cal")==="google"){
            window.open(googleCalendarUrl(eventItem),"_blank");
            return;
        }
        if(button.getAttribute("data-cal")==="ics"){
            downloadIcs(eventItem);
        }
    }
}

function bindUi(){
    var mount=qs("#cfle-events");
    var search=qs("#cfle-search");
    if(!mount||state.uiBound){
        return;
    }
    state.uiBound=true;
    mount.addEventListener("click",handleClick);
    if(search){
        search.addEventListener("input",function(){
            state.search=this.value||"";
            renderList();
        });
    }
    window.addEventListener("hashchange",function(){
        if(requestedEventKey()){
            renderDetail();
        } else {
            window.location.href=CFG.pageUrl;
        }
    });
}

function renderCurrentView(){
    bindUi();
    if(renderDetail()){
        return;
    }
    setControlsVisible(true);
    ensureRenderContainers();
    setChipState();
    renderList();
}

function showLoadFailure(){
    var mount=qs("#cfle-events");
    if(mount){
        mount.innerHTML=
            '<div class="cfle-empty">'+
            '<strong>We couldn&rsquo;t load the programs.</strong>'+
            '<span>Please refresh the page and try again.</span>'+
            '</div>';
    }
}

function requestFeed(){
    if(window.fetch){
        return window.fetch(
            freshFeedUrl(),
            {
                credentials:"same-origin",
                cache:"no-store",
                headers:{
                    "Cache-Control":"no-cache, no-store, must-revalidate",
                    "Pragma":"no-cache"
                }
            }
        ).then(function(response){
            if(!response.ok){
                throw new Error(response.status);
            }
            return response.text();
        });
    }
    return new Promise(function(resolve,reject){
        var request=new XMLHttpRequest();
        request.open("GET",freshFeedUrl(),true);
        request.onreadystatechange=function(){
            if(request.readyState!==4){
                return;
            }
            if(request.status>=200&&request.status<300){
                resolve(request.responseText);
            } else {
                reject(new Error(request.status));
            }
        };
        request.send(null);
    });
}

function init(){
    var cached=readCache();
    var rendered=false;
    if(cached){
        try{
            state.events=parseFeed(cached);
            renderCurrentView();
            rendered=true;
        } catch(error){
        }
    }
    requestFeed()
    .then(function(html){
        writeCache(html);
        state.events=parseFeed(html);
        renderCurrentView();
        rendered=true;
    })
    .catch(function(){
        if(!rendered){
            showLoadFailure();
        }
    });
}

if(d.readyState==="loading"){
    d.addEventListener("DOMContentLoaded",init);
} else {
    init();
}

})();
