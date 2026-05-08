(function () {
  const IFRAME_ORIGIN = 'https://syura-css.netlify.app';

  let lastHeight = 0;

  function injectStyle() {
    if (document.getElementById('syura-artmug-style')) return;

    const style = document.createElement('style');

    style.id = 'syura-artmug-style';

    style.textContent = `
#detailViews [name="am-root"]{
  text-align:start!important;
  padding:0!important;
  line-height:normal!important;
}

#detailViews [name="am-root"] *{
  padding:0;
  margin:0;
  box-sizing:border-box;
}

#detailViews [name="stage"]{
  width:100%;
  overflow:visible;
}

#detailViews [name="am-root"] iframe,
[name="am-root"] iframe{
  display:block;
  width:100%!important;
  max-width:1180px;
  min-height:700px;
  height:700px;
  margin:0 auto;
  border:0;
  overflow:hidden;
}

.syuraParentModal{
  position:fixed;
  inset:0;
  z-index:2147483647;
}

.syuraParentModal__backdrop{
  position:absolute;
  inset:0;
  background:rgba(10,18,34,.58);
}

.syuraParentModal__panel{
  position:absolute;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  width:min(980px,calc(100vw - 28px));
  background:#fff;
  border-radius:24px;
  box-shadow:0 30px 90px rgba(0,0,0,.25);
  overflow:hidden;
}

.syuraParentModal__close{
  position:absolute;
  top:10px;
  right:10px;
  z-index:2;
  width:38px;
  height:38px;
  border:0;
  border-radius:999px;
  background:rgba(255,255,255,.9);
  cursor:pointer;
  font-size:18px;
}

.syuraParentModal__frame{
  aspect-ratio:16/9;
  background:#000;
}

.syuraParentModal__frame iframe{
  display:block;
  width:100%;
  height:100%;
  border:0;
}
`;

    document.head.appendChild(style);
  }

  function getIframe() {
    return document.querySelector(
      '#detailViews [name="am-root"] iframe,[name="am-root"] iframe'
    );
  }

  function resizeIframe(height) {
    const iframe = getIframe();

    if (!iframe) return;

    const nextHeight = Math.max(
      700,
      Math.ceil(Number(height) || 0)
    );

    if (Math.abs(nextHeight - lastHeight) < 4) return;

    lastHeight = nextHeight;

    iframe.style.height = nextHeight + 'px';

    sendViewportToIframe();
  }

  function sendViewportToIframe() {
    const iframe = getIframe();

    if (!iframe || !iframe.contentWindow) return;

    const rect = iframe.getBoundingClientRect();

    iframe.contentWindow.postMessage(
      {
        source: 'syura-artmug-parent',
        type: 'SYURA_PARENT_VIEWPORT',
        iframeTop: rect.top,
        iframeHeight: rect.height,
        viewportHeight:
          window.innerHeight ||
          document.documentElement.clientHeight ||
          0,
        scrollY:
          window.scrollY ||
          window.pageYOffset ||
          0
      },
      IFRAME_ORIGIN
    );
  }

  function scrollParentTo(targetY, navHeight) {
    const iframe = getIframe();

    if (!iframe) return;

    const rect = iframe.getBoundingClientRect();

    const iframePageTop =
      (window.scrollY || window.pageYOffset || 0) +
      rect.top;

    const y = Math.max(
      0,
      iframePageTop +
        Number(targetY || 0) -
        Number(navHeight || 0) -
        8
    );

    window.scrollTo({
      top: y,
      behavior: 'smooth'
    });

    setTimeout(sendViewportToIframe, 80);
    setTimeout(sendViewportToIframe, 400);
  }

  function escapeHTML(value) {
    return String(value || '').replace(
      /[&<>"']/g,
      s =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[s])
    );
  }

  function openYoutubeModal(id, title) {
    if (!id) return;

    document
      .querySelectorAll('.syuraParentModal')
      .forEach(el => el.remove());

    const modal = document.createElement('div');

    modal.className = 'syuraParentModal';

    modal.innerHTML = `
<div class="syuraParentModal">
  <div class="syuraParentModal__backdrop" data-close="1"></div>

  <div
    class="syuraParentModal__panel"
    role="dialog"
    aria-modal="true"
    aria-label="${escapeHTML(title || '영상 재생')}"
  >
    <button
      class="syuraParentModal__close"
      type="button"
      data-close="1"
      aria-label="닫기"
    >
      ✕
    </button>

    <div class="syuraParentModal__frame">
      <iframe
        src="https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0"
        title="${escapeHTML(title || 'YouTube video player')}"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  </div>
</div>
`;

    function close() {
      modal.remove();
      document.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    modal.addEventListener('click', e => {
      if (
        e.target &&
        e.target.dataset &&
        e.target.dataset.close === '1'
      ) {
        close();
      }
    });

    document.addEventListener('keydown', onKey);

    document.body.appendChild(modal);
  }

  function bindMessages() {
    if (window.__syuraArtmugMessageBind) return;

    window.__syuraArtmugMessageBind = true;

    window.addEventListener('message', e => {
      if (e.origin !== IFRAME_ORIGIN) return;

      const data = e.data || {};

      if (data.source !== 'syura-css') return;

      if (data.type === 'SYURA_IFRAME_HEIGHT') {
        resizeIframe(data.height);
      }

      if (data.type === 'SYURA_IFRAME_READY') {
        setTimeout(sendViewportToIframe, 50);
        setTimeout(sendViewportToIframe, 300);
        setTimeout(sendViewportToIframe, 1000);
      }

      if (data.type === 'SYURA_OPEN_YOUTUBE_MODAL') {
        openYoutubeModal(data.id, data.title);
      }

      if (data.type === 'SYURA_PARENT_SCROLL_TO') {
        scrollParentTo(data.targetY, data.navHeight);
      }
    });

    window.addEventListener(
      'scroll',
      sendViewportToIframe,
      { passive: true }
    );

    window.addEventListener(
      'resize',
      sendViewportToIframe
    );

    window.addEventListener(
      'orientationchange',
      () => {
        setTimeout(sendViewportToIframe, 300);
      }
    );
  }

  function neutralize() {
    injectStyle();
    bindMessages();
    sendViewportToIframe();
  }

  if (document.readyState !== 'loading') {
    neutralize();
  } else {
    document.addEventListener(
      'DOMContentLoaded',
      neutralize
    );
  }

  setTimeout(neutralize, 300);
  setTimeout(neutralize, 1000);
  setTimeout(neutralize, 2000);
})();
