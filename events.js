(function(){

var d=document;
var head=d.getElementsByTagName("head")[0]||d.documentElement;
var cur=d.currentScript||
    d.getElementsByTagName("script")[
        d.getElementsByTagName("script").length-1
    ];
var src=cur&&cur.src?cur.src:"";
var base=src.substring(0,src.lastIndexOf("/")+1);
var css=d.getElementById("cfle-events-css");

if(base&&!css){

    css=d.createElement("link");
    css.id="cfle-events-css";
    css.rel="stylesheet";
    css.type="text/css";
    css.href=base+"events.css?v=4";

    head.appendChild(css);
}

var CFG={
    feedUrl:"/templates/events.htm",
    cacheKey:"cfleEventsV4",
    cacheMs:600000
};

var state={
    events:[],
    active:"all",
    search:"",
    range:"all",
    cadence:"all"
};

function qs(selector,parent){

    return (parent||d).querySelector(
        selector
    );
}

function qsa(selector,parent){

    return [].slice.call(
        (parent||d).querySelectorAll(
            selector
        )
    );
}

function txt(value){

    return String(value||"")
        .replace(/\u00a0/g," ")
        .replace(/\s+/g," ")
        .replace(/^\s+|\s+$/g,"");
}

function esc(value){

    return String(value||"")
        .replace(/[&<>"]/g,function(character){

            return {
                "&":"&amp;",
                "<":"&lt;",
                ">":"&gt;",
                "\"":"&quot;"
            }[character];

        });
}

function abs(url){

    var link;

    if(!url){
        return "";
    }

    link=d.createElement("a");
    link.href=url;

    return link.href;
}

function slug(value){

    return txt(value).toLowerCase();
}

function isApple(){

    return /iPhone|iPad|iPod|Macintosh/i.test(
        navigator.userAgent||""
    );
}

function pad(number){

    number=parseInt(number,10);

    return number<10?
        "0"+number:
        String(number);
}

function monthNum(name){

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

    return months[
        String(name||"").toLowerCase()
    ]||0;
}

function parseClock(value){

    var match=
        txt(value).match(
            /(\d{1,2}):(\d{2})\s*(am|pm)/i
        );

    var hour;

    if(!match){
        return null;
    }

    hour=parseInt(match[1],10);

    if(
        match[3].toLowerCase()==="pm"&&
        hour!==12
    ){
        hour+=12;
    }

    if(
        match[3].toLowerCase()==="am"&&
        hour===12
    ){
        hour=0;
    }

    return {
        h:hour,
        m:parseInt(match[2],10)
    };
}

function parseDateLabel(value){

    var match=
        txt(value).match(
            /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Shabbat)\s*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*,?\s*(\d{4})/i
        );

    if(!match){
        return null;
    }

    return {
        weekday:match[1],
        month:match[2],
        day:parseInt(match[3],10),
        year:parseInt(match[4],10),
        label:
            match[1]+
            ", "+
            match[2]+
            " "+
            match[3]+
            ", "+
            match[4]
    };
}

function getEventDateObj(eventItem){

    var time;
    var monthIndex;

    if(!eventItem.date){
        return null;
    }

    time=
        parseClock(eventItem.time)||
        {
            h:12,
            m:0
        };

    monthIndex=
        monthNum(
            eventItem.date.month
        )-1;

    return new Date(
        eventItem.date.year,
        monthIndex,
        eventItem.date.day,
        time.h,
        time.m,
        0,
        0
    );
}

function rangeMatch(eventItem){

    var now=new Date();
    var eventDate=
        getEventDateObj(eventItem);

    var start;
    var end;

    if(!eventDate){
        return true;
    }

    if(state.range==="thisweek"){

        start=new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        end=new Date(
            start.getTime()
        );

        end.setDate(
            start.getDate()+
            (6-start.getDay()+7)%7+
            1
        );

        end.setHours(
            0,
            0,
            0,
            0
        );

        return (
            eventDate>=start&&
            eventDate<end
        );
    }

    if(state.range==="thismonth"){

        start=new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        end=new Date(
            now.getFullYear(),
            now.getMonth()+1,
            1
        );

        return (
            eventDate>=start&&
            eventDate<end
        );
    }

    return true;
}

function cadenceMatch(eventItem){

    if(state.cadence==="recurring"){
        return !!eventItem.recurring;
    }

    if(state.cadence==="onetime"){
        return !eventItem.recurring;
    }

    return true;
}

function mapUrl(location){

    var query=
        encodeURIComponent(
            (
                location.name?
                location.name+" ":
                ""
            )+
            (
                location.address||
                location.text||
                ""
            )
        );

    if(
        /Android/i.test(
            navigator.userAgent||""
        )
    ){
        return "geo:0,0?q="+query;
    }

    if(isApple()){
        return "https://maps.apple.com/?q="+query;
    }

    return (
        "https://www.google.com/maps/search/"+
        "?api=1&query="+
        query
    );
}

function googleCalUrl(eventItem){

    var start=
        getEventDateObj(eventItem);

    var end;
    var description="";

    if(!start){
        return "#";
    }

    end=new Date(
        start.getTime()+
        60*60*1000
    );

    if(eventItem.detailsUrl){

        description=
            "More information: "+
            eventItem.detailsUrl;
    }

    function stamp(dateValue){

        return (
            dateValue.getFullYear()+
            pad(dateValue.getMonth()+1)+
            pad(dateValue.getDate())+
            "T"+
            pad(dateValue.getHours())+
            pad(dateValue.getMinutes())+
            "00"
        );
    }

    return (
        "https://calendar.google.com/"+
        "calendar/render?action=TEMPLATE"+
        "&text="+
        encodeURIComponent(
            eventItem.title
        )+
        "&dates="+
        encodeURIComponent(
            stamp(start)+
            "/"+
            stamp(end)
        )+
        "&location="+
        encodeURIComponent(
            eventItem.location.text||""
        )+
        "&details="+
        encodeURIComponent(
            description
        )
    );
}

function icsText(eventItem){

    var start=
        getEventDateObj(eventItem);

    var end;
    var description="";

    if(!start){
        return "";
    }

    end=new Date(
        start.getTime()+
        60*60*1000
    );

    if(eventItem.detailsUrl){

        description=
            "More information: "+
            eventItem.detailsUrl;
    }

    function stamp(dateValue){

        return (
            dateValue.getFullYear()+
            pad(dateValue.getMonth()+1)+
            pad(dateValue.getDate())+
            "T"+
            pad(dateValue.getHours())+
            pad(dateValue.getMinutes())+
            "00"
        );
    }

    function safe(value){

        return String(value||"")
            .replace(/\\/g,"\\\\")
            .replace(/\r?\n/g,"\\n")
            .replace(/,/g,"\\,")
            .replace(/;/g,"\\;");
    }

    return (
        "BEGIN:VCALENDAR\r\n"+
        "VERSION:2.0\r\n"+
        "PRODID:-//Chabad of Fort Lee//"+
        "Upcoming at Chabad//EN\r\n"+
        "BEGIN:VEVENT\r\n"+
        "UID:"+
        Date.now()+
        "-"+
        Math.random().toString(36).slice(2)+
        "@chabadfortlee.com\r\n"+
        "DTSTART:"+
        stamp(start)+
        "\r\n"+
        "DTEND:"+
        stamp(end)+
        "\r\n"+
        "SUMMARY:"+
        safe(eventItem.title)+
        "\r\n"+
        "LOCATION:"+
        safe(
            eventItem.location.text||""
        )+
        "\r\n"+
        "DESCRIPTION:"+
        safe(description)+
        "\r\n"+
        "END:VEVENT\r\n"+
        "END:VCALENDAR"
    );
}

function downloadICS(eventItem){

    var content=
        icsText(eventItem);

    var blob;
    var url;
    var link;

    if(!content){
        return;
    }

    blob=new Blob(
        [content],
        {
            type:
                "text/calendar;charset=utf-8"
        }
    );

    url=URL.createObjectURL(
        blob
    );

    link=d.createElement("a");
    link.href=url;

    link.download=
        (
            eventItem.title||
            "event"
        )
        .replace(
            /[^a-z0-9]+/gi,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        )
        .toLowerCase()+
        ".ics";

    d.body.appendChild(link);
    link.click();
    d.body.removeChild(link);

    window.setTimeout(function(){

        URL.revokeObjectURL(
            url
        );

    },1500);
}

function getCache(){

    try{

        var raw=
            sessionStorage.getItem(
                CFG.cacheKey
            );

        var stored=
            raw?
            JSON.parse(raw):
            null;

        if(
            stored&&
            Date.now()-stored.time<
            CFG.cacheMs
        ){
            return stored.html;
        }

    }catch(error){}

    return "";
}

function setCache(html){

    try{

        sessionStorage.setItem(
            CFG.cacheKey,
            JSON.stringify({
                time:Date.now(),
                html:html
            })
        );

    }catch(error){}
}

function extractMarkers(title){

    var markers=[];

    var clean=
        String(title||"")
        .replace(
            /\[([^\]]+)\]/g,
            function(full,marker){

                markers.push(
                    txt(marker)
                );

                return "";
            }
        );

    return {
        markers:markers,
        clean:txt(clean)
    };
}

