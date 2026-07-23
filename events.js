(function(){
"use strict";

if(window.CFLE_EVENTS_CLEAN_V1_LOADED){
    return;
}
window.CFLE_EVENTS_CLEAN_V1_LOADED=true;

var d=document;
var CFG={
    version:"9.0.0",
    buildId:"CFLE-CLEAN-2026-07-22-A",
    sourceUrl:"/templates/articlecco_cdo/aid/7437974/jewish/Upcoming-at-Chabad.htm",
    upcomingUrl:"/templates/articlecco_cdo/aid/7437974/jewish/Upcoming-at-Chabad.htm",
    pastUrl:"/templates/articlecco_cdo/aid/4214769/jewish/Past-Events.htm",
    parentAid:"7437974",
    cacheKey:"cfleEventsCleanV1",
    homepageLimit:4,
    requestTimeoutMs:3000,
    defaultLocation:"Chabad of Fort Lee, 808 Abbott Blvd, Fort Lee, NJ 07024",
    lox:{
        enabled:true,
        title:"Lox & Learn",
        url:"/templates/articlecco_cdo/aid/1202745/jewish/Lox-Learn.htm",
        calendarFeedUrl:"/templates/events.htm",
        homepage:true,
        upcoming:true
    }
};

window.CFLE_EVENTS_VERSION=CFG.version;
window.CFLE_EVENTS_BUILD_ID=CFG.buildId;

var state={
    events:[],
    pageEvents:[],
    calendarLox:null,
    pageDone:false,
    calendarDone:false,
    pageSuccess:false,
    calendarSuccess:false,
    initialLoadPending:true,
    search:"",
    range:"all",
    bound:false,
    homeWatcherStarted:false
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
        .replace(/[–—]/g,"-")
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

function readableNodeText(node){
    var text;
    var clone;
    var owner;

    if(!node){
        return "";
    }

    clone=node.cloneNode(true);
    owner=clone.ownerDocument||d;

    qsa(
        "br,p,div,li,section,article,h1,h2,h3,h4,h5,h6,td,tr",
        clone
    ).forEach(function(element){
        if(element.parentNode){
            element.parentNode.insertBefore(
                owner.createTextNode(" "),
                element
            );
        }
        element.appendChild(
            owner.createTextNode(" ")
        );
    });

    return cleanText(clone.textContent||"");
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

/* ============================================================
   DYNAMIC EVENT-TITLE FITTING
   Keeps short titles on one line and longer titles within two.
   ============================================================ */

function measuredLineHeight(element){

    var styles=
        window.getComputedStyle(element);

    var lineHeight=
        parseFloat(styles.lineHeight);

    if(isNaN(lineHeight)){

        lineHeight=
            parseFloat(styles.fontSize)*
            1.08;
    }

    return lineHeight;
}

function fitTitleElement(
    element,
    maximumSize,
    minimumSize,
    shortTitleLimit
){

    var text;
    var preferredLines;
    var currentSize;

    if(
        !element ||
        !element.offsetWidth
    ){
        return;
    }

    text=
        oneLine(
            element.textContent||
            element.innerText||
            ""
        );

    /*
     * Short titles such as "Lox & Learn"
     * should stay on one line.
     *
     * Longer titles may use two lines.
     */
    preferredLines=
        text.length<=shortTitleLimit?
        1:
        2;

    function prepareForMeasurement(lines){

        element.style.display=
            "block";

        element.style.overflow=
            "visible";

        element.style.textOverflow=
            "clip";

        element.style.webkitLineClamp=
            "unset";

        element.style.webkitBoxOrient=
            "initial";

        element.style.lineHeight=
            "1.06";

        element.style.whiteSpace=
            lines===1?
            "nowrap":
            "normal";
    }

    function fitsWithin(lines){

        var allowedHeight;

        if(lines===1){

            return (
                element.scrollWidth<=
                element.clientWidth+1
            );
        }

        allowedHeight=
            measuredLineHeight(element)*
            lines;

        return (
            element.scrollHeight<=
            allowedHeight+2
        );
    }

    function reduceUntilFit(lines){

        currentSize=
            maximumSize;

        prepareForMeasurement(lines);

        while(
            currentSize>
            minimumSize
        ){

            element.style.fontSize=
                currentSize+"px";

            if(fitsWithin(lines)){
                break;
            }

            currentSize--;
        }
    }

    reduceUntilFit(
        preferredLines
    );

    /*
     * If even the minimum size cannot keep a short title
     * on one line, allow it to use two lines rather than
     * clipping any words.
     */
    if(
        preferredLines===1 &&
        !fitsWithin(1)
    ){

        preferredLines=2;

        reduceUntilFit(2);
    }

    element.style.fontSize=
        currentSize+"px";

    element.style.overflow=
        "hidden";

    if(preferredLines===1){

        element.style.display=
            "block";

        element.style.whiteSpace=
            "nowrap";

        element.style.webkitLineClamp=
            "unset";

    } else {

        element.style.display=
            "-webkit-box";

        element.style.whiteSpace=
            "normal";

        element.style.webkitBoxOrient=
            "vertical";

        element.style.webkitLineClamp=
            "2";
    }
}

function fitAllEventTitles(root){

    var scope=
        root||
        document;

    /*
     * Homepage titles:
     * short titles remain on one line;
     * longer titles may use two.
     */
    qsa(
        ".cfle-home-event-title",
        scope
    ).forEach(function(title){

        fitTitleElement(
            title,
            25,
            16,
            18
        );
    });

    /*
     * Main Upcoming at Chabad cards.
     */
    qsa(
        ".cfle-event-title a",
        scope
    ).forEach(function(title){

        var card=
            closestBySelector(
                title,
                ".cfle-card"
            );

        var cardWidth=
            card?
            card.getBoundingClientRect()
                .width:
            0;

       if(window.innerWidth<=700){

    var mobileTitleText=
        oneLine(
            title.textContent||
            title.innerText||
            ""
        );

    title.classList.remove(
        "cfle-mobile-short-title"
    );

    /*
     * Short titles such as "Lox & Learn"
     * must remain on one line.
     */
    if(mobileTitleText.length<=18){

        title.classList.add(
            "cfle-mobile-short-title"
        );

        /*
         * Remove measurements previously written
         * by the automatic title fitter.
         */
        title.style.removeProperty(
            "font-size"
        );

        title.style.removeProperty(
            "display"
        );

        title.style.removeProperty(
            "white-space"
        );

        title.style.removeProperty(
            "overflow"
        );

        title.style.removeProperty(
            "-webkit-line-clamp"
        );

        title.style.removeProperty(
            "-webkit-box-orient"
        );

    } else {

        /*
         * Longer titles may occupy a maximum
         * of two lines.
         */
        fitTitleElement(
            title,
            28,
            16,
            0
        );
    }

        } else if(cardWidth>=700){

            /*
             * Full-width desktop card.
             */
            fitTitleElement(
                title,
                42,
                24,
                26
            );

        } else {

            /*
             * Half-width desktop card.
             */
            fitTitleElement(
                title,
                28,
                18,
                20
            );
        }
    });
}

function scheduleEventTitleFit(root){

    var runFit=function(){

        fitAllEventTitles(
            root||
            document
        );
    };

    if(window.requestAnimationFrame){

        window.requestAnimationFrame(
            runFit
        );

    } else {

        window.setTimeout(
            runFit,
            0
        );
    }
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

function canonicalPath(url){
    var anchor=d.createElement("a");
    anchor.href=url||"";
    return (anchor.pathname||"")
        .replace(/\/+$/g,"")
        .toLowerCase();
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

function weekdayNameFromYmd(year,month,day){
    return [
        "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"
    ][new Date(Date.UTC(year,month-1,day)).getUTCDay()];
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
        label:parseInt(match[1],10)+(match[2]?":"+match[2]:"")+" "+match[3].toUpperCase()
    };
}

function parseDatePart(value){
    var text=oneLine(value);
    var match;

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
        return {
            year:parseInt(match[3],10),
            month:monthNumber(match[1]),
            day:parseInt(match[2],10),
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

function nthSunday(year,month,nth){
    var firstDay=new Date(Date.UTC(year,month-1,1)).getUTCDay();
    var firstSunday=1+((7-firstDay)%7);
    return firstSunday+((nth-1)*7);
}

function newYorkOffsetHours(parts){
    var marchSecondSunday=nthSunday(parts.year,3,2);
    var novemberFirstSunday=nthSunday(parts.year,11,1);
    var key=(parts.month*1000000)+(parts.day*10000)+(parts.hour*100)+parts.minute;
    var startKey=(3*1000000)+(marchSecondSunday*10000)+(2*100);
    var endKey=(11*1000000)+(novemberFirstSunday*10000)+(2*100);
    return key>=startKey&&key<endKey?4:5;
}

function timestampFromParts(parts){
    return Date.UTC(
        parts.year,
        parts.month-1,
        parts.day,
        parts.hour||0,
        parts.minute||0,
        0,
        0
    )+(newYorkOffsetHours(parts)*60*60*1000);
}

function dateKey(parts){
    return (parts.year*10000)+(parts.month*100)+parts.day;
}

function addDaysToParts(parts,days){
    var date=new Date(Date.UTC(parts.year,parts.month-1,parts.day+days));
    return {
        year:date.getUTCFullYear(),
        month:date.getUTCMonth()+1,
        day:date.getUTCDate(),
        hour:parts.hour||0,
        minute:parts.minute||0
    };
}

function parseEventDateTime(value){
    var text=oneLine(value);
    var dates=[];
    var dateRegex=/(20\d{2}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/20\d{2}|(?:January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*20\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*,?\s*20\d{2})/ig;
    var timeRegex=/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/ig;
    var times=[];
    var match;
    var firstDate;
    var secondDate;
    var startClock;
    var endClock;
    var startParts;
    var endParts;
    var allDay;
    var startTs;
    var endTs;
    var timeLabel="";

    while((match=dateRegex.exec(text))!==null){
        dates.push(parseDatePart(match[1]));
    }
    while((match=timeRegex.exec(text))!==null){
        times.push(parseClock(match[1]));
    }

    firstDate=dates[0]||parseDatePart(text);
    if(!firstDate){
        return null;
    }
    secondDate=dates[1]||firstDate;
    startClock=times[0]||null;
    endClock=times[1]||null;
    allDay=!startClock;

    startParts={
        year:firstDate.year,
        month:firstDate.month,
        day:firstDate.day,
        hour:startClock?startClock.hour:0,
        minute:startClock?startClock.minute:0
    };

    if(endClock){
        endParts={
            year:secondDate.year,
            month:secondDate.month,
            day:secondDate.day,
            hour:endClock.hour,
            minute:endClock.minute
        };
        if(timestampFromParts(endParts)<=timestampFromParts(startParts)){
            endParts=addDaysToParts(endParts,1);
        }
    } else if(startClock){
        endParts={
            year:secondDate.year,
            month:secondDate.month,
            day:secondDate.day,
            hour:startClock.hour+1,
            minute:startClock.minute
        };
        if(endParts.hour>=24){
            endParts.hour-=24;
            endParts=addDaysToParts(endParts,1);
        }
    } else {
        endParts={
            year:secondDate.year,
            month:secondDate.month,
            day:secondDate.day,
            hour:23,
            minute:59
        };
    }

    startTs=timestampFromParts(startParts);
    endTs=timestampFromParts(endParts);

    if(startClock){
        timeLabel=startClock.label;
        if(endClock){
            timeLabel+=" - "+endClock.label;
        }
    }

    return {
        startTs:startTs,
        endTs:endTs,
        startParts:startParts,
        endParts:endParts,
        allDay:allDay,
        time:timeLabel,
        date:{
            year:firstDate.year,
            month:monthName(firstDate.month),
            monthNumber:firstDate.month,
            day:firstDate.day,
            weekday:weekdayNameFromYmd(firstDate.year,firstDate.month,firstDate.day),
            label:weekdayNameFromYmd(firstDate.year,firstDate.month,firstDate.day)+", "+monthName(firstDate.month)+" "+firstDate.day+", "+firstDate.year
        }
    };
}

function parseYesNo(text,label){
    var expression=new RegExp(label+"\\s*:\\s*(yes|no|on|off|true|false)","i");
    var match=cleanText(text).match(expression);
    if(!match){
        return null;
    }
    return /yes|on|true/i.test(match[1]);
}

function parseLabeledValue(text,label){
    var expression=new RegExp(label+"\\s*:\\s*(.*?)(?=(?:Homepage|Upcoming|Featured|Location)\\s*:|$)","i");
    var match=cleanText(text).match(expression);
    return match?oneLine(match[1]):"";
}

function parsePlacement(text){
    var value=normalized(text);
    var placement={
        homepage:false,
        upcoming:false,
        featured:false,
        recognized:false
    };
    var explicit;

    if(/\bmajor event\b/.test(value)){
        placement.homepage=true;
        placement.upcoming=true;
        placement.featured=true;
        placement.recognized=true;
    } else if(/\bregular event\b/.test(value)||/\bupcoming only\b/.test(value)){
        placement.upcoming=true;
        placement.recognized=true;
    } else if(/\bhomepage only\b/.test(value)){
        placement.homepage=true;
        placement.recognized=true;
    } else if(/\bstandalone\b/.test(value)){
        placement.recognized=true;
    }

    explicit=parseYesNo(text,"Homepage");
    if(explicit!==null){
        placement.homepage=explicit;
        placement.recognized=true;
    }

    explicit=parseYesNo(text,"Upcoming");
    if(explicit!==null){
        placement.upcoming=explicit;
        placement.recognized=true;
    }

    explicit=parseYesNo(text,"Featured");
    if(explicit!==null){
        placement.featured=explicit;
        placement.recognized=true;
    }

    /*
     * A featured event always belongs at the top of both
     * the Upcoming page and the homepage, even if one of
     * those two lines was accidentally set to No.
     */
    if(placement.featured){
        placement.homepage=true;
        placement.upcoming=true;
    }

    return placement;
}

function closestBySelector(node,selector){
    while(node&&node.nodeType===1){
        if(node.matches&&node.matches(selector)){
            return node;
        }
        node=node.parentNode;
    }
    return null;
}

function isNavigationAnchor(anchor){
    return !!closestBySelector(
        anchor,
        "#header,.site-nav-wrapper,#co_menu_container,#co_menu_container_wrapper,footer,.footer,.site-footer,.breadcrumbs,.breadcrumb,.mobile-menu-bottom-links,.custom-mobile-menu-links"
    );
}

function meaningfulTitle(anchor){
    var text=oneLine(anchor.innerText||anchor.textContent||"");
    if(!text||/^(read more|more|view|view event|details|learn more)$/i.test(text)){
        return "";
    }
    return text;
}

function findEventContainer(anchor){
    var node=anchor;
    var depth=0;
    var text;
    var placement;
    var dateInfo;
    var anchors;

    while(node&&depth<10){
        node=node.parentNode;
        depth++;
        if(!node||node.nodeType!==1||/^(BODY|HTML)$/i.test(node.tagName||"")){
            break;
        }
        if(closestBySelector(node,"#header,.site-nav-wrapper,#co_menu_container,footer,.footer,.site-footer,.breadcrumbs,.breadcrumb")){
            return null;
        }
        text=readableNodeText(node);
        if(text.length>3000){
            continue;
        }
        placement=parsePlacement(text);
        dateInfo=parseEventDateTime(text);
        anchors=qsa('a[href*="/templates/articlecco_cdo/aid/"]',node);
        if(placement.recognized&&dateInfo&&anchors.length<=10){
            return node;
        }
    }
    return null;
}

function parseIndexEvents(doc,keepContainers){
    var anchors=qsa('a[href*="/templates/articlecco_cdo/aid/"]',doc);
    var events=[];
    var seen={};
    var index;

    for(index=0;index<anchors.length;index++){
        var anchor=anchors[index];
        var title;
        var href;
        var path;
        var container;
        var text;
        var placement;
        var dateInfo;
        var location;
        var eventItem;

        if(isNavigationAnchor(anchor)){
            continue;
        }

        title=meaningfulTitle(anchor);
        href=absoluteUrl(anchor.getAttribute("href")||"");
        path=canonicalPath(href);

        if(!title||!href||seen[path]){
            continue;
        }
        if(path.indexOf("/aid/"+CFG.parentAid+"/")>-1||/past-events\.htm$/i.test(path)){
            continue;
        }

        container=findEventContainer(anchor);
        if(!container){
            continue;
        }

        text=readableNodeText(container);
        placement=parsePlacement(text);
        dateInfo=parseEventDateTime(text);

        if(!placement.recognized||!dateInfo){
            continue;
        }

        location=parseLabeledValue(text,"Location")||CFG.defaultLocation;

        eventItem={
            id:"page-"+slug(title)+"-"+dateInfo.startTs,
            title:title,
            url:href,
            startTs:dateInfo.startTs,
            endTs:dateInfo.endTs,
            startParts:dateInfo.startParts,
            endParts:dateInfo.endParts,
            allDay:dateInfo.allDay,
            time:dateInfo.time,
            date:dateInfo.date,
            location:{
                text:location,
                name:location.split(",")[0]||location
            },
            homepage:placement.homepage,
            upcoming:placement.upcoming,
            featured:placement.featured,
            recurring:false,
            sourceType:"page",
            sourceContainer:keepContainers?container:null
        };

        seen[path]=true;
        events.push(eventItem);
    }

    events.sort(function(first,second){
        return first.startTs-second.startTs;
    });

    return events;
}

function getNewYorkNowParts(){
    var now=new Date();
    var parts;
    var output={};
    var index;

    try{
        parts=new Intl.DateTimeFormat("en-US",{
            timeZone:"America/New_York",
            year:"numeric",
            month:"numeric",
            day:"numeric",
            hour:"numeric",
            minute:"numeric",
            hour12:false
        }).formatToParts(now);

        for(index=0;index<parts.length;index++){
            if(parts[index].type!=="literal"){
                output[parts[index].type]=parseInt(parts[index].value,10);
            }
        }

        return {
            year:output.year,
            month:output.month,
            day:output.day,
            hour:output.hour===24?0:output.hour,
            minute:output.minute||0
        };
    } catch(error){
        return {
            year:now.getFullYear(),
            month:now.getMonth()+1,
            day:now.getDate(),
            hour:now.getHours(),
            minute:now.getMinutes()
        };
    }
}

function calendarFeedRequestUrl(){
    var cacheWindow=Math.floor(Date.now()/300000);

    return CFG.lox.calendarFeedUrl+
        (CFG.lox.calendarFeedUrl.indexOf("?")>-1?"&":"?")+
        "cfle_lox_calendar="+
        cacheWindow;
}

function calendarFeedTime(item){
    var nodes=qsa(
        ".event_options.list_info div",
        item
    );
    var index;
    var text;

    for(index=nodes.length-1;index>=0;index--){
        text=oneLine(
            nodes[index].textContent||
            nodes[index].innerText||
            ""
        );

        if(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/i.test(text)){
            return text;
        }
    }

    return oneLine(
        item.getAttribute("title")||
        ""
    );
}

function parseCalendarLoxHtml(html){
    var parser=new DOMParser();
    var doc=parser.parseFromString(html,"text/html");
    var collections=qsa(
        ".category_collection.list_item",
        doc
    );
    var matches=[];

    /*
     * ChabadOne places the Gregorian date in the surrounding
     * category_collection, while each individual event lives
     * inside its own category_item.  Read the date from the
     * complete collection text instead of depending on one
     * fragile date-element selector.
     */
    collections.forEach(function(collection){
        var collectionText=oneLine(
            collection.textContent||
            collection.innerText||
            ""
        );
        var dateNode=qs(
            ".date_stamp .date",
            collection
        );
        var datePart=parseDatePart(
            dateNode?
                (dateNode.textContent||dateNode.innerText||""):
                collectionText
        );
        var items;

        if(!datePart){
            datePart=parseDatePart(collectionText);
        }

        if(!datePart){
            return;
        }

        items=qsa(
            ".category_item",
            collection
        );

        items.forEach(function(item){
            var titleNode=
                qs(".event_wrapper .event_name",item)||
                qs(".event_name",item);
            var titleText=oneLine(
                titleNode?
                    (titleNode.textContent||titleNode.innerText||""):
                    ""
            );
            var timeText=calendarFeedTime(item);
            var dateInfo;
            var locationLink;
            var locationText;
            var dateSource;

            if(normalized(titleText)!==normalized(CFG.lox.title)){
                return;
            }

            dateSource=
                monthName(datePart.month)+
                " "+
                datePart.day+
                " "+
                datePart.year+
                (timeText?", "+timeText:"");

            dateInfo=parseEventDateTime(dateSource);

            if(!dateInfo||!isUpcoming({endTs:dateInfo.endTs})){
                return;
            }

            locationLink=qs(
                '.event_info a[href*="maps.google.com"],'+
                '.event_info a[href*="google.com/maps"]',
                item
            );

            locationText=locationLink?
                oneLine(
                    locationLink.textContent||
                    locationLink.innerText||
                    ""
                ):
                CFG.defaultLocation;

            matches.push({
                id:"calendar-lox-learn-"+dateInfo.startTs,
                title:CFG.lox.title,
                url:absoluteUrl(CFG.lox.url),
                startTs:dateInfo.startTs,
                endTs:dateInfo.endTs,
                startParts:dateInfo.startParts,
                endParts:dateInfo.endParts,
                allDay:dateInfo.allDay,
                time:dateInfo.time,
                date:dateInfo.date,
                location:{
                    text:locationText||CFG.defaultLocation,
                    name:"Chabad of Fort Lee"
                },
                homepage:CFG.lox.homepage,
                upcoming:CFG.lox.upcoming,
                featured:false,
                recurring:true,
                sourceType:"calendar-lox",
                sourceContainer:null
            });
        });
    });

    matches.sort(function(first,second){
        return first.startTs-second.startTs;
    });

    return matches.length?matches[0]:null;
}

function requestCalendarLox(callback){
    var request;
    var url;
    var completed=false;

    function finish(error,eventItem){
        if(completed){
            return;
        }
        completed=true;
        callback(error,eventItem);
    }

    if(!CFG.lox.enabled){
        finish(null,null);
        return;
    }

    url=calendarFeedRequestUrl();
    request=new XMLHttpRequest();
    request.open("GET",url,true);
    request.timeout=CFG.requestTimeoutMs;
    request.onreadystatechange=function(){
        var eventItem;

        if(request.readyState!==4){
            return;
        }

        if(request.status>=200&&request.status<300){
            try{
                eventItem=parseCalendarLoxHtml(
                    request.responseText
                );
                finish(null,eventItem);
            } catch(error){
                finish(error,null);
            }
            return;
        }

        finish(
            new Error("Calendar feed request failed: "+String(request.status||"unknown")),
            null
        );
    };
    request.onerror=function(){
        finish(new Error("Calendar feed network error"),null);
    };
    request.ontimeout=function(){
        finish(new Error("Calendar feed timed out"),null);
    };
    request.send(null);
}

function addSpecialEvents(events){
    var lox=state.calendarLox;
    var loxPath=canonicalPath(CFG.lox.url);
    var output=(events||[]).filter(function(eventItem){
        return !(
            canonicalPath(eventItem.url)===loxPath||
            normalized(eventItem.title)===normalized(CFG.lox.title)
        );
    });

    /*
     * Lox & Learn is supplied only by the ChabadOne Calendar.
     * Any page-driven duplicate is removed before the nearest
     * future Calendar occurrence is added.
     */
    if(lox&&isUpcoming(lox)){
        output.push(lox);
    }

    output.sort(function(first,second){
        return first.startTs-second.startTs;
    });

    return output;
}

function serializeEvents(events){
    return (events||[]).map(function(eventItem){
        return {
            id:eventItem.id,
            title:eventItem.title,
            url:eventItem.url,
            startTs:eventItem.startTs,
            endTs:eventItem.endTs,
            startParts:eventItem.startParts,
            endParts:eventItem.endParts,
            allDay:eventItem.allDay,
            time:eventItem.time,
            date:eventItem.date,
            location:eventItem.location,
            homepage:!!eventItem.homepage,
            upcoming:!!eventItem.upcoming,
            featured:!!eventItem.featured,
            recurring:!!eventItem.recurring,
            sourceType:eventItem.sourceType||(
                normalized(eventItem.title)===normalized(CFG.lox.title)?
                "calendar-lox":
                "page"
            )
        };
    });
}

function readCache(){
    try{
        var raw=window.localStorage.getItem(CFG.cacheKey);
        var saved=raw?JSON.parse(raw):null;

        if(
            saved&&
            saved.buildId===CFG.buildId&&
            saved.events&&
            Object.prototype.toString.call(saved.events)==="[object Array]"
        ){
            return saved.events;
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
                buildId:CFG.buildId,
                time:Date.now(),
                events:serializeEvents(events)
            })
        );
    } catch(error){
    }
}

function requestSource(callback){
    var request;
    var completed=false;
    var url=CFG.sourceUrl+
        (CFG.sourceUrl.indexOf("?")>-1?"&":"?")+
        "cfle_events_clean="+
        Date.now();

    function finish(error,html){
        if(completed){
            return;
        }
        completed=true;
        callback(error,html);
    }

    request=new XMLHttpRequest();
    request.open("GET",url,true);
    request.timeout=CFG.requestTimeoutMs;
    request.onreadystatechange=function(){
        if(request.readyState!==4){
            return;
        }
        if(request.status>=200&&request.status<300){
            finish(null,request.responseText);
        } else {
            finish(
                new Error("Upcoming-page request failed: "+String(request.status||"unknown")),
                ""
            );
        }
    };
    request.onerror=function(){
        finish(new Error("Upcoming-page network error"),"");
    };
    request.ontimeout=function(){
        finish(new Error("Upcoming-page request timed out"),"");
    };
    request.send(null);
}

function parseSourceHtml(html){
    var parser=new DOMParser();
    var doc=parser.parseFromString(html,"text/html");
    return parseIndexEvents(doc,false);
}

function nowTs(){
    return Date.now();
}

function isUpcoming(eventItem){
    return eventItem.endTs>=nowTs();
}

function isPast(eventItem){
    return eventItem.endTs<nowTs();
}

function activeUpcomingEvents(){
    return state.events.filter(function(eventItem){
        return (
            eventItem.upcoming||
            eventItem.featured
        )&&isUpcoming(eventItem);
    });
}

function pastEvents(){
    return state.events.filter(function(eventItem){
        return !eventItem.recurring&&
            (eventItem.upcoming||eventItem.homepage||eventItem.featured)&&
            isPast(eventItem);
    }).sort(function(first,second){
        return second.startTs-first.startTs;
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

function compactParts(parts){
    return parts.year+pad(parts.month)+pad(parts.day)+"T"+pad(parts.hour||0)+pad(parts.minute||0)+"00";
}

function allDayCompact(parts){
    return parts.year+pad(parts.month)+pad(parts.day);
}

function googleCalendarUrl(eventItem){
    var dates;
    var endAllDay;
    if(eventItem.allDay){
        endAllDay=addDaysToParts(eventItem.endParts,1);
        dates=allDayCompact(eventItem.startParts)+"/"+allDayCompact(endAllDay);
    } else {
        dates=compactParts(eventItem.startParts)+"/"+compactParts(eventItem.endParts);
    }
    return "https://calendar.google.com/calendar/render?action=TEMPLATE"+
        "&text="+encodeURIComponent(eventItem.title)+
        "&dates="+encodeURIComponent(dates)+
        "&ctz="+encodeURIComponent("America/New_York")+
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
    var startLine;
    var endLine;
    var endAllDay;

    if(eventItem.allDay){
        endAllDay=addDaysToParts(eventItem.endParts,1);
        startLine="DTSTART;VALUE=DATE:"+allDayCompact(eventItem.startParts);
        endLine="DTEND;VALUE=DATE:"+allDayCompact(endAllDay);
    } else {
        startLine="DTSTART;TZID=America/New_York:"+compactParts(eventItem.startParts);
        endLine="DTEND;TZID=America/New_York:"+compactParts(eventItem.endParts);
    }

    return "BEGIN:VCALENDAR\r\n"+
        "VERSION:2.0\r\n"+
        "PRODID:-//Chabad of Fort Lee//Page Events//EN\r\n"+
        "CALSCALE:GREGORIAN\r\n"+
        "METHOD:PUBLISH\r\n"+
        "BEGIN:VEVENT\r\n"+
        "UID:"+escapeIcs(eventItem.id)+"@chabadfortlee.com\r\n"+
        startLine+"\r\n"+
        endLine+"\r\n"+
        "SUMMARY:"+escapeIcs(eventItem.title)+"\r\n"+
        "LOCATION:"+escapeIcs(eventItem.location.text||"")+"\r\n"+
        "DESCRIPTION:"+escapeIcs("More information: "+eventItem.url)+"\r\n"+
        "URL:"+escapeIcs(eventItem.url)+"\r\n"+
        "END:VEVENT\r\n"+
        "END:VCALENDAR\r\n";
}

function downloadIcs(eventItem){
    var blob;
    var url;
    var link;
    try{
        blob=new Blob([icsText(eventItem)],{type:"text/calendar;charset=utf-8"});
        url=window.URL.createObjectURL(blob);
        link=d.createElement("a");
        link.href=url;
        link.download=slug(eventItem.title||"event")+".ics";
        d.body.appendChild(link);
        link.click();
        d.body.removeChild(link);
        window.setTimeout(function(){
            window.URL.revokeObjectURL(url);
        },500);
    } catch(error){
        window.location.href="data:text/calendar;charset=utf-8,"+encodeURIComponent(icsText(eventItem));
    }
}

function formatClockParts(parts){
    var hour=parts.hour||0;
    var suffix=hour>=12?"PM":"AM";
    var display=hour%12;
    if(display===0){
        display=12;
    }
    return display+":"+pad(parts.minute||0)+" "+suffix;
}

function homeDateLabel(eventItem){
    var output=eventItem.date.weekday+", "+eventItem.date.month+" "+eventItem.date.day;
    if(eventItem.time){
        output+=" • "+eventItem.time;
    }
    return output;
}

function clockIcon(){
    return '<svg class="cfle-meta-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+
        '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="2"></circle>'+
        '<path d="M12 7.4v5.1l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>'+
        '</svg>';
}

function locationIcon(){
    return '<svg class="cfle-meta-svg cfle-pin-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+
        '<path d="M12 2.8a7 7 0 0 0-7 7c0 5.15 7 11.4 7 11.4s7-6.25 7-11.4a7 7 0 0 0-7-7z" fill="currentColor"></path>'+
        '<circle cx="12" cy="9.8" r="2.45" fill="#fff"></circle>'+
        '</svg>';
}

function googleIcon(){
    return '<svg class="cfle-calendar-logo cfle-google-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+
        '<path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.77H12v3.4h5.52c-.11.84-.71 2.11-2.04 2.96l-.02.11 2.96 2.29.2.02c1.84-1.69 2.98-4.18 2.98-7.01z"></path>'+
        '<path fill="#34A853" d="M12 22c2.69 0 4.95-.89 6.6-2.43l-3.14-2.42c-.84.56-1.96.96-3.46.96-2.63 0-4.87-1.78-5.67-4.24l-.1.01-3.08 2.38-.04.1A9.98 9.98 0 0 0 12 22z"></path>'+
        '<path fill="#FBBC05" d="M6.33 13.87A6 6 0 0 1 6 12c0-.65.11-1.28.32-1.87l-.01-.13-3.12-2.42-.1.05A10 10 0 0 0 2 12c0 1.57.36 3.05 1.1 4.37l3.23-2.5z"></path>'+
        '<path fill="#EA4335" d="M12 5.89c1.88 0 3.15.81 3.88 1.49l2.79-2.72C16.96 3.07 14.69 2 12 2a9.98 9.98 0 0 0-8.9 5.63l3.22 2.5C7.13 7.67 9.37 5.89 12 5.89z"></path>'+
        '</svg>';
}

function appleIcon(){
    return '<svg class="cfle-calendar-logo cfle-apple-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+
        '<path fill="currentColor" d="M17.05 12.54c-.03-2.67 2.18-3.95 2.28-4.01-1.25-1.83-3.2-2.08-3.89-2.1-1.64-.17-3.23.98-4.07.98-.86 0-2.15-.96-3.55-.93-1.8.03-3.49 1.07-4.42 2.68-1.89 3.28-.48 8.1 1.33 10.75.91 1.3 1.96 2.76 3.36 2.71 1.37-.06 1.88-.87 3.54-.87 1.64 0 2.12.87 3.55.84 1.47-.02 2.4-1.31 3.28-2.62 1.05-1.49 1.47-2.95 1.49-3.03-.04-.01-2.87-1.09-2.9-4.4z"></path>'+
        '<path fill="currentColor" d="M14.37 4.69c.74-.93 1.25-2.2 1.11-3.47-1.08.05-2.43.75-3.2 1.66-.68.8-1.29 2.12-1.13 3.34 1.22.09 2.45-.61 3.22-1.53z"></path>'+
        '</svg>';
}

function calendarIcon(){
    return '<svg class="cfle-calendar-logo cfle-generic-calendar-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+
        '<rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"></rect>'+
        '<path d="M7.5 3v4M16.5 3v4M3.5 9h17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'+
        '<path d="M8 13h3v3H8zM13 13h3v3h-3z" fill="currentColor"></path>'+
        '</svg>';
}

function featuredTag(){
    return '<span class="cfle-tag cfle-tag--featured">Featured</span>';
}

function renderMeta(eventItem){
    var parts=[];
    if(eventItem.time){
        parts.push('<span class="cfle-meta-item">'+clockIcon()+'<span>'+escapeHtml(eventItem.time)+'</span></span>');
    }
    if(eventItem.location&&eventItem.location.text){
        parts.push('<a class="cfle-meta-item cfle-location" href="'+escapeHtml(mapsUrl(eventItem.location))+'" target="_blank" rel="noopener">'+
            locationIcon()+'<span>'+escapeHtml(eventItem.location.name||eventItem.location.text)+'</span></a>');
    }
    return '<div class="cfle-meta">'+parts.join('<span class="cfle-meta-divider" aria-hidden="true">|</span>')+'</div>';
}

function calendarButtonsHtml(eventItem){
    var google='<a class="cfle-action cfle-calendar-action" href="'+escapeHtml(googleCalendarUrl(eventItem))+'" target="_blank" rel="noopener">'+googleIcon()+'<span>Add to Calendar</span></a>';
    var other='<button class="cfle-action cfle-calendar-action cfle-ics-action" type="button" data-event-id="'+escapeHtml(eventItem.id)+'">'+calendarIcon()+'<span>Other Calendar</span></button>';
    var apple='<button class="cfle-action cfle-calendar-action cfle-ics-action" type="button" data-event-id="'+escapeHtml(eventItem.id)+'">'+appleIcon()+'<span>Add to Calendar</span></button>';

    if(isAppleDevice()){
        return apple+google;
    }
    return google+other;
}

function cardHtml(eventItem,featured,past){
    var date=eventItem.date||{};
    var actions;
    var className="cfle-card"+(featured?" cfle-card--featured":"");

    if(past){
        actions='<div class="cfle-event-actions cfle-event-actions--past">'+
            '<a class="cfle-action cfle-view-action" href="'+escapeHtml(eventItem.url)+'">View Event</a>'+
            '</div>';
    } else {
        actions='<div class="cfle-event-actions">'+
            calendarButtonsHtml(eventItem)+
            '<a class="cfle-action cfle-view-action" href="'+escapeHtml(eventItem.url)+'">View Details</a>'+
            '</div>';
    }

    return '<article class="'+className+'">'+
        '<div class="cfle-date">'+
            '<span class="cfle-date-month">'+escapeHtml((date.month||"").slice(0,3))+'</span>'+
            '<span class="cfle-date-day">'+escapeHtml(date.day||"")+'</span>'+
            '<span class="cfle-date-weekday">'+escapeHtml((date.weekday||"").slice(0,3))+'</span>'+
        '</div>'+
        '<div class="cfle-card-body">'+
            '<h3 class="cfle-event-title"><a href="'+escapeHtml(eventItem.url)+'">'+escapeHtml(eventItem.title)+'</a></h3>'+
            (featured?'<div class="cfle-tags">'+featuredTag()+'</div>':'')+
            renderMeta(eventItem)+
        '</div>'+
        actions+
    '</article>';
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

function bindCalendarButtons(root){
    qsa(".cfle-ics-action",root||d).forEach(function(button){
        if(button.getAttribute("data-cfle-bound")==="1"){
            return;
        }
        button.setAttribute("data-cfle-bound","1");
        button.addEventListener("click",function(){
            var eventItem=findEventById(button.getAttribute("data-event-id"));
            if(eventItem){
                downloadIcs(eventItem);
            }
        });
    });
}

function eventMatchesRange(eventItem){
    var nowParts=getNewYorkNowParts();
    var currentKey=dateKey(nowParts);
    var eventKey=dateKey(eventItem.startParts);
    var todayDate;
    var startOfWeek;
    var endOfWeek;

    if(state.range==="all"){
        return true;
    }
    if(state.range==="thismonth"){
        return eventItem.startParts.year===nowParts.year&&eventItem.startParts.month===nowParts.month;
    }
    if(state.range==="thisweek"){
        todayDate=new Date(Date.UTC(nowParts.year,nowParts.month-1,nowParts.day));
        startOfWeek=addDaysToParts(nowParts,-todayDate.getUTCDay());
        endOfWeek=addDaysToParts(startOfWeek,6);
        return eventKey>=dateKey(startOfWeek)&&eventKey<=dateKey(endOfWeek)&&eventKey>=currentKey;
    }
    return true;
}

function filteredUpcomingEvents(){
    var search=normalized(state.search);
    return activeUpcomingEvents().filter(function(eventItem){
        var haystack=normalized(eventItem.title+" "+(eventItem.location?eventItem.location.text:""));
        return (!search||haystack.indexOf(search)>-1)&&eventMatchesRange(eventItem);
    });
}

function renderUpcoming(){
    var root=qs("#cfle-events");
    var featuredSection;
    var mainSection;
    var count;
    var events;
    var featured=[];
    var regular=[];

    if(!root){
        return;
    }

    featuredSection=qs("#cfle-featured-section",root);
    mainSection=qs("#cfle-main-section",root);
    count=qs("#cfle-count",root);
    events=filteredUpcomingEvents();

    events.forEach(function(eventItem){
        if(eventItem.featured){
            featured.push(eventItem);
        } else {
            regular.push(eventItem);
        }
    });

    if(count){
        count.innerHTML='<strong>'+events.length+'</strong> '+(events.length===1?'program':'programs');
    }

    if(featuredSection){
        featuredSection.innerHTML=featured.length?
            '<h2 class="cfle-section-title">Featured</h2><div class="cfle-grid cfle-grid--featured">'+
            featured.map(function(eventItem){ return cardHtml(eventItem,true,false); }).join("")+
            '</div>':"";
    }

    if(mainSection){
        if(regular.length){
            mainSection.innerHTML='<div class="cfle-grid">'+
    regular.map(function(eventItem){ return cardHtml(eventItem,false,false); }).join("")+
    '</div>';
        } else if(!featured.length){
            mainSection.innerHTML=state.initialLoadPending?
                '<div class="cfle-empty"><strong>Loading upcoming programs&hellip;</strong><span>Please wait a moment.</span></div>':
                '<div class="cfle-empty"><strong>No matching programs are currently listed.</strong><span>Please check back soon.</span></div>';
        } else {
            mainSection.innerHTML="";
        }
    }

    bindCalendarButtons(root);
    scheduleEventTitleFit(root);
}

function bindUpcomingUi(){
    var root=qs("#cfle-events");
    var search;
    var toggle;
    var panel;

    if(!root||state.bound){
        return;
    }
    state.bound=true;

    search=qs("#cfle-search",root);
    toggle=qs("#cfle-filter-toggle",root);
    panel=qs("#cfle-date-panel",root);

    if(search){
        search.addEventListener("input",function(){
            state.search=search.value||"";
            renderUpcoming();
        });
    }

    if(toggle&&panel){
        toggle.addEventListener("click",function(){
            var open=panel.className.indexOf(" open")>-1;
            panel.className=open?panel.className.replace(/\s*open/g,""):panel.className+" open";
            toggle.setAttribute("aria-expanded",open?"false":"true");
        });
    }

    qsa(".cfle-chip-btn[data-range]",root).forEach(function(button){
        button.addEventListener("click",function(){
            qsa(".cfle-chip-btn[data-range]",root).forEach(function(other){
                other.className=other.className.replace(/\s*active/g,"");
            });
            button.className+=" active";
            state.range=button.getAttribute("data-range")||"all";
            renderUpcoming();
        });
    });
}

function findPendingHomepageMarkerWidget(){
    var widgets=qsa(".chabad_updates");
    var index;
    var text;
    for(index=0;index<widgets.length;index++){
        text=oneLine(widgets[index].innerText||widgets[index].textContent||"");
        if(text.indexOf("CFLE_PAGE_EVENTS")>-1){
            return widgets[index];
        }
    }
    return null;
}

function findHomepageMarkerWidget(){
    return qs(".chabad_updates.cfle-home-events-widget")||findPendingHomepageMarkerWidget();
}

function renderHomepage(){
    var widget=findHomepageMarkerWidget();
    var events;
    var rows;

    if(!widget){
        return;
    }

    events=state.events.filter(function(eventItem){
        return (
            eventItem.homepage||
            eventItem.featured
        )&&isUpcoming(eventItem);
    }).sort(function(first,second){
        if(!!first.featured!==!!second.featured){
            return first.featured?-1:1;
        }
        return first.startTs-second.startTs;
    }).slice(0,CFG.homepageLimit);

    rows=events.map(function(eventItem){

    var date=eventItem.date||{};

    return '<a class="cfle-home-event" href="'+escapeHtml(eventItem.url)+'">'+

        '<span class="cfle-home-date-box">'+
            '<span class="cfle-home-date-month">'+
                escapeHtml(
                    (date.month||"").slice(0,3)
                )+
            '</span>'+
            '<span class="cfle-home-date-day">'+
                escapeHtml(date.day||"")+
            '</span>'+
            '<span class="cfle-home-date-weekday">'+
                escapeHtml(
                    (date.weekday||"").slice(0,3)
                )+
            '</span>'+
        '</span>'+

        '<span class="cfle-home-event-content">'+
            '<strong class="cfle-home-event-title">'+
                escapeHtml(eventItem.title)+
            '</strong>'+
            (
                eventItem.time?
                '<span class="cfle-home-event-time">'+
                    clockIcon()+
                    '<span>'+
                        escapeHtml(eventItem.time)+
                    '</span>'+
                '</span>':
                ''
            )+
        '</span>'+

        '<span class="cfle-home-event-arrow" aria-hidden="true">'+
            '&#8594;'+
        '</span>'+

    '</a>';

}).join("");

    if(widget.className.indexOf("cfle-home-events-widget")===-1){
        widget.className+=" cfle-home-events-widget";
    }
    widget.className=widget.className.replace(/\s*cfle-home-events-pending/g,"");
    widget.innerHTML='<div class="cfle-home-events-shell">'+
        '<h2 class="cfle-home-events-heading">Upcoming at Chabad</h2>'+
        '<div class="cfle-home-events-list">'+
            (rows||(
                state.initialLoadPending?
                '<div class="cfle-home-events-empty">Loading upcoming programs&hellip;</div>':
                '<div class="cfle-home-events-empty">New programs will be posted soon.</div>'
            ))+
        '</div>'+
        '<a class="cfle-home-events-more" href="'+escapeHtml(CFG.upcomingUrl)+'">View More</a>'+
    '</div>';
    widget.style.visibility="visible";
    scheduleEventTitleFit(widget);
}

function startHomepageWatcher(){
    var attempts=0;
    var timer;
    var observer;

    if(state.homeWatcherStarted){
        return;
    }
    state.homeWatcherStarted=true;

    renderHomepage();

    timer=window.setInterval(function(){
        attempts++;
        if(findPendingHomepageMarkerWidget()){
            renderHomepage();
            window.clearInterval(timer);
            return;
        }
        if(attempts>=30){
            window.clearInterval(timer);
        }
    },300);

    if(window.MutationObserver&&d.body){
        observer=new MutationObserver(function(){
            if(findPendingHomepageMarkerWidget()){
                renderHomepage();
            }
        });
        observer.observe(d.body,{childList:true,subtree:true});
    }
}

function renderPast(){
    var root=qs("#cfle-past-events");
    var events;

    if(!root){
        return;
    }

    events=pastEvents();
    root.innerHTML=events.length?
        '<div class="cfle-past-intro">Recently concluded programs</div><div class="cfle-grid cfle-grid--past">'+
        events.map(function(eventItem){ return cardHtml(eventItem,false,true); }).join("")+
        '</div>':
        '<div class="cfle-empty"><strong>No new archived events yet.</strong><span>Your existing historical gallery remains below.</span></div>';
}

function hideNativeSourceContainers(events){
    (events||[]).forEach(function(eventItem){
        if(eventItem.sourceContainer&&eventItem.sourceContainer.className.indexOf("cfle-native-event-source")===-1){
            eventItem.sourceContainer.className+=" cfle-native-event-source";
        }
    });
}

function renderAll(){
    bindUpcomingUi();
    renderUpcoming();
    renderHomepage();
    startHomepageWatcher();
    renderPast();
}

function splitCachedEvents(events){
    state.pageEvents=[];
    state.calendarLox=null;

    (events||[]).forEach(function(eventItem){
        if(
            eventItem.sourceType==="calendar-lox"||
            normalized(eventItem.title)===normalized(CFG.lox.title)||
            canonicalPath(eventItem.url)===canonicalPath(CFG.lox.url)
        ){
            if(!state.calendarLox||eventItem.startTs<state.calendarLox.startTs){
                state.calendarLox=eventItem;
            }
        } else {
            state.pageEvents.push(eventItem);
        }
    });
}

function refreshCombinedEvents(writeToStorage){
    state.events=addSpecialEvents(state.pageEvents);
    state.initialLoadPending=!(state.pageDone&&state.calendarDone);
    renderAll();

    if(writeToStorage){
        writeCache(state.events);
    }
}

function loadEvents(){
    var cached=readCache();
    var currentEvents=[];

    splitCachedEvents(cached);

    if(qs("#cfle-events")){
        currentEvents=parseIndexEvents(d,true);
        if(currentEvents.length){
            hideNativeSourceContainers(currentEvents);
            state.pageEvents=currentEvents;
        }
    }

    /*
     * Paint immediately from the last known combined result.
     * With no cache, paint the normal in-layout loading state.
     */
    refreshCombinedEvents(false);

    /*
     * Both independent sources start at once.  Whichever returns
     * first can update the page immediately; neither waits for the
     * other.  The hard timeout prevents an endless blank/loading state.
     */
    requestCalendarLox(function(error,eventItem){
        state.calendarDone=true;
        state.calendarSuccess=!error;

        if(!error){
            state.calendarLox=eventItem||null;
        }

        refreshCombinedEvents(
            state.calendarSuccess||state.pageSuccess
        );
    });

    requestSource(function(error,html){
        var fresh;

        state.pageDone=true;
        state.pageSuccess=!error;

        if(!error&&html){
            try{
                fresh=parseSourceHtml(html);
                state.pageEvents=fresh;
            } catch(parseError){
                state.pageSuccess=false;
            }
        }

        refreshCombinedEvents(
            state.calendarSuccess||state.pageSuccess
        );
    });
}

function start(){
    if(!window.CFLE_EVENT_TITLE_RESIZE_BOUND){
        window.CFLE_EVENT_TITLE_RESIZE_BOUND=true;

        var titleResizeTimer;

        window.addEventListener(
            "resize",
            function(){
                window.clearTimeout(titleResizeTimer);
                titleResizeTimer=window.setTimeout(
                    function(){
                        scheduleEventTitleFit(document);
                    },
                    120
                );
            }
        );
    }

    loadEvents();
}

if(d.readyState==="loading"){
    d.addEventListener("DOMContentLoaded",start);
} else {
    start();
}

})();
