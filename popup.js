// ************************************************************************
// popup js
// ************************************************************************
// debugger;

defaultSettings = {
	delim: ",",
	isAlwaysSearch: false,
	isOn: true,
	isCasesensitive: true,
	isInstant: true,
	isNewlineNewColor: false,
	isSaveKws: false,
	isWholeWord: false,
	latest_keywords: [],
};
defaultPopupConfig = {
	popup_height: 10,
	popup_width: 300,
}

// document.addEventListener('DOMContentLoaded', function () {
window.addEventListener('load', function() {
	chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
		var currTab = tabs[0];
		if (currTab) { // Sanity check
			tabId = currTab.id;
			var tabkey = get_tabkey(tabId);
			chrome.storage.local.get(['settings', 'popupConfig', tabkey], function (result) {
				// init general settings
				var settings = Object.assign(defaultSettings, result.settings);
				var popupConfig = Object.assign(defaultPopupConfig, result.popupConfig);
				// init popup interface
				container.style.width = popupConfig.popup_width + "px";
				highlightWords.style.minHeight = popupConfig.popup_height + "px";

				// init popup UI
				var tabinfo = result[tabkey];
				if (typeof tabinfo === "undefined") {
					highlightWords.value = "";
					highlightWords.disabled = true;
					highlightWords.style.backgroundColor = '#E4E5E7';
					highlightWords.placeholder = '[ Disabled ]\n\nPlease refresh the webpage for the extension to take effect';
					return;
				}else{
					highlightWords.disabled = false;
					highlightWords.style.backgroundColor = 'transparent';
					highlightWords.value = keywordsToStr(tabinfo.keywords, settings);
				}
				delimiter.value         = settings.delim;
				instant.checked         = settings.isInstant;
				toggleMHL.checked       = settings.isOn;
				alwaysSearch.checked    = settings.isAlwaysSearch;
				newlineNewColor.checked = settings.isNewlineNewColor;
				casesensitive.checked   = settings.isCasesensitive;
				wholeWord.checked       = settings.isWholeWord;
				saveWords.checked       = settings.isSaveKws;
				// build interactable keywords list
				build_keywords_list(tabinfo.keywords);

				// refresh upon popup open
				chrome.storage.local.set({[tabkey]: tabinfo, "settings": settings, "popupConfig": popupConfig}, function () {
					handle_highlightWords_change(tabkey, {refresh: true, fromBgOrPopup: true});
				});
				// register listener
				$("#highlightWords").on("input", function () {
					handle_highlightWords_change(tabkey, {fromBgOrPopup: true});
				});
				$("#highlightWords").inactivity({timeout: 300, mouse: false, keyboard: true, touch: false});
				$("#highlightWords").on("inactivity", function () {
					console.log("inactivity");
					handle_highlightWords_change(tabkey, {refresh: true, fromBgOrPopup: true});
				});
				$("#kw-list").on("click", function (event) {
					handle_keyword_removal(event, tabkey, {fromBgOrPopup: true});
				});
				$("#toggleMHL,#casesensitive, #wholeWord, #delimiter, #instant,"
					+ " #saveWords,#alwaysSearch,#newlineNewColor").on("input", function(event) {
					handle_option_change(tabkey, event);
				});
				$('#forceRefresh').on("click", function(){
					handle_highlightWords_change(tabkey, {refresh: true, fromBgOrPopup: true});
				});
				$("#options_icon").click(function(){
					chrome.runtime.openOptionsPage();
				});
				chrome.runtime.connect({name: "popup_"+tabId});
			});

			check_keywords_existence(tabId);
		}
	});
});



function build_keywords_list(inputKws){
	var html = inputKws.map(kw=>`<span class="keywords">${kw.kwStr}</span>`).join("");
	$('#kw-list>.keywords').remove();
	$(html).appendTo($('#kw-list'));
	check_keywords_existence(tabId);
}