function parseLocation(item){

    var link=
        qs(
            '.event_info a[href*="maps.google.com"],'+
            '.event_info a[href*="google.com/maps"]',
            item
        );

    var clone;
    var breaks;
    var parts;
    var textValue;

    if(!link){

        return {
            text:"",
            name:"",
            address:"",
            url:""
        };
    }

    clone=
        link.cloneNode(true);

    breaks=
        clone.getElementsByTagName(
            "br"
        );

    while(breaks.length){

        breaks[0].parentNode
            .replaceChild(
                d.createTextNode(" | "),
                breaks[0]
            );
    }

    textValue=
        txt(
            clone.textContent||
            clone.innerText
        );

    parts=
        textValue.split("|");

    return {
        text:
            textValue.replace(
                /\s*\|\s*/g,
                " — "
            ),
        name:
            txt(parts[0]),
        address:
            txt(
                parts.slice(1).join(" ")
            ),
        url:
            abs(
                link.getAttribute(
                    "href"
                )
            )
    };
}

function parseDescription(item){

    var infoBlocks=
        qsa(
            ".event_wrapper > .event_info",
            item
        );

    var index;
    var value;

    for(
        index=0;
        index<infoBlocks.length;
        index++
    ){

        value=
            txt(
                infoBlocks[index]
                    .textContent||
                infoBlocks[index]
                    .innerText
            );

        if(value){
            return value;
        }
    }

    return "";
}

