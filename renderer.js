const { dialog } = require("electron").remote;
const { getAppPath, exit } = require("electron").remote.app;
const { spawn } = require("child_process");
const isDev = require("electron-is-dev");
const resources = isDev ? getAppPath() : process.resourcesPath;
const ffmpegPath = resources + "\\bin\\" + "ffmpeg.exe";
const percentageRe = /\[download\] *(\d{1,3}.\d)/gm;
const qualityRe = /^((\d{1,3}).*)/gm;
var YouTubeDl = {
  exists: false,
  usable: false,
  path: resources + "\\bin\\" + "youtube-dl.exe",
};
process.on("uncaughtException", function (err) {
  console.error(err);
  console.log("Node NOT Exiting...");
  if (err.code === "ENOENT") {
    alert(
      "Missing youtube-dl executable or cant execute it. Restart and try again."
    );
    exit();
  }
});
YouTubeDl.execute = function (args, stdoutCallback, closeCallback) {
  try {
    var child = spawn(YouTubeDl.path, args);
  } catch (e) {
    throw e;
  }
  var scriptOutput = "";

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", function (data) {
    //Here is where the output goes
    data = data.toString();
    scriptOutput += data;
    if (typeof stdoutCallback === "function") stdoutCallback(data);
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", function (data) {
    //Here is where the error output goes
    //console.log("STDOUT:"+data);
    data = data.toString();
    scriptOutput += data;
  });

  child.on("close", function (code) {
    //Here you can get the exit code of the script

    //console.log('closing code: ' + code);

    //console.log('Full output of script: ',scriptOutput);
    if (typeof closeCallback === "function") closeCallback(scriptOutput, code);
  });
};
try {
  YouTubeDl.execute(null, null, (s, code) => {
    YouTubeDl.exists = true;
    YouTubeDl.onInit();
  });
} catch (e) {
  alert(
    "Missing youtube-dl executable or cant execute it. Restart and try again."
  );
  console.log(e);
}
YouTubeDl.version = function (callback) {
  YouTubeDl.execute(["--version"], null, callback);
};
/**
 * Checks for youtube-dl updates
 * @param onUpdate {function} Callback if update is requiered
 * @param onUpdateFinish {function} Callback if update is finished/not requiered
 */
YouTubeDl.update = function (onUpdate, onUpdateFinish) {
  YouTubeDl.execute(
    ["-U"],
    (data) => {
      if (data.toString().includes("Updating")) onUpdate();
    },
    () => {
      onUpdateFinish();
    }
  );
};
/**
 * Overridable init function for youtube-dl
 */
YouTubeDl.onInit = function () {
  //YouTubeDl.version(version => {
  //    document.querySelector("#version").innerHTML = version;
  //});
  setTimeout(() => {
    YouTubeDl.update(
      () => {
        document.querySelector("#updateSpan").innerHTML =
          "Updating to new version";
      },
      () => {
        YouTubeDl.usable = true;
        document.querySelector("#updateSpan").innerHTML =
          "You are using the latest version";
        document
          .querySelector("#updateIcon")
          .setAttribute("class", "checkmark");
        YouTubeDl.version((version) => {
          document.querySelector("#version").innerHTML = version;
        });
      }
    );
  }, 5000);
};
/**
 * Try to download from specified link
 * @param {string} link Link to media you want to download
 * @param {string} savePath Path to save the file to
 * @param {string} quality Quality of media (according to youtube-dl docs)
 * @param {function} callbackPercentage Function to call with current download percentage
 * @param {function} callbackFinish Function to call on download finish
 */
YouTubeDl.download = function (
  link,
  savePath,
  quality = "(bestvideo+bestaudio/best)",
  callbackPercentage,
  callbackFinish
) {
  //console.log(savePath+'%(title)s.%(ext)s');
  if (YouTubeDl.usable) {
    YouTubeDl.execute(
      [
        "--output",
        savePath + "%(id)s.%(ext)s",
        "-f",
        quality,
        link,
        "--ffmpeg-location",
        ffmpegPath,
      ],
      (data) => {
        try {
          callbackPercentage(percentageRe.exec(data.toString())[1]);
        } catch (e) {}
      },
      (data, code) => {
        callbackFinish(data, code);
      }
    );
  } else {
    setTimeout(() => {
      YouTubeDl.download(
        link,
        savePath,
        quality,
        callbackPercentage,
        callbackFinish
      );
    }, 10000);
  }
};

YouTubeDl.getAvailableFormats = function (link, callback) {
  if (YouTubeDl.usable) {
    YouTubeDl.execute(["-F", link], null, (data) => {
      availableFormats = [];
      var match;
      while ((match = qualityRe.exec(data.toString())) != null) {
        availableFormats.push(match);
      }
      callback(availableFormats);
    });
  } else {
    setTimeout(() => {
      YouTubeDl.getAvailableFormats(link, callback);
    }, 10000);
  }
};

function updateFormats(url) {
  mySelect = document.querySelector("#qualityList");
  mySelect.innerHTML =
    '<option selected value="(bestvideo+bestaudio/best)">Best</option>';
  YouTubeDl.getAvailableFormats(url, (array) => {
    array.forEach((match) => {
      mySelect.innerHTML =
        mySelect.innerHTML +
        '<option value="' +
        match[2] +
        '">' +
        match[0] +
        "</option>";
    });
  });
}
function downloadVideo() {
  if (document.querySelector("#saveLocation").value == "") {
    alert("Please choose a download folder");
    return;
  }
  let path = document.querySelector("#saveLocation").value + "\\";
  if (document.querySelector("#videoUrl").value == "") {
    alert("Please enter a video URL to download");
    return;
  }
  let link = document.querySelector("#videoUrl").value;
  let quality = document.querySelector("#qualityList").value;
  $(".progress-bar").css("width", "100%");
  $(".progress-bar").addClass("progress-bar-striped");
  $(".progress-bar").addClass("progress-bar-animated");
  setTimeout(() => {
    $(".progress").fadeIn();
  }, 300);
  YouTubeDl.download(
    link,
    path,
    quality,
    (progress) => {
      //console.log("setting progress to "+progress);
      $(".progress-bar").removeClass("progress-bar-striped");
      $(".progress-bar").removeClass("progress-bar-animated");
      $(".progress-bar").css("width", progress + "%");
    },
    (data, code) => {
      setTimeout(() => {
        $(".progress").fadeOut();
        if (code != 0) {
          alert("Something probably went wrong\n" + data);
          return;
        }
        setTimeout(() => {
          alert("Done");
        }, 400);
      }, 500);
    }
  );
}

document.getElementById("folderSelectButton").addEventListener("click", () => {
  dialog
    .showOpenDialog({
      properties: ["openDirectory"],
    })
    .then((result) => {
      document.getElementById("saveLocation").value = result.filePaths;
    })
    .catch((err) => {
      //console.log(err);
      alert("Error selecting the directory.\n" + err.toString());
    });
});

document.getElementById("videoUrl").addEventListener("input", (event) => {
  doCheck(event.target.value);
});

document
  .querySelector("#downloadButton")
  .addEventListener("click", downloadVideo);
var delayTimer;
function doCheck(text) {
  clearTimeout(delayTimer);
  delayTimer = setTimeout(function () {
    updateFormats(text);
  }, 500);
}
