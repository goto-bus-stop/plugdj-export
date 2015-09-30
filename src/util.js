// µQuery, gets elements as a real array
// or maps over elements if a fn is given
function $ (sel, fn) {
  if (fn) {
    return [].map.call(document.querySelectorAll(sel), fn)
  }
  return [].slice.call(document.querySelectorAll(sel))
}

// create DOM element from a descriptor object
// Special props:
//  * tag - tag name
//  * cls - classnames string
//  * text - text content (no html)
//  * children - array of child element descriptors
// Other props are set as attributes using setAttribute
function render (d) {
  var el = document.createElement(d.tag || 'div')
  if ('text' in d) {
    el.appendChild(document.createTextNode(d.text))
  }
  if ('cls' in d) {
    el.className = d.cls
  }
  if (d.children) {
    d.children.map(render).forEach(function (child) {
      el.appendChild(child)
    })
  }
  Object.keys(d).forEach(function (attr) {
    if (attr !== 'cls' && attr !== 'text' && attr !== 'children' && attr !== 'tag') {
      el.setAttribute(attr, d[attr])
    }
  })

  return el
}