function parseEvent(item){

    var parent=
        item.parentNode;

    var dateNode=
        qs(
            ".date_stamp .date",
            parent
        );

    var date=
        parseDateLabel(
            dateNode?
            dateNode.textContent:
            ""
        );

    var timeNode="";
    var titleNode;
    var rawTitle;
    var titleBits;
    var details;

    var optionDivs=
        qsa(
            ".event_options.list_info div",
            item
        );

    var index;
    var optionText;

    for(
        index=optionDivs.length-1;
        index>=0;
        index--
    ){

        optionText=
            txt(
                optionDivs[index]
                    .textContent||
                optionDivs[index]
                    .innerText
            );

        if(
            /\d{1,2}:\d{2}\s*(am|pm)/i
                .test(optionText)
        ){
            timeNode=optionText;
            break;
        }
    }

    titleNode=
        qs(
            ".event_wrapper .event_name",
            item
        );

    rawTitle=
        titleNode?
        txt(
            titleNode.textContent||
            titleNode.innerText
        ):
        "";

    titleBits=
        extractMarkers(
            rawTitle
        );

    details=
        qs(
            ".more_info a",
            item
        );

    return {
        id:
            "ev-"+
            Math.random()
                .toString(36)
                .slice(2),

        rawTitle:rawTitle,

        title:
            titleBits.clean||
            rawTitle,

        markers:
            titleBits.markers,

        date:date,

        time:timeNode,

        description:
            parseDescription(item),

        location:
            parseLocation(item),

        detailsUrl:
            details?
            abs(
                details.getAttribute(
                    "href"
                )
            ):
            "",

        categories:[],

        featured:false,

        spotlight:false,

        recurring:false
    };
}

