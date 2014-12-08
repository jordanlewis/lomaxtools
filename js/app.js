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

require(["jquery", "underscore", "audio.min", "lunr.min", "text!../data.json", "text!../index.json", "jquery.bootstrap"
], function($, _, audiojs, lunr, unparsed_data, unparsed_index) {
  var data = JSON.parse(unparsed_data);
  var index = lunr(function() {
    this.field("title");
    this.field("session");
    this.field("artists");
    this.field("genres");
    this.ref("rid");
  });
  var as = audiojs.createAll({
    trackEnded: function() {
      var next = $("#songsbody tr.playing").next();
      if (!next.length) next = $("#songsbody tr").first();
      next.addClass("playing").prev().removeClass("playing");
      a.load($("a.songlink", next).attr("data-src"));
      a.play();
    }
  });
  var a = as[0];
  console.time("populate index")
  index = lunr.Index.load(JSON.parse(unparsed_index))
  console.timeEnd("populate index")
  console.time("inflate artists/genres")
  var sessionmap = {}
  var artistmap = {}
  var genremap = {}
  var addToMap = function(map, k, v) {
    if (! _.has(map, k)) map[k] = [];
    map[k].push(v);
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
    v.artists = _.map(v.aids, function(aid) { return data.artistmap[aid]; }).join("; ");
    v.genres = _.map(v.gids, function(gid) { return data.genremap[gid]; }).join("; ");
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
      console.time("render")
      $("#songsbody")
          .empty()
          .append($.map(ids, function(id) {
              var row = $(document.createElement("tr"));
              var v = data.songs[id];
              row.append("<td><a href='http://research.culturalequity.org/rc-b2/get-audio-detailed-recording.do?recordingId=" + v.rid + "'>" + v.title + "</a></td>");
              row.append("<td>" + v.artists + "</td>");
              row.append("<td>" + v.genres + "</td>");
              row.append("<td><a class='songlink' href='#' data-src='http://c0383352.cdn.cloudfiles.rackspacecloud.com/audio/" + v.tid + ".mp3'>" + v.tid + "</a></td>");
              row.append("<td>" + v.session + "</td>");
              return row;
          }));
      $(".songlink").click(function(e) {
          e.preventDefault();
          $(this).parent().parent().addClass("playing").siblings().removeClass("playing");
          a.load($(this).attr("data-src"));
          a.play();
      });
      console.timeEnd("render");
  }
  var debounce = function (fn) {
      var timeout;
      return function() {
          var args = Array.prototype.slice.call(arguments), ctx = this
          clearTimeout(timeout)
          timeout = setTimeout(function () {
              fn.apply(ctx, args)
          }, 100);
      }
  }
  $("input").bind("keyup", debounce(function() {
      var query = $(this).val();
      if (query.length < 2) return
      render(_.map(index.search(query), function (result) { return result.ref }));
  }));
  //render(_.keys(data.songs))
});
