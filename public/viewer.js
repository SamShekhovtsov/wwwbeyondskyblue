(() => {
  const images = Array.from(document.querySelectorAll('[data-viewer]'));

  if (!images.length) return;

  const viewer = document.createElement('div');
  viewer.className = 'image-viewer';
  viewer.hidden = true;
  viewer.setAttribute('aria-hidden', 'true');
  viewer.innerHTML = `
    <div class="image-viewer-backdrop" data-viewer-close></div>
    <div class="image-viewer-dialog" role="dialog" aria-modal="true" aria-label="Image viewer">
      <div class="image-viewer-toolbar">
        <p class="image-viewer-count"></p>
        <button class="image-viewer-close" type="button" title="Close image viewer" aria-label="Close image viewer">X</button>
      </div>
      <div class="image-viewer-stage">
        <button class="image-viewer-nav previous" type="button" title="Previous image" aria-label="Previous image">&lt;</button>
        <img class="image-viewer-image" alt="">
        <button class="image-viewer-nav next" type="button" title="Next image" aria-label="Next image">&gt;</button>
      </div>
      <p class="image-viewer-caption"></p>
      <div class="image-viewer-thumbs" aria-label="Image thumbnails"></div>
    </div>
  `;
  document.body.append(viewer);

  const dialog = viewer.querySelector('.image-viewer-dialog');
  const largeImage = viewer.querySelector('.image-viewer-image');
  const caption = viewer.querySelector('.image-viewer-caption');
  const count = viewer.querySelector('.image-viewer-count');
  const thumbs = viewer.querySelector('.image-viewer-thumbs');
  const closeButton = viewer.querySelector('.image-viewer-close');
  const previousButton = viewer.querySelector('.image-viewer-nav.previous');
  const nextButton = viewer.querySelector('.image-viewer-nav.next');
  let currentIndex = 0;
  let previousFocus = null;

  images.forEach((image, index) => {
    image.classList.add('viewer-trigger');
    image.setAttribute('tabindex', '0');
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `Open image ${index + 1} of ${images.length} full screen`);
    image.addEventListener('click', () => openViewer(index));
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openViewer(index);
      }
    });

    const thumbButton = document.createElement('button');
    thumbButton.className = 'image-viewer-thumb';
    thumbButton.type = 'button';
    thumbButton.title = `View image ${index + 1}`;
    thumbButton.setAttribute('aria-label', `View image ${index + 1}`);
    thumbButton.addEventListener('click', () => showImage(index));

    const thumbImage = document.createElement('img');
    thumbImage.src = image.currentSrc || image.src;
    thumbImage.alt = '';
    thumbButton.append(thumbImage);
    thumbs.append(thumbButton);
  });

  const thumbButtons = Array.from(thumbs.querySelectorAll('.image-viewer-thumb'));

  function openViewer(index) {
    previousFocus = document.activeElement;
    viewer.hidden = false;
    viewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('viewer-open');
    showImage(index);
    closeButton.focus();
  }

  function closeViewer() {
    viewer.hidden = true;
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('viewer-open');
    largeImage.removeAttribute('src');
    previousFocus?.focus?.();
  }

  function showImage(index) {
    currentIndex = (index + images.length) % images.length;
    const source = images[currentIndex];
    largeImage.src = source.currentSrc || source.src;
    largeImage.alt = source.alt;
    caption.textContent = source.dataset.viewerTitle || source.alt;
    count.textContent = `${currentIndex + 1} / ${images.length}`;

    thumbButtons.forEach((button, thumbIndex) => {
      const active = thumbIndex === currentIndex;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });

    thumbButtons[currentIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function showPrevious() {
    showImage(currentIndex - 1);
  }

  function showNext() {
    showImage(currentIndex + 1);
  }

  closeButton.addEventListener('click', closeViewer);
  previousButton.addEventListener('click', showPrevious);
  nextButton.addEventListener('click', showNext);
  viewer.querySelector('[data-viewer-close]').addEventListener('click', closeViewer);

  document.addEventListener('keydown', (event) => {
    if (viewer.hidden) return;
    if (event.key === 'Escape') closeViewer();
    if (event.key === 'ArrowLeft') showPrevious();
    if (event.key === 'ArrowRight') showNext();
  });

  dialog.addEventListener('click', (event) => event.stopPropagation());
})();
