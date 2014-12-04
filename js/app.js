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
        "audio-min": {
            exports: "audiojs"
        }
    }
});

require(["jquery", "underscore", "audio-min", "lunr.min", "jquery.bootstrap"
], function($, _, audiojs, lunr) {
  audiojs.events.ready(function() { var as = audiojs.createAll(); });
  var index = lunr(function() {
      this.field("title");
      this.field("session");
      this.field("artists");
      this.field("genres");
      this.ref("rid");
  });
  $.getJSON("data.json", function(data) {
      console.time("populate index")
      $.each(data.songs, function(k, v) {
        v.artists = _.map(v.aids, function(aid) { return data.artistmap[aid]; }).join("; ");
        v.genres = _.map(v.gids, function(gid) { return data.genremap[gid]; }).join("; ");
        index.add(v);
      });
      console.timeEnd("populate index")
      var render = function(results) {
          console.time("render")
          $("#songsbody")
              .empty()
              .append($.map(results, function(result) {
                  var row = $(document.createElement("tr"));
                  var v = data.songs[result.ref];
                  row.append("<td><a href='http://research.culturalequity.org/rc-b2/get-audio-detailed-recording.do?recordingId=" + v.rid + "'>" + v.title + "</a></td>");
                  row.append("<td>" + v.artists + "</td>");
                  row.append("<td>" + v.genres + "</td>");
                  row.append("<td><a href='http://c0383352.cdn.cloudfiles.rackspacecloud.com/audio/" + v.tid + ".mp3'>" + v.tid + "</a></td>");
                  row.append("<td>" + v.session + "</td>");
                  return row;
              }));
          console.timeEnd("render");
      }
      var debounce = function (fn) {
          var timeout
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
          render(index.search(query));
      }));
  })
});
