import { LitElement, html } from './node_modules/lit-html-element/lit-element.js'

export class TagCloud extends LitElement {
	static get properties() {
		return {
			tags: {
				type: Array,
				value: [],
				attrName: 'tags',
			}
		}
	}

	render() {
		return html`
			<ul class="tagcloud">
				${this.tags.map((tag) => html`
					<li class="tag">
						<a href="#${encodeURIComponent(tag)}" class="tag-link">${tag}</a>
					</li>
				`)}
			</ul>
		`
	}
}

customElements.define('tag-cloud', TagCloud.withProperties());
