
function findLabels() {
	// Object #<HTMLDivElement> has no method 'xpath'
	//var labelsDiv = document.getElementById('label-list')
	//var result = labelsDiv.xpath("//div[@id='label-list']//li//a[@class='item']")
	
	// No XPath object
	//var labelsDiv = document.getElementById('label-list')
	//var x = new XPath()
	//var result = x.evaluate("//li", labelsDiv)
	
	var items = document.evaluate("//div[@id='label-list']//li//a[@class='item']", document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
	var thisItem = items.iterateNext();
	var anchors = [];
	while(thisItem) {
		anchors.push(thisItem);
		thisItem = items.iterateNext();	
	}
	
	var matching = anchors.filter(hasComma);
	return matching;
}

function highlightLabels(matching) {
	matching.forEach(highlight);	
}

function cleanup(token, matching, i) {
	if( matching.length > i) {
		var element = matching[i];
		cleanupElement(token, element, function() {
			console.log("Looking at next label at " + i+1)
			cleanup(token, matching, i+1);
		});
	}
}

function cleanupElement(token, element, callback) {
	var label = element.getAttribute("title");
	
	var dirtyLabels = label.split(",");
	var labels = dirtyLabels.map(function(dirtyLabel){
		return dirtyLabel.toLowerCase().replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	});
	console.log("Cleaning up \"" + label + "\" to " + JSON.stringify(labels));
	fetchBookmarks(label, function(data) {
		data.threadTitles[0].sectionContent.forEach( function(section) {
			console.log("Section for " + section.url);
			updateBookmark(section, labels, token, function(result) {
				if(result != null) {
					console.log("Updated item");
					callback();
				} else {
					alert("Unable to update " + label);
				}
			});
		});
	});
}

function updateBookmark(section, labels, tokens, callback) {
	var xhr = new XMLHttpRequest();
	
	xhr.onreadystatechange = function(data) {
	  if (xhr.readyState == 4) {
		if (xhr.status == 200) {
			var json = xhr.responseText.substring(4);
	        var data = JSON.parse(json);
	        callback(data);
	    } else {
	        callback(null);
	    }
	  }
	};
	
	var td = {
			"threads":[],
			"threadQueries":[],
			"threadResults": [
			  {
			    "threadId":section.threadId,
			    "elementId":section.elementId,
			    "authorId":0,
			    "title":section.title,
			    "timestamp":0,
			    "formattedTimestamp":0,
			    "url":section.url,
			    "signedUrl":"",
			    "previewUrl":"",
			    "snippet":section.snippet,
			    "threadComments":[],
			    "parentId":"",
			    "labels":labels||[]
			  }],
			  "threadComments":[]
			};
	var params = "td=" + encodeURIComponent(JSON.stringify(td));
	console.log("POST params: " + params);
	var url = "https://www.google.com/bookmarks/api/thread?xt=" + encodeURIComponent(token) + "&op=UpdateThreadElement";
	xhr.open("POST", url, true);
	//Send the proper header information along with the request
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	//xhr.setRequestHeader("Content-length", params.length);
	//xhr.setRequestHeader("Connection", "close");	
	xhr.send(params);	

}

function fetchBookmarks(label, callback) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(data) {
	  if (xhr.readyState == 4) {
		if (xhr.status == 200) {
			var json = xhr.responseText.substring(4);
	        var data = JSON.parse(json);
	        callback(data);
	    } else {
	        callback(null);
	    }
	  }
	};
	
	// Note that any URL fetched here must be matched by a permission in
	// the manifest.json file!
	var q = "label:\"" + label + "\""; 
	// &fo=Starred
	// &nr=100
	var url = 'https://www.google.com/bookmarks/api/threadsearch?g=&q=' + encodeURIComponent(q) + '&start=&fo=Starred&nr=25';
	
	xhr.open('GET', url, true);
	xhr.send();	
}
function establishToken(callback) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(data) {
	  if (xhr.readyState == 4) {
		if (xhr.status == 200) {
            var text = xhr.responseText;
            var result = /SL.xt = '([^']+)'/ .exec(text);
            if (result) {
               token = result[1];
            }
            console.log("Token: " + token);
	        callback(token);
	    } else {
	        callback(null);
	    }
	  }
	};
	
	var url = 'https://www.google.com/bookmarks/api/bookmarklet';
	
	xhr.open('GET', url, true);
	xhr.send();	
}

var hasComma = function(element) {
	var label = element.getAttribute("title");
	return label && label.indexOf(",") != -1;
};

var highlight = function(element) {
	element.className += " commas";
};

var unhighlight = function(element) {
	element.className = element.className.replace(/\bcommas\b/,'');
};

var start = function() {
	var matching = findLabels();
	highlightLabels(matching);
	establishToken( function(token) { cleanup(token, matching, 0); });
};

setTimeout( start, 1000 );