function check_keywords_existence(tabId){
	chrome.scripting.executeScript({
		target: {tabId: tabId},
		files: ["getPagesSource.js"]
	}, function() {
		// If you try and inject into an extensions page or the webstore/NTP you'll get an error
		if (chrome.runtime.lastError) {
			console.error( 'There was an error injecting script : \n' + chrome.runtime.lastError.message);
			
			highlightWords.value = "";
			highlightWords.disabled = true;
			highlightWords.style.backgroundColor = '#E4E5E7';
			highlightWords.placeholder = '[ Disabled ]\n\nSorry, this extension cannot be used in this page';

			chrome.action.setBadgeBackgroundColor({
				color: '#FF0000'
			});
			chrome.action.setBadgeText({
				text: '!'
			});
		}
	});
}

chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.action == "getVisibleText") {
		visibleText = request.source;
		chrome.storage.local.get(['settings'], function (result) {
			var settings = result.settings;
			document.querySelectorAll('#kw-list>.keywords').forEach(elem=>{
				var pattern = settings.isWholeWord
					? '\\b(' + elem.innerText + ')\\b'
					: '(' + elem.innerText + ')';
				visibleText.match(new RegExp(pattern, settings.isCasesensitive ? '': 'i'))
					?  elem.classList.remove("notAvailable")
					: elem.classList.add("notAvailable");
			});
		});
	}
});


function handle_keyword_removal(event, tabkey, option={}){
	console.log(event);
	if(event.ctrlKey && event.target.matches('.keywords')){ 
		chrome.storage.local.get(['settings'], function (result) {
			var settings = result.settings;
			event.target.remove();
			highlightWords.value = [...document.querySelectorAll('#kw-list>.keywords')].map(elem=>elem.innerText).join(settings.delim);
			handle_highlightWords_change(tabkey, option); // update highlights
		});
	}
}

// ****** Highlight functions
// option.refresh -- when true, rehighlight webpage content
// option.useSavedKws -- when true, use saved kws instead of highlightWords.value as inputStr
// option.fromBgOrPopup -- if you run this function from popup or background, remember to set it to true. Otherwise, we expect the call is from content script
function handle_highlightWords_change(tabkey, option={}, callback=null) {
    chrome.storage.local.get(['settings', tabkey], function (result) {
        var settings = result.settings;
        var tabinfo = result[tabkey];
		var tabId = get_tabId(tabkey);

		if(!settings.isOn){
			// hl_clearall(settings, tabinfo);
			chrome.tabs.sendMessage(tabId, {
				action: "hl_clearall",
			})
			return;
		}

		if (!option.useSavedKws){
			inputStr = highlightWords.value;
		} else {
			inputStr = keywordsToStr(tabinfo.keywords, settings)
		}

        // (instant search mode) or (last char of input is delimiter)
        if (settings.isInstant || inputStr.slice(-1) == settings.delim) {
			// console.log("handle_highlightWords_change:" + inputStr);
			inputKws = keywordsFromStr(inputStr, settings);
			savedKws = tabinfo.keywords;
			// differ it
			addedKws = KeywordsMinus(inputKws, savedKws);
			removedKws = KeywordsMinus(savedKws, inputKws);

			if(option.refresh){
				chrome.tabs.sendMessage(tabId, {
					action: "hl_refresh",
					inputKws: [...inputKws], 
				})
			}else{
				chrome.tabs.sendMessage(tabId, {
					action: "_hl_clear",
					removedKws: removedKws,
				}, function(response){
					// settings.isNewlineNewColor || (tabinfo.style_nbr -= removedKws.length); // !! always keep this after _hl_clear function !!
					chrome.tabs.sendMessage(tabId, {
						action: "_hl_search",
						addedKws: addedKws,
					});
				});
			}
          
            tabinfo.keywords = inputKws;
			if (option.fromBgOrPopup){
				build_keywords_list(inputKws);
			}
            settings.latest_keywords = inputKws;
            chrome.storage.local.set({[tabkey]: tabinfo, "settings": settings});
        } else if (!inputStr) { // (empty string)
            chrome.tabs.sendMessage(tabId, {
				action: "hl_clearall",
			})
            tabinfo.keywords = [];
            settings.latest_keywords = "";
            chrome.storage.local.set({[tabkey]: tabinfo, "settings": settings});
        }

		callback && callback();
    });
}


