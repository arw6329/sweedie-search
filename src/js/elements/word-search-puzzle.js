export class WordSearchPuzzleElement extends HTMLElement {
    set dataRows(val) {
        this.style.setProperty('--row-count', val)
    }

    set dataColumns(val) {
        this.style.setProperty('--column-count', val)
    }

    // basically an enum
    static get Directions() {
        return {
            RIGHT: 1,
            LEFT: 2,
            UP: 3,
            DOWN: 4,
            RIGHT_DOWN: 5,
            RIGHT_UP: 6,
            LEFT_DOWN: 7,
            LEFT_UP: 8
        }
    }

    // speeds up fetchCell() by avoiding DOM operation
    #cellElemCache

    #words
    #solvedWords

    firstConnectedCallback() {
        this.template()

        this.#cellElemCache = []
        this.#words = []
        this.#solvedWords = new Set

        for(let row = 0; row < parseInt(this.dataset.rows); row++) {
            this.#cellElemCache.push([])
            for(let col = 0; col < parseInt(this.dataset.columns); col++) {
                let cell = document.createElement('div')
                cell.classList.add('cell')
                cell.dataset.row = row
                cell.dataset.column = col
                cell.style.setProperty('--row', row)
                cell.style.setProperty('--column', col)

                let letter = document.createElement('span')
                cell.appendChild(letter)

                this.shadowRoot.appendChild(cell)
            }
        }

        // highlighting controls
        let highlightData = {}

        let setHighlightData = function(data, pointerId) {
            highlightData[pointerId] = data
        }

        let fetchHighlightData = function(pointerId) {
            return highlightData[pointerId]
        }

        let clearHighlightData = function(pointerId) {
            delete highlightData[pointerId]
        }

        this.queryAll('.cell').forEach(cell => {
            cell.addEventListener('pointerdown', evt => {
                let rowStart = parseInt(cell.dataset.row)
                let columnStart = parseInt(cell.dataset.column)
                setHighlightData({
                    rowStart: rowStart,
                    columnStart: columnStart,
                    length: 1,
                    direction: null,
                    currentDraggingHighlight: this.highlight(rowStart, columnStart, 1, null)
                }, evt.pointerId)
            })

            // pointermove fires for touch, pointerover doesn't work well
            cell.addEventListener('pointermove', evt => {
                let highlightData = fetchHighlightData(evt.pointerId)

                if(!highlightData) {
                    return
                }

                evt.target.releasePointerCapture(evt.pointerId)

                let row = parseInt(cell.dataset.row)
                let column = parseInt(cell.dataset.column)
                
                if(row === highlightData.rowStart) {
                    this.highlight(
                        highlightData.rowStart,
                        highlightData.columnStart,
                        highlightData.length = Math.abs(column - highlightData.columnStart) + 1,
                        highlightData.direction = column > highlightData.columnStart
                            ? this.constructor.Directions.RIGHT
                        : column < highlightData.columnStart
                            ? this.constructor.Directions.LEFT
                            : null,
                        highlightData.currentDraggingHighlight
                    )
                } else if(column === highlightData.columnStart) {
                    this.highlight(
                        highlightData.rowStart,
                        highlightData.columnStart,
                        highlightData.length = Math.abs(row - highlightData.rowStart) + 1,
                        highlightData.direction = row > highlightData.rowStart
                            ? this.constructor.Directions.DOWN
                            : this.constructor.Directions.UP,
                        highlightData.currentDraggingHighlight
                    )
                } else if(Math.abs(row - highlightData.rowStart) === Math.abs(column - highlightData.columnStart)) {
                    this.highlight(
                        highlightData.rowStart,
                        highlightData.columnStart,
                        highlightData.length = Math.abs(row - highlightData.rowStart) + 1,
                        highlightData.direction = row > highlightData.rowStart && column > highlightData.columnStart
                            ? this.constructor.Directions.RIGHT_DOWN
                        : row < highlightData.rowStart && column < highlightData.columnStart
                            ? this.constructor.Directions.LEFT_UP
                        : row > highlightData.rowStart && column < highlightData.columnStart
                            ? this.constructor.Directions.LEFT_DOWN
                        : this.constructor.Directions.RIGHT_UP,
                        highlightData.currentDraggingHighlight
                    )
                }
            })
        })

        this.addEventListener('pointerup', evt => {
            let highlightData = fetchHighlightData(evt.pointerId)

            if(!highlightData) {
                return
            }

            let highlightedSequence = this.fetchSequence(highlightData.rowStart, highlightData.columnStart, highlightData.length, highlightData.direction)
            let highlightedWord = highlightedSequence.map(cell => cell.letter).join('')
            let matchedWord = this.#words.find(word => word === highlightedWord || word.split('').reverse().join('') === highlightedWord)
            if(matchedWord) {
                highlightData.currentDraggingHighlight.querySelector('.highlight').classList.add('solved')
                highlightedSequence.forEach(cell => {
                    cell.elem.classList.add('solved')
                })

                this.#solvedWords.add(matchedWord)

                this.dispatchEvent(new CustomEvent('solveword', {
                    detail: {
                        word: matchedWord
                    }
                }))

                if(this.#solvedWords.size === this.#words.length) {
                    this.dispatchEvent(new CustomEvent('solve'))
                }
            } else {
                highlightData.currentDraggingHighlight.remove()
            }

            clearHighlightData(evt.pointerId)
        })

        this.addEventListener('pointerleave', evt => {
            fetchHighlightData(evt.pointerId)?.currentDraggingHighlight.remove()
            clearHighlightData(evt.pointerId)
        })

        this.addEventListener('pointercancel', evt => {
            fetchHighlightData(evt.pointerId)?.currentDraggingHighlight.remove()
            clearHighlightData(evt.pointerId)
        })
    }

    populate(words) {
        words = [...words]
        this.#words = words

        // placing long words first increases odds that all can be placed successfully
        words.sort((a, b) => a.length < b.length).forEach(word => {
            let candidates = [...this.#fetchCandidatePlacements(word)]
            let placement = candidates[Math.floor(Math.random() * candidates.length)]
            this.placeWord(word, placement.row, placement.column, placement.direction)
            // this.highlight(placement.row, placement.column, word.length, placement.direction)
        })

        for(let row = 0; row < parseInt(this.dataset.rows); row++) {
            for(let col = 0; col < parseInt(this.dataset.columns); col++) {
                let cell = this.fetchCell(row, col)
                if(cell.letter === null) {
                    cell.elem.firstElementChild.innerText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
                }
            }
        }
    }

    fetchCell(row, column) {
        let elem = this.#cellElemCache[row][column]
        if(!elem) {
            elem = this.query(`.cell[data-row="${row}"][data-column="${column}"]`)
            this.#cellElemCache[row][column] = elem
        }

        return {
            row: row,
            column: column,
            letter: elem.innerText || null,
            elem: elem
        }
    }

    *#fetchCandidatePlacements(word) {
        for(let row = 0; row < parseInt(this.dataset.rows) - word.length + 1; row++) {
            for(let col = 0; col < parseInt(this.dataset.columns) - word.length + 1; col++) {
                for(const dir of this.validDirectionsFrom(row, col, word.length)) {
                    let currentSequence = this.fetchSequence(row, col, word.length, dir)
                    if(currentSequence.every((cell, i) => 
                        cell.letter === null || cell.letter === word[i]
                    )) {
                        yield {
                            row: row,
                            column: col,
                            direction: dir
                        }
                    }
                }
            }
        }
    }

    validDirectionsFrom(row, column, length) {
        let directions = []

        let safeTop = row - length + 1 >= 0
        let safeBottom = row + length - 1 < parseInt(this.dataset.rows)
        let safeLeft = column - length + 1 >= 0
        let safeRight = column + length - 1 < parseInt(this.dataset.columns)

        if(safeRight) {
            directions.push(this.constructor.Directions.RIGHT)

            if(safeTop) {
                directions.push(this.constructor.Directions.RIGHT_UP)
            }

            if(safeBottom) {
                directions.push(this.constructor.Directions.RIGHT_DOWN)
            }
        }

        if(safeLeft) {
            directions.push(this.constructor.Directions.LEFT)

            if(safeTop) {
                directions.push(this.constructor.Directions.LEFT_UP)
            }

            if(safeBottom) {
                directions.push(this.constructor.Directions.LEFT_DOWN)
            }
        }

        if(safeTop) {
            directions.push(this.constructor.Directions.UP)
        }

        if(safeBottom) {
            directions.push(this.constructor.Directions.DOWN)
        }

        return directions
    }

    fetchSequence(row, column, length, direction) {
        let wordSearch = this
        let generator = function*(row, column, i) {
            yield wordSearch.fetchCell(row, column)

            if(i + 1 < length) {
                switch(direction) {
                    case wordSearch.constructor.Directions.RIGHT:
                        yield* generator(row, column + 1, i + 1)
                        break
                    case wordSearch.constructor.Directions.LEFT:
                        yield* generator(row, column - 1, i + 1)
                        break
                    case wordSearch.constructor.Directions.UP:
                        yield* generator(row - 1, column, i + 1)
                        break
                    case wordSearch.constructor.Directions.DOWN:
                        yield* generator(row + 1, column, i + 1)
                        break
                    case wordSearch.constructor.Directions.RIGHT_DOWN:
                        yield* generator(row + 1, column + 1, i + 1)
                        break
                    case wordSearch.constructor.Directions.RIGHT_UP:
                        yield* generator(row - 1, column + 1, i + 1)
                        break
                    case wordSearch.constructor.Directions.LEFT_DOWN:
                        yield* generator(row + 1, column - 1, i + 1)
                        break
                    case wordSearch.constructor.Directions.LEFT_UP:
                        yield* generator(row - 1, column - 1, i + 1)
                        break
                    default:
                        throw new Error(`unrecognized direction ${direction}`)
                }
            }
        }

        return [...generator(row, column, 0)]
    }

    placeWord(word, row, column, direction) {
        this.fetchSequence(row, column, word.length, direction).forEach((cell, i) => {
            cell.elem.querySelector('span').innerText = word[i]
        })
    }

    highlight(row, column, length, direction, existingWrapper = null) {
        let endRow
        let endColumn
        let directionClass
        switch(direction) {
            case this.constructor.Directions.UP:
                endRow = row - length + 1
                endColumn = column
                directionClass = 'vertical'
                break
            case this.constructor.Directions.DOWN:
                endRow = row + length - 1
                endColumn = column
                directionClass = 'vertical'
                break
            case this.constructor.Directions.LEFT:
                endRow = row
                endColumn = column - length + 1
                directionClass = 'horizontal'
                break
            case this.constructor.Directions.RIGHT:
                endRow = row
                endColumn = column + length - 1
                directionClass = 'horizontal'
                break
            case this.constructor.Directions.RIGHT_UP:
                endRow = row - length + 1
                endColumn = column + length - 1
                directionClass = 'diagonal-backwards'
                break
            case this.constructor.Directions.RIGHT_DOWN:
                endRow = row + length - 1
                endColumn = column + length - 1
                directionClass = 'diagonal-forwards'
                break
            case this.constructor.Directions.LEFT_UP:
                endRow = row - length + 1
                endColumn = column - length + 1
                directionClass = 'diagonal-forwards'
                break
            case this.constructor.Directions.LEFT_DOWN:
                endRow = row + length - 1
                endColumn = column - length + 1
                directionClass = 'diagonal-backwards'
                break
            case null:
                endRow = row
                endColumn = column
                directionClass = 'spot'
                break
            default:
                throw new Error(`unrecognized direction ${direction}`)
        }

        let wrapper = existingWrapper ?? document.createElement('div')
        
        wrapper.style.setProperty('--row-start', Math.min(row, endRow))
        wrapper.style.setProperty('--row-end', Math.max(row, endRow))
        wrapper.style.setProperty('--column-start', Math.min(column, endColumn))
        wrapper.style.setProperty('--column-end', Math.max(column, endColumn))

        if(!existingWrapper) {
            wrapper.classList.add('highlight-wrapper')

            let highlight = document.createElement('div')
            highlight.classList.add('highlight')

            let highlightBorder = document.createElement('div')
            highlightBorder.classList.add('highlight', 'highlight-border')

            wrapper.appendChild(highlight)
            wrapper.appendChild(highlightBorder)
            this.shadowRoot.appendChild(wrapper)
        }

        wrapper.querySelectorAll('.highlight').forEach(elem => {
            elem.classList.remove('spot', 'horizontal', 'vertical', 'diagonal-forwards', 'diagonal-backwards')
        })
        wrapper.querySelectorAll('.highlight').forEach(elem => {
            elem.classList.add(directionClass)
        })

        return wrapper
    }
}