// Header interactions extracted from sections/header.liquid
// Keeps menu imagery, scroll behaviour, and logo color switching in sync with the header markup.

// custom menu logics
document.addEventListener('DOMContentLoaded', () => {
  /* Helpers */
  const selectAll = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel))
  const isDesktop = () => window.matchMedia('(min-width: 750px)').matches

  /* Scroll animation */
  let lastY = window.scrollY
  let ticking = false
  const toggleHeaderHide = () => {
    if (!isDesktop()) {
      document.body.classList.remove('header-scroll-hide')
      lastY = window.scrollY
      return
    }
    const currentY = window.scrollY
    const atTop = currentY <= 0
    const goingDown = currentY > lastY + 1
    const goingUp = currentY < lastY - 1
    if (atTop || goingUp) {
      document.body.classList.remove('header-scroll-hide')
    } else if (goingDown) {
      document.body.classList.add('header-scroll-hide')
    }
    lastY = currentY
  }
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        toggleHeaderHide()
        ticking = false
      })
    },
    { passive: true }
  )

  /* Menu images + overlay */
  let currentImage = null

  const initMenuImages = () => {
    const images = selectAll('.tmenu_collection--notext > img')
    if (!images.length) return
    if (!currentImage || images.includes(currentImage) === false) {
      currentImage = images[0]
    }
    images.forEach((img) => {
      if (img === currentImage) {
        img.classList.remove('hide-menu-image')
      } else {
        img.classList.add('hide-menu-image')
      }
    })

    const links = selectAll('.tmenu_item_layout_collection a.tmenu_item_link.tmenu_item_content_alignment_right')
    if (!links.length) return

    const imageByAlt = new Map()
    images.forEach((img) => {
      const alt = img.getAttribute('alt') || ''
      if (alt) imageByAlt.set(alt.trim(), img)
    })

    const showImageForTitle = (title) => {
      const match = imageByAlt.get((title || '').trim())
      if (match) {
        images.forEach((img) => img.classList.add('hide-menu-image'))
        match.classList.remove('hide-menu-image')
        currentImage = match
      } else if (currentImage) {
        // keep last shown image visible when there's no match for the hovered link
        currentImage.classList.remove('hide-menu-image')
      }
    }

    links.forEach((link) => {
      link.addEventListener('mouseenter', () => showImageForTitle(link.textContent))
      link.addEventListener('focus', () => showImageForTitle(link.textContent))
    })
  }

  const rootSelector = '.tmenu_item.tmenu_item--root.tmenu_item_level_0.tmenu_item_submenu_type_mega'
  let initialized = false

  const applyMenuOpenStyles = () => {
    initMenuImages()
  }

  const observeRoot = (root) => {
    let lastActive = false
    const handleMutations = () => {
      if (!initialized) {
        initialized = true
        applyMenuOpenStyles()
      }
      const activeNow = Boolean(document.querySelector('.tmenu_item_active'))
      if (activeNow && !lastActive) applyMenuOpenStyles()
      lastActive = activeNow
    }
    new MutationObserver(handleMutations).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  const roots = selectAll(rootSelector)
  if (roots.length) {
    roots.forEach(observeRoot)
  } else {
    new MutationObserver((_, observer) => {
      const found = selectAll(rootSelector)
      if (!found.length) return
      observer.disconnect()
      found.forEach(observeRoot)
    }).observe(document.body, { childList: true, subtree: true })
  }

})
