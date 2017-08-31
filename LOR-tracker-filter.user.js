// ==UserScript==
// @name LOR-tracker-filter
// @description Фильтр трекера для ЛОРа
// @author Алексей Соловьев aka moscwich; Емельянов Эдуард aka Eddy_Em -- Fork && upgrade, Nebula-Mechanica -- remove functionality other than filtering
// @license Creative Commons Attribution 3.0 Unported
// @version 1.0
// @grant       none
// @namespace http://www.linux.org.ru/*
// @namespace https://www.linux.org.ru/*
// @include http://www.linux.org.ru/*
// @include https://www.linux.org.ru/*
// ==/UserScript==

// Based on MultiCodePanel 2.2 (v. 0.22)
// http://al-moscwich.tk/tag/multicodepanel


(function(){

const TEST = false; // set to false in release

if(window.parent != window){
	unsafeWindow.console.log("INFRAME!!!");
	return;
}

const pluginVersion = "1.0"; // версия скрипта; нужна для оповещения при внесении изменений

unsafeWindow.console.log("start");
function tlog__(msg){unsafeWindow.console.log(msg);}
var tlog;
if(TEST) tlog = tlog__;
else tlog = function(msg){};

/*
 *                  GLOBAL FUNCTIONS
 */
tlog("begin");
var Glob; // global settings
/*
 * Load object nm from local storage
 * if it's absent set it to defval or return null if devfal undefined
 */
function LoadObject(nm, defval){
	var val = JSON.parse(localStorage.getItem(nm));
	if(val == null && typeof(defval) != "undefined"){
		tlog("Can't load object, try to use defaults");
		val = defval;
	}
	return val;
}
/*
 * Save object obj in local storage as nm
 */
function SaveObject(obj, nm){
	tlog("save " + obj);
	localStorage.setItem(nm, JSON.stringify(obj));
}

function $(id){
	return document.getElementById(id);
}
function noDef(evt){ // remove default event action
	evt.stopPropagation();
	evt.preventDefault();
}
function rmElement(el){ // remove element from DOM tree
	if(typeof(el) != "undefined" && el)
		el.parentNode.removeChild(el);
}
function getURL(full){ // get URL of current page
// if full defined && true, don't cut GET parameters from URL
	var qpos, CurURL = location.href;
	if(typeof(full) == "undefined" || !full){
		qpos = CurURL.indexOf("?");
		if(qpos > -1) CurURL = CurURL.substring(0,qpos);
	}
	qpos = CurURL.indexOf("//") + 2;
	CurURL = CurURL.substring(qpos);
	if(CurURL.charAt(CurURL.length - 1) == "/")
		CurURL = CurURL.substring(0,CurURL.length - 1);
	return CurURL;
}
// insert newElement after targetElement
function insertAfter(newElement, targetElement){
	var parent = targetElement.parentNode;
	if(parent.lastchild == targetElement)
		parent.appendChild(newElement);
	else
		parent.insertBefore(newElement, targetElement.nextSibling);
}
// indicate that iframe content is loaded
var iframeLoaded = false, nTries = 0;
function iframeIsLoaded(){
	var F = $("innerFrame");
	if (F.src == "") return;
	var D = (F.contentDocument) ? F.contentDocument : F.contentWindow.document;
	if(D.getElementsByClassName("head").length == 0 && D.getElementsByClassName("menu").length == 0){
		nTries = 100; return; // frame is blocked by AdBlock
	}
	iframeLoaded = true; nTries = 0;
	tlog("IFRAME loaded " + F.src);
}
// alert that iframe could be blocked by adBlock
function IFRMerror(){
}
/*
 *                      USERSCRIPT ITSELF
 */
function AlertOnFirstRun(){
}
var savedVersion = LoadObject("LOR-tracker-filter.version", false);
if(pluginVersion != savedVersion) AlertOnFirstRun();
// parent with class "msg" for element el of first element with class "msg"
function getMsg(el){
	while(el && el.className != "msg") el = el.parentElement;
	if(!el) el = document.getElementsByClassName("msg")[0];
	return el;
}
// get URL of message, aMsg -- article element
function getMsgURL(aMsg){
}

/*
 * Global settings
 */
function GlobSettings(){
function nope(){};
// array: item name, defval, menu name, appr. function
var GMitems = [ ["addSortMenu",  true, "фильтрация трекера", addSortMenu]
			];
var milen = GMitems.length;
var i, defvar = new Object();
for(i = 0; i < milen; i++) defvar[GMitems[i][0]] = GMitems[i][1];
Glob = LoadObject("GlobalLORoptions", defvar);
if(TEST)for(i = 0; i < milen; i++) tlog("GL["+GMitems[i][0]+"] = "+Glob[GMitems[i][0]]);

for(i = 0; i < milen; i++)
	if(Glob[GMitems[i][0]])GMitems[i][3]();
}
GlobSettings();


/*
 * sort tracker
 */
function addSortMenu(){
tlog("addSortMenu()");
var CurURL = getURL(true); // don't sort sorted tracker
tlog("URL: "+CurURL);
if(CurURL.indexOf("www.linux.org.ru/tracker") == -1) return;
const maxElems = 50; // maximum amount of records in tracker
var WasSorted = false; // whether tracker was sorted?
var menuitems = ["general", "desktop", "admin", "linux-install", "development",
				"linux-org-ru", "security", "linux-hardware", "talks", "job", "games",
				"web-development", "club", "lor-source", "mobile",
				"multimedia", "midnight", "science", /* news cat here */ "*************",
				"screenshots", "workplaces", "polls", "*************",
				"doc", "linux-general", "opensource", "mozilla", "redhat", "java",
				"gnome", "kde", "gnu", "russia", "proprietary", "kernel", "hardware",
				"bsd", "debian", "openoffice", "pda", "sco", "clusters", "ubuntu",
				"slackware", "apple", "novell", "calculate-linux", "gentoo", "internet",
				"android", "conference", "google"];
var milen = menuitems.length;
var ichkd = LoadObject("FilterTracker");
if(!ichkd) ichkd = new Array();
var ichkdlen = ichkd.length;
var TotalElements = 0;
function onkey(evt){ // Sort tracker by ESC
	noDef(evt);
	if(evt.keyCode != 27) return;
	menuShowHide();
}
function getCheckedItems(){ // save checked menu items in local storage
	ichkd = [];
	for(var i = 0; i < milen; i++)
		if($('MB'+i).checked)
			ichkd.push(i);
	ichkdlen = ichkd.length;
	SaveObject(ichkd, "FilterTracker");
}
function checkHref(a, tbl){ // check if topic is selected
	var H = a.href;
	var addEl = (typeof(tbl) != "undefined"); // whether add needed or remove unneeded
	if(H.charAt(H.length - 1) == "/") // cut forum name
		H = H.slice(0,-1);
	var slashpos = H.lastIndexOf("/");
	H = H.slice(slashpos+1);
	var found = false;
	for(var i = 0; i < ichkdlen; i++)
		if(H == menuitems[ichkd[i]]){
			found = true; break;
		}
	if(!found){
		if(!addEl) rmElement(a.parentNode.parentNode);
	}else{
		TotalElements++;
		if(addEl)
			tbl.appendChild(a.parentNode.parentNode);
	}
}
function genMenuBoxes(parent){ // generate menu
	var i;
	for(i = 0; i < milen; i++){
		var str = document.createElement('div');
		str.className = "SortTrackMenuItem";
		var inp = document.createElement('input'); inp.type = "checkbox";
		inp.onclick = function(){menuwaschanged = true;}; inp.id = "MB"+i;
		str.appendChild(inp);
		var txt = document.createTextNode(menuitems[i]);
		str.appendChild(txt);
		parent.appendChild(str);
	}
}
/*
 * Добавить в Stylish для ЛОРа [ОБЯЗАТЕЛЬНО!]:
.SortTrackMenu{position: absolute;  margin: auto;
background: none repeat scroll 0 0  #0000ff !important; text-align: left;}
.SortTrackMenuItem{left: 0px; margin: 1px; background-color: #c0c0c0 !important; color: black;}
*/
function appendMenu(genmenu){ // add menu
	//var menu = document.getElementsByClassName('nav-buttons')[0];
	var menu = document.getElementsByTagName('nav')[0];
	//var C = menu.firstElementChild;
	//var unneed = C.firstElementChild;
	var unneed = menu.firstElementChild;
	var msi = document.createElement('span');
	var mitem = document.createElement('a');
	mitem.href = "'#'"; mitem.innerHTML = "Фильтрация";
	mitem.id = "SortTrackerButton";
	//if(unneed.getElementsByClassName("current").length)mitem.className = "current";
	mitem.className = "btn btn-default";
	if(genmenu) mitem.onclick = SortTracker;
	msi.appendChild(mitem);
	if(genmenu){
		var Smenu = document.createElement('div');
		Smenu.className = "SortTrackMenu";
		Smenu.style.display = "none";
		genMenuBoxes(Smenu);
		msi.appendChild(Smenu);
	}else mitem.href = "/tracker";
	//C.insertBefore(msi, C.firstChild);
	menu.insertBefore(msi, unneed);
	rmElement(unneed);
	for(i = 0; i < ichkdlen; i++)
		$("MB"+ichkd[i]).checked = "true";
}
if(CurURL != "www.linux.org.ru/tracker"){
	appendMenu(false);
	return;
}
appendMenu(true);
// create iframe
var innerFrame = document.createElement('iframe');
innerFrame.id = "innerFrame";
innerFrame.width = 0; innerFrame.height = 0; innerFrame.style.display = "none";
document.body.appendChild(innerFrame);
innerFrame.onload = iframeIsLoaded;
innerFrame.src = "/tracker/?offset=50";
function collectHrefs(doc, tbl){ // add more topics from iframe
	function chkA(A){
		if(typeof(A) != "undefined" && typeof(A.href) != "undefined" && A.parentNode.nodeName == "TD")
			checkHref(A, tbl);
	}
	var i, hrefs = doc.getElementsByClassName("secondary");
	if(typeof(tbl) == "undefined")
		for(i = hrefs.length-1; i > -1; i--){
			if(TotalElements >= maxElems) return;
			chkA(hrefs[i]);
		}
	else
		for(i in hrefs){
			if(TotalElements >= maxElems) return;
			chkA(hrefs[i]);
		}
}
var Wto;
function AddMoreItems(){ // find table with topics & try to add to it more items
	clearTimeout(Wto);
	if(!iframeLoaded){
		if(nTries > 10){
			IFRMerror();
			return;
		}
		nTries++;
		Wto = setTimeout(AddMoreItems, 300);
		return;
	}
	mTbl = document.getElementsByClassName("message-table")[0];
	if(typeof(mTbl) == "undefined") return;
	var chlds = mTbl.childNodes;
	for(var n in chlds)
		if(chlds[n].nodeName == "TBODY"){
			mTbl = chlds[n];
			break;
		}
	var innerDoc = (innerFrame.contentDocument) ? innerFrame.contentDocument : innerFrame.contentWindow.document;
	var hrefs = innerDoc.getElementsByClassName("secondary");
	collectHrefs(innerDoc, mTbl);
}
function StartSorting(){ // Start filtering of tracker
	var nav = document.getElementsByClassName("nav");
	//rmElement(nav[nav.length - 1]); // remove navigation since it won't work
	WasSorted = true;
	TotalElements = 0;
	collectHrefs(document);
	if(TotalElements < 50){
		if(!iframeLoaded){
			nTries = 0;
			Wto = setTimeout(AddMoreItems, 300);
		}
		else
			AddMoreItems();
	}
}
var oldkeyd;
var menuwaschanged = false;
function menuShowHide(){ // show menu || start filtering
	var M = $('SortTrackerButton').nextSibling;
	if(M.style.display != "block"){
		menuwaschanged = false;
		M.style.display = "block";
		oldkeyd = document.body.onkeydown;
		document.body.onkeydown = onkey;
		return;
	}
	if(!menuwaschanged){
		document.body.onkeydown = oldkeyd;
		M.style.display = "none";
		return;
	}
	getCheckedItems();
	location.reload(true);
	document.location.reload(true);
}
function SortTracker(evt){ // menu's "onclick"
	noDef(evt);
	menuShowHide();
	return false;
}
if(ichkdlen) StartSorting();
}

}());
