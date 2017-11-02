import { html, render } from './node_modules/lit-html/lib/lit-extended.js'

var renderTimeout = 700,
	elmSearch, elmResults, elmSelected, elmSelectedTags,
	bLazy;

const api = (/a=(https?:\/\/[\w.:/]+)/.exec(window.location.search) || [])[1] || ''
const domain = (/d=(https?:\/\/[\w.:/]+)/.exec(window.location.search) || [])[1] || ''

const fileFromId = (id) => (
	`${domain}/archive/${id.substr(0, 4)}/${id}.gif`
)

const hashFromId = (id) => (
	`#${[id.substr(0, 4), id.substr(4, 2), id.substr(6, 2)].join('-')}`
)

const getCartoons = () => (
	fetch(`${api}api/cartoons/tags`).then((res) => res.json())
)

const addTag = (tag, dataItem) => (
	fetch(`${api}api/cartoons/${dataItem.id}/tags`, {
		method: 'POST',
		headers: {
			'accept': 'application/json, text/plain, */*',
			'content-type': 'application/json',
		},
		body: JSON.stringify({ tag: tag.toLowerCase() }),
	}).then((res) => {
		if (res.ok) {
			dataItem.tags.push(tag)
		}
	})
)

const removeTag = (tag, dataItem) => {
	fetch(`${api}api/cartoons/${dataItem.id}/tags/${tag.toLowerCase()}`, {
		method: 'DELETE',
	}).then((res) => {
		const index = dataItem.tags.indexOf(tag)
		if (res.ok && index > -1) {
			dataItem.tags.splice(index, 1)
		}
	})
}

const isNotDup = (tag) => !tag.match(/^\d{8}$/)

const clearElmChildren = (elm) => {
	while (elm.lastChild) {
		elm.removeChild(elm.lastChild);
	}
}

const clearSelected = () => {
	if (!elmSelected) return
	clearElmChildren(elmSelectedTags)
	elmSelected.classList.remove('selected')
	elmSelected = elmSelectedTags = undefined
}

const setSelected = (elm) => {
	elm.classList.add('selected')
	elm.scrollIntoView(true)
	elmSelected = elm
}

const onResultClick = (dataItem) => {
	const elm = document.getElementById(dataItem.id)
	if (elm.classList.contains('selected')) return

	clearSelected()
	setSelected(elm)

	elmSelectedTags = document.getElementById(`tags${dataItem.id}`)

	const taggle = new Taggle(elmSelectedTags, {
		duplicateTagClass: 'bounce',
		tags: dataItem.tags,
		onTagAdd: (event, tag) => addTag(tag, dataItem),
		onTagRemove: (event, tag) => removeTag(tag, dataItem),
	})
}

const findById = (id, results) => results.find((item) => item.id === id)

const renderCount = (results) => {
	render(html`<div class="results-count">${results.length}</div>`, elmResults)
}

const renderResults = (results) => {
	render(html`
		<ol class="results">
			${results.map(({ id }, i) => html`
				<li>
					<div class="result" id="${id}" on-click="${() => onResultClick(findById(id, results))}">
						<img class="image" data-src$="${fileFromId(id)}" src="0.png" alt="${id}">
						<div class="tags" id="tags${id}"></div>
						<a class="permalink" href="/${hashFromId(id)}" target="_blank">
							<img src="hyperlink.svg" alt="Permanent link to cartoon">
						</a>
					</div>
				</li>
			`)}
		</ol>
	`, elmResults)

	setTimeout(() => bLazy.revalidate(), 100)
}

const renderTagCloud = (data) => {
	const tags = data.reduce((prev, curr) => (
		prev.concat(curr.tags.filter((tag) => (
			prev.indexOf(tag) === -1 && isNotDup(tag)
		)))
	), []).sort()

	render(html`
		<ul class="tagcloud">
			${tags.map((tag) => html`
				<li class="tag">
					<a href="#${encodeURIComponent(tag)}" class="tag-link">${tag}</a>
				</li>
			`)}
		</ul>
	`, elmResults)
}

const renderDebounced = debounce(renderResults, renderTimeout)

const search = (query, data) => {
	if (!query || query.trim().length === 0) {
		clearElmChildren(elmResults)
		renderTagCloud(data)
		return
	}

	if (isNotDup(query)) {
		data = data.filter((item) => item.tags.every(isNotDup))
	}

	var queryParts = query.toLowerCase().split(' ');

	var results = data.filter((item) => (
		queryParts.every((part) => (
			item.tags.concat([item.id]).some((tag) => tag.indexOf(part) > -1)
		))
	))

	renderCount(results)
	renderDebounced(results)
}

const parseHash = (data) => () => {
	const query = decodeURIComponent(window.location.hash.substr(1))
	elmSearch.value = query
	search(query, data)
}

const bootstrap = (data) => {
	window.addEventListener('hashchange', parseHash(data))

	elmSearch = document.getElementById('search')
	elmSearch.addEventListener('input', () => search(elmSearch.value, data))
	elmResults = document.getElementById('results')

	renderTagCloud(data)

	bLazy = new Blazy({
		selector: 'img'
	})

	// parseHash(data)()
}

getCartoons().then(bootstrap)