function handle_option_change(tabkey, event) { // tabkey of popup window
	chrome.storage.local.get(['settings'], function (result) {
		var settings = result.settings;

		var forceRefresh = (settings.isWholeWord != wholeWord.checked)
			|| (settings.isCasesensitive != casesensitive.checked)
			|| (settings.isNewlineNewColor != newlineNewColor.checked)
			|| event.currentTarget === toggleMHL;
		// update settings
		settings.isOn              = toggleMHL.checked;
		settings.delim             = delimiter.value;
		settings.isInstant         = instant.checked;
		settings.isAlwaysSearch    = alwaysSearch.checked;
		settings.isNewlineNewColor = newlineNewColor.checked;
		settings.isCasesensitive   = casesensitive.checked;
		settings.isWholeWord       = wholeWord.checked;
		settings.isSaveKws         = saveWords.checked;

        if (settings.isSaveKws){
            $('#alwaysSearch').removeAttr('disabled'); // enable input
        }else{
            $('#alwaysSearch').prop("checked", false); // uncheck alwaysSearch
            settings.isAlwaysSearch = false; // set alwaysSearch to false
            $('#alwaysSearch').attr('disabled', true); // disable alwaysSearch checkbox
        }

		chrome.storage.local.set({'settings': settings}, function () {
			if (tabkey) {
				handle_highlightWords_change(tabkey, {refresh: forceRefresh, fromBgOrPopup: true});
			}
		});
	});
}


// return an array of keyword object:
// [{kwGrp: kwGrpNum, kwStr: keywordString}, {kwGrp: ..., kwStr: ...}, ...]
// The kwGrp is defined in two ways, if in the NewColorNewLine mode, the kwGrp
// is the same for keywords on the same line; otherwise, the kwGrp increases
// every keywords
function keywordsFromStr(inputStr, settings){
	if(settings.isNewlineNewColor){
		return inputStr.split(/\n/g).filter(i=>i).reduce((arr, line, lineCnt)=>{
			arr = arr.concat(line.split(settings.delim).filter(i=>i).map(kws=>{
				return {kwGrp: (lineCnt % 20), kwStr: kws};
			}));
			console.log(arr);
			return arr;
		}, []);
	}else{
		return inputStr.split(settings.delim).filter(i=>i).map((kws,cnt)=>{
			return {kwGrp: (cnt % 20), kwStr: kws};
		});
	}
}
function keywordsToStr(kws, settings){
	var str = "";
	if(settings.isNewlineNewColor){
		for(var i = 0, len = kws.length - 1; i < len; ++ i){
			str += kws[i].kwStr + ((kws[i].kwGrp != kws[i+1].kwGrp) ? "\n": settings.delim);
		}
		// and the last one
		kws.length && (str += kws[kws.length-1].kwStr);
	}else{
		str = kws.map(kw=>kw.kwStr).join(settings.delim);
		// append deliminator if there are words
		str += str ? settings.delim : "";
	}
	return str
}
function KeywordsMinus(kwListA, kwListB){
	function KwListContain(kwList, kwA){
		for(const kw of kwList)	{
			if(kw.kwStr === kwA.kwStr && kw.kwGrp === kwA.kwGrp ){
				return true;
			}
		}
		return false;
	}
	// console.log(kwListA.map(x=>KwListContain(kwListB, x)));
	return kwListA.filter(x=>!KwListContain(kwListB, x));

}


// convertion between tabkey and tabId
function get_tabkey(tabId) {
    return "multi-highlight_" + tabId;
}
function get_tabId(tabkey){
	return parseInt(tabkey.substring(16))
}