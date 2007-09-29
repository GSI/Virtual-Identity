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

    Contributor(s): chuonthis
 * ***** END LICENSE BLOCK ***** */

/**
* some code copied and adapted from 'Show SMTP Username'
* thanks to chuonthis
*/

vI_smtpSelector = {
	smtpService : Components.classes["@mozilla.org/messengercompose/smtp;1"]
					.getService(Components.interfaces.nsISmtpService),
	
	elements : {
		Area_SMTPServerList : null,
		Obj_SMTPServerList : null,
		Obj_SMTPServerListPopup : null
	},
	
	init : function() {
		vI_smtpSelector.elements.Area_SMTPServerList = document.getElementById("smtpServerListHbox");
		vI_smtpSelector.elements.Obj_SMTPServerList = document.getElementById("smtp_server_list");
		vI_smtpSelector.elements.Obj_SMTPServerListPopup = document.getElementById("smtp_server_list_popup");
		vI_smtpSelector.loadSMTP_server_list();
		if (vI.preferences.getBoolPref("show_smtp") &&
			(vI_smtpSelector.elements.Obj_SMTPServerListPopup.childNodes.length > 1))
				vI_smtpSelector.elements.Area_SMTPServerList.setAttribute("hidden", "false");
	},

	loadSMTP : function()
	{
		vI_msgIdentityClone.inputEvent();
	},
	
	resetMenuToMsgIdentity : function(identitykey) {
		var smtpKey = gAccountManager.getIdentity(identitykey).smtpServerKey
		if (!smtpKey) for (var i in gAccountManager.accounts) {
				for (var j in gAccountManager.accounts[i].identities) {
					if (identitykey == gAccountManager.accounts[i].identities[j].key)
						smtpKey = gAccountManager.accounts[i].defaultIdentity.smtpServerKey;
				}
			}
		if (!smtpKey) smtpKey = vI_smtpSelector.smtpService.defaultServer.key;
		vI_smtpSelector.setMenuToKey(smtpKey);
	},
	
	setMenuToKey : function (smtpKey) {
		MenuItems = vI_smtpSelector.elements.Obj_SMTPServerListPopup.childNodes
		for (index = 0; index < MenuItems.length; index++) {
			if (MenuItems[index].getAttribute("key") == smtpKey) {
					vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem =
						MenuItems[index];
					break;
			}
		}
	},

	loadSMTP_server_list : function()
	{
		var idserver;
		if (vI.helper.getBaseIdentity().smtpServerKey) 
			idserver = vI_smtpSelector.smtpService.getServerByKey(vI.helper.getBaseIdentity().smtpServerKey);
		else {
			// find the account related to the identity, to get the account-related default smtp, if it exists.
			var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
			accounts.sort(compareAccountSortOrder);
			
			for (var x in accounts) {
				if (idserver) break;
				var server = accounts[x].incomingServer;
				
				//  ignore (other) virtualIdentity Accounts
				if (!server || server.hostName == "virtualIdentity") continue;
				
				var identities = queryISupportsArray(accounts[x].identities, Components.interfaces.nsIMsgIdentity);
				for (var j in identities) {
					var identity = identities[j];
					if (identity.key == vI.helper.getBaseIdentity().key) {
						if (accounts[x].defaultIdentity.smtpServerKey)
							idserver = vI_smtpSelector.smtpService.getServerByKey(accounts[x].defaultIdentity.smtpServerKey);
						break;
						}
				}
			}
		}
		if (!idserver) idserver = vI_smtpSelector.smtpService.defaultServer;
		
		var defaultServer = vI_smtpSelector.smtpService.defaultServer;
		var servers = vI_smtpSelector.smtpService.smtpServers;
	    
		var serverCount = servers.Count();

		for (var i=0 ; i<serverCount; i++) {
			var server = servers.QueryElementAt(i, Components.interfaces.nsISmtpServer);
			if (!server.redirectorType) 
			{
			  var listitem = vI_smtpSelector.createSmtpListItemx(server);
			  vI_smtpSelector.elements.Obj_SMTPServerListPopup.appendChild(listitem);
			  // set choosen default server 
			  if (idserver == server) vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem = listitem;
			}
		}
		vI_smtpSelector.elements.Obj_SMTPServerList.setAttribute("label", vI_smtpSelector.getNewHostnamex(idserver));
	},

	createSmtpListItemx : function (server) {
	    var listitem = document.createElement("menuitem");

	    var hostname = vI_smtpSelector.getNewHostnamex(server);
	    
	    listitem.setAttribute("label", hostname);
	    listitem.setAttribute("key", server.key);
	    // give it some unique id
	    listitem.id = "smtpServer." + server.key;

	    return listitem;
	},
	
	getNewHostnamex : function (server)
	{
	    var showAlias = true;
	    var showUsername = true;
	    var hideUsername = true;

	    
	    // reuse Preferences from ssun
	    try { showAlias = vI.preferences.getBoolPref("ssun.showalias"); } catch (ex) {}
	    try { showUsername = vI.preferences.getBoolPref("ssun.showusername"); } catch (ex) {}
	    try { hideUsername = vI.preferences.getBoolPref("ssun.hideusername"); } catch (ex) {}

	    var hostname = server.hostname;
	    var port = "";

	    if (server.port)
	      port = ":" + server.port;

	    // SSUN: Get server alias
	    var alias = "";
	    if (showAlias) {
		try { alias = vI.preferences.getCharPref("ssun." + server.key + ".alias"); } catch (ex) {}
		if (alias) {
		    hostname = alias;
		} else {
		    hostname += port;
		}
	    } else {
		hostname += port;
	    }

	    // SSUN: Add username
	    if (showUsername && (!showAlias || (showAlias && (!alias || !hideUsername))) && server.authMethod && server.username)
	      hostname += " (" + server.username + ")";

	    return hostname
	}
}