function addCat(eventItem,key){

    if(
        eventItem.categories
            .indexOf(key)===-1
    ){
        eventItem.categories.push(
            key
        );
    }
}

function inferCategories(eventItem){

    var title=
        slug(eventItem.title);

    var markers=
        eventItem.markers.map(
            function(marker){

                return slug(marker);
            }
        );

    function hasMarker(options){

        return options.some(
            function(option){

                return markers
                    .indexOf(option)>-1;
            }
        );
    }

    if(
        hasMarker([
            "spotlight"
        ])
    ){
        eventItem.spotlight=true;
    }

    if(
        hasMarker([
            "featured",
            "feature",
            "spotlight"
        ])
    ){
        eventItem.featured=true;
    }

    if(
        hasMarker([
            "holiday",
            "holidays"
        ])
    ){
        addCat(
            eventItem,
            "holidays"
        );
    }

    if(
        hasMarker([
            "youth",
            "teen",
            "kids",
            "children",
            "family"
        ])
    ){
        addCat(
            eventItem,
            "youth"
        );
    }

    if(
        hasMarker([
            "learning",
            "class",
            "classes",
            "learning class",
            "study"
        ])
    ){
        addCat(
            eventItem,
            "learning"
        );
    }

    if(
        hasMarker([
            "recurring",
            "weekly",
            "ongoing",
            "monthly"
        ])
    ){
        eventItem.recurring=true;
    }

    if(
        hasMarker([
            "one-time",
            "onetime",
            "special"
        ])
    ){
        eventItem.recurring=false;
    }

    if(
        /rosh hashanah|yom kippur|sukkot|simchat torah|chanukah|hanukkah|purim|passover|pesach|shavuot|lag b.?omer|tu b.?shvat|tisha b.?av|selichot|high holiday/
        .test(title)
    ){
        addCat(
            eventItem,
            "holidays"
        );
    }

    if(
        /youth|teen|cteen|child|children|kid|kids|family|hebrew school|camp|bar mitzvah|bat mitzvah/
        .test(title)
    ){
        addCat(
            eventItem,
            "youth"
        );
    }

    if(
        /class|learning|learn|torah|talmud|chassidus|kabbalah|lecture|course|parsha|lox.*learn|shiur/
        .test(title)
    ){
        addCat(
            eventItem,
            "learning"
        );
    }

    if(
        /featured|spotlight/
        .test(title)
    ){
        eventItem.featured=true;
    }

    if(
        /weekly|every monday|every tuesday|every wednesday|every thursday|every friday|every saturday|every sunday|ongoing|monthly/
        .test(title)
    ){
        eventItem.recurring=true;
    }
}

