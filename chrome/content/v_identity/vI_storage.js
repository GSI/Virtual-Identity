/* ***** BEGIN LICENSE BLOCK *****
    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

    The Original Code is the Virtual Identity Extension.

    The Initial Developer of the Original Code is Rene Ejury.
    Portions created by the Initial Developer are Copyright (C) 2007
    the Initial Developer. All Rights Reserved.

    Contributor(s): Mike Krieger, Sebastian Apel
 * ***** END LICENSE BLOCK ***** */
 
/**
* some code copied and adapted from 'addressContext' and from 'Birthday Reminder'
* thanks to Mike Krieger and Sebastian Apel
*/

vI_storage = {
	multipleRecipients : null,
	
	lastCheckedEmail : {}, 	// array of last checked emails per row,
				// to prevent ugly double dialogs nd time-consuming double-checks
	
	elements : { Obj_storageSave : null },
	
	promptService : Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService),
			
	rdfService : Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService),

	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null),

	original_functions : {
		awSetInputAndPopupValue : null,
	},

	replacement_functions : {
		awSetInputAndPopupValue : function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_notificationBar.dump("## vI_storage: awSetInputAndPopupValue '" + inputElem.id +"'\n");
			vI_storage.original_functions.awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber);
			vI_storage.updateVIdentityFromStorage(inputElem);
		},
	},
	
	observe: function() {
		vI_storage.elements.Obj_storageSave.setAttribute("hidden",
			!vI.preferences.getBoolPref("storage_show_switch"));
		vI_storage.elements.Obj_storageSave.checked = vI.preferences.getBoolPref("storage_storedefault");
	},
	
	addObserver: function() {
		vI_storage.prefroot.addObserver("extensions.virtualIdentity.storage_show_switch", vI_storage, false);
		vI_storage.prefroot.addObserver("extensions.virtualIdentity.storage_storedefault", vI_storage, false);	
	},
	
	removeObserver: function() {
		vI_storage.prefroot.removeObserver("extensions.virtualIdentity.storage_show_switch", vI_storage);
		vI_storage.prefroot.removeObserver("extensions.virtualIdentity.storage_storedefault", vI_storage);
	},
	
	awOnBlur : function (element) {
		// only react on events triggered by addressCol2 - textinput Elements
		if (! element.id.match(/^addressCol2*/)) return;
		vI_notificationBar.dump("## vI_storage: awOnBlur '" + element.id +"'\n");
		vI_storage.updateVIdentityFromStorage(element);
	},

	awPopupOnCommand : function (element) {
		vI_notificationBar.dump("## vI_storage: awPopupOnCommand'" + element.id +"'\n");
		vI_storage.updateVIdentityFromStorage(document.getElementById(element.id.replace(/^addressCol1/,"addressCol2")))
	},
	
	
	init: function() {
		vI_storage.elements.Obj_storageSave = document.getElementById("storage_save");
		vI_storage.addObserver();
		vI_storage.observe();
		
		// better approach would be to use te onchange event, but this one is not fired in any change case
		// see https://bugzilla.mozilla.org/show_bug.cgi?id=355367
		// same seems to happen with the ondragdrop event
		awGetInputElement(1).setAttribute("onblur",
			"window.setTimeout(vI_storage.awOnBlur, 250, this.parentNode.parentNode.parentNode);")
		awGetPopupElement(1).setAttribute("oncommand",
			"window.setTimeout(vI_storage.awPopupOnCommand, 250, this);")
		vI_storage.original_functions.awSetInputAndPopupValue = awSetInputAndPopupValue;
		awSetInputAndPopupValue = function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_storage.replacement_functions.awSetInputAndPopupValue (inputElem, inputValue, popupElem, popupValue, rowNumber) }
	},
	
	
	firstUsedInputElement : null, 	// this stores the first Element for which a Lookup in the Storage was successfull
	firstUsedRDFEntry : null,	// stores the used storage-entry to show a warning if the Identities differ
	updateVIdentityFromStorage: function(inputElement) {
		if (!vI.preferences.getBoolPref("storeVIdentity")) {
			vI_notificationBar.dump("## vI_storage: usage deactivated.\n")
			return;
		}
		
		var recipientType = document.getElementById(inputElement.id.replace(/^addressCol2/,"addressCol1"))
			.selectedItem.getAttribute("value");
		if (recipientType == "addr_reply" || recipientType == "addr_followup") {
			// reset firstUsedInputElement and firstUsedStorageData if recipientType was changed
			if (vI_storage.firstUsedInputElement == inputElement) {
				vI_storage.firstUsedInputElement = null;
				vI_storage.firstUsedStorageData = null;
			}
			vI_notificationBar.dump("## vI_storage: field is a 'reply-to' or 'followup-to'. not searched.\n")
			return;
		}
		
		if (inputElement.value == "") {
			vI_notificationBar.dump("## vI_storage: no recipient found, not checked.\n"); return;
		}
		
		var row = inputElement.id.replace(/^addressCol2#/,"")
		if (vI_storage.lastCheckedEmail[row] && vI_storage.lastCheckedEmail[row] == inputElement.value) {
			vI_notificationBar.dump("## vI_storage: same email than before, not checked again.\n"); return;
		}
		vI_storage.lastCheckedEmail[row] = inputElement.value;
		var recipient = vI_storage.__getDescriptionAndType(inputElement.value, recipientType)
		var storageData = vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType)
		if (!storageData) return;
		
		// found storageData, so store InputElement
		if (!vI_storage.firstUsedInputElement) vI_storage.firstUsedInputElement = inputElement;
		
		vI_notificationBar.dump("## vI_storage: compare with current Identity\n");
		
		if (vI_storage.firstUsedInputElement == inputElement)
			vI_storage.firstUsedStorageData = storageData
		if (vI.preferences.getBoolPref("storage_getOneOnly") && vI_storage.firstUsedInputElement &&
			vI_storage.firstUsedInputElement != inputElement) {
			vI_notificationBar.dump("## vI_storage: retrieved Identity for other recipient-field before. ignoring\n");
			if (	vI_storage.firstUsedStorageData.email != storageData.email ||
				vI_storage.firstUsedStorageData.fullName != storageData.fullName ||
				vI_storage.firstUsedStorageData.id != storageData.id ||
				vI_storage.firstUsedStorageData.smtp != storageData.smtp )
				vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIStorageCollidingIdentity"),
					"storage_notification");
		}
		// only update fields if new Identity is different than old one.
		else if (!vI_storage.__equalsCurrentIdentity(storageData)) {
			var warning = vI_storage.__getReplaceVIdentityWarning(recipient, storageData);
			if (	vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value") != "vid" ||
				!vI.preferences.getBoolPref("storage_warn_vI_replace") ||
				vI_storage.promptService.confirm(window,"Warning",warning)) {						
				vI_msgIdentityClone.setMenuToIdentity(storageData.id)
				vI_smtpSelector.setMenuToKey(storageData.smtp)
				if (vI_msgIdentityClone.setIdentity(storageData.fullName + "<" + storageData.email + ">"))
				vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIStorageUsage") + ".",
					"storage_notification");
			}
		}
	},
	
	__getDescriptionAndType : function (recipient, recipientType) {
		if (recipientType == "addr_newsgroups")	return { recDesc : recipient, recType : "newsgroup" }
		else if (vI_storage.isMailingList(recipient))
			return { recDesc : vI_storage.getMailListName(recipient), recType : "maillist" }
		else return { recDesc : recipient, recType : "email" }
	},
	
	__equalsCurrentIdentity : function(storageData) {
		var curAddress = vI.helper.getAddress();		
		var id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("oldvalue");
		if (!id_key) id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value");
		var smtp_key = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key');
		var equal = (	(id_key == storageData.id) &&
				(smtp_key == storageData.smtp) &&
				(curAddress.email == storageData.email) &&
				(curAddress.name == storageData.fullName)	)
		if (equal) vI_notificationBar.dump("## vI_storage: Identities are the same.\n")
		else vI_notificationBar.dump("## vI_storage: Identities differ.\n")
		return equal;
	},
	
	storeVIdentityToAllRecipients : function(msgType) {
		if (msgType != nsIMsgCompDeliverMode.Now) return;
		if (vI_storage.elements.Obj_storageSave.getAttribute("hidden") == "false" ) {
			vI_notificationBar.dump("## vI_storage: switch shown.\n")
			if (!vI_storage.elements.Obj_storageSave.checked) {
				vI_notificationBar.dump("## vI_storage: save button not checked.\n")
				return;
			}
		}
		else {
			vI_notificationBar.dump("## vI_storage: switch hidden.\n")
			if (!vI.preferences.getBoolPref("storage_storedefault")) {
				vI_notificationBar.dump("## vI_storage: not be safed by default.\n")
				return;
			}
		}
		
		// check if there are multiple recipients
		vI_storage.multipleRecipients = false;
		var recipients = 0;
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				awGetInputElement(row).value.match(/^\s*$/) ) continue;
			if (recipients++ == 1) {
				vI_storage.multipleRecipients = true
				vI_notificationBar.dump("## vI_storage: multiple recipients found.\n")
				break;
			}
		}			
		
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				awGetInputElement(row).value.match(/^\s*$/) ) continue;
			// by using a Timeout the possible prompt stopps the MessageSending
			// this is required, else lavascript context might be gone
			window.setTimeout(vI_storage.__updateStorageFromVIdentity, 0, awGetInputElement(row).value, recipientType)
		}
	},
	
	__getVIdentityString : function() {
		var old_address = vI.helper.getAddress();		
		var id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("oldvalue");
		if (!id_key) id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value");
		var smtp_key = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key');
		return old_address.combinedName + " (" + id_key + "," + 
		(smtp_key?smtp_key:document.getElementById("bundle_messenger").getString("defaultServerTag")) +
		")"
	},

	__getReplaceVIdentityWarning : function(recipient, storageData) {
		return	vI.elements.strings.getString("vident.updateVirtualIdentity.warning1") +
			recipient.recDesc + " (" + recipient.recType + ")" +
			vI.elements.strings.getString("vident.updateVirtualIdentity.warning2") +
			vI_storage.__combineNames(storageData.fullName, storageData.email) +
			" (" + storageData.id + "," + 
			(storageData.smtp?storageData.smtp:document.getElementById("bundle_messenger").getString("defaultServerTag")) +
			")" + vI.elements.strings.getString("vident.updateVirtualIdentity.warning3");
	},
	
	__getOverwriteStorageWarning : function(recipient, storageData) {
		return  vI.elements.strings.getString("vident.updateStorage.warning1") +
			recipient.recDesc + " (" + recipient.recType + ")" +
			vI.elements.strings.getString("vident.updateStorage.warning2") +
			vI_storage.__combineNames(storageData.fullName, storageData.email) +
			" (" + storageData.id + "," + 
			(storageData.smtp?storageData.smtp:document.getElementById("bundle_messenger").getString("defaultServerTag")) +
			")" + vI.elements.strings.getString("vident.updateStorage.warning3") +
			vI_storage.__getVIdentityString() +
			vI.elements.strings.getString("vident.updateStorage.warning4");
	},
	
	__updateStorageFromVIdentity : function(recipient, recipientType) {
		var dontUpdateMultipleNoEqual = (vI.preferences.getBoolPref("storage_dont_update_multiple") &&
					vI_storage.multipleRecipients)
		
		recipient = vI_storage.__getDescriptionAndType(recipient, recipientType);
		var storageData = vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
		if (storageData) {
			if (!vI_storage.__equalsCurrentIdentity(storageData) &&
				!dontUpdateMultipleNoEqual) {
				var warning = vI_storage.__getOverwriteStorageWarning(recipient, storageData);
				vI_notificationBar.dump("## vI_storage: " + warning + ".\n")
				if (!vI.preferences.getBoolPref("storage_warn_update") ||
						vI_storage.promptService.confirm(window,"Warning",warning))
				vI_rdfDatasource.updateRDFFromVIdentity(recipient.recDesc, recipient.recType);
			}
		}
		else vI_rdfDatasource.updateRDFFromVIdentity(recipient.recDesc, recipient.recType);
	},
		
	
	// --------------------------------------------------------------------
	// the following function gets a queryString, a callFunction to call for every found Card related to the queryString
	// and a returnVar, which is passed to the callFunction and returned at the end.
	// this way the Storage-search is unified for all tasks
	_walkTroughCards : function (queryString, callFunction, returnVar) {
		var parentDir = vI_storage.rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
		var enumerator = parentDir.childNodes;
		if (!enumerator) {vI_notificationBar.dump("## vI_storage: no addressbooks?\n"); return null;} // uups, no addressbooks?	
		while (enumerator && enumerator.hasMoreElements()) {
			var addrbook = enumerator.getNext();  // an addressbook directory
			addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);
			var searchUri = (addrbook.directoryProperties?addrbook.directoryProperties.URI:addrbook.URI) + queryString;
			//~ vI_notificationBar.dump("## vI_storage: searchUri '" + searchUri + "'\n");
			//~ var directory = vI_storage.rdfService.GetResource(searchUri).QueryInterface(Components.interfaces.nsIAbDirectory);
			
			var AbView = Components.classes["@mozilla.org/addressbook/abview;1"].createInstance(Components.interfaces.nsIAbView);
			AbView.init(searchUri, true, null, "GeneratedName", "ascending");
			var directory = AbView.directory;
			
			// directory will now be a subset of the addressbook containing only those cards that match the searchstring
			if (!directory) break;
			var childCards = null; var keepGoing = 1;
			try { childCards = directory.childCards; childCards.first(); } catch (ex) { keepGoing = 0; }
			
			while (keepGoing == 1) {
				currentCard = childCards.currentItem();
			//~ while (directory.childNodes && directory.childNodes.hasMoreElements()) {
				//~ currentCard = directory.childNodes.getNext();
				currentCard.QueryInterface(Components.interfaces.nsIAbCard);
				//~ vI_notificationBar.dump("## vI_storage:             checking '" + currentCard.displayName + "'.\n")
				returnVar = callFunction(addrbook, currentCard, returnVar);
				try { childCards.next(); } catch (ex) {	keepGoing = 0; }
			}
		}
		return returnVar;
	},
		
	// --------------------------------------------------------------------
	// check if recipient is a mailing list.
	// Similiar to Thunderbird, if there are muliple cards with the same displayName the mailinglist is preferred
	// see also https://bugzilla.mozilla.org/show_bug.cgi?id=408575
	isMailingList: function(recipient) {
		vI_notificationBar.dump("## vI_storage: isMailingList '" + recipient + "' \n")
		queryString = "?(or(DisplayName,c," + encodeURIComponent(vI_storage.getMailListName(recipient)) + "))"
		var returnVar = vI_storage._walkTroughCards(queryString, vI_storage._isMailingListCard,
			{ mailListName : mailListName, isMailList : false } )
		vI_notificationBar.dump("## vI_storage: isMailList  " + returnVar.isMailList + ".\n")
		return returnVar.isMailList;
	},	
	
	_isMailingListCard : function (addrbook, Card, returnVar) {
	// returnVar = { mailListName : mailListName, isMailList : false } 
		return { mailListName : returnVar.mailListName,
			isMailList : (returnVar.isMailList ||
			Card.isMailList && Card.displayName.toLowerCase() == returnVar.mailListName.toLowerCase()) }
	},
	
	// --------------------------------------------------------------------
	
	getMailListName : function(recipient) {
		if (recipient.match(/<[^>]*>/) || recipient.match(/$/)) {
			mailListName = RegExp.leftContext + RegExp.rightContext
			mailListName = mailListName.replace(/^\s+|\s+$/g,"")
		}
		return mailListName;
	},
	
	__combineNames : function (fullName, email) {
		if (fullName.replace(/^\s+|\s+$/g,"")) return fullName.replace(/^\s+|\s+$/g,"") + " <" + email.replace(/^\s+|\s+$/g,"") + ">"
		else return email.replace(/^\s+|\s+$/g,"")
	},
	
	getVIdentityFromAllRecipients : function(all_addresses) {
		// var all_addresses = { number : 0, emails : {}, fullNames : {},
		//			combinedNames : {}, id_keys : {}, smtp_keys : {} };
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup") continue;
			vI_storage.lastCheckedEmail[row] = awGetInputElement(row).value;
			recipient = vI_storage.__getDescriptionAndType(awGetInputElement(row).value, recipientType);
			var storageData = vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
			if (storageData) vI_smartIdentity.addWithoutDuplicates(all_addresses,
				storageData.email,
				storageData.fullName,
				vI_storage.__combineNames(storageData.fullName, storageData.email),
				storageData.id,
				storageData.smtp)
		}
		return all_addresses;
	}
}
window.addEventListener("unload", function(e) { try {vI_storage.removeObserver();} catch (ex) { } }, false);
