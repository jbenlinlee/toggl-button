/*jslint indent: 2 */
/*global document: false, chrome: false, $: false, createLink: false, createProjectSelect: false*/

(function () {
  "use strict";
  var iframeRegex = /oauth2relay/, userData = null,
    selectedProjectId = null, selectedProjectBillable = false;

  function createTimerLink(task) {
    var link = createLink('toggl-button asana');
    var tid = /app.asana.com\/\d+\/\d+\/(\d+)/.exec(window.location.href)[1];

    link.addEventListener("click", function (e) {
		// Get tags and then create time entry
		var xhr = new XMLHttpRequest();
      xhr.open("GET", 'https://app.asana.com/api/1.0/tasks/' + tid + '/tags')
      xhr.onload = function() {
         if (xhr.status === 200) {
            var resp = JSON.parse(xhr.responseText);
            var tags = resp.data.map(function(e) { return e.name; });
		
            chrome.extension.sendMessage({
              type: 'timeEntry',
              description: task,
              projectId: selectedProjectId,
              billable: selectedProjectBillable,
              tags: tags
            });

            link.innerHTML = "Started...";
            return false;
         }
      }
      xhr.send();

    });
    return link;
  }

  function addButton(e) {
    if (e.target.className === "details-pane-redesign" || iframeRegex.test(e.target.name)) {
      var taskDescription = $(".property.description"),
        title = $("#details_pane_title_row textarea#details_property_sheet_title").value,
        projectSelect = createProjectSelect(userData, "toggl-select asana");

      //make sure we init the values when switching between tasks
      selectedProjectId = null;
      selectedProjectBillable = false;

      projectSelect.onchange = function (event) {
        selectedProjectId = event.target.options[event.target.selectedIndex].value;
        if (selectedProjectId !== "default") {
          selectedProjectBillable = userData.projects.filter(function (elem, index, array) {
            return (elem.id === selectedProjectId);
          })[0].billable;
        } else {
          selectedProjectId = null;
          selectedProjectBillable = false;
        }
      };

      taskDescription.parentNode.insertBefore(createTimerLink(title), taskDescription.nextSibling);
      taskDescription.parentNode.insertBefore(projectSelect, taskDescription.nextSibling);
    }
  }

  chrome.extension.sendMessage({type: 'activate'}, function (response) {
    if (response.success) {
      console.log(response.user);
      userData = response.user;
      document.addEventListener("DOMNodeInserted", addButton);
    }
  });

}());