function finalizeEvents(events){

    var counts={};
    var index;
    var key;

    for(
        index=0;
        index<events.length;
        index++
    ){

        key=
            slug(
                events[index].title
            );

        counts[key]=
            (counts[key]||0)+1;
    }

    for(
        index=0;
        index<events.length;
        index++
    ){

        inferCategories(
            events[index]
        );

        key=
            slug(
                events[index].title
            );

        if(
            counts[key]>1&&
            !events[index]
                .markers
                .join(" ")
                .match(/one-time/i)
        ){
            events[index].recurring=true;
        }

        if(
            events[index].spotlight
        ){
            events[index].featured=true;
        }
    }

    events.sort(
        function(first,second){

            var firstDate=
                getEventDateObj(first);

            var secondDate=
                getEventDateObj(second);

            return (
                firstDate?
                firstDate.getTime():
                0
            )-
            (
                secondDate?
                secondDate.getTime():
                0
            );
        }
    );

    return events;
}

function parseFeed(html){

    var parsedDocument=
        new DOMParser()
            .parseFromString(
                html,
                "text/html"
            );

    var items=
        qsa(
            ".category_item",
            parsedDocument
        );

    var events=[];
    var index;
    var eventItem;

    for(
        index=0;
        index<items.length;
        index++
    ){

        eventItem=
            parseEvent(
                items[index]
            );

        if(
            eventItem&&
            eventItem.title
        ){
            events.push(
                eventItem
            );
        }
    }

    return finalizeEvents(
        events
    );
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

    var searchTerm=
        slug(state.search);

    return state.events.filter(
        function(eventItem){

            var haystack;
            var categoryMatches;

            if(eventItem.spotlight){
                return false;
            }

            categoryMatches=
                state.active==="all"||

                (
                    state.active==="featured"&&
                    eventItem.featured
                )||

                (
                    state.active==="holidays"&&
                    eventItem.categories
                        .indexOf(
                            "holidays"
                        )>-1
                )||

                (
                    state.active==="youth"&&
                    eventItem.categories
                        .indexOf(
                            "youth"
                        )>-1
                )||

                (
                    state.active==="learning"&&
                    eventItem.categories
                        .indexOf(
                            "learning"
                        )>-1
                );

            if(!categoryMatches){
                return false;
            }

            if(
                !rangeMatch(eventItem)||
                !cadenceMatch(eventItem)
            ){
                return false;
            }

            if(!searchTerm){
                return true;
            }

            haystack=
                slug(
                    [
                        eventItem.title,
                        eventItem.description,
                        eventItem.location.text,
                        eventItem.categories
                            .join(" "),
                        eventItem.time,
                        eventItem.date?
                        eventItem.date.label:
                        ""
                    ].join(" ")
                );

            return (
                haystack.indexOf(
                    searchTerm
                )>-1
            );
        }
    );
}

function visibleSpotlights(){

    return state.events.filter(
        function(eventItem){

            return eventItem.spotlight;
        }
    );
}

function buildTag(key,text){

    var className="cfle-tag";

    if(key==="featured"){
        className+=
            " cfle-tag--featured";
    }

    if(key==="holidays"){
        className+=
            " cfle-tag--holiday";
    }

    if(key==="youth"){
        className+=
            " cfle-tag--youth";
    }

    if(key==="learning"){
        className+=
            " cfle-tag--learning";
    }

    if(key==="recurring"){
        className+=
            " cfle-tag--recurring";
    }

    if(key==="onetime"){
        className+=
            " cfle-tag--onetime";
    }

    return (
        '<span class="'+
        className+
        '">'+
        esc(text)+
        '</span>'
    );
}

function eventTags(eventItem,isSpotlight){

    var output=[];

    if(
        isSpotlight||
        state.active==="featured"||
        eventItem.featured
    ){
        output.push(
            buildTag(
                "featured",
                "Featured"
            )
        );
    }

    if(
        eventItem.categories
            .indexOf("holidays")>-1
    ){
        output.push(
            buildTag(
                "holidays",
                "Holiday"
            )
        );
    }

    if(
        eventItem.categories
            .indexOf("youth")>-1
    ){
        output.push(
            buildTag(
                "youth",
                "Youth"
            )
        );
    }

    if(
        eventItem.categories
            .indexOf("learning")>-1
    ){
        output.push(
            buildTag(
                "learning",
                "Classes & Learning"
            )
        );
    }

    output.push(
        buildTag(
            eventItem.recurring?
            "recurring":
            "onetime",

            eventItem.recurring?
            "Weekly":
            "One-Time"
        )
    );

    return output.join("");
}

