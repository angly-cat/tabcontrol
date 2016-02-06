var gTabControl = {
/********************************* VARIABLES *********************************/

prefObj: Components.classes['@mozilla.org/preferences-service;1']
                   .getService(Components.interfaces.nsIPrefBranch),
sessionRestoring: false,

/****************************** EVENT LISTENERS ******************************/

onLoad: function() {
	window.removeEventListener('load', gTabControl.onLoad, false);

	// In options window, no gBrowser, no need to do the rest.
	if (typeof gBrowser === 'undefined') {
		return;
	}

	window.addEventListener('unload', gTabControl.onUnload, false);

	var container = gBrowser.tabContainer;
	container.addEventListener('TabClose', gTabControl.onTabClose, false);
	container.addEventListener('TabOpen', gTabControl.onTabOpen, false);

	window.addEventListener('SSWindowStateBusy', gTabControl.onSessionBusy, false);
	window.addEventListener('SSWindowStateReady', gTabControl.onSessionReady, false);

	/*var searchbar=document.getElementById('searchbar');
	gTabControl.origHandleSearchCommand=searchbar.handleSearchCommand;
	searchbar.handleSearchCommand=gTabControl.handleSearchCommand;*/
},

onUnload: function() {
	window.removeEventListener('unload', gTabControl.onUnload, false);

	var container = gBrowser.tabContainer;
	container.removeEventListener('TabClose', gTabControl.onTabClose, false);
	container.removeEventListener('TabOpen', gTabControl.onTabOpen, false);

	window.removeEventListener('SSWindowStateBusy', gTabControl.onSessionBusy, false);
	window.removeEventListener('SSWindowStateReady', gTabControl.onSessionReady, false);
},

onSessionBusy: function(aEvent) {
	gTabControl.sessionRestoring = true;
},

onSessionReady: function(aEvent) {
	gTabControl.sessionRestoring = false;
},

onTabClose: function(aEvent) {
	// START: Compatibility with Tab Groups (tabgroups@quicksaver) add-on
	if (   window.hasOwnProperty('TabView')
	    && window.TabView.hasOwnProperty('isVisible')
	    && window.TabView.isVisible()
	) {
		// Do nothing on tab close if groups mode is active.
		return;
	}
	// END: Compatibility with Tab Groups (tabgroups@quicksaver) add-on

	var tab = aEvent.target,
	    visibleTabs = gBrowser.visibleTabs,
	    visibleTabsCount = visibleTabs.length;
	// If we're configured to, focus left tab.
	if (   gTabControl.getPref('bool', 'tabcontrol.focusLeftOnClose')
	    && gBrowser.mCurrentTab == tab
	    // If there are tabs to select.
	    && visibleTabsCount
	) {
		// gBrowser.visibleTabs is an array of all visible tabs, i.e. all
		// pinned tabs and all tabs from the current tab group.

		// Each tab has _tPos index (>= 0). All pinned tabs has _tPos indexes
		// started from 0: [0..n], then tabs from the first tab group has
		// indexes [n+1..m] etc.
		var newIndex = 0;
		while (newIndex < visibleTabsCount && visibleTabs[newIndex]._tPos <= tab._tPos) {
			newIndex++;
		}
		gBrowser.selectedTab = visibleTabs[newIndex - 1];
	}
},

onTabOpen: function(aEvent) {
	if (gTabControl.sessionRestoring || !gTabControl.getPref('bool', 'browser.tabs.insertRelatedAfterCurrent')) {
		return;
	}

	var tab = aEvent.target,
	    isRelated = !tab.owner;

	// Firefox does left-in-right groupping by default, so the add-on overrides
	// it's behavior when 'In a left-to-right group' option is disabled.
	if (  !isRelated &&  gTabControl.getPref('bool', 'extensions.tabcontrol.insertUnrelatedAfterCurrent')
	    || isRelated && !gTabControl.getPref('bool', 'tabcontrol.leftRightGroup')
	) {
		gBrowser.moveTabTo(tab, gBrowser.mCurrentTab._tPos + 1);
	}
},

/****************************** TAB MANIPULATION *****************************/

handleSearchCommand: function(aEvent) {
	var searchbar = document.getElementById('searchbar');

	if (   aEvent.type === 'keypress'
	    && aEvent.which === 13
	    && aEvent.ctrlKey
	) {
		//specifically open search in new tab
		searchbar.doSearch(searchbar._textbox.value, 'tab');
	} else {
		//call original function to handle things as it will
		gTabControl.origHandleSearchCommand.apply(searchbar, [aEvent]);
	}
},

/******************************** PREFERENCES ********************************/

getPref: function(aType, aName) {
	try {
		switch (aType) {
		case 'bool':   return this.prefObj.getBoolPref(aName);
		case 'int':    return this.prefObj.getIntPref(aName);
		case 'string':
		default:       return this.prefObj.getCharPref(aName);
		}
	} catch (e) {}

	return '';
},

setPref: function(aType, aName, aValue) {
	try {
		switch (aType) {
		case 'bool':   this.prefObj.setBoolPref(aName, aValue); break;
		case 'int':    this.prefObj.setIntPref(aName, aValue); break;
		case 'string':
		default:       this.prefObj.setCharPref(aName, aValue); break;
		}
	} catch (e) {}
},

loadOptions: function() {
	//checkboxes
	var checks = window.document.getElementsByTagName('checkbox');
	for (var i = 0; checks[i]; i++) {
		try {
			checks[i].checked = gTabControl.getPref('bool', checks[i].getAttribute('prefstring'));
		} catch (e) {}
	}

	//dropdowns
	var drops = window.document.getElementsByTagName('menulist');
	for (var i = 0; drops[i]; i++) {
		try {
			drops[i].selectedItem = drops[i].getElementsByAttribute(
				'value',
				gTabControl.getPref('int', drops[i].getAttribute('prefstring'))
			)[0];
		} catch (e) {}
	}

	return true;
},

saveOptions: function() {
	//checkboxes
	var checks = window.document.getElementsByTagName('checkbox');
	for (var i = 0; checks[i]; i++) {
		try {
			gTabControl.setPref(
				'bool',
				checks[i].getAttribute('prefstring'),
				checks[i].checked
			);
		} catch (e) {}
	}

	//dropdowns
	var drops = window.document.getElementsByTagName('menulist');
	for (var i = 0; drops[i]; i++) {
		try {
			gTabControl.setPref(
				'int',
				drops[i].getAttribute('prefstring'),
				drops[i].selectedItem.value
			);
		} catch (e) {}
	}

	return true;
}

};

//add listener for onload handler
window.addEventListener('load', gTabControl.onLoad, false);
