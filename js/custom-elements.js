// TODO: refactor all web components to use this

import { fetch_all_instance_properties_from_class_matching } from '/js/object-inspection.js'

export function register(tag_name, cls, shadow = true, options = {}) {
    cls = cls ?? (shadow ? class extends HTMLElement {
        constructor() {
            super()
            this.template()
        }
    } : class extends HTMLElement {
        firstConnectedCallback() {
            this.template()
        }
    })

    // validate dataset change callbacks
    ;[...fetch_all_instance_properties_from_class_matching(cls, /^data[A-Z]/)].forEach(property => {
        if(!property.descriptor || !property.descriptor.set || property.descriptor.get) {
            throw new Error('Invalid custom element definition: all properties in the form dataIdentifier must be setters')
        }
    })

    cls = shadow ? class extends cls {
        template(opts = {
            refire_datasetters: true
        }) {
            this.attachShadow({
                mode: 'open'
            })

            let content = document.querySelector(`#${tag_name}-template`).content.cloneNode(true)
            content.querySelectorAll('slot').forEach(slot => {
                slot.addEventListener('slotchange', evt => {
                    if(slot.dataset.validSelector) {
                        slot.assignedElements().forEach(element => {
                            if(!element.matches(slot.dataset.validSelector)) {
                                this.remove()
                                throw new Error(`Element is not valid in this <slot>: expected ${slot.dataset.validSelector}, got ${element.tagName.toLowerCase() + ['', ...element.classList].join('.')} (component removed)`)
                            }
                        })
                    }
                })
            })
            opts.modifier?.(content)
            this.shadowRoot.appendChild(content)

            this.shadowRoot.querySelectorAll('style').forEach(node => {
                node.nonce = document.querySelector('meta[name="csp-nonce"]')?.content
                node.replaceWith(node) // refresh nonce
            })

            if(opts.refire_datasetters) {
                this.constructor.observedAttributes.forEach(attr => {
                    if(this.getAttribute(attr) !== null && this.getAttribute(attr) !== undefined) {
                        this.setAttribute(attr, this.getAttribute(attr))
                    }
                })
            }
        }

        slotted(name) {
            return this.querySelector(`[slot="${name}"]`)
        }
    } : class extends cls {
        template(opts = {
            refire_datasetters: true
        }) {
            let content = document.querySelector(`#${tag_name}-template`).content.cloneNode(true)
            opts.modifier?.(content)
            content.querySelectorAll('slot').forEach(slot => {
                // TODO: this does not check data-valid-selector
                // TODO: check for missing slottable element
                slot.replaceWith(this.querySelector(`[slot="${slot.name}"]`))
            })
            this.appendChild(content)

            if(opts.refire_datasetters) {
                this.constructor.observedAttributes.forEach(attr => {
                    if(this.getAttribute(attr) !== null && this.getAttribute(attr) !== undefined) {
                        this.setAttribute(attr, this.getAttribute(attr))
                    }
                })
            }
        }
    }
    
    customElements.define(tag_name, class extends cls {
        #had_first_connection

        static get observedAttributes() {
            return [...fetch_all_instance_properties_from_class_matching(this, /^data[A-Z]/)].map(property => property.key.replaceAll(/([A-Z])/g, '-$1').toLowerCase())
        }

        attributeChangedCallback(attr_name, oldval, newval) {
            if(/^data-\w+(?:-\w+)*$/.test(attr_name)) {
                let prop_name = 'data' + attr_name.split('-').slice(1).map(piece => piece[0].toUpperCase() + piece.slice(1)).join('')
                this[prop_name] = newval
            }
        }

        constructor() {
            super() // super calls template() for shadowed elements
            this.#had_first_connection = false

            this.dispatchEvent(new CustomEvent('constructed'))
        }

        connectedCallback() {
            if(!this.#had_first_connection) {
                this.firstConnectedCallback?.() // firstConnectedCallback calls template() for non-shadowed elements
                this.#had_first_connection = true
            }
        }

        query(selector) {
            return (this.shadowRoot ?? this).querySelector(selector)
        }

        queryAll(selector) {
            return (this.shadowRoot ?? this).querySelectorAll(selector)
        }

    }, options ?? {})
}