function eventTitleHtml(eventItem){

    if(eventItem.detailsUrl){

        return (
            '<a class="cfle-title" href="'+
            esc(eventItem.detailsUrl)+
            '">'+
            esc(eventItem.title)+
            '</a>'
        );
    }

    return (
        '<span class="'+
        'cfle-title '+
        'cfle-title--plain">'+
        esc(eventItem.title)+
        '</span>'
    );
}

function actionButtonsHtml(eventItem){

    var secondCalendarLabel=
        isApple()?
        "Apple Calendar":
        "Other Calendar";

    return (
        '<div class="cfle-actions">'+

        '<button type="button" '+
        'class="cfle-action-btn" '+
        'data-cal="google" '+
        'data-id="'+
        esc(eventItem.id)+
        '">'+
        'Google Calendar'+
        '</button>'+

        '<button type="button" '+
        'class="cfle-action-btn" '+
        'data-cal="ics" '+
        'data-id="'+
        esc(eventItem.id)+
        '">'+
        secondCalendarLabel+
        '</button>'+

        (
            eventItem.detailsUrl?

            '<a class="cfle-detail-btn" href="'+
            esc(eventItem.detailsUrl)+
            '">'+
            'View Details'+
            '</a>':

            ""
        )+

        '</div>'
    );
}

function renderMeta(eventItem){

    var parts=[];

    if(eventItem.time){

        parts.push(
            '<span class="cfle-meta-item">'+
            '&#9716; '+
            esc(eventItem.time)+
            '</span>'
        );
    }

    if(
        eventItem.location&&
        eventItem.location.text
    ){

        parts.push(
            '<a class="'+
            'cfle-meta-item '+
            'cfle-location" '+
            'href="'+
            esc(
                mapUrl(
                    eventItem.location
                )
            )+
            '" target="_blank" '+
            'rel="noopener noreferrer">'+
            '&#128205; '+
            esc(
                eventItem.location.name||
                eventItem.location.text
            )+
            '</a>'
        );
    }

    return (
        '<div class="cfle-meta">'+
        parts.join(
            '<span class="cfle-meta-item">'+
            '|'+
            '</span>'
        )+
        '</div>'
    );
}

function cardHtml(eventItem,isSpotlight){

    var date=
        eventItem.date||{};

    var description=
        eventItem.description?

        '<p class="cfle-desc">'+
        esc(eventItem.description)+
        '</p>':

        "";

    var className=
        "cfle-card"+
        (
            isSpotlight?
            " cfle-card--spotlight":
            ""
        )+
        (
            !eventItem.description?
            " no-desc":
            ""
        );

    return (
        '<div class="'+
        className+
        '">'+

        '<div class="cfle-date">'+

        '<span class="cfle-date-month">'+
        esc(
            (date.month||"")
                .slice(0,3)
        )+
        '</span>'+

        '<span class="cfle-date-day">'+
        esc(date.day||"")+
        '</span>'+

        '<span class="cfle-date-weekday">'+
        esc(
            (date.weekday||"")
                .slice(0,3)
        )+
        '</span>'+

        '</div>'+

        '<div class="cfle-body">'+

        eventTitleHtml(
            eventItem
        )+

        '<div class="cfle-tags">'+
        eventTags(
            eventItem,
            isSpotlight
        )+
        '</div>'+

        description+

        renderMeta(
            eventItem
        )+

        '</div>'+

        actionButtonsHtml(
            eventItem
        )+

        '</div>'
    );
}

