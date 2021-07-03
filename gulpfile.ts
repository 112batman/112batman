import gulp from 'gulp'
import fs from 'fs'
import showdown from 'showdown'
import cheerio, { Cheerio, Node } from 'cheerio'

function createSpacer(length: number): Cheerio<Node> {
    const div = cheerio('<div></div>')
    div.css('width', `${length}px`)
    return div
}

function createBadge(self: Cheerio<Node>): Cheerio<Node> {            
    const name = encodeURIComponent(self.attr('name').toUpperCase())
    const color = encodeURIComponent(self.attr('color') || 'black')

    let logo = encodeURIComponent(self.attr('logo'))
    if(logo.startsWith('!')) {
        switch(logo.split('!')[1].toLowerCase()) {
            case 'snowpack':
                logo = fs.readFileSync('./snowpack.txt', {
                    encoding: 'utf-8'
                })
                break
            default:
                break
        }

        logo = encodeURIComponent(logo)
    }

    self.html('')

    const badgeTable = cheerio('<table></table>')
    const badgeRow = cheerio('<tr></tr>')
    const badgeColumn = cheerio('<td></td>')

    const shield = cheerio('<img></img>')
    shield.attr('src', `https://img.shields.io/badge/-${name}-${color}?style=for-the-badge&logo=${logo}`)
    
    badgeColumn.append(shield)
    badgeRow.append(badgeColumn)
    badgeTable.append(badgeRow)

    return badgeTable
}

function marginPaddingZero(self: Cheerio<Node>) {
    self.css('margin', '0')
    self.css('padding', '0')
}

const clean: gulp.TaskFunction = (cb) => {
    if(fs.existsSync('readme.md')) {
        fs.unlink('readme.md', cb)
    }else cb()
}

const build: gulp.TaskFunction = (cb) => {
    fs.readFile('_readme.md', {
        encoding: 'utf-8'
    }, (err, data) => {
        const converter = new showdown.Converter(showdown.getFlavorOptions('github'))
        const html = converter.makeHtml(data)
        const $ = cheerio(html)

        $.find('tech').each(function() {
            const self = $.find(this)
            
            let level = Number(self.attr('level')); level = isNaN(level) ? 0 : level

            const techBadge = createBadge(self)
            const row = techBadge.children('tr')

            const levelIndicatorColumn = cheerio('<td></td>')
            const levelIndicator = cheerio('<span></span>')
            levelIndicator.text(`${'●'.repeat(level)}${'○'.repeat(5 - level)}`)
            
            levelIndicatorColumn.append(levelIndicator)

            const spacerColumn = cheerio('<td></td>')
            spacerColumn.append(createSpacer(10))

            row.append(spacerColumn)
            row.append(levelIndicatorColumn)

            self.append(techBadge)
        })
        
        $.find('badge').each(function() {
            const self = $.find(this)

            const techBadge = createBadge(self)

            self.append(techBadge)
        })

        $.find('project').each(function() {
            const self = $.find(this)

            const title = self.attr('title')
            const description = self.html()
            const link = self.attr('link')

            self.html('')

            const project = cheerio('<div></div')

            const titleLinkEl = cheerio('<a></a>')
            titleLinkEl.attr('href', link)

            const titleEl = cheerio('<h3></h3>')
            titleEl.text(title)

            titleLinkEl.append(titleEl)

            const descriptionEl = cheerio('<span></span>')
            descriptionEl.html(description)

            project.append(titleLinkEl)
            project.append(descriptionEl)

            self.append(project)
        })

        $.find('table[layout]').each(function() {
            const self = $.find(this)

            self.css('border', '0')
            self.css('cellpadding', '0')
            self.css('cellspacing', '0')
            marginPaddingZero(self)

            self.find('tr').each(function() {
                marginPaddingZero(self.find(this))
            })
            self.find('td').each(function() {
                marginPaddingZero(self.find(this))
            })
        })

        const outerWrapper = cheerio('<div></span>')
        const innerWrapper = cheerio('<div></div>')
        innerWrapper.append($)
        outerWrapper.append(innerWrapper)
        fs.writeFile('readme.md', outerWrapper.html(), cb)
    })
}

export default gulp.series(
    clean,
    build
)