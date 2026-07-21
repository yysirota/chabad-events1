(function(){

var d=document;
var head=d.getElementsByTagName("head")[0]||d.documentElement;
var scripts=d.getElementsByTagName("script");
var current=d.currentScript||scripts[scripts.length-1];
var source=current&&current.src?current.src:"";
var base=source.substring(0,source.lastIndexOf("/")+1);

if(base&&!d.getElementById("cfle-events-css")){

    var stylesheet=d.createElement("link");

    stylesheet.id="cfle-events-css";
    stylesheet.rel="stylesheet";
    stylesheet.type="text/css";
    stylesheet.href=base+"events.css?v=5.3";

    head.appendChild(stylesheet);
}

var CONFIG={
    feedUrl:"/templates/events.htm",
    cacheKey:"cfleEventsV5",
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

    return (parent||d).querySelector(selector);
}

function qsa(selector,parent){

    return [].slice.call(
        (parent||d).querySelectorAll(selector)
    );
}

function cleanText(value){

    return String(value||"")
        .replace(/\u00a0/g," ")
        .replace(/\s+/g," ")
        .replace(/^\s+|\s+$/g,"");
}

function escapeHtml(value){

    return String(value||"").replace(/[&<>"]/g,function(character){

        return {
            "&":"&amp;",
            "<":"&lt;",
            ">":"&gt;",
            "\"":"&quot;"
        }[character];
    });
}

function absoluteUrl(url){

    var link;

    if(!url){
        return "";
    }

    link=d.createElement("a");
    link.href=url;

    return link.href;
}

function normalized(value){

    return cleanText(value).toLowerCase();
}

function isAppleDevice(){

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

    return months[
        String(name||"").toLowerCase()
    ]||0;
}

function parseClock(value){

    var match=cleanText(value).match(
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
        hour:hour,
        minute:parseInt(match[2],10)
    };
}

function parseDateLabel(value){

    var match=cleanText(value).match(
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

function getEventDate(eventItem){

    var time;
    var monthIndex;

    if(!eventItem.date){
        return null;
    }

    time=parseClock(eventItem.time)||{
        hour:12,
        minute:0
    };

    monthIndex=monthNumber(eventItem.date.month)-1;

    return new Date(
        eventItem.date.year,
        monthIndex,
        eventItem.date.day,
        time.hour,
        time.minute,
        0,
        0
    );
}

function matchesRange(eventItem){

    var now=new Date();
    var eventDate=getEventDate(eventItem);
    var start;
    var end;
    var remainingDays;

    if(!eventDate){
        return true;
    }

    if(state.range==="thisweek"){

        start=new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
            0
        );

        remainingDays=(7-start.getDay())%7;

        end=new Date(start.getTime());
        end.setDate(start.getDate()+remainingDays+1);

        return eventDate>=start&&eventDate<end;
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

        return eventDate>=start&&eventDate<end;
    }

    return true;
}

function matchesCadence(eventItem){

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

    if(/Android/i.test(navigator.userAgent||"")){

        return "geo:0,0?q="+query;
    }

    if(isAppleDevice()){

        return "https://maps.apple.com/?q="+query;
    }

    return (
        "https://www.google.com/maps/search/"+
        "?api=1&query="+
        query
    );
}

function calendarTimestamp(dateValue){

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

function googleCalendarUrl(eventItem){

    var start=getEventDate(eventItem);
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

    return (
        "https://calendar.google.com/calendar/render"+
        "?action=TEMPLATE"+
        "&text="+
        encodeURIComponent(eventItem.title)+
        "&dates="+
        encodeURIComponent(
            calendarTimestamp(start)+
            "/"+
            calendarTimestamp(end)
        )+
        "&location="+
        encodeURIComponent(eventItem.location.text||"")+
        "&details="+
        encodeURIComponent(description)
    );
}

function safeCalendarText(value){

    return String(value||"")
        .replace(/\\/g,"\\\\")
        .replace(/\r?\n/g,"\\n")
        .replace(/,/g,"\\,")
        .replace(/;/g,"\\;");
}

function createIcs(eventItem){

    var start=getEventDate(eventItem);
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

    return (
        "BEGIN:VCALENDAR\r\n"+
        "VERSION:2.0\r\n"+
        "PRODID:-//Chabad of Fort Lee//Upcoming at Chabad//EN\r\n"+
        "BEGIN:VEVENT\r\n"+
        "UID:"+
        Date.now()+
        "-"+
        Math.random().toString(36).slice(2)+
        "@chabadfortlee.com\r\n"+
        "DTSTART:"+
        calendarTimestamp(start)+
        "\r\n"+
        "DTEND:"+
        calendarTimestamp(end)+
        "\r\n"+
        "SUMMARY:"+
        safeCalendarText(eventItem.title)+
        "\r\n"+
        "LOCATION:"+
        safeCalendarText(eventItem.location.text||"")+
        "\r\n"+
        "DESCRIPTION:"+
        safeCalendarText(description)+
        "\r\n"+
        "END:VEVENT\r\n"+
        "END:VCALENDAR"
    );
}

function downloadIcs(eventItem){

    var content=createIcs(eventItem);
    var blob;
    var objectUrl;
    var link;

    if(!content){
        return;
    }

    blob=new Blob(
        [content],
        {
            type:"text/calendar;charset=utf-8"
        }
    );

    objectUrl=URL.createObjectURL(blob);

    link=d.createElement("a");
    link.href=objectUrl;

    link.download=
        (
            eventItem.title||
            "event"
        )
        .replace(/[^a-z0-9]+/gi,"-")
        .replace(/^-+|-+$/g,"")
        .toLowerCase()+
        ".ics";

    d.body.appendChild(link);
    link.click();
    d.body.removeChild(link);

    window.setTimeout(function(){

        URL.revokeObjectURL(objectUrl);

    },1500);
}

function getCache(){

    try{

        var raw=sessionStorage.getItem(CONFIG.cacheKey);
        var saved=raw?JSON.parse(raw):null;

        if(
            saved&&
            Date.now()-saved.time<CONFIG.cacheMs
        ){
            return saved.html;
        }

    }catch(error){}

    return "";
}

function saveCache(html){

    try{

        sessionStorage.setItem(
            CONFIG.cacheKey,
            JSON.stringify({
                time:Date.now(),
                html:html
            })
        );

    }catch(error){}
}

function extractMarkers(title){

    var markers=[];

    var cleanTitle=String(title||"").replace(
        /\[([^\]]+)\]/g,
        function(full,marker){

            markers.push(cleanText(marker));

            return "";
        }
    );

    return {
        markers:markers,
        clean:cleanText(cleanTitle)
    };
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
    var textValue;

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

    textValue=cleanText(
        clone.textContent||
        clone.innerText
    );

    parts=textValue.split("|");

    return {
        text:textValue.replace(
            /\s*\|\s*/g,
            " — "
        ),
        name:cleanText(parts[0]),
        address:cleanText(parts.slice(1).join(" ")),
        url:absoluteUrl(link.getAttribute("href"))
    };
}

function parseDescription(item){

    var blocks=qsa(
        ".event_wrapper > .event_info",
        item
    );

    var index;
    var value;

    for(index=0;index<blocks.length;index++){

        value=cleanText(
            blocks[index].textContent||
            blocks[index].innerText
        );

        if(value){
            return value;
        }
    }

    return "";
}

function parseEvent(item){

    var parent=item.parentNode;
    var dateNode=qs(".date_stamp .date",parent);
    var date=parseDateLabel(
        dateNode?
        dateNode.textContent:
        ""
    );

    var optionDivs=qsa(
        ".event_options.list_info div",
        item
    );

    var time="";
    var optionText;
    var index;
    var titleNode;
    var rawTitle;
    var titleData;
    var details;

    for(index=optionDivs.length-1;index>=0;index--){

        optionText=cleanText(
            optionDivs[index].textContent||
            optionDivs[index].innerText
        );

        if(
            /\d{1,2}:\d{2}\s*(am|pm)/i.test(
                optionText
            )
        ){
            time=optionText;
            break;
        }
    }

    titleNode=qs(
        ".event_wrapper .event_name",
        item
    );

    rawTitle=titleNode?
        cleanText(
            titleNode.textContent||
            titleNode.innerText
        ):
        "";

    titleData=extractMarkers(rawTitle);
    details=qs(".more_info a",item);

    return {
        id:
            "event-"+
            Math.random().toString(36).slice(2),

        rawTitle:rawTitle,

        title:
            titleData.clean||
            rawTitle,

        markers:titleData.markers,

        date:date,

        time:time,

        description:parseDescription(item),

        location:parseLocation(item),

        detailsUrl:
            details?
            absoluteUrl(details.getAttribute("href")):
            "",

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

    var markers=eventItem.markers.map(
        function(marker){

            return normalized(marker);
        }
    );

    function hasMarker(options){

        return options.some(
            function(option){

                return markers.indexOf(option)>-1;
            }
        );
    }

    if(hasMarker(["spotlight"])){

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

        addCategory(eventItem,"holidays");
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

        addCategory(eventItem,"youth");
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

        addCategory(eventItem,"learning");
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
        /rosh hashanah|yom kippur|sukkot|simchat torah|chanukah|hanukkah|purim|passover|pesach|shavuot|lag b.?omer|tu b.?shvat|tisha b.?av|selichot|high holiday/.test(title)
    ){

        addCategory(eventItem,"holidays");
    }

    if(
        /youth|teen|cteen|child|children|kid|kids|family|hebrew school|camp|bar mitzvah|bat mitzvah/.test(title)
    ){

        addCategory(eventItem,"youth");
    }

    if(
        /class|learning|learn|torah|talmud|chassidus|kabbalah|lecture|course|parsha|lox.*learn|shiur/.test(title)
    ){

        addCategory(eventItem,"learning");
    }

    if(/featured|spotlight/.test(title)){

        eventItem.featured=true;
    }

    if(
        /weekly|every monday|every tuesday|every wednesday|every thursday|every friday|every saturday|every sunday|ongoing|monthly/.test(title)
    ){

        eventItem.recurring=true;
    }
}

function finalizeEvents(events){

    var titleCounts={};
    var index;
    var key;

    for(index=0;index<events.length;index++){

        key=normalized(events[index].title);

        titleCounts[key]=
            (titleCounts[key]||0)+1;
    }

    for(index=0;index<events.length;index++){

        inferCategories(events[index]);

        key=normalized(events[index].title);

        if(
            titleCounts[key]>1&&
            !events[index].markers
                .join(" ")
                .match(/one-time/i)
        ){

            events[index].recurring=true;
        }

        if(events[index].spotlight){

            events[index].featured=true;
        }
    }

    events.sort(function(first,second){

        var firstDate=getEventDate(first);
        var secondDate=getEventDate(second);

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
    });

    return events;
}

function parseFeed(html){

    var parsedDocument=
        new DOMParser().parseFromString(
            html,
            "text/html"
        );

    var items=qsa(
        ".category_item",
        parsedDocument
    );

    var events=[];
    var index;
    var eventItem;

    for(index=0;index<items.length;index++){

        eventItem=parseEvent(items[index]);

        if(eventItem&&eventItem.title){

            events.push(eventItem);
        }
    }

    return finalizeEvents(events);
}

function filterLabel(key){

    return {
        all:"All",
        featured:"Featured",
        holidays:"Holidays",
        youth:"Youth",
        learning:"Classes & Learning"
    }[key]||"All";
}

function visibleMainEvents(){

    var searchTerm=normalized(state.search);

    return state.events.filter(function(eventItem){

        var categoryMatches;
        var searchText;

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
                eventItem.categories.indexOf("holidays")>-1
            )||

            (
                state.active==="youth"&&
                eventItem.categories.indexOf("youth")>-1
            )||

            (
                state.active==="learning"&&
                eventItem.categories.indexOf("learning")>-1
            );

        if(!categoryMatches){
            return false;
        }

        if(
            !matchesRange(eventItem)||
            !matchesCadence(eventItem)
        ){
            return false;
        }

        if(!searchTerm){
            return true;
        }

        searchText=normalized(
            [
                eventItem.title,
                eventItem.description,
                eventItem.location.text,
                eventItem.categories.join(" "),
                eventItem.time,
                eventItem.date?
                    eventItem.date.label:
                    ""
            ].join(" ")
        );

        return searchText.indexOf(searchTerm)>-1;
    });
}

function visibleSpotlights(){

    return state.events.filter(function(eventItem){

        return eventItem.spotlight;
    });
}

function tagHtml(type,text){

    var className="cfle-tag";

    if(type==="featured"){
        className+=" cfle-tag--featured";
    }

    if(type==="holidays"){
        className+=" cfle-tag--holiday";
    }

    if(type==="youth"){
        className+=" cfle-tag--youth";
    }

    if(type==="learning"){
        className+=" cfle-tag--learning";
    }

    if(type==="recurring"){
        className+=" cfle-tag--recurring";
    }

    if(type==="onetime"){
        className+=" cfle-tag--onetime";
    }

    return (
        '<span class="'+
        className+
        '">'+
        escapeHtml(text)+
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
            tagHtml(
                "featured",
                "Featured"
            )
        );
    }

    if(
        eventItem.categories.indexOf("holidays")>-1
    ){

        output.push(
            tagHtml(
                "holidays",
                "Holiday"
            )
        );
    }

    if(
        eventItem.categories.indexOf("youth")>-1
    ){

        output.push(
            tagHtml(
                "youth",
                "Youth"
            )
        );
    }

    if(
        eventItem.categories.indexOf("learning")>-1
    ){

        output.push(
            tagHtml(
                "learning",
                "Classes & Learning"
            )
        );
    }

    output.push(
        tagHtml(
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

function titleHtml(eventItem){

    if(eventItem.detailsUrl){

        return (
            '<a class="cfle-title" href="'+
            escapeHtml(eventItem.detailsUrl)+
            '">'+
            escapeHtml(eventItem.title)+
            '</a>'
        );
    }

    return (
        '<span class="cfle-title cfle-title--plain">'+
        escapeHtml(eventItem.title)+
        '</span>'
    );
}

function clockIcon(){

    return (
        '<span class="cfle-meta-icon" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24">'+
        '<circle cx="12" cy="12" r="8"></circle>'+
        '<path d="M12 7v5l3 2"></path>'+
        '</svg>'+
        '</span>'
    );
}

function locationIcon(){

    return (
        '<span class="cfle-meta-icon cfle-location-icon" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24">'+
        '<path d="M12 2.5c-4.2 0-7.4 3.2-7.4 7.3 0 5.2 7.4 11.7 7.4 11.7s7.4-6.5 7.4-11.7c0-4.1-3.2-7.3-7.4-7.3z"></path>'+
        '<circle cx="12" cy="9.8" r="2.7"></circle>'+
        '</svg>'+
        '</span>'
    );
}

function appleIcon(){

    return (
        '<span class="cfle-action-icon cfle-apple-logo" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24">'+
        '<path fill="currentColor" d="M16.7 12.8c0-2.6 2.1-3.9 2.2-4-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.2 1-4 .9-.9 0-2.1-.9-3.5-.9-1.8 0-3.5 1.1-4.5 2.7-1.9 3.3-.5 8.2 1.4 10.9.9 1.3 2 2.8 3.5 2.7 1.4-.1 2-.9 3.7-.9 1.7 0 2.2.9 3.7.9 1.5 0 2.5-1.3 3.4-2.7 1.1-1.5 1.5-3 1.5-3.1-.1 0-3.6-1.4-3.6-4.5zM14.1 5.1c.8-1 1.3-2.3 1.2-3.6-1.2.1-2.6.8-3.4 1.8-.7.8-1.3 2.2-1.2 3.4 1.3.1 2.6-.6 3.4-1.6z"></path>'+
        '</svg>'+
        '</span>'
    );
}

function calendarIcon(){

    return (
        '<span class="cfle-action-icon" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24">'+
        '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"></rect>'+
        '<path d="M7 3v4M17 3v4M3 10h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'+
        '</svg>'+
        '</span>'
    );
}

function googleIcon(){

    return (
        '<span class="cfle-action-icon cfle-google-logo" aria-hidden="true">'+
        '<svg viewBox="0 0 48 48">'+
        '<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.1 0 20-8.9 20-20 0-1.3-.1-2.4-.4-3.5z"></path>'+
        '<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"></path>'+
        '<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"></path>'+
        '<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"></path>'+
        '</svg>'+
        '</span>'
    );
}
    
function actionButtonsHtml(eventItem){

    var firstButton;
    var secondButton;

    if(isAppleDevice()){

        firstButton=
            '<button type="button" '+
            'class="cfle-action-btn cfle-calendar-apple" '+
            'data-calendar="ics" '+
            'data-event-id="'+
            escapeHtml(eventItem.id)+
            '">'+
            appleIcon()+
            '<span>Add to Calendar</span>'+
            '</button>';

        secondButton=
            '<button type="button" '+
            'class="cfle-action-btn cfle-calendar-google" '+
            'data-calendar="google" '+
            'data-event-id="'+
            escapeHtml(eventItem.id)+
            '">'+
            googleIcon()+
            '<span>Add to Calendar</span>'+
            '</button>';

    }else{

        firstButton=
            '<button type="button" '+
            'class="cfle-action-btn cfle-calendar-google" '+
            'data-calendar="google" '+
            'data-event-id="'+
            escapeHtml(eventItem.id)+
            '">'+
            googleIcon()+
            '<span>Add to Calendar</span>'+
            '</button>';

        secondButton=
            '<button type="button" '+
            'class="cfle-action-btn cfle-calendar-other" '+
            'data-calendar="ics" '+
            'data-event-id="'+
            escapeHtml(eventItem.id)+
            '">'+
            calendarIcon()+
            '<span>Add to Calendar</span>'+
            '</button>';
    }

    return (
        '<div class="cfle-actions">'+
        firstButton+
        secondButton+
        (
            eventItem.detailsUrl?

            '<a class="cfle-detail-btn" href="'+
            escapeHtml(eventItem.detailsUrl)+
            '">'+
            '<span>View Details</span>'+
            '</a>':

            ""
        )+
        '</div>'
    );
}

function metaHtml(eventItem){

    var parts=[];

    if(eventItem.time){

        parts.push(
            '<span class="cfle-meta-item">'+
            clockIcon()+
            escapeHtml(eventItem.time)+
            '</span>'
        );
    }

    if(
        eventItem.location&&
        eventItem.location.text
    ){

        parts.push(
            '<a class="cfle-meta-item cfle-location" '+
            'href="'+
            escapeHtml(
                mapsUrl(eventItem.location)
            )+
            '" target="_blank" '+
            'rel="noopener noreferrer">'+
            locationIcon()+
            '<span class="cfle-nowrap">'+
            escapeHtml(
                eventItem.location.name||
                eventItem.location.text
            )+
            '</span>'+
            '</a>'
        );
    }

    return (
        '<div class="cfle-meta">'+
        parts.join(
            '<span class="cfle-meta-separator" aria-hidden="true">'+
            '|'+
            '</span>'
        )+
        '</div>'
    );
}

function cardHtml(eventItem,isSpotlight){

    var date=eventItem.date||{};

    var description=eventItem.description?

        '<p class="cfle-desc">'+
        escapeHtml(eventItem.description)+
        '</p>':

        "";

    var className="cfle-card";

    if(isSpotlight){
        className+=" cfle-card--spotlight";
    }

    if(!eventItem.description){
        className+=" no-desc";
    }

    return (
        '<div class="'+
        className+
        '">'+

        '<div class="cfle-date">'+

        '<span class="cfle-date-month">'+
        escapeHtml(
            (date.month||"").slice(0,3)
        )+
        '</span>'+

        '<span class="cfle-date-day">'+
        escapeHtml(date.day||"")+
        '</span>'+

        '<span class="cfle-date-weekday">'+
        escapeHtml(
            (date.weekday||"").slice(0,3)
        )+
        '</span>'+

        '</div>'+

        '<div class="cfle-body">'+

        titleHtml(eventItem)+

        '<div class="cfle-tags">'+
        eventTags(eventItem,isSpotlight)+
        '</div>'+

        description+

        metaHtml(eventItem)+

        '</div>'+

        actionButtonsHtml(eventItem)+

        '</div>'
    );
}

function emptyHtml(){

    return (
        '<div class="cfle-empty">'+
        '<strong>Nothing here just yet.</strong>'+
        '<span>'+
        'More programs are on the way&mdash;'+
        'try another category or check back soon.'+
        '</span>'+
        '<a href="#" class="cfle-reset-link" id="cfle-reset-link">'+
        'View All'+
        '</a>'+
        '</div>'
    );
}

function ensureContainers(){

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

function render(){

    var containers=ensureContainers();
    var count=qs("#cfle-count");
    var spotlightEvents=visibleSpotlights();
    var mainEvents=visibleMainEvents();
    var heading=filterLabel(state.active);
    var html="";
    var index;

    if(
        !containers.mount||
        !containers.spotlight||
        !containers.main||
        !count
    ){
        return;
    }

    count.innerHTML=
        "<strong>"+
        mainEvents.length+
        "</strong> upcoming programs";

    if(spotlightEvents.length){

        html=
            '<h2 class="cfle-section-title">'+
            '<span class="cfle-star">&#9733;</span>'+
            '<span>Spotlight</span>'+
            '</h2>'+
            '<p class="cfle-subtle">'+
            'Promoted programs always stay visible here.'+
            '</p>'+
            '<div class="cfle-spot-grid count-'+
            (
                spotlightEvents.length>4?
                4:
                spotlightEvents.length
            )+
            '">';

        for(index=0;index<spotlightEvents.length;index++){

            html+=cardHtml(
                spotlightEvents[index],
                true
            );
        }

        html+="</div>";

        containers.spotlight.innerHTML=html;

    }else{

        containers.spotlight.innerHTML="";
    }

    html=
        '<h2 class="cfle-section-title">'+
        escapeHtml(heading)+
        ' <small>now showing</small>'+
        '</h2>';

    if(mainEvents.length){

        html+=
            '<div class="cfle-list">'+
            mainEvents.map(function(eventItem){

                return cardHtml(
                    eventItem,
                    false
                );

            }).join("")+
            '</div>';

    }else{

        html+=emptyHtml();
    }

    containers.main.innerHTML=html;
}

function setActiveFilter(key){

    state.active=key;

    qsa(".cfle-filter-btn").forEach(
        function(button){

            button.className=
                "cfle-filter-btn"+
                (
                    button.getAttribute("data-filter")===key?
                    " active":
                    ""
                );
        }
    );

    render();
}

function updateChipStates(){

    qsa(".cfle-chip-btn").forEach(
        function(button){

            var group=button.getAttribute("data-group");
            var value=button.getAttribute("data-value");

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

function eventById(id){

    var index;

    for(index=0;index<state.events.length;index++){

        if(state.events[index].id===id){

            return state.events[index];
        }
    }

    return null;
}

function bindInterface(){

    var mount=qs("#cfle-events");
    var search=qs("#cfle-search");
    var panel=qs("#cfle-more-panel");

    if(!mount){
        return;
    }

    mount.addEventListener(
        "click",
        function(event){

            var target=event.target;

            var control=target.closest?
                target.closest("button,a"):
                null;

            var eventItem;

            if(
                control&&
                control.classList.contains(
                    "cfle-filter-btn"
                )
            ){

                event.preventDefault();

                setActiveFilter(
                    control.getAttribute(
                        "data-filter"
                    )
                );

                return;
            }

            if(
                control&&
                control.id==="cfle-more-toggle"
            ){

                event.preventDefault();

                if(panel){

                    panel.className=
                        panel.className.indexOf("open")>-1?
                        "cfle-more-panel":
                        "cfle-more-panel open";
                }

                return;
            }

            if(
                control&&
                control.classList.contains(
                    "cfle-chip-btn"
                )
            ){

                event.preventDefault();

                if(
                    control.getAttribute(
                        "data-group"
                    )==="range"
                ){

                    state.range=
                        control.getAttribute(
                            "data-value"
                        );
                }

                if(
                    control.getAttribute(
                        "data-group"
                    )==="cadence"
                ){

                    state.cadence=
                        control.getAttribute(
                            "data-value"
                        );
                }

                updateChipStates();
                render();

                return;
            }

            if(
                control&&
                control.id==="cfle-reset-link"
            ){

                event.preventDefault();

                state.range="all";
                state.cadence="all";
                state.search="";

                if(search){
                    search.value="";
                }

                updateChipStates();
                setActiveFilter("all");

                return;
            }

            if(
                control&&
                control.classList.contains(
                    "cfle-action-btn"
                )
            ){

                event.preventDefault();

                eventItem=eventById(
                    control.getAttribute(
                        "data-event-id"
                    )
                );

                if(!eventItem){
                    return;
                }

                if(
                    control.getAttribute(
                        "data-calendar"
                    )==="google"
                ){

                    window.open(
                        googleCalendarUrl(eventItem),
                        "_blank"
                    );

                    return;
                }

                if(
                    control.getAttribute(
                        "data-calendar"
                    )==="ics"
                ){

                    downloadIcs(eventItem);

                    return;
                }
            }
        }
    );

    if(search){

        search.addEventListener(
            "input",
            function(){

                state.search=this.value||"";

                render();
            }
        );
    }
}

function showError(){

    var containers=ensureContainers();

    if(containers.main){

        containers.main.innerHTML=
            '<div class="cfle-empty">'+
            '<strong>We couldn&rsquo;t load the programs.</strong>'+
            '<span>Please refresh the page and try again.</span>'+
            '</div>';
    }
}

function initialize(){

    var cached=getCache();

    ensureContainers();
    bindInterface();
    updateChipStates();

    if(cached){

        try{

            state.events=parseFeed(cached);

            render();

        }catch(error){}
    }

    fetch(
        CONFIG.feedUrl,
        {
            credentials:"same-origin",
            cache:"default"
        }
    )
    .then(function(response){

        if(!response.ok){

            throw new Error(
                String(response.status)
            );
        }

        return response.text();
    })
    .then(function(html){

        saveCache(html);

        state.events=parseFeed(html);

        render();
    })
    .catch(function(){

        if(!state.events.length){

            showError();
        }
    });
}

if(d.readyState==="loading"){

    d.addEventListener(
        "DOMContentLoaded",
        initialize
    );

}else{

    initialize();
}

})();
