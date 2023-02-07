export class WordSearchBankElement extends HTMLElement {
    firstConnectedCallback() {
        this.template()
    }

    populate(words) {
        words.forEach(word => {
            let wrapper = document.createElement('div')
            wrapper.classList.add('word-wrapper')

            let span = document.createElement('span')
            span.classList.add('word')
            span.innerText = word

            let strikethrough = document.createElement('div')
            strikethrough.classList.add('strikethrough')

            document.querySelector('word-search-puzzle').addEventListener('solveword', evt => {
                if(evt.detail.word === word) {
                    wrapper.classList.add('solved')
                }
            })

            wrapper.appendChild(span)
            wrapper.appendChild(strikethrough)
            this.query('.word-tray').appendChild(wrapper)
        })
    }
}