function renderEmpty(){

    return (
        '<div class="cfle-empty">'+

        '<strong>'+
        'Nothing here just yet.'+
        '</strong>'+

        '<span>'+
        'More programs are on the way&mdash;'+
        'try another category or check back soon.'+
        '</span>'+

        '<a href="#" '+
        'class="cfle-reset-link" '+
        'id="cfle-reset-link">'+
        'View All'+
        '</a>'+

        '</div>'
    );
}

function ensureRenderContainers(){

    var mount=
        qs("#cfle-events");

    var spotWrap=
        qs("#cfle-spotlight-section");

    var mainWrap=
        qs("#cfle-main-section");

    if(!mount){

        return {
            mount:null,
            spotWrap:null,
            mainWrap:null
        };
    }

    if(!spotWrap){

        spotWrap=
            d.createElement("div");

        spotWrap.id=
            "cfle-spotlight-section";

        spotWrap.className=
            "cfle-section";

        mount.appendChild(
            spotWrap
        );
    }

    if(!mainWrap){

        mainWrap=
            d.createElement("div");

        mainWrap.id=
            "cfle-main-section";

        mainWrap.className=
            "cfle-section";

        mount.appendChild(
            mainWrap
        );
    }

    return {
        mount:mount,
        spotWrap:spotWrap,
        mainWrap:mainWrap
    };
}

function render(){

    var containers=
        ensureRenderContainers();

    var spot=
        visibleSpotlights();

    var main=
        visibleMainEvents();

    var count=
        qs("#cfle-count");

    var headingLabel=
        labelForFilter(
            state.active
        );

    var html="";
    var index;

    if(
        !containers.mount||
        !containers.spotWrap||
        !containers.mainWrap||
        !count
    ){
        return;
    }

    count.innerHTML=
        "<strong>"+
        main.length+
        "</strong> upcoming programs";

    if(spot.length){

        html=
            '<h2 class="cfle-section-title">'+
            '<span class="cfle-star">'+
            '&#9733;'+
            '</span> '+
            'Spotlight'+
            '</h2>'+

            '<p class="cfle-subtle">'+
            'Promoted programs always stay visible here.'+
            '</p>'+

            '<div class="'+
            'cfle-spot-grid '+
            'count-'+
            (
                spot.length>4?
                4:
                spot.length
            )+
            '">';

        for(
            index=0;
            index<spot.length;
            index++
        ){

            html+=
                cardHtml(
                    spot[index],
                    true
                );
        }

        html+="</div>";

        containers.spotWrap
            .innerHTML=html;

    }else{

        containers.spotWrap
            .innerHTML="";
    }

    html=
        '<h2 class="cfle-section-title">'+
        esc(headingLabel)+
        ' <small>'+
        'now showing'+
        '</small>'+
        '</h2>';

    if(main.length){

        html+=
            '<div class="cfle-list">'+
            main.map(
                function(eventItem){

                    return cardHtml(
                        eventItem,
                        false
                    );
                }
            ).join("")+
            '</div>';

    }else{

        html+=renderEmpty();
    }

    containers.mainWrap
        .innerHTML=html;
}

function setActiveFilter(key){

    state.active=key;

    qsa(
        ".cfle-filter-btn"
    ).forEach(
        function(button){

            button.className=
                "cfle-filter-btn"+
                (
                    button.getAttribute(
                        "data-filter"
                    )===key?
                    " active":
                    ""
                );
        }
    );

    render();
}

function setChipState(){

    qsa(
        ".cfle-chip-btn"
    ).forEach(
        function(button){

            var group=
                button.getAttribute(
                    "data-group"
                );

            var value=
                button.getAttribute(
                    "data-value"
                );

            var active=
                (
                    group==="range"&&
                    state.range===value
                )||
                (
                    group==="cadence"&&
                    state.cadence===value
                );

            button.className=
                "cfle-chip-btn"+
                (
                    active?
                    " active":
                    ""
                );
        }
    );
}

function findEventById(id){

    var index;

    for(
        index=0;
        index<state.events.length;
        index++
    ){

        if(
            state.events[index].id===id
        ){
            return state.events[index];
        }
    }

    return null;
}

