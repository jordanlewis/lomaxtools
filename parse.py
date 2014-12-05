#!/usr/bin/python

import os, re, json
from bs4 import BeautifulSoup

tag_link_regex = re.compile(".*id=(\d+)&idType")

genremap = {}
artistmap = {}

def parse_tags(links, tagmap):
    tagids = []
    for a in links:
        id = int(tag_link_regex.match(a["href"]).group(1))
        tagids.append(id)
        name = a.string.strip()
        if id in tagmap:
            if name != tagmap[id]:
                print "tag conflict: %s %s %s" % (id, tagmap[id], name)
        else:
            tagmap[id] = name
    return tagids

data = {"songs": {}, "artistmap": {}, "genremap": {}}
for filename in os.listdir("index"):
    print filename
    file = open("index/" + filename)
    text = file.read()
    # delete malformed tr
    text = text.replace('<tr><td colspan="5"><img src="images/audio/audio-linebreak-dots.jpg" /></td>', '')

    soup = BeautifulSoup(text)
    tbody = soup.find(id="parent").tbody
    trs = tbody.findAll("tr", recursive=False)
    for i in xrange(0, len(trs), 2):
        song = {}
        # the first tr has 4 tds: title, recording id, web player, and session
        tds = trs[i].findAll("td", recursive=False)

        song["title"] = tds[0].a.string
        song["rid"] = int(tds[0].a["href"].lstrip("get-audio-detailed-recording.do?recordingId="))
        song["tid"] = tds[1].string
        song["session"] = tds[3].string

        # the second tr has a single td with another table inside
        # which contains genre and artist information. that table has
        # two rows, one genre and one artist.
        subtable = trs[i+1].td.table
        genres = subtable.tr.findAll("a")
        song["gids"] = parse_tags(genres, genremap)

        artists = subtable.tr.next_sibling.findAll("a")
        song["aids"] = parse_tags(artists, artistmap)
        data["songs"][song["rid"]] = song

data["artistmap"] = artistmap
data["genremap"] = genremap

out = open("data.json", "w")
json.dump(data, out, indent=0, sort_keys=True)
out.close()
