(function(){
"use strict";

if(window.CFLE_PAGE_EVENTS_V70_LOADED){
    return;
}
window.CFLE_PAGE_EVENTS_V70_LOADED=true;

var d=document;
var CFG={
    sourceUrl:"/templates/articlecco_cdo/aid/7437974/jewish/Upcoming-at-Chabad.htm",
    upcomingUrl:"/templates/articlecco_cdo/aid/7437974/jewish/Upcoming-at-Chabad.htm",
    pastUrl:"/templates/articlecco_cdo/aid/4214769/jewish/Past-Events.htm",
    parentAid:"7437974",
    cacheKey:"cflePageEventsV70",
    cacheMs:300000,
    homepageLimit:5,
    defaultLocation:"Chabad of Fort Lee, 808 Abbott Blvd, Fort Lee, NJ 07024"
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
        .replace(/[\t\r]+/g," ")
        .replace(/ +/g," ")
        .replace(/\s*\n\s*/g,"\n")
        .replace(/^\s+|\s+$/g,"");
}

function oneLine(value){
    return cleanText(value).replace(/\s+/g," ");
}

function normalized(value){
    return oneLine(value).toLowerCase();
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

function canonicalUrl(url){
    var anchor=d.createElement("a");
    anchor.href=url||"";
    return (anchor.pathname||"").replace(/\/+$/g,"").toLowerCase();
}

function slug(value){
    return normalized(value)
        .replace(/[’']/g,"")
        .replace(/&/g," and ")
        .replace(/[^a-z0-9]+/g,"-")
        .replace(/^-+|-+$/g,"");
}

function pad(number){
    number=parseInt(number,10);
    return number<10?"0"+number:String(number);
}

function monthNumber(name){
    var months={
        jan:1,january:1,
        feb:2,february:2,
        mar:3,march:3,
        apr:4,april:4,
        may:5,
        jun:6,june:6,
        jul:7,july:7,
        aug:8,august:8,
        sep:9,sept:9,september:9,
        oct:10,october:10,
        nov:11,november:11,
        dec:12,december:12
    };
    return months[String(name||"").toLowerCase()]||0;
}

function monthName(number){
    return [
        "","January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ][number]||"";
}

function weekdayName(date){
    return [
        "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"
    ][date.getDay()];
}

function parseClock(value){
    var match=oneLine(value).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
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
        minute:parseInt(match[2]||"0",10),
        label:match[1]+(match[2]?":"+match[2]:"")+" "+match[3].toUpperCase()
    };
}

function parseDatePart(value){
    var text=oneLine(value);
    var match;
    var year;
    var month;
    var day;

    match=text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if(match){
        return {
            year:parseInt(match[1],10),
            month:parseInt(match[2],10),
            day:parseInt(match[3],10),
            raw:match[0]
        };
    }

    match=text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
    if(match){
        return {
            year:parseInt(match[3],10),
            month:parseInt(match[1],10),
            day:parseInt(match[2],10),
            raw:match[0]
        };
    }

    match=text.match(/\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(20\d{2})\b/i);
    if(match){
        month=monthNumber(match[1]);
        day=parseInt(match[2],10);
        year=parseInt(match[3],10);
        return {
            year:year,
            month:month,
            day:day,
            raw:match[0]
        };
    }

    match=text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*,?\s*(20\d{2})\b/i);
    if(match){
        return {
            year:parseInt(match[3],10),
            month:monthNumber(match[2]),
            day:parseInt(match[1],10),
            raw:match[0]
        };
    }

    return null;
}

function parseEventDateTime(value){
    var text=oneLine(value);
    var date=parseDatePart(text);
    var timeRange;
    var times=[];
    var regex=/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/ig;
    var match;
    var startClock;
    var endClock;
    var start;
    var end;
    var explicitEndDate;
    var endMatch;

    if(!date){
        return null;
    }

    while((match=regex.exec(text))!==null){
        times.push(match[1]);
    }

    startClock=times.length?parseClock(times[0]):null;
    endClock=times.length>1?parseClock(times[1]):null;

    start=new Date(
        date.year,
        date.month-1,
        date.day,
        startClock?startClock.hour:0,
        startClock?startClock.minute:0,
        0,
        0
    );

    endMatch=text.match(/(?:End|Ends|Through|Until)\s*:\s*([^|;]+)/i);
    explicitEndDate=endMatch?parseDatePart(endMatch[1]):null;

    if(explicitEndDate){
        end=new Date(
            explicitEndDate.year,
            explicitEndDate.month-1,
            explicitEndDate.day,
            endClock?endClock.hour:23,
            endClock?endClock.minute:59,
            endClock?0:59,
            endClock?0:999
        );
    } else if(endClock){
        end=new Date(
            date.year,
            date.month-1,
            date.day,
            endClock.hour,
            endClock.minute,
            0,
            0
        );
        if(end.getTime()<=start.getTime()){
            end.setDate(end.getDate()+1);
        }
    } else if(startClock){
        end=new Date(start.getTime()+60*60*1000);
    } else {
        end=new Date(
            date.year,
            date.month-1,
            date.day,
            23,59,59,999
        );
    }

    timeRange="";
    if(startClock){
        timeRange=startClock.label;
        if(endClock){
            timeRange+=" - "+endClock.label;
        }
    }

    return {
        start:start,
        end:end,
        allDay:!startClock,
        time:timeRange,
        date:{
            year:date.year,
            month:monthName(date.month),
            day:date.day,
            weekday:weekdayName(start),
            label:weekdayName(start)+", "+monthName(date.month)+" "+date.day+", "+date.year
        }
    };
}

function parseYesNo(text,label){
    var match=oneLine(text).match(new RegExp("(?:^|[;|\\n])\\s*"+label+"\\s*:\\s*(yes|no|on|off|true|false)","i"));
    if(!match){
        return null;
    }
    return /yes|on|true/i.test(match[1]);
}

function parsePlacement(text){
    var value=normalized(text);
    var placement={
        upcoming:false,
        homepage:false,
        featured:false,
        standalone:true,
        recognized:false
    };
    var explicit;

    if(/\bmajor event\b/.test(value)){
        placement.upcoming=true;
        placement.homepage=true;
        placement.featured=true;
        placement.standalone=false;
        placement.recognized=true;
    } else if(/\bregular event\b/.test(value)){
        placement.upcoming=true;
        placement.standalone=false;
        placement.recognized=true;
    } else if(/\bupcoming only\b/.test(value)){
        placement.upcoming=true;
        placement.standalone=false;
        placement.recognized=true;
    } else if(/\bhomepage only\b/.test(value)){
        placement.homepage=true;
        placement.standalone=false;
        placement.recognized=true;
    } else if(/\bstandalone\b/.test(value)){
        placement.recognized=true;
    }

    explicit=parseYesNo(text,"Upcoming");
    if(explicit!==null){
        placement.upcoming=explicit;
        placement.recognized=true;
    }

    explicit=parseYesNo(text,"Homepage");
    if(explicit!==null){
        placement.homepage=explicit;
        placement.recognized=true;
    }

    explicit=parseYesNo(text,"Featured");
    if(explicit!==null){
        placement.featured=explicit;
        placement.recognized=true;
    }

    if(placement.upcoming||placement.homepage||placement.featured){
        placement.standalone=false;
    }

    return placement;
}

function parseLabeledValue(text,label){
    var match=cleanText(text).match(new RegExp("(?:^|\\n|[;|])\\s*"+label+"\\s*:\\s*([^\\n;|]+)","i"));
    return match?oneLine(match[1]):"";
}

function parseCategory(text,title){
    var explicit=normalized(parseLabeledValue(text,"Category"));
    var combined=normalized((explicit?explicit+" ":"")+title);
    if(/holiday|rosh hashanah|yom kippur|sukkot|simchat torah|chanukah|hanukkah|purim|passover|pesach|shavuot|lag b.?omer|tisha b.?av|selichot/.test(combined)){
        return "holidays";
    }
    if(/youth|teen|cteen|child|children|kids|family|hebrew school|camp|bar mitzvah|bat mitzvah/.test(combined)){
        return "youth";
    }
    if(/learning|class|torah|talmud|chassidus|kabbalah|lecture|course|parsha|lox|shiur/.test(combined)){
        return "learning";
    }
    return "";
}

function excludedArea(node){
    var current=node;
    var name;
    while(current&&current!==d.documentElement){
        name=(String(current.id||"")+" "+String(current.className||"")).toLowerCase();
        if(/header|footer|menu|nav|breadcrumb|toolbar|quick.?link|site.?map|mobile.?drawer/.test(name)){
            return true;
        }
        current=current.parentNode;
    }
    return false;
}

function meaningfulAnchorText(anchor){
    var text=oneLine(anchor.textContent||anchor.innerText||"");
    if(!text||/^(read more|more|view|details|learn more)$/i.test(text)){
        return "";
    }
    return text;
}

function findItemContainer(anchor){
    var node=anchor;
    var depth=0;
    var text;
    var placement;
    var dateInfo;
    var anchorCount;

    while(node&&depth<9){
        node=node.parentNode;
        depth++;
        if(!node||node.nodeType!==1||/^(BODY|HTML)$/i.test(node.tagName||"")){
            break;
        }
        if(excludedArea(node)){
            return null;
        }
        text=cleanText(node.textContent||node.innerText||"");
        placement=parsePlacement(text);
        dateInfo=parseEventDateTime(text);
        anchorCount=node.getElementsByTagName("a").length;
        if(
            dateInfo&&
            placement.recognized&&
            anchorCount<=8&&
            text.length<2500
        ){
            return node;
        }
    }
    return null;
}

function chooseImage(container){
    var images=qsa("img",container);
    var index;
    var src;
    for(index=0;index<images.length;index++){
        src=images[index].getAttribute("src")||images[index].getAttribute("data-src")||"";
        if(src&&!/spacer|clear|pixel|arrow|icon_print/i.test(src)){
            return absoluteUrl(src);
        }
    }
    return "";
}

function parseIndexEvents(doc){
    var anchors=qsa('a[href*="/templates/"][href*="/aid/"]',doc);
    var events=[];
    var byUrl={};
    var index;

    for(index=0;index<anchors.length;index++){
        var anchor=anchors[index];
        var title=meaningfulAnchorText(anchor);
        var href=absoluteUrl(anchor.getAttribute("href"));
        var path=canonicalUrl(href);
        var container;
        var fullText;
        var placement;
        var dateInfo;
        var location;
        var category;
        var eventItem;

        if(!title||!href||byUrl[path]){
            continue;
        }
        if(path.indexOf("/aid/"+CFG.parentAid+"/")>-1){
            continue;
        }
        if(/past-events\.htm$/.test(path)){
            continue;
        }

        container=findItemContainer(anchor);
        if(!container){
            continue;
        }

        fullText=cleanText(container.textContent||container.innerText||"");
        placement=parsePlacement(fullText);
        dateInfo=parseEventDateTime(fullText);

        if(!placement.recognized||!dateInfo){
            continue;
        }

        location=parseLabeledValue(fullText,"Location")||CFG.defaultLocation;
        category=parseCategory(fullText,title);

        eventItem={
            id:"page-"+slug(title)+"-"+dateInfo.start.getTime(),
            title:title,
            url:href,
            image:chooseImage(container),
            start:dateInfo.start,
            end:dateInfo.end,
            allDay:dateInfo.allDay,
            time:dateInfo.time,
            date:dateInfo.date,
            location:{
                text:location,
                name:location.split(",")[0]||location
            },
            categories:category?[category]:[],
            featured:placement.featured,
            homepage:placement.homepage,
            upcoming:placement.upcoming,
            standalone:placement.standalone,
            recurring:/\b(recurring|weekly|monthly)\b/i.test(fullText),
            sourceContainer:container
        };

        byUrl[path]=eventItem;
        events.push(eventItem);
    }

    events.sort(function(first,second){
        return first.start.getTime()-second.start.getTime();
    });

    return events;
}

function specialLoxEvent(){
    var reference=new Date();
    var daysUntilSunday=(7-reference.getDay())%7;
    var start=new Date(
        reference.getFullYear(),
        reference.getMonth(),
        reference.getDate()+daysUntilSunday,
        10,0,0,0
    );
    if(daysUntilSunday===0&&reference.getTime()>new Date(
        reference.getFullYear(),
        reference.getMonth(),
        reference.getDate(),
        11,0,0,0
    ).getTime()){
        start.setDate(start.getDate()+7);
    }
    var end=new Date(start.getTime()+60*60*1000);
    return {
        id:"page-lox-learn-"+start.getTime(),
        title:"Lox & Learn",
        url:absoluteUrl("/templates/articlecco_cdo/aid/1202745/jewish/Lox-Learn.htm"),
        image:"",
        start:start,
        end:end,
        allDay:false,
        time:"10:00 AM - 11:00 AM",
        date:{
            year:start.getFullYear(),
            month:monthName(start.getMonth()+1),
            day:start.getDate(),
            weekday:weekdayName(start),
            label:weekdayName(start)+", "+monthName(start.getMonth()+1)+" "+start.getDate()+", "+start.getFullYear()
        },
        location:{
            text:CFG.defaultLocation,
            name:"Chabad of Fort Lee"
        },
        categories:["learning"],
        featured:false,
        homepage:true,
        upcoming:true,
        standalone:false,
        recurring:true,
        sourceContainer:null
    };
}

function addSpecialEvents(events){
    var output=(events||[]).slice(0);
    var lox=specialLoxEvent();
    var exists=output.some(function(eventItem){
        return canonicalUrl(eventItem.url)===canonicalUrl(lox.url)||normalized(eventItem.title)==="lox & learn";
    });
    if(!exists){
        output.push(lox);
    }
    output.sort(function(first,second){
        return first.start.getTime()-second.start.getTime();
    });
    return output;
}

function serializeEvents(events){
    return events.map(function(eventItem){
        return {
            id:eventItem.id,
            title:eventItem.title,
            url:eventItem.url,
            image:eventItem.image,
            start:eventItem.start.getTime(),
            end:eventItem.end.getTime(),
            allDay:eventItem.allDay,
            time:eventItem.time,
            date:eventItem.date,
            location:eventItem.location,
            categories:eventItem.categories,
            featured:eventItem.featured,
            homepage:eventItem.homepage,
            upcoming:eventItem.upcoming,
            standalone:eventItem.standalone,
            recurring:eventItem.recurring
        };
    });
}

function hydrateEvents(events){
    return (events||[]).map(function(eventItem){
        eventItem.start=new Date(eventItem.start);
        eventItem.end=new Date(eventItem.end);
        eventItem.sourceContainer=null;
        return eventItem;
    });
}

function readCache(){
    try{
        var raw=window.localStorage.getItem(CFG.cacheKey);
        var saved=raw?JSON.parse(raw):null;
        if(saved&&saved.events&&Date.now()-saved.time<CFG.cacheMs){
            return hydrateEvents(saved.events);
        }
    } catch(error){
    }
    return [];
}

function writeCache(events){
    try{
        window.localStorage.setItem(
            CFG.cacheKey,
            JSON.stringify({
                time:Date.now(),
                events:serializeEvents(events)
            })
        );
    } catch(error){
    }
}

function requestSource(){
    var url=CFG.sourceUrl+(CFG.sourceUrl.indexOf("?")>-1?"&":"?")+"cfle_page_events="+Date.now();
    if(window.fetch){
        return window.fetch(url,{
            credentials:"same-origin",
            cache:"no-store",
            headers:{
                "Cache-Control":"no-cache, no-store, must-revalidate",
                "Pragma":"no-cache"
            }
        }).then(function(response){
            if(!response.ok){
                throw new Error(String(response.status));
            }
            return response.text();
        });
    }
    return new Promise(function(resolve,reject){
        var request=new XMLHttpRequest();
        request.open("GET",url,true);
        request.onreadystatechange=function(){
            if(request.readyState!==4){
                return;
            }
            if(request.status>=200&&request.status<300){
                resolve(request.responseText);
            } else {
                reject(new Error(String(request.status)));
            }
        };
        request.send(null);
    });
}

function parseSourceHtml(html){
    var doc=new DOMParser().parseFromString(html,"text/html");
    return parseIndexEvents(doc);
}

function now(){
    return new Date();
}

function isUpcoming(eventItem){
    return eventItem.end.getTime()>=now().getTime();
}

function isPast(eventItem){
    return eventItem.end.getTime()<now().getTime();
}

function activeEvents(){
    return state.events.filter(function(eventItem){
        return eventItem.upcoming&&!eventItem.standalone&&isUpcoming(eventItem);
    });
}

function pastEvents(){
    return state.events.filter(function(eventItem){
        return eventItem.upcoming&&!eventItem.standalone&&isPast(eventItem);
    }).sort(function(first,second){
        return second.start.getTime()-first.start.getTime();
    });
}

function isAppleDevice(){
    return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent||"");
}

function mapsUrl(location){
    var text=location&&location.text?location.text:"";
    var encoded=encodeURIComponent(text);
    if(/Android/i.test(navigator.userAgent||"")){
        return "geo:0,0?q="+encoded;
    }
    if(isAppleDevice()){
        return "https://maps.apple.com/?q="+encoded;
    }
    return "https://www.google.com/maps/search/?api=1&query="+encoded;
}

function calendarStamp(date){
    return date.getFullYear()+
        pad(date.getMonth()+1)+
        pad(date.getDate())+"T"+
        pad(date.getHours())+
        pad(date.getMinutes())+"00";
}

function googleCalendarUrl(eventItem){
    return "https://calendar.google.com/calendar/render?action=TEMPLATE"+
        "&text="+encodeURIComponent(eventItem.title)+
        "&dates="+encodeURIComponent(calendarStamp(eventItem.start)+"/"+calendarStamp(eventItem.end))+
        "&location="+encodeURIComponent(eventItem.location.text||"")+
        "&details="+encodeURIComponent("More information: "+eventItem.url);
}

function escapeIcs(value){
    return String(value||"")
        .replace(/\\/g,"\\\\")
        .replace(/\r?\n/g,"\\n")
        .replace(/,/g,"\\,")
        .replace(/;/g,"\\;");
}

function icsText(eventItem){
    return "BEGIN:VCALENDAR\r\n"+
        "VERSION:2.0\r\n"+
        "PRODID:-//Chabad of Fort Lee//Page Events//EN\r\n"+
        "BEGIN:VEVENT\r\n"+
        "UID:"+escapeIcs(eventItem.id)+"@chabadfortlee.com\r\n"+
        "DTSTART:"+calendarStamp(eventItem.start)+"\r\n"+
        "DTEND:"+calendarStamp(eventItem.end)+"\r\n"+
        "SUMMARY:"+escapeIcs(eventItem.title)+"\r\n"+
        "LOCATION:"+escapeIcs(eventItem.location.text||"")+"\r\n"+
        "DESCRIPTION:"+escapeIcs("More information: "+eventItem.url)+"\r\n"+
        "URL:"+escapeIcs(eventItem.url)+"\r\n"+
        "END:VEVENT\r\n"+
        "END:VCALENDAR";
}

function downloadIcs(eventItem){
    var blob=new Blob([icsText(eventItem)],{type:"text/calendar;charset=utf-8"});
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
    return '<span class="'+className+'">'+escapeHtml(text)+'</span>';
}

function eventTags(eventItem,spotlight){
    var output=[];
    if(spotlight||eventItem.featured){
        output.push(buildTag("featured","Featured"));
    }
    if(eventItem.categories.indexOf("holidays")>-1){
        output.push(buildTag("holidays","Holiday"));
    }
    if(eventItem.categories.indexOf("youth")>-1){
        output.push(buildTag("youth","Youth"));
    }
    if(eventItem.categories.indexOf("learning")>-1){
        output.push(buildTag("learning","Classes & Learning"));
    }
    return output.join("");
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

function calendarButtonsHtml(eventItem){
    var googleButton=
        '<button type="button" class="cfle-action-btn cfle-calendar-google" data-cal="google" data-id="'+escapeHtml(eventItem.id)+'">'+
        googleIcon()+'<span>Add to Calendar</span></button>';
    var secondaryButton;
    if(isAppleDevice()){
        secondaryButton=
            '<button type="button" class="cfle-action-btn cfle-calendar-apple" data-cal="ics" data-id="'+escapeHtml(eventItem.id)+'">'+
            appleIcon()+'<span>Add to Calendar</span></button>';
        return '<div class="cfle-calendar-buttons">'+secondaryButton+googleButton+'</div>';
    }
    secondaryButton=
        '<button type="button" class="cfle-action-btn cfle-calendar-other" data-cal="ics" data-id="'+escapeHtml(eventItem.id)+'">'+
        calendarIcon()+'<span>Other Calendar</span></button>';
    return '<div class="cfle-calendar-buttons">'+googleButton+secondaryButton+'</div>';
}

function cardHtml(eventItem,spotlight,past){
    var date=eventItem.date||{};
    var actions=past?
        '<div class="cfle-actions"><a class="cfle-detail-btn" href="'+escapeHtml(eventItem.url)+'">View Event</a></div>':
        '<div class="cfle-actions">'+calendarButtonsHtml(eventItem)+
        '<a class="cfle-detail-btn" href="'+escapeHtml(eventItem.url)+'">View Details</a></div>';

    return '<article class="cfle-card'+(spotlight?' cfle-card--spotlight':'')+' no-desc">'+
        '<div class="cfle-date">'+
        '<span class="cfle-date-month">'+escapeHtml((date.month||"").slice(0,3))+'</span>'+
        '<span class="cfle-date-day">'+escapeHtml(date.day||"")+'</span>'+
        '<span class="cfle-date-weekday">'+escapeHtml((date.weekday||"").slice(0,3))+'</span>'+
        '</div>'+
        '<div class="cfle-body">'+
        '<a class="cfle-title" href="'+escapeHtml(eventItem.url)+'">'+escapeHtml(eventItem.title)+'</a>'+
        '<div class="cfle-tags">'+eventTags(eventItem,spotlight)+'</div>'+
        renderMeta(eventItem)+
        '</div>'+actions+'</article>';
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

function rangeMatches(eventItem){
    var reference=now();
    var start;
    var end;
    if(state.range==="thisweek"){
        start=new Date(reference.getFullYear(),reference.getMonth(),reference.getDate());
        end=new Date(start.getTime());
        end.setDate(start.getDate()+7);
        return eventItem.start>=start&&eventItem.start<end;
    }
    if(state.range==="thismonth"){
        start=new Date(reference.getFullYear(),reference.getMonth(),1);
        end=new Date(reference.getFullYear(),reference.getMonth()+1,1);
        return eventItem.start>=start&&eventItem.start<end;
    }
    return true;
}

function visibleSpotlights(){
    return activeEvents().filter(function(eventItem){
        return eventItem.featured;
    });
}

function visibleMainEvents(){
    var query=normalized(state.search);
    return activeEvents().filter(function(eventItem){
        var categoryMatch;
        var haystack;
        if(eventItem.featured){
            return false;
        }
        categoryMatch=
            state.active==="all"||
            (state.active==="featured"&&eventItem.featured)||
            eventItem.categories.indexOf(state.active)>-1;
        if(!categoryMatch||!rangeMatches(eventItem)){
            return false;
        }
        if(state.cadence==="onetime"&&eventItem.recurring){
            return false;
        }
        if(state.cadence==="recurring"&&!eventItem.recurring){
            return false;
        }
        if(!query){
            return true;
        }
        haystack=normalized([
            eventItem.title,
            eventItem.time,
            eventItem.location.text,
            eventItem.categories.join(" "),
            eventItem.date.label
        ].join(" "));
        return haystack.indexOf(query)>-1;
    });
}

function ensureRenderContainers(){
    var mount=qs("#cfle-events");
    var spotlight=qs("#cfle-spotlight-section");
    var main=qs("#cfle-main-section");
    if(!mount){
        return null;
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
    return {mount:mount,spotlight:spotlight,main:main};
}

function renderUpcoming(){
    var containers=ensureRenderContainers();
    var spotlightEvents;
    var mainEvents;
    var count;
    var html;
    if(!containers){
        return;
    }
    spotlightEvents=visibleSpotlights();
    mainEvents=visibleMainEvents();
    count=qs("#cfle-count");
    if(count){
        count.innerHTML='<strong>'+(spotlightEvents.length+mainEvents.length)+'</strong> upcoming programs';
    }
    if(spotlightEvents.length){
        html='<h2 class="cfle-section-title"><span class="cfle-star">&#9733;</span> Featured</h2>'+
            '<div class="cfle-spot-grid count-'+Math.min(spotlightEvents.length,4)+'">'+
            spotlightEvents.map(function(eventItem){
                return cardHtml(eventItem,true,false);
            }).join("")+'</div>';
        containers.spotlight.innerHTML=html;
    } else {
        containers.spotlight.innerHTML="";
    }
    html='<h2 class="cfle-section-title">'+escapeHtml(labelForFilter(state.active))+' <small>now showing</small></h2>';
    if(mainEvents.length){
        html+='<div class="cfle-list">'+mainEvents.map(function(eventItem){
            return cardHtml(eventItem,false,false);
        }).join("")+'</div>';
    } else {
        html+='<div class="cfle-empty"><strong>No upcoming events are listed yet.</strong><span>Please check back soon.</span></div>';
    }
    containers.main.innerHTML=html;
}

function renderPast(){
    var mount=qs("#cfle-past-events");
    var events=pastEvents();
    if(!mount){
        return;
    }
    mount.className="cfle-past-events-wrap";
    if(!events.length){
        mount.innerHTML='<div class="cfle-empty"><strong>No past events are listed yet.</strong></div>';
        return;
    }
    mount.innerHTML='<div class="cfle-list cfle-past-list">'+events.map(function(eventItem){
        return cardHtml(eventItem,false,true);
    }).join("")+'</div>';
}

function findHomepageModule(){
    var markerCandidates=qsa(".chabad_updates,.message_format,.bottom_padding,div,p,span");
    var anchors=qsa("a");
    var index;
    var text;
    var node;
    var depth;

    for(index=0;index<markerCandidates.length;index++){
        text=normalized(markerCandidates[index].textContent||markerCandidates[index].innerText||"");
        if(text!=="cfle_page_events"){
            continue;
        }
        node=markerCandidates[index];
        while(node&&node!==d.body){
            if((" "+String(node.className||"")+" ").indexOf(" chabad_updates ")>-1){
                return node;
            }
            node=node.parentNode;
        }
        return markerCandidates[index].parentNode||markerCandidates[index];
    }

    for(index=0;index<anchors.length;index++){
        text=normalized(anchors[index].textContent||anchors[index].innerText||"");
        if(text!=="view more upcoming events"&&text!=="view more"&&text!=="view all upcoming events"){
            continue;
        }
        if(excludedArea(anchors[index])){
            continue;
        }
        node=anchors[index];
        depth=0;
        while(node&&depth<7){
            node=node.parentNode;
            depth++;
            if(!node||node===d.body){
                break;
            }
            text=normalized(node.textContent||node.innerText||"");
            if(text.indexOf("upcoming at chabad")>-1&&node.getElementsByTagName("a").length<=15){
                return node;
            }
        }
    }
    return null;
}

function renderHomepage(){
    var module;
    var events;
    var html;
    if(!d.body||String(d.body.className||"").indexOf("home")===-1){
        return;
    }
    module=findHomepageModule();
    if(!module){
        return;
    }
    events=activeEvents().filter(function(eventItem){
        return eventItem.homepage;
    }).slice(0,CFG.homepageLimit);
    html='<div class="cfle-home-events">'+
        '<h5 class="cfle-home-events-title">Upcoming at Chabad</h5>';
    if(events.length){
        html+='<div class="cfle-home-events-list">'+events.map(function(eventItem){
            return '<a class="cfle-home-event" href="'+escapeHtml(eventItem.url)+'">'+
                '<span class="cfle-home-event-date">'+escapeHtml(eventItem.date.label+(eventItem.time?' &bull; '+eventItem.time:''))+'</span>'+
                '<strong>'+escapeHtml(eventItem.title)+'</strong></a>';
        }).join("")+'</div>';
    } else {
        html+='<p class="cfle-home-events-empty">More programs are coming soon.</p>';
    }
    html+='<a class="cfle-home-view-more" href="'+escapeHtml(CFG.upcomingUrl)+'">View More</a></div>';
    module.innerHTML=html;
    module.className+=(module.className?" ":"")+"cfle-home-events-module";
}

function hideExpiredDropdownLinks(){
    var expired={};
    var anchors;
    var index;
    var path;
    var node;
    state.events.forEach(function(eventItem){
        if(isPast(eventItem)){
            expired[canonicalUrl(eventItem.url)]=true;
        }
    });
    anchors=qsa('.site-nav-wrapper a[href],#co_menu_container a[href],#header a[href]');
    for(index=0;index<anchors.length;index++){
        path=canonicalUrl(anchors[index].href);
        if(!expired[path]){
            continue;
        }
        node=anchors[index];
        while(node&&node.parentNode&&node.parentNode!==d.body){
            if(/co_menu_item|item|menu-item/i.test(String(node.className||""))){
                break;
            }
            node=node.parentNode;
        }
        if(node&&node.style){
            node.style.display="none";
            node.setAttribute("data-cfle-expired-event","true");
        } else {
            anchors[index].style.display="none";
        }
    }
}

function hideNativeIndexSources(events){
    var seen=[];
    var hiddenRoots=[];
    events.forEach(function(eventItem){
        var container=eventItem.sourceContainer;
        var current=container;
        var depth=0;
        var name;
        var root=null;

        while(current&&depth<6){
            name=(String(current.id||"")+" "+String(current.className||"")).toLowerCase();
            if(/(^|[ _-])index([ _-]|$)|article[_ -]?index|index[_ -]?(list|container|wrapper)/.test(name)){
                root=current;
                break;
            }
            current=current.parentNode;
            depth++;
        }

        if(root&&hiddenRoots.indexOf(root)===-1){
            hiddenRoots.push(root);
            root.className+=(root.className?" ":"")+"cfle-native-index-source";
            root.style.display="none";
            return;
        }

        if(container&&seen.indexOf(container)===-1){
            seen.push(container);
            container.className+=(container.className?" ":"")+"cfle-native-index-source";
            container.style.display="none";
        }
    });
}

function findEventById(id){
    var index;
    for(index=0;index<state.events.length;index++){
        if(state.events[index].id===id){
            return state.events[index];
        }
    }
    return null;
}

function closestControl(node,root){
    while(node&&node!==root){
        if(node.nodeType===1&&/^(A|BUTTON)$/i.test(node.tagName||"")){
            return node;
        }
        node=node.parentNode;
    }
    return null;
}

function setActiveFilter(key){
    state.active=key;
    qsa(".cfle-filter-btn").forEach(function(button){
        button.className="cfle-filter-btn"+(button.getAttribute("data-filter")===key?" active":"");
    });
    renderUpcoming();
}

function setChipState(){
    qsa(".cfle-chip-btn").forEach(function(button){
        var group=button.getAttribute("data-group");
        var value=button.getAttribute("data-value");
        var active=(group==="range"&&state.range===value)||(group==="cadence"&&state.cadence===value);
        button.className="cfle-chip-btn"+(active?" active":"");
    });
}

function bindUi(){
    var mount=qs("#cfle-events");
    var search=qs("#cfle-search");
    if(!mount||state.uiBound){
        return;
    }
    state.uiBound=true;
    mount.addEventListener("click",function(event){
        var control=closestControl(event.target,mount);
        var eventItem;
        var panel;
        if(!control){
            return;
        }
        if(control.className.indexOf("cfle-filter-btn")>-1){
            event.preventDefault();
            setActiveFilter(control.getAttribute("data-filter"));
            return;
        }
        if(control.id==="cfle-more-toggle"){
            event.preventDefault();
            panel=qs("#cfle-more-panel");
            if(panel){
                panel.className=panel.className.indexOf("open")>-1?"cfle-more-panel":"cfle-more-panel open";
            }
            return;
        }
        if(control.className.indexOf("cfle-chip-btn")>-1){
            event.preventDefault();
            if(control.getAttribute("data-group")==="range"){
                state.range=control.getAttribute("data-value");
            }
            if(control.getAttribute("data-group")==="cadence"){
                state.cadence=control.getAttribute("data-value");
            }
            setChipState();
            renderUpcoming();
            return;
        }
        if(control.className.indexOf("cfle-action-btn")>-1){
            event.preventDefault();
            eventItem=findEventById(control.getAttribute("data-id"));
            if(!eventItem){
                return;
            }
            if(control.getAttribute("data-cal")==="google"){
                window.open(googleCalendarUrl(eventItem),"_blank");
            } else {
                downloadIcs(eventItem);
            }
        }
    });
    if(search){
        search.addEventListener("input",function(){
            state.search=this.value||"";
            renderUpcoming();
        });
    }
}

function renderAll(events,fromCurrentDocument){
    events=addSpecialEvents(events);
    state.events=events;
    if(fromCurrentDocument){
        hideNativeIndexSources(events);
    }
    bindUi();
    setChipState();
    renderUpcoming();
    renderPast();
    renderHomepage();
    hideExpiredDropdownLinks();
}

function useCachedEvents(){
    var cached=readCache();
    if(cached.length){
        renderAll(cached,false);
        return true;
    }
    return false;
}

function loadEvents(){
    var currentEvents=[];
    var usedCurrent=false;

    if(qs("#cfle-events")){
        currentEvents=parseIndexEvents(d);
        if(currentEvents.length){
            usedCurrent=true;
            writeCache(currentEvents);
            renderAll(currentEvents,true);
        }
    }

    if(!usedCurrent){
        useCachedEvents();
    }

    requestSource().then(function(html){
        var events=parseSourceHtml(html);
        if(events.length){
            writeCache(events);
            renderAll(events,false);
        } else if(!usedCurrent&&!state.events.length){
            renderAll([],false);
        }
    }).catch(function(){
        if(!state.events.length){
            renderAll([],false);
        }
    });
}

function init(){
    loadEvents();
    if(window.MutationObserver){
        var timer;
        var observer=new MutationObserver(function(){
            window.clearTimeout(timer);
            timer=window.setTimeout(function(){
                if(state.events.length){
                    renderHomepage();
                    hideExpiredDropdownLinks();
                }
            },150);
        });
        observer.observe(d.body,{childList:true,subtree:true});
    }
}

window.CFLEPageEvents={
    refresh:loadEvents,
    parseIndexEvents:parseIndexEvents
};

if(d.readyState==="loading"){
    d.addEventListener("DOMContentLoaded",init);
} else {
    init();
}

})();
