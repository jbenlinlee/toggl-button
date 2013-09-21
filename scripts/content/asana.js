/*jslint indent: 2 */
/*global document: false, chrome: false, $: false, createLink: false, createProjectSelect: false*/

(function () {
  "use strict";
  var iframeRegex = /oauth2relay/, userData = null,
    selectedProjectId = null, selectedProjectBillable = false,
    tasks = {}, link = null, asanaTidRegex = /app.asana.com\/\d+\/\d+\/(\d+)/;

  function updateLink() {
    var asana_tid = asanaTidRegex.exec(window.location.href)[1];
    if (link !== null) {
      link.innerHTML = tasks[asana_tid] !== undefined ? "Stop timer" : "Start timer";
    }
  }

  function createTimerLink() {
    link = createLink('toggl-button asana');

    link.addEventListener("click", function (e) {
      var asana_tid = asanaTidRegex.exec(window.location.href)[1];
      if (tasks[asana_tid] === undefined) {
		  // Get tags and then create time entry
		  var xhr = new XMLHttpRequest();
        xhr.open("GET", 'https://app.asana.com/api/1.0/tasks/' + asana_tid + '/tags')
        xhr.onload = function() {
           if (xhr.status === 200) {
              var resp = JSON.parse(xhr.responseText);
              var tags = resp.data.map(function(e) { return e.name; });
              var title = $("#details_pane_title_row textarea#details_property_sheet_title").value;
		
              chrome.extension.sendMessage({
                type: 'timeEntry',
                description: title,
                projectId: selectedProjectId,
                billable: selectedProjectBillable,
                tags: tags
              }, function (toggl_entry) {
                tasks[asana_tid] = toggl_entry;
                link.innerHTML = "Stop timer";
              });

              return false;
           }
         }
         xhr.send();
      } else {
        chrome.extension.sendMessage({
          type: 'stopEntry',
          toggl_entry: tasks[asana_tid]
        });

        link.innerHTML = "Start timer";
        delete tasks[asana_tid];
      }
    });
    return link;
  }

  function addButton(e) {
    if (e.target.className === "details-pane-redesign" || iframeRegex.test(e.target.name)) {
      var taskDescription = $(".property.description"),
        projectSelect = createProjectSelect(userData, "toggl-select asana");

      //make sure we init the values when switching between tasks
      selectedProjectId = null;
      selectedProjectBillable = false;

      // Get Asana projects. Select first toggl project that
      // matches one of the task's Asana project 
      var asanaProjects = [];
      var asanaProjectTokens = document.querySelectorAll("div.property.projects a.token_name");
      for (var i = 0; i < asanaProjectTokens.length; ++i) {
        asanaProjects.push(asanaProjectTokens[i].innerHTML);
      }
      
      for (var i = 0; i < projectSelect.options.length; ++i) {
        var togglPrjName = projectSelect.options[i].getAttribute("data-project-name");
        for (var j = 0; j < asanaProjects.length; ++j) {
          if (togglPrjName === asanaProjects[j]) {
            var prjData = selectedProjectData(projectSelect, userData.projects, i);
            selectedProjectId = prjData.togglPrjId;
            selectedProjectBillable = prjData.billable;
            projectSelect.selectedIndex = i;
          }
        }
      }

      projectSelect.onchange = function (event) {
        var prjData = selectedProjectData(projectSelect, userData.projects, projectSelect.selectedIndex);
        selectedProjectId = prjData.togglPrjId;
        selectedProjectBillable = prjData.billable;
      };

      taskDescription.parentNode.insertBefore(createTimerLink(), taskDescription.nextSibling);
      taskDescription.parentNode.insertBefore(projectSelect, taskDescription.nextSibling);
    }
  }

  setInterval(function() { updateLink(); }, 500);

  chrome.extension.sendMessage({type: 'activate'}, function (response) {
    if (response.success) {
      console.log(response.user);
      userData = response.user;
      document.addEventListener("DOMNodeInserted", addButton);
    }
  });

}());
