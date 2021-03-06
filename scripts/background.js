/*jslint indent: 2 */
/*global window: false, XMLHttpRequest: false, chrome: false, btoa: false */
"use strict";

var TogglButton = {
  $user: null,
  $apiUrl: "https://www.toggl.com/api",

  checkUrl: function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      if (/toggl\.com\/track/.test(tab.url)) {
        TogglButton.fetchUser();
      }
    }
  },

  fetchUser: function () {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", TogglButton.$apiUrl + "/v7/me.json?with_related_data=true", true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        var resp = JSON.parse(xhr.responseText);
        TogglButton.$user = resp.data;
      }
    };
    xhr.send();
  },

  createTimeEntry: function (timeEntry, callback) {
    var start = new Date(),
      xhr = new XMLHttpRequest(),
      entry = {
        time_entry: {
          start: start.toISOString(),
          created_with: "Toggl Button",
          description: timeEntry.description,
          wid: TogglButton.$user.default_wid,
          pid: timeEntry.projectId || null,
          billable: timeEntry.billable || false,
          duration: -(start.getTime() / 1000),
          tags: timeEntry.tags
        }
      };
    xhr.open("POST", TogglButton.$apiUrl + "/v8/time_entries", true);
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(TogglButton.$user.api_token + ':api_token'));
    xhr.onload = function() {
      if (xhr.status === 200) {
        var resp = JSON.parse(xhr.responseText);
        callback(resp.data);
      }
    };
    xhr.send(JSON.stringify(entry));
  },

  stopEntry: function(toggl_entry) {
    var stop = new Date();
    var start = new Date(toggl_entry.start);
    var duration = (stop.getTime() - start.getTime())/1000;
    var dat = {"time_entry":{"stop":stop.toISOString(),"duration":duration}};

    var xhr = new XMLHttpRequest();
    xhr.open("PUT", TogglButton.$apiUrl + "/v8/time_entries/" + toggl_entry.id, true);
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(TogglButton.$user.api_token + ':api_token'));
    xhr.send(JSON.stringify(dat));
  },

  newMessage: function (request, sender, sendResponse) {
    if (request.type === 'activate') {
      if (TogglButton.$user !== null) {
        chrome.pageAction.show(sender.tab.id);
      }
      sendResponse({success: TogglButton.$user !== null, user: TogglButton.$user});
    } else if (request.type === 'timeEntry') {
      TogglButton.createTimeEntry(request, sendResponse);
      return true;
    } else if (request.type === 'stopEntry') {
      TogglButton.stopEntry(request.toggl_entry);
    }
  }

};

TogglButton.fetchUser();
chrome.tabs.onUpdated.addListener(TogglButton.checkUrl);
chrome.extension.onMessage.addListener(TogglButton.newMessage);
