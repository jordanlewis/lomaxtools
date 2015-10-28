requirejs.config({
    paths: {
        "jquery": "jquery-2.1.1.min",
        "jquery.bootstrap": "bootstrap.min",
        "underscore": "underscore-min"
    },
    shim: {
        "jquery.bootstrap": {
            deps: ["jquery"]
        },
        "audio.min": {
            exports: "audiojs"
        }
    }
});

require(["jquery", "underscore", "audio.min", "wavesurfer.min", "lunr.min", "text!../data.json", "text!../index.json", "jquery.bootstrap"
], function($, _, audiojs, waversurfer, lunr, unparsed_data, unparsed_index) {
  var data = JSON.parse(unparsed_data);
  var index = lunr(function() {
    this.field("title");
    this.field("session");
    this.field("artists");
    this.field("genres");
    this.ref("rid");
  });
  /*
  var as = audiojs.createAll({
    trackEnded: function() {
      var next = $("#songsbody tr.playing").next();
      if (!next.length) next = $("#songsbody tr").first();
      next.addClass("playing").prev().removeClass("playing");
      a.load($("a.songlink", next).attr("data-src"));
      a.play();
    }
  });
  */
  var player = WaveSurfer.create({container: "#wavesurfer", height: 46});
  player.on("ready", function() { player.play(); });
  player.on("finish", function() { 
      var next = $("#songsbody tr.playing").next();
      if (!next.length) next = $("#songsbody tr").first();
      next.addClass("playing").prev().removeClass("playing");
      player.load("https://crossorigin.me/" + $("a.songlink", next).attr("data-src"));
  });
  //var a = as[0];
  console.time("populate index")
  index = lunr.Index.load(JSON.parse(unparsed_index))
  console.timeEnd("populate index")
  console.time("inflate artists/genres")
  var sessionmap = {}
  var artistmap = {}
  var genremap = {}
  var addToMap = function(map, k, v) {
    if (! _.has(map, k)) map[k] = [];
    map[k].push(v.toString());
  }
  var createIndexMenu = function(indexmap, indexname) {
    var indexList = $("#" + indexname + "-list");
    _.each(_.keys(indexmap).sort(), function(elt, idx, list) {
        indexList.append("<li><a href='#' class='" + indexname + "link'>" + elt + "</a></li>");
    });
    $("." + indexname + "link").click(function(e) {
      e.preventDefault();
      render(indexmap[$(this).text()]);
    });
  }
  _.each(data.songs, function(v, k) {
    v.artists = _.map(v.aids, function(aid) { return "<a href='#' aid='" + aid + "' class='artist-inline-link'>" + data.artistmap[aid] + "</a>"; }).join("; ");
    v.genres = _.map(v.gids, function(gid) { return "<a href='#' gid='" + gid + "' class='genre-inline-link'>" + data.genremap[gid] + "</a>"; }).join("; ");
    _.each(v.aids, function(elt, idx, list) {
        addToMap(artistmap, data.artistmap[elt], v.rid);
    });
    _.each(v.gids, function(elt, idx, list) {
        addToMap(genremap, data.genremap[elt], v.rid);
    });
    addToMap(sessionmap, v.session, v.rid);
    //index.add(v)
  });
  createIndexMenu(sessionmap, "session");
  createIndexMenu(artistmap, "artist");
  createIndexMenu(genremap, "genre");

  /*
  var idxstr = JSON.stringify(index.toJSON())

  var blob = new Blob([idxstr], {type: 'text/json'}),
      e    = document.createEvent('MouseEvents'),
      a    = document.createElement('a')

  a.download = "index.json"
  a.href = window.URL.createObjectURL(blob)
  a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
  e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
  a.dispatchEvent(e)
  */
  console.timeEnd("inflate artists/genres")

  var render = function(ids) {
      console.log("rendering " + ids.length + " songs");
      console.time("render");
      console.time("rendersongs")
      $("#songsbody")
          .empty()
          .append($.map(ids, function(id) {
              var v = data.songs[id];
              return "<tr id='" + id + "'>" + 
                     "<td><a href='http://research.culturalequity.org/rc-b2/get-audio-detailed-recording.do?recordingId=" + v.rid + "' target='_blank'>" + v.title + "</a></td>" +
                     "<td>" + v.artists + "</td>" +
                     "<td>" + v.genres + "</td>" +
                     "<td><a class='songlink' href='#' data-src='http://c0383352.cdn.cloudfiles.rackspacecloud.com/audio/" + v.tid + ".mp3'>" + v.tid + "</a></td>" +
                     "<td><a class='session-inline-link' href='#'>" + v.session + "</a></td>";
          }));
      console.timeEnd("rendersongs")
      var rows = $("#songsbody");
      rows.find("a.songlink").click(function(e) {
          e.preventDefault();
          $(".playcontrol").addClass("glyphicon-pause");
          $(".playcontrol").removeClass("glyphicon-play");
          var row = $(this).parent().parent();
          var song = data.songs[row.attr("id")];
          $(".now-playing").text(data.artistmap[song.aids[0]] + " - " + song.title);
          $(".now-playing").attr("href", "#" + row.attr("id"));
          row.addClass("playing").siblings().removeClass("playing");
          player.load("https://crossorigin.me/" + $(this).attr("data-src"));
      });
      rows.find("a.artist-inline-link").click(function(e) {
          var aid = $(this).attr("aid");
          history.pushState({"artist": aid}, "", "?artist=" + $(this).attr("aid"));
          render(artistmap[$(this).text()]);
          return false;
      });
      rows.find("a.genre-inline-link").click(function(e) {
          var gid = $(this).attr("gid");
          history.pushState({"genre": gid}, "", "?genre=" + gid);
          render(genremap[$(this).text()]);
          return false;
      });
      rows.find("a.session-inline-link").click(function(e) {
          var session = encodeURIComponent($(this).text());
          history.pushState({"session": session}, "", "?session=" + session);
          render(sessionmap[$(this).text()]);
          return false;
      });
      console.timeEnd("render");
  }
  $(".playcontrol").click(function(e) {
      if ($(this).hasClass("glyphicon-play")) {
          $(this).removeClass("glyphicon-play");
          $(this).addClass("glyphicon-pause");
          player.play();
      } else {
          $(this).removeClass("glyphicon-pause");
          $(this).addClass("glyphicon-play");
          player.pause();
      }
  });
  var debounce = function (fn) {
      var timeout;
      return function() {
          var args = Array.prototype.slice.call(arguments), ctx = this
          clearTimeout(timeout)
          timeout = setTimeout(function () {
              fn.apply(ctx, args)
          }, 200);
      }
  }
  $("input").bind("input", debounce(function() {
      var query = $(this).val();
      if (query.length < 2) return
      history.pushState({}, "", "#" + query);
      render(_.map(index.search(query), function (result) { return result.ref }));
  }));
  window.onpopstate = function(event) {
      if (_.has(event.state, "artist")) {
          render(artistmap[data.artistmap[event.state["artist"]]]);
      }
  }
  var state = _.object(_.compact(_.map(location.search.slice(1).split('&'), function(item) {  if (item) return item.split('='); })));
  var keys = _.keys(data.songs);
  if (state.artist) {
      var selected = artistmap[data.artistmap[state.artist]];
      keys = _.intersection(keys, selected);
  }
  if (state.genre) {
      keys = _.intersection(keys, genremap[data.genremap[state.genre]])
  }
  if (state.session) {
      keys = _.intersection(keys, sessionmap[data.sessionmap[state.session]])
  }
  render(keys);
});
