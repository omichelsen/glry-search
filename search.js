var renderTimeout = 700,
    elmSearch, elmResults, elmSelected, elmSelectedTags,
    tplTagCloud, tplResults, tplResultsCount,
    bLazy, taggle;

Handlebars.registerHelper('fileFromId', function(id) {
    return new Handlebars.SafeString('archive/' + id.substr(0, 4) + '/' + id + '.gif');
});

Handlebars.registerHelper('hashFromId', function(id) {
    return new Handlebars.SafeString('#' + [id.substr(0, 4), id.substr(4, 2), id.substr(6, 2)].join('-'));
});

Handlebars.registerHelper('encode', function(text) {
    return new Handlebars.SafeString(encodeURIComponent(text));
});

function getCartoons() {
    return new Promise(function (resolve, reject) {
        window.superagent.get('api/cartoons/tags')
            .end(function (err, res) {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.body);
                }
            });
    });
}

function addTag(tag, dataItem) {
    window.superagent.post('api/cartoons/' + dataItem.id + '/tags')
        .send({tag: tag.toLowerCase()})
        .end(function (err, res) {
            if (!err) {
                dataItem.tags.push(tag);
            }
        });
}

function removeTag(tag, dataItem) {
    window.superagent.del('api/cartoons/' + dataItem.id + '/tags/' + tag.toLowerCase())
        .end(function (err, res) {
            var index = dataItem.tags.indexOf(tag);
            if (!err && index > -1) {
                dataItem.tags.splice(index, 1);
            }
        });
}

function isNotDup(tag) {
    return !tag.match(/^\d{8}$/);
}

function clearElmChildren(elm) {
    while (elm.lastChild) {
        elm.removeChild(elm.lastChild);
    }
}

function clearSelected() {
    if (!elmSelected) return;
    clearElmChildren(elmSelectedTags);
    elmSelected.classList.remove('selected');
    elmSelected = elmSelectedTags = undefined;
}

function setSelected(elm) {
    elm.classList.add('selected');
    elm.scrollIntoView(true);
    elmSelected = elm;
}

function onResultClick(dataItem) {
    if (this.classList.contains('selected')) return;

    clearSelected();
    setSelected(this);

    elmSelectedTags = document.getElementById('tags' + this.id);

    taggle = new Taggle(elmSelectedTags, {
        duplicateTagClass: 'bounce',
        tags: dataItem.tags,
        onTagAdd: function(event, tag) {
            addTag(tag, dataItem);
        },
        onTagRemove: function(event, tag) {
            removeTag(tag, dataItem);
        }
    });
}

function findById(id, results) {
    return results.find(function (item) {
        return item.id === id;
    });
}

function renderCount(results) {
    elmResults.innerHTML = tplResultsCount(results.length);
}

function renderResults(results) {
    elmResults.innerHTML = tplResults({results: results});

    var list = document.getElementsByClassName('result');
    for (var i = 0; i < list.length; i++) {
        list[i].addEventListener('click', onResultClick.bind(list[i], findById(list[i].id, results)));
    }

    setTimeout(function () {
        bLazy.revalidate();
    }, 100);
}

function renderTagCloud(data) {
    var tags = data.reduce(function (prev, curr) {
        return prev.concat(curr.tags.filter(function (tag) {
            return prev.indexOf(tag) === -1 && isNotDup(tag);
        }));
    }, []).sort();

    elmResults.innerHTML = tplTagCloud({tags: tags});
}

var renderDebounced = debounce(renderResults, renderTimeout);

function search(query, data) {
    if (!query || query.trim().length === 0) {
        clearElmChildren(elmResults);
        renderTagCloud(data);
        return;
    }

    if (isNotDup(query)) {
        data = data.filter(function (item) {
            return item.tags.every(isNotDup);
        });
    }

    var queryParts = query.toLowerCase().split(' ');

    var results = data.filter(function (item) {
        return queryParts.every(function (part) {
            return item.tags.concat([item.id]).some(function (tag) {
                return tag.indexOf(part) > -1;
            });
        });
    });

    renderCount(results);
    renderDebounced(results);
}

function bootstrap(data) {
    window.addEventListener('hashchange', function () {
        var query = decodeURIComponent(window.location.hash.replace('#', ''));
        elmSearch.value = query;
        search(query, data);
    });

    elmSearch = document.getElementById('search');
    elmSearch.addEventListener('input', function () {
        search(elmSearch.value, data);
    });
    elmResults = document.getElementById('results');

    tplResults = Handlebars.compile(document.getElementById('results-template').innerHTML);
    tplResultsCount = Handlebars.compile(document.getElementById('results-count-template').innerHTML);
    tplTagCloud = Handlebars.compile(document.getElementById('tagcloud-template').innerHTML);

    renderTagCloud(data);

    bLazy = new Blazy({
        selector: 'img'
    });
}

getCartoons().then(bootstrap);
