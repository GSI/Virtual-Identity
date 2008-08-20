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

    Contributor(s):
 * ***** END LICENSE BLOCK ***** */

var vI_Dialog = {
	init : function(warning) {
		document.getElementById("vI_Dialog_title").setAttribute("value", warning.title);
		document.getElementById("vI_Dialog_recLabel").setAttribute("value", warning.recLabel);
		document.getElementById("vI_Dialog_recipient").setAttribute("value", warning.recipient);
		vI_htmlTextBox.init("vI_Dialog_browser", null, warning.warning, warning.css);		
		document.getElementById("vI_Dialog_query").setAttribute("value", warning.query);
	}
}