function bindUI(){

    var mount=
        qs("#cfle-events");

    var search=
        qs("#cfle-search");

    var panel=
        qs("#cfle-more-panel");

    if(!mount){
        return;
    }

    mount.addEventListener(
        "click",
        function(event){

            var target=
                event.target;

            var button=
                target.closest?
                target.closest(
                    "button,a"
                ):
                null;

            var eventItem;

            if(
                button&&
                button.classList
                    .contains(
                        "cfle-filter-btn"
                    )
            ){

                event.preventDefault();

                setActiveFilter(
                    button.getAttribute(
                        "data-filter"
                    )
                );

                return;
            }

            if(
                button&&
                button.id===
                "cfle-more-toggle"
            ){

                event.preventDefault();

                if(panel){

                    panel.className=
                        panel.className
                            .indexOf("open")>-1?

                        "cfle-more-panel":

                        "cfle-more-panel open";
                }

                return;
            }

            if(
                button&&
                button.classList
                    .contains(
                        "cfle-chip-btn"
                    )
            ){

                event.preventDefault();

                if(
                    button.getAttribute(
                        "data-group"
                    )==="range"
                ){

                    state.range=
                        button.getAttribute(
                            "data-value"
                        );
                }

                if(
                    button.getAttribute(
                        "data-group"
                    )==="cadence"
                ){

                    state.cadence=
                        button.getAttribute(
                            "data-value"
                        );
                }

                setChipState();
                render();

                return;
            }

            if(
                button&&
                button.id===
                "cfle-reset-link"
            ){

                event.preventDefault();

                state.range="all";
                state.cadence="all";
                state.search="";

                if(search){
                    search.value="";
                }

                setChipState();
                setActiveFilter(
                    "all"
                );

                return;
            }

            if(
                button&&
                button.classList
                    .contains(
                        "cfle-action-btn"
                    )
            ){

                event.preventDefault();

                eventItem=
                    findEventById(
                        button.getAttribute(
                            "data-id"
                        )
                    );

                if(!eventItem){
                    return;
                }

                if(
                    button.getAttribute(
                        "data-cal"
                    )==="google"
                ){

                    window.open(
                        googleCalUrl(
                            eventItem
                        ),
                        "_blank"
                    );

                    return;
                }

                if(
                    button.getAttribute(
                        "data-cal"
                    )==="ics"
                ){

                    downloadICS(
                        eventItem
                    );

                    return;
                }
            }
        }
    );

    if(search){

        search.addEventListener(
            "input",
            function(){

                state.search=
                    this.value||"";

                render();
            }
        );
    }
}

function showLoadError(){

    var containers=
        ensureRenderContainers();

    if(containers.mainWrap){

        containers.mainWrap.innerHTML=
            '<div class="cfle-empty">'+
            '<strong>'+
            'We couldn&rsquo;t load the programs.'+
            '</strong>'+
            '<span>'+
            'Please refresh the page and try again.'+
            '</span>'+
            '</div>';
    }
}

function init(){

    var cached=
        getCache();

    ensureRenderContainers();
    bindUI();
    setChipState();

    if(cached){

        try{

            state.events=
                parseFeed(cached);

            render();

        }catch(error){}
    }

    fetch(
        CFG.feedUrl,
        {
            credentials:"same-origin",
            cache:"default"
        }
    )
    .then(
        function(response){

            if(!response.ok){

                throw new Error(
                    String(
                        response.status
                    )
                );
            }

            return response.text();
        }
    )
    .then(
        function(html){

            setCache(html);

            state.events=
                parseFeed(html);

            render();
        }
    )
    .catch(
        function(){

            if(!state.events.length){
                showLoadError();
            }
        }
    );
}

if(
    d.readyState==="loading"
){

    d.addEventListener(
        "DOMContentLoaded",
        init
    );

}else{

    init();
}

